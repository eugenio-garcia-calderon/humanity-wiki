// Las llamadas del chat de ayuda y de las consultas con expertos. Un error
// del servidor llega como `Error` con el mensaje en castellano que escribió
// la ruta, que es el que se enseña tal cual.

export async function pedir<T = any>(url: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const r = await fetch(url, {
    method: opciones.metodo || 'GET',
    credentials: 'same-origin',
    headers: opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `No se ha podido completar (${r.status}).`);
  return j as T;
}

export type Mensaje = { id: string; de: 'cliente' | 'equipo' | 'sistema'; texto: string; fecha: string; autor: string | null };

export type Conversacion = {
  id: string; estado: 'abierta' | 'cerrada'; papel: 'equipo' | 'cliente';
  experto: { id: string; nombre: string } | null;
  consulta: { id: string; inicio: string; fin: string; estado: string } | null;
  cliente: { nombre: string | null; email: string | null; conCuenta: boolean } | null;
  mensajes: Mensaje[];
};

export type EstadoSitio = {
  raiz: string; sitio: string; equipo: boolean; pendientesEquipo: number; enLinea: boolean;
  yo: { conCuenta: boolean; nombre: string | null; email: string | null } | null;
  conversaciones: { id: string; estado: string; experto: { id: string; nombre: string } | null; sinLeer: number; ultimo: string }[];
};

/** «hace 3 min», «ayer», o la fecha. */
export function hace(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ayer';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export const euros = (c: number, moneda = 'EUR') =>
  (c / 100).toLocaleString('es-ES', { style: 'currency', currency: moneda });

/** Un parámetro de la dirección de la página, sin depender del enrutador:
 *  el bloque se pinta igual en el editor y en el sitio publicado. */
export const parametro = (nombre: string) =>
  typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(nombre);

/** Cómo se dice el estado de una consulta a una persona. «Pagada» suena raro
 *  en una consulta gratuita: lo que importa es que está confirmada. */
export const ESTADO_CONSULTA: Record<string, string> = {
  reservando: 'pendiente de pago', pagada: 'confirmada', hecha: 'hecha', cancelada: 'cancelada', caducada: 'sin pagar',
};
