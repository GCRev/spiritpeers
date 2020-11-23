import React from 'react';
import './App.css';
import './index.css';

class Login extends React.Component {
  render() {
    return (
      <div id="login-container" class="flex-center">
        <div class="form-panel">
          <Prompts label="Username" type="text"></Prompts>
          <Prompts label="Password" type="password"></Prompts>
          <button class="form-button login-button">Login to Spirit Peers</button>
        </div>
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
