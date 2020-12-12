import React from 'react'

class ConversationsDisplay extends React.Component {
  constructor(data) {
    super()
    let contactList = []
    for (let i = 0; i < 50; i++) {
      contactList.push({
        uuid: `${i + 1}`,
        displayName: 'test ' + i
      })
    }
    this.state = {
      contactList: [...data.spiritClient.getContactList(), ...contactList]
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
                  title={contact.displayName || contact.username || contact.uuid || "There's nothing here"}
                >
                </ContactDisplay>
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

export default ConversationsDisplay
