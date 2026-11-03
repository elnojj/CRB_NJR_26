import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/** Production asset prefix for labs.nojara.com (/cro/) or local `/`. */
function resolveBase(): string {
  const fromEnv = process.env.VITE_BASE?.trim();
  if (fromEnv) {
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`;
  }
  return '/';
}

export default defineConfig(() => {
  return {
    base: resolveBase(),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Cloudflare quick tunnels + hosted previews rewrite Host; allow them through Vite.
      allowedHosts: true as const,
    },
    preview: {
      allowedHosts: true as const,
    },
  };
});
