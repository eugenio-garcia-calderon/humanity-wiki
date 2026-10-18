import {
  Droplets, Wheat, Home, HeartPulse, Users, TreePine, GraduationCap,
  Car, Zap, Cpu, Briefcase, Landmark, Coins, Palette, Sparkles,
} from 'lucide-react';
import { OBJETIVOS, hexDelColor } from '../../../utils/objetivos';

// LOS TEMAS DE UN MENÚ (2026-10-18). Cada uno: nombre, icono (`lucide:Nombre`, una imagen o un emoji),
// color, adónde lleva y, si tiene, sus subtemas. Es lo que se guarda en `datos.temas` del bloque.
export interface SubTema { id: string; nombre: string; enlace?: string }
export interface Tema { id: string; nombre: string; icono?: string; color?: string; enlace?: string; hijos?: SubTema[] }

/** El nombre de cada icono de los objetivos, para guardarlo como `lucide:Nombre`. */
const NOMBRE_ICONO = new Map<unknown, string>([
  [Droplets, 'Droplets'], [Wheat, 'Wheat'], [Home, 'Home'], [HeartPulse, 'HeartPulse'], [Users, 'Users'],
  [TreePine, 'TreePine'], [GraduationCap, 'GraduationCap'], [Car, 'Car'], [Zap, 'Zap'], [Cpu, 'Cpu'],
  [Briefcase, 'Briefcase'], [Landmark, 'Landmark'], [Coins, 'Coins'], [Palette, 'Palette'], [Sparkles, 'Sparkles'],
]);

/** Los temas de la humanidad, con el mismo icono y color que el menú de Explorar.
 *  Llevan a la página de cada objetivo hasta que cada uno tenga la suya. */
export const temasDeLaHumanidad = (): Tema[] => OBJETIVOS.map(o => ({
  id: o.id,
  nombre: o.titulo.charAt(0) + o.titulo.slice(1).toLocaleLowerCase('es'),
  icono: `lucide:${NOMBRE_ICONO.get(o.icono) || 'Circle'}`,
  color: hexDelColor(o.color),
  enlace: `/objetivos/${o.id}`,
}));

export const nuevoIdTema = () => `t${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Lo guardado, limpio: nunca rompe la página aunque alguien edite el JSON a mano. */
export function temasDe(datos: Record<string, unknown>): Tema[] {
  const lista = Array.isArray(datos.temas) ? datos.temas : [];
  return lista.slice(0, 60).filter((t: any) => t && typeof t.nombre === 'string').map((t: any): Tema => ({
    id: String(t.id || nuevoIdTema()),
    nombre: String(t.nombre).slice(0, 80),
    icono: typeof t.icono === 'string' ? t.icono.slice(0, 500) : undefined,
    color: typeof t.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(t.color) ? t.color : undefined,
    enlace: typeof t.enlace === 'string' ? t.enlace.slice(0, 500) : undefined,
    hijos: Array.isArray(t.hijos) ? t.hijos.slice(0, 40).filter((h: any) => h && typeof h.nombre === 'string')
      .map((h: any) => ({ id: String(h.id || nuevoIdTema()), nombre: String(h.nombre).slice(0, 80), enlace: typeof h.enlace === 'string' ? h.enlace.slice(0, 500) : undefined })) : undefined,
  }));
}
