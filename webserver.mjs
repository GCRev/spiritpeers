import Express from 'express'
import Parser from 'body-parser'
import Path from 'path'
import ExpressWs from 'express-ws'
import {fs, promises as fsp} from 'fs'

const app = Express()

app.use(Parser.json())
const wsI = ExpressWs(app).getWss()

app.listen(process.env.PORT || 54040, () => { console.log(`started on ${process.env.PORT || 54040}`)})

const dirname = Path.resolve('.')
const contact_requests_path = `${dirname}/cache/contact_requests`
const cache = new Map()

app.get('/', (req, res)=> {
  res.sendFile(`${dirname}/web/index.html`)
})

app.get('/src/*', (request, response) => {
  response.sendFile(`${dirname}/src/${request.params['0']}`)
})

app.get('/*', (request, response) => {
  response.sendFile(`${dirname}/web/${request.params['0']}`)
})

async function loadCache() {
  const files = await fsp.readdir(contact_requests_path)
  let currentFile = 0
  const newLineCode = '\n'.charCodeAt()
  const loadFile = ()=> {
    const fileRead = fs.createReadStream(files[currentFile])
    let line = ''

    fileRead.on('data', data => {
      for (const byte of data) {
        if (byte !== newLineCode) {
          line += String.fromCharCode(byte)
        } else {
          const split = line.split(',')
          const fromPeerUDID = split[0]
          const toPeerUDID = split[1]
          const fromPeerAvailPorts = split[3].split(':')
          cache.set(`${fromPeerUDID}-${toPeerUDID}`, {
            fromPeerUDID: fromPeerUDID,
            toPeerUDID: toPeerUDID,
            availablePorts: fromPeerAvailPorts
          })
          line = ''
        }
      }
    })

    fileRead.on('error', err => {
      console.log('ass')
      console.log(err)
    })

    fileRead.on('end', () => {
      if (currentFile < files.length) {
        currentFile++
        loadFile()
      } else {
        return
      }
    })
  }
  loadFile()
}

// check for the necessary chache/contact_requests directory
fsp.access(contact_requests_path)
  .then(() => {
    // load the requests cache
    loadCache()
  })
  .catch(err => {
    // check err.code for ENOENT. If it's something else then we're phucked
    if (err.code === 'ENOENT') {
      return fsp.mkdir(contact_requests_path, {recursive: true})
    }
  })
  .catch(() => {
    console.log('Unable to create cache requests directory')
  })

app.post('/talkto', (req, res) => {
  if (req.body.source && 
    req.body.target &&
    req.body.availablePorts) {
    const forwardKey = `${req.body.source}-${req.body.target}`
    const reverseKey = `${req.body.target}-${req.body.source}`
    if (cache.has(reverseKey)) {
      // handle the case where there is already a request from another peer to this peer
      cache.delete(reverseKey)
      res.json({ 
        success: true,
        status: 'accept_response',
        message: `Request sent from: ${req.body.source}`
      })
    } else if (!cache.has(forwardKey)) {
      cache.set(forwardKey, {
        fromPeerUDID: req.body.source,
        toPeerUDID: req.body.target,
        availablePorts: req.body.availablePorts
      })
      res.json({ 
        success: true,
        status: 'pending_response',
        message: `Request sent to: ${req.body.target}`
      })
    } else {
      res.json({ 
        success: true,
        status: 'pending_response',
        message: `Request already to: ${req.body.target}`
      })
    }
  } else {
    const missingParams = []
    if (!req.body.source) missingParams.push('Source UDID')
    if (!req.body.target) missingParams.push('Target UDID')
    if (!req.body.availablePorts) missingParams.push('Available Ports')
    res.json({
      success: false,
      status: 'error',
      message: `Missing request parameters: ${missingParams.join(', ')}`
    })
  }
})
