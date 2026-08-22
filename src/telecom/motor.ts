// ============================================================================
// EL MOTOR DE LAS TELECOMUNICACIONES (2026-08-22)
// ============================================================================
// Eugenio: «quiero que esta plataforma sustituya a WhatsApp, que se pueda
// enviar mensajes y hacer llamadas y videollamadas compartiendo pantalla».
//
// ── POR QUÉ ESTO NO ES UN CONTEXTO DE REACT ────────────────────────────────
// Aquí vive una conexión abierta con el servidor, un temporizador de timbre y
// una conexión de audio y vídeo con otra persona. Ninguna de las tres puede
// morir y volver a nacer porque React haya vuelto a pintar, y ninguna puede
// existir dos veces. Un contexto se monta donde se monte el proveedor y se
// desmonta con él; esto es un módulo, así que hay UNO en toda la pestaña,
// pase lo que pase por encima.
//
// La parte de React son doce líneas al final (`useTelecom`), que solo miran.
//
// ── EL MAPA DE UNA LLAMADA, DE PRINCIPIO A FIN ─────────────────────────────
//   1. Quien llama pide micrófono (y cámara) ANTES de llamar. Si lo deniegan,
//      no ha sonado nada en casa de nadie: se falla en silencio y para uno.
//   2. `POST /api/telecom/llamada` → al otro le suena el teléfono.
//   3. El otro descuelga → el servidor le dice a quien llamó CON QUÉ APARATO.
//   4. Quien llamó fabrica una «oferta» (esto es lo que sé hacer y por dónde
//      se me puede alcanzar), el otro contesta con la suya, y los dos van
//      soltando direcciones candidatas hasta que una funciona.
//   5. A partir de ahí el servidor sobra: el audio va directo, cifrado.
//
// ── LA DECISIÓN MENOS OBVIA DE TODO EL FICHERO ─────────────────────────────
// La conexión se crea SIEMPRE con un carril de audio y un carril de vídeo,
// incluso en una llamada de voz, y el de vídeo empieza vacío.
//
// Parece un desperdicio y es justo lo contrario. Encender la cámara o
// compartir pantalla a mitad de una llamada, si el carril no existe, obliga a
// renegociarlo todo con el otro lado: otra oferta, otra respuesta, y un par de
// segundos de nada durante los cuales cualquier fallo te tira la llamada
// entera. Con el carril ya puesto, encender la cámara es cambiarle la cinta a
// un carril que ya está montado (`replaceTrack`): es instantáneo y el otro
// lado no negocia nada. Un carril vacío no gasta ancho de banda.
//
// PERO LOS CARRILES LOS MONTA SOLO QUIEN LLAMA, y esto costó encontrarlo.
// Cuando los montaban los dos, quien contestaba acababa con CUATRO: los dos
// suyos, que no entraban en la respuesta y por tanto no transmitían nada, y
// los dos que le llegaban en la oferta. Se veía como una llamada que conecta,
// enseña la cara de uno y no la del otro. Quien contesta no monta ninguno: los
// crea `setRemoteDescription` al aplicar la oferta, y él solo les pone su cinta
// y les abre los dos sentidos.

export interface Ficha { id: string; nombre: string; avatar?: string | null; handle?: string | null }

export type FaseLlamada = 'sonando' | 'llamando' | 'conectando' | 'hablando';

export interface Llamada {
  id: string;
  con: Ficha;
  /** Cómo empezó: 'audio' o 'video'. La cámara se puede encender después. */
  tipo: 'audio' | 'video';
  /** ¿Me llaman a mí (true) o llamo yo? */
  entrante: boolean;
  fase: FaseLlamada;
  /** Cuándo se descolgó, para el cronómetro. */
  desde: number | null;
  micro: boolean;
  camara: boolean;
  pantalla: boolean;
  /** ¿Está llegando imagen del otro lado? */
  hayVideoRemoto: boolean;
  /** El aviso que se pinta encima de la llamada («no se ha podido conectar»). */
  aviso: string | null;
}

