// ============================================================================
// EDICIÓN COLABORATIVA CON YJS: EL MODELO (2026-10-06, carril colab)
// ============================================================================
// Este fichero es la ÚNICA definición de cómo una página (una lista de
// bloques) se guarda dentro de un `Y.Doc`. Lo comparten el servidor
// (`src/server/colabServidor.ts`), el navegador (`colabCliente.ts`) y el
// script de pruebas: si cada uno tuviera su copia acabarían diciendo cosas
// distintas, y un documento que dos lados leen distinto es un documento que
// pierde texto sin avisar.
//
// ── DECISIONES DE DISEÑO (por qué así y no de otra manera) ─────────────────
//
//  1. YJS (CRDT) y no «OT» ni «fusionar al guardar». Dos personas escribiendo
//     en el MISMO párrafo se fusionan carácter a carácter, sin servidor que
//     arbitre, y lo mismo al volver de estar sin red. La alternativa (la de
//     hoy, `fusionarBloques`) funciona por BLOQUE: si los dos tocan el mismo
//     párrafo, gana uno. Se queda como respaldo (ver 6).
//
//  2. NO SE REESCRIBE EL EDITOR. `Documento.tsx` tiene su propia lista plana de
//     bloques con `nivel` y el texto vivo de cada bloque dentro del DOM (ver
//     `BloqueEditable`). Enlazar un editor entero (y-prosemirror, y-quill) a
//     eso obligaría a rehacerlo. En su lugar hay un ENLACE POR DIFERENCIAS:
//     el editor entrega cómo está la página (`Plano`), este módulo calcula qué
//     cambió respecto a lo último que el editor sabía y lo traduce a
//     operaciones de Yjs (`aplicarCambios`); y lo que llega de otros se lee
//     (`leerPlano`) y se le entrega al editor. El texto de un bloque se
//     enlaza con su `Y.Text` por prefijo y sufijo comunes (un `delete` y un
//     `insert` por cambio), que es lo que hace cualquier enlace a un
//     <textarea> y es exacto para lo que se teclea.
//
//  3. LA LISTA PLANA CON `nivel` SE QUEDA TAL CUAL. Los hijos de un bloque son
//     los que van detrás con más sangría (ver `aplanar`/`aArbol` en
//     `bloques.ts`), así que mover un bloque con hijos es mover varios ids y
//     no hay árboles que fusionar.
//
//  4. EL ORDEN VIVE APARTE DEL CONTENIDO. Si cada bloque fuera un `Y.Map`
//     dentro de un `Y.Array`, mover un bloque sería borrarlo y volver a
//     insertarlo: lo que otra persona estuviera escribiendo en él en ese
//     momento se perdería con el borrado. Por eso:
//         `orden`    Y.Array<string>        los ids, en orden
//         `bloques`  Y.Map<id, Y.Map>       el contenido de cada bloque
//     Mover = quitar y poner el id en `orden`; el contenido ni se toca. Dos
//     movimientos simultáneos del mismo bloque pueden dejar el id dos veces en
//     `orden`: se lee la primera y la limpieza quita las demás.
//
//  5. BORRAR NO DESTRUYE EL CONTENIDO. Quitar un bloque es sacar su id de
//     `orden` y marcar su contenido con `_borrado`/`_despues` (la hora y el
//     bloque que tenía encima). Si otra persona lo estaba EDITANDO a la vez,
//     el servidor lo ve (un cambio en el contenido de un bloque que no está en
//     `orden`) y lo VUELVE A PONER donde estaba: igual que `fusionarBloques`,
//     perder texto escrito es peor que resucitar un bloque. Un contenido
//     huérfano más viejo de un día lo recoge el servidor (`recogerHuerfanos`).
//
//  6. EL CAMINO SIN YJS SIGUE VIVO. Todo esto es una capa encima del guardado
//     de siempre. Si el WebSocket falla, el editor guarda con `PUT` (+409 +
//     fusión por bloque); y ese mismo `PUT`, cuando la página ya tiene
//     documento Yjs, entra por `aplicarCambios` en el servidor, así que los
//     dos caminos convergen en el mismo documento.
//
//  7. LAS MARCAS EN LÍNEA (negrita, enlaces, menciones, ecuaciones) SON TEXTO.
//     El texto de un bloque ya guarda markdown (`**negrita**`, `[@Ana](…)`,
//     `$…$`), y el editor lo enseña en crudo en el bloque activo. Por tanto el
//     `Y.Text` guarda ese mismo texto, sin atributos de formato de Yjs: lo que
//     se lee es lo que se guarda, y la lectura pública, el buscador y las
//     exportaciones no cambian. El precio es que dos personas tecleando JUSTO
//     dentro de un `**…**` pueden dejarlo mal cerrado (se ve, no se pierde).
//
//  8. DENTRO DEL DOCUMENTO VA TODO LO QUE ESTÁ EN EL BLOQUE (campos sencillos
//     como `tipo`, `nivel`, `hecho`, `url`, `recorte`…, que son «gana el último»;
//     `texto` como `Y.Text`; `filas` de una tabla como `Y.Array<Y.Array<Y.Text>>`
//     para que dos personas editando CELDAS distintas no se pisen). Lo que no
//     es texto (bases de datos, pizarras, sincronizados) tiene su fuente de
//     verdad en otro sitio y aquí sólo va la referencia.
//
//  9. `config.bloques` SIGUE SIENDO LA COPIA LEGIBLE. El servidor la deriva del
//     documento con espera (ver `colabServidor.ts`); la lectura pública, el
//     buscador, las versiones, la API y la IA no saben que existe Yjs.
//
// Compartido con el navegador: no importa nada de Node.
// ============================================================================

