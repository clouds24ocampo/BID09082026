// Generates every app icon from one SVG master: PWA, Apple touch, Electron and Capacitor.
// Usage: node scripts/generate-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const root = path.resolve(import.meta.dirname, '..');
const out = (...p) => path.join(root, ...p);

const mark = (inset) => `
  <g transform="translate(${inset} ${inset}) scale(${(1024 - inset * 2) / 1024})">
    <polygon points="512,212 772,362 772,662 512,812 252,662 252,362" fill="none" stroke="#fff" stroke-width="44" stroke-linejoin="round"/>
    <polyline points="252,362 512,512 772,362" fill="none" stroke="#fff" stroke-width="44" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="512" y1="512" x2="512" y2="812" stroke="#fff" stroke-width="44" stroke-linecap="round"/>
  </g>`;

const svg = ({ rounded = true, inset = 0 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#06b6d4"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
  <rect width="1024" height="1024" ${rounded ? 'rx="230"' : ''} fill="url(#g)"/>${mark(inset)}
</svg>`;

fs.mkdirSync(out('public/icons'), { recursive: true });
fs.mkdirSync(out('build'), { recursive: true });
fs.mkdirSync(out('resources'), { recursive: true });

fs.writeFileSync(out('public/logo.svg'), svg());

async function png(markup, size, file) {
  const img = await loadImage(Buffer.from(markup));
  const c = createCanvas(size, size);
  c.getContext('2d').drawImage(img, 0, 0, size, size);
  fs.writeFileSync(file, c.toBuffer('image/png'));
  console.log('wrote', path.relative(root, file));
}

await png(svg(), 192, out('public/icons/icon-192.png'));
await png(svg(), 512, out('public/icons/icon-512.png'));
// Maskable: full-bleed square with the mark inside the 80% safe zone
await png(svg({ rounded: false, inset: 130 }), 512, out('public/icons/maskable-512.png'));
await png(svg({ rounded: false, inset: 60 }), 180, out('public/icons/apple-touch-icon.png'));
await png(svg(), 1024, out('build/icon.png'));
// Capacitor asset sources (icon + splash) used by `npx capacitor-assets generate`
await png(svg({ rounded: false, inset: 150 }), 1024, out('resources/icon.png'));
await png(svg({ rounded: false, inset: 330 }), 2732, out('resources/splash.png'));
