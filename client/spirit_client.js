const { Evt } = require('./evt')
const { OrderedObjectList } = require('./ordered_list')
const { pipeline, finished, Readable, Writable } = require('stream')
const { StringDecoder } = require('string_decoder')
const ws = require('ws')
const fs = require('fs')
const fsp = require('fs').promises
const crypto = require('crypto')
const path = require('path')
const ipcr = require('./ipcr_module')

const SERVER_URL = process.env.URL || 'localhost:54045'
const ECDH_CURVE = 'secp521r1'
const UUID_LEN = 25
const LOG_LIMIT = 8

class Contact extends Evt {
  constructor(params) {
    super()

    /* these keys will be excluded from write */
    Object.defineProperties(this, {
      spiritClient: {
        writable: true,
        enumerable: false
      },
      timeoutId: {
        writable: true,
        enumerable: false
      },
      timeout: {
        value: 5 * 60 * 1000, 
        enumerable: false
      },
      _state: {
        value: '',
        writable: true,
        enumerable: false
      },
      state: {
        get() {
          return this._state
        },
        set(nv) {
          this._state = nv
          this.fire('set-state', nv)
        }
      },
      secret: {
        writable: true,
        enumerable: false
      },
      sharedSecret: {
        writable: true,
        enumerable: false
      },
      auxiliaryLog: {
        value: new OrderedObjectList({keyName: 'ts', uniqueItems: true}),
        enumerable: false
      }
    })

    this.log = new OrderedObjectList({keyName: 'ts', uniqueItems: true})
    if (params) {
      this.vaultToData(params)
    }
  }

  getTitle() {
    return this.displayName || this.username || this.uuid || "There's nothing here"
  }

  getEditableProperties() {
    return [
      {
        title: 'UUID',
        prop: 'uuid',
        value: this.uuid
      },
      {
        title: 'Username',
        prop: 'username',
        value: this.username
      },
      {
        title: 'Display Name',
        prop:'displayName',
        value: this.displayName
      },
      {
        title: 'Notes',
        prop: 'notes',
        value: this.notes
      }
    ]
  }

  vaultToData(vaultData) {
    if (!vaultData) return

    const contact = vaultData 
    Object.assign(this, contact)
    if (contact.log) {
      this.log = new OrderedObjectList({keyName: 'ts'}, ...contact.log)
    }
    this.privateKey = Buffer.from(contact.privateKey, 'base64')
    if (contact.publicKey) this.publicKey = Buffer.from(contact.publicKey, 'base64')

    const secret = crypto.createECDH(ECDH_CURVE)
    secret.setPrivateKey(this.privateKey)
    this.secret = secret
  }
  
  dataToVault() {
    const result = Object.assign({}, this)
    result.log = this.log.all().map(entry => {
      /* delete the message history from the log item before serializing */ 
      const logResult = Object.assign({}, entry)
      delete logResult.history
      return logResult
    })

    result.privateKey = this.privateKey.toString('base64')
    if (this.publicKey) result.publicKey = this.publicKey.toString('base64')
    return result
  }

  /* 
   * command the Contact to write to its own short log.
   *
   * optionally specify the uuid when logging outgoing messages
   * optionally specify the ts when redacting or deleting messages
   * optionally supply params to modify the message real good
   */
  _writeToLog(log, md, outgoing, ts=this.spiritClient.now(), flags={}, limit=true) {
    const { item: message } = log.get(ts)

    let wroteToLog = false

    if (!message) {
      log.add({ ts, md, flags, outgoing })
      if (limit && log.length > LOG_LIMIT) {
        const [ removedItem ] = log.remove(log.first())
        this._writeToLog(this.auxiliaryLog, removedItem.md, removedItem.outgoing, removedItem.ts, removedItem.flags, false)
      }
      wroteToLog = true
      this.fire('message-logged', this)
    } else {
      delete flags.md
      /* 
       * create a history of the current message history will not be serialized
       * to the vault, but it will be reconstructed from the log file
       */ 
      if (!message.history) {
        message.history = []
      }
      if (!md || message.md !== md) {
        message.history.push({
          md: message.md,
          flags: { ...message.flags }
          /* don't need 'ts' here because it's implied by the parent */
        })
      }
      message.flags = { ...flags }
      const keySet = Object.keys(message)
      for (const key of keySet) {
        if (typeof message[key] === 'undefined') {
          delete message[key]
        }
      }
      if (!md) {
        flags.removed = true
        message.removed = true
        wroteToLog = true
        this.fire('message-removed', this)
      } else if (message.md !== md) {
        flags.edited = true
        message.md = md
        message.edited = true
        wroteToLog = true
        this.fire('message-edited', this)
      } else if (message.md === md) {
        delete message.edited
        // flags.wroteToLog = true
      }
      }
    return wroteToLog
  }

  writeToLog(md, outgoing, ts=this.spiritClient.now(), flags={}) {
    return this._writeToLog(this.log, md, outgoing, ts, flags)
  }

