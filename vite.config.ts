import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/**
 * Les packs de données restent à la racine du projet (packs/), là où les outils les
 * produisent et les valident. Ce plugin les sert en dev sous /packs/ et les copie
 * dans le build, sans les dupliquer dans le dépôt. Les PDF et exécutables sont exclus.
 */
function packs(): Plugin {
  const root = resolve(import.meta.dirname, 'packs');
  const list = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? list(p) : /\.(json|md)$/i.test(n) ? [p] : [];
    });
  return {
    name: 'ups-packs',
    configureServer(server) {
      server.middlewares.use('/packs', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/+/, '');
        const file = resolve(root, rel);
        if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const f of list(root)) {
        this.emitFile({ type: 'asset', fileName: 'packs/' + relative(root, f).split(sep).join('/'), source: readFileSync(f) });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    packs(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Entretien UPS - Alarmes Eaton',
        short_name: 'UPS Alarmes',
        description: 'Recherche et décodage des alarmes Eaton 93PM / 93PS, hors ligne.',
        lang: 'fr',
        theme_color: '#0b5cab',
        background_color: '#f5f7fa',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
