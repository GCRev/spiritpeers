import React from 'react'

class MessageDisplay extends React.Component {
  constructor() {
    super()
    this.state = {}
  }

  formatDate() {
    const date = new Date(this.props.ts)
    return `${date.getHours()}:${date.getMinutes()}`
  }

  render() {
    return (
      <message is="div" class={this.props.isTarget ? 'from-target' : 'from-source'}>
        <div className="date">{this.formatDate()}</div>
        <div className="title">{this.props.title}</div> 
        <div className="content">{this.props.md || ''}</div>
        {this.props.edited &&
          <div className="edit-indicator">EDITED</div>
        }
      </message>
    )
  }
}

class MessageHistoryDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {reversed: data.reversed}
  }

  handleTalkTo(args) {
    this.setState({
      target: args.target
    })
  }

  handleMessageReceived(args) {
    console.log(args)
    this.setState({
      log: args.source.log
    })
  }

  handleMessageSent(args) {
    console.log(args)
    this.setState({
      log: args.target.log
    })
  }

  componentDidMount() {
    this.props.spiritClient.on('talk-to', this.handleTalkTo, this)
    this.props.spiritClient.on('message-received', this.handleMessageReceived, this)
    this.props.spiritClient.on('message-sent', this.handleMessageSent, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('talk-to', this.handleTalkTo, this)
    this.props.spiritClient.un('message-received', this.handleMessageReceived, this)
    this.props.spiritClient.un('message-sent', this.handleMessageSent, this)
  }

  render() {
    let messages = []
    if (this.state.target) {
      if (!this.state.reversed) {
        messages = [...this.state.target.log.all()]
      } else {
        messages = [...this.state.target.log.all()].reverse()
      }
    }
    return (
      <div className="message-history">
        {!!messages.length &&
          messages.map((entry, index) => {
            const title = entry.uuid === this.state.target.uuid ?
              this.state.target.getTitle() :
              this.props.spiritClient.getTitle()
            return (
              <MessageDisplay
                key={`log-index-${index}`}
                isTarget={entry.uuid === this.state.target.uuid}
                ts={entry.ts}
                uuid={entry.uuid}
                md={entry.md}
                title={title}
                edited={entry.edited}
              ></MessageDisplay>
            )
          })
        }
      </div>
    )
  }
}

class ChatBoxDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
    this.chatBoxRef = React.createRef()
    this.chatKeyupHandler = this.chatKeyupHandler.bind(this)
  }

  handleTalkTo(args) {
    this.setState({
      target: args.target
    })
  }

  componentDidMount() {
    this.props.spiritClient.on('talk-to', this.handleTalkTo, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('talk-to', this.handleTalkTo, this)
  }

  chatAppendStr(str) {
    if (!str) return

    /* 
     * warning this is shitty, hacky code. This will need to be improved when
     * we start supported decorative tags and fancy in-chat content (that isn't
     * just plain text) and whatnot
     */
    
    let selection = getSelection()
    const { anchorOffset } = selection

    const beforeCaret = this.chatBoxRef.current.innerText.slice(0, anchorOffset)
    const afterCaret = this.chatBoxRef.current.innerText.slice(anchorOffset)
    this.chatBoxRef.current.innerText = beforeCaret + str + afterCaret

    const anchorNode = this.chatBoxRef.current.childNodes[0]

    const range = new Range()
    range.setStart(anchorNode, anchorOffset + str.length)
    range.setEnd(anchorNode, anchorOffset + str.length)
    range.collapse(true)

    selection.removeAllRanges()
    selection.addRange(range)
    // this.chatBoxRef.current.focus() 
  }

  async chatKeyupHandler(evt) {
    switch (evt.key) {
    case 'Enter':
      evt.preventDefault()
      if (this.state.target) {
        this.setState({disabled: true})
        const result = await this.state.target.message(this.chatBoxRef.current.innerText)
        if (result.offline) {
          /* do something different? */
        }
        this.setState({disabled: false})
        this.chatBoxRef.current.innerText = ''
      }
      break
    default:
      break
    }
    if (evt.ctrlKey) {
      switch (evt.key) {
      case 'b':
        evt.preventDefault()
        this.chatAppendStr('__')
        break
      case 'i':
        evt.preventDefault()
        this.chatAppendStr('_')
        break
      case 'u':
        /* no underlining allowed fucko */
        evt.preventDefault()
        break
      default:
        break
      }
    }
  }

  render() {
    return (
      <div id="chat-box-area">
        <div 
          ref={this.chatBoxRef}
          id="chat-box"
          className={`form-input ${this.state.disabled ? 'disabled' : ''}`}
          onKeyDown={this.chatKeyupHandler} 
          contentEditable='true'
        ></div>
      </div>
    )
  }
}

class MessageAreaDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
  }

  handleTalkTo(args) {
    this.setState({
      target: args.target
    })
  }

  componentDidMount() {
    this.props.spiritClient.on('talk-to', this.handleTalkTo, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('talk-to', this.handleTalkTo, this)
  }

  render() {
    const headerText = this.state.target ? this.state.target.getTitle() : 'ass'
    return (
      <div id="message-area">
        <div className="title">{headerText}</div>
        <MessageHistoryDisplay spiritClient={this.props.spiritClient} reversed={false}></MessageHistoryDisplay>
        <ChatBoxDisplay spiritClient={this.props.spiritClient}></ChatBoxDisplay>
      </div>
    )
  }
}

export { 
  MessageAreaDisplay as default,
  ChatBoxDisplay
}
