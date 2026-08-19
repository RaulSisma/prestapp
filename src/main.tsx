// Defensively prevent "Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined') {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (desc && !desc.set && desc.configurable) {
      const orig = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: () => orig,
        set: () => {},
        configurable: true,
        enumerable: true,
      });
    }
  }
} catch {
  // Ignore
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

