// ============================================================================
// EDITAR A LA VEZ: LA BASE (2026-10-06, carril editorA, #1 de la lista de Notion)
// ============================================================================
// Eugenio quiere que dos personas (o dos pestañas) escriban en la misma página
// a la vez, como en Notion. Esto es el PRIMER PASO, que no es el CRDT todavía
// pero deja el terreno listo y ya evita lo peor: que un guardado pise a otro
// sin que nadie se entere.
//
// ── LO QUE HAY HOY ─────────────────────────────────────────────────────────
//  1. PRESENCIA. Quién más tiene abierta la página, con su avatar arriba.
//     Servidor: `src/server/colaboracion.ts` (SSE `GET /api/paginas/:id/presencia`).
//     Cliente: `PresenciaPagina.tsx`.
//  2. VERSIÓN. `knowledge_windows.version` sube en cada guardado. El editor
//     guarda con `version_base` (la que vio al abrir o al guardar por última
//     vez); si el servidor tiene otra, contesta 409 con lo que hay AHORA y no
//     escribe nada.
//  3. FUSIÓN. Con el 409 el editor no tira nada: hace una fusión de tres vías
//     bloque a bloque (`fusionarBloques`, más abajo) entre lo que había al
//     abrir (BASE), lo que tiene en pantalla (MÍO) y lo que hay ahora en el
//     servidor (SUYO), y vuelve a guardar. Si las dos partes tocaron el MISMO
//     bloque de forma distinta, gana lo mío y se avisa con su nombre.
//  4. AVISO DE «ALGUIEN HA GUARDADO». El mismo SSE de presencia trae un evento
//     `guardado` con la versión nueva. Quien no tiene nada sin guardar recarga
//     al momento; quien sí, lo fusiona en su próximo guardado.
//
// ── LO QUE NO HAY, Y POR QUÉ ESTO NO ES TIEMPO REAL ────────────────────────
//  - Se guarda cada 1,2 s tras dejar de teclear y la fusión es por BLOQUE:
//    dos personas escribiendo en el mismo párrafo a la vez se pisan (gana la
//    última en guardar, con aviso). No se ven los cursores de los demás.
//  - La presencia vive en la memoria de UN proceso. Con varios procesos hace
//    falta `LISTEN/NOTIFY` como en `telecomHub.ts` (ver su cabecera: «y cuando
//    haya ocho procesos»). Hoy hay uno.
//  - Los avisos son SSE (sólo servidor → cliente); los cambios suben por PUT.
//
// ── EL PASO A UN CRDT (YJS): QUÉ FALTA Y CÓMO SE HARÍA ─────────────────────
// Objetivo: que cada tecla viaje a los demás en milisegundos y que dos
// ediciones simultáneas del MISMO texto se combinen sin perder ninguna.
//
//  1. MODELO. Un `Y.Doc` por página:
//       - `Y.Array<Y.Map>` `bloques` — un `Y.Map` por bloque con sus campos
//         (`tipo`, `nivel`, `hecho`, `url`, `anchoImagen`, `recorte`…); la
//         lista PLANA con `nivel` que ya usa el editor es justo lo que Yjs
//         maneja bien (mover un bloque = borrar + insertar con el mismo id, y
//         los hijos ya viajan por tener más `nivel`).
//       - `texto` de cada bloque = `Y.Text`. Hoy el texto vive en el DOM
//         (`BloqueEditable`, ver su comentario) y en `textosRef`: con Yjs el
//         dueño del texto pasa a ser el `Y.Text`, y el contentEditable se
//         enlaza con él (`y-prosemirror`/`y-quill` son la referencia; para un
//         contentEditable por bloque lo más simple es observar `Y.Text` y
//         aplicar `delta`s al DOM, y traducir `beforeinput` a deltas).
//       - `filas` de las tablas de texto: `Y.Array<Y.Array<Y.Text>>`.
//       - Título y ajustes: un `Y.Map` `meta`.
//  2. TRANSPORTE. Un servidor Yjs sobre WebSocket (`y-websocket`, o el
//     protocolo de sincronización de `y-protocols` sobre `ws`). Esto exige
//     enganchar un WebSocket al servidor HTTP: toca `server.ts`, que está
//     congelado (ver `src/server/CLAUDE.md`, y la cabecera de `telecomHub.ts`
//     donde se eligió SSE por eso). Alternativa SIN WebSocket: SSE para bajar
//     actualizaciones + `POST /api/paginas/:id/yjs` para subirlas (cada
//     actualización de Yjs es un `Uint8Array` pequeño); sirve y no toca nada
//     congelado, a cambio de más peticiones.
//  3. PERSISTENCIA. Guardar el estado del `Y.Doc` (binario) en una columna
//     nueva `knowledge_windows.yjs bytea`, y SEGUIR escribiendo `config.bloques`
//     como hoy a partir del documento: así la lectura pública, la búsqueda,
//     el historial (`entity_history`), las exportaciones y `BloquesLectura` no
//     cambian. El documento Yjs es la fuente en edición; `config.bloques` es
//     su proyección. Migración: la primera vez que se abre, el `Y.Doc` se
//     construye desde `config.bloques` (`aplanar`).
//  4. PRESENCIA Y CURSORES. `y-protocols/awareness`: nombre, color y posición
//     del cursor de cada persona; sustituye al SSE de presencia de hoy (la
//     lista de avatares sale de ahí) y permite pintar el cursor ajeno.
//  5. DESHACER. `Y.UndoManager` con `trackedOrigins` propios: ⌘Z sólo deshace
//     lo MÍO, no lo de los demás. Hoy `Documento.tsx` tiene su pila de fotos
//     (ver «DESHACER Y REHACER»); habría que sustituirla por el UndoManager.
//  6. PERMISOS. El servidor ya sabe quién puede editar qué página
//     (`rolEnPagina`, `permisos.ts`): rechazar las actualizaciones de quien
//     sólo puede ver o comentar, y dejar a esas personas conectarse en modo
//     lectura (reciben, no envían).
//  7. LOS BLOQUES QUE NO SON TEXTO (base de datos, pizarra, sincronizados)
//     tienen su propia fuente de verdad en el servidor y no entran en el
//     `Y.Doc`: dentro sólo va la referencia (`tabla_id`, `entityId`, `sincId`).
//     Un bloque sincronizado ya es, en pequeño, esto mismo (ver
//     `bloques_sincronizados`): su contenido se podría llevar a un `Y.Doc`
//     propio con el mismo mecanismo.
//  8. PRUEBAS. Dos navegadores contra el mismo servidor, tecleando a la vez
//     en el mismo bloque, en bloques distintos, moviendo un bloque que el
//     otro edita, y cortando la red de uno y reconectando.
//
// Estimación: lo difícil no es Yjs, es el punto 1 (el texto vivo en el DOM) y
// el 5 (deshacer). Lo demás es transporte y una columna.
// ============================================================================

