import { createRoot } from 'react-dom/client';
import { useCallback, useState } from 'react';
import App from './App.tsx';
import './index.css';
import { CerebroIntro } from './intro/main';
import { introBridge } from './intro/bridge';

function shouldStartInIntro(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('intro') === '0') return false;
  if (params.get('movie') === '0') return false;
  const view = params.get('view');
  if (params.get('intro') === '1' || params.get('movie') === '1' || view === 'intro' || view === 'movie') {
    return true;
  }
  // Deep links into a specific station/panel skip the film.
  // Default hq/cde destinations (set after Enter) must NOT skip — every reload
  // restarts the ~3:00 intro from first motion, with Skip always available.
  if (view && view !== 'intro' && view !== 'movie' && view !== 'hq' && view !== 'cde') {
    return false;
  }
  return true;
}

function Root() {
  const [mode, setMode] = useState<'intro' | 'workspace'>(() => {
    const intro = shouldStartInIntro();
    introBridge.enabled = intro;
    return intro ? 'intro' : 'workspace';
  });

  const enterWorkspace = useCallback(() => {
    introBridge.enabled = false;
    introBridge.hostPoseSampler = null;
    introBridge.inspectPose = null;
    // Clear any legacy skip flag so the next reload can show the intro again.
    sessionStorage.removeItem('cerebro-entered');
    const url = new URL(window.location.href);
    url.searchParams.delete('intro');
    url.searchParams.delete('movie');
    if (!url.searchParams.get('view')) url.searchParams.set('view', 'hq');
    window.history.replaceState({}, '', url);
    setMode('workspace');
  }, []);

  if (mode === 'intro') {
    introBridge.enabled = true;
    return <CerebroIntro onEnterWorkspace={enterWorkspace} />;
  }

  introBridge.enabled = false;
  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />);
