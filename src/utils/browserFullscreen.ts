/** Native browser Fullscreen API helpers — available in workspace and intro. */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenEnabled?: boolean;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitEnterFullscreen?: () => Promise<void> | void;
};

export function getFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

export function isBrowserFullscreen(): boolean {
  return Boolean(getFullscreenElement());
}

export function isBrowserFullscreenSupported(): boolean {
  const doc = document as FullscreenDocument;
  const el = document.documentElement as FullscreenElement;
  return Boolean(
    document.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      el.requestFullscreen ||
      el.webkitRequestFullscreen
  );
}

export async function enterBrowserFullscreen(
  target: HTMLElement = document.documentElement
): Promise<boolean> {
  const el = target as FullscreenElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[browserFullscreen] enter failed', err);
  }
  return false;
}

export async function exitBrowserFullscreen(): Promise<boolean> {
  if (!isBrowserFullscreen()) return true;
  const doc = document as FullscreenDocument;
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    }
    if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[browserFullscreen] exit failed', err);
  }
  return false;
}

export async function toggleBrowserFullscreen(
  target: HTMLElement = document.documentElement
): Promise<boolean> {
  if (isBrowserFullscreen()) {
    return exitBrowserFullscreen();
  }
  return enterBrowserFullscreen(target);
}

export function subscribeBrowserFullscreen(onChange: (active: boolean) => void): () => void {
  const handler = () => onChange(isBrowserFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler as EventListener);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler as EventListener);
  };
}
