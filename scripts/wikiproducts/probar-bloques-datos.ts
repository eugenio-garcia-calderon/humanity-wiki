// Comprueba que un bloque de datos viaja por markdown ida y vuelta (la API
// pública crea páginas desde markdown) y que la valla no deja colar tipos que
// no son de datos. Uso: npx tsx scripts/wikiproducts/probar-bloques-datos.ts
import assert from 'node:assert/strict';
import { markdownABloques, bloquesAMarkdown, TIPOS_BLOQUE_DATOS, esBloqueDatos } from '../../src/utils/bloques.ts';

const md = [
  '# Powerbank de prueba',
  '',
  '```bloque',
  '{"tipo": "comparador", "datos": {"tabla_id": "T1", "filas": ["a", "b"]}}',
  '```',
  '',
  '```bloque',
  '{"tipo": "propiedad"}',
  '```',
].join('\n');

const bs = markdownABloques(md);
assert.equal(bs.length, 3);
assert.equal(bs[1].tipo, 'comparador');
assert.deepEqual(bs[1].datos, { tabla_id: 'T1', filas: ['a', 'b'] });
assert.equal(bs[2].tipo, 'propiedad');
assert.equal(bs[2].datos, undefined);

// Ida y vuelta: lo exportado se vuelve a leer igual.
const vuelta = markdownABloques(bloquesAMarkdown(bs));
assert.deepEqual(vuelta.map(b => [b.tipo, b.datos]), bs.map(b => [b.tipo, b.datos]));

// Un tipo que no es de datos, o un JSON roto, se queda en bloque de código.
for (const cuerpo of ['{"tipo": "web", "url": "https://x"}', '{roto', '"comparador"']) {
  const [b] = markdownABloques('```bloque\n' + cuerpo + '\n```');
  assert.equal(b.tipo, 'codigo', cuerpo);
  assert.equal(b.texto, cuerpo);
}

// Los `datos` tienen que ser un objeto.
assert.equal(markdownABloques('```bloque\n{"tipo":"chat","datos":[1]}\n```')[0].datos, undefined);

// Un bloque de código normal sigue siendo de código.
assert.equal(markdownABloques('```js\nconst a = 1;\n```')[0].tipo, 'codigo');

assert.equal(TIPOS_BLOQUE_DATOS.length, 9);
assert.ok(TIPOS_BLOQUE_DATOS.every(esBloqueDatos));
assert.ok(!esBloqueDatos('parrafo'));

console.log('bloques de datos: todo bien');
