import './app.css'
import './index.css'
import React from 'react'
import LoginDisplay from './login.js'
import ChatMainDisplay from './chat_main/chat_main.js'
import { TransitionGroup, CSSTransition } from 'react-transition-group'

class NotificationDisplay extends React.Component {
  constructor(data) {
    super()
    this.clickHandler = this.clickHandler.bind(this)
  }

  clickHandler() {
    this.props.spiritClient.cancelNotify(this.props.item.id)
  }

  render() {
    return (
      <div 
      ref={this.props.nodeRef}
      onClick={this.clickHandler}
      className={`notification ${this.props.item.className || ''}`}
      >
        <div className="wrapper">
          <div className="title">
            {this.props.item.title}
          </div>
          <div className="content">
            {this.props.item.content}
          </div>
        </div>
      </div>
    )
  }
}


class AppDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {
      notifications: [],
      loggedIn: !!data.spiritClient.hash
    }
    this.cancelNotify = this.cancelNotify.bind(this)
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
    this.props.spiritClient.on('notification', this.notify, this)
    this.props.spiritClient.on('notification-cancel', this.cancelNotify, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('logon', this.logon)
    this.props.spiritClient.un('logoff', this.logoff)
    this.props.spiritClient.un('notification', this.notify, this)
    this.props.spiritClient.un('notification-cancel', this.cancelNotify, this)
  }

  notify(params) {
    this.setState({
      notifications: [
        params,
        ...this.state.notifications
      ]
    })
  }

  cancelNotify(params) {
    this.setState({
      notifications: this.state.notifications.filter(item => {
        return item.id !== params.id
      })
    })
  }

  render() {
    const notifications = this.state.notifications
    const heightZero = (node) => {
      node.current.style.height = 0
    }
    const heightToContent = (node) => {
      node.current.style.height = `${node.current.children[0].offsetHeight}px`
    }
    const heightUnset = (node) => {
      node.current.style.height = ''
    }
    return (
      <div className="frame-full">
        {this.state.loggedIn ? 
          <ChatMainDisplay spiritClient={this.props.spiritClient}/> :
          <LoginDisplay spiritClient={this.props.spiritClient}/>}
        <TransitionGroup className="notifications">
        {notifications.map(item => {
          const nodeRef = React.createRef()
          return (
            <CSSTransition
            timeout={400}
            key={item.id}
            classNames="notification"
            nodeRef={nodeRef}
            onEnter={()=>heightZero(nodeRef)}
            onEntering={()=>heightToContent(nodeRef)}
            onEntered={()=>heightUnset(nodeRef)}
            onExit={()=>heightToContent(nodeRef)}
            onExiting={()=>heightZero(nodeRef)}
            >
              <NotificationDisplay 
              nodeRef={nodeRef}
              item={item}
              spiritClient={this.props.spiritClient}
              >
              </NotificationDisplay>
            </CSSTransition>
          )
        })}
        </TransitionGroup>
      </div>
    )
  }
}

export default AppDisplay
