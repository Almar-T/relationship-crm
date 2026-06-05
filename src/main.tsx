import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ensurePersistentStorage } from './lib/storage';
import './styles/global.css';

// Ask the browser to keep our IndexedDB data persistent (not auto-evicted).
void ensurePersistentStorage();

// Register the service worker. `autoUpdate` means new versions activate on the
// next navigation; we reload so the user always runs the latest shell.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Re-check for updates when the app regains focus.
    if (registration) {
      window.addEventListener('focus', () => void registration.update());
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
