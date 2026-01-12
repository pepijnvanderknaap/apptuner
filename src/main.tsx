import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import BrowserApp from './BrowserApp';
import './styles.css';

// Detect if running in Tauri or browser
const isTauri = '__TAURI__' in window;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isTauri ? <App /> : <BrowserApp />}
  </React.StrictMode>
);
