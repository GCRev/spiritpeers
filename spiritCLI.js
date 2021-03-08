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

  /* detect arg type and convert automatically */
  const convertArg = arg => {
    /* handle booleans */
    if (arg === 'true') {
      return true
    } else if (arg === 'false') {
      return false
    } else if (
      (arg.startsWith('{') && arg.endsWith('}'))
      ||
      (arg.startsWith('[') && arg.endsWith(']'))
    ) {
        /* 
         * attempt to convert to object or array
         * JSON.parse will handle either one correctly
         */
      try {
        return JSON.parse(arg)
      } catch (err) {
        /* do nothing */
      }
    } else if (/^-?[0-9.]+[dfiln]$/.test(arg)) {
      /* 
       * Numbers shall be notated as 999[dfiln] 
       *
       * Numbers must be declared explicitly this way in order to avoid
       * confusion with strings. Sometimes we want to force a string to be
       * passed
       */
      try {
        switch (arg[arg.length - 1]) {
        case 'd':
        case 'f':
          return parseFloat(arg.slice(0, -1))
        case 'i':
        case 'l':
          return parseInt(arg.slice(0, -1))
        case 'n':
          return BigInt(arg.slice(0, -1))
        default:
          break
        }
      } catch (err) {
        /* do nothing */
      }
    }
    return arg
  }

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
        newArgs.push(convertArg(arg))
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
        newArgs.push(convertArg(bufferedArg))
        bufferedArg = ''
        strOpen = undefined
      } else {
        /* append to buffered argument */
        bufferedArg += arg
      }
    } else {
      /* default case */
      newArgs.push(convertArg(arg))
    }
  }

  /* if the user never closes the quot */
  if (bufferedArg) newArgs.push(convertArg(bufferedArg))
  return newArgs
}

// console.log(processArgs(['"test','arg"','some','other']))

rl.on('line', async line => {
  const [method, ...args] = line.split(' ')

  const newArgs = processArgs(args)

  if (method === 'exit') {
    process.exit(1)
  } else if (Object.hasOwnProperty.call(spiritClient.__proto__, method)) {
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
