// ============================================================================
// TABLAS · FASE 9 — ORDENAR, FILTRAR Y AGRUPAR
// ============================================================================
// SE FILTRA Y SE ORDENA DESPUÉS DE CALCULAR, EN MEMORIA, Y NO EN SQL.
//
// No es pereza: es que la mitad de las columnas no existen en la base de datos.
// Un agregado y una fórmula se calculan al leer, así que «ordéname por dinero
// comprometido» o «enséñame solo los que superan el umbral» son imposibles en
// SQL — esa columna no está en ninguna tabla. Filtrar en SQL solo funcionaría
// para las columnas guardadas, y tener dos filtros distintos según de qué
// columna se trate sería peor que este coste.
//
// LO QUE CUESTA, con número: la tabla entera se carga y se calcula antes de
// filtrar. Con 5.000 filas eso son unos pocos megas y unas décimas; con 100.000
// no vale. Cuando llegue ese día, el arreglo es paginar por las columnas
// guardadas y calcular solo la página — no cambiar esto de sitio.
import { type Celda } from './celdas';

export type Filtro = { columna_id: string; operador: string; valor?: any };
/** Un grupo de reglas unidas por Y o por O (2026-10-05, como Notion). Puede
 *  llevar dentro otros grupos: «estado es Hecho Y (dueño es Ana O dueño es
 *  Luis)». La forma vieja —una lista suelta— sigue valiendo y se lee como un
 *  grupo con Y, que es lo que siempre significó. */
export type GrupoFiltros = { y_o: 'y' | 'o'; reglas: Array<Filtro | GrupoFiltros> };
export type Filtros = Filtro[] | GrupoFiltros;
export type Orden = { columna_id: string; direccion?: 'asc' | 'desc' };

export const OPERADORES = [
  'es', 'no_es', 'contiene', 'no_contiene',
  'mayor', 'mayor_igual', 'menor', 'menor_igual',
  'esta_vacia', 'no_esta_vacia',
  'es_verdadero', 'es_falso',
  'antes_de', 'despues_de',
] as const;

/** Lo que vale `@hoy` en un filtro de fecha. Se resuelve al LEER, no al
 *  guardar: «vence antes de hoy» guardado el lunes tiene que seguir diciendo
 *  «hoy» el martes. Fecha local del servidor en AAAA-MM-DD. */
