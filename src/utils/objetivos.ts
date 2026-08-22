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
  /** Sin tildes y en minúsculas: se comparan contra el texto ya normalizado. */
  palabras: string[];
}

export const OBJETIVOS: Objetivo[] = [
  { id: 'O001', titulo: 'AGUA',         icono: Droplets,       palabras: ['agua', 'hidric', 'riego', 'acuifer', 'potable', 'saneamiento', 'sequia', 'rio', 'embalse'] },
  { id: 'O002', titulo: 'ALIMENTACIÓN', icono: Wheat,          palabras: ['aliment', 'comida', 'nutricion', 'cultivo', 'agricultura', 'huerto', 'cosecha', 'hambre'] },
  { id: 'O003', titulo: 'VIVIENDA',     icono: HomeIcon,       palabras: ['vivienda', 'casa', 'hogar', 'alquiler', 'construccion', 'habitab', 'alojamiento'] },
  { id: 'O004', titulo: 'SALUD',        icono: HeartPulse,     palabras: ['salud', 'medic', 'sanitar', 'hospital', 'enfermedad', 'bienestar', 'farmac'] },
  { id: 'O005', titulo: 'CONVIVENCIA',  icono: Users,          palabras: ['convivencia', 'comunidad', 'vecin', 'paz', 'conflicto', 'seguridad', 'cohesion'] },
  { id: 'O006', titulo: 'ECOSISTEMAS',  icono: TreePine,       palabras: ['ecosistema', 'bosque', 'biodiversidad', 'fauna', 'flora', 'natural', 'conservacion', 'incendio'] },
  { id: 'O007', titulo: 'EDUCACIÓN',    icono: GraduationCap,  palabras: ['educacion', 'escuela', 'aprendizaje', 'formacion', 'curso', 'alumn', 'ensenanza'] },
  { id: 'O008', titulo: 'MOVILIDAD',    icono: Car,            palabras: ['movilidad', 'transporte', 'coche', 'bici', 'camion', 'tren', 'viaje', 'carretera'] },
  { id: 'O009', titulo: 'ENERGÍA',      icono: Zap,            palabras: ['energia', 'solar', 'electric', 'bateria', 'fotovoltaic', 'eolic', 'combustible', 'renovable'] },
  { id: 'O010', titulo: 'TECNOLOGÍA',   icono: Cpu,            palabras: ['tecnolog', 'software', 'digital', 'datos', 'internet', 'robot', 'inteligencia artificial'] },
  { id: 'O011', titulo: 'EMPLEO',       icono: Briefcase,      palabras: ['empleo', 'trabajo', 'salario', 'laboral', 'oficio', 'contrat'] },
  { id: 'O012', titulo: 'GOBERNANZA',   icono: Landmark,       palabras: ['gobernanza', 'gobierno', 'politic', 'ley', 'norma', 'participacion', 'democra', 'institucion'] },
  { id: 'O013', titulo: 'ECONOMÍA',     icono: Coins,          palabras: ['economia', 'dinero', 'inversion', 'financ', 'coste', 'precio', 'mercado', 'presupuesto'] },
  { id: 'O014', titulo: 'CULTURA',      icono: Palette,        palabras: ['cultura', 'arte', 'musica', 'patrimonio', 'literatura', 'cine', 'tradicion'] },
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
