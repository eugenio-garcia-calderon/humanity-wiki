// ============================================================================
// QUE LA CAPA SALGA DE LA CLASIFICACIÓN, Y NO AL REVÉS (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-clasificacion.ts
//
// La cobertura (que no falte ninguna tabla) la comprueba
// `scripts/auditar-clasificacion.mjs`. Aquí se comprueba la REGLA: que la capa
// se calcule de las dimensiones, y que la confidencialidad no suba de capa.
//
// Esa última es la decisión que más fácil se deshace sin querer, y la que hace
// que el sistema entero tenga sentido: los indicadores del bien común son
// públicos y son lo más grave que se puede corromper. Si la confidencialidad
// subiera de capa, acabaríamos firmando y anclando conversaciones privadas
// mientras los indicadores se quedan sin firmar.
import {
  CLASIFICACION, CONTROLES, capaDe, capaDeTabla, claseDe, exigeCifrado, reparto,
} from '../src/server/seguridad/clasificacion.js';

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = '') => {
  if (bien) console.log(`  ✓ ${que}`);
  else { fallos++; console.log(`  ✗ ${que}${detalle ? `\n      ${detalle}` : ''}`); }
};

console.log('\nLA REGLA');
comprobar('integridad ALTA ⇒ capa 3',
  capaDeTabla('indicator_observations') === 3);
comprobar('un indicador público está en capa 3 aunque no se cifre',
  capaDeTabla('indicators') === 3 && exigeCifrado(claseDe('indicators')!) === false,
  'es el caso que demuestra por qué hacen falta cuatro dimensiones y no una etiqueta');
comprobar('una conversación privada se cifra y NO sube a capa 3',
  exigeCifrado(claseDe('ai_messages')!) === true && capaDeTabla('ai_messages') === 1);
comprobar('lo recalculable cae a capa 0',
  capaDeTabla('ai_knowledge_chunks') === 0);
comprobar('una tabla que no existe: undefined, no capa 0',
  capaDeTabla('tabla_que_no_existe') === undefined,
  'devolver 0 sería decir «no hay que protegerla» de algo que ni siquiera se conoce');

console.log('\nLO QUE NO PUEDE PASAR');
comprobar('nada con dinero o identidad se queda por debajo de la capa 3',
  ['users', 'sessions', 'transactions', 'movimientos_puntos', 'stripe_accounts', 'password_resets',
    'entity_history', 'registro_sellado'].every((t) => capaDeTabla(t) === 3));
comprobar('los controles son acumulativos y cada capa dice que lleva la anterior',
  CONTROLES[1][0].includes('capa 0') && CONTROLES[2][0].includes('capa 1') && CONTROLES[3][0].includes('capa 2'));
comprobar('no hay tablas repetidas en la clasificación',
  CLASIFICACION.length === new Set(CLASIFICACION.map((c) => c.tabla)).size);
comprobar('toda clase dice por qué, en una frase',
  CLASIFICACION.every((c) => c.porque.trim().length > 10));
comprobar('la capa nunca se escribe a mano: siempre sale de las dimensiones',
  CLASIFICACION.every((c) => [0, 1, 2, 3].includes(capaDe(c))));

const r = reparto();
console.log(`\n  reparto: capa 3 → ${r[3]} · capa 2 → ${r[2]} · capa 1 → ${r[1]} · capa 0 → ${r[0]}\n`);

if (fallos) { console.log(`✗ ${fallos} comprobación(es) mal.\n`); process.exit(1); }
console.log('✓ Todo correcto.\n');
