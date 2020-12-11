import Evt from './Evt'
import Config from './config.mjs'
// import {v4 as uuidv4} from 'uuid'
const ipcr = window.require('electron').ipcRenderer
const fs = window.require('fs')
const fsp = window.require('fs').promises
const crypto = window.require('crypto')
const path = window.require('path')
// const {Transform} = window.require('stream')
const {pipeline, finished, Readable, Writable} = window.require('stream')
const {StringDecoder} = window.require('string_decoder')


const SERVER_URL = Config.SERVER_URL
const ECDH_CURVE = 'secp521r1'
const UUID_LEN = 25

class SpiritClient extends Evt { 
  constructor() {
    super()
    const data = {foundResourceFile: false, contacts: {}}
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
    this.data = new Proxy(data, proxy)
    this.vault = {contacts: {}}
    this.getVaultFile()
      .then(() => {
        this.fire('show-sign-up', !this.data.foundResourceFile)
      })

    this.notifications = new Map()
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
    if (this.vault.contacts) {
      const newContacts = {}
      for (const contactUuid in this.vault.contacts) {
        const newContact = {}
        const contact = this.vault.contacts[contactUuid]
        newContact.privateKey = Buffer.from(contact.privateKey, 'base64')
        if (contact.publicKey) newContact.publicKey = Buffer.from(contact.publicKey, 'base64')

        const secret = crypto.createECDH(ECDH_CURVE)
        secret.setPrivateKey(newContact.privateKey)
        newContact.secret = secret

        newContacts[contactUuid] = newContact 
      }
      this.data.contacts = newContacts
    }
    if (this.vault.uuid) this.setUuid(this.vault.uuid)
  }

