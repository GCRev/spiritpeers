import './App.css'
import './index.css'
import React from 'react'

class LoginDisplay extends React.Component {
  constructor(data) {
    super()
    this.state = {
      signUp: !data.spiritClient.data.foundResourceFile
    }
    this.logonHandler = this.logonHandler.bind(this)
    this.fieldKeyupHandler = this.fieldKeyupHandler.bind(this)
    this.updateFromPrompt = this.updateFromPrompt.bind(this)
  }

  logonHandler() {
    this.props.spiritClient.logon(this.state.username, this.state.password, this.state.email)
  }

  fieldKeyupHandler(e) {
    if (e.key === 'Enter') {
      this.logonHandler()
    }
  }

  updateFromPrompt(propName, value) {
    /* this is cheating */
    this.setState({ [propName]: value })

    if (propName === 'password_confirm') {
      this.setState({ passwordConfirmValid: this.props.spiritClient.validatePasswordConfirm(this.state.password, value), logonValid: [] })
    } else if (propName === 'password') {
      this.setState({ passwordValid: this.props.spiritClient.validatePassword(value), logonValid: [] })
    } else if (propName === 'username') {
      this.setState({ usernameValid: this.props.spiritClient.validateUsername(value), logonValid: [] })
    } else if (propName === 'email') {
      this.setState({ emailValid: this.props.spiritClient.validateEmail(value) })
    }
  }

  showSignUp(signUp) {
    this.setState({
      signUp: signUp
    })
  }

  logonFailure(message) {
    this.setState({
      logonValid: [message]
    })
  }

  componentDidMount() {
    this.props.spiritClient.on('show-sign-up', this.showSignUp, this)
    this.props.spiritClient.on('logon-failure', this.logonFailure, this)
  }

  componentWillUnmount() {
    this.props.spiritClient.un('show-sign-up', this.showSignUp)
    this.props.spiritClient.un('logon-failure', this.logonFailure)
  }

  renderLogin() {
    return (
      <div className="form-panel">
        <PromptsDisplay
          handleChange={this.updateFromPrompt}
          handleKeyUp={this.fieldKeyupHandler}
          label="Username"
          propName="username"
          type="text"></PromptsDisplay>
        <PromptsDisplay
          handleChange={this.updateFromPrompt}
          handleKeyUp={this.fieldKeyupHandler}
          label="Password"
          propName="password"
          type="password"
          invalidReasons={this.state.logonValid}></PromptsDisplay>
        <button className="form-button login-button" onClick={this.logonHandler}>LAUNCH</button>
      </div>
    )
  }


  renderSignUp() {
    const allValid =
      !(this.state.passwordValid || []).length &&
      !(this.state.passwordConfirmValid || []).length &&
      !(this.state.usernameValid || []).length &&
      !(this.state.emailValid || []).length
    const className = `form-button login-button ${allValid ? '' : 'disabled'}`
    return (
      <div className="form-panel">
        <PromptsDisplay
          handleChange={this.updateFromPrompt}
          handleKeyUp={this.fieldKeyupHandler}
          label="Email"
          propName="email"
          type="email"
          invalidReasons={this.state.emailValid}></PromptsDisplay>
        <PromptsDisplay
          handleChange={this.updateFromPrompt}
          handleKeyUp={this.fieldKeyupHandler}
          label="Username"
          propName="username"
          type="text"
          invalidReasons={this.state.usernameValid}></PromptsDisplay>
        <PromptsDisplay
          handleChange={this.updateFromPrompt}
          handleKeyUp={this.fieldKeyupHandler}
          label="Password"
          propName="password"
          type="password"
          invalidReasons={this.state.passwordValid}></PromptsDisplay>
        <PromptsDisplay
          handleChange={this.updateFromPrompt}
          handleKeyUp={this.fieldKeyupHandler}
          label="Confirm Password"
          propName="password_confirm"
          type="password"
          invalidReasons={this.state.passwordConfirmValid}></PromptsDisplay>
        <button className={className} onClick={this.logonHandler}>LAUNCH</button>
      </div>
    )
  }

  render() {
    return (
      <div id="login-container" className="flex-center">
        {this.state.signUp ? this.renderSignUp() : this.renderLogin()}
      </div>
    )
  }
}

class PromptsDisplay extends React.Component {
  constructor() {
    super()
    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(e) {
    if (this.props.propName) {
      this.props.handleChange(this.props.propName, e.target.value)
    }
  }

  render() {
    return (
      <div>
        <dl className="form-prompt">
          <dt>
            <label className="form-label">{this.props.label}</label>
          </dt>
          <dt>
            <input 
              className="form-input" 
              type={this.props.type} 
              onChange={this.handleChange}
              onKeyUp={this.props.handleKeyUp}></input>
          </dt>
          {!!(this.props.invalidReasons || []).length &&
            <dd className="invalid-reasons">
              {this.props.invalidReasons.map((reason, index) => {
                return <p key={index}>{reason}</p>
              })
              }
            </dd>
          }
        </dl>
      </div>
    )
  }
}

export default LoginDisplay
