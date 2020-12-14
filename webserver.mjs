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

app.ws('/', ws => {
  ws.isAlive = true
  ws.send('connected')
  ws.on('pong', wsHeartbeat)
  ws.on('message', async msg => {
    if (typeof msg === 'string') {
      const prefix = msg.split(':')[0]
      const data = msg.slice(prefix.length + 1)
      switch (prefix) {
      case 'dat':
        ws.send('test')
        break
      case 'cli':
        cli_cache.set(ws, data)
        uuid_cache.set(data, ws)
        break
      case 'con':
        {
          const targetClient = uuid_cache.get(data)
          if (targetClient) {
            targetClient.send(msg)
          }
          break
        }
      case 'msg':
        {
          const msgJson = JSON.parse(data)
          const targetClient = uuid_cache.get(msgJson.target)
          if (targetClient) {
            targetClient.send(msg)
          }
          break
        }
      default:
        break
      }
    } else if (msg instanceof Buffer) {
      const messagePrefix = Buffer.from('msg:', 'utf8')
      const infoPrefix = Buffer.from('info:', 'utf8')
      let dataBuffer
      if (messagePrefix.equals(msg.slice(0, messagePrefix.length))) {
        dataBuffer = msg.slice(messagePrefix.length)
      } else if (infoPrefix.equals(msg.slice(0, infoPrefix.length))){
        dataBuffer = msg.slice(infoPrefix.length)
      }
      if (!dataBuffer) return

      /* the first 25 bytes is the source uuid, so take the next 25 bytes */
      const targetClientUuid = dataBuffer.slice(25, 50).toString('utf8')
      const targetClient = uuid_cache.get(targetClientUuid)
      if (targetClient) {
        targetClient.send(msg)
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

app.get('/favicon.ico', (request, response) => {
  response.sendFile(`${dirname}/public/favicon.ico`)
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
    req.body.publicKey &&
    req.body.availablePorts) {
    const forwardKey = `${req.body.source}-${req.body.target}`
    const reverseKey = `${req.body.target}-${req.body.source}`

    /* 
     * check the client cache for an online client matching the 'target' 
     *
     * this will notify the target that a conversation is requested.
     * the target still has to respond by submitting their own 'talk-to'
     * request. This is the only way to exchange public keys
     *
     */
    if (uuid_cache.has(req.body.target)) {
      const targetClient = uuid_cache.get(req.body.target)
      if (targetClient) {
        targetClient.send(`req:${req.body.source}|${req.body.publicKey}`)
      }
    }

    if (cache.has(reverseKey)) {
      const reverseRequest = cache.get(reverseKey)

      /* handle the case where there is already a request from another peer to this peer */
      res.json({ 
        success: true,
        status: 'accept_response',
        message: `Request sent from: ${req.body.target}`,
        publicKey: reverseRequest.publicKey
      })

      cache.delete(reverseKey)
      cache.delete(forwardKey) /* this shouldn't really be necessary */

    } else if (!cache.has(forwardKey)) {
      cache.set(forwardKey, {
        fromPeerUDID: req.body.source,
        toPeerUDID: req.body.target,
        publicKey: req.body.publicKey,
        availablePorts: req.body.availablePorts,
        ts: Date.now()
      })
      res.json({ 
        success: true,
        status: 'pending_response',
        message: `Request sent to: ${req.body.target}`,
        target: req.body.target
      })
    } else {
      const cacheEntry = cache.get(forwardKey)
      cacheEntry.ts = Date.now()
      res.json({ 
        success: true,
        status: 'pending_response',
        message: `Request already sent to: ${req.body.target}`,
        target: req.body.target
      })
    }
  } else {
    const missingParams = []
    if (!req.body.source) missingParams.push('Source UDID')
    if (!req.body.target) missingParams.push('Target UDID')
    if (!req.body.publicKey) missingParams.push('Public Key')
    if (!req.body.availablePorts) missingParams.push('Available Ports')
    res.json({
      success: false,
      status: 'error',
      message: `Missing request parameters: ${missingParams.join(', ')}`
    })
  }
})

function groomCache() {
  const now = Date.now()
  const expirationTime = 5 * 60 * 1000 /* faiv minut */
  for (const [key, value] of cache) {
    const diff = now - value.ts 
    if (diff > expirationTime) {
      cache.delete(key)
    }
  }
  setTimeout(groomCache, 30000)
}

groomCache()

app.get('/clients', (req, res) => {
  res.json({count: cli_cache.size})
})

app.get('/cache', (req, res) => {
  const result = {}
  for (const entry of cache.entries()) {
    result[entry[0]] = Object.assign({}, entry[1])
  }
  res.json(result)
})

app.get('/info', (req, res) => {
  res.json({ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress})
})

app.get('/*', (request, response) => {
  response.sendFile(`${dirname}/web/${request.params['0']}`)
})
