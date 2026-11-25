#!/usr/bin/env node
// ============================================================================
// GENERA `public/geometria-figura/datos.json` A PARTIR DE LA PÁGINA DE LA GEOMETRÍA
// ============================================================================
// La fuente de verdad de los temas, los aspectos, los textos de cada nivel y las
// posiciones de cada partido es `public/observatorio-polarizacion/index.html`
// (las constantes `PARTIDOS` y `TEMAS`). El test de la figura necesita esos mismos
// datos y el servidor también (para el correo de resultados). Para que no existan
// dos copias que se separen, este script las extrae y escribe un único JSON.
//
//   node scripts/geometria-datos.mjs            regenera datos.json
//   node scripts/geometria-datos.mjs --verificar  falla si datos.json no coincide con la página
//
// Si cambias un texto o una posición en la página, vuelve a ejecutarlo y commitea el JSON.
// (Deuda conocida: ver memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md, «datos de la geometría».)

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = path.join(raiz, 'public/observatorio-polarizacion/index.html');
const destino = path.join(raiz, 'public/geometria-figura/datos.json');

const html = fs.readFileSync(origen, 'utf8');

/** Devuelve el bloque `const NOMBRE = …;` completo, contando llaves y corchetes (ignorando cadenas). */
function bloque(nombre) {
  const inicio = html.indexOf(`const ${nombre} = `);
  if (inicio < 0) throw new Error(`No encuentro «const ${nombre} =» en la página.`);
  let i = html.indexOf('=', inicio) + 1;
  let prof = 0, enCadena = null, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (enCadena) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === enCadena) enCadena = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') enCadena = c;
    else if (c === '{' || c === '[' || c === '(') prof++;
    else if (c === '}' || c === ']' || c === ')') {
      prof--;
      if (prof === 0) {
        const fin = html.indexOf(';', i);
        return html.slice(inicio, fin + 1);
      }
    }
  }
  throw new Error(`«${nombre}» no cierra.`);
}

const codigo = bloque('PARTIDOS') + '\n' + bloque('TEMAS') + '\n;({ PARTIDOS, TEMAS })';
const { PARTIDOS, TEMAS } = vm.runInNewContext(codigo, {}, { timeout: 2000 });

// Solo lo que usa el test y el servidor: nada de los textos largos de «p», «t», «obj»…
const datos = {
  // Versión 2 (2026-11-25): cinco niveles por aspecto (`niv` con cinco textos, `v` con niveles de 0 a 4) y la ficha del ideal (`it`, `is`).
  version: 2,
  origen: 'public/observatorio-polarizacion/index.html (PARTIDOS y TEMAS)',
  partidos: PARTIDOS.map(p => ({ k: p.k, n: p.n, c: p.c })),
  temas: Object.entries(TEMAS).map(([k, t]) => ({
    k,
    n: t.n,
    q: t.q,
    c: t.c,
    niv: t.niv,
    ejes: t.ejes.map(e => ({ l: e.l, n: e.n, d: e.d, niv: e.niv, it: e.it, is: e.is })),
    v: t.v,
  })),
};

// Comprobaciones de forma: si algo de esto falla, la página ha cambiado y hay que revisar antes.
const errores = [];
if (datos.temas.length !== 10) errores.push(`Se esperaban 10 temas y hay ${datos.temas.length}.`);
// Los temas NO tienen todos el mismo número de aspectos: hoy hay 8 en «inm» y «ser» y 6 en los demás
// (64 deslizadores en total). Por eso se comprueba contra el propio tema, no contra un número fijo.
for (const t of datos.temas) {
  if (t.ejes.length < 3 || t.ejes.length > 8) errores.push(`${t.k}: ${t.ejes.length} aspectos, fuera de 3-8.`);
  if (t.niv.length !== 5) errores.push(`${t.k}: se esperaban 5 niveles.`);
  for (const e of t.ejes) {
    if (e.niv.length !== 5) errores.push(`${t.k}/${e.n}: se esperaban 5 niveles por aspecto.`);
    // `it` e `is` faltan mientras el ideal de ese tema está pendiente; si hay uno, tiene que haber el otro
    if (!!e.it !== !!e.is || (e.is && !/^[a-z0-9-]+$/.test(e.is))) errores.push(`${t.k}/${e.n}: título o dirección de la ficha del ideal incompletos.`);
  }
  for (const p of datos.partidos) {
    const v = t.v[p.k];
    if (!Array.isArray(v) || v.length !== t.ejes.length || v.some(x => !Number.isInteger(x) || x < 0 || x > 4))
      errores.push(`${t.k}/${p.k}: posición no válida (un nivel de 0 a 4 por aspecto).`);
  }
}
if (errores.length) {
  console.error('datos de la geometría: la página no tiene la forma esperada.\n- ' + errores.join('\n- '));
  process.exit(1);
}

const texto = JSON.stringify(datos, null, 2) + '\n';

if (process.argv.includes('--verificar')) {
  const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
  if (actual !== texto) {
    console.error('datos.json no coincide con la página. Ejecuta: node scripts/geometria-datos.mjs');
    process.exit(1);
  }
  console.log('datos.json al día con la página.');
} else {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, texto);
  console.log(`Escrito ${path.relative(raiz, destino)}: ${datos.temas.length} temas, ${datos.partidos.length} partidos.`);
}
