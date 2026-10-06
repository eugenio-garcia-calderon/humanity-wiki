// ============================================================================
// EDICIÓN COLABORATIVA: EL CLIENTE (2026-10-06, carril colab)
// ============================================================================
// El modelo (cómo una página vive en un `Y.Doc`) y las decisiones de diseño
// están en la cabecera de `colabModelo.ts`; el servidor, en `colabServidor.ts`.
// Aquí está lo que corre en el navegador: la conexión, la sincronización, la
// reconexión y el puente con el editor.
//
// ── CARGA PEREZOSA ─────────────────────────────────────────────────────────
// Esto importa `yjs`, `y-protocols` y `lib0` (~90 KB). El editor lo carga con
// `import()` sólo cuando se abre una página (ver `useColab.ts`): quien lee la
// web, o navega por la aplicación, no descarga nada de esto.
//
// ── CÓMO SE PORTA CON EL EDITOR ────────────────────────────────────────────
// El editor sigue siendo dueño de su estado (lista plana de bloques, textos en
// el DOM). `Colab` no lo sustituye, lo ENLAZA:
//   · hacia Yjs:   `texto(id, t)` para cada tecla y `empujar(plano)` para todo lo
//     demás. Los dos traducen «lo que cambió desde lo último que el editor
//     sabía» (`espejo`) a operaciones de Yjs (`aplicarCambios`). Nunca «el
//     editor entero contra Yjs»: lo que otra persona haya escrito y el editor
//     aún no haya recibido no es un borrado suyo.
//   · hacia el editor: cuando Yjs cambia por algo que no es esta persona
//     escribiendo (otra persona, un deshacer, el servidor), antes se empuja lo
//     que el editor tuviera sin enviar y luego se le entrega el plano nuevo
//     (`alRemoto`).
//
// ── SI ALGO FALLA ──────────────────────────────────────────────────────────
//  · Sin red o con el servidor caído: el documento sigue en memoria y se sigue
//    editando; al volver, el saludo de sincronización de Yjs intercambia lo que
//    falta en los dos sentidos y NO SE PIERDE NADA de ninguno (a nivel de
//    carácter). Se reconecta con espera creciente y azar (nada de bucles).
//  · Si no consigue conectar NUNCA (un proxy que no deja pasar WebSockets, una
//    página a la que no se tiene acceso): a los 3 intentos se «abandona» y el
//    editor sigue como siempre (autoguardado + 409 + fusión por bloque).
//  · Una conexión a medias (el wifi se fue sin avisar) se detecta con un
//    «latido» cada 25 s que el servidor debe contestar en 10 s.
// ============================================================================

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { Bloque } from './bloques';
import { aplicarCambios, leerPlano, vigilar, raices, firma, type CambiosRemotos } from './colabModelo';
import { diferencia, type Plano } from './colabTexto';

export type EstadoColab = 'conectando' | 'vivo' | 'reconectando' | 'abandonado';

export interface PresenciaPersona {
  clientId: number;
  /** ¿Es esta misma pestaña? */
  yo: boolean;
  id: string; nombre: string; color: string; avatar: string | null; edita: boolean;
  bloque: string | null;
  cursor: { a: any; h: any } | null;
  sig: string | null;
}

export interface InfoColab {
  estado: EstadoColab;
  edita: boolean;
  /** Se ha llegado a sincronizar alguna vez en esta sesión. */
  sincronizado: boolean;
  version: number | null;
  yo: { id: string; nombre: string; color: string; avatar: string | null } | null;
  /** Pasos de deshacer y de rehacer (de esta persona). */
  pasos: { atras: number; adelante: number };
  motivoAbandono?: string;
}

export interface CallbacksColab {
  /** Cómo está el editor ahora mismo (título y bloques con su texto vivo). */
  leerEditor(): Plano | null;
  /** Llegó algo que cambia la página: de otra persona, de un deshacer o del
   *  servidor. `primera` = la primera sincronización de esta sesión. */
  alRemoto(plano: Plano, cambios: CambiosRemotos, origen: 'remoto' | 'deshacer' | 'primera'): void;
  alInfo(info: InfoColab): void;
  alAviso?(texto: string): void;
  alPresencia?(personas: PresenciaPersona[]): void;
}

const clonar = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Un plano limpio para guardar como `espejo`: sin `undefined`, sin hijos
 *  anidados (la lista del editor es plana) y SIN compartir objetos con el
 *  editor, que muta algunos (`filasRef`, `b.propsGaleria = …`). */
