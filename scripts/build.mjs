// Copyright (c) 2025 Jema Technology.
// Reproducible build: concatenate the app scripts (classic, global-scope, in
// load order), minify them, emit a content-hashed bundle, and rewrite
// index.html + sw.js to point at it.
//
// Usage: node scripts/build.mjs
//
// Requires esbuild (run via `npx --yes esbuild`).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (rel) => join(root, rel);

// Order MUST match the historic <script> order in index.html.
const SOURCES = [
  'js/chrome-shim.js',
  'js/pwa-compat.js',
  'js/app.js',
  'js/editor-cm.js',
  'js/i18n-template.js',
  'js/search.js',
  'js/settings.js',
  'js/tabs.js',
  'js/util.js',
  'js/controllers/dialog.js',
  'js/controllers/hotkeys.js',
  'js/controllers/menu.js',
  'js/controllers/search.js',
  'js/controllers/settings.js',
  'js/controllers/window.js'
];

const concat = SOURCES.map((f) => readFileSync(p(f), 'utf8')).join('\n');
const tmpIn = join(tmpdir(), 'quicktext-all.js');
const tmpOut = join(tmpdir(), 'quicktext-app.min.js');
writeFileSync(tmpIn, concat);

execFileSync('npx', ['--yes', 'esbuild', tmpIn, '--minify', '--target=es2020', `--outfile=${tmpOut}`, '--log-level=error'], { stdio: 'inherit' });

const minified = readFileSync(tmpOut);
const hash = createHash('sha256').update(minified).digest('hex').slice(0, 8);
const bundleName = `app.${hash}.min.js`;
writeFileSync(p(`js/${bundleName}`), minified);

// Drop previously built bundles.
for (const f of readdirSync(p('js'))) {
  if (/^app\.[a-f0-9]+\.min\.js$/.test(f) && f !== bundleName) {
    unlinkSync(p(`js/${f}`));
  }
}

// Rewrite index.html script block.
const html = readFileSync(p('index.html'), 'utf8');
const htmlNext = html.replace(
  /(<!-- JS -->)[\s\S]*?(<!-- \/JS -->)/,
  `$1\n  <!-- Concatenated + minified bundle (sources in js/, build via scripts/build.mjs) -->\n  <script defer src="js/${bundleName}"></script>\n  $2`
);
writeFileSync(p('index.html'), htmlNext);

// Rewrite sw.js precache entry.
const sw = readFileSync(p('sw.js'), 'utf8');
const swNext = sw.replace(/\/js\/app\.[a-f0-9]+\.min\.js/, `/js/${bundleName}`);
writeFileSync(p('sw.js'), swNext);

const kb = (n) => (n / 1024).toFixed(1);
console.log(`Bundle: js/${bundleName} (${kb(concat.length)} KB -> ${kb(minified.length)} KB)`);
