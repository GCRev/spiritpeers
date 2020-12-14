import '../App'
import '../index'
import './ChatMain.css'
import MessageAreaDisplay from './MessagesArea/MessagesArea.js'
import ToolbarDisplay from './SideBarArea/Toolbar.js'
import ConversationsDisplay from './SideBarArea/Conversations.js'
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
        <MessageAreaDisplay spiritClient={this.props.spiritClient}></MessageAreaDisplay>
        <ToolbarDisplay></ToolbarDisplay>
      </div>
    )
  }
}

export default ChatMainDisplay
