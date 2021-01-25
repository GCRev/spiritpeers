## Available Scripts

In the project directory, you can run:

### `npm run start`

Runs the app in the development mode.

Project automatically opens an Electron app that links to http://localhost:3000

After changing file names, the WebPack dev server needs to be fully-refreshed. On Windows this
requires you to open the task manager and manually kill the WebPack process, which doesn't shut down
with a SIGKILL.

In order to properly use node-native modules with WebPack and Electron, you have to write

```javascript
const module = window.require('module')
```
