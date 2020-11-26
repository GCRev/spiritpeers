import './App.css';
import './index.css';
import React from 'react';
import LoginDisplay from './Login.js';

class AppDisplay extends React.Component {
  constructor(data) {
    super()
    this.logonHandler = this.logonHandler.bind(this)
    this.state = {
      loggedIn: !!data.spiritClient.hash
    }
  }

  logonHandler(state) {
    this.props.spiritClient.logon(state.username, state.password, state.email)
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
      this.state.loggedIn ? <div></div> : <LoginDisplay spiritClient={this.props.spiritClient} logonHandler={this.logonHandler}/>
    )
  }
}

export default AppDisplay
