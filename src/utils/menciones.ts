// ============================================================================
// MENCIONES CON @ Y ENLACES CON [[ (2026-10-06, carril editorB, #6)
// ============================================================================
// Una mención es un enlace markdown normal cuya dirección dice qué es (ver
// `server/referencias.ts`). Aquí vive lo que el cliente necesita saber de ese
// formato: cómo se escribe, cómo se reconoce y cómo se detecta que alguien
// está a punto de escribir una. Puro texto, sin React: lo usan el editor, el
// pintor de texto y el selector.

import { todosLosBloques } from './bloques';

export type ClaseMencion = 'persona' | 'pagina' | 'fecha';

/** De qué clase es un enlace, por su dirección; `null` si es uno corriente. */
export function claseDeEnlace(href: string): { clase: ClaseMencion; id: string } | null {
  let m = href.match(/^\/personas\/([A-Za-z0-9_-]+)$/);
  if (m) return { clase: 'persona', id: m[1] };
  m = href.match(/^\/paginas\/([A-Za-z0-9_-]+)$/);
  if (m) return { clase: 'pagina', id: m[1] };
  m = href.match(/^fecha:(\d{4}-\d{2}-\d{2})$/);
  if (m) return { clase: 'fecha', id: m[1] };
  return null;
}

/** El texto de un enlace no puede llevar corchetes: partirían el enlace. */
const limpiar = (t: string) => t.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

export const mdPersona = (id: string, nombre: string) => `[@${limpiar(nombre) || 'persona'}](/personas/${id})`;
export const mdPagina = (id: string, titulo: string) => `[${limpiar(titulo) || 'Sin título'}](/paginas/${id})`;
export const mdFecha = (iso: string) => `[@${fechaLarga(iso)}](fecha:${iso})`;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const aIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** «7 oct 2026». Interpreta el día al mediodía local: sin saltos de huso. */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[(m || 1) - 1]} ${a}`;
}

/** Cómo se enseña una fecha mencionada: «Hoy», «Mañana», «Ayer» o la fecha. */
export function fechaRelativa(iso: string, ahora = new Date()): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(a, (m || 1) - 1, d);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const dif = Math.round((dia.getTime() - hoy.getTime()) / 86400000);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Mañana';
  if (dif === -1) return 'Ayer';
  return fechaLarga(iso);
}

export function sumarDias(dias: number, desde = new Date()): string {
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + dias);
  return aIso(d);
}

/** Una fecha escrita a mano («12/10», «12/10/2026», «15 oct») → ISO, o null. */
export function parsearFecha(q: string, ahora = new Date()): string | null {
  const t = q.trim().toLowerCase();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  let d: number, mes: number, a: number;
  if (m) { d = +m[1]; mes = +m[2]; a = m[3] ? +m[3] : ahora.getFullYear(); if (a < 100) a += 2000; }
  else {
    m = t.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóú]{3,})\.?(?:\s+(?:de\s+)?(\d{4}))?$/);
    if (!m) return null;
    const idx = MESES.findIndex(x => m![2].startsWith(x));
    if (idx < 0) return null;
    d = +m[1]; mes = idx + 1; a = m[3] ? +m[3] : ahora.getFullYear();
  }
  const f = new Date(a, mes - 1, d);
  if (f.getFullYear() !== a || f.getMonth() !== mes - 1 || f.getDate() !== d) return null;
  return aIso(f);
}

/**
 * ¿Está quien escribe a mitad de una mención? Mira el texto ANTES del cursor:
 *   · «@» al principio o tras un espacio, y lo que lleve escrito después,
 *   · o «[[» y lo que lleve.
 * «ana@correo.com» no cuenta (el @ no va tras un espacio) ni tampoco «@ » con
 * un espacio justo después. Devuelve dónde empieza el disparador para poder
 * sustituirlo entero por la mención.
 */
export function detectarMencion(antesDelCursor: string): { tipo: '@' | '[[' ; desde: number; q: string } | null {
  const ab = antesDelCursor.lastIndexOf('[[');
  if (ab >= 0) {
    const q = antesDelCursor.slice(ab + 2);
    if (q.length <= 40 && !/[\]\n]/.test(q)) return { tipo: '[[', desde: ab, q };
  }
  const at = antesDelCursor.lastIndexOf('@');
  if (at >= 0 && (at === 0 || /\s/.test(antesDelCursor[at - 1]))) {
    const q = antesDelCursor.slice(at + 1);
    // Un espacio vale (los nombres llevan), pero no dos seguidos ni al empezar.
    if (q.length <= 30 && !/^\s|\s\s|[\n\[\]()]/.test(q)) return { tipo: '@', desde: at, q };
  }
  return null;
}

/** Lo que una página nombra: personas y páginas, sin repetir. Lo usan el
 *  servidor (para avisar e indexar) y el editor (para saber si cambió). */
const ID = '[A-Za-z0-9_-]+';

export function referenciasDe(bloques: any[], propia: string) {
  const personas = new Set<string>();
  const paginas = new Set<string>();
  const enTexto = (t: unknown) => {
    if (typeof t !== 'string' || !t) return;
    for (const m of t.matchAll(new RegExp(`\\[@[^\\]]+\\]\\(/personas/(${ID})\\)`, 'g'))) personas.add(m[1]);
    for (const m of t.matchAll(new RegExp(`\\]\\(/paginas/(${ID})\\)`, 'g'))) paginas.add(m[1]);
  };
  for (const b of todosLosBloques(bloques)) {
    enTexto(b.texto);
    if (b.tipo === 'subpagina' && typeof b.entityId === 'string') paginas.add(b.entityId);
    // Las celdas de una tabla de texto también escriben.
    if (Array.isArray(b.filas)) for (const f of b.filas) if (Array.isArray(f)) f.forEach(enTexto);
  }
  paginas.delete(propia);
  return { personas: [...personas], paginas: [...paginas] };
}