export interface EstadoTelecom {
  /** ¿Hay cable con el servidor? Si no, ni suena ni llegan mensajes. */
  conectado: boolean;
  dispositivo: string | null;
  /** Quién está en línea ahora mismo, de la gente con la que hablas. */
  presentes: string[];
  /** persona → hasta cuándo se considera que está escribiendo. */
  escribiendo: Record<string, number>;
  llamada: Llamada | null;
  /** Lo que se oye y se ve del otro lado, y lo mío. Fuera del estado no
   *  cabrían: son objetos vivos que los `<video>` enchufan directamente. */
  streamLocal: MediaStream | null;
  streamRemoto: MediaStream | null;
}

let estado: EstadoTelecom = {
  conectado: false,
  dispositivo: null,
  presentes: [],
  escribiendo: {},
  llamada: null,
  streamLocal: null,
  streamRemoto: null,
};

const oyentes = new Set<() => void>();
const publicar = (parcial: Partial<EstadoTelecom>) => {
  estado = { ...estado, ...parcial };
  for (const f of oyentes) f();
};
const cambiarLlamada = (parcial: Partial<Llamada>) => {
  if (!estado.llamada) return;
  publicar({ llamada: { ...estado.llamada, ...parcial } });
};

export const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); } };
export const leerEstado = () => estado;

// ── LO QUE NO ES ESTADO DE PINTAR ───────────────────────────────────────────
let fuente: EventSource | null = null;
let pc: RTCPeerConnection | null = null;
let carrilAudio: RTCRtpSender | null = null;
let carrilVideo: RTCRtpSender | null = null;
let pistaCamara: MediaStreamTrack | null = null;
let pistaPantalla: MediaStreamTrack | null = null;
/** Las direcciones candidatas que llegan antes de que haya con qué usarlas.
 *  Pasa siempre: viajan por HTTP y adelantan a la oferta más de la mitad de
 *  las veces. Tirarlas es tirar la llamada. */
let candidatasEnEspera: RTCIceCandidateInit[] = [];
let servidoresHielo: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
let hayTurn = false;

