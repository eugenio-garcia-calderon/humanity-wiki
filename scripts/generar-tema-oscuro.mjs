#!/usr/bin/env node
// Genera `src/tema-oscuro.css` (2026-10-06, carril «espacio», #25).
//
// POR QUÉ UN GENERADOR. La interfaz está escrita con clases fijas de Tailwind
// (`bg-white`, `text-slate-900`…), unas 7.000. Reescribirlas con `dark:` sería
// tocar medio proyecto y pelearse con todos los demás a la vez. Tailwind 4
// pinta cada color con una variable (`var(--color-slate-900)`), así que basta
// con REDEFINIR esas variables bajo `html.dark`: cada `bg-`, `text-`,
// `border-`, `ring-`, `hover:`, `focus:`, `sm:`… cambia solo, incluido lo que
// se escriba mañana. Sin enumerar variantes.
//
// LO QUE ESTO NO RESUELVE SOLO, y el generador lo trata aparte:
//  1. `text-white` encima de un fondo de color (un botón verde): como el
//     blanco pasa a ser tinta oscura, ahí se le devuelve el blanco con una
//     variable local en el propio elemento (y sus hijos lo heredan).
//  2. Los telones de los modales (`bg-slate-900/40`): la escala se invierte,
//     así que serían claros. Se fuerzan a negro con su misma opacidad.
//  3. Los tonos suaves de color (`bg-emerald-50`…): se oscurecen mezclándolos
//     con la superficie, y sus textos fuertes (700-900) se aclaran.
//
// Uso: node scripts/generar-tema-oscuro.mjs   (reescribe src/tema-oscuro.css)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SUPERFICIE = '#11161d';
const SLATE = {
  50: '#171d26', 100: '#1e2631', 200: '#2a3442', 300: '#3a4656', 400: '#7d8a9c',
  500: '#94a3b8', 600: '#aab6c6', 700: '#c3cdda', 800: '#dbe2ec', 900: '#eef2f7', 950: '#f8fafc',
};
// gray/zinc/neutral/stone se usan de pasada: se apuntan a la misma escala.
const GRISES = ['gray', 'zinc', 'neutral', 'stone'];
const COLORES = ['emerald', 'green', 'lime', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber', 'yellow'];
const OVERLAYS = [20, 25, 30, 40, 45, 50, 55, 60, 70, 72, 75, 80, 85, 90, 95];

let css = `/* GENERADO por scripts/generar-tema-oscuro.mjs — no se edita a mano (2026-10-06, #25).
   Cómo y por qué: la cabecera del generador. Se activa con la clase \`dark\` en <html>
   (ver src/utils/tema.ts y el script de index.html, que la pone antes de pintar). */\n\n`;

css += `html.dark {\n  background-color: var(--color-white);\n  color-scheme: dark;\n  --color-white: ${SUPERFICIE};\n`;
for (const [k, v] of Object.entries(SLATE)) {
  css += `  --color-slate-${k}: ${v};\n`;
  for (const g of GRISES) css += `  --color-${g}-${k}: ${v};\n`;
}
for (const c of COLORES) {
  // Fondos suaves: el color al 10/16/26 % sobre la superficie. Textos fuertes: una tinta más clara.
  css += `  --color-${c}-50: color-mix(in oklab, var(--color-${c}-500) 10%, ${SUPERFICIE});\n`;
  css += `  --color-${c}-100: color-mix(in oklab, var(--color-${c}-500) 16%, ${SUPERFICIE});\n`;
  css += `  --color-${c}-200: color-mix(in oklab, var(--color-${c}-500) 26%, ${SUPERFICIE});\n`;
  css += `  --color-${c}-700: var(--color-${c}-400);\n  --color-${c}-800: var(--color-${c}-300);\n  --color-${c}-900: var(--color-${c}-200);\n`;
}
css += `}\n\n`;

// 1. El blanco vuelve a ser blanco encima de fondos de color o negros.
const fondosDeColor = [
  '[class*="bg-black"]', '[class*="from-black"]',
  ...COLORES.flatMap(c => [4, 5, 6, 7, 8, 9].flatMap(n => [`[class*="bg-${c}-${n}00"]`, `[class*="from-${c}-${n}00"]`])),
];
css += `/* 1. Blanco sobre fondos de color: el blanco es aquí tinta, no superficie. */\nhtml.dark :is(\n  ${fondosDeColor.join(',\n  ')}\n) {\n  --color-white: #fff;\n}\n\n`;

// 2. Telones y degradados oscuros sobre imágenes.
css += `/* 2. Telones de modales y degradados sobre fotos: siempre negros, con su opacidad. */\n`;
for (const n of OVERLAYS) {
  for (const t of ['900', '950', '800']) css += `html.dark .bg-slate-${t}\\/${n} { background-color: rgb(0 0 0 / ${n / 100}); }\n`;
  css += `html.dark .from-slate-950\\/${n} { --tw-gradient-from: rgb(0 0 0 / ${n / 100}); }\n`;
  css += `html.dark .via-slate-950\\/${n} { --tw-gradient-via: rgb(0 0 0 / ${n / 100}); }\n`;
  css += `html.dark .to-slate-950\\/${n} { --tw-gradient-to: rgb(0 0 0 / ${n / 100}); }\n`;
}
css += `\n`;

// 3. CSS escrito a mano en index.css.
css += `/* 3. Lo escrito a mano en index.css (no usa variables de Tailwind). */
html.dark .md-marca { color: ${SLATE[400]}; }
html.dark .md-codigo { background: ${SLATE[100]}; }
html.dark .md-mencion { background: ${SLATE[100]}; color: ${SLATE[800]}; }
html.dark .md-formula { color: ${SLATE[600]}; }
html.dark ::selection { background: rgb(52 211 153 / 0.35); }
html.dark input::placeholder, html.dark textarea::placeholder { color: ${SLATE[400]}; }
`;

writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'tema-oscuro.css'), css);
console.log('src/tema-oscuro.css escrito (' + css.length + ' bytes)');
