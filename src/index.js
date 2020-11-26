import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import AppDisplay from './App';
import reportWebVitals from './reportWebVitals';
import SpiritClient from './spiritClient';

const spiritClient = new SpiritClient()
window.spiritClient = spiritClient

ReactDOM.render(
  <React.StrictMode>
  <AppDisplay spiritClient={spiritClient}/>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
