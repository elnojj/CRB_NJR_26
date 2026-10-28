import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/cerebro-shell.css';

/**
 * Primary experience is always the full CEREBRO HQ App:
 * dual spheres, projected labels, optics bar, panels, voice.
 * Editorial monograph remains available at ?editorial=1&read=1 only
 * (opt-in reading mode — see EditorialMonograph).
 */
createRoot(document.getElementById('root')!).render(<App />);
