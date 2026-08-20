// ============================================================================
// EL NAVEGADOR DE LA APP (2026-08-19; Chromium remoto 2026-08-20, petición de
// Eugenio: «dale a Chromium»).
// ============================================================================
// Tres formas de enseñar una web, de mejor a peor, y se usa la mejor posible:
//
//   1. CHROMIUM REMOTO (el modo normal): un navegador de verdad corre en el
//      servidor y aquí solo se pinta su pantalla (fotogramas por SSE) y se le
//      mandan los clics y el teclado. Todo funciona: YouTube, Google, webs con
//      JavaScript. La pantalla viaja SIN sonido — por eso los vídeos no van
//      por aquí, sino por (2).
//   2. REPRODUCTOR OFICIAL para direcciones de vídeo (YouTube/Vimeo): el
//      embed trae imagen Y SONIDO directos del CDN del vídeo.
//   3. PROXY DE LECTURA (`/api/navegador/ver`): si el servidor no tiene
//      Chromium, se cae a la versión de solo-documentos de antes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Search, Loader2, Bot, AlertTriangle, ExternalLink, Star, Home, X, MoreVertical, Minus, Plus as PlusIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { avisarNavegadorRemoto } from './bus';
import { useAuth } from '../../contexts/AuthContext';

/** Lo que se escribe en la barra → una dirección de verdad. Si no parece una
 *  dirección, se busca: es lo que espera cualquiera de una barra así. */
export function comoUrl(texto: string, buscadorReal = false): string {
  const t = texto.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  // Un dominio suelto («wikipedia.org», «dji.com/es»): se le pone el https.
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) return `https://${t}`;
  // En Chromium remoto se busca en el DuckDuckGo normal; el proxy de lectura
  // solo digiere la versión html.
  return buscadorReal
    ? `https://duckduckgo.com/?q=${encodeURIComponent(t)}`
    : `https://duckduckgo.com/html/?q=${encodeURIComponent(t)}`;
}

const proxy = (url: string) => `/api/navegador/ver?url=${encodeURIComponent(url)}`;

/** La pantalla de inicio del navegador. Es una dirección propia y no una
 *  cadena vacía para que quepa en la historia como cualquier otra página. */
export const INICIO = 'about:inicio';
const esPantallaInicio = (u: string) => !u || u === INICIO || u === 'about:blank';

export interface Favorito { url: string; titulo: string }

/** Lo que ve alguien que todavía no ha guardado ninguna: los sitios que
 *  Eugenio nombró al pedir esto. No se guardan solos —son sugerencias—, así
 *  que el cajón sigue siendo suyo. */
const SUGERENCIAS: Favorito[] = [
  { url: 'https://www.youtube.com/', titulo: 'YouTube' },
  { url: 'https://web.whatsapp.com/', titulo: 'WhatsApp Web' },
  { url: 'https://mail.google.com/', titulo: 'Gmail' },
  { url: 'https://calendar.google.com/', titulo: 'Calendar' },
];

/** El dominio, que es lo que identifica un sitio de un vistazo. */
const dominio = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/** El icono del sitio, servido por nuestro proxy para que no haya una
 *  petición directa a un tercero desde la app. */
const favicon = (u: string) =>
  `/api/navegador/ver?url=${encodeURIComponent(`https://icons.duckduckgo.com/ip3/${dominio(u)}.ico`)}`;

/** Un vídeo tiene puerta oficial: el reproductor embebido, que trae imagen y
 *  sonido directos de su CDN. Ni el proxy ni el screencast pueden darle el
 *  sonido; el embed existe exactamente para meterse en otras webs. */