  writeToAuxiliaryLog(md, outgoing, ts, flags) {
    const { item: message } = this.log.get(ts)
    if (message) {
      if (!message.history) {
        message.history = []
      }
      if (md !== message.md) {
        message.history.push({
          md,
          flags: { ...flags }
          /* don't need 'ts' here because it's implied by the parent */
        })
      }
    } else {
      return this._writeToLog(this.auxiliaryLog, md, outgoing, ts, flags, false, false)
    }
  }

  conversationRequest() {
    this.state = 'pending-accept'
    this.fire('conversation-request', this)
  }

  /* 
   * command Contact to automatically relay talk-to data to the parent client
   */
  async talkTo() {
    if (this.state === 'pending-accept') {
      await this.spiritClient.talkTo(this.uuid)
      this.state = ''
      return true
    } else if (this.state !== 'pending') {
      if (!isNaN(this.timeoutId)) {
        clearTimeout(this.timeoutId)
        this.timeoutId = undefined
      }
      this.state = 'pending'
      const result = await this.spiritClient.talkTo(this.uuid)
      if (result.status === 'error') {
        this.state = ''
        this.spiritClient.notify({
          title: 'Connection Error',
          content: result.message,
          className: 'warn'
        })
      } else {
        this.state = 'waiting'
        this.timeoutId = setTimeout(() => {
          this.state = ''
          this.timeoutId = undefined
        }, this.timeout)
        return true
      }
    }
    return false
  }

  /*
   * command the Contact to send a message (from us to them)
   *
   * optionally specify the ts when modifying or deleting an existing message
   * optionally specify the params to set online, edited, or deleted...
   */
  async message(md, ts=this.spiritClient.now(), flags={}) {
    let result = {}

    try {
      const outgoing = true
      const wroteToLog = this.writeToLog(md, outgoing, ts, {
        offline: true,
        ...flags
      })
      result = await this.spiritClient.message(this.uuid, md, ts, flags)
      if (wroteToLog) {
        await this.spiritClient.writeToLogFile({
          uuid: this.uuid,
          outgoing,
          ts,
          flags: { offline: true, ...flags }, 
          md
        })
      }
      await this.spiritClient.writeVaultFile()
    } catch (err) {
      /* uhh */
      console.log(err)
    }
    return result
  }

  upsert() {
    this.fire('upsert-contact', {existingContact: true, contact: this})
    this.spiritClient.upsertContact(this.uuid)
  }

  cancelUpsert() {
    this.fire('cancel-upsert', {contact: this})
    this.spiritClient.cancelUpsertContact(this.uuid)
  }

  async saveUpsert(params) {
    if (!params) return 

    const editableProps = this.getEditableProperties()
    const result = {}
    for(const editable of editableProps) {
      const currentValue = this[editable.prop]
      const newEditable = params[editable.prop]
      if (!newEditable) return
      if (currentValue !== newEditable.value) {
        if (!newEditable.value) {
          delete this[editable.prop]
        } else {
          this[editable.prop] = newEditable.value
          result[editable.prop] = newEditable.value
        }
      }
    }

    for (const key in params) {
      const prop = params[key]
      if (prop.prop in this &&
        typeof this[prop.prop] === 'function') {
        this[prop.prop].call(this, prop.value)
      }
    }

    await this.spiritClient.confirmUpsertContact(this)
    this.fire('save-upsert', {contact: this})
    return result
  }

  async deleteContact() {
    await this.spiritClient.deleteContact(this.uuid)
    return this
  }

  clearLog(clear) {
    if (!clear) return
    this.log.clear()
  }

  clearLogHistories(clear) {
    if (!clear) return
    for (const item of this.log.all()) {
      item.history = []
    }
  }

  getOfflineMessages() {
    return this.log.all().filter(item => {
      return item.flags.offline
    })
  }
}

class SpiritClient extends Evt { 
  constructor(params = {}) {
    super()
    const data = {
      foundResourceFile: false,
      contacts: {},
      ...params
    }
    this.transactions = {
      history: [],
      markers: new OrderedObjectList({keyName: 'ts', uniqueItems: true})
    }
    const proxy = {
      /*
       * budget redux
       *
       * but it's not redux so literally no one will care
       */
      set: (obj, prop, value) => {
        obj[prop] = value
        if (typeof value === 'object') {
          this.fire(`set-${prop}`, value)
        } else {
          const oldval = obj[prop]
          if (oldval !== value) {
            this.fire(`set-${prop}`, value)
          }
        }
        return true
      }
    }

    this.serverUrl = SERVER_URL
    this.tsOffset = 0
    this._sinceLastOffset = 0
    this._logQueue = []
    this.data = new Proxy(data, proxy)
    this.vault = {contacts: {}}
    this.getVaultFile()
      .then(() => {
        this.fire('show-sign-up', !this.data.foundResourceFile)
      })

    this.notifications = new Map()
  }

  setDisplayName(displayName) {
    this.data.displayName = displayName
  }

  setUsername(username) {
    this.data.username = username
  }

  setPassword(password) {
    this.data.password = password
  }

  setEmail(email) {
    this.data.email = email
  }

  setContacts(contacts) {
    if (!contacts) return
    this.data.contacts = contacts
  }

