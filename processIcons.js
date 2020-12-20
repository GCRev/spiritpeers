const fs = require('fs')
const {Transform} = require('stream')
// remove all the inline style information from all elements in the icon files

const inputPathName = './public/icons_raw/'
const outputPathName = './public/icons_proc/'

class StyleRemove extends Transform {
  constructor() {
    super()
    this.buffer = []
    this.index = 0
  }
  checkBuffer() {
    const chars=['s', 't', 'y', 'l', 'e']
    let equal = true
    for (let c = 0; c < chars.length && equal; c++) {
      equal = this.buffer[this.buffer.length - chars.length + c] === chars[c].charCodeAt()
    }
    return equal
  }
  _transform(chunk, enc, callback) {
    if (chunk) {
      for (let a = 0; a < chunk.length; a++) {
        const charCode = chunk[a]
        let char = String.fromCharCode(charCode)
        if (this.checkBuffer()) {
          this.passedStyle = true
          // remove these characters from the buffer
          this.buffer.splice(-5, 5)
        }
        if (!this.passedStyle) {
          this.buffer.push(charCode)
        } else if (!this.quoteCar) {
          // check opening quote and store it for a
          // match later
          if (char === "'" || char === '"') {
            this.quoteCar = char
          }
        } else if (this.quoteCar) {
          // if quoteCar has been assigned then 
          // only reset after a match has been found
          if (char === this.quoteCar) {
            this.quoteCar = undefined
            this.passedStyle = false
          }
        }

        this.index ++
      }
    }
    if (!this.passedStyle) {
      // write out the buffer and clear the internal one
      callback(null, Buffer.from(this.buffer))
      this.buffer = []
    }
  }
}

async function processFile(fileName) {
  const readStream = fs.createReadStream(inputPathName + '/' + fileName)
  const styleRemove = new StyleRemove()
  const outputStream = fs.createWriteStream(outputPathName + '/' + fileName)

  readStream.pipe(styleRemove).pipe(outputStream)
}

async function processDir() {
  try {
    const files = await fs.promises.readdir(inputPathName)
    for (const file of files) {
      processFile(file)
    }
  } catch (err) {
    console.log(err)
  }
}

processDir()
