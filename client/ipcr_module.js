const EnvPaths = require('env-paths')('SpiritPeers', { suffix: '' })
const http = require('http')

module.exports = {
  invoke: async function(evtName, args) {
    switch (evtName) {
    case 'get-env-path': 
      {
        return new Promise(resolve => {
          if (typeof args === 'string') {
            resolve(EnvPaths[args || 'data'])
          } else {
            resolve({
              data: EnvPaths.data,
              config: EnvPaths.config,
              cache: EnvPaths.cache,
              log: EnvPaths.log,
              temp: EnvPaths.temp
            })
          }
        })
      }
    case 'web-req': {
      return new Promise(resolve => {
        const { url, method='GET', headers, params } = args
        const req = http.request(url, {
          method: method,
          timeout: 3000
        })
        if (typeof headers === 'object') {
          for (const headerName in headers) {
            req.setHeader(headerName, headers[headerName])
          }
        }
        req.on('error', err => {
          resolve({
            status: 'error',
            message: 'Could not connect to server' 
          })
        })
        req.on('response', response => {
          let buffer = ''
          response.on('data', chunk => {
            buffer += chunk.toString()
          })
          response.on('end', () => {
            try {
              resolve(JSON.parse(buffer))
            } catch (err) {
              resolve({
                status: 'error',
                message: err.message 
              })
            }
          })
        })
        if (params) {
          const sendBuffer = Buffer.from(JSON.stringify(params), 'utf-8')
          req.write(sendBuffer)
        }
        req.end()
      })
    }
    case 'talk-to': 
      {
        return new Promise(resolve => {
          const { url, params } = args
          const sendBuffer = Buffer.from(JSON.stringify(params), 'utf-8')
          const req = http.request(url, {
            method: 'POST',
            timeout: 3000
          })
          req.setHeader('Content-Type', 'application/json')
          req.on('error', err => {
            console.log(err)
            resolve({
              status: 'error',
              message: 'Could not connect to server' 
            })
          })
          req.on('response', response => {
            let buffer = ''
            response.on('data', chunk => {
              buffer += chunk.toString()
            })
            response.on('end', () => {
              try {
                resolve(JSON.parse(buffer))
              } catch (err) {
                resolve({
                  status: 'error',
                  message: `Unable to talk to "${params.target}"` 
                })
              }
            })
          })
          req.write(sendBuffer)
          req.end()
        })
      }
    default:
      {
        /* do nothing */
        return Promise.resolve()
      }
    }
  }
}
