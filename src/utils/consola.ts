// LA CONSOLA: sus tipos y su limpieza (2026-10-08). Sin React ni navegador: la leen la pantalla y el servidor.

export type EstadoManual = 'auto' | 'rojo' | 'amarillo' | 'verde';
export type EstadoEslabon = 'rojo' | 'amarillo' | 'verde' | 'sin_datos';

export type Eslabon = {
  id: string;
  nombre: string;
  /** Un emoji. */
  icono: string;
  descripcion: string;
  /** `auto`: sale del avance de sus objetivos y tareas; los otros lo fija una persona. */
  estado: EstadoManual;
  objetivos: { id: string; texto: string; hecho: boolean }[];
  tareas: { id: string; texto: string; hecho: boolean; responsable: string }[];
  personas: { id: string; nombre: string; rol: string }[];
  protocolos: { id: string; titulo: string; url: string }[];
  /** El «por qué» del color: qué te atasca o qué toca mejorar. */
  notas: string;
};
export type Consola = { eslabones: Eslabon[] };

const e = (id: string, nombre: string, icono: string, descripcion: string): Eslabon =>
  ({ id, nombre, icono, descripcion, estado: 'auto', objetivos: [], tareas: [], personas: [], protocolos: [], notas: '' });

/** La cadena de valor de Eugenio, en el orden del círculo: el 5 enlaza otra vez con el 1. */
export const CONSOLA_POR_DEFECTO: Consola = {
  eslabones: [
    e('e1', 'Innovación y comunicación del producto', '💡', 'Comunicar la innovación y los productos: es donde el círculo se cierra y vuelve a empezar.'),
    e('e2', 'Desarrollo y fabricación', '🛠️', 'Desarrollo de producto, fabricación, creación o construcción.'),
    e('e3', 'Logística y distribución', '🚚', 'Almacén, transporte y entrega.'),
    e('e4', 'Venta, instalación o servicio', '🤝', 'Vender, instalar o prestar el servicio.'),
    e('e5', 'Visibilidad y posicionamiento', '📣', 'Visibilidad, posicionamiento y comunicación.'),
  ],
};

const texto = (v: any, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const largo = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
const idDe = (v: any, i: number, p: string) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(v ?? '')) ? String(v) : `${p}${Date.now().toString(36)}${i}`);
const url = (v: any) => { const t = texto(v, 500); return /^(https?:\/\/|\/)/i.test(t) ? t : ''; };

/** Lo que llegue, convertido en una consola válida: tipos, tamaños y estados acotados. Sin cadena, la de por defecto. */
export function limpiarConsola(c: any): Consola {
  const lista = Array.isArray(c?.eslabones) ? c.eslabones : null;
  if (!lista || !lista.length) return JSON.parse(JSON.stringify(CONSOLA_POR_DEFECTO));
  return {
    eslabones: lista.slice(0, 12).map((x: any, i: number): Eslabon => ({
      id: idDe(x?.id, i, 'e'),
      nombre: texto(x?.nombre, 80) || `Eslabón ${i + 1}`,
      icono: texto(x?.icono, 8),
      descripcion: largo(x?.descripcion, 400),
      estado: ['auto', 'rojo', 'amarillo', 'verde'].includes(x?.estado) ? x.estado : 'auto',
      objetivos: (Array.isArray(x?.objetivos) ? x.objetivos : []).slice(0, 40).map((o: any, j: number) => ({ id: idDe(o?.id, j, 'o'), texto: texto(o?.texto, 200), hecho: !!o?.hecho })).filter((o: any) => o.texto),
      tareas: (Array.isArray(x?.tareas) ? x.tareas : []).slice(0, 60).map((o: any, j: number) => ({ id: idDe(o?.id, j, 't'), texto: texto(o?.texto, 200), hecho: !!o?.hecho, responsable: texto(o?.responsable, 60) })).filter((o: any) => o.texto),
      personas: (Array.isArray(x?.personas) ? x.personas : []).slice(0, 30).map((o: any, j: number) => ({ id: idDe(o?.id, j, 'p'), nombre: texto(o?.nombre, 80), rol: texto(o?.rol, 80) })).filter((o: any) => o.nombre),
      protocolos: (Array.isArray(x?.protocolos) ? x.protocolos : []).slice(0, 30).map((o: any, j: number) => ({ id: idDe(o?.id, j, 'r'), titulo: texto(o?.titulo, 120), url: url(o?.url) })).filter((o: any) => o.titulo),
      notas: largo(x?.notas, 2000),
    })),
  };
}

/** El color de un eslabón: el que fijó una persona, o el que sale de su avance. Sin nada que medir, «sin datos» (gris): ni verde ni rojo inventados. */
export function estadoDe(x: Eslabon): EstadoEslabon {
  if (x.estado !== 'auto') return x.estado;
  const items = [...x.objetivos, ...x.tareas];
  if (!items.length) return 'sin_datos';
  const avance = items.filter(i => i.hecho).length / items.length;
  return avance < 0.34 ? 'rojo' : avance < 0.67 ? 'amarillo' : 'verde';
}
