// Renders every card of Diseño 1 (HERRAMIENTAS) to /tmp/du-todas/<rowId>.html, with its real title and subtitle,
// for a review round. DIST=/tmp/dist-x npx tsx --tsconfig tsconfig.json scripts/disenoUno/todas.tsx
// then: OUT=/tmp/du-todas python3 scripts/disenoUno/shoot.py
import React from 'react';
(globalThis as any).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { HERRAMIENTAS } from '../../src/components/sitio/disenoUno/herramientas';

const DIST = process.env.DIST || 'dist';
const css = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.css'))
  .map(f => path.resolve(DIST, 'assets', f)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const OUT = process.env.OUT || '/tmp/du-todas';
fs.mkdirSync(OUT, { recursive: true });
for (const [id, h] of Object.entries(HERRAMIENTAS)) {
  const V = h.Visual;
  fs.writeFileSync(`${OUT}/${id}.html`, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${css}"></head>
<body style="margin:0;background:#f8fafc;padding:24px">
<div class="group w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
<span class="relative block h-36 overflow-hidden border-b border-slate-100 ${h.fondo}">${renderToStaticMarkup(<V />)}</span>
<span class="block px-4 pb-4 pt-3"><span class="block text-[17px] font-bold leading-snug text-slate-900">${h.titulo || id}</span><span class="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-slate-600">${h.texto}</span></span>
</div></body></html>`);
}
console.log('ok', Object.keys(HERRAMIENTAS).length);
