import './App.css';
import './index.css';
import LoginDisplay from './Login.js';
import SpiritClient from './spiritClient.js' 


function App() {
  const spiritClient = new SpiritClient()
  window.spiritClient = spiritClient
  return (
    <LoginDisplay
      updateUsername={e => {spiritClient.setUsername(e.target.value)}} 
      updatePassword={e => {spiritClient.setPassword(e.target.value)}}
      logon={() => {spiritClient.logon()}}>
    </LoginDisplay>
  );
}

export default App;
