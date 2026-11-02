import { createRoot } from 'react-dom/client';
import { useCallback, useState } from 'react';
import App from './App.tsx';
import './index.css';
import { CerebroIntro } from './intro/main';
import { Explainer60Player } from './intro/Explainer60Player';
import { introBridge } from './intro/bridge';
import { resolveEditionFromSearch } from './intro/explainer60';

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

type BootMode = 'intro' | 'explainer-60' | 'workspace';

function resolveBootMode(): BootMode {
  const edition = resolveEditionFromSearch(window.location.search);
  if (edition === 'explainer-60') return 'explainer-60';
  if (edition === 'intro-180') return 'intro';
  if (edition === 'none') return 'workspace';
  // default: keep the existing reload → 180s intro policy
  return shouldStartInIntro() ? 'intro' : 'workspace';
}

function Root() {
  const [mode, setMode] = useState<BootMode>(() => {
    const boot = resolveBootMode();
    introBridge.enabled = boot === 'intro' || boot === 'explainer-60';
    return boot;
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
    url.searchParams.delete('explainer');
    url.searchParams.delete('edition');
    if (!url.searchParams.get('view')) url.searchParams.set('view', 'hq');
    window.history.replaceState({}, '', url);
    setMode('workspace');
  }, []);

  if (mode === 'explainer-60') {
    introBridge.enabled = true;
    return <Explainer60Player onEnterWorkspace={enterWorkspace} />;
  }

  if (mode === 'intro') {
    introBridge.enabled = true;
    return <CerebroIntro onEnterWorkspace={enterWorkspace} />;
  }

  introBridge.enabled = false;
  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />);
