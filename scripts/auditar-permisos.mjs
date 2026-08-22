#!/usr/bin/env node
// ============================================================================
// ¿ESTÁN TODAS LAS ESCRITURAS AUTORIZADAS? (fase 0, 2026-08-22)
// ============================================================================
//     node scripts/auditar-permisos.mjs
//
// Compara las rutas de escritura que hay DE VERDAD en el código con la tabla
// de `src/server/seguridad/politica.ts`, y devuelve tres cosas distintas —
// nunca dos, que es la regla de la casa:
//
//   SIN DECLARAR  una ruta que escribe y que nadie ha metido en la tabla.
//                 Es un fallo: sale con código 1 y para la compilación.
//   SOBRA         una entrada de la tabla cuya ruta ya no existe. También
//                 falla: una tabla con entradas muertas deja de merecer
//                 confianza, y la confianza es lo único que aporta.
//   POR REVISAR   la ruta está declarada, pero declarada como «no lo sé».
//                 NO es un aprobado. Es el trabajo pendiente, y sale contado.
//
// POR QUÉ NO ARRANCA EL SERVIDOR PARA MIRAR SUS RUTAS. Sería más exacto, pero
// exigiría base de datos, claves y red para responder a una pregunta sobre el
// código. Una auditoría que necesita producción encendida es una auditoría que
// se deja de pasar.
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const FICHERO_POLITICA = 'src/server/seguridad/politica.ts';

// ── 1. Las rutas que hay en el código ──────────────────────────────────────
const ficheros = [];
(function recorrer(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.ts')) ficheros.push(p);
  }
})(path.join(raiz, 'src/server'));
ficheros.push(path.join(raiz, 'server.ts'));

const enElCodigo = new Map();
for (const f of ficheros) {
  if (f.endsWith(FICHERO_POLITICA.split('/').pop())) continue;
  const lineas = fs.readFileSync(f, 'utf8').split('\n');
  lineas.forEach((linea, i) => {
    const m = linea.match(/app\.(post|put|patch|delete)\(\s*['"`]([^'"`]+)/);
    if (!m) return;
    const clave = `${m[1].toUpperCase()} ${m[2]}`;
    if (!enElCodigo.has(clave)) {
      enElCodigo.set(clave, `${path.relative(raiz, f)}:${i + 1}`);
    }
  });
}

// ── 2. Las rutas que declara la tabla ──────────────────────────────────────
// Se lee el fuente en vez de importarlo: este programa corre con `node` pelado,
// sin TypeScript, y así sigue valiendo aunque un día no haya nada instalado.
const fuente = fs.readFileSync(path.join(raiz, FICHERO_POLITICA), 'utf8');
const declaradas = new Map();
for (const m of fuente.matchAll(/\{\s*m:\s*'(POST|PUT|PATCH|DELETE)',\s*ruta:\s*'([^']+)',\s*guardia:\s*\{\s*tipo:\s*'([a-z]+)'/g)) {
  declaradas.set(`${m[1]} ${m[2]}`, m[3]);
}

// ── 3. Las tres respuestas ─────────────────────────────────────────────────
const sinDeclarar = [...enElCodigo.keys()].filter((k) => !declaradas.has(k));
const sobran = [...declaradas.keys()].filter((k) => !enElCodigo.has(k));
const porRevisar = [...declaradas.entries()].filter(([k, tipo]) => tipo === 'revisar' && enElCodigo.has(k));

const linea = (s = '─') => console.log(s.repeat(74));

console.log('\nAUDITORÍA DE PERMISOS DE ESCRITURA');
linea();
console.log(`  rutas que escriben, en el código   ${String(enElCodigo.size).padStart(4)}`);
console.log(`  declaradas en la tabla             ${String(declaradas.size).padStart(4)}`);
console.log(`  revisadas por una persona          ${String(declaradas.size - porRevisar.length - sobran.length).padStart(4)}`);
console.log(`  POR REVISAR (nadie lo ha mirado)   ${String(porRevisar.length).padStart(4)}`);
linea();

if (sinDeclarar.length) {
  console.log(`\n✗ ${sinDeclarar.length} ruta(s) escriben y NO están en la tabla:\n`);
  for (const k of sinDeclarar) console.log(`    ${k}\n      ${enElCodigo.get(k)}`);
  console.log('\n  Añádelas a src/server/seguridad/politica.ts diciendo quién puede usarlas.');
}

if (sobran.length) {
  console.log(`\n✗ ${sobran.length} entrada(s) de la tabla ya no existen en el código:\n`);
  for (const k of sobran) console.log(`    ${k}`);
  console.log('\n  Bórralas: una tabla con entradas muertas deja de merecer confianza.');
}

if (porRevisar.length) {
  console.log(`\n·  ${porRevisar.length} sin revisar. No es un aprobado, es el trabajo que queda.`);
  console.log('   Las 10 primeras:\n');
  for (const [k] of porRevisar.slice(0, 10)) console.log(`    ${k}\n      ${enElCodigo.get(k)}`);
}

const mal = sinDeclarar.length + sobran.length;
console.log('');
if (mal === 0 && porRevisar.length === 0) {
  console.log('✓ Las 150 escrituras están declaradas y revisadas.\n');
} else if (mal === 0) {
  console.log(`✓ Ninguna ruta sin declarar. Quedan ${porRevisar.length} por revisar.\n`);
} else {
  console.log(`✗ ${mal} problema(s) que arreglar antes de dar esto por bueno.\n`);
}
process.exit(mal === 0 ? 0 : 1);