function limpiarPlano(p: Plano): Plano {
  return clonar({ titulo: p.titulo || '', bloques: p.bloques.map(b => { const { bloques: _h, ...r } = b as any; return r as Bloque; }) });
}

const ESPERAS = [500, 1000, 2000, 4000, 8000, 15000, 30000];

export class Colab {
  doc!: Y.Doc;
  awareness!: awarenessProtocol.Awareness;
  undo: Y.UndoManager | null = null;
  estado: EstadoColab = 'conectando';
  edita = true;
  version: number | null = null;
  yo: InfoColab['yo'] = null;
  sincronizado = false;
  motivoAbandono: string | undefined;

  private ws: WebSocket | null = null;
  private espejo: Plano;
  private espejoPorId = new Map<string, Bloque>();
  private primeraSync = false;
  private fallosIniciales = 0;
  private intento = 0;
  private timerReintento: ReturnType<typeof setTimeout> | null = null;
  private timerLatido: ReturnType<typeof setInterval> | null = null;
  private timerRespuesta: ReturnType<typeof setTimeout> | null = null;
  private timerEstable: ReturnType<typeof setTimeout> | null = null;
  private quitar: Array<() => void> = [];
  private pendiente: CambiosRemotos | null = null;
  private origenPendiente: 'remoto' | 'deshacer' = 'remoto';
  private programado = false;
  private destruido = false;
  private ultimaPresencia = '';

  constructor(public paginaId: string, base: Plano, private cb: CallbacksColab) {
    this.espejo = limpiarPlano(base);
    this.indexar();
    this.crearDoc();
    // La red vuelve o se va: no hace falta esperar a que el socket lo note.
    const enLinea = () => { if (!this.sincronizado || this.estado !== 'vivo') this.reconectarYa(); };
    const sinLinea = () => { if (this.estado === 'vivo') this.caer(); };
    window.addEventListener('online', enLinea);
    window.addEventListener('offline', sinLinea);
    this.quitar.push(() => { window.removeEventListener('online', enLinea); window.removeEventListener('offline', sinLinea); });
  }

