import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Créditos do desenvolvedor no console
console.log(
  '%c🚀 Sistema de Contagem PA',
  'color: #3B82F6; font-size: 20px; font-weight: bold;'
);
console.log(
  '%c👨‍💻 Desenvolvido por: RHUAN Martins',
  'color: #10B981; font-size: 14px; font-weight: bold;'
);
console.log(
  '%c🔧 Versão: ' + (process.env.REACT_APP_VERSION || '1.0.0'),
  'color: #6B7280; font-size: 12px;'
);
console.log(
  '%c📅 Ano: ' + new Date().getFullYear(),
  'color: #6B7280; font-size: 12px;'
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
