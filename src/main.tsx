/// <reference types="vite/client" />
/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {import.meta.env.PROD && <Analytics />}
    </BrowserRouter>
  </StrictMode>,
);