import * as Y from 'yjs';
import type { Bloque } from './bloques';
import { firma, diferencia, type Plano } from './colabTexto';
export { firma, diferencia, moverIndice, posTrasDelta } from './colabTexto';
export type { Plano } from './colabTexto';

/** Un contenido huérfano (borrado) se conserva este tiempo por si otra persona
 *  lo editaba a la vez o alguien vuelve de estar sin red. */
export const MS_HUERFANO = 24 * 60 * 60 * 1000;

/** Tope de bloques y de caracteres por página: lo que pase de aquí no es una
 *  página, es un volcado, y un documento sin cota es un documento que tumba el
 *  servidor con un solo cliente mal hecho. */
export const MAX_BLOQUES = 20_000;

const CLAVES_PROPIAS = new Set(['id', 'texto', 'filas', 'bloques']);
const esMeta = (k: string) => k.startsWith('_');

// ── ACCESO A LAS RAÍCES ─────────────────────────────────────────────────────

export function raices(doc: Y.Doc) {
  return {
    meta: doc.getMap<any>('meta'),
    orden: doc.getArray<string>('orden'),
    mapa: doc.getMap<Y.Map<any>>('bloques'),
  };
}

/** Asegura que existe lo que el resto da por supuesto (el título). Lo hace el
 *  servidor al crear el documento; el cliente sólo lo repite por si acaso. */
export function asegurarEstructura(doc: Y.Doc) {
  const { meta } = raices(doc);
  if (!(meta.get('titulo') instanceof Y.Text)) doc.transact(() => { meta.set('titulo', new Y.Text()); }, 'estructura');
}

// ── COMPARACIONES ──────────────────────────────────────────────────────────

const clonar = <T,>(v: T): T => (v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);

/** Pone en un `Y.Text` el texto nuevo con las mínimas operaciones. */
export function escribirTexto(t: Y.Text, nuevo: string): boolean {
  const d = diferencia(t.toString(), nuevo);
  if (!d) return false;
  if (d.quitar) t.delete(d.i, d.quitar);
  if (d.poner) t.insert(d.i, d.poner);
  return true;
}

