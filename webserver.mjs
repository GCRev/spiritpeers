import Express from 'express'
import Parser from 'body-parser'
import Path from 'path'
import ExpressWs from 'express-ws'

const app = Express()

app.use(Parser.json())
const wsI = ExpressWs(app).getWss()

app.listen(process.env.PORT || 54040, () => { console.log(`started on ${process.env.PORT || 54040}`)})

const dirname = Path.resolve('.')

app.get('/', (req, res)=> {
  res.sendFile(`${dirname}/web/index.html`)
})

app.get('/global/*', (request, response) => {
  response.sendFile(`${dirname}/global/${request.params['0']}`)
})

app.get('/src/*', (request, response) => {
  response.sendFile(`${dirname}/src/${request.params['0']}`)
})

app.get('/*', (request, response) => {
  response.sendFile(`${dirname}/web/${request.params['0']}`)
})