const api = async (url: string, cuerpo?: any, metodo = 'POST') => {
  const r = await fetch(url, {
    method: metodo,
    credentials: 'include',
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'No se ha podido.');
  return j;
};

// ══ EL TIMBRE ═══════════════════════════════════════════════════════════════
// SIN FICHERO DE SONIDO, a propósito: un mp3 de timbre son 30-80 KB que se
// descargan al abrir la aplicación por si acaso alguien llama. Dos osciladores
// y una envolvente hacen el mismo ring-ring de siempre y pesan cero.
//
// EL NAVEGADOR NO DEJA SONAR SIN PERMISO, y aquí eso muerde: cuando te llaman
// no has tocado nada, así que el navegador considera que el sonido no lo has
// pedido tú. Por eso el contexto de audio se desbloquea con el PRIMER toque
// que des en la aplicación, sea el que sea, y se queda listo para cuando haga
// falta. Si abres la pestaña y no tocas nada en toda la mañana, la llamada
// entra igual y se ve, pero puede no sonar. No hay forma de arreglar eso desde
// una página web, y por eso el aviso del sistema (abajo) es importante.
let audio: AudioContext | null = null;
let sonando: { parar: () => void } | null = null;

export function desbloquearAudio() {
  if (audio) { if (audio.state === 'suspended') audio.resume().catch(() => {}); return; }
  try {
    audio = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch { audio = null; }
}

function timbrar(entrante: boolean) {
  pararTimbre();
  desbloquearAudio();
  if (!audio) return;
  const ctx = audio;
  let vivo = true;
  const unRing = () => {
    if (!vivo || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const vol = ctx.createGain();
    vol.connect(ctx.destination);
    // Entrante: dos notas, más alto. Saliente: el tono largo y grave del
    // «está llamando», más bajo, que no es para llamar tu atención sino para
    // decirte que algo pasa.
    const notas = entrante ? [880, 1046.5] : [420];
    const dur = entrante ? 0.32 : 1.0;
    notas.forEach((hz, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      const g = ctx.createGain();
      const t0 = t + i * (dur + 0.06);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(entrante ? 0.18 : 0.06, t0 + 0.03);
      g.gain.setValueAtTime(entrante ? 0.18 : 0.06, t0 + dur - 0.05);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      o.connect(g); g.connect(vol);
      o.start(t0); o.stop(t0 + dur + 0.02);
    });
  };
  unRing();
  const cada = setInterval(unRing, entrante ? 2200 : 3500);
  // VIBRAR ES LO QUE FUNCIONA EN UN MÓVIL CON EL SONIDO QUITADO, que es como
  // va medio mundo. En iPhone no existe y no pasa nada: se ignora.
  const vibrar = entrante && typeof navigator.vibrate === 'function'
    ? setInterval(() => navigator.vibrate?.([400, 200, 400]), 2200)
    : null;
  if (entrante) navigator.vibrate?.([400, 200, 400]);
  sonando = {
    parar: () => { vivo = false; clearInterval(cada); if (vibrar) clearInterval(vibrar); navigator.vibrate?.(0); },
  };
}
const pararTimbre = () => { sonando?.parar(); sonando = null; };

/** EL AVISO DEL SISTEMA. Es lo que hace que una llamada te salte aunque tengas
 *  la pestaña detrás de otras diez, que es como va a estar el 90 % del tiempo.
 *  Solo si la persona ya dio permiso: pedirlo en el momento de una llamada
 *  entrante sería enseñar un cuadro de diálogo del navegador encima del
 *  teléfono sonando. */
function avisoDelSistema(titulo: string, cuerpo: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return;
    const n = new Notification(titulo, { body: cuerpo, icon: '/logo.svg', tag: 'humanity-llamada' });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* que no suene un aviso no puede romper una llamada */ }
}

/** Se pide cuando la persona ENCIENDE su número, no al entrar en la web. */
export async function pedirPermisoDeAvisos(): Promise<boolean> {
  try {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  } catch { return false; }
}

// ══ EL CABLE ════════════════════════════════════════════════════════════════
let reintento = 0;
let reconexion: any = null;

export function conectar() {
  if (fuente) return;
  fetch('/api/telecom/hielo', { credentials: 'include' })
    .then(r => r.json())
    .then(d => { if (Array.isArray(d?.servidores)) servidoresHielo = d.servidores; hayTurn = Boolean(d?.hayTurn); })
    .catch(() => {});

  const es = new EventSource('/api/telecom/conexion', { withCredentials: true });
  fuente = es;

  es.onopen = () => { reintento = 0; publicar({ conectado: true }); };

  es.onerror = () => {
    publicar({ conectado: false });
    // El navegador reintenta solo, pero cada tres segundos y para siempre.
    // Aquí se cierra y se reabre con una espera que crece: si el servidor está
    // caído, cien pestañas pegándole cada tres segundos son parte del problema.
    es.close();
    if (fuente === es) fuente = null;
    if (reconexion) clearTimeout(reconexion);
    const espera = Math.min(30_000, 1000 * 2 ** Math.min(reintento++, 5));
    reconexion = setTimeout(() => { if (!fuente) conectar(); }, espera);
  };

  es.onmessage = (ev) => {
    let d: any;
    try { d = JSON.parse(ev.data); } catch { return; }
    manejar(d).catch(e => console.error('[telecom]', e));
  };
}

export function desconectar() {
  if (reconexion) clearTimeout(reconexion);
  fuente?.close();
  fuente = null;
  publicar({ conectado: false, dispositivo: null, presentes: [] });
}

/** Eventos que el resto de la aplicación escucha sin conocer este módulo:
 *  la pantalla de Mensajes se entera de un mensaje nuevo por aquí. */
const gritar = (nombre: string, detalle: any) =>
  window.dispatchEvent(new CustomEvent(`telecom:${nombre}`, { detail: detalle }));

async function manejar(d: any) {
  switch (d.tipo) {
    case 'hola':
      publicar({ dispositivo: d.dispositivo, conectado: true });
      break;

    case 'presencia': {
      const s = new Set(estado.presentes);
      if (d.conectado) s.add(d.quien); else s.delete(d.quien);
      publicar({ presentes: [...s] });
      gritar('presencia', d);
      break;
    }

    case 'escribiendo':
      publicar({ escribiendo: { ...estado.escribiendo, [d.quien]: d.hasta } });
      break;

    case 'mensaje':
      gritar('mensaje', d);
      break;

    case 'entregados':
    case 'leidos':
      gritar(d.tipo, d);
      break;

    // ── LA LLAMADA ────────────────────────────────────────────────────────
    case 'llamada_entrante': {
      // OCUPADO. Si ya estoy en una llamada, la nueva se rechaza sola: dos
      // llamadas a la vez comparten micrófono y no se oye ninguna.
      if (estado.llamada) { api(`/api/telecom/llamada/${d.llamadaId}/colgar`).catch(() => {}); break; }
      publicar({
        llamada: {
          id: d.llamadaId, con: d.de, tipo: d.llamada === 'video' ? 'video' : 'audio',
          entrante: true, fase: 'sonando', desde: null,
          micro: true, camara: d.llamada === 'video', pantalla: false,
          hayVideoRemoto: false, aviso: null,
        },
      });
      timbrar(true);
      avisoDelSistema(
        `${d.de?.nombre || 'Alguien'} te llama`,
        d.llamada === 'video' ? 'Videollamada en humanity.wiki' : 'Llamada en humanity.wiki',
      );
      break;
    }

    case 'llamada_cogida_en_otro_sitio':
      if (estado.llamada?.id === d.llamadaId) { pararTimbre(); publicar({ llamada: null }); }
      break;

    case 'llamada_contestada': {
      // Soy quien llamó y acaban de descolgar. Ahora sé con qué aparato hablo.
      if (estado.llamada?.id !== d.llamadaId) break;
      pararTimbre();
      cambiarLlamada({ fase: 'conectando', desde: Date.now() });
      await negociarComoQuienLlama();
      break;
    }

    case 'senal':
      await recibirSenal(d);
      break;

    case 'llamada_terminada': {
      if (estado.llamada?.id !== d.llamadaId) break;
      const razon =
        d.estado === 'rechazada' || d.estado === 'perdida' ? 'No ha contestado.'
        : d.estado === 'sin_conexion' ? 'No tiene la aplicación abierta.'
        : null;
      cerrarTodo(razon);
      gritar('llamada_terminada', d);
      break;
    }
  }
}

// ══ LA CONEXIÓN DIRECTA ═════════════════════════════════════════════════════

function crearConexion(llamadaId: string, montarCarriles: boolean) {
  const conexion = new RTCPeerConnection({ iceServers: servidoresHielo });

  // Los dos carriles, desde el principio, y SOLO en quien llama. Ver la
  // explicación de la cabecera: en quien contesta los crea la propia oferta.
  if (montarCarriles) {
    carrilAudio = conexion.addTransceiver('audio', { direction: 'sendrecv' }).sender;
    carrilVideo = conexion.addTransceiver('video', { direction: 'sendrecv' }).sender;
  }

  const remoto = new MediaStream();
  publicar({ streamRemoto: remoto });

  conexion.ontrack = (ev) => {
    for (const p of ev.streams[0]?.getTracks() || [ev.track]) {
      if (!remoto.getTracks().includes(p)) remoto.addTrack(p);
    }
    if (ev.track.kind === 'video') {
      // UN CARRIL DE VÍDEO VACÍO TAMBIÉN LLEGA, y llega «silenciado». Si se
      // pintara sin mirar esto, una llamada de voz enseñaría un rectángulo
      // negro enorme donde debería estar la cara de nadie.
      const refrescar = () => cambiarLlamada({ hayVideoRemoto: !ev.track.muted });
      ev.track.onunmute = refrescar;
      ev.track.onmute = refrescar;
      refrescar();
    }
  };

  conexion.onicecandidate = (ev) => {
    if (!ev.candidate) return;
    api('/api/telecom/senal', { llamadaId, tipo: 'candidata', datos: ev.candidate.toJSON() }).catch(() => {});
  };

  conexion.onconnectionstatechange = () => {
    const s = conexion.connectionState;
    if (s === 'connected') cambiarLlamada({ fase: 'hablando', aviso: null, desde: estado.llamada?.desde || Date.now() });
    if (s === 'failed') {
      // AQUÍ ES DONDE SE NOTA NO TENER TURN, y se dice con esas palabras en
      // vez de dejar a alguien mirando «conectando…» para siempre.
      cambiarLlamada({
        aviso: hayTurn
          ? 'No se ha podido establecer la conexión.'
          : 'No se ha podido conectar. Suele pasar en redes de empresa o móviles muy cerradas.',
      });
      colgar().catch(() => {});
    }
  };

  pc = conexion;
  return conexion;
}

/** El micrófono y, si toca, la cámara. */
async function pedirMedios(conVideo: boolean): Promise<MediaStream> {
  const medios = await navigator.mediaDevices.getUserMedia({
    // Lo que hace que una llamada por internet suene a llamada y no a lata.
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: conVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
  });
  publicar({ streamLocal: medios });
  pistaCamara = medios.getVideoTracks()[0] || null;
  return medios;
}

function engancharMedios(medios: MediaStream) {
  const a = medios.getAudioTracks()[0] || null;
  const v = medios.getVideoTracks()[0] || null;
  carrilAudio?.replaceTrack(a).catch(() => {});
  if (v) carrilVideo?.replaceTrack(v).catch(() => {});
}

async function negociarComoQuienLlama() {
  const l = estado.llamada;
  if (!l) return;
  const conexion = pc || crearConexion(l.id, true);
  if (estado.streamLocal) engancharMedios(estado.streamLocal);
  const oferta = await conexion.createOffer();
  await conexion.setLocalDescription(oferta);
  await api('/api/telecom/senal', { llamadaId: l.id, tipo: 'oferta', datos: conexion.localDescription });
}

async function recibirSenal(d: any) {
  const l = estado.llamada;
  if (!l || l.id !== d.llamadaId) return;

  if (d.senal === 'oferta') {
    const conexion = pc || crearConexion(l.id, false);
    await conexion.setRemoteDescription(new RTCSessionDescription(d.datos));

    // AHORA YA EXISTEN LOS CARRILES: los ha creado la oferta. Se les abre el
    // sentido de subida y se les pone la cinta. Si se hiciera al revés —cinta
    // primero, oferta después— sería sobre carriles distintos de los que van
    // a viajar, que es exactamente el fallo que tuvo esto el primer día.
    for (const t of conexion.getTransceivers()) {
      const clase = t.receiver.track?.kind;
      if (clase === 'audio') { t.direction = 'sendrecv'; carrilAudio = t.sender; }
      if (clase === 'video') { t.direction = 'sendrecv'; carrilVideo = t.sender; }
    }
    if (estado.streamLocal) engancharMedios(estado.streamLocal);
    const respuesta = await conexion.createAnswer();
    await conexion.setLocalDescription(respuesta);
    await api('/api/telecom/senal', { llamadaId: l.id, tipo: 'respuesta', datos: conexion.localDescription });
    await soltarCandidatasEnEspera();
    return;
  }

  if (d.senal === 'respuesta') {
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(d.datos));
    await soltarCandidatasEnEspera();
    return;
  }

  if (d.senal === 'candidata') {
    if (!pc || !pc.remoteDescription) { candidatasEnEspera.push(d.datos); return; }
    try { await pc.addIceCandidate(new RTCIceCandidate(d.datos)); } catch { /* una candidata mala no rompe nada */ }
  }
}

async function soltarCandidatasEnEspera() {
  if (!pc) return;
  const pendientes = candidatasEnEspera;
  candidatasEnEspera = [];
  for (const c of pendientes) {
    try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ídem */ }
  }
}

