import './App.css';
import './index.css';
// import logo from './icons_proc/peers_logo.svg#peers_logo'

function App() {
  return (
    <div id="main-container" class="flex-center">
      <svg viewBox="0 0 128 128" class="icon box logo">
        <use href="./icons_proc/peers_logo.svg#peers_logo"></use>
      </svg>
      <div id="click-to-download">SPIRIT</div>
    </div>
  );
}

export default App;
