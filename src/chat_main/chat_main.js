import '../app'
import '../index'
import './chat_main.css'
import MessageAreaDisplay from './messages_area/messages_area'
import ConversationsDisplay from './side_bar_area/conversations'
import ContactEditDisplay from './contact_edit'
import SettingsDisplay from './settings'
import { ToolbarDisplay, Overlay, Icon } from '../components'
import React from 'react'

class UserInfo extends React.Component {
  constructor(data) {
    super()
    this.state = {
      copied: false
    }
    this.uuid = data.spiritClient.data.uuid
    this.username = data.spiritClient.data.username
  }

  async copyToClipBoard() {
    await navigator.clipboard.writeText(this.uuid)
    this.setState({
      copied: true
    })
    this.render()
  }

  render() {
    return (
      <div
        id="user-name"
        className="user-name copiable"
        title={this.state.copied ? "Copied" : "Click to copy ID"}
        onClick={() => this.copyToClipBoard.call(this, this.uuid)}
      >
        {this.props.spiritClient.getTitle()}
        <Icon
          className="outline-only copy-icon"
          iconSize={32}
          url="./icons_proc/copy.svg#copy"
        ></Icon>
      </div>
    )
  }
}

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
              noflex="true"
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
              noflex="true"
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