// ── TABLAS: Y.Array<Y.Array<Y.Text>> ───────────────────────────────────────

const textoCelda = (c: unknown) => (typeof c === 'string' ? c : c == null ? '' : String(c));

function nuevaFila(celdas: string[]): Y.Array<Y.Text> {
  const f = new Y.Array<Y.Text>();
  f.push(celdas.map(c => new Y.Text(textoCelda(c))));
  return f;
}
const leerFila = (f: Y.Array<Y.Text>): string[] => f.toArray().map(c => (c instanceof Y.Text ? c.toString() : textoCelda(c)));
const igualFila = (f: Y.Array<Y.Text>, c: string[]) => {
  if (f.length !== c.length) return false;
  for (let k = 0; k < c.length; k++) { const y = f.get(k); if ((y instanceof Y.Text ? y.toString() : textoCelda(y)) !== textoCelda(c[k])) return false; }
  return true;
};

/** Mismos cambios, celda a celda: las filas iguales por delante y por detrás
 *  no se tocan; lo del medio se empareja por posición. */
function escribirFilas(yf: Y.Array<Y.Array<Y.Text>>, nuevas: string[][]) {
  const n = yf.length, m = nuevas.length;
  let p = 0;
  while (p < n && p < m && igualFila(yf.get(p), nuevas[p])) p++;
  let s = 0;
  while (s < n - p && s < m - p && igualFila(yf.get(n - 1 - s), nuevas[m - 1 - s])) s++;
  const viejas = n - p - s, nuevasN = m - p - s;
  const comunes = Math.min(viejas, nuevasN);
  for (let k = 0; k < comunes; k++) escribirFila(yf.get(p + k), nuevas[p + k]);
  if (viejas > comunes) yf.delete(p + comunes, viejas - comunes);
  if (nuevasN > comunes) yf.insert(p + comunes, nuevas.slice(p + comunes, p + nuevasN).map(f => nuevaFila((Array.isArray(f) ? f : []).map(textoCelda))));
}
function escribirFila(yr: Y.Array<Y.Text>, celdas: string[]) {
  const c = Array.isArray(celdas) ? celdas.map(textoCelda) : [];
  const n = yr.length, m = c.length;
  let p = 0;
  while (p < n && p < m && (yr.get(p) as Y.Text).toString() === c[p]) p++;
  let s = 0;
  while (s < n - p && s < m - p && (yr.get(n - 1 - s) as Y.Text).toString() === c[m - 1 - s]) s++;
  const viejas = n - p - s, nuevasN = m - p - s;
  const comunes = Math.min(viejas, nuevasN);
  for (let k = 0; k < comunes; k++) escribirTexto(yr.get(p + k) as Y.Text, c[p + k]);
  if (viejas > comunes) yr.delete(p + comunes, viejas - comunes);
  if (nuevasN > comunes) yr.insert(p + comunes, c.slice(p + comunes, p + nuevasN).map(t => new Y.Text(t)));
}

// ── LEER ───────────────────────────────────────────────────────────────────

/** Un `Y.Map` de contenido → bloque. Tolerante: un contenido sin `tipo` (un
 *  documento corrupto o a medias) no es un bloque. */
export function leerBloque(id: string, m: Y.Map<any>): Bloque | null {
  const o: any = { id };
  m.forEach((v, k) => {
    if (esMeta(k) || CLAVES_PROPIAS.has(k)) return;
    if (v instanceof Y.AbstractType) return;
    o[k] = clonar(v);
  });
  const t = m.get('texto');
  if (t instanceof Y.Text) o.texto = t.toString();
  const f = m.get('filas');
  if (f instanceof Y.Array) o.filas = f.toArray().map(r => (r instanceof Y.Array ? leerFila(r as Y.Array<Y.Text>) : []));
  if (typeof o.tipo !== 'string') return null;
  return o as Bloque;
}

