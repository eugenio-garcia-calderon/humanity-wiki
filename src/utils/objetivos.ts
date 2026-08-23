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
  Car, Zap, Cpu, Briefcase, Landmark, Coins, Palette,
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
