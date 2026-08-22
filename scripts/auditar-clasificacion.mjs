#!/usr/bin/env node
// ============================================================================
// ¿ESTÁ TODO CLASIFICADO? (2026-08-22)
// ============================================================================
//     node scripts/auditar-clasificacion.mjs
//
// Compara las tablas que existen de verdad con las que declara
// `src/server/seguridad/clasificacion.ts`, y falla si alguna no está.
//
// POR QUÉ ESTO TIENE QUE FALLAR LA COMPILACIÓN. Aquí trabajan cinco personas a
// la vez y las tablas nacen a diario. Una tabla nueva sin clasificar no es un
// descuido administrativo: es un dato que nadie ha decidido cómo proteger,
// guardado en una plataforma que promete que no se puede corromper. El momento
// de decidirlo es el día que se crea, cuando quien la creó todavía se acuerda
// de para qué era.
//
// DE DÓNDE SACA LA LISTA. De las migraciones (`drizzle/*.sql`), que no necesitan
// nada encendido, y además de la base de datos si hay una a mano — porque las
// dos fuentes se separan: hay tablas creadas por semillas y por trabajo de otro
// que todavía no está en esta rama. Se dice cuál se ha podido mirar y cuál no.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const raiz = path.resolve(import.meta.dirname, '..');

// ── 1. Las tablas de las migraciones ───────────────────────────────────────
const dir = path.join(raiz, 'drizzle');
const deMigraciones = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) {
    deMigraciones.add(m[1].toLowerCase());
  }
}

// ── 2. Y las de la base de datos, si contesta ──────────────────────────────
let deLaBase = null;
try {
  const salida = execFileSync('psql', [
    '-d', process.env.SQL_DB_NAME || 'evolucion_humanidad', '-tAc',
    "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'",
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
  deLaBase = new Set(salida.split('\n').map((s) => s.trim()).filter(Boolean));
} catch {
  deLaBase = null; // no hay base a mano: se dice, no se da por bueno
}

// ── 3. Lo que declara la clasificación ─────────────────────────────────────
// Se lee el fuente, para no depender de TypeScript ni de que nada compile.
const fuente = fs.readFileSync(path.join(raiz, 'src/server/seguridad/clasificacion.ts'), 'utf8');
const declaradas = new Map();
for (const m of fuente.matchAll(/^\s*c\('([a-z_][a-z0-9_]*)',\s*'(BAJA|MEDIA|ALTA)',\s*'(BAJA|MEDIA|ALTA)',\s*'(BAJA|MEDIA|ALTA)',\s*'(BAJA|MEDIA|ALTA)'([\s\S]*?)\),\s*$/gm)) {
  const derivado = /,\s*true\s*$/.test(m[6].trim());
  const peso = { BAJA: 1, MEDIA: 2, ALTA: 3 };
  const capa = derivado ? 0 : Math.max(peso[m[2]], peso[m[5]]);
  declaradas.set(m[1], { integridad: m[2], confidencialidad: m[3], trazabilidad: m[4], autenticidad: m[5], capa });
}

// ── 4. Las tres respuestas ─────────────────────────────────────────────────
const existen = new Set([...deMigraciones, ...(deLaBase ?? [])]);
const sinClasificar = [...existen].filter((t) => !declaradas.has(t)).sort();
const sobran = [...declaradas.keys()].filter((t) => !existen.has(t)).sort();

const reparto = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (const [t, d] of declaradas) if (existen.has(t)) reparto[d.capa]++;

const linea = () => console.log('─'.repeat(74));
console.log('\nCLASIFICACIÓN DE LOS DATOS');
linea();
console.log(`  tablas en las migraciones          ${String(deMigraciones.size).padStart(4)}`);
console.log(`  tablas en la base de datos         ${deLaBase ? String(deLaBase.size).padStart(4) : '  NO SÉ (no hay base a mano)'}`);
console.log(`  tablas clasificadas                ${String(declaradas.size).padStart(4)}`);
linea();
console.log('  capa 3 · firmada, anclada y con alarma inmediata   ' + String(reparto[3]).padStart(3));
console.log('  capa 2 · sellada y anclada cada día                ' + String(reparto[2]).padStart(3));
console.log('  capa 1 · historial y archivado                     ' + String(reparto[1]).padStart(3));
console.log('  capa 0 · se puede volver a calcular                ' + String(reparto[0]).padStart(3));
linea();

if (sinClasificar.length) {
  console.log(`\n✗ ${sinClasificar.length} tabla(s) sin clasificar:\n`);
  for (const t of sinClasificar) console.log(`    ${t}`);
  console.log('\n  Dile cuánto importa en src/server/seguridad/clasificacion.ts.');
  console.log('  Si es de otro programador, pregúntale a él: quien la creó sabe para qué era.');
}
if (sobran.length) {
  console.log(`\n✗ ${sobran.length} clasificada(s) que ya no existen:\n`);
  for (const t of sobran) console.log(`    ${t}`);
  console.log('\n  Bórralas de la clasificación.');
}
if (!deLaBase) {
  console.log('\n·  Sin base de datos a mano: sólo se han mirado las migraciones.');
  console.log('   Una tabla creada por una semilla o por otra rama NO se ha comprobado.');
}

const mal = sinClasificar.length + sobran.length;
console.log('');
console.log(mal === 0
  ? `✓ Las ${existen.size} tablas que existen están clasificadas.\n`
  : `✗ ${mal} cosa(s) que arreglar.\n`);
process.exit(mal === 0 ? 0 : 1);
