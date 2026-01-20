import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CookieManager from './CookieManager.jsx'
import './index.css'

// Check if we're on the cookie manager route
const path = window.location.pathname;
const root = ReactDOM.createRoot(document.getElementById('root'));

if (path === '/cookies' || path === '/cookies/') {
  root.render(
    <React.StrictMode>
      <CookieManager />
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
