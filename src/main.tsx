import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
// Fredoka, bundled locally (offline-safe). The rounded, friendly letterforms
// are part of the product's personality.
import '@fontsource-variable/fredoka';
import '@/styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found. Check index.html.');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
