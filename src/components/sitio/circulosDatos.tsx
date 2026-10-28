import { raizDe } from './CabeceraSitio';

// ============================================================================
// LOS SISTEMAS REPARTIDOS EN CÍRCULOS (los datos de la vista «Círculo»)
// ============================================================================
// Los sistemas son los de la base de datos del sitio (`sitio.sistemas`) y cada uno
// dice dónde va con una columna de selección: «Pata» (Humanología, Sociología,
// Tecnología, Ecología; la que usa la vista) o «Círculo» (el reparto en cinco
// círculos de las primeras vistas, de 2026-10-27; la columna sigue en la base de
// datos). El orden de las opciones es el de las capas, de dentro afuera.
// Las vistas Círculos 1.0 a 4.0 se retiraron el 2026-10-28 (Eugenio: «elimina los
// círculos 1, 2, 3 y 4; deja solo el 5 y llámalo Círculo»).

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ICONOS: Record<string, string> = { personas: '🧍', hogar: '🏠', sociedad: '🏛', tecnologia: '⚙️', planeta: '🌍', ecologia: '🌍' };
// Un tono claro por anillo, del cálido del centro al verde del planeta.
const TONOS = ['#fff4cc', '#fde7d3', '#ede7fb', '#e0ecfc', '#dff3e7', '#f1f5f9', '#fce7f3'];

export type Sistema = { id: string; titulo: string; imagen: string | null; descripcion: string; nota: number | null };
export type Circulo = { clave: string; nombre: string; icono: string; tono: string; sistemas: Sistema[]; nota: number | null };

const media = (s: Sistema[]) => {
  const v = s.map(x => x.nota).filter((n): n is number => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
/** La base de datos de Sistemas del sitio (`sitio.sistemas`), leída una vez por visita. */
const sistemasDe = new Map<string, Promise<any>>();
export function leerSistemas(raizId: string): Promise<any> {
  let p = sistemasDe.get(raizId);
  if (!p) {
    p = raizDe(raizId).then(r => {
      const tabla = r?.config?.sitio?.sistemas;
      return tabla ? fetch(`/api/bd/tablas/${encodeURIComponent(tabla)}?lectura=1`, { credentials: 'include' }).then(x => (x.ok ? x.json() : null)).catch(() => null) : null;
    });
    sistemasDe.set(raizId, p);
  }
  return p;
}

/** La relación de cada sistema con su territorio (la columna «Territorio»), si la hay. */
export function columnaTerritorio(j: any): { id: string; tabla: string | null } | null {
  const c = (j?.columnas || []).find((x: any) => x.tipo === 'relacion' && /^territorio/i.test(String(x.nombre).trim()));
  return c ? { id: c.id, tabla: c.config?.tabla_destino || null } : null;
}

/** Los círculos con sus sistemas. Con `territorio`, solo las notas de ese territorio (2026-10-28, Círculo 3.0 y 4.0:
 *  el territorio se elige en el título); si no tiene ninguna, los mismos sistemas sin nota. */
export function armarCirculos(j: any, territorio?: string | null, columna: RegExp = /^c[ií]rculos?$/i): Circulo[] {
  const cols: any[] = j?.columnas || [];
  // La columna de selección que reparte los sistemas: «Círculo» (5 círculos) o, en Círculo 5.0, «Pata» (4 patas).
  const colCirculo = cols.find(c => c.tipo === 'seleccion' && columna.test(String(c.nombre).trim()));
  const colNota = cols.find(c => c.tipo === 'nota');
  const colT = columnaTerritorio(j);
  if (!colCirculo) return [];
  const lista: Circulo[] = (colCirculo.opciones || []).map((o: any, i: number) => {
    const clave = plano(String(o.label || ''));
    return { clave, nombre: String(o.label || ''), icono: ICONOS[clave] || '◯', tono: TONOS[i % TONOS.length], sistemas: [], nota: null, _id: o.id } as Circulo & { _id: string };
  });
  const filas = (j?.filas || []).filter((f: any) => !f.oculta && f.pagina_id && f.celdas?.[colCirculo.id]?.valor);
  const deT = (f: any) => { const v = colT ? f.celdas?.[colT.id]?.valor : null; return Array.isArray(v) ? v.includes(territorio) : v === territorio; };
  const suyas = territorio && colT ? filas.filter(deT) : filas;
  const sinNota = !!territorio && !!colT && suyas.length === 0;
  for (const f of sinNota ? filas : suyas) {
    const c = lista.find(x => (x as any)._id === f.celdas[colCirculo.id].valor);
    if (!c || c.sistemas.some(s => s.titulo === f.pagina?.titulo)) continue;
    const n = colNota && !sinNota ? f.celdas?.[colNota.id]?.valor : null;
    c.sistemas.push({ id: f.pagina_id, titulo: f.pagina?.titulo || 'Sin título', imagen: f.pagina?.imagen || null, descripcion: f.pagina?.descripcion || '', nota: typeof n === 'number' ? n : null });
  }
  for (const c of lista) c.nota = media(c.sistemas);
  return lista.filter(c => c.sistemas.length);
}
