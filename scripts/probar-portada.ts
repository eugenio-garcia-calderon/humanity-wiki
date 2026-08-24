/*
 * COMPROBACIONES DE «TU PORTADA» (2026-08-22, Programador 3)
 *
 * Se ejecuta con:
 *   node_modules/.bin/tsx scripts/probar-portada.ts
 *
 * POR QUÉ ESTO Y NO PROBARLO A MANO. La portada se guarda como `jsonb` en la
 * cuenta de cada persona. Ese texto puede venir de una versión anterior de la
 * aplicación, de un despliegue a medias o de una edición manual, y **una
 * portada rota deja a alguien con la pantalla en blanco en su casa, sin forma
 * de arreglarlo**. Esa es la parte que hay que comprobar caso a caso, no
 * mirándola una vez con datos buenos.
 *
 * Sigue la pauta de `scripts/probar-acciones-ia.mjs`: un script que se lanza a
 * mano y devuelve código 1 si algo falla.
 */

import { leerPortada, plantillaDe, PLANTILLAS, PORTADA_POR_DEFECTO } from '../src/components/portada/portadaBloques';
let fallos = 0;
const comprobar = (nombre: string, real: unknown, esperado: unknown) => {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${ok ? '' : `\n      esperado ${JSON.stringify(esperado)}\n      real     ${JSON.stringify(real)}`}`);
};

// Lo que de verdad puede pasar en la base de datos de alguien
comprobar('sin nada guardado', leerPortada(undefined), PORTADA_POR_DEFECTO);
comprobar('null', leerPortada(null), PORTADA_POR_DEFECTO);
comprobar('basura', leerPortada('vete a saber'), PORTADA_POR_DEFECTO);
comprobar('objeto sin bloques', leerPortada({ plantilla: 'lectura' }), PORTADA_POR_DEFECTO);
comprobar('bloque inventado se ignora',
  leerPortada({ plantilla: 'propia', bloques: ['carpetas', 'inventado', 'contenido'] }).bloques,
  ['carpetas', 'contenido']);
comprobar('duplicados fuera',
  leerPortada({ plantilla: 'propia', bloques: ['carpetas', 'carpetas', 'contenido'] }).bloques,
  ['carpetas', 'contenido']);
comprobar('SIN CONTENIDO se le añade (portada en blanco imposible)',
  leerPortada({ plantilla: 'propia', bloques: ['carpetas'] }).bloques,
  ['carpetas', 'contenido']);
comprobar('lista vacía acaba con contenido',
  leerPortada({ plantilla: 'propia', bloques: [] }).bloques,
  ['contenido']);
comprobar('todo inválido acaba con contenido',
  leerPortada({ plantilla: 'x', bloques: ['a', 'b'] }).bloques,
  ['contenido']);

// Cada plantilla se reconoce a sí misma
for (const p of PLANTILLAS) comprobar(`plantilla «${p.titulo}» se reconoce`, plantillaDe(p.bloques), p.id);
comprobar('un orden propio se llama propia', plantillaDe(['contenido', 'carpetas']), 'propia');

// LOS BLOQUES RETIRADOS (2026-08-24): personas, objetivos, buscador y, más
// tarde el mismo día, «lo tuyo» —la tira de proyectos— se quitaron del
// registro, así que una portada guardada con ellos tiene que ignorarlos en vez
// de romperse. Es el caso que de verdad va a ocurrir: hay gente con esa portada
// guardada de ayer.
// (`leerPortada` recibe `unknown` a propósito, así que aquí se pueden escribir
//  los identificadores viejos: es exactamente lo que va a llegar de la base.)
comprobar('una portada guardada con bloques retirados los ignora',
  leerPortada({ plantilla: 'completa', bloques: ['personas', 'carpetas', 'objetivos', 'buscador', 'contenido'] }).bloques,
  ['carpetas', 'contenido']);
comprobar('y si solo tenía bloques retirados, queda el contenido',
  leerPortada({ plantilla: 'completa', bloques: ['personas', 'tuyo', 'objetivos', 'buscador'] }).bloques,
  ['contenido']);

// Y que ninguna plantilla se quede sin contenido
for (const p of PLANTILLAS) comprobar(`«${p.titulo}» incluye el contenido`, p.bloques.includes('contenido'), true);

console.log(fallos === 0 ? '\nTODO CORRECTO' : `\n${fallos} FALLOS`);
process.exit(fallos ? 1 : 0);