/** Se recoge TODO: si algo se queda encendido, la luz de la cámara del portátil
 *  se queda encendida, y eso —con razón— asusta. */
function cerrarTodo(aviso: string | null) {
  pararTimbre();
  candidatasEnEspera = [];
  try { pc?.close(); } catch { /* ya estaba */ }
  pc = null; carrilAudio = null; carrilVideo = null;
  estado.streamLocal?.getTracks().forEach(t => t.stop());
  pistaPantalla?.stop();
  pistaCamara = null; pistaPantalla = null;
  const ultimo = estado.llamada;
  publicar({ llamada: null, streamLocal: null, streamRemoto: null });
  if (aviso && ultimo) gritar('aviso', { texto: aviso, con: ultimo.con });
}

// ══ LO QUE HACE LA PERSONA ══════════════════════════════════════════════════

/** Llamar. `destino` puede ser una persona o un número de teléfono. */
export async function llamar(destino: Ficha | { telefono: string }, tipo: 'audio' | 'video' = 'audio') {
  if (estado.llamada) throw new Error('Ya estás en una llamada.');
  if (!estado.dispositivo) throw new Error('No hay conexión con el servidor. Recarga la página.');
  desbloquearAudio();

  // EL MICRÓFONO PRIMERO, Y ESO ES DELIBERADO. Si se llamara antes, el teléfono
  // de la otra persona sonaría y solo entonces aparecería aquí el cuadro de
  // permiso del navegador — que puede tardar o denegarse. Alguien descolgando
  // una llamada que no existe es de las peores cosas que puede hacer esto.
  let medios: MediaStream;
  try {
    medios = await pedirMedios(tipo === 'video');
  } catch (e: any) {
    throw new Error(
      e?.name === 'NotAllowedError'
        ? 'El navegador no te deja usar el micrófono. Dale permiso en el candado de la barra de direcciones.'
        : 'No he encontrado micrófono en este aparato.',
    );
  }

  try {
    const esPersona = 'id' in destino;
    const r = await api('/api/telecom/llamada', {
      ...(esPersona ? { para: (destino as Ficha).id } : { telefono: (destino as any).telefono }),
      tipo, dispositivo: estado.dispositivo,
    });
    const con: Ficha = r.para || (esPersona ? destino as Ficha : { id: '', nombre: 'Desconocido' });

    if (r.estado === 'sin_conexion') {
      medios.getTracks().forEach(t => t.stop());
      publicar({ streamLocal: null });
      throw new Error(r.mensaje || `${con.nombre} no tiene la aplicación abierta.`);
    }

    publicar({
      llamada: {
        id: r.id, con, tipo, entrante: false, fase: 'llamando', desde: null,
        micro: true, camara: tipo === 'video', pantalla: false,
        hayVideoRemoto: false, aviso: null,
      },
    });
    timbrar(false);
    return r.id as string;
  } catch (e) {
    medios.getTracks().forEach(t => t.stop());
    publicar({ streamLocal: null });
    throw e;
  }
}