function resolverValor(v: any): any {
  if (typeof v !== 'string' || !v.startsWith('@')) return v;
  const dias = v === '@hoy' ? 0 : v === '@manana' ? 1 : v === '@ayer' ? -1
    : /^@([+-]\d{1,4})d$/.test(v) ? Number(v.slice(1, -1)) : null;
  if (dias === null) return v;
  const d = new Date(Date.now() + dias * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const esGrupo = (x: any): x is GrupoFiltros => !!x && typeof x === 'object' && Array.isArray(x.reglas);

/** Todas las reglas de un filtro, aplanadas, para validarlas al guardar. */
export function reglasDe(f: Filtros | null | undefined): Filtro[] {
  if (!f) return [];
  const lista = Array.isArray(f) ? f : esGrupo(f) ? f.reglas : [];
  return lista.flatMap(r => esGrupo(r) ? reglasDe(r) : [r as Filtro]);
}

/** ¿Tiene forma de filtro? Profundidad máxima 3 y 60 reglas: un filtro más
 *  grande no lo escribe una persona, y sin tope un cuerpo malicioso haría
 *  recursión hasta tumbar el proceso. */
export function filtroValido(f: any, nivel = 0): boolean {
  if (f === null || f === undefined) return true;
  if (nivel > 3) return false;
  if (Array.isArray(f)) return f.length <= 60 && f.every(r => esGrupo(r) ? filtroValido(r, nivel + 1) : !!r && typeof r === 'object');
  if (!esGrupo(f) || (f.y_o !== 'y' && f.y_o !== 'o') || f.reglas.length > 60) return false;
  return f.reglas.every(r => esGrupo(r) ? filtroValido(r, nivel + 1) : !!r && typeof r === 'object');
}

/** El valor comparable de una celda. `undefined` = no hay nada que comparar. */
function comparable(c: Celda | undefined): any {
  if (!c || c.estado !== 'ok') return undefined;
  return Array.isArray(c.valor) ? c.valor.join(',') : c.valor;
}

/**
 * ¿Pasa esta fila el filtro?
 *
 * UNA CELDA CON ERROR NUNCA PASA UN FILTRO, salvo `esta_vacia`, que responde
 * que no. Es deliberado: si un error colara en «los que superan el umbral»,
 * estaría afirmando algo que precisamente no se ha podido comprobar.
 */
export function pasa(celdas: Record<string, Celda>, f: Filtro): boolean {
  const c = celdas[f.columna_id];
  const v = comparable(c);
  const objetivo = resolverValor(f.valor);

  // LAS LISTAS SE MIRAN POR PERTENENCIA (selección múltiple, personas,
  // relaciones). «Etiquetas contiene Urgente» es «Urgente está entre ellas»,
  // no «el texto de todas juntas contiene esas letras».
  if (c && c.estado === 'ok' && Array.isArray(c.valor) && objetivo !== undefined && objetivo !== null && objetivo !== '') {
    // Una columna «Tema» lleva también sus temas de arriba (`heredados`, ver
    // `bd/temas.ts`): «Tema contiene Energía» encuentra lo de «Fotovoltaica».
    const lista = [...c.valor, ...(((c as any).heredados as string[] | undefined) || [])].map(x => String(x).toLowerCase());
    const buscado = String(objetivo).toLowerCase();
    if (f.operador === 'contiene' || f.operador === 'es') return lista.includes(buscado);
    if (f.operador === 'no_contiene' || f.operador === 'no_es') return !lista.includes(buscado);
  }

  switch (f.operador) {
    case 'esta_vacia':     return !c || c.estado === 'vacia';
    case 'no_esta_vacia':  return !!c && c.estado === 'ok';
    case 'es_verdadero':   return v === true;
    case 'es_falso':       return v === false;
  }

  // A partir de aquí hace falta un valor. Sin él, la fila no pasa: «los que
  // cuestan más de 100» no puede incluir a los que no se sabe cuánto cuestan.
  if (v === undefined) return false;

  const num = typeof v === 'number' ? v : Number(v);
  const numObj = typeof objetivo === 'number' ? objetivo : Number(objetivo);
  const hayNumeros = Number.isFinite(num) && Number.isFinite(numObj);
  const txt = String(v).toLowerCase();
  const txtObj = String(objetivo ?? '').toLowerCase();

  switch (f.operador) {
    case 'es':           return hayNumeros ? num === numObj : txt === txtObj;
    case 'no_es':        return hayNumeros ? num !== numObj : txt !== txtObj;
    case 'contiene':     return txt.includes(txtObj);
    case 'no_contiene':  return !txt.includes(txtObj);
    case 'mayor':        return hayNumeros ? num > numObj : txt > txtObj;
    case 'mayor_igual':  return hayNumeros ? num >= numObj : txt >= txtObj;
    case 'menor':        return hayNumeros ? num < numObj : txt < txtObj;
    case 'menor_igual':  return hayNumeros ? num <= numObj : txt <= txtObj;
    // Las fechas se guardan AAAA-MM-DD, así que comparar textos las ordena bien
    // y no hay que convertirlas.
    case 'antes_de':     return String(v) < String(objetivo);
    case 'despues_de':   return String(v) > String(objetivo);
    default:             return true;
  }
}

/** ¿Pasa la fila este grupo? Y: todas; O: alguna. Un grupo vacío no filtra. */
function pasaGrupo(celdas: Record<string, Celda>, g: GrupoFiltros): boolean {
  const reglas = g.reglas.filter(r => esGrupo(r) ? r.reglas.length > 0 : !!(r as Filtro).columna_id);
  if (!reglas.length) return true;
  const una = (r: Filtro | GrupoFiltros) => esGrupo(r) ? pasaGrupo(celdas, r) : pasa(celdas, r as Filtro);
  return g.y_o === 'o' ? reglas.some(una) : reglas.every(una);
}

/** Filtra. Acepta la lista vieja (todas tienen que cumplirse) o un grupo Y/O. */
export function filtrar<T extends { celdas: Record<string, Celda> }>(filas: T[], filtros: Filtros | null | undefined): T[] {
  if (!filtros) return filas;
  const grupo: GrupoFiltros = Array.isArray(filtros) ? { y_o: 'y', reglas: filtros } : filtros;
  if (!esGrupo(grupo) || !grupo.reglas.length) return filas;
  return filas.filter(f => pasaGrupo(f.celdas, grupo));
}

/**
 * Ordena por una o varias columnas.
 *
 * LAS CELDAS SIN VALOR VAN SIEMPRE AL FINAL, suba o baje el orden. Es lo que
 * espera cualquiera: al ordenar por fecha de entrega, «sin fecha» no es ni lo
 * más pronto ni lo más tarde — es lo que todavía no se sabe, y su sitio es el
 * final en los dos sentidos.
 */
export function ordenarFilas<T extends { celdas: Record<string, Celda> }>(filas: T[], orden: Orden[]): T[] {
  if (!orden?.length) return filas;
  const copia = [...filas];
  copia.sort((a, b) => {
    for (const o of orden) {
      const va = comparable(a.celdas[o.columna_id]);
      const vb = comparable(b.celdas[o.columna_id]);
      if (va === undefined && vb === undefined) continue;
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      let cmp: number;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else if (typeof va === 'boolean' && typeof vb === 'boolean') cmp = (va ? 1 : 0) - (vb ? 1 : 0);
      else cmp = String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return o.direccion === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
  return copia;
}

/** Agrupa por el valor de una columna. Las que no tienen valor caen en un grupo
 *  propio y visible: esconderlas haría que la suma de los grupos no cuadre con
 *  el total y nadie sabría por qué. */
export function agrupar<T extends { celdas: Record<string, Celda> }>(
  filas: T[],
  columnaId: string,
): Array<{ clave: string; vacio: boolean; filas: T[] }> {
  const grupos = new Map<string, T[]>();
  for (const f of filas) {
    const v = comparable(f.celdas[columnaId]);
    const clave = v === undefined ? ' vacio' : String(v);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(f);
  }
  return [...grupos.entries()]
    .map(([clave, fs]) => ({ clave: clave === ' vacio' ? '' : clave, vacio: clave === ' vacio', filas: fs }))
    // El grupo de los vacíos, el último.
    .sort((a, b) => (a.vacio ? 1 : b.vacio ? -1 : a.clave.localeCompare(b.clave, 'es')));
}
