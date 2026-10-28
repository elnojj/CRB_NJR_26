import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { EditorialMonograph } from './editorial/EditorialMonograph';
import './index.css';
import './styles/cerebro-shell.css';

function isEditorialLaunchQuery(): boolean {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view')?.toLowerCase();
  return (
    params.get('editorial') === '1' ||
    view === 'editorial' ||
    view === 'monograph' ||
    (params.get('blueprint')?.toUpperCase() === 'H03' &&
      params.get('mode') === 'editorial')
  );
}

function exitEditorialToOps(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('editorial');
  url.searchParams.delete('mode');
  const view = url.searchParams.get('view');
  if (view === 'editorial' || view === 'monograph') {
    url.searchParams.delete('view');
  }
  url.searchParams.set('preview', '1');
  url.searchParams.set('blueprint', 'H03');
  window.location.replace(url.toString());
}

const reducedMotion =
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const root = createRoot(document.getElementById('root')!);

if (isEditorialLaunchQuery()) {
  root.render(
    <EditorialMonograph
      reducedMotion={reducedMotion}
      onExitToOps={exitEditorialToOps}
    />
  );
} else {
  root.render(<App />);
}
