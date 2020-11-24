import React from 'react'
import './App.css'
import './index.css'

class LoginDisplay extends React.Component {
  render() {
    return (
      <div id="login-container" class="flex-center">
        <div class="form-panel">
          <PromptDisplay label="Username" type="text" handleChange={this.props.updateUsername}></PromptDisplay>
          <PromptDisplay label="Password" type="password" handleChange={this.props.updatePassword}></PromptDisplay>
          <button class="form-button login-button" onClick={this.props.logon}>LAUNCH</button>
        </div>
      </div>
    )
  }
}

class PromptDisplay extends React.Component {
  render() {
    return (
      <div>
        <dl class="form-prompt">
          <dt>
            <label class="form-label">{this.props.label}</label>
          </dt>
          <dt>
            <input class="form-input" type={this.props.type} onChange={this.props.handleChange}></input>
          </dt>
        </dl>
      </div>
    )
  }
}

export default LoginDisplay;