  generateHilariousRandomIdentifier() {
    /*
     * Generate a series of consonant+vowel pairs of a fixed (40char) length
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

  getContact(uuid) {
    if (uuid === this.data.uuid) return 

    let result = {}
    const secret = crypto.createECDH(ECDH_CURVE)

    if (!(uuid in this.data.contacts)) {
      secret.generateKeys()
      result.privateKey = secret.getPrivateKey()
      result.uuid = uuid
      result.secret = secret
      this.data.contacts[uuid] = result
      this.fire('create-contact', result)
    } else {
      result = this.data.contacts[uuid]
    }

    if (!result.secret) {
      secret.setPrivateKey(result.privateKey)
      result.secret = secret
    }

    /* cache the sharedSecret if required data are present */
    if (result.privateKey && result.publicKey && ! result.sharedSecret) {
      result.sharedSecret = result.secret.computeSecret(result.publicKey)
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
    if (this.data.email) this.vault.email = this.data.email
    if (this.data.username) this.vault.username = this.data.username
    if (this.data.contacts) {
      const newContacts = {}
      for (const contactUuid in this.data.contacts) {
        const contact = this.data.contacts[contactUuid]
        const result = Object.assign({}, contact)

        /* don't write these keys */
        delete result.secret
        delete result.sharedSecret

        result.privateKey = contact.privateKey.toString('base64')
        if (contact.publicKey) result.publicKey = contact.publicKey.toString('base64')
        newContacts[contactUuid] = result 
      }
      this.vault.contacts = newContacts
    }
    if (!this.data.uuid) {
      this.vault.uuid = this.generateHilariousRandomIdentifier()
      this.setUuid(this.vault.uuid)
    }
  }

  async getVaultFile() {
    const dataPath  = await ipcr.invoke('get-env-path', 'data')
    const resolvedPath = path.resolve(dataPath)
    const filePath = path.resolve(dataPath, './vault.sp2p')
    try {
      await fsp.access(filePath)
      this.data.foundResourceFile = true
    } catch (err) {
      await fsp.mkdir(resolvedPath, {recursive: true})
      this.data.foundResourceFile = false
    }
    return filePath 
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

  async connect() {
    if (!this.data.uuid) throw Error('No uuid')

    return new Promise(resolve => {
      if (this.webSocket) {
        this.webSocket.close()
      }

      this.webSocket = new WebSocket(`ws://${SERVER_URL}`)
      this.webSocket.addEventListener('message', async evt => {
        if (evt.data === 'connected') {
          if (this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(`cli:${this.data.uuid}`)
            resolve()
          }
        } else if (typeof evt.data === 'string') {
          const prefix = evt.data.split(':')[0]
          const data = evt.data.slice(prefix.length + 1)
          switch (prefix) {
          case 'req':
            {
              const dataSplit = data.split('|')
              const targetContact = this.getContact(dataSplit[0])
              targetContact.publicKey = Buffer.from(dataSplit[1], 'base64')
              /* command ui to display a notification */
              this.fire('conversation-request', targetContact)
              break
            }
          default:
            break
          }
        } else if (evt.data instanceof Blob) {
          const rawData = Buffer.from(await evt.data.arrayBuffer())
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

          target = dataBuffer.slice(0, UUID_LEN).toString('utf8')

          if (!target) return

          contact = this.getContact(target)

          if (!contact) return 
          if (!contact.sharedSecret) return

          let md = ''
          const iv = dataBuffer.slice(UUID_LEN + UUID_LEN, UUID_LEN + UUID_LEN + 16)
          const encMessage = dataBuffer.slice(UUID_LEN + UUID_LEN + 16)
          const decipher = crypto.createDecipheriv('aes-256-cbc', contact.sharedSecret.slice(0, 32), iv)
          md += decipher.update(encMessage, null, 'utf8')
          md += decipher.final('utf8') 
          console.log(md)
          handler({contact: Object.assign({}, contact), data: md})
          return 
        }
      })
    })
  }

  parseMessageReceived(contact, md) {
    this.fire('message-received', {contact: contact, md: md})
  }

  parseInfoReceived(contact, info) {
    try {
      const rjson = JSON.parse(info)
      Object.assign(contact, rjson)
      this.fire('info-received', {contact: contact, info: rjson})
    } catch (err) {
      /* do nothing */
    }
  }

  async talkTo(target, ports) {
    if (!this.data.uuid) return 
    
    const targetContact = this.getContact(target)

    const result = await ipcr.invoke('talk-to', {
      url: `http://${SERVER_URL}/talkto`,
      params: {
        source: this.data.uuid,
        target: target,
        publicKey: targetContact.secret.getPublicKey().toString('base64'),
        availablePorts: [80, 443]
      }
    })
    console.log(result)

    if (result.status === 'accept_response' && result.publicKey) {
      /* this is the public key from the target's secretKey */
      targetContact.publicKey = Buffer.from(result.publicKey, 'base64')
    } else if (result.status === 'error') {
      /* throw whatever error it is */
      this.fire('error', result)
    }

    return result
  }

  async message(target, md) {
    return this.send('msg', target, md)
  }

  async sendInfo(target) {
    return this.send('info', target, JSON.stringify({
      uuid: this.data.uuid,
      username: this.data.username
    }))
  }

  async send(prefix, target, md) {
    const contact = this.getContact(target)
    if (!contact.sharedSecret) throw Error('Keys have not been exchanged') 

    if (!this.webSocket || 
      (this.webSocket && this.webSocket.readyState !== WebSocket.OPEN)) {
      await this.connect()
    }

    if (!contact.log) contact.log = []
    contact.log.push([Date.now(), md])

    return new Promise(resolve => {
      crypto.randomFill(new Uint8Array(16), (err, iv) => {

        const cipher = crypto.createCipheriv('aes-256-cbc', contact.sharedSecret.slice(0, 32), iv)

        const prefixBuffer = Buffer.from(`${prefix}:` + this.data.uuid + target, 'utf8')
        const cipheredBuffer = Buffer.from(cipher.update(md))
        const finalCipheredBuffer = Buffer.from(cipher.final())

        if (this.webSocket && 
          this.webSocket.readyState === WebSocket.OPEN) {
          this.webSocket.send(Buffer.concat([prefixBuffer, Buffer.from(iv), cipheredBuffer, finalCipheredBuffer]))
          resolve()
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

      try {
        await this.loadVaultFile()

        this.fire('logon')
        this.connect()
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
      ts: Date.now(),
      id: crypto.randomBytes(20).toString('hex')
    }, params)

    this.notifications.set(eventParams.id, eventParams)
    this.fire('notification', eventParams)
  }

  cancelNotify(identifier) {
    if (this.notifications.has(identifier)) {
      const notification = this.notifications.get(identifier)
      this.notifications.delete(identifier)
      this.fire('notification-cancel', notification)
    }
  }
  
}

export default SpiritClient
