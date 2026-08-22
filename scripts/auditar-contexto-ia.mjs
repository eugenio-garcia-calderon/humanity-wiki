#!/usr/bin/env node
// ============================================================================
// LO QUE LA IA PUEDE LEER DE LA GENTE (2026-08-22)
// ============================================================================
//     node scripts/auditar-contexto-ia.mjs
//
// Eugenio: «que los datos de los usuarios estén seguros incluso protegidos de
// los administradores e IAs».
//
// ── LO QUE SE COMPROBÓ A MANO, Y POR QUÉ HACE FALTA ESTO ───────────────────
// Fui a buscar una fuga en el asistente y no la había: todas las consultas que
// le dan contexto filtran por el id de quien pregunta, y el índice que busca
// solo tiene conocimiento común y publicaciones ya publicadas.
//
// El problema no es hoy. Es que **esa regla vive en la costumbre de quien
// escribe la siguiente consulta**. Un `SELECT` sin filtro añadido dentro de seis
// meses no lo va a parar nadie, y el fallo sería silencioso: la IA contestaría
// tan tranquila con el contenido de otra persona.
//
// Esto lo convierte en una pregunta de máquina: **toda consulta del módulo de
// IA que toque una tabla con contenido personal tiene que llevar, en la misma
// consulta, un filtro por el dueño.**
//
// ── DE DÓNDE SALE LA LISTA DE «TABLAS PERSONALES» ──────────────────────────
// De la clasificación (`src/server/seguridad/clasificacion.ts`), no de una lista
// aparte que se quedaría vieja: son las que tienen confidencialidad MEDIA o
// ALTA. Si alguien clasifica mañana una tabla nueva como confidencial, esta
// auditoría empieza a vigilarla sola.
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');

// ── 1. Qué tablas guardan contenido de personas ────────────────────────────
const clasificacion = fs.readFileSync(path.join(raiz, 'src/server/seguridad/clasificacion.ts'), 'utf8');
const personales = new Set();
// Solo confidencialidad ALTA. Con MEDIA la lista se llenaba de tablas que son
// públicas a propósito —productos del mercado, grafos publicados— y la
// auditoría cantaba 18 veces, de las cuales ninguna era una fuga. Una alarma
// que se equivoca 18 de 18 veces no la mira nadie a la tercera.
for (const m of clasificacion.matchAll(
  /^\s*c\('([a-z_]+)',\s*'(?:BAJA|MEDIA|ALTA)',\s*'ALTA'/gm)) {
  personales.add(m[1]);
}

// Las que son de todos aunque su confidencialidad sea alta por otro motivo.
for (const comun of ['publications', 'content', 'page_texts', 'textos_editables']) personales.delete(comun);

/** Una consulta puede llevar al lado una excusa escrita:
 *      // contexto-ia: el dueño se comprueba en la consulta de arriba
 *  Igual que la tabla de permisos: se DECLARA la excepción, no se deduce. Así
 *  la revisión de mañana ve por qué esta pasa y no tiene que reconstruirlo. */
const EXCUSA = /\/\/\s*contexto-ia:\s*\S/;

// ── 2. Las consultas del módulo de IA ──────────────────────────────────────
const ficheros = [];
(function recorrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.ts')) ficheros.push(p);
  }
})(path.join(raiz, 'src/server/ai'));

/** Un filtro por dueño, en cualquiera de las formas que usa esta casa. */
const FILTRO_DUENO = /(user_id|creator_user_id|creador_user_id|autor_user_id|author_user_id|actor)\s*=\s*\$\{/;

const sospechosas = [];
for (const f of ficheros) {
  const texto = fs.readFileSync(f, 'utf8');
  const lineas = texto.split('\n');

  // Cada `sql\`` … \`` es una consulta. Se recorre entera, no línea a línea:
  // el filtro suele estar tres líneas más abajo que el FROM.
  const re = /sql`([\s\S]*?)`/g;
  let m;
  while ((m = re.exec(texto))) {
    const consulta = m[1];
    if (!/\bFROM\b/i.test(consulta)) continue;
    const linea = texto.slice(0, m.index).split('\n').length;

    for (const tabla of personales) {
      const tocada = new RegExp(`\\b(FROM|JOIN)\\s+${tabla}\\b`, 'i').test(consulta);
      if (!tocada) continue;
      if (FILTRO_DUENO.test(consulta)) continue;
      // ¿Hay una excusa escrita justo encima de la consulta?
      const encima = lineas.slice(Math.max(0, linea - 6), linea).join('\n');
      if (EXCUSA.test(encima)) continue;
      sospechosas.push({
        fichero: path.relative(raiz, f), linea, tabla,
        muestra: consulta.trim().replace(/\s+/g, ' ').slice(0, 100),
      });
    }
  }
}

// ── 3. El veredicto ────────────────────────────────────────────────────────
const linea = () => console.log('─'.repeat(74));
console.log('\nQUÉ PUEDE LEER LA IA DE LA GENTE');
linea();
console.log(`  ficheros del módulo de IA        ${String(ficheros.length).padStart(4)}`);
console.log(`  tablas con contenido personal    ${String(personales.size).padStart(4)}`);
console.log(`  consultas sin filtro por dueño   ${String(sospechosas.length).padStart(4)}`);
linea();

if (!sospechosas.length) {
  console.log('\n✓ Ninguna consulta del asistente lee contenido de una persona sin filtrar por su dueño.\n');
  console.log('  Esto NO dice que la IA sea segura: dice que hoy no hay ninguna consulta');
  console.log('  que pueda entregar lo de otro. Lo que un modelo haga con lo que sí puede');
  console.log('  leer es otra pregunta, y no se contesta con un grep.\n');
  process.exit(0);
}

console.log(`\n✗ ${sospechosas.length} consulta(s) leen contenido personal sin filtrar por dueño:\n`);
for (const s of sospechosas) {
  console.log(`    ${s.fichero}:${s.linea}  ·  tabla ${s.tabla}`);
  console.log(`      ${s.muestra}…`);
}
console.log('\n  Si es a propósito —porque la consulta ya viene acotada de antes— añade el');
console.log('  filtro igualmente o deja escrito al lado por qué no hace falta. Una consulta');
console.log('  que parece una fuga y no lo es cuesta lo mismo de revisar que una que sí.\n');
process.exit(1);
