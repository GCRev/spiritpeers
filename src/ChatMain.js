import './App.css'
import './index.css'
import './ChatMain.css'
import React from 'react'

class ChatMainDisplay extends React.Component {
  constructor(data) {
    super()
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return (
      <div id="chat-main">
        <ConversationsDisplay spiritClient={this.props.spiritClient}></ConversationsDisplay>
        <MessageAreaDisplay></MessageAreaDisplay>
        <ToolbarDisplay></ToolbarDisplay>
      </div>
    )
  }
}

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
        <textarea 
          id="chat-box" 
          placeholder="ass"
          className="form-input" 
          name="chat-box" 
          rows="0" 
          cols="50"></textarea>
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

class ConversationsDisplay extends React.Component {
  constructor(data) {
    super()
    let contactList = []
    for (let i = 0; i < 50; i++) {
      contactList.push({
        uuid: i,
        displayName: 'test ' + i
      })
    }
    this.state = {
      contactList: contactList //data.spiritClient.getContactList()
    }
  }

  componentDidMount() {
    this.props.spiritClient.on('set-contacts', this.setContacts, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('set-contacts', this.setContacts, this)
  }

  setContacts() {
    this.setState({
      contactList: this.props.spiritClient.getContactList()
    })
  }

  render() {
    const contactList = this.state.contactList
    return (
      <div id="conversations" className="visual-test">
      {
        !contactList.length ? 'No Contacts' :
        contactList.map((contact, index) => {
          return (
            <ContactDisplay 
              key={contact.uuid || index}
              uuid={contact.uuid}
              title={contact.displayName || contact.username || contact.uuid || "There's nothing here"}></ContactDisplay>
          )
        })
      }
      </div>
    )
  }
}

class ContactDisplay extends React.Component {
  constructor(data) {
    super() 
  }

  render() {
    return (
      <div className="contact-item">
        <div className="title">{this.props.title}</div>
        <div className="info">{this.props.uuid}</div>
      </div>
    )
  }
}

class ToolbarDisplay extends React.Component {
  constructor(data) {
    super() 
  }

  render() {
    return (
      <div id="main-toolbar" className="visual-test">Settings go here</div>
    )
  }
}

export default ChatMainDisplay
