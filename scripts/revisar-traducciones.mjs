#!/usr/bin/env node
// Lista lo que falta traducir (2026-10-06, #34). Busca en `src/` las llamadas
// `t('…')` / `tr('…')` y dice cuáles no están en el diccionario de cada idioma
// (`src/i18n/<idioma>.ts`). Uso: node scripts/revisar-traducciones.mjs [en]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const idioma = process.argv[2] || 'en';
const dic = readFileSync(path.join(raiz, 'i18n', `${idioma}.ts`), 'utf8');
const claves = new Set([...dic.matchAll(/^\s*("(?:[^"\\]|\\.)*"):/gm)].map(m => JSON.parse(m[1])));

const faltan = new Map();
const recorrer = (d) => {
  for (const n of readdirSync(d)) {
    const p = path.join(d, n);
    if (statSync(p).isDirectory()) { recorrer(p); continue; }
    if (!/\.(tsx?|jsx?)$/.test(n) || p.includes(`${path.sep}i18n${path.sep}`)) continue;
    const s = readFileSync(p, 'utf8');
    for (const m of s.matchAll(/\b(?:t|tr)\(\s*'((?:[^'\\\n]|\\.)*)'/g)) {
      const k = m[1].replace(/\\'/g, "'");
      if (!claves.has(k)) (faltan.get(k) || faltan.set(k, []).get(k)).push(path.relative(raiz, p));
    }
  }
};
recorrer(raiz);
for (const [k, fs] of faltan) console.log(`${JSON.stringify(k)}  <-  ${[...new Set(fs)].join(', ')}`);
console.log(`\n${faltan.size} texto(s) sin traducir al «${idioma}».`);