  setUuid(uuid) {
    if (!uuid) return
    this.data.uuid = uuid
  }

  setHash(hashBuffer) {
    if (typeof hashBuffer === 'string') {
      this.data.hash = Buffer.from(hashBuffer, 'hex')
    } else if (hashBuffer instanceof Buffer) {
      this.data.hash = hashBuffer
    }
    this.vault.hash = this.data.hash.toString('hex')
  }

  async saveSettings(params) {
    if (!params) {
      this.fire('save-settings', {})
      return
    }

    for (const key in params) {
      const prop = params[key]
      const setter = `set${prop.prop[0].toUpperCase() + prop.prop.slice(1)}` 
      if (setter in this && 
        !prop.disabled &&
        prop.value !== this[prop.prop]) {
        this[setter].call(this, prop.value)
      } else if (prop.prop in this &&
        typeof this[prop.prop] === 'function') {
        this[prop.prop].call(this, prop.value)
      }
    }
    await this.writeVaultFile()
    this.fire('save-settings', params)
  }

  clearLogs(clear) {
    if (!clear) return
    for (const uuid in this.data.contacts) {
      const contact = this.data.contacts[uuid]
      contact.clearLog(true)
    }
  }

  validateUsername(username) {
    if (!username) return ['Come up with something interesting']
    const reasons = []
    if (username.toLowerCase().includes('shad')) reasons.push('Anything but that')
    if (username.toLowerCase().includes('graham')) reasons.push('Pick a better name than that!')
    if (username.length < 4) reasons.push('Username must be longer than 4 characters')
    if (username.length > 32) reasons.push('I apologize if your name is really this long')
    return reasons
  }

  validateEmail(email) {
    if (!email) return ['Please enter an email']

    const reasons = []
    if (!email.includes('@')) reasons.push(`Can't write an email without an "@"`)
    if (!email.includes('.')) reasons.push('I doubt this is a valid email')

    return reasons
  }

  validatePassword(password) {
    const reasons = []
    if (password.length < 8) reasons.push('Password must be longer than 8 characters')
    if (!/\d/g.test(password)) reasons.push('Password must container at least 1 number')
    if (!/[^a-zA-Z0-9]/g.test(password)) reasons.push('Password must container at least 1 special (non-alphanumeric) character')
    if (password.length > 32) reasons.push("Come on now, we're not writing an essay here")

    return reasons
  }

  validatePasswordConfirm(password, confirmPassword) {
    if (!password || !confirmPassword) return ['Password must not be blank']

    if (password !== confirmPassword) return ['Password and confirmation do not match']
  }

  vaultToData() {
    if (this.vault.hash) this.setHash(this.vault.hash)
    if (this.vault.username) this.setUsername(this.vault.username)
    if (this.vault.email) this.setEmail(this.vault.email)
    if (this.vault.displayName) this.setDisplayName(this.vault.displayName)
    if (this.vault.contacts) {
      const newContacts = {}
      for (const contactUuid in this.vault.contacts) {
        const contact = new Contact(this.vault.contacts[contactUuid])
        Object.defineProperty(contact, 'spiritClient', {value: this})
        newContacts[contactUuid] = contact
      }
      this.data.contacts = newContacts
    }
    if (this.vault.uuid) this.setUuid(this.vault.uuid)
  }

  generateHilariousRandomIdentifier() {
    /*
     * Generate a series of consonant+vowel pairs of a fixed (UUID_LEN) length
     * place a space somewhere at random in the middle
     */
    const consonants = 'bcdfghjklmnpqrstvwxyz'
    const consonantsLen = consonants.length
    const vowels = 'aeiou'
    const vowelsLen = vowels.length

    const byteBuf = crypto.randomBytes(UUID_LEN - 1) 
    const randomSpaceIndex = (Math.floor(Math.random() * 4) * 2) + 8
  
    let output = ''

    for (let a = 0; a < byteBuf.length; a+=2) {
      let randomCons = consonants[byteBuf[a] % consonantsLen]
      const randomVow = vowels[byteBuf[(a + 1)] % vowelsLen]
      if (!a) {
        randomCons = randomCons.toUpperCase()
      } else if (a === randomSpaceIndex) {
        output += ' '
        randomCons = randomCons.toUpperCase()
      }
      output += randomCons
      output += randomVow
    }

    return output
  }

  getContact(uuid, doNotStore) {
    if (!uuid) return
    if (uuid === this.data.uuid) return 

    let result = new Contact()
    const secret = crypto.createECDH(ECDH_CURVE)

    if (!(uuid in this.data.contacts)) {
      secret.generateKeys()
      result.spiritClient = this
      result.privateKey = secret.getPrivateKey()
      result.uuid = uuid
      result.secret = secret

      if (!doNotStore) {
        this.data.contacts[uuid] = result
        this.writeVaultFile()
        this.fire('create-contact', result)
      }
    } else {
      result = this.data.contacts[uuid]
    }

    /* cache the sharedSecret if required data are present */
    if (result.privateKey && result.publicKey && !result.sharedSecret) {
      try {
      result.sharedSecret = result.secret.computeSecret(result.publicKey)
      } catch (err) {
        /* if this fails, then eliminate the public key -- likely stale */
        delete result.publicKey
      }
    }

    return result
  }

