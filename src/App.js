import './App.css';
import './index.css';
import React from 'react';
import LoginDisplay from './Login.js';
import ChatMainDisplay from './ChatMain.js';

class AppDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {
      loggedIn: !!data.spiritClient.hash
    }
  }

  logon() {
    this.setState({
      loggedIn: true
    })
  }

  logoff() {
    this.setState({
      loggedIn: false
    })
  }

  componentDidMount() {
    this.props.spiritClient.on('logon', this.logon, this)
    this.props.spiritClient.on('logoff', this.logoff, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('logon', this.logon)
    this.props.spiritClient.un('logoff', this.logoff)
  }

  render() {
    return (
      this.state.loggedIn ? 
        <ChatMainDisplay spiritClient={this.props.spiritClient}/> :
        <LoginDisplay spiritClient={this.props.spiritClient}/>
    )
  }
}

export default AppDisplay
