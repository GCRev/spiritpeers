const { app, ipcMain, BrowserWindow, net } = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')
const EnvPaths = require('env-paths')('SpiritPeers', { suffix: '' })

// app.allowRendererProcessReuse = false
app.commandLine.appendSwitch('enable-webgl2-compute-context')
app.commandLine.appendSwitch('use-cmd-decoder', 'passthrough')

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1550,
    height: 750,
    minHeight: 400,
    minWidth: 700,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      allowRunningInsecureContent: false
    },
    icon: `${__dirname}/public/favicon.ico`
  })

  mainWindow.removeMenu()
  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, 'app.html'))
  mainWindow.loadURL(isDev ? 'http://localhost:3000/' : `file://${path.join(__dirname, "../build/index.html")}`);

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
  const bounds = mainWindow.getBounds()
  // bounds.x = -2342 // do not hardcode
  mainWindow.setBounds(bounds)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('hot-reload', mainWindow => {
  createWindow()
})

ipcMain.handle('get-env-path', (evt, type) => {
  if (typeof type === 'string') {
    return EnvPaths[type || 'data']
  } else {
    return {
      data: EnvPaths.data,
      config: EnvPaths.config,
      cache: EnvPaths.cache,
      log: EnvPaths.log,
      temp: EnvPaths.temp
    }
  }
})

ipcMain.handle('talk-to', (evt, args) => {
  return new Promise(resolve => {
    const { url, params } = args
    const sendBuffer = Buffer.from(JSON.stringify(params), 'utf-8')
    const req = net.request({
      method: 'POST',
      url: url
    })
    req.setHeader('Content-Type', 'application/json')
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
})
