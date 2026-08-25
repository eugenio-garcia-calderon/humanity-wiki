// ============================================================================
// LOS 14 OBJETIVOS, EN UN SOLO SITIO (2026-08-21)
// ============================================================================
// Su icono estaba escrito a mano dentro de `Objectives.tsx`. Al necesitarlo
// también en Publicaciones había dos caminos: copiarlo —y tener dos listas que
// se separan el día que alguien cambie un icono— o sacarlo aquí. Se saca.
//
// LAS PALABRAS SON PARA BUSCAR, NO PARA CLASIFICAR. Una publicación no tiene
// hoy ningún vínculo con un objetivo: no existe la tabla que los una. Así que
// filtrar por objetivo es, honestamente, BUSCAR sus palabras en el título y el
// cuerpo. Se dice así en la pantalla y no se llama «categoría», porque llamarlo
// categoría sería afirmar una clasificación que nadie ha hecho.
//
// El día que exista ese vínculo de verdad, estas palabras se quedan como
// respaldo para lo que aún no esté clasificado.
import {
  Droplets, Wheat, Home as HomeIcon, HeartPulse, Users, TreePine, GraduationCap,
  Car, Zap, Cpu, Briefcase, Landmark, Coins, Palette, Sparkles,
} from 'lucide-react';

export interface Objetivo {
  id: string;
  titulo: string;
  icono: any;
  /**
   * SU COLOR, EL MISMO QUE EN EL MAPA (2026-08-24).
   *
   * Eugenio: «utiliza los iconos y colores que utilizamos para el mapa de
   * España, rescátalos de ahí». Estaban escritos a mano dentro de `Map.tsx`,
   * en una lista paralela a ésta: dos listas de los catorce, una con los
   * iconos y otra con los colores, y ninguna sabía de la otra.
   *
   * Ahora el color vive donde ya vivía el nombre y el icono. Que el agua sea
   * azul en el mapa y azul en el menú no es una coincidencia que haya que
   * mantener a mano: es el mismo dato leído dos veces.
   */
  color: string;
  /** Sin tildes y en minúsculas: se comparan contra el texto ya normalizado. */
  palabras: string[];
}

/**
 * EL MISMO COLOR, EN HEXADECIMAL (2026-08-25)
 *
 * Los catorce colores viven arriba como clases de Tailwind (`text-blue-500`),
 * que es lo correcto para pintar texto e iconos. Pero un dibujo en SVG —la
 * rueda de temas de la página de preferencias— necesita el color de verdad:
 * una clase de CSS no vale como relleno de un sector.
 *
 * ── POR QUÉ LA TABLA ESTÁ AQUÍ Y NO EN LA PÁGINA QUE LA USA ────────────────
 * Por lo mismo que el color se mudó junto al nombre y al icono, y está contado
 * ahí arriba: cuando el agua deja de ser azul, tiene que dejar de serlo en un
 * sitio. Si esta tabla viviera en la rueda, mañana habría dos verdades sobre
 * de qué color es AGUA y sólo se notaría al mirarlas juntas.
 */
const HEX: Record<string, string> = {
  'text-blue-500': '#3b82f6',
  'text-amber-500': '#f59e0b',
  'text-indigo-500': '#6366f1',
  'text-rose-500': '#f43f5e',
  'text-purple-500': '#a855f7',
  'text-emerald-500': '#10b981',
  'text-sky-500': '#0ea5e9',
  'text-orange-500': '#f97316',
  'text-yellow-500': '#eab308',
  'text-cyan-500': '#06b6d4',
  'text-lime-500': '#84cc16',
  'text-violet-500': '#8b5cf6',
  'text-pink-500': '#ec4899',
  'text-fuchsia-500': '#d946ef',
  'text-teal-500': '#14b8a6',
};

/** El color de un objetivo, listo para un `fill` de SVG. El gris es para lo que
 *  no tiene color propio: un subtema hereda el de su objetivo, así que aquí no
 *  debería caer nada — y si cae, se ve gris en vez de desaparecer. */
export const hexDelColor = (clase?: string): string => (clase && HEX[clase]) || '#94a3b8';

