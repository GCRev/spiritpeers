import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import AppDisplay from './app'
import reportWebVitals from './reportWebVitals'
const { SpiritClient } = window.require('spirit-client')

const spiritClient = new SpiritClient()
window.spiritClient = spiritClient

spiritClient.logon()

ReactDOM.render(
  <React.StrictMode>
  <AppDisplay spiritClient={spiritClient}/>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
