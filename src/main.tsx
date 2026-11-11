import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { seed } from './db';
import { initPwa } from './pwa';
import { initTheme } from './theme';
import './index.css';
initTheme();
initPwa();
seed().finally(() => createRoot(document.getElementById('root')!).render(
  <React.StrictMode><HashRouter><App /></HashRouter></React.StrictMode>));
