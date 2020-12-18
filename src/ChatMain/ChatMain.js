import '../App'
import '../index'
import './ChatMain.css'
import MessageAreaDisplay from './MessagesArea/MessagesArea'
import ConversationsDisplay from './SideBarArea/Conversations'
import ContactEditDisplay from './ContactEdit'
import { ToolbarDisplay, Overlay, Icon } from '../Components'
import React from 'react'

class ChatMainDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
    this.handleInsertContact = this.handleInsertContact.bind(this)
  }

  componentDidMount() {
    this.props.spiritClient.on('upsert-contact', this.upsertContact, this)
    this.props.spiritClient.on('cancel-upsert-contact', this.cancelUpsertContact, this)
    this.props.spiritClient.on('confirm-upsert-contact', this.cancelUpsertContact, this)
    this.props.spiritClient.on('delete-contact', this.cancelUpsertContact, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('upsert-contact', this.upsertContact, this)
    this.props.spiritClient.un('cancel-upsert-contact', this.cancelUpsertContact, this)
    this.props.spiritClient.un('confirm-upsert-contact', this.cancelUpsertContact, this)
    this.props.spiritClient.un('delete-contact', this.cancelUpsertContact, this)
  }

  upsertContact(params) {
    this.setState({
      showOverlay: true,
      upsertingContact: params.contact,
      existingContact: params.existingContact
    })
  }

  cancelUpsertContact() {
    this.setState({
      showOverlay: false
    })
  }

  handleInsertContact() {
    this.props.spiritClient.upsertContact()
  }

  render() {
    return (
      <div id="chat-main">
        <div className={`wrapper ${!!this.state.showOverlay ? 'blur' : ''}`}>
          <ConversationsDisplay spiritClient={this.props.spiritClient}></ConversationsDisplay>
          <MessageAreaDisplay spiritClient={this.props.spiritClient}></MessageAreaDisplay>
          <ToolbarDisplay id="main-toolbar">
            <div 
              className="toolbar-button outline-only circle"
              onClick={this.handleInsertContact}
            >
              <Icon 
                className="outline-only"
                iconSize={32}
                url="./icons_proc/contact_add.svg#contact_add"
              ></Icon>
            </div>
          </ToolbarDisplay>
        </div>
        <Overlay
          in={this.state.showOverlay}
        >
          <ContactEditDisplay
            spiritClient={this.props.spiritClient}
            contact={this.state.upsertingContact}
            existingContact={this.state.existingContact}
          ></ContactEditDisplay>
        </Overlay>
      </div>
    )
  }
}

export default ChatMainDisplay