import type { Bloque } from './bloques';

export interface Conflicto { id: string; texto: string }

const firmaBloque = (b: Bloque | undefined): string =>
  b ? JSON.stringify(b, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, y]) => y !== undefined).sort(([a], [c]) => a.localeCompare(c)))
    : v)) : '';

/**
 * FUSIÓN DE TRES VÍAS, BLOQUE A BLOQUE. Las tres son listas PLANAS (con
 * `nivel`), con los textos ya puestos en cada bloque.
 *
 *  - Un bloque que sólo cambió un lado se queda con ese cambio.
 *  - Borrado por un lado y sin tocar por el otro: borrado.
 *  - Borrado por uno y EDITADO por el otro: se conserva el editado (perder
 *    texto escrito es peor que resucitar un bloque).
 *  - Editado por los dos de forma distinta: gana el MÍO y se devuelve en
 *    `conflictos` para avisar.
 *  - El ORDEN es el de SUYO (lo último que hay), con mis bloques nuevos
 *    colocados detrás del bloque que tenían encima en mi lista. Si MÍO movió
 *    bloques que SUYO no, su movimiento se pierde: el orden de dos personas
 *    moviendo a la vez es lo que sólo un CRDT resuelve bien (ver arriba).
 */
export function fusionarBloques(base: Bloque[], mio: Bloque[], suyo: Bloque[]): { bloques: Bloque[]; conflictos: Conflicto[] } {
  const B = new Map(base.map(b => [b.id, b]));
  const M = new Map(mio.map(b => [b.id, b]));
  const S = new Map(suyo.map(b => [b.id, b]));
  const conflictos: Conflicto[] = [];

  const resolver = (id: string): Bloque | null => {
    const b = B.get(id), m = M.get(id), s = S.get(id);
    if (!b) return m ?? s ?? null;                       // nuevo de alguno de los dos
    const cambioM = firmaBloque(m) !== firmaBloque(b);
    const cambioS = firmaBloque(s) !== firmaBloque(b);
    if (!m && !s) return null;                           // borrado por los dos
    if (!m) return cambioS ? s! : null;                  // lo borré yo
    if (!s) return cambioM ? m : null;                   // lo borró el otro
    if (!cambioM) return s;
    if (!cambioS) return m;
    if (firmaBloque(m) !== firmaBloque(s)) conflictos.push({ id, texto: (m.texto || s.texto || '').slice(0, 40) });
    return m;
  };

  const salida: Bloque[] = [];
  const puestos = new Set<string>();
  const poner = (id: string) => {
    if (puestos.has(id)) return;
    const r = resolver(id);
    puestos.add(id);
    if (r) salida.push(r);
  };
  // Mis bloques nuevos, detrás del que tenían encima en mi lista.
  const nuevosMios = new Map<string, string[]>();   // id del bloque de encima → mis nuevos
  mio.forEach((b, i) => {
    if (B.has(b.id) || S.has(b.id)) return;
    let k = i - 1;
    while (k >= 0 && !(S.has(mio[k].id) || B.has(mio[k].id))) k--;
    const ancla = k >= 0 ? mio[k].id : '';
    nuevosMios.set(ancla, [...(nuevosMios.get(ancla) || []), b.id]);
  });
  for (const id of nuevosMios.get('') || []) poner(id);
  for (const s of suyo) {
    poner(s.id);
    for (const id of nuevosMios.get(s.id) || []) poner(id);
  }
  // Los que SUYO ya no tiene pero yo sigo teniendo (los resuelve `resolver`).
  for (const b of mio) {
    if (!puestos.has(b.id)) {
      const r = resolver(b.id);
      puestos.add(b.id);
      if (r) salida.push(r);
    }
  }
  return { bloques: salida, conflictos };
}
