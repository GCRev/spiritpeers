import Express from 'express'
import Parser from 'body-parser'
import Path from 'path'
import ExpressWs from 'express-ws'
import {promises as fs} from 'fs'

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
  const files = await fs.readdir(contact_requests_path)
  let currentFile = 0
}

// check for the necessary chache/contact_requests directory
fs.access(contact_requests_path)
  .then(() => {
    // load the requests cache
    loadCache()
  })
  .catch(err => {
    // check err.code for ENOENT. If it's something else then we're phucked
    if (err.code === 'ENOENT') {
      return fs.mkdir(contact_requests_path, {recursive: true})
    }
  })
  .catch(() => {
    console.log('Unable to create cache requests directory')
  })

app.post('/wishfor', (request, response) => {
})