/** Los ids de `orden`, sin repetidos y sólo los que tienen contenido. */
export function idsEnOrden(doc: Y.Doc): string[] {
  const { orden, mapa } = raices(doc);
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const id of orden.toArray()) {
    if (typeof id !== 'string' || vistos.has(id)) continue;
    vistos.add(id);
    if (mapa.get(id) instanceof Y.Map) out.push(id);
  }
  return out;
}

export function leerTitulo(doc: Y.Doc): string {
  const t = raices(doc).meta.get('titulo');
  return t instanceof Y.Text ? t.toString() : '';
}

/** El documento entero como lo entiende el editor. */
export function leerPlano(doc: Y.Doc): Plano {
  const { mapa } = raices(doc);
  const bloques: Bloque[] = [];
  for (const id of idsEnOrden(doc)) {
    const b = leerBloque(id, mapa.get(id)!);
    if (b) bloques.push(b);
  }
  return { titulo: leerTitulo(doc), bloques };
}

// ── ESCRIBIR ───────────────────────────────────────────────────────────────

/** Pone un campo sencillo («gana el último»). `undefined` = quitarlo. */
function ponerCampo(m: Y.Map<any>, k: string, v: unknown) {
  if (v === undefined || v === null) { if (m.has(k)) m.delete(k); return; }
  if (!m.has(k) || firma(m.get(k)) !== firma(v)) m.set(k, clonar(v));
}

/** Escribe en el contenido de un bloque sólo lo que cambió entre `antes`
 *  (lo que el editor sabía) y `ahora` (lo que tiene). Sin `antes`, todo. */
function escribirBloque(m: Y.Map<any>, ahora: Bloque, antes?: Bloque) {
  for (const k of Object.keys(ahora)) {
    if (CLAVES_PROPIAS.has(k)) continue;
    const v = (ahora as any)[k];
    if (antes && firma((antes as any)[k]) === firma(v)) continue;
    ponerCampo(m, k, v);
  }
  if (antes) for (const k of Object.keys(antes)) {
    if (!CLAVES_PROPIAS.has(k) && (ahora as any)[k] === undefined && m.has(k)) m.delete(k);
  }
  // texto
  if (typeof ahora.texto === 'string') {
    if (!antes || antes.texto !== ahora.texto) {
      let t = m.get('texto');
      if (!(t instanceof Y.Text)) { t = new Y.Text(); m.set('texto', t); }
      escribirTexto(t, ahora.texto);
    }
  } else if (antes && typeof antes.texto === 'string' && m.has('texto')) m.delete('texto');
  // filas
  if (Array.isArray(ahora.filas)) {
    if (!antes || firma(antes.filas) !== firma(ahora.filas)) {
      let f = m.get('filas');
      if (!(f instanceof Y.Array)) { f = new Y.Array<Y.Array<Y.Text>>(); m.set('filas', f); }
      escribirFilas(f as Y.Array<Y.Array<Y.Text>>, ahora.filas);
    }
  } else if (antes && Array.isArray(antes.filas) && m.has('filas')) m.delete('filas');
}

/** La subsecuencia creciente más larga (índices) de una lista de números. */
function lis(a: number[]): Set<number> {
  const cola: number[] = [];        // índices de a, el último de cada longitud
  const previo: number[] = new Array(a.length).fill(-1);
  for (let i = 0; i < a.length; i++) {
    let lo = 0, hi = cola.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (a[cola[mid]] < a[i]) lo = mid + 1; else hi = mid; }
    if (lo > 0) previo[i] = cola[lo - 1];
    cola[lo] = i;
  }
  const out = new Set<number>();
  let k = cola.length ? cola[cola.length - 1] : -1;
  while (k >= 0) { out.add(k); k = previo[k]; }
  return out;
}

