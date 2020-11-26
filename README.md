ass

## Available Scripts

In the project directory, you can run:

### `npm run start`

Runs the app in the development mode.\
Project automatically opens an elecrton app that lins to http://localhost:3000 .\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
The page will reload if you make edits.\
You will also see any lint errors in the console.

Webpack's dev-server doesn't shut off correctly because it's trash, so make sure to go into
processes and end all of its tasks. Otherwise it will cache files and prevent reloads from happening
in certain instances.

Also, Webpack is trashe a second time because it flops `import` and `export` statements about. In
order to properly use node-native modules, you have to write 

```javascript
const module = window.require('module')
```