export const OBJETIVOS: Objetivo[] = [
  { id: 'O001', titulo: 'AGUA',         icono: Droplets, color: 'text-blue-500',       palabras: ['agua', 'hidric', 'riego', 'acuifer', 'potable', 'saneamiento', 'sequia', 'rio', 'embalse'] },
  { id: 'O002', titulo: 'ALIMENTACIÓN', icono: Wheat, color: 'text-amber-500',          palabras: ['aliment', 'comida', 'nutricion', 'cultivo', 'agricultura', 'huerto', 'cosecha', 'hambre'] },
  { id: 'O003', titulo: 'VIVIENDA',     icono: HomeIcon, color: 'text-indigo-500',       palabras: ['vivienda', 'casa', 'hogar', 'alquiler', 'construccion', 'habitab', 'alojamiento'] },
  { id: 'O004', titulo: 'SALUD',        icono: HeartPulse, color: 'text-rose-500',     palabras: ['salud', 'medic', 'sanitar', 'hospital', 'enfermedad', 'bienestar', 'farmac'] },
  { id: 'O005', titulo: 'CONVIVENCIA',  icono: Users, color: 'text-purple-500',          palabras: ['convivencia', 'comunidad', 'vecin', 'paz', 'conflicto', 'seguridad', 'cohesion'] },
  { id: 'O006', titulo: 'ECOSISTEMAS',  icono: TreePine, color: 'text-emerald-500',       palabras: ['ecosistema', 'bosque', 'biodiversidad', 'fauna', 'flora', 'natural', 'conservacion', 'incendio'] },
  { id: 'O007', titulo: 'EDUCACIÓN',    icono: GraduationCap, color: 'text-sky-500',  palabras: ['educacion', 'escuela', 'aprendizaje', 'formacion', 'curso', 'alumn', 'ensenanza'] },
  { id: 'O008', titulo: 'MOVILIDAD',    icono: Car, color: 'text-orange-500',            palabras: ['movilidad', 'transporte', 'coche', 'bici', 'camion', 'tren', 'viaje', 'carretera'] },
  { id: 'O009', titulo: 'ENERGÍA',      icono: Zap, color: 'text-yellow-500',            palabras: ['energia', 'solar', 'electric', 'bateria', 'fotovoltaic', 'eolic', 'combustible', 'renovable'] },
  { id: 'O010', titulo: 'TECNOLOGÍA',   icono: Cpu, color: 'text-cyan-500',            palabras: ['tecnolog', 'software', 'digital', 'datos', 'internet', 'robot', 'inteligencia artificial'] },
  { id: 'O011', titulo: 'EMPLEO',       icono: Briefcase, color: 'text-lime-500',      palabras: ['empleo', 'trabajo', 'salario', 'laboral', 'oficio', 'contrat'] },
  { id: 'O012', titulo: 'GOBERNANZA',   icono: Landmark, color: 'text-fuchsia-500',       palabras: ['gobernanza', 'gobierno', 'politic', 'ley', 'norma', 'participacion', 'democra', 'institucion'] },
  { id: 'O013', titulo: 'ECONOMÍA',     icono: Coins, color: 'text-violet-500',          palabras: ['economia', 'dinero', 'inversion', 'financ', 'coste', 'precio', 'mercado', 'presupuesto'] },
  { id: 'O014', titulo: 'CULTURA',      icono: Palette, color: 'text-pink-500',        palabras: ['cultura', 'arte', 'musica', 'patrimonio', 'literatura', 'cine', 'tradicion'] },
  /*
   * EL QUINCE (2026-08-25). Eugenio: «de paso añade espiritualidad como tema
   * principal dentro de los 14 objetivos, es el número 15».
   *
   * Se le da un color que no tenía nadie —`teal`— y no uno repetido: en la
   * rueda de temas cada objetivo se distingue por su color antes que por su
   * nombre, y dos iguales harían que dos ramas se leyeran como una.
   *
   * Las `palabras` son las que hacen que una publicación caiga sola en este
   * tema. Se eligen anchas a propósito: aquí caben tradiciones religiosas,
   * prácticas contemplativas y la pregunta por el sentido, que es de lo que
   * habla la gente cuando habla de esto, y no de una sola de las tres.
   */
  { id: 'O015', titulo: 'ESPIRITUALIDAD', icono: Sparkles, color: 'text-teal-500',
    palabras: ['espiritual', 'meditacion', 'contemplat', 'religion', 'religios', 'fe ', 'sentido de la vida',
               'conciencia', 'mindfulness', 'sagrado', 'ritual', 'oracion', 'yoga', 'duelo', 'proposito'] },
];

