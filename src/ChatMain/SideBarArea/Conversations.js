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
      contactList: [...data.spiritClient.getContactList()]
    }
  }

  componentDidMount() {
    this.props.spiritClient.on('set-contacts', this.setContacts, this)
    this.props.spiritClient.on('conversation-request', this.handleConversationRequest, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('set-contacts', this.setContacts, this)
    this.props.spiritClient.un('conversation-request', this.handleConversationRequest, this)
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
                  title={contact.getTitle()}
                  target={contact}
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
    this.state = {
      requestState: ''
    }
    this.clickHandler = this.clickHandler.bind(this)
    this.timerBarRef = React.createRef()
  }

  componentDidMount() {
    this.props.target.on('conversation-request', this.handleConversationRequest, this)
    this.props.target.on('set-state', this.handleContactSetState, this)
  }

  componentWillUnmount() {
    this.props.target.un('conversation-request', this.handleConversationRequest, this)
    this.props.target.un('set-state', this.handleContactSetState, this)
  }

  handleContactSetState(state) {
    this.setState({requestState: state})
  }

  handleConversationRequest() { }

  async clickHandler() {
    const result = await this.props.target.talkTo()

    /*
    if (!result) return 

    let ts = performance.now()
    let timerLeft = this.props.target.timeout
    if (!this.started) {
    this.started = true
      const updateBar = () => {
        const nowTs = performance.now()
        const diff = nowTs - ts
        ts = nowTs
        timerLeft -= diff
        this.timerBarRef.current.style.width = `${(timerLeft / this.props.target.timeout) * 100}%`
        if (timerLeft > 0 &&
          this.props.target.state === 'waiting') {
          requestAnimationFrame(updateBar)
        }  else {
          this.started = false
        }
      }
      updateBar()
    }
    */
  }

  render() {
    return (
      <div className={`contact-item ${this.state.requestState}`} onClick={this.clickHandler}>
        <div className="title">{this.props.title}</div>
        <div className="info">{this.props.uuid}</div>
        <div className="underline" ref={this.timerBarRef}></div>
      </div>
    )
  }
}

export default ConversationsDisplay