  // ── DOCUMENTO ────────────────────────────────────────────────────────────
  private crearDoc() {
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.awareness.setLocalState(null);
    this.doc.on('update', (u: Uint8Array, origen: unknown) => {
      if (origen === 'remoto') return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, 0);
      syncProtocol.writeUpdate(enc, u);
      this.enviar(encoding.toUint8Array(enc));
    });
    this.awareness.on('update', ({ added, updated, removed }: any, origen: unknown) => {
      this.avisarPresencia();
      if (origen === 'remoto') return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, 1);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(this.awareness, added.concat(updated, removed)));
      this.enviar(encoding.toUint8Array(enc));
    });
    // Los cambios que NO son esta persona escribiendo llegan al editor.
    this.quitar.push(vigilar(this.doc, (c, txn) => {
      if (txn.origin === 'local') return;
      this.encolar(c, txn.origin === this.undo ? 'deshacer' : 'remoto');
    }));
  }

  private indexar() { this.espejoPorId = new Map(this.espejo.bloques.map(b => [b.id, b])); }
  private fijarEspejo(p: Plano) { this.espejo = limpiarPlano(p); this.indexar(); }

  // ── CONEXIÓN ─────────────────────────────────────────────────────────────
  conectar() {
    if (this.destruido || this.ws) return;
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/colab/${encodeURIComponent(this.paginaId)}`;
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch { this.fallo(); return; }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      // «Dime lo que no tengo» (paso 1 de la sincronización de Yjs).
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, 0);
      syncProtocol.writeSyncStep1(enc, this.doc);
      ws.send(encoding.toUint8Array(enc));
      // Pasados 10 s seguidos, la conexión se da por buena y se olvidan los fallos.
      this.timerEstable = setTimeout(() => { this.intento = 0; this.fallosIniciales = 0; }, 10_000);
      this.timerLatido = setInterval(() => this.latido(), 25_000);
      if (this.awareness.getLocalState() !== null) this.reenviarPresencia();
    };
    ws.onmessage = ev => { if (this.ws === ws) this.alMensaje(ev); };
    ws.onerror = () => { /* lo cuenta onclose */ };
    ws.onclose = ev => { if (this.ws === ws) this.alCerrar(ev); };
  }

  private enviar(b: Uint8Array) {
    if (this.ws?.readyState === WebSocket.OPEN) { try { this.ws.send(b); } catch { /* lo cuenta onclose */ } }
  }

  private latido() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, 0);
    syncProtocol.writeSyncStep1(enc, this.doc);
    this.enviar(encoding.toUint8Array(enc));
    clearTimeout(this.timerRespuesta!);
    // El servidor siempre contesta un «dime lo que no tengo»; si no llega, la
    // conexión está muerta aunque el navegador no lo sepa.
    this.timerRespuesta = setTimeout(() => this.caer(), 10_000);
  }

  private alMensaje(ev: MessageEvent) {
    if (typeof ev.data === 'string') {
      let t: any;
      try { t = JSON.parse(ev.data); } catch { return; }
      if (t.t === 'hola') {
        this.edita = !!t.edita;
        this.version = typeof t.version === 'number' ? t.version : this.version;
        this.yo = t.yo || null;
        this.avisarInfo();
      } else if (t.t === 'permiso') {
        this.edita = !!t.edita;
        this.cb.alAviso?.(this.edita ? 'Ya puedes editar esta página.' : 'Ya no tienes permiso para editar esta página: lo que escribas no se guardará.');
        this.avisarInfo();
      } else if (t.t === 'solo-lectura') {
        this.cb.alAviso?.('No tienes permiso para editar esta página: lo que escribes no se guarda.');
      } else if (t.t === 'lleno') {
        this.cb.alAviso?.('Esta página es demasiado grande para seguir editándose a la vez.');
      }
      return;
    }
    clearTimeout(this.timerRespuesta!);
    const dec = decoding.createDecoder(new Uint8Array(ev.data as ArrayBuffer));
    try {
      const tipo = decoding.readVarUint(dec);
      if (tipo === 0) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, 0);
        const sub = syncProtocol.readSyncMessage(dec, enc, this.doc, 'remoto');
        if (encoding.length(enc) > 1) this.enviar(encoding.toUint8Array(enc));
        if (sub === 1 && !this.sincronizado) this.alSincronizar();
      } else if (tipo === 1) {
        awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(dec), 'remoto');
      }
    } catch (e) { console.error('[colab] mensaje ilegible:', e); }
  }

  private alSincronizar() {
    const primera = !this.primeraSync;
    this.sincronizado = true;
    this.estado = 'vivo';
    this.primeraSync = true;
    this.fallosIniciales = 0;
    if (primera) this.crearUndo();
    // Lo que el editor tenga y Yjs todavía no (escrito antes de conectar, o sin
    // red) sube ahora; y lo que Yjs tenga baja.
    const ed = this.cb.leerEditor();
    if (ed && this.edita) this.empujarPlano(ed);
    const plano = leerPlano(this.doc);
    this.fijarEspejo(plano);
    this.avisarInfo();
    this.cb.alRemoto(plano, { estructura: true, textos: new Map(), titulo: null, tocados: new Set() }, primera ? 'primera' : 'remoto');
    this.reenviarPresencia();
  }

  private alCerrar(ev: CloseEvent) {
    this.limpiarSocket();
    // El servidor dice «no»: sin sesión, sin permiso o la página ya no existe.
    if (ev.code === 4401 || ev.code === 4403 || ev.code === 4404) { this.abandonar(ev.reason || 'Sin acceso a esta página'); return; }
    this.fallo();
  }

  private fallo() {
    if (this.destruido) return;
    if (!this.primeraSync) {
      this.fallosIniciales++;
      // Nunca ha llegado a sincronizar: puede que aquí no se pueda (proxy,
      // sin permiso). Se deja el camino de siempre.
      if (this.fallosIniciales >= 3) { this.abandonar('No se ha podido conectar'); return; }
    }
    this.sincronizado = false;
    if (this.primeraSync) this.estado = 'reconectando';
    this.avisarInfo();
    const base = ESPERAS[Math.min(this.intento++, ESPERAS.length - 1)];
    const espera = base * (0.75 + Math.random() * 0.5);
    this.timerReintento = setTimeout(() => { this.timerReintento = null; this.conectar(); }, espera);
  }

  /** La conexión se da por muerta (sin avisar): se cierra y se reintenta. */
  private caer() {
    const ws = this.ws;
    this.limpiarSocket();
    try { ws?.close(); } catch { /* ya */ }
    this.fallo();
  }

  private reconectarYa() {
    if (this.destruido || this.estado === 'abandonado') return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.timerReintento) { clearTimeout(this.timerReintento); this.timerReintento = null; }
    this.intento = 0;
    this.limpiarSocket();
    this.conectar();
  }

  private limpiarSocket() {
    clearInterval(this.timerLatido!); clearTimeout(this.timerRespuesta!); clearTimeout(this.timerEstable!);
    const ws = this.ws; this.ws = null;
    if (ws) { ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null; try { ws.close(); } catch { /* ya */ } }
    this.sincronizado = false;
    // Los demás ya no están (su estado se refrescará al volver).
    const otros = [...this.awareness.getStates().keys()].filter(id => id !== this.doc.clientID);
    if (otros.length) awarenessProtocol.removeAwarenessStates(this.awareness, otros, 'remoto');
  }

  private abandonar(motivo: string) {
    this.estado = 'abandonado';
    this.motivoAbandono = motivo;
    this.limpiarSocket();
    this.avisarInfo();
  }

  destruir() {
    this.destruido = true;
    if (this.timerReintento) clearTimeout(this.timerReintento);
    this.limpiarSocket();
    for (const q of this.quitar) q();
    this.quitar = [];
    try { this.undo?.destroy(); } catch { /* ya */ }
    try { this.awareness.destroy(); } catch { /* ya */ }
    try { this.doc.destroy(); } catch { /* ya */ }
  }

  // ── EDITOR → YJS ─────────────────────────────────────────────────────────
  private get puedeEmpujar() { return this.primeraSync && this.edita && !this.destruido && this.estado !== 'abandonado'; }

  /** Cada tecla de un bloque: sólo su texto. */
  texto(id: string, t: string) {
    if (!this.puedeEmpujar) return;
    const b = this.espejoPorId.get(id);
    const m = raices(this.doc).mapa.get(id);
    const yt = m?.get('texto');
    if (!b || !(yt instanceof Y.Text)) return;        // bloque nuevo: sube con `empujar`
    if (b.texto === t) return;
    this.doc.transact(() => {
      const viejo = yt.toString();
      // Se aplica la diferencia sobre lo que Yjs tiene AHORA (no sobre el espejo).
      if (viejo !== t) { const d = diferenciaTexto(viejo, t); if (d.quitar) yt.delete(d.i, d.quitar); if (d.poner) yt.insert(d.i, d.poner); }
    }, 'local');
    b.texto = t;
  }

  /** Cada letra del título. */
  titulo(t: string) {
    if (!this.puedeEmpujar) return;
    if (this.espejo.titulo === t) return;
    const yt = raices(this.doc).meta.get('titulo');
    if (!(yt instanceof Y.Text)) return;
    this.doc.transact(() => {
      const viejo = yt.toString();
      if (viejo !== t) { const d = diferenciaTexto(viejo, t); if (d.quitar) yt.delete(d.i, d.quitar); if (d.poner) yt.insert(d.i, d.poner); }
    }, 'local');
    this.espejo.titulo = t;
  }

  /** Todo lo demás: estructura, campos, tablas… Barato si no cambió nada. */
  empujar(plano: Plano) {
    if (!this.puedeEmpujar) return;
    this.empujarPlano(plano);
  }

  private empujarPlano(plano: Plano) {
    const mio = limpiarPlano(plano);
    // Una acción de estructura (mover, borrar, insertar) es un paso de deshacer
    // aparte, no se junta con lo que se estaba tecleando.
    const mismos = mio.bloques.length === this.espejo.bloques.length && mio.bloques.every((b, i) => b.id === this.espejo.bloques[i].id);
    if (!mismos) this.undo?.stopCapturing();
    try { aplicarCambios(this.doc, this.espejo, mio, 'local'); }
    catch (e: any) { this.cb.alAviso?.(e?.message || 'No se ha podido enviar el cambio.'); return; }
    this.espejo = mio;
    this.indexar();
  }

  // ── YJS → EDITOR ─────────────────────────────────────────────────────────
  private encolar(c: CambiosRemotos, origen: 'remoto' | 'deshacer') {
    if (!this.primeraSync) return;      // la primera entrega la hace `alSincronizar`
    if (!this.pendiente) this.pendiente = { estructura: false, textos: new Map(), titulo: null, tocados: new Set() };
    const p = this.pendiente;
    p.estructura ||= c.estructura;
    for (const [k, v] of c.textos) p.textos.set(k, v);
    if (c.titulo) p.titulo = c.titulo;
    for (const t of c.tocados) p.tocados.add(t);
    // Un deshacer manda sobre lo remoto para decidir dónde queda el cursor.
    if (origen === 'deshacer') this.origenPendiente = 'deshacer';
    if (this.programado) return;
    this.programado = true;
    queueMicrotask(() => this.entregar());
  }

  private entregar() {
    this.programado = false;
    const c = this.pendiente; const origen = this.origenPendiente;
    this.pendiente = null; this.origenPendiente = 'remoto';
    if (!c || this.destruido) return;
    // Primero sube lo que el editor tuviera sin enviar…
    const ed = this.cb.leerEditor();
    if (ed && this.edita) this.empujarPlano(ed);
    // …y luego se le entrega lo nuevo.
    const plano = leerPlano(this.doc);
    this.fijarEspejo(plano);
    this.cb.alRemoto(plano, c, origen);
    this.avisarInfo();
  }

  // ── DESHACER (cada persona deshace SOLO lo suyo) ─────────────────────────
  private crearUndo() {
    const { orden, mapa, meta } = raices(this.doc);
    this.undo = new Y.UndoManager([orden, mapa, meta], { trackedOrigins: new Set(['local']), captureTimeout: 1000, doc: this.doc } as any);
    const cambio = () => this.avisarInfo();
    this.undo.on('stack-item-added', cambio);
    this.undo.on('stack-item-popped', cambio);
    this.undo.on('stack-cleared', cambio);
  }
  get pasos() { return { atras: this.undo?.undoStack.length ?? 0, adelante: this.undo?.redoStack.length ?? 0 }; }
  deshacer(): boolean {
    if (!this.undo || !this.undo.undoStack.length) return false;
    // Lo que el editor tenga sin enviar entra antes, para que cuente como suyo.
    const ed = this.cb.leerEditor(); if (ed && this.edita) this.empujarPlano(ed);
    this.undo.stopCapturing();
    this.undo.undo();
    return true;
  }
  rehacer(): boolean {
    if (!this.undo || !this.undo.redoStack.length) return false;
    this.undo.stopCapturing();
    this.undo.redo();
    return true;
  }

  // ── PRESENCIA ────────────────────────────────────────────────────────────
  /** Lo que ve el resto de mí: dónde estoy y qué tengo seleccionado. */
  ponerPresencia(p: { bloque: string | null; cursor: { a: any; h: any } | null; sig?: string | null } | null) {
    if (this.destruido) return;
    if (!p) { this.awareness.setLocalState(null); return; }
    const estado = { bloque: p.bloque, cursor: p.cursor, sig: p.sig ?? null };
    const f = JSON.stringify(estado);
    if (f === this.ultimaPresencia && this.awareness.getLocalState() !== null) return;
    this.ultimaPresencia = f;
    this.awareness.setLocalState(estado);
  }
  private reenviarPresencia() {
    const e = this.awareness.getLocalState();
    if (e !== null) this.awareness.setLocalState({ ...e });
  }
  private avisarPresencia() {
    if (!this.cb.alPresencia) return;
    const personas: PresenciaPersona[] = [];
    this.awareness.getStates().forEach((s: any, clientId: number) => {
      if (!s?.user?.id) return;
      personas.push({
        clientId, yo: clientId === this.doc.clientID,
        id: s.user.id, nombre: s.user.nombre, color: s.user.color, avatar: s.user.avatar || null, edita: !!s.user.edita,
        bloque: s.bloque || null, cursor: s.cursor || null, sig: s.sig || null,
      });
    });
    this.cb.alPresencia(personas);
  }

  // ── INFORMACIÓN PARA LA PANTALLA ─────────────────────────────────────────
  private avisarInfo() {
    this.cb.alInfo({
      estado: this.estado, edita: this.edita, sincronizado: this.primeraSync, version: this.version, yo: this.yo,
      pasos: this.pasos, motivoAbandono: this.motivoAbandono,
    });
  }

  /** Posiciones relativas (para el cursor de los demás): sobreviven a lo que
   *  otras personas escriban delante. */
  posicionRelativa(id: string, indice: number): any | null {
    const t = raices(this.doc).mapa.get(id)?.get('texto');
    if (!(t instanceof Y.Text)) return null;
    return Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(t, Math.max(0, Math.min(indice, t.length))));
  }
  indiceDesdeRelativa(id: string, rel: any): number | null {
    const t = raices(this.doc).mapa.get(id)?.get('texto');
    if (!(t instanceof Y.Text) || !rel) return null;
    try {
      const abs = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(rel), this.doc);
      return abs && abs.type === t ? abs.index : null;
    } catch { return null; }
  }
  /** El texto crudo de un bloque, tal como está en el documento. */
  textoDe(id: string): string | null {
    const t = raices(this.doc).mapa.get(id)?.get('texto');
    return t instanceof Y.Text ? t.toString() : null;
  }
  /** ¿Cambió algo en el documento que el editor no tenga? (para pruebas) */
  firmaDoc() { return firma(leerPlano(this.doc)); }
}

/** Qué cambió entre dos textos (ver `diferencia` en `colabTexto.ts`). */
function diferenciaTexto(viejo: string, nuevo: string) { return diferencia(viejo, nuevo) ?? { i: 0, quitar: 0, poner: '' }; }
