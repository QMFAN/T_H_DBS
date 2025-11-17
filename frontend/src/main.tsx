import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/global.css';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Root container #app not found');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
