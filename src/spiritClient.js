import Evt from './Evt'
import {v4 as uuidv4} from 'uuid'
const ipcr = window.require('electron').ipcRenderer
const fs = window.require('fs')
const fsp = window.require('fs').promises
const crypto = window.require('crypto')
const path = window.require('path')
// const {Transform} = window.require('stream')
const {pipeline, finished, Readable, Writable} = window.require('stream')
const {StringDecoder} = window.require('string_decoder')

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
        const oldval = obj[prop]
        obj[prop] = value
        if (oldval !== value) {
          this.fire(`set-${prop}`, value)
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

  validatePassword(password, confirmPassword) {
    if (!password || !confirmPassword) return ['Password must not be blank']

    if (password !== confirmPassword) return ['Password and confirmation do not match']

    const reasons = []
    if (password.length < 8) reasons.push('Password must be longer than 8 characters')
    if (!/\d/g.test(password)) reasons.push('Password must container at least 1 number')
    if (!/[^a-zA-Z0-9]/g.test(password)) reasons.push('Password must container at least 1 special (non-alphanumeric) character')
    if (password.length > 32) reasons.push("Come on now, we're not writing an essay here")

    return reasons
  }

  vaultToData() {
    if (this.vault.hash) this.setHash(this.vault.hash)
    if (this.vault.username) this.setUsername(this.vault.username)
    if (this.vault.email) this.setEmail(this.vault.email)
    if (this.vault.contacts) this.setContacts(this.vault.contacts)
  }

  dataToVault() {
    this.vault.hash = this.data.hash.toString('hex')
    if (this.data.email) this.vault.email = this.data.email
    if (this.data.username) this.vault.username = this.data.username
    if (this.data.contacts) this.vault.contacts = this.data.contacts
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
          readFromBuffer.push(new Buffer(JSON.stringify(this.vault), 'utf8'))
          readFromBuffer.push(null)
          pipeline([readFromBuffer, cipher, writeStream], () => {
            resolve()
          })
        })
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
        return buffer
      } catch (err) {
        this.fire('logon-failure', err.message)
      }
    }
  }
  
}

export default SpiritClient
