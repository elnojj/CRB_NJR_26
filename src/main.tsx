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
  // Explicit workspace deep-links skip the cinematic entry.
  const view = params.get('view');
  if (view && view !== 'intro' && view !== 'movie') return false;
  if (params.get('intro') === '1' || params.get('movie') === '1' || view === 'intro' || view === 'movie') {
    return true;
  }
  if (sessionStorage.getItem('cerebro-entered') === '1') return false;
  // Movie branch default: open on the 180s introduction.
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
    sessionStorage.setItem('cerebro-entered', '1');
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