/** Quita todas las apariciones de `id` en `orden`. */
function quitarDeOrden(orden: Y.Array<string>, id: string) {
  for (let i = orden.length - 1; i >= 0; i--) if (orden.get(i) === id) orden.delete(i, 1);
}
/** Dónde meter algo que va detrás de `ancla` (o de la anterior que exista). */
function indiceTras(orden: Y.Array<string>, ancla: string | null, antecesores: string[]): number {
  if (ancla === null) return 0;
  const cand = [ancla, ...antecesores];
  const actual = orden.toArray();
  for (const c of cand) { const k = actual.indexOf(c); if (k >= 0) return k + 1; }
  return 0;
}

/**
 * EL CORAZÓN: traduce «lo que cambió en el editor» a operaciones de Yjs.
 *
 *  - `antes` es el último `Plano` que el editor SABÍA (lo que se le entregó, o
 *    lo que ya había enviado). `ahora` es cómo lo tiene.
 *  - Sólo se escribe la DIFERENCIA entre los dos, nunca «el editor entero
 *    contra Yjs»: lo que otra persona haya cambiado en Yjs entretanto y el
 *    editor aún no haya recibido no es un borrado del editor, y no se toca.
 *  - Devuelve si cambió algo.
 *
 * Quien carga un documento nuevo llama con `antes = { titulo: '', bloques: [] }`.
 */
export function aplicarCambios(doc: Y.Doc, antes: Plano, ahora: Plano, origen: unknown = 'local'): boolean {
  const { meta, orden, mapa } = raices(doc);
  let cambio = false;
  const A = new Map(antes.bloques.map(b => [b.id, b]));
  const bloquesAhora: Bloque[] = [];
  const vistos = new Set<string>();
  for (const b of ahora.bloques) {
    if (!b || typeof b.id !== 'string' || !b.id || vistos.has(b.id)) continue;
    vistos.add(b.id);
    bloquesAhora.push(b);
  }
  if (bloquesAhora.length > MAX_BLOQUES) throw new Error(`Demasiados bloques (${bloquesAhora.length}; el máximo es ${MAX_BLOQUES}).`);

  doc.transact(() => {
    // Título.
    if (antes.titulo !== ahora.titulo) {
      let t = meta.get('titulo');
      if (!(t instanceof Y.Text)) { t = new Y.Text(); meta.set('titulo', t); }
      if (escribirTexto(t, ahora.titulo)) cambio = true;
    }

    // Contenido: los nuevos y los que cambiaron.
    for (const b of bloquesAhora) {
      const e = A.get(b.id);
      let m = mapa.get(b.id);
      if (!(m instanceof Y.Map)) {
        m = new Y.Map<any>();
        mapa.set(b.id, m);
        escribirBloque(m, b);
        cambio = true;
        continue;
      }
      // Estaba borrado (huérfano) y ahora vuelve: se desmarca.
      if (m.has('_borrado') && !e) { m.delete('_borrado'); m.delete('_despues'); cambio = true; }
      if (e && firma(e) === firma(b)) continue;
      escribirBloque(m, b, e);
      cambio = true;
    }

    // Orden: quitados, movidos y nuevos, con el ESTADO ACTUAL de `orden`.
    const idsAntes = antes.bloques.map(b => b.id);
    const idsAhora = bloquesAhora.map(b => b.id);
    const quitados = idsAntes.filter(id => !vistos.has(id));
    for (const id of quitados) {
      const m = mapa.get(id);
      const k = idsAntes.indexOf(id);
      if (m instanceof Y.Map && !m.has('_borrado')) { m.set('_borrado', Date.now()); m.set('_despues', k > 0 ? idsAntes[k - 1] : ''); }
      quitarDeOrden(orden, id);
      cambio = true;
    }
    // Los que ya estaban y han cambiado de sitio: los que NO están en la
    // subsecuencia más larga que conserva el orden relativo.
    const enAntes = new Map(idsAntes.map((id, i) => [id, i]));
    const comunes = idsAhora.filter(id => enAntes.has(id));
    const estables = lis(comunes.map(id => enAntes.get(id)!));
    const estId = new Set<string>(); comunes.forEach((id, i) => { if (estables.has(i)) estId.add(id); });
    const aColocar = new Set<string>();
    for (const id of idsAhora) if (!enAntes.has(id) || !estId.has(id)) aColocar.add(id);
    const enOrden = new Set(orden.toArray());
    if (aColocar.size) {
      cambio = true;
      for (const id of aColocar) if (enAntes.has(id) && enOrden.has(id)) quitarDeOrden(orden, id);
      idsAhora.forEach((id, i) => {
        if (!aColocar.has(id)) return;
        const ancla = i > 0 ? idsAhora[i - 1] : null;
        const antes_ = idsAhora.slice(0, Math.max(0, i - 1)).reverse();
        orden.insert(indiceTras(orden, ancla, antes_), [id]);
      });
    }
  }, origen);
  return cambio;
}

