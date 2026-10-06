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
// ── EL PASO A UN CRDT (YJS): HECHO (2026-10-06, carril colab) ──────────────
// Lo que arriba se describe como «lo que no hay» ya existe, encima de esto y no
// en su lugar:
//   · el diseño y el modelo del documento:  `colabModelo.ts` (y `colabTexto.ts`)
//   · la conexión y el puente con el editor: `colabCliente.ts`, `colabDom.ts`,
//     `components/knowledge/useColab.ts` y `CursoresAjenos.tsx`
//   · el servidor (WebSocket `/api/colab/:id`, persistencia, derivación a
//     `config.bloques`, varios procesos con LISTEN/NOTIFY): `server/colabServidor.ts`
//   · las pruebas: `scripts/probar-colab.mts` y `scripts/probar-colab-modelo.mts`
// Esta fusión por bloque (`fusionarBloques`) NO sobra: es el respaldo cuando el
// WebSocket no conecta (autoguardado + 409), la reconciliación con las
// escrituras «por fuera» (IA, API, restaurar versión) y la del borrador sin
// conexión que se recupera al recargar.
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
