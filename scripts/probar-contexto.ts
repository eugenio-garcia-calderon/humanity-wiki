/*
 * LAS REGLAS DE «DÓNDE ESTOY», PROBADAS (2026-08-25)
 *   npx tsx scripts/probar-contexto.ts
 *
 * Esto decide en qué proyecto se crea una tarea. Equivocarse aquí no da ningún
 * error: mete el trabajo de alguien en el proyecto de al lado y no se entera
 * nadie hasta que lo busca donde lo dejó. Por eso tiene prueba y por eso la
 * lógica vive en una función pura y no dentro de un componente.
 */
import { contextoDe, conContexto, SIN_CONTEXTO } from '../src/utils/contextoNavegacion';

let fallos = 0;
const comprobar = (titulo: string, real: unknown, esperado: unknown) => {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) { console.log(`OK   ${titulo}`); return; }
  fallos++;
  console.log(`FALLA ${titulo}\n      esperado ${b}\n      real     ${a}`);
};

const ctx = (camino: string, cola = '') => contextoDe(camino, new URLSearchParams(cola));

// ── El proyecto ────────────────────────────────────────────────────────────
comprobar('la ficha de un proyecto da contexto de proyecto',
  ctx('/proyectos/aldea-regenerativa').proyecto, { slug: 'aldea-regenerativa' });
comprobar('la LISTA de proyectos no da contexto',
  ctx('/proyectos').proyecto, null);
comprobar('un proyecto por parámetro también cuenta',
  ctx('/paginas', 'proyecto=aldea-regenerativa').proyecto, { slug: 'aldea-regenerativa' });
comprobar('el slug se descodifica',
  ctx('/proyectos/cami%C3%B3n-camperizado').proyecto, { slug: 'camión-camperizado' });

// ── El tema ────────────────────────────────────────────────────────────────
// Los catorce se identifican por `O001`…`O014`, no por su nombre. Se comprueba
// con el identificador de verdad y no con uno inventado que «suena bien»: si
// mañana cambian de esquema, esta prueba lo dice.
comprobar('el filtro del muro da contexto de tema',
  ctx('/explorar', 'objetivo=O008').tema, { id: 'O008', titulo: 'MOVILIDAD' });
comprobar('la ficha de un objetivo también',
  ctx('/objetivos/O009').tema?.id, 'O009');
comprobar('un tema que no existe no es contexto',
  ctx('/explorar', 'objetivo=inventado').tema, null);

// ── Cuando hay los dos, manda el proyecto ──────────────────────────────────
// Se puede estar dentro de un proyecto filtrando por tema. Crear ahí tiene que
// meterlo en el proyecto: es lo concreto.
comprobar('con proyecto y tema, manda el proyecto',
  ctx('/proyectos/aldea', 'objetivo=movilidad'),
  { proyecto: { slug: 'aldea' }, tema: null });

// ── Sin contexto ───────────────────────────────────────────────────────────
comprobar('una página cualquiera no tiene contexto', ctx('/tablas'), SIN_CONTEXTO);
comprobar('la portada tampoco', ctx('/'), SIN_CONTEXTO);

// ── Pegar el contexto a una dirección ──────────────────────────────────────
comprobar('sin contexto, la dirección no se toca',
  conContexto('/paginas', SIN_CONTEXTO), '/paginas');
comprobar('con proyecto, se le añade',
  conContexto('/paginas', ctx('/proyectos/aldea')), '/paginas?proyecto=aldea');
comprobar('con tema, se le añade',
  conContexto('/paginas', ctx('/explorar', 'objetivo=O008')), '/paginas?objetivo=O008');
comprobar('respeta lo que la dirección ya llevaba',
  conContexto('/paginas?nueva=1', ctx('/proyectos/aldea')), '/paginas?nueva=1&proyecto=aldea');

console.log(fallos === 0 ? '\nTODO CORRECTO' : `\n${fallos} FALLOS`);
process.exit(fallos ? 1 : 0);