/** Construye un documento vacío a partir de un plano (carga de una página). */
export function construirDesdePlano(doc: Y.Doc, plano: Plano, origen: unknown = 'carga') {
  asegurarEstructura(doc);
  aplicarCambios(doc, { titulo: '', bloques: [] }, plano, origen);
}

// ── LIMPIEZA (la hace el servidor) ─────────────────────────────────────────

/** Quita de `orden` los ids repetidos (por dos movimientos a la vez) y los que
 *  no tienen contenido. Devuelve si tocó algo. */
export function limpiarOrden(doc: Y.Doc, origen: unknown = 'limpieza'): boolean {
  const { orden, mapa } = raices(doc);
  const arr = orden.toArray();
  const vistos = new Set<string>();
  const borrar: number[] = [];
  arr.forEach((id, i) => {
    if (typeof id !== 'string' || vistos.has(id) || !(mapa.get(id) instanceof Y.Map)) borrar.push(i);
    else vistos.add(id);
  });
  if (!borrar.length) return false;
  doc.transact(() => { for (let k = borrar.length - 1; k >= 0; k--) orden.delete(borrar[k], 1); }, origen);
  return true;
}

/** Contenidos de bloques borrados hace más de `MS_HUERFANO`: se eliminan. */
export function recogerHuerfanos(doc: Y.Doc, ahora = Date.now(), origen: unknown = 'limpieza'): number {
  const { orden, mapa } = raices(doc);
  const enOrden = new Set(orden.toArray());
  const fuera: string[] = [];
  mapa.forEach((m, id) => {
    if (!(m instanceof Y.Map)) { fuera.push(id); return; }
    if (enOrden.has(id)) return;
    const b = m.get('_borrado');
    if (typeof b === 'number' && ahora - b > MS_HUERFANO) fuera.push(id);
  });
  if (fuera.length) doc.transact(() => { for (const id of fuera) mapa.delete(id); }, origen);
  return fuera.length;
}

/**
 * «EDITAR GANA A BORRAR»: devuelve a `orden` los bloques que alguien borró
 * mientras otra persona los editaba. `tocados` son los ids cuyo CONTENIDO
 * (texto, tabla o campos) cambió en la última actualización; los que ya no
 * están en `orden` se recolocan donde estaban (tras el bloque que tenían encima).
 */
export function resucitarEditados(doc: Y.Doc, tocados: Iterable<string>, origen: unknown = 'resurreccion'): string[] {
  const { orden, mapa } = raices(doc);
  const en = new Set(orden.toArray());
  const vuelven: string[] = [];
  for (const id of tocados) {
    const m = mapa.get(id);
    if (m instanceof Y.Map && !en.has(id) && typeof m.get('tipo') === 'string') vuelven.push(id);
  }
  if (!vuelven.length) return [];
  doc.transact(() => {
    for (const id of vuelven) {
      const m = mapa.get(id)!;
      const tras = String(m.get('_despues') || '');
      const actual = orden.toArray();
      const k = tras ? actual.indexOf(tras) : -1;
      orden.insert(k >= 0 ? k + 1 : (tras ? actual.length : 0), [id]);
      m.delete('_borrado'); m.delete('_despues');
    }
  }, origen);
  return vuelven;
}