  getContactList() {
    const result = []

    if (this.data.contacts) {
      for (const uuid in this.data.contacts) {
        result.push(this.data.contacts[uuid])
      }
    }

    return result
  }

  dataToVault() {
    this.vault.hash = this.data.hash.toString('hex')
    if (this.data.username) this.vault.username = this.data.username
    if (this.data.email) this.vault.email = this.data.email
    if (this.data.displayName) this.vault.displayName = this.data.displayName
    if (this.data.contacts) {
      const newContacts = {}
      for (const contactUuid in this.data.contacts) {
        newContacts[contactUuid] = this.data.contacts[contactUuid].dataToVault()
      }
      this.vault.contacts = newContacts
    }
    if (!this.data.uuid) {
      this.vault.uuid = this.generateHilariousRandomIdentifier()
      this.setUuid(this.vault.uuid)
    } else {
      this.vault.uuid = this.data.uuid
    }
  }

  async getFile(fileName) {
    const dataPath  = await ipcr.invoke('get-env-path', 'data')
    const resolvedPath = path.resolve(dataPath)
    const filePath = path.resolve(dataPath, `./${fileName}`)
    try {
      await fsp.access(filePath)
      this.data.foundResourceFile = true
    } catch (err) {
      await fsp.mkdir(resolvedPath, {recursive: true})
      this.data.foundResourceFile = false
    }
    return filePath 
  } 

  async getVaultFile() {
    return this.getFile('vault.sp2p')
  } 

  async getLogFile() {
    return this.getFile('log.sp2p')
  }

  async loadVaultFile() {
    if (!this.data.hash) return 

    const pathToVault = await this.getVaultFile()

    if (!this.data.foundResourceFile) {
      return this.writeVaultFile()
    } else {
      return new Promise((resolve, reject) => {
        let buffer = ''
        let ivPos = 0
        const iv = new Uint8Array(16)

        /* read the first 32 bytes (which is the IV) */
        const readIvStream = fs.createReadStream(pathToVault, {end: iv.length - 1})
        readIvStream.on('data', chunk => {
          const len = Math.min(ivPos + chunk.length, iv.length - ivPos)
          for (let a = 0; a < len; a++) {
            iv[ivPos + a] = chunk[a]
          }
          ivPos += len
        })
        finished(readIvStream, () => {
          const decoder = new StringDecoder('utf8')
          const decipher = crypto.createDecipheriv('aes-256-cbc', this.data.hash, iv)
          const readStream = fs.createReadStream(pathToVault, {start: iv.length})
          const writeToBuffer = new Writable({
            write(chunk, enc, callback) {
              buffer += decoder.write(chunk)
              callback(chunk)
            }
          })

          pipeline([readStream, decipher, writeToBuffer], () => {
            try {
              /*
               * this call to decipher.final() is required here otherwise
               * decipher holds remaining data that isn't written to the pipe,
               * which is the stupidest shit I've ever seen. Wasted ~3 hrs
               */
              buffer += decoder.write(decipher.final())
              buffer += decoder.end()
              Object.assign(this.vault, JSON.parse(buffer))
              this.fire('loaded-vault', this)
              this.vaultToData()
              resolve()
            } catch (err) {
              // fuq
              reject(Error('Incorrect username or password'))
            }
          })
        })
      })
    }
  }

