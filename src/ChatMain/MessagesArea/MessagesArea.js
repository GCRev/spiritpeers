import React from 'react'

class MessageHistoryDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div id="message-history" className="visual-test">ass</div>
    )
  }
}

class ChatBoxDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div id="chat-box-area" className="visual-test">
        <div 
          id="chat-box"
          className='form-input' 
          contentEditable='true'></div>
      </div>
    )
  }
}

class MessageAreaDisplay extends React.Component {
  constructor(data) {
    super()
  }

  render() {
    return (
      <div id="message-area" className="visual-test">
        <MessageHistoryDisplay></MessageHistoryDisplay>
        <ChatBoxDisplay></ChatBoxDisplay>
      </div>
    )
  }
}

export default MessageAreaDisplay