export async function contestar() {
  const l = estado.llamada;
  if (!l || !l.entrante || !estado.dispositivo) return;
  pararTimbre();
  cambiarLlamada({ fase: 'conectando', desde: Date.now() });
  try {
    const medios = await pedirMedios(l.tipo === 'video');
    // La conexión sí, los carriles no: llegan con la oferta y se enganchan
    // allí. Los medios se piden ya para que el permiso del micrófono se
    // resuelva mientras el otro lado prepara su oferta.
    crearConexion(l.id, false);
    await api(`/api/telecom/llamada/${l.id}/contestar`, { dispositivo: estado.dispositivo });
  } catch (e: any) {
    cambiarLlamada({ aviso: e?.name === 'NotAllowedError' ? 'No has dado permiso para el micrófono.' : (e?.message || 'No se ha podido descolgar.') });
    await colgar();
  }
}

export async function colgar() {
  const l = estado.llamada;
  cerrarTodo(null);
  if (l) await api(`/api/telecom/llamada/${l.id}/colgar`).catch(() => {});
}

export function alternarMicro() {
  const l = estado.llamada;
  const pista = estado.streamLocal?.getAudioTracks()[0];
  if (!l || !pista) return;
  pista.enabled = !pista.enabled;
  cambiarLlamada({ micro: pista.enabled });
}

