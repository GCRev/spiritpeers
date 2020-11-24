import {fs, fsp as promises} from 'fs'
import crypto from 'crypto'
import Path from 'path'

class SpiritClient {
  constructor() {
  }
  setUsername(username) {
    this.username = username
  }
  setPassword(password) {
    this.password = password
  }
  setHash(hashBuffer) {
    if (typeof hashBuffer === 'string') {
      this.hash = Buffer.from(hashBuffer, 'hex')
    } else if (hashBuffer instanceof Buffer) {
      this.hash = hashBuffer
    }
  }
  logon(username, password) {
    if (typeof username === 'undefined') {
      username = this.username
    }
    if (typeof password === 'undefined') {
      password = this.password
    }
    if (username && password) {
      const hash = crypto.createHash('sha256')
      hash.update(username)
      hash.update(password)
      const buffer = hash.digest() 
      this.setHash(Buffer.from(buffer))
      return buffer
    }
  }
}

export default SpiritClient
