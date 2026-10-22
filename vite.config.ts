import { copyFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import manifest from './manifest.json';

const developmentCorsOrigins = [
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^http:\/\/localhost(?::\d+)?$/,
  /^chrome-extension:\/\/[a-p]{32}$/
];

const productionOutDir = 'dist/chrome-mv3';

function cleanProductionDist(): Plugin {
  return {
    name: 'clean-production-dist',
    apply: 'build',
    buildStart() {
      rmSync(resolve('dist'), { recursive: true, force: true });
    }
  };
}

function copyLicense(): Plugin {
  return {
    name: 'copy-license',
    apply: 'build',
    writeBundle(outputOptions) {
      if (!outputOptions.dir) throw new Error('Production build output directory is missing.');
      copyFileSync(resolve('LICENSE'), resolve(outputOptions.dir, 'LICENSE'));
    }
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    crx({ manifest }),
    ...(command === 'build' ? [cleanProductionDist(), copyLicense()] : [])
  ],
  server: {
    host: '127.0.0.1',
    allowedHosts: ['127.0.0.1', 'localhost'],
    cors: { origin: developmentCorsOrigins },
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    allowedHosts: ['127.0.0.1', 'localhost'],
    cors: { origin: developmentCorsOrigins },
    strictPort: true
  },
  build: {
    outDir: command === 'serve' ? '.crx-dev' : productionOutDir,
    emptyOutDir: true
  }
}));
