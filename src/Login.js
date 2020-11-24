import React from 'react';
import './App.css';
import './index.css';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLogin: true
    };
  }

  handleLoginSignUp() {
    this.setState({
      isLogin: !this.state.isLogin
    });
  }

  renderLoginSignUpEl(text) {
    return (
      <p class="LoginSignUpEl" onClick={() => this.handleLoginSignUp()}>{text}</p>
    );
  }

  renderLogin() {
    return (
      <div class="form-panel">
        <Prompts label="Username" type="text"></Prompts>
        <Prompts label="Password" type="password"></Prompts>
        <button class="form-button login-button">Log in to Spirit</button>
        {this.renderLoginSignUpEl("Don't have an account? Sign Up!")}
      </div>
    );
  }

  renderSignUp() {
    return (
      <div class="form-panel">
        <Prompts label="Email" type="email"></Prompts>
        <Prompts label="Username" type="text"></Prompts>
        <Prompts label="Password" type="password"></Prompts>
        <Prompts label="Confirm Password" type="password"></Prompts>
        <button class="form-button login-button">Sign Up for Spirit</button>
        {this.renderLoginSignUpEl("Have an account? Login!")}
      </div>
    );
  }

  render() {
    return (
      <div id="login-container" class="flex-center">
        {this.state.isLogin ? this.renderLogin() : this.renderSignUp()}
      </div>
    );
  }
}

class Prompts extends React.Component {
  render() {
    return (
      <div>
        <dl class="form-prompt">
          <dt>
            <label class="form-label">{this.props.label}</label>
          </dt>
          <dt>
            <input class="form-input" type={this.props.type}></input>
          </dt>
        </dl>
      </div>
    );
  }
}

export default Login;