export function reproductorDe(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^(www|m|music)\./, '');
    if (h === 'youtu.be') {
      const id = u.pathname.split('/')[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      const v = u.pathname === '/watch' && u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
      if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    }
    if (h === 'vimeo.com') {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch { /* no era una dirección */ }
  return null;
}

export default function Navegador({ inicial, onTitulo, onUrl, controles, onMover, arrastrable }: {
  inicial: string;
  onTitulo?: (t: string) => void;
  onUrl?: (u: string) => void;
  /** Los botones de la ventana. Desde que la barra de título desapareció por
   *  duplicar el nombre de la pestaña (Eugenio, 2026-08-20), viven al final de
   *  esta barra: el navegador ya tenía la suya y no hacía falta otra. */
  controles?: React.ReactNode;
  onMover?: (e: React.PointerEvent) => void;
  arrastrable?: boolean;
}) {
  const { user, updateUiSettings } = useAuth();
  const favoritos: Favorito[] = Array.isArray(user?.uiSettings?.favoritosWeb)
    ? user!.uiSettings!.favoritosWeb : [];
  const [modo, setModo] = useState<'remoto' | 'proxy'>('remoto');
  const [sesion, setSesion] = useState<string | null>(null);
  const [reinicios, setReinicios] = useState(0);
  const [url, setUrl] = useState(inicial);
  const [texto, setTexto] = useState(inicial);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  // La historia local solo manda en modo proxy; en remoto la lleva Chromium.
  const [historia, setHistoria] = useState<string[]>([inicial]);
  const [donde, setDonde] = useState(0);

  const cont = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const marcoProxy = useRef<HTMLIFrameElement>(null);
  const sesionRef = useRef<string | null>(null);
  const tamanoRef = useRef({ ancho: 1024, alto: 700 });

  // EL ZOOM, como en Chrome (Eugenio, 2026-08-20: «el mensaje de cookies de
  // YouTube no se puede aceptar porque no da la pantalla para verlo […] que te
  // permita hacer un + y un - con una lupa»).
  //
  // CÓMO FUNCIONA, que es la parte bonita: el zoom NO escala la imagen que
  // llega. Lo que hace es pedirle a Chromium una VENTANA MÁS GRANDE — al 50 %,
  // el doble de ancha y de alta— y encajarla en el mismo hueco. Así cabe el
  // doble de página, exactamente como al alejar en un navegador de verdad, y
  // el texto se ve nítido porque lo dibuja Chromium a ese tamaño, no lo
  // estiramos nosotros.
  //
  // Por eso el zoom vive AQUÍ y el servidor no sabe nada de él: para él solo
  // ha cambiado el tamaño de la ventana, que es algo que ya sabía hacer.
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  /** Los saltos de Chrome. El 100 % siempre está y es donde se empieza. */
  const PASOS = [0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
  /** El tamaño de ventana que toca para el hueco y el zoom de ahora. */
  const tamanoParaZoom = (c: HTMLElement | null, z: number) => ({
    ancho: Math.round((c?.clientWidth || 1024) / z),
    alto: Math.round((c?.clientHeight || 700) / z),
  });
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);
  const autoReinicios = useRef(0);
  const urlRef = useRef(inicial);
  const tituloActual = useRef<string>('');

  useEffect(() => { setTexto(url); urlRef.current = url; onUrl?.(url); }, [url]);

  // Los gestos van EN COLA, uno detrás de otro: si cada tecla viajara en su
  // propia petición suelta, dos pulsaciones rápidas podrían adelantarse y
  // «aptera» llegaría como «aapret» (visto en pruebas, 2026-08-20).
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const enviar = useCallback((cuerpo: Record<string, unknown>) => {
    const id = sesionRef.current;
    if (!id) return;
    cola.current = cola.current
      .then(() => fetch(`/api/navegador/remoto/${id}/entrada`, {
        method: 'POST', credentials: 'include', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      }))
      .catch(() => { /* un gesto perdido no es un error */ });
  }, []);

  /** Cambiar el zoom: se pide a Chromium una ventana del tamaño que toca y se
   *  guarda para que el redimensionado de la ventana lo respete. */
  const aplicarZoom = useCallback((z: number) => {
    setZoom(z);
    zoomRef.current = z;
    const { ancho, alto } = {
      ancho: Math.round((cont.current?.clientWidth || 1024) / z),
      alto: Math.round((cont.current?.clientHeight || 700) / z),
    };
    tamanoRef.current = { ancho, alto };
    enviar({ tipo: 'tamano', ancho, alto });
  }, [enviar]);

  /** Un salto arriba o abajo por la escala de Chrome. */
  const cambiarZoom = useCallback((paso: number) => {
    const PASOS_L = [0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
    const i = PASOS_L.indexOf(zoomRef.current);
    const actual = i >= 0 ? i : PASOS_L.findIndex(p => p >= zoomRef.current);
    const siguiente = Math.min(PASOS_L.length - 1, Math.max(0, (actual < 0 ? 5 : actual) + paso));
    aplicarZoom(PASOS_L[siguiente]);
  }, [aplicarZoom]);


  // --- Arrancar (y rearrancar) la sesión remota -----------------------------
  useEffect(() => {
    if (modo !== 'remoto') return;
    // En la pantalla de inicio no se levanta Chromium: sería arrancar un
    // navegador entero (150-400 MB) para enseñar cuatro tarjetas.
    if (esPantallaInicio(urlRef.current)) { setCargando(false); return; }
    let vivo = true;
    (async () => {
      try {
        const c = cont.current;
        const { ancho, alto } = tamanoParaZoom(c, zoomRef.current);
        tamanoRef.current = { ancho, alto };
        const destino = reproductorDe(urlRef.current) ? 'about:blank' : urlRef.current;
        const r = await fetch('/api/navegador/remoto', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          // La densidad de TU pantalla: en Retina los fotogramas llegan al
          // doble de resolución y se ven nítidos, no estirados.
          body: JSON.stringify({ url: destino, ancho, alto, escala: Math.min(window.devicePixelRatio || 1, 2) }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'no disponible');
        const j = await r.json();
        if (!vivo) {
          fetch(`/api/navegador/remoto/${j.sesion}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
          return;
        }
        sesionRef.current = j.sesion;
        setSesion(j.sesion);
        avisarNavegadorRemoto(j.sesion);
      } catch {
        if (!vivo) return;
        // Sin Chromium en el servidor: el navegador de lectura de siempre.
        // La historia del modo lectura se SIEMBRA con la página actual: si no,
        // el efecto que sincroniza `url` con la historia la devolvía a la
        // pantalla de inicio y el clic en un favorito no iba a ningún sitio
        // (visto en pruebas, 2026-08-20).
        setHistoria([urlRef.current]);
        setDonde(0);
        setModo('proxy');
        setCargando(true);
      }
    })();
    return () => { vivo = false; };
  }, [modo, reinicios]);

  // Cerrar la ventana cierra la pestaña del servidor: sin esto, cada apertura
  // dejaría un Chromium huérfano gastando memoria hasta el barrido por
  // inactividad.
  useEffect(() => () => {
    const id = sesionRef.current;
    sesionRef.current = null;
    if (id) {
      avisarNavegadorRemoto(null);
      fetch(`/api/navegador/remoto/${id}`, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {});
    }
  }, []);

  // --- La pantalla en directo ----------------------------------------------
  useEffect(() => {
    if (!sesion) return;
    const es = new EventSource(`/api/navegador/remoto/${sesion}/pantalla`, { withCredentials: true });
    es.onmessage = ev => {
      try {
        const d = JSON.parse(ev.data);
        if (d.t === 'marco' && img.current) {
          img.current.src = 'data:image/jpeg;base64,' + d.d;
          setCargando(false);
        } else if (d.t === 'url' && typeof d.url === 'string' && d.url !== 'about:blank') {
          setUrl(d.url);
          setCargando(false);
          if (d.titulo) { tituloActual.current = String(d.titulo); onTitulo?.(String(d.titulo).slice(0, 60)); }
        } else if (d.t === 'aviso') {
          setAviso(String(d.texto || ''));
          setCargando(false);
        } else if (d.t === 'fin') {
          es.close();
        }
      } catch { /* un fotograma roto no es un error */ }
    };
    // Si la sesión caducó en el servidor (inactividad), se abre otra sola —
    // con un tope, para no entrar en bucle si el servidor está mal.
    es.onerror = async () => {
      const r = await fetch(`/api/navegador/remoto/${sesion}/leer`, { credentials: 'include' }).catch(() => null);
      if (r && r.status === 404 && sesionRef.current === sesion) {
        es.close();
        if (autoReinicios.current++ < 3) { setSesion(null); setReinicios(n => n + 1); }
        else setAviso('La sesión de navegación se ha perdido. Pulsa recargar.');
      }
    };
    return () => es.close();
  }, [sesion]);

  // Si la ventana cambia de tamaño, la pestaña remota se ajusta (con calma:
  // durante un arrastre de redimensionado llegan decenas de medidas).
  useEffect(() => {
    if (modo !== 'remoto' || !cont.current) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const c = cont.current;
        if (!c) return;
        const { ancho, alto } = tamanoParaZoom(c, zoomRef.current);
        if (Math.abs(ancho - tamanoRef.current.ancho) < 8 && Math.abs(alto - tamanoRef.current.alto) < 8) return;
        tamanoRef.current = { ancho, alto };
        enviar({ tipo: 'tamano', ancho, alto });
      }, 400);
    });
    ro.observe(cont.current);
    return () => { ro.disconnect(); if (t) clearTimeout(t); };
  }, [modo, enviar]);

  // Un vídeo se saca del Chromium (que no tiene sonido) y se abre con el
  // reproductor oficial; la pestaña remota se aparca en blanco para que no
  // siga reproduciendo a ciegas.
  const video = reproductorDe(url);
  useEffect(() => {
    if (modo === 'remoto' && sesion && video) enviar({ tipo: 'navegar', url: 'about:blank' });
  }, [video, sesion]);

  // --- Entrada del usuario hacia la pestaña remota -------------------------
  const coords = (e: { clientX: number; clientY: number }) => {
    const r = cont.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { x: 0, y: 0 };
    return {
      x: Math.round((e.clientX - r.left) * (tamanoRef.current.ancho / r.width)),
      y: Math.round((e.clientY - r.top) * (tamanoRef.current.alto / r.height)),
    };
  };
  const ultimoMueve = useRef(0);
  const ultimoClic = useRef({ t: 0, x: 0, y: 0, cuenta: 1 });

  const alPulsar = (e: React.PointerEvent) => {
    cont.current?.focus();
    const { x, y } = coords(e);
    const ahora = Date.now();
    const u = ultimoClic.current;
    // El doble clic hay que declararlo (clickCount): sin esto, seleccionar una
    // palabra con doble clic no funcionaría en la pestaña remota.
    const cuenta = ahora - u.t < 400 && Math.abs(x - u.x) < 6 && Math.abs(y - u.y) < 6 ? u.cuenta + 1 : 1;
    ultimoClic.current = { t: ahora, x, y, cuenta };
    enviar({ tipo: 'raton', accion: 'abajo', x, y, boton: e.button, cuenta });
  };
  const alSoltar = (e: React.PointerEvent) => {
    const { x, y } = coords(e);
    enviar({ tipo: 'raton', accion: 'arriba', x, y, boton: e.button, cuenta: ultimoClic.current.cuenta });
  };
  // El movimiento del ratón también se descarta si ya hay uno en vuelo: la
  // posición es absoluta, así que perder los puntos intermedios no se nota, y
  // evita que un arrastre llene la cola igual que hacía la rueda.
  const moverEnVuelo = useRef(false);
  const alMover = (e: React.PointerEvent) => {
    const ahora = Date.now();
    if (moverEnVuelo.current || ahora - ultimoMueve.current < 30) return;
    ultimoMueve.current = ahora;
    const { x, y } = coords(e);
    const id = sesionRef.current;
    if (!id) return;
    moverEnVuelo.current = true;
    fetch(`/api/navegador/remoto/${id}/entrada`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'raton', accion: 'mueve', x, y }),
    }).catch(() => {}).finally(() => { moverEnVuelo.current = false; });
  };

  // La rueda necesita un listener nativo no-pasivo para poder preventDefault:
  // si no, la página de la app se desplazaría a la vez que la remota.
  //
  // Y va SUMADA, no evento a evento (arreglo del tirón al desplazarse,
  // 2026-08-20): un solo gesto del trackpad dispara decenas de eventos por
  // segundo y, como las entradas van en cola, cada uno esperaba al viaje de
  // ida y vuelta del anterior — la cola se llenaba y la página seguía bajando
  // segundos después de que tú pararas. Ahora los desplazamientos se acumulan
  // y solo hay UNO en vuelo: al llegar la respuesta se manda la suma de lo que
  // se haya acumulado mientras tanto. Nunca se atasca y no se pierde recorrido.
  const rueda = useRef({ dx: 0, dy: 0, x: 0, y: 0, enVuelo: false });
  useEffect(() => {
    const c = cont.current;
    if (modo !== 'remoto' || !c) return;

    const soltarRueda = () => {
      const r = rueda.current;
      if (!r.dx && !r.dy) { r.enVuelo = false; return; }
      const dx = r.dx, dy = r.dy, x = r.x, y = r.y;
      r.dx = 0; r.dy = 0; r.enVuelo = true;
      const id = sesionRef.current;
      if (!id) { r.enVuelo = false; return; }
      fetch(`/api/navegador/remoto/${id}/entrada`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'rueda', x, y, dx: Math.round(dx), dy: Math.round(dy) }),
      }).catch(() => {}).finally(soltarRueda);
    };

    const alRodar = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = coords(e);
      const r = rueda.current;
      r.dx += e.deltaX; r.dy += e.deltaY; r.x = x; r.y = y;
      if (!r.enVuelo) soltarRueda();
    };
    c.addEventListener('wheel', alRodar, { passive: false });
    return () => c.removeEventListener('wheel', alRodar);
  }, [modo]);

  const alTeclear = (e: React.KeyboardEvent) => {
    // ⌘V pega TU portapapeles en la pestaña remota.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then(t => { if (t) enviar({ tipo: 'texto', texto: t }); }).catch(() => {});
      return;
    }
    // ⌘←/→ es el cambio de ventana del Escritorio: se deja pasar.
    if (e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Dead'].includes(e.key)) return;
    e.preventDefault();
    const k = e.key === ' ' ? 'Space' : e.key;
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // El carácter ya viene con su mayúscula o su tilde: se teclea tal cual.
      enviar({ tipo: 'tecla', k });
      return;
    }
    const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.metaKey && 'Meta', e.shiftKey && k.length > 1 && 'Shift']
      .filter(Boolean) as string[];
    enviar({ tipo: 'tecla', k: [...mods, k].join('+') });
  };

  // --- Favoritos -----------------------------------------------------------
  const enFavoritos = favoritos.some(f => f.url === url);
  const alternarFavorito = async () => {
    if (!user || esPantallaInicio(url)) return;
    const nuevos = enFavoritos
      ? favoritos.filter(f => f.url !== url)
      // El título de la pestaña si el servidor ya lo dijo; si no, el dominio.
      : [...favoritos, { url, titulo: tituloActual.current || dominio(url) }];
    await updateUiSettings({ favoritosWeb: nuevos });
  };

  // --- La barra ------------------------------------------------------------
  const ir = (destino: string) => {
    const u = destino === INICIO ? INICIO : comoUrl(destino, modo === 'remoto');
    if (!u) return;
    setAviso(null);
    setCargando(!esPantallaInicio(u));
    if (modo === 'remoto') {
      setUrl(u);
      // Volver al inicio cierra la pestaña remota: no tiene sentido pagar un
      // Chromium por una pantalla de tarjetas.
      if (esPantallaInicio(u)) {
        const id = sesionRef.current;
        sesionRef.current = null;
        setSesion(null);
        avisarNavegadorRemoto(null);
        if (id) fetch(`/api/navegador/remoto/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
      } else if (!sesionRef.current) {
        // Se venía del inicio: hay que levantar la sesión otra vez.
        autoReinicios.current = 0;
        setReinicios(n => n + 1);
      } else if (!reproductorDe(u)) enviar({ tipo: 'navegar', url: u });
    } else {
      setHistoria(h => [...h.slice(0, donde + 1), u]);
      setDonde(d => d + 1);
    }
  };
  const atras = () => {
    if (modo === 'remoto') { setCargando(true); enviar({ tipo: 'atras' }); }
    else if (donde > 0) { setCargando(true); setDonde(d => d - 1); }
  };
  const alante = () => {
    if (modo === 'remoto') { setCargando(true); enviar({ tipo: 'adelante' }); }
    else if (donde < historia.length - 1) { setCargando(true); setDonde(d => d + 1); }
  };
  const recargar = () => {
    setAviso(null);
    setCargando(true);
    if (modo === 'remoto') {
      if (sesionRef.current) enviar({ tipo: 'recargar' });
      else { autoReinicios.current = 0; setReinicios(n => n + 1); }
    } else setRecarga(n => n + 1);
  };

  // En modo proxy la dirección manda: historia local + iframe.
  const urlProxy = historia[donde] || '';
  useEffect(() => {
    if (modo !== 'proxy') return;
    setUrl(urlProxy);
  }, [modo, urlProxy]);

  // El proxy no avisa del título por SSE: se le pregunta al servidor.
  useEffect(() => {
    if (modo !== 'proxy' || !url) return;
    let vivo = true;
    fetch(`/api/navegador/leer?url=${encodeURIComponent(url)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!vivo) return;
        if (j.error) { setAviso(j.error); return; }
        if (j.titulo) onTitulo?.(j.titulo.slice(0, 60));
      })
      .catch(() => { /* el marco enseñará su propio error */ });
    return () => { vivo = false; };
  }, [modo, url]);

  // La página avisa por postMessage de dónde está (solo en modo proxy).
  useEffect(() => {
    if (modo !== 'proxy') return;
    const alMensaje = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.navegadorHumanity !== 'aqui' || typeof d.url !== 'string') return;
      setCargando(false);
      setHistoria(h => (h[donde] === d.url ? h : [...h.slice(0, donde + 1), d.url]));
      setDonde(dd => (historia[dd] === d.url ? dd : dd + 1));
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [modo, donde, historia]);

  return (
    <div className="flex flex-col h-full">
      {/* La barra */}
      <div
        onPointerDown={onMover}
        className={cn('flex items-center gap-1 px-1.5 py-1 border-b border-slate-200 bg-slate-50 shrink-0 select-none',
          arrastrable && 'cursor-grab active:cursor-grabbing')}
      >
        <button onClick={atras} disabled={modo === 'proxy' && donde === 0} title="Atrás"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={alante} disabled={modo === 'proxy' && donde >= historia.length - 1} title="Adelante"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={() => ir(INICIO)} title="Tus favoritos"
          className={cn('w-7 h-7 grid place-items-center rounded-lg transition-colors',
            esPantallaInicio(url) ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:bg-slate-200')}>
          <Home className="w-3.5 h-3.5" />
        </button>
        <button onClick={recargar} title="Recargar"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200">
          {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        </button>
        <form
          onSubmit={e => { e.preventDefault(); ir(texto); }}
          className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 focus-within:border-sky-300"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onFocus={e => e.currentTarget.select()}
            placeholder="Escribe una dirección o busca…"
            className="flex-1 min-w-0 text-[11px] text-slate-700 focus:outline-none bg-transparent"
          />
        </form>
        {/* La salida de emergencia: abrir la dirección en una pestaña del
            navegador de verdad (para iniciar sesión en sitios, por ejemplo). */}
        {user && !esPantallaInicio(url) && (
          <button onClick={alternarFavorito}
            title={enFavoritos ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            className={cn('w-7 h-7 grid place-items-center rounded-lg shrink-0 transition-colors',
              enFavoritos ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200')}>
            <Star className={cn('w-3.5 h-3.5', enFavoritos && 'fill-amber-400')} />
          </button>
        )}
        <button onClick={() => { if (url && !esPantallaInicio(url)) window.open(url, '_blank', 'noopener'); }}
          title="Abrir en una pestaña del navegador"
          className="w-7 h-7 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-200 shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        {modo === 'proxy' && (
          <span title="El Chromium del servidor no está disponible: versión de solo lectura"
            className="hidden sm:flex items-center px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 shrink-0">
            lectura
          </span>
        )}
        <span title="La IA del chat ve esta página"
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shrink-0">
          <Bot className="w-3 h-3" />La IA lo ve
        </span>

        {controles && <div className="flex items-center gap-0.5 shrink-0">{controles}</div>}

        {/* LOS TRES PUNTITOS DEL NAVEGADOR: los ajustes de la ventana. De
            momento el zoom, que es lo que hacía falta — un aviso de cookies que
            no cabe en la pantalla no se puede aceptar, y alejando sí. */}
        {modo === 'remoto' && !esPantallaInicio(url) && (
          <div className="relative shrink-0" ref={menuRef}>
            <button onClick={() => setMenuAbierto(o => !o)} title="Ajustes del navegador"
              className={cn('w-7 h-7 grid place-items-center rounded-lg transition-colors',
                menuAbierto ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-200')}>
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuAbierto && (
              <div className="absolute top-9 right-0 w-56 bg-white border border-slate-200 shadow-2xl rounded-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="px-1 pb-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Zoom</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => cambiarZoom(-1)} disabled={zoom <= PASOS[0]}
                    title="Alejar" className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => aplicarZoom(1)} title="Volver al 100 %"
                    className="flex-1 h-8 grid place-items-center rounded-lg border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 tabular-nums">
                    {Math.round(zoom * 100)} %
                  </button>
                  <button onClick={() => cambiarZoom(1)} disabled={zoom >= PASOS[PASOS.length - 1]}
                    title="Acercar" className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="mt-2 px-1 text-[10px] text-slate-400 leading-relaxed">
                  Alejar hace que quepa más página — útil cuando un aviso de cookies
                  no cabe entero y no deja aceptarlo.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {aviso && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{aviso}</span>
        </div>
      )}

      {/* Un vídeo va SIEMPRE en el reproductor oficial: es el único modo con
          sonido. Sin nuestro sandbox (es de otro origen, no puede tocar la
          app, y necesita su almacenamiento) y CON Referer (YouTube responde
          «Error 153» si no sabe quién lo embebe). */}
      {esPantallaInicio(url) ? (
        /* Tus sitios, en tarjetas. Es lo primero que ves al abrir el
           navegador (petición de Eugenio, 2026-08-20). */
        <div className="flex-1 min-h-0 overflow-y-auto bg-white p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
            {favoritos.length ? 'Tus favoritos' : 'Para empezar'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {(favoritos.length ? favoritos : SUGERENCIAS).map(f => (
              <div key={f.url} className="group relative">
                <button
                  onClick={() => ir(f.url)}
                  className="w-full flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <img src={favicon(f.url)} alt="" loading="lazy"
                    className="w-8 h-8 rounded-lg object-contain bg-slate-50"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                  <span className="text-[11px] font-black text-slate-700 truncate max-w-full">{f.titulo}</span>
                  <span className="text-[9px] font-bold text-slate-400 truncate max-w-full">{dominio(f.url)}</span>
                </button>
                {favoritos.length > 0 && user && (
                  <button
                    onClick={() => updateUiSettings({ favoritosWeb: favoritos.filter(x => x.url !== f.url) })}
                    title="Quitar de favoritos"
                    className="absolute top-1.5 right-1.5 w-5 h-5 grid place-items-center rounded-full bg-white border border-slate-200 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11px] text-slate-400 leading-relaxed">
            {favoritos.length
              ? 'Escribe una dirección arriba, o pulsa la estrella en cualquier página para guardarla aquí.'
              : 'Estas son sugerencias. Abre una página y pulsa la estrella ★ de la barra para guardarla como favorita tuya.'}
          </p>
        </div>
      ) : video ? (
        <iframe
          key={`${url}|${recarga}`}
          src={video}
          title="Reproductor de vídeo"
          onLoad={() => setCargando(false)}
          className="flex-1 w-full border-0 bg-black"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : modo === 'remoto' ? (
        /* La pantalla del Chromium del servidor. El <img> se actualiza a mano
           con cada fotograma; el div captura ratón, rueda y teclado. */
        <div
          ref={cont}
          tabIndex={0}
          onPointerDown={alPulsar}
          onPointerUp={alSoltar}
          onPointerMove={alMover}
          onKeyDown={alTeclear}
          onContextMenu={e => e.preventDefault()}
          className="relative flex-1 min-h-0 bg-white outline-none overflow-hidden cursor-default select-none"
        >
          <img ref={img} alt="" draggable={false} className="w-full h-full" />
          {cargando && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      ) : (
        /* Respaldo de lectura. `allow-scripts` SIN `allow-same-origin`: la
           página corre su código pero en un origen OPACO, sin acceso a
           nuestras cookies ni a la app. Poner los dos juntos es lo peligroso;
           este par es el correcto. */
        <iframe
          ref={marcoProxy}
          key={`${url}|${recarga}`}
          src={url ? proxy(url) : 'about:blank'}
          title="Navegador"
          onLoad={() => setCargando(false)}
          className="flex-1 w-full border-0 bg-white"
          sandbox="allow-scripts allow-forms allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