// ── QUÉ CAMBIÓ EN UNA ACTUALIZACIÓN (para el editor y para la resurrección) ─

export interface CambiosRemotos {
  /** Cambió el orden, apareció o desapareció un bloque o cambió un campo. */
  estructura: boolean;
  /** Bloques cuyo texto cambió (con los cambios, para mover el cursor). */
  textos: Map<string, { delta: any[] }>;
  /** ¿Cambió el título? (con su delta) */
  titulo: { delta: any[] } | null;
  /** Ids cuyo contenido (no su orden) cambió: base de la resurrección. */
  tocados: Set<string>;
}

const sinCambios = (): CambiosRemotos => ({ estructura: false, textos: new Map(), titulo: null, tocados: new Set() });

/** Interpreta los eventos de `observeDeep` de UNA de las tres raíces y los
 *  suma en `acc`. Se lee en el momento: `path` y `delta` sólo valen dentro del
 *  observador. */
function resumirEventos(doc: Y.Doc, eventos: Y.YEvent<any>[], acc: CambiosRemotos) {
  const { meta, orden, mapa } = raices(doc);
  for (const ev of eventos) {
    const raiz = ev.currentTarget;
    if (raiz === orden) { acc.estructura = true; continue; }
    if (raiz === meta) {
      if (ev.target instanceof Y.Text && ev.path[0] === 'titulo') {
        const d = (ev as Y.YTextEvent).delta;
        acc.titulo = { delta: acc.titulo ? [...acc.titulo.delta, ...d] : d };
      }
      continue;
    }
    if (raiz !== mapa) continue;
    // Debajo de `bloques`: path[0] es el id del bloque.
    if (ev.target === mapa) {
      acc.estructura = true;
      for (const k of ev.keys.keys()) acc.tocados.add(String(k));
      continue;
    }
    const id = ev.path[0];
    if (typeof id !== 'string') continue;
    if (ev.target instanceof Y.Text && ev.path.length === 2 && ev.path[1] === 'texto') {
      const d = (ev as Y.YTextEvent).delta;
      const prev = acc.textos.get(id);
      acc.textos.set(id, { delta: prev ? [...prev.delta, ...d] : d });
      acc.tocados.add(id);
    } else if (ev.target instanceof Y.Map && ev.path.length === 1) {
      // Cambiaron campos del bloque; `_borrado` y `_despues` no cuentan como
      // edición (es el propio borrado el que los pone).
      acc.estructura = true;
      if ([...ev.keys.keys()].some(k => !esMeta(String(k)))) acc.tocados.add(id);
    } else {
      acc.estructura = true;
      acc.tocados.add(id);
    }
  }
}

/**
 * Avisa de lo que cambió en el documento al terminar CADA transacción (la de
 * una actualización que llega, una edición propia, un deshacer…). `txn.origin`
 * dice quién fue. Devuelve la función que deja de vigilar.
 */
export function vigilar(doc: Y.Doc, alCambiar: (c: CambiosRemotos, txn: Y.Transaction) => void): () => void {
  const { meta, orden, mapa } = raices(doc);
  let acc = sinCambios();
  const ver = (evs: Y.YEvent<any>[]) => resumirEventos(doc, evs, acc);
  orden.observeDeep(ver); mapa.observeDeep(ver); meta.observeDeep(ver);
  const fin = (txn: Y.Transaction) => {
    const c = acc;
    acc = sinCambios();
    if (c.estructura || c.textos.size || c.titulo || c.tocados.size) alCambiar(c, txn);
  };
  doc.on('afterTransaction', fin);
  return () => { orden.unobserveDeep(ver); mapa.unobserveDeep(ver); meta.unobserveDeep(ver); doc.off('afterTransaction', fin); };
}

