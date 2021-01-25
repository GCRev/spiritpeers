const { SpiritClient } = require('spirit-client')
const readline = require('readline')

const spiritClient = new SpiritClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function processArgs(args) {
  const newArgs = []

  let strOpen = undefined

  let bufferedArg = ''
  for (let a = 0; a < args.length; a++) {
    const arg = args[a]
    if (strOpen === undefined) {
      if (arg[0] === '"' ||
        arg[0] === "'") {
        strOpen = arg[0]
        /* start appending to the buffered argument */
        bufferedArg = arg.slice(1)
      } else {
        /* otherwise push the arg unmodified */
        newArgs.push(arg)
      }
    } else if (typeof strOpen === 'string') {
      bufferedArg += ' '
      /* this means a string has been started */
      if (arg.endsWith(strOpen)) {
        /* 
         * this argument ends the currently-opened string,
         * so push the arg onto the buffer, but not the closing character
         */
        bufferedArg += arg.slice(0,-1)
        newArgs.push(bufferedArg)
        bufferedArg = ''
        strOpen = undefined
      } else {
        /* append to buffered argument */
        bufferedArg += arg
      }
    } else {
      /* default case */
      newArgs.push(arg)
    }
  }

  /* if the user never closes the quot */
  if (bufferedArg) newArgs.push(bufferedArg)
  return newArgs
}

// console.log(processArgs(['"test','arg"','some','other']))

rl.on('line', async line => {
  const [method, ...args] = line.split(' ')

  const newArgs = processArgs(args)

  if (Object.hasOwnProperty.call(spiritClient.__proto__, method)) {
    console.log(`method ${method}`)
    const result = await SpiritClient.prototype[method].apply(spiritClient, newArgs)
    console.log(`${method}: `, result)
  } else if (method === 'get' && newArgs[0] in spiritClient) {
    if (typeof spiritClient[newArgs[0]] !== 'function') {
      console.log(`property ${method}`)
      console.log(spiritClient[newArgs[0]])
    }
  } else {
    console.log('not found')
  }
})
