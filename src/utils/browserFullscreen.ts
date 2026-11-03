export function isBrowserFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  return Boolean(document.fullscreenEnabled || el.webkitRequestFullscreen);
}

export function isBrowserFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export async function toggleBrowserFullscreen(
  target?: HTMLElement | null
): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = (target || document.documentElement) as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  };

  try {
    if (isBrowserFullscreen()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      return false;
    }
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    return true;
  } catch {
    return isBrowserFullscreen();
  }
}

export function subscribeBrowserFullscreen(
  listener: (() => void) | ((next?: boolean) => void)
): () => void {
  if (typeof document === 'undefined') return () => {};
  const wrapped = () => {
    (listener as (next?: boolean) => void)(isBrowserFullscreen());
  };
  document.addEventListener('fullscreenchange', wrapped);
  document.addEventListener('webkitfullscreenchange', wrapped as EventListener);
  return () => {
    document.removeEventListener('fullscreenchange', wrapped);
    document.removeEventListener('webkitfullscreenchange', wrapped as EventListener);
  };
}
