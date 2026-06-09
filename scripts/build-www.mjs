// Stages the web app into www/ for Capacitor (capacitor.config.json -> webDir).
// The repo root stays the source of truth so the GitHub Pages deploy is untouched;
// pointing webDir at the root would recursively copy android/ and node_modules/.
//
// The service worker (sw.js) is intentionally NOT staged: inside the native shell
// assets are already local, and a stale SW cache would only fight app updates.
// js/game.js skips SW registration when it can't find one to register on native.

import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');

const entries = [
  'index.html',
  'privacy.html',
  'manifest.webmanifest',
  'js',
  'css',
  'fonts',
  'icons',
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of entries) {
  cpSync(join(root, entry), join(out, entry), { recursive: true });
}
console.log(`Staged ${entries.length} entries into www/`);