  async writeVaultFile() {
    if (!this.data.hash) return 

    const pathToVault = await this.getVaultFile()

    this.dataToVault()
    return new Promise(resolve => {
      /* generate a random iv -- do this every time because why not */
      crypto.randomFill(new Uint8Array(16), (err, iv) => {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.data.hash, iv)
        const writeStream = fs.createWriteStream(pathToVault)

        writeStream.write(iv, () => {
          const readFromBuffer = new Readable()
          readFromBuffer.push(Buffer.from(JSON.stringify(this.vault), 'utf8'))
          readFromBuffer.push(null)
          pipeline([readFromBuffer, cipher, writeStream], () => {
            resolve()
          })
        })
      })
    })
  }

  async purgeLogFile() {
    const pathToLog = await this.getLogFile()
    const writeStream = fs.createWriteStream(pathToLog)
    writeStream.write('')
    writeStream.end()
  }

  flagsObjectToFlagsBuffer(flagsObject) {
    if (!flagsObject) return Buffer.from([0x0, 0x0, 0x0])

    const result = Buffer.allocUnsafe(3)
    /* 
     * offline 0b001
     * edited  0b010
     * removed 0b100
     */

    let flagsBinary = 0

    flagsObject.offline && (flagsBinary |= 0b001)
    flagsObject.edited  && (flagsBinary |= 0b010)
    flagsObject.removed && (flagsBinary |= 0b100)
    result.writeUIntBE(flagsBinary, 0, 3)
    return result
  }

  flagsBufferToFlagsObject(flagsBuffer) {
    if (!flagsBuffer) return {}

    const result = {}
    /* 
     * offline 0b001
     * edited  0b010
     * removed 0b100
     */

    const flagsBinary = flagsBuffer.readUIntBE(0, 3)

    flagsBinary & 0b001 && (result.offline = true)
    flagsBinary & 0b010 && (result.edited  = true)
    flagsBinary & 0b100 && (result.removed = true)
    return result
  }

  async writeToLogFile(args) {
    const {
      uuid,
      outgoing=false,
      ts=this.now(), /* this is the target ts of the message to log */
      flags=Buffer.from([0x0, 0x0, 0x0]),
      md,
      entryTs 
    } = args

    /* 
     * log entry structure:
     * uuid(25-UTF8) direction(1) ts-entry(8-BE) ts-target(8-BE) flags(3) datalen(4-BE) iv(16)  buffer(n)
     *    0 - 24         25           26-33          34-41        42-44     45-48       49-64  65-(65+n-1)
     */

    if (this._writingToLog) {
      this._logQueue.push({
        uuid, outgoing, ts, flags, md
      })
      return
    }

    this._writingToLog = true
    const pathToLog = await this.getLogFile()
    const writeStream = fs.createWriteStream(pathToLog, {
      flags: 'a', /* open for appending only */
    })

    writeStream.write(Buffer.from(uuid, 'utf8'))
    writeStream.write(Buffer.from([outgoing]))

    const tsEntryBuffer = Buffer.allocUnsafe(8)
    tsEntryBuffer.writeBigUInt64BE(BigInt(entryTs ?? this.now()))
    writeStream.write(tsEntryBuffer)

    const tsTargetBuffer = Buffer.allocUnsafe(8)
    tsTargetBuffer.writeBigUInt64BE(BigInt(ts))
    writeStream.write(tsTargetBuffer)

    if (!(flags instanceof Buffer) && typeof flags === 'object') {
      writeStream.write(this.flagsObjectToFlagsBuffer(flags))
    } else {
      writeStream.write(flags)
    }

    return new Promise(resolve => {
      crypto.randomFill(new Uint8Array(16), (err, iv) => {
        const cipher = crypto.createCipheriv('aes-256-cbc', this.data.hash, iv)

        let buffer = Buffer.from([])
        if (md) {
          /* 
           * allow for modifications to the flags of existing messages without actually
           * storing any MD data
           */
          buffer = Buffer.concat([cipher.update(md, 'utf8'), cipher.final()]) 
        }

        const lenBuffer = Buffer.allocUnsafe(4)
        lenBuffer.writeUInt32BE(buffer.length)
        writeStream.write(lenBuffer)
        writeStream.write(iv)
        writeStream.write(buffer)
        writeStream.end()
        this._writingToLog = false
        if (this._logQueue.length) {
          this.writeToLogFile(this._logQueue.shift())
            .then(resolve)
        } else {
          resolve()
        }
      })
    })
  }

  async indexLogFile() {
    this.transactions.markers.clear()

    let lastTs = 0

    return this._readLogFile(undefined, undefined, params => {
      const { entryTs: ts, currentByte, totalBytes } = params
      if (new Date(ts).getDate() !== new Date(lastTs).getDate()) {
        this.transactions.markers.add({ts, offset: totalBytes - currentByte})
      }
      lastTs = ts
    })
  }

  async readLogFile(startOffset, endOffset) {

    this.transactions.history = []
    for (const uuid in this.data.contacts) {
      const contact = this.data.contacts[uuid]
      contact.clearLogHistories(true)
    }

    return this._readLogFile(startOffset, endOffset, params => {
      const { uuid, outgoing, targetTs, iv, encryptedDataBuffer } = params
      if (encryptedDataBuffer.length) {
        let data = ''
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.data.hash, iv)
        data += decipher.update(encryptedDataBuffer, null, 'utf8')
        data += decipher.final('utf8') 
        params.md = data
        delete params.iv
        delete params.encryptedDataBuffer
      }

      params.flags = this.flagsBufferToFlagsObject(params.flags)

      const contact = this.getContact(uuid, true) 
      contact.writeToAuxiliaryLog(params.md, outgoing, targetTs, params.flags)

      this.transactions.history.push(params)
    })
  }

  async _readLogFile(startOffset, endOffset, process) {
    const pathToLog = await this.getLogFile()
    const readStream = fs.createReadStream(pathToLog, {
      ...(!isNaN(endOffset) && { end: endOffset }),
      ...(!isNaN(startOffset) && { start: startOffset })
    })
    let uuid = ''
    let outgoing = false
    let encryptedDataBuffer
    const tsEntryBuffer = Buffer.allocUnsafe(8)
    const tsTargetBuffer = Buffer.allocUnsafe(8)
    const lenBuffer = Buffer.allocUnsafe(4)
    const flags = Buffer.from([0x0, 0x0, 0x0])
    const iv = Buffer.allocUnsafe(16)

    let dataLength = 0
    let currentByte = 0
    let totalBytes = 0
    let totalEvents = 0

    readStream.on('data', chunk => {
      for (const code of chunk) {

        /* read only the entry ts and data length */
        if (currentByte >= 0 && currentByte < 25) {
          uuid += String.fromCharCode(code)
        } else if (currentByte === 25) {
          /* coerce to boolean */
          outgoing = !!code
        } else if (currentByte >= 26 && currentByte < 34) {
          tsEntryBuffer[currentByte - 26] = code
        } else if (currentByte >= 34 && currentByte < 42) {
          tsTargetBuffer[currentByte - 34] = code
        } else if (currentByte >= 42 && currentByte < 45) {
          flags[currentByte - 42] = code
        } else if (currentByte >= 45 && currentByte < 49) {
          lenBuffer[currentByte - 45] = code
        } else if (currentByte >= 49 && currentByte < 65) {
          iv[currentByte - 49] = code 
        } else if (currentByte >= 65) {
          encryptedDataBuffer[currentByte - 65] = code
        }

        /* parse the entry ts and data length */
        if (currentByte === 48) {
          dataLength = lenBuffer.readUInt32BE(0)
          encryptedDataBuffer = Buffer.allocUnsafe(dataLength)
        }
        currentByte++
        totalBytes++

        if (currentByte === 65 + dataLength) {
          totalEvents++
          process({
            uuid,
            outgoing,
            entryTs: Number(tsEntryBuffer.readBigUInt64BE()),
            targetTs: Number(tsTargetBuffer.readBigUInt64BE()),
            flags,
            iv,
            encryptedDataBuffer,
            totalBytes,
            currentByte
          })
          uuid = ''
          currentByte = 0
        }
      }
    })

    return new Promise(resolve => {
      readStream.on('end', () => {
        resolve({ totalBytes, totalEvents })
      })
    })
  }

  async connect(retryOnly) {
    if (!this.data.uuid) throw Error('No uuid')

    if (this.isWsConnected() && retryOnly) {
      return 
    }

    return new Promise((resolve, reject) => {
      if (this.webSocket) {
        this.webSocket.close()
      }

      this.webSocket = new ws(`ws://${this.serverUrl}`)
      this.webSocket.on('error', evt => {
        const message = 'Real-time connection to serverino encountered an error'
        this.notify({
          title: 'Connection Error',
          content: message,
          className: 'warn'
        })
        reject(Error(message))
      })
      this.webSocket.on('message', async evt => {
        if (evt === 'connected') {
          if (this.isWsConnected()) {
            this.webSocket.send(`cli:${this.data.uuid}`)
            resolve()
          }
        } else if (typeof evt === 'string') {
          const prefix = evt.split(':')[0]
          const data = evt.slice(prefix.length + 1)
          switch (prefix) {
          case 'req':
            {
              const dataSplit = data.split('|')
              const targetContact = this.getContact(dataSplit[0])
              targetContact.publicKey = Buffer.from(dataSplit[1], 'base64')
              /* cache-bust existing sharedSecret, which may be stale */
              targetContact.sharedSecret = undefined
              /* command ui to display a "notification" */
              targetContact.conversationRequest()
              this.blastLogsRightOnOver(targetContact.uuid, true)
              break
            }
          case 'acc':
            {
              /* 
               * this is the accept case -- still have to set the publicKey but
               * don't show a notification in the ui about it
               */
              const dataSplit = data.split('|')
              const targetContact = this.getContact(dataSplit[0])
              targetContact.publicKey = Buffer.from(dataSplit[1], 'base64')
              /* cache-bust existing sharedSecret, which may be stale */
              targetContact.sharedSecret = undefined
              this.blastLogsRightOnOver(targetContact.uuid, true)
              break
            }
          case 'ack':
            {
              /*
               * peer sends an 'ack'nowledgment message with the timestamp of the 
               * message that it received. This will switch that message to 'online'
               */
              const target = data.slice(0, 25)
              /* 25-50 is 'this' uuid, so ignore it */
              try {
                const ts = Number(data.slice(50))
                const targetContact = this.getContact(target)
                const { item }= targetContact.log.get(ts)
                if (item) {
                  if (item.flags.offline) {
                    delete item.flags.offline
                    await this.writeToLogFile({
                      uuid: target,
                      outgoing: true,
                      ts,
                      flags: item.flags
                    })
                  }
                }
                await this.writeVaultFile()
                this.fire('messaging', {source: this, target: targetContact})
              } catch (err) {
                /* do nothing */
              }
              break
            }
          case 'log':
            {
              /*
               * peer sends an log request to sync messages
               */
              const target = data.slice(0, 25)
              /* 25-50 is 'this' uuid, so ignore it */
              const targetContact = this.getContact(target)
              for (const entry of targetContact.log.all()) {
                delete entry.flags.offline
              }
              this.blastLogsRightOnOver(target, true)
              break
            }
          default:
            break
          }
        } else if (evt instanceof Uint8Array || evt instanceof Buffer) {
          const rawData = Buffer.from(evt)
          const messagePrefix = Buffer.from('msg:', 'utf8')
          const infoPrefix = Buffer.from('info:', 'utf8')
          let handler = this.parseMessageReceived
          let dataBuffer, target, contact
          if (messagePrefix.equals(rawData.slice(0, messagePrefix.length))) {
            dataBuffer = rawData.slice(messagePrefix.length)
          } else if (infoPrefix.equals(rawData.slice(0, infoPrefix.length))) {
            dataBuffer = rawData.slice(infoPrefix.length)
            handler = this.parseInfoReceived
          }

          if (!dataBuffer) return

          /* "target" is really the source contact in this case -- the sender */
          target = dataBuffer.slice(0, UUID_LEN).toString('utf8')

          if (!target) return

          contact = this.getContact(target)

          if (!contact) return 
          if (!contact.sharedSecret) return

          let data = ''
          try {
            const iv = dataBuffer.slice(UUID_LEN + UUID_LEN, UUID_LEN + UUID_LEN + 16)
            const encMessage = dataBuffer.slice(UUID_LEN + UUID_LEN + 16)
            const decipher = crypto.createDecipheriv('aes-256-cbc', contact.sharedSecret.slice(0, 32), iv)
            data += decipher.update(encMessage, null, 'utf8')
            data += decipher.final('utf8') 
            handler.call(this, contact, data)
          } catch (err) {
            /* deciphering usually fails when the public key is stale */
          }
          return 
        }
      })
    })
  }

  updateContact(contact, info) {
    /* this sucks */
    Object.assign(contact, info)
  }

  parseMessageReceived(contact, data) {
    try {
      const rjson = JSON.parse(data)
      const outgoing = !(rjson.outgoing ?? true)
      /* this is a hack */
      delete rjson.flags.offline
      const  wroteToLog = contact.writeToLog(rjson.md, outgoing, rjson.ts, rjson.flags)
      this.writeVaultFile()
      this.webSocket.send(`ack:${this.data.uuid}${contact.uuid}${rjson.ts}`)
      if (wroteToLog) {
        this.writeToLogFile({
          uuid: contact.uuid,
          outgoing,
          ts: rjson.ts,
          flags: rjson.flags || {},
          md: rjson.md
        })
      }
      this.fire('message-received', {source: contact, data: data})
      this.fire('messaging', {source: contact, target: this})
    } catch (err) {
      /* do nothing */
    }
  }

  parseInfoReceived(contact, info) {
    try {
      const rjson = JSON.parse(info)
      if (rjson.updateContact) {
        this.updateContact(contact, rjson.updateContact)
      }
      this.fire('info-received', {source: contact, data: rjson})
    } catch (err) {
      /* do nothing */
    }
  }

  async talkTo(target) {
    if (!target) return
    if (!this.data.uuid) return 
    
    const targetContact = this.getContact(target)

    this.fire('talk-to', {target: targetContact})

    /*
    if (targetContact.publicKey) {
      this.fire('talk-to', {response: {}, target: targetContact})
      return {}
    }
    */

    if (!this.isWsConnected()) {
      try {
        await this.connect()
      } catch (err) {
        /* do nothing */
      }
    }

    await this.getTsOffset()

    const result = await ipcr.invoke('talk-to', {
      url: `http://${this.serverUrl}/talkto`,
      params: {
        source: this.data.uuid,
        target: target,
        publicKey: targetContact.secret.getPublicKey().toString('base64'),
        availablePorts: [80, 443]
      }
    })

    if (result.status === 'accept_response' && result.publicKey) {
      /* this is the public key from the target's secretKey */
      targetContact.publicKey = Buffer.from(result.publicKey, 'base64')
      if (this.isWsConnected()) {
        this.webSocket.send(`log:${this.data.uuid}${targetContact.uuid}`)
      }
    } else if (result.status === 'error') {
      /* throw whatever error it is */
      this.fire('talk-to-error', {...result, target: targetContact})
    }

    return result
  }

  async blastLogsRightOnOver(target, force) {
    const contact = this.getContact(target)

    if (!contact) return
    if (!contact.sharedSecret) return 

    const offlineEntries = force ? contact.log.all() : contact.getOfflineMessages()
    if (offlineEntries.length) {
      for (const offlineEntry of offlineEntries) {
        await this.message(contact.uuid, offlineEntry.md, offlineEntry.ts, {...offlineEntry.flags})
      }
    }
    this.fire('messaging', {source: this, target: target})
    this.writeVaultFile()
    return
  }

  async message(target, md, ts=this.now(), flags={}) {
    const data = { md, ts, flags }
    const result = await this.send('msg', target, JSON.stringify(data))
    this.fire('message-sent', {result: result, target: target, data: data})
    this.fire('messaging', {source: this, target: target})
    return result
  }

  async sendInfo(target) {
    const info = {
      contactInfo: {
        uuid: this.data.uuid,
        username: this.data.username
      }
    }
    const result = this.send('info', target, JSON.stringify(info))
    this.fire('info-sent', {target: target, data: info})
    return result
  }

  isWsConnected() {
    if (!this.webSocket) return false
    return this.webSocket.readyState === ws.OPEN
  }

  async send(prefix, target, data) {
    const contact = this.getContact(target)

    if (!contact.sharedSecret) return {offline: true}

    if (!this.isWsConnected()) {
      try {
        await this.connect()
      } catch (err) {
        return {offline: true}
      }
    }

    return new Promise(resolve => {
      crypto.randomFill(new Uint8Array(16), (err, iv) => {

        const cipher = crypto.createCipheriv('aes-256-cbc', contact.sharedSecret.slice(0, 32), iv)

        const prefixBuffer = Buffer.from(`${prefix}:` + this.data.uuid + target, 'utf8')
        const cipheredBuffer = Buffer.from(cipher.update(data))
        const finalCipheredBuffer = Buffer.from(cipher.final())

        if (this.isWsConnected()) {
          this.webSocket.send(Buffer.concat([prefixBuffer, Buffer.from(iv), cipheredBuffer, finalCipheredBuffer]))
          resolve({online: true})
        }
      })
    })
  }

  async logon(username, password, email) {
    if (typeof username === 'undefined') {
      username = this.data.username
    } else if (typeof username === 'string') {
      this.setUsername(username)
    }

    if (typeof password === 'undefined') {
      password = this.data.password
    } else if (typeof password === 'string') {
      this.setPassword(password)
    }

    if (typeof email === 'string') {
      this.setEmail(email)
    }

    if (username && password) {
      const hash = crypto.createHash('sha256')
      hash.update(username)
      hash.update(password)
      const buffer = hash.digest() 
      this.setHash(Buffer.from(buffer))
      this.getTsOffset()

      try {
        await this.loadVaultFile()

        this.fire('logon')
        await this.connect()
        return buffer
      } catch (err) {
        this.fire('logon-failure', err.message)
      }
    }
  }

  notify(params) {
    const eventParams = Object.assign({
      title: 'Notification',
      content: 'This is a notification',
      ts: this.now(),
      id: crypto.randomBytes(20).toString('hex')
    }, params)

    this.notifications.set(eventParams.id, eventParams)
    this.fire('notification', eventParams)
  }

  cancelNotify(identifier, handlerParams) {
    if (this.notifications.has(identifier)) {
      const notification = this.notifications.get(identifier)
      if (typeof notification.handler === 'function') {
        notification.handler(handlerParams || {})
      }
      this.notifications.delete(identifier)
      this.fire('notification-cancel', notification)
    }
  }

  getTitle() {
    return this.data.displayName || this.data.username || this.data.uuid || "There's nothing here"
  }
  
  upsertContact(uuid) {
    if (!uuid) uuid = this.generateHilariousRandomIdentifier()
    const existingContact = (uuid in this.data.contacts)
    const contact = this.getContact(uuid, true)
    this.fire('upsert-contact', {existingContact: existingContact, contact: contact})
    return contact
  }

  cancelUpsertContact(uuid) {
    if (!uuid) return
    const contact = this.getContact(uuid, true)
    if (!contact) return
    this.fire('cancel-upsert-contact', {contact: contact})
    return contact
  }

  async confirmUpsertContact(contact) {
    let createdContact = false
    if (!(contact.uuid in this.data.contacts)) {
      this.data.contacts[contact.uuid] = contact
      createdContact = true
    }
    await this.writeVaultFile()
    this.fire('confirm-upsert-contact', {contact: contact})
    if (createdContact) {
      this.fire('create-contact', {contact: contact})
    }
    return contact
  }

  async deleteContact(uuid) {
    if (!uuid) return
    const contact = this.getContact(uuid, true)
    if (!contact) return
    delete this.data.contacts[uuid]
    await this.writeVaultFile()
    this.fire('delete-contact', {contact: contact})
    return contact
  }

  async getTsOffset() {
    if (this._sinceLastOffset) {
      this._sinceLastOffset--
      return this.tsOffset
    }

    const startTs = Date.now()
    const result = await ipcr.invoke('web-req', {
      url: `http://${this.serverUrl}/info`,
    })

    /*
     * normal case
     * start     server        end
     *   ├─────────┼────────────┤
     *
     * shad's case
     * start    end           server
     *   ├───────┤              │   
     */

    this.tsOffset = result.ts - startTs
    this._sinceLastOffset = 8
    return this.tsOffset
  }
  
  previewMessage(md) {
    this.fire('message-preview', md)
  }

  editMessage(uuid, ts) {
    if (!uuid) {
      this.fire('message-edit', {})
      return
    }
    const contact = this.getContact(uuid, true)
    if (!contact) return
    
    let logEntry
    if (ts) { 
      logEntry = contact.log.get(ts).item
    } else {
      /* get the last non-removed entry to edit if no ts is specified */
    const entries = contact.log.all()
    for (let a = entries.length - 1; a >= 0; a--) {
      if (!entries[a].removed && 
        entries[a].uuid === this.data.uuid) {
          logEntry = entries[a]
        break
      }
    }
    }

    if (!logEntry) return

    this.fire('message-edit', {contact, logEntry })
    return { contact, logEntry }
  }
  
  now() {
    return Date.now() + this.tsOffset
  }
}

exports.SpiritClient = SpiritClient

