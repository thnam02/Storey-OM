import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/app.css';
import App from './App';
import { SAMPLE_TEAM } from './data/sampleTeam';
import { applyInitialHash } from './state/useHashSync';

applyInitialHash(SAMPLE_TEAM.employees);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
