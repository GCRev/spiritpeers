import '../App'
import '../index'
import './ChatMain.css'
import MessageAreaDisplay from './MessagesArea/MessagesArea'
import ToolbarDisplay from './SideBarArea/Toolbar'
import ToolbarItemDisplay from './SideBarArea/ToolbarItem'
import ConversationsDisplay from './SideBarArea/Conversations'
import ContactEditDisplay from './ContactEdit'
import Overlay from '../Overlay'
import React from 'react'

class ChatMainDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
  }

  componentDidMount() {
    this.props.spiritClient.on('upsert-contact', this.upsertContact, this)
    this.props.spiritClient.on('cancel-upsert-contact', this.cancelUpsertContact, this)
    this.props.spiritClient.on('confirm-upsert-contact', this.cancelUpsertContact, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('upsert-contact', this.upsertContact, this)
    this.props.spiritClient.un('cancel-upsert-contact', this.cancelUpsertContact, this)
    this.props.spiritClient.un('confirm-upsert-contact', this.cancelUpsertContact, this)
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

  render() {
    return (
      <div id="chat-main">
        <div className={`wrapper ${!!this.state.showOverlay ? 'blur' : ''}`}>
          <ConversationsDisplay spiritClient={this.props.spiritClient}></ConversationsDisplay>
          <MessageAreaDisplay spiritClient={this.props.spiritClient}></MessageAreaDisplay>
          <ToolbarDisplay>
            <ToolbarItemDisplay clickEvent={() => console.log('test')}></ToolbarItemDisplay>
            <ToolbarItemDisplay></ToolbarItemDisplay>
            <ToolbarItemDisplay></ToolbarItemDisplay>
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
