// Renders the card illustrations of Diseño 1 to PNG, framed exactly as on the home page (card header, 2x).
// Usage: npm run build (for the CSS) and then
//   npx tsx --tsconfig tsconfig.json scripts/disenoUno/render.tsx <module relative to src/> <ExportName> [ExportName…]
// Writes /tmp/disenoUno/<ExportName>.html; shoot them with scripts/disenoUno/shoot.py.
import React from 'react';
(globalThis as any).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

const [mod, ...nombres] = process.argv.slice(2);
const DIST = process.env.DIST || 'dist';
const css = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.css'))
  .map(f => path.resolve(DIST, 'assets', f)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const OUT = process.env.OUT || '/tmp/disenoUno';
fs.mkdirSync(OUT, { recursive: true });
const m = await import(path.resolve('src', mod));
for (const n of nombres) {
  const V = m[n];
  if (!V) { console.error('no export', n); continue; }
  const fondo = m.FONDOS?.[n] || 'bg-gradient-to-br from-slate-50 via-white to-slate-100';
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${css}"></head>
<body style="margin:0;background:#f8fafc;padding:24px">
<div class="group w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
<span class="block h-36 overflow-hidden border-b border-slate-100 ${fondo}">${renderToStaticMarkup(<V />)}</span>
<span class="block px-4 pb-4 pt-3"><span class="block text-[17px] font-bold leading-snug text-slate-900">${n}</span><span class="mt-1 block text-[13.5px] leading-snug text-slate-600">Un subtítulo corto de una o dos líneas que explica el valor.</span></span>
</div></body></html>`;
  fs.writeFileSync(`${OUT}/${n}.html`, html);
  console.log('ok', n);
}
