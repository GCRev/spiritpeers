import './App.css'
import './index.css'
import './ChatMain.css'
import React from 'react'

class ChatMainDisplay extends React.Component {
  constructor(data) {
    super()
    this.data = data

  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return (
      <div id="chat-main">
        <ConversationsDisplay></ConversationsDisplay>
        <div id="message-area" className="visual-test">ass</div>
      </div>
    )
  }
}

class ConversationsDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div id="conversations" className="visual-test">ass</div>
    )
  }
}

export default ChatMainDisplay
