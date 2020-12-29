import React from 'react'
import MarkdownIt from 'markdown-it'

const mdRenderer = new MarkdownIt()

class MessageDisplay extends React.Component {
  constructor() {
    super()
    this.state = {}
    this.markup = this.markup.bind(this)
    this.handleOnClick = this.handleOnClick.bind(this)
  }

  formatDate() {
    const date = new Date(this.props.ts)
    return `${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}`
  }

  markup() {
    return {__html: mdRenderer.render(this.props.md || '')}
  }

  handleOnClick() {
    if (this.props.spiritClient && 
      !this.props.isTarget &&
      this.props.target &&
      !this.props.editMessage &&
      this.props.ts) {
      this.props.spiritClient.editMessage(this.props.target.uuid, this.props.ts)
    }
  }

  renderPreview() {
    return (
      <message is="div" class="from-source preview">
        <div className="message-wrapper">
          <div className="date">{this.formatDate()}</div>
          <div className="title">{this.props.title}</div> 
          <div className="content" dangerouslySetInnerHTML={this.markup()}></div>
          <div className="edit-indicator">PREVIEW</div>
        </div>
      </message>
    )
  }

  renderNormal() {
    let className = [this.props.isTarget ? 'from-target ' : 'from-source ']
    if (this.props.offline)  className.push('offline') 
    if (this.props.editMessage) className.push('edit-message')
    if (this.props.removed) className.push('removed')
    const showEditIndicator = this.props.edited || this.props.removed
    const editIndicatorText = this.props.removed ? 'USER IS TRYING TO GASLIGHT YOU' : 'EDITED'
    return (
      <message is="div" class={className.join(' ')} onClick={this.handleOnClick}>
        <div className="message-wrapper">
          <div className="date">{this.formatDate()}</div>
          <div className="title">{this.props.title}</div> 
          {
            !this.props.editMessage &&
            <div className="content" dangerouslySetInnerHTML={this.markup()}></div>
          }
          {
            !!this.props.editMessage &&
            <div className="content">
              <ChatBoxDisplay 
                spiritClient={this.props.spiritClient} 
                editMessage={this.props.editMessage}
                target={this.props.target}
              ></ChatBoxDisplay>
            </div>
          }
          {
            showEditIndicator &&
            <div className="edit-indicator">{editIndicatorText}</div>
          }
        </div>
      </message>
    )
  }

  render() {
    return this.props.preview ? this.renderPreview() : this.renderNormal()
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

  handleMessaging() {
    if (this.state.target) {
      this.setState({
        log: this.state.target.log
      })
    }
  }

  handleMessageReceived(args) { }

  handleMessageSent(args) { }

  handleMessagePreview(md) {
    this.setState({
      showingPreview: !!md,
    })
    if (md) {
      this.setState({
        previewMd: md
      })
    }
  }

  componentDidMount() {
    this.props.spiritClient.on('talk-to', this.handleTalkTo, this)
    this.props.spiritClient.on('messaging', this.handleMessaging, this)
    this.props.spiritClient.on('message-received', this.handleMessageReceived, this)
    this.props.spiritClient.on('message-sent', this.handleMessageSent, this)
    this.props.spiritClient.on('message-preview', this.handleMessagePreview, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('talk-to', this.handleTalkTo, this)
    this.props.spiritClient.un('messaging', this.handleMessaging, this)
    this.props.spiritClient.un('message-received', this.handleMessageReceived, this)
    this.props.spiritClient.un('message-sent', this.handleMessageSent, this)
    this.props.spiritClient.un('message-preview', this.handleMessagePreview, this)
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
    messages = messages.filter(entry => {
      const isTarget = entry.uuid === this.state.target.uuid
      return (!isTarget && !entry.removed) || isTarget 
    })
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
                spiritClient={this.props.spiritClient}
                {...entry}
                title={title}
                isTarget={entry.uuid === this.state.target.uuid}
                target={this.state.target}
                editMessage={this.props.editingMessage && entry.ts === this.props.editMessage ? entry.ts : undefined}
              ></MessageDisplay>
            )
          })
        }
        {this.state.showingPreview &&
          <MessageDisplay
            isTarget={false}
            md={this.state.previewMd}
            preview={true}
            title={this.props.spiritClient.getTitle()}
            ts={Date.now()}
          ></MessageDisplay>
        }
      </div>
    )
  }
}

class ChatBoxDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
    if (data.forwardRef) {
      this.chatBoxRef = data.forwardRef
    } else {
      this.chatBoxRef = React.createRef()
    }

    this.chatKeyupHandler = this.chatKeyupHandler.bind(this)
    this.timerId = -1
    if (data.target && data.editMessage) {
      const targetEntryResult = data.target.log.get(data.editMessage)
      if (targetEntryResult.item) {
        this.initialContent = targetEntryResult.item.md
      }
    }
  }

  handleTalkTo(args) {
    this.setState({
      target: args.target
    })
  }

  componentDidMount() {
    this.props.spiritClient.on('talk-to', this.handleTalkTo, this)
    if (this.initialContent) this.chatBoxRef.current.innerText = this.initialContent
    if (this.props.editMessage) {
      setTimeout(() => {
        const range = new Range()
        range.selectNodeContents(this.chatBoxRef.current)
        range.collapse()
        getSelection().removeAllRanges()
        getSelection().addRange(range)
        this.chatBoxRef.current.focus()
      })
    }
  }

  componentWillUnmount() {
    this.props.spiritClient.un('talk-to', this.handleTalkTo, this)
  }

  chatAppendStr(str) {
    if (!str) return

    /* good news: this is no longer shitty-hacky code */

    const chatBoxEl = this.chatBoxRef.current
    
    let selection = getSelection()

    /*
     * - get current selected range to be able to insertNode before
     * - clone current selected range and collapse to end to insertNode "at the end"
     */
    const selRange = selection.getRangeAt(0)
    const rangeAtEnd = selRange.cloneRange()
    rangeAtEnd.collapse(false)

    /* handle difference between caret and range-based selections */
    const addText = document.createTextNode(str)
    switch (selection.type) {
    case 'Caret':
      {
        /* only insert at beginning if there is no selection body */
        selRange.insertNode(addText)
        break
      }
    case 'Range':
      {
        rangeAtEnd.insertNode(addText)
        selRange.insertNode(document.createTextNode(str))
        break
      }
    default:
      break
    } 

    /* this intuitively moves the caret after the inserted text */
    rangeAtEnd.setStartAfter(addText)
    rangeAtEnd.collapse(true)
    selection.removeAllRanges()
    selection.addRange(rangeAtEnd)
    
    /* this function is incredible */
    chatBoxEl.normalize()
  }

  async chatKeyupHandler(evt) {
    let target = this.state.target || this.props.target
    const atStart = () => {
      const range = getSelection().getRangeAt(0)
      return range.collapsed &&
        range.startOffset === 0 &&
        (range.startContainer === this.chatBoxRef.current.childNodes[0] ||
          range.startContainer === this.chatBoxRef.current)
    }

    if (!evt.shiftKey) {
      switch (evt.key) {
      case 'Enter':
        evt.preventDefault()
        if (target) {
          const md = this.chatBoxRef.current.innerText
          this.chatBoxRef.current.innerText = ''
          if (this.props.editMessage) {
            this.props.spiritClient.editMessage()
          } else {
            this.props.spiritClient.previewMessage()
          }
          const result = await target.message(md, this.props.editMessage, {
            ...!!this.props.editMessage && {edited: true}
          })
          if (result.offline) {
            /* do something different? */
          }
        }
        break
      case 'ArrowUp':
        if (target && !this.props.editMessage && atStart()) this.props.spiritClient.editMessage(target.uuid)
        break
      case 'Escape':
        if (this.props.editMessage) {
          this.props.spiritClient.editMessage()
        } else {
          this.chatBoxRef.current.blur()
        }
        break
      default:
        break
      }
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
      case 'e':
        if (target && !this.props.editMessage) this.props.spiritClient.editMessage(target.uuid)
        break
      default:
        break
      }
    }

    if (this.props.editMessage) return

    if (this.timerId >= 0) {
      clearTimeout(this.timerId)
    }
    if (target &&
      this.chatBoxRef.current.innerText) {
      this.timerId = setTimeout(() => {
        this.props.spiritClient.previewMessage(this.chatBoxRef.current.innerText)
        this.timerId = -1
      }, 1000)
    } else {
      this.props.spiritClient.previewMessage()
    }
  }

  render() {
    return (
      <div className="chat-box-area">
        <div 
          ref={this.chatBoxRef}
          className={`chat-box form-input ${this.state.disabled ? 'disabled' : ''}`}
          onKeyDown={this.chatKeyupHandler} 
          contentEditable="true"
          tabIndex="-1"
        ></div>
      </div>
    )
  }
}

class MessageAreaDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
    this.chatBoxRef = React.createRef()
  }

  handleTalkTo(args) {
    this.setState({
      target: args.target
    })
  }

  handleMessageEdit(args) {
    this.setState({
      editingMessage: !!args.logEntry
    })
    if (args.logEntry) {
      this.setState({
        editMessage: args.logEntry.ts
      })
    } else {
      setTimeout(() => {
        const range = new Range()
        range.selectNodeContents(this.chatBoxRef.current)
        range.collapse()
        getSelection().removeAllRanges()
        getSelection().addRange(range)
        this.chatBoxRef.current.focus()
      })
    }
  }

  componentDidMount() {
    this.props.spiritClient.on('talk-to', this.handleTalkTo, this)
    this.props.spiritClient.on('message-edit', this.handleMessageEdit, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('talk-to', this.handleTalkTo, this)
    this.props.spiritClient.un('message-edit', this.handleMessageEdit, this)
  }

  render() {
    const headerText = this.state.target ? this.state.target.getTitle() : 'ass'
    return (
      <div id="message-area">
        <div className="title">{headerText}</div>
        <MessageHistoryDisplay 
          spiritClient={this.props.spiritClient} 
          reversed={false}
          editingMessage={this.state.editingMessage}
          editMessage={this.state.editMessage}
        ></MessageHistoryDisplay>
        <ChatBoxDisplay forwardRef={this.chatBoxRef} spiritClient={this.props.spiritClient}></ChatBoxDisplay>
      </div>
    )
  }
}

export { 
  MessageAreaDisplay as default,
  ChatBoxDisplay
}