/** Sin tildes y en minúsculas. Mismo criterio que en `iconoDeNombre`: dos
 *  formas de escribir la misma palabra son la misma palabra. */
export const sinTildes = (t: string) =>
  (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * ¿Este texto habla de ese objetivo?
 *
 * Se busca el trozo dentro del texto y no palabra a palabra, al revés que en
 * los iconos de proyecto: aquí las claves son raíces a propósito («hidric»
 * para hidráulico e hídrico, «medic» para médico y medicamento), y lo que se
 * busca es tema, no nombre. El precio es alguna coincidencia de más; el precio
 * de lo contrario sería no encontrar lo que sí habla del tema.
 */
export const hablaDe = (texto: string, o: Objetivo) => {
  const t = sinTildes(texto);
  return o.palabras.some(p => t.includes(p));
};

/**
 * ══ QUÉ ÁREAS ENCAJAN CON LO QUE SE ESTÁ ESCRIBIENDO ═══════════════════════
 * (2026-08-24, Eugenio: «cuando se escriban letras y palabras en el buscador
 * se recomienda también temáticas, y con un icono poder separarlo, que es una
 * temática de una publicación».)
 *
 * Un área no es una ficha: es la puerta a **todo lo publicado** sobre un tema.
 * Por eso vale la pena recomendarla antes que cualquier resultado suelto —
 * escribiendo «eco», lo más útil que hay en la plataforma es ECOSISTEMAS, y
 * hasta hoy era justo lo que no salía.
 *
 * VIVE AQUÍ Y NO EN CADA BUSCADOR. Hay dos cajas que la necesitan (la barra de
 * arriba y el chat) y va a haber más. Dos copias de esta función empiezan
 * iguales y divergen en la primera corrección, y entonces escribir «bosque»
 * encuentra ECOSISTEMAS en un sitio y no en el otro sin que nadie sepa por qué.
 *
 * ── EL LISTÓN SUBE CUANTO MENOS HAS ESCRITO ────────────────────────────────
 * Por el NOMBRE bastan dos letras. Por una PALABRA suelta hacen falta tres,
 * porque «co» encaja a la vez con «coche», «coste», «comunidad» y
 * «conservación»: cuatro áreas que salen siempre no son una predicción, son
 * ruido. Y nunca más de tres, por lo mismo.
 *
 * Se compara sin tildes por los dos lados: quien busca escribe deprisa y
 * «energia» tiene que encontrar ENERGÍA.
 */
export const areasQueEncajan = (texto: string, cuantas = 3): Objetivo[] => {
  const t = sinTildes(String(texto || '').trim());
  if (t.length < 2) return [];
  const punto = (o: Objetivo) => {
    const titulo = sinTildes(o.titulo);
    if (titulo === t) return 0;
    if (titulo.startsWith(t)) return 1;
    if (titulo.includes(t)) return 2;
    if (t.length >= 3 && o.palabras.some(p => p.startsWith(t) || t.startsWith(p))) return 3;
    return 99;
  };
  return OBJETIVOS
    .map(o => ({ o, p: punto(o) }))
    .filter(x => x.p < 99)
    .sort((a, b) => a.p - b.p || a.o.titulo.length - b.o.titulo.length)
    .slice(0, cuantas)
    .map(x => x.o);
};

/** El área por su id, para pintar su icono y su color donde haga falta. */
export const AREA_POR_ID: Record<string, Objetivo> =
  Object.fromEntries(OBJETIVOS.map(o => [o.id, o]));
