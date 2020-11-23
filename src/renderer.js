import React from 'react';
import ReactDOM from 'react-dom';
import './../global/index.css';

window.addEventListener('keydown', evt => {
  if (evt.code === 'KeyR' && evt.ctrlKey) {
    ipcRenderer.invoke('hot-reload')
    window.close()
  }
})

class MessagingPage extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {

    return (
      <div>Double ASS</div>
    );
  }
}

