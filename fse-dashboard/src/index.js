import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '175231524136-39m136pat1dpous6u9eijhfulpmpms1i.apps.googleusercontent.com';

// Global fetch interceptor to ensure all backend requests include the Admin Authorization header
const _originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('emp_token');
    if (token && typeof url === 'string') {
      const empApi = process.env.REACT_APP_EMPLOYEE_API_URL || 'localhost:4000';
      if (url.includes('/api') || url.includes(empApi) || url.includes('vegavruddhi-employee-panel')) {
        options = options || {};
        const headers = new Headers(options.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
          options.headers = headers;
        }
      }
    }
  } catch (e) {}
  return _originalFetch.call(this, url, options);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Admin Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Admin Service Worker registration failed:', error);
      });
  });
}

reportWebVitals();
