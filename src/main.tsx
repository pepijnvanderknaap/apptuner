import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { RootApp } from './components/RootApp';
import './styles.css';

// Detect if running in Tauri or browser
const isTauri = '__TAURI__' in window;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isTauri ? (
      <App />
    ) : (
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    )}
  </React.StrictMode>
);