/**
 * Encender o apagar la cámara a mitad de llamada.
 *
 * Con el carril ya montado esto es cambiar la cinta, no renegociar. Si la
 * llamada empezó siendo de voz, la cámara no existe todavía y hay que pedirla:
 * es la única vez que aparece un permiso a mitad de conversación.
 */
export async function alternarCamara() {
  const l = estado.llamada;
  if (!l) return;
  if (l.camara) {
    pistaCamara?.stop();
    pistaCamara = null;
    if (!l.pantalla) await carrilVideo?.replaceTrack(null).catch(() => {});
    cambiarLlamada({ camara: false });
    return;
  }
  try {
    const extra = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, facingMode: 'user' } });
    pistaCamara = extra.getVideoTracks()[0];
    estado.streamLocal?.addTrack(pistaCamara);
    if (!l.pantalla) await carrilVideo?.replaceTrack(pistaCamara);
    cambiarLlamada({ camara: true });
  } catch {
    cambiarLlamada({ aviso: 'No he podido encender la cámara.' });
  }
}

/**
 * COMPARTIR PANTALLA.
 *
 * `getDisplayMedia` es quien enseña el selector del sistema —pantalla entera,
 * una ventana o una pestaña— y NO se puede elegir por ella desde aquí: lo elige
 * la persona, y está bien que sea así.
 *
 * Se ocupa el mismo carril que la cámara. Podrían mandarse los dos a la vez
 * (dos carriles de vídeo), y no se hace: en una llamada de trabajo, la cara del
 * que comparte cabe en el mismo hueco pequeño y el ancho de banda de subida de
 * una casa española no da para 720p por duplicado sin que la pantalla, que es
 * lo que importa, se vuelva ilegible.
 */
