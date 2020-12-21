import '../App'
import '../index'
import './ChatMain.css'
import MessageAreaDisplay from './MessagesArea/MessagesArea'
import ConversationsDisplay from './SideBarArea/Conversations'
import ContactEditDisplay from './ContactEdit'
import SettingsDisplay from './Settings'
import { ToolbarDisplay, Overlay, Icon, UserInfo } from '../Components'
import React from 'react'

class ChatMainDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {}
    this.handleInsertContact = this.handleInsertContact.bind(this)
    this.handleOpenSettings = this.handleOpenSettings.bind(this)
    this.hideOverlay = this.hideOverlay.bind(this)
  }

  componentDidMount() {
    this.props.spiritClient.on('upsert-contact', this.upsertContact, this)
    this.props.spiritClient.on('cancel-upsert-contact', this.hideOverlay, this)
    this.props.spiritClient.on('confirm-upsert-contact', this.hideOverlay, this)
    this.props.spiritClient.on('delete-contact', this.hideOverlay, this)
    this.props.spiritClient.on('save-settings', this.hideOverlay, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('upsert-contact', this.upsertContact, this)
    this.props.spiritClient.un('cancel-upsert-contact', this.hideOverlay, this)
    this.props.spiritClient.un('confirm-upsert-contact', this.hideOverlay, this)
    this.props.spiritClient.un('delete-contact', this.hideOverlay, this)
    this.props.spiritClient.un('save-settings', this.hideOverlay, this)
  }

  upsertContact(params) {
    this.setState({
      showOverlay: true,
      renderOverlayContent: () => {
        return (
          <ContactEditDisplay
            spiritClient={this.props.spiritClient}
            contact={params.contact}
            existingContact={params.existingContact}
          ></ContactEditDisplay>
        )
      }
    })
  }

  hideOverlay() {
    this.setState({
      showOverlay: false
    })
  }

  handleInsertContact() {
    this.props.spiritClient.upsertContact()
  }

  handleOpenSettings() {
    this.setState({
      showOverlay: true,
      renderOverlayContent: () => {
        return (
          <SettingsDisplay
            spiritClient={this.props.spiritClient}
          ></SettingsDisplay>
        )
      }
    })
  }

  render() {
    return (
      <div id="chat-main">
        <div className={`wrapper ${!!this.state.showOverlay ? 'blur' : ''}`}>
          <ConversationsDisplay spiritClient={this.props.spiritClient}></ConversationsDisplay>
          <MessageAreaDisplay spiritClient={this.props.spiritClient}></MessageAreaDisplay>
          <ToolbarDisplay id="main-toolbar">
            {/* How do you make this styling generic?? */}
            <div className="user-info flex-bar">
              <UserInfo
                spiritClient={this.props.spiritClient}
              ></UserInfo>
            </div>
            <div
              className="toolbar-button outline-only circle"
              onClick={this.handleInsertContact}
              noflex
            >
              <Icon
                className="outline-only"
                iconSize={32}
                url="./icons_proc/contact_add.svg#contact_add"
              ></Icon>
            </div>
            <div
              className="toolbar-button outline-only circle"
              onClick={this.handleOpenSettings}
              noflex
            >
              <Icon
                className="outline-only"
                iconSize={32}
                url="./icons_proc/gear.svg#gear"
              ></Icon>
            </div>
          </ToolbarDisplay>
        </div>
        <Overlay
          in={this.state.showOverlay}
          onClose={this.hideOverlay}
        >
          {this.state.renderOverlayContent && this.state.renderOverlayContent()}
        </Overlay>
      </div>
    )
  }
}

export default ChatMainDisplay
