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
        <div id="message-area" className="visual-test">ass</div>
        <ToolbarDisplay></ToolbarDisplay>
      </div>
    )
  }
}

class ConversationsDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {
      contactList: data.spiritClient.getContactList()
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
      <div id="main-toolbar" className="visual-test">Toolbar goes here</div>
    )
  }
}

export default ChatMainDisplay
