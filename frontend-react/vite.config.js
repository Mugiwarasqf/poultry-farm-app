import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Stamps dist/sw.js with a fresh build id. Without it sw.js is byte-identical
 * across deploys, so installed apps never notice a new version.
 */
function stampServiceWorker() {
  let outDir = 'dist';
  return {
    name: 'farmbook-stamp-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      if (!existsSync(file)) return;
      const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '');
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__BUILD_ID__', buildId));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  server: {
    port: 3000,
    open: false,
  },
});
