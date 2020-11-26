import Evt from './Evt'
const ipcr = window.require('electron').ipcRenderer
const fs = window.require('fs')
const fsp = window.require('fs').promises
const crypto = window.require('crypto')
const path = window.require('path')

class SpiritClient extends Evt { 
  constructor() {
    super()
    this.foundResourceFile = false
    this.getVaultFile()
      .then(() => {
        this.fire('show-sign-up', !this.foundResourceFile)
      })
  }

  setUsername(username) {
    this.username = username
  }

  setPassword(password) {
    this.password = password
  }

  setEmail(email) {
    this.email = email
  }

  setHash(hashBuffer) {
    if (typeof hashBuffer === 'string') {
      this.hash = Buffer.from(hashBuffer, 'hex')
    } else if (hashBuffer instanceof Buffer) {
      this.hash = hashBuffer
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

  async getVaultFile() {
    const dataPath  = await ipcr.invoke('get-env-path', 'data')
    const resolvedPath = path.resolve(dataPath)
    const filePath = path.resolve(dataPath, './vault.sp2p')
    try {
      await fsp.access(filePath)
      this.foundResourceFile = true
    } catch (err) {
      await fsp.mkdir(resolvedPath, {recursive: true})
      this.foundResourceFile = false
    }
    return filePath 
  } 

  async loadVaultFile() {
    const pathToVault = await this.getVaultFile()

    if (!this.foundResourceFile) {

    } else {
      const readStream = fs.createReadStream(pathToVault)
    }
  }

  async logon(username, password, email) {
    if (typeof username === 'undefined') {
      username = this.username
    }

    if (typeof password === 'undefined') {
      password = this.password
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

      await this.loadVaultFile()

      this.fire('logon')
      return buffer
    }
  }
  
}

export default SpiritClient
