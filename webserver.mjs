import Express from 'express'
import Parser from 'body-parser'
import * as Path from 'path'
import ExpressWs from 'express-ws'
import {default as fs, promises as fsp} from 'fs'

const app = Express()

app.use(Parser.json())
const wsi = ExpressWs(app).getWss()

app.listen(process.env.PORT || 54045, () => { console.log(`started on ${process.env.PORT || 54045}`)})

const dirname = Path.resolve('.')
const contact_requests_path = `${dirname}/cache/contact_requests`
const cache = new Map()

/* this a bimap, and it's the only way */
const cli_cache = new Map()
const uuid_cache = new Map()

async function checkCache() {

}

app.ws('/', ws => {
  ws.isAlive = true
  ws.send('connected')
  ws.on('pong', wsHeartbeat)
  ws.on('message', async msg => {
    const data = msg.split(':')[1]
    if (msg.startsWith('dat')) {
      ws.send('test')
    } else if (msg.startsWith('cli')) {
      cli_cache.set(ws, data)
      uuid_cache.set(data, ws)
    } else if (msg.startsWith('con')) {
      const client = uuid_cache.get(data)
      if (client) {
        client.send(msg)
      }
    }
  })
  ws.on('close', () => {
    const uuid = cli_cache.get(ws)
    cli_cache.delete(ws)
    if (uuid) uuid_cache.delete(uuid)
  })
})

function noop() {}

function wsHeartbeat() {
  this.isAlive = true
}

function groomWss() {
  for(const client of wsi.clients) {
    if (!client.isAlive) {
      client.terminate()
      const uuid = cli_cache.get(client)
      cli_cache.delete(client)
      if (uuid) uuid_cache.delete(uuid)
      break
    }
    client.isAlive = false
    client.ping(noop)
  }
  setTimeout(groomWss, 30000)
}

groomWss()

app.get('/', (req, res)=> {
  res.sendFile(`${dirname}/web/index.html`)
})

app.get('/src/*', (request, response) => {
  response.sendFile(`${dirname}/src/${request.params['0']}`)
})

app.get('/public/*', (request, response) => {
  response.sendFile(`${dirname}/public/${request.params['0']}`)
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

async function checkForCache() {
  // check for the necessary chache/contact_requests directory
  try {
    await fsp.access(contact_requests_path)
    // loadCache()
  } catch(err) {
    // check err.code for ENOENT. If it's something else then we're phucked
    if (err.code !== 'ENOENT') {
      console.log('Unable to create cache requests directory because of wrong access')
      return
    }
  }

  try {
    return await fsp.mkdir(contact_requests_path, {recursive: true})
  } catch (err) {
    console.log('Unable to create cache requests directory')
  }
}

checkForCache()

app.post('/talkto', (req, res) => {
  if (req.body.source && 
    req.body.target &&
    req.body.availablePorts) {
    const forwardKey = `${req.body.source}-${req.body.target}`
    const reverseKey = `${req.body.target}-${req.body.source}`

    /* check the client cache for an online client matching the 'target' */
    if (uuid_cache.has(req.body.target)) {
      const client = uuid_cache.get(req.body.target)
      if (client) {
        client.send(`req:${req.body.source}`)
      }
    }

    if (cache.has(reverseKey)) {
      /* handle the case where there is already a request from another peer to this peer */
      cache.delete(reverseKey)

      res.json({ 
        success: true,
        status: 'accept_response',
        message: `Request sent from: ${req.body.target}`
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

app.get('/info', (req, res) => {
  res.json({ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress})
})