export async function alternarPantalla() {
  const l = estado.llamada;
  if (!l) return;

  if (l.pantalla) {
    pistaPantalla?.stop();
    pistaPantalla = null;
    // Al dejar de compartir, vuelve la cámara si estaba encendida.
    await carrilVideo?.replaceTrack(l.camara ? pistaCamara : null).catch(() => {});
    cambiarLlamada({ pantalla: false });
    return;
  }

  try {
    const medios = await (navigator.mediaDevices as any).getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 } },
      // El audio de la pantalla (un vídeo que estés enseñando) solo lo dan
      // Chrome y Edge, y solo al compartir una pestaña. Se pide y si no, nada.
      audio: false,
    });
    pistaPantalla = medios.getVideoTracks()[0];
    await carrilVideo?.replaceTrack(pistaPantalla);
    // EL BOTÓN «DEJAR DE COMPARTIR» DEL NAVEGADOR. Lo pone el sistema, fuera de
    // nuestra página, y si no se escucha, la aplicación cree que sigues
    // compartiendo una pantalla que ya no manda nada.
    pistaPantalla.onended = () => {
      pistaPantalla = null;
      carrilVideo?.replaceTrack(estado.llamada?.camara ? pistaCamara : null).catch(() => {});
      cambiarLlamada({ pantalla: false });
    };
    cambiarLlamada({ pantalla: true });
    api(`/api/telecom/llamada/${l.id}/pantalla`).catch(() => {});
  } catch {
    // Cancelar el selector no es un fallo.
  }
}

/** «Está escribiendo…». Se manda como mucho una vez cada tres segundos: una
 *  petición por tecla serían cuarenta para escribir una frase. */
let ultimoAviso = 0;
export function estoyEscribiendo(para: string) {
  const ahora = Date.now();
  if (ahora - ultimoAviso < 3000) return;
  ultimoAviso = ahora;
  api('/api/telecom/escribiendo', { para }).catch(() => {});
}
