// ============================================================================
// CONTENIDO INCRUSTADO DE TERCEROS (2026-10-06, carril editorB, #20)
// ============================================================================
// Figma, Google Maps, Drive/Docs/Sheets/Slides/Forms, Spotify, SoundCloud,
// Loom, CodePen, X (Twitter) y Miro. Al pegar un enlace de uno de ellos, el
// menú de pegado ofrece «Insertar» y el enlace se convierte en la dirección de
// incrustar que ese servicio publica (que casi nunca es la que se copia de la
// barra del navegador).
//
// LA SEGURIDAD VA PRIMERO, y por eso hay UNA sola función que decide:
//   · `embedDe(url)` es lo único que produce el `src` de un iframe. Se llama al
//     PINTAR, no sólo al insertar: lo guardado en una página es la dirección
//     original, y si alguien edita el JSON a mano para meter otra cosa, aquí no
//     pasa de ser un enlace.
//   · Lista blanca estricta de ANFITRIONES exactos (nada de «termina en»: así
//     `figma.com.malo.net` no cuela) y sólo https.
//   · El `src` se arma con los identificadores que se extraen con una expresión
//     estricta (`[A-Za-z0-9_-]`), nunca copiando trozos de la URL pegada; lo
//     único que se copia entera (Figma, SoundCloud) va con `encodeURIComponent`
//     como parámetro, jamás como anfitrión.
//   · Antes de devolverlo se comprueba que el anfitrión FINAL sigue en la lista.
//   · Quien pinta pone `sandbox` (sin `allow-top-navigation`: un embed no puede
//     llevarse la pestaña) y `referrerPolicy` restrictiva. Ver `BloqueEmbed.tsx`.

export interface Embed {
  proveedor: string;
  /** La dirección que va en el iframe. */
  src: string;
  /** Alto por defecto en píxeles (si `relacion` no manda). */
  alto: number;
  /** Ancho/alto si el contenido es de forma fija (vídeo 16:9). */
  relacion?: number;
  /** Permisos del iframe (`allow`). */
  permisos?: string;
}

/** Los únicos anfitriones desde los que se incrusta nada. */
export const ANFITRIONES_EMBED = new Set([
  'www.figma.com', 'www.google.com', 'drive.google.com', 'docs.google.com',
  'open.spotify.com', 'w.soundcloud.com', 'www.loom.com', 'codepen.io',
  'platform.twitter.com', 'miro.com',
]);

const ID = '[A-Za-z0-9_-]+';
const uno = (re: RegExp, s: string) => s.match(re);

function analizar(url: string): URL | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u;
  } catch { return null; }
}

const host = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, '');

export function embedDe(url: string | undefined | null): Embed | null {
  if (!url || url.length > 2000) return null;
  const u = analizar(url);
  if (!u) return null;
  const h = host(u);
  const p = u.pathname;
  let e: Embed | null = null;

  // ── Figma: se le da la URL original como parámetro de su incrustador.
  if (h === 'figma.com' && /^\/(file|design|proto|board|slides|deck|make)\/[A-Za-z0-9]+/.test(p)) {
    e = { proveedor: 'Figma', alto: 450, permisos: 'fullscreen',
      src: `https://www.figma.com/embed?embed_host=humanity&url=${encodeURIComponent(`https://www.figma.com${p}${u.search}`)}` };
  }

  // ── Google Maps: la dirección de «Compartir → Incorporar» tal cual, o un
  //    lugar/búsqueda/coordenadas convertidos a `output=embed`.
  else if ((h === 'google.com' || h === 'maps.google.com') && (p.startsWith('/maps') || h === 'maps.google.com')) {
    if (p.startsWith('/maps/embed')) {
      if (u.searchParams.get('pb') && /^[!\w.,%-]+$/.test(u.searchParams.get('pb')!)) {
        e = { proveedor: 'Google Maps', alto: 400, permisos: 'fullscreen', src: `https://www.google.com/maps/embed?pb=${encodeURIComponent(u.searchParams.get('pb')!)}` };
      }
    } else {
      let q = u.searchParams.get('q') || u.searchParams.get('query') || '';
      const lugar = uno(/^\/maps\/(?:place|search)\/([^/@]+)/, p);
      if (!q && lugar) q = decodeURIComponent(lugar[1].replace(/\+/g, ' '));
      if (!q) { const c = uno(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, p); if (c) q = `${c[1]},${c[2]}`; }
      if (q && q.length <= 200) e = { proveedor: 'Google Maps', alto: 400, permisos: 'fullscreen', src: `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed` };
    }
  }

  // ── Google Drive: un archivo (vista previa) o una carpeta (lista).
  else if (h === 'drive.google.com') {
    const f = uno(new RegExp(`^/file/d/(${ID})`), p) || (p === '/open' || p === '/uc' ? [0, u.searchParams.get('id') || ''] as any : null);
    const c = uno(new RegExp(`^/drive/(?:u/\\d+/)?folders/(${ID})`), p);
    if (f && new RegExp(`^${ID}$`).test(f[1])) e = { proveedor: 'Google Drive', alto: 480, permisos: 'fullscreen', src: `https://drive.google.com/file/d/${f[1]}/preview` };
    else if (c) e = { proveedor: 'Google Drive', alto: 480, src: `https://drive.google.com/embeddedfolderview?id=${c[1]}#list` };
  }

  // ── Google Docs, Sheets, Slides y Forms.
  else if (h === 'docs.google.com') {
    const d = uno(new RegExp(`^/document/d/(${ID})`), p);
    const s = uno(new RegExp(`^/spreadsheets/d/(${ID})`), p);
    const l = uno(new RegExp(`^/presentation/d/(${ID})`), p);
    const f = uno(new RegExp(`^/forms/d/e/(${ID})`), p);
    if (d) e = { proveedor: 'Google Docs', alto: 560, src: `https://docs.google.com/document/d/${d[1]}/preview` };
    else if (s) e = { proveedor: 'Google Sheets', alto: 480, src: `https://docs.google.com/spreadsheets/d/${s[1]}/preview` };
    else if (l) e = { proveedor: 'Google Slides', alto: 420, relacion: 16 / 9, permisos: 'fullscreen', src: `https://docs.google.com/presentation/d/${l[1]}/embed?start=false&loop=false` };
    else if (f) e = { proveedor: 'Google Forms', alto: 640, src: `https://docs.google.com/forms/d/e/${f[1]}/viewform?embedded=true` };
  }

  // ── Spotify.
  else if (h === 'open.spotify.com') {
    const m = uno(new RegExp(`^/(?:intl-[a-z]{2}(?:-[A-Za-z]{2})?/)?(track|album|playlist|episode|show|artist)/(${ID})`), p);
    if (m) e = { proveedor: 'Spotify', alto: m[1] === 'track' || m[1] === 'episode' ? 152 : 352, permisos: 'encrypted-media; clipboard-write', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}` };
  }

  // ── SoundCloud: usuario/pista o usuario/sets/lista.
  else if (h === 'soundcloud.com') {
    const m = uno(/^\/([A-Za-z0-9_-]+)\/(sets\/)?([A-Za-z0-9_-]+)\/?$/, p);
    const reservados = new Set(['discover', 'you', 'stream', 'upload', 'search', 'pages', 'charts', 'tags', 'settings', 'messages', 'notifications']);
    if (m && !reservados.has(m[1])) {
      e = { proveedor: 'SoundCloud', alto: 166, permisos: 'autoplay',
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com/${m[1]}/${m[2] || ''}${m[3]}`)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false` };
    }
  }

  // ── Loom.
  else if (h === 'loom.com') {
    const m = uno(/^\/(?:share|embed)\/([a-f0-9]{16,40})/i, p);
    if (m) e = { proveedor: 'Loom', alto: 360, relacion: 16 / 9, permisos: 'fullscreen', src: `https://www.loom.com/embed/${m[1]}` };
  }

  // ── CodePen (/pen, /full, /details, /embed, /pen).
  else if (h === 'codepen.io') {
    const m = uno(new RegExp(`^/(${ID})/(?:pen|full|details|embed|debug)/(${ID})`), p);
    if (m) e = { proveedor: 'CodePen', alto: 420, src: `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result&theme-id=light` };
  }

  // ── X / Twitter: sólo publicaciones (`/usuario/status/123…`).
  else if (h === 'twitter.com' || h === 'x.com' || h === 'mobile.twitter.com') {
    const m = uno(/^\/[A-Za-z0-9_]{1,15}\/status(?:es)?\/(\d{1,25})/, p);
    if (m) e = { proveedor: 'X', alto: 520, src: `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&dnt=true&lang=es` };
  }

  // ── Miro: un tablero.
  else if (h === 'miro.com') {
    const m = uno(/^\/app\/(?:board|live-embed)\/([A-Za-z0-9_=-]+)/, p);
    if (m) e = { proveedor: 'Miro', alto: 520, permisos: 'fullscreen; clipboard-read; clipboard-write', src: `https://miro.com/app/live-embed/${m[1]}${m[1].endsWith('=') ? '' : '='}/?embedMode=view_only_without_ui&autoplay=true` };
  }

  // La última comprobación, por si algo de arriba se equivocó: el anfitrión
  // que va a salir tiene que estar en la lista.
  if (!e) return null;
  try {
    const f = new URL(e.src);
    if (f.protocol !== 'https:' || !ANFITRIONES_EMBED.has(f.hostname)) return null;
  } catch { return null; }
  return e;
}

/** Los servicios que se pueden pegar, para decirlo en la interfaz. */
export const PROVEEDORES_EMBED = ['Figma', 'Google Maps', 'Google Drive', 'Docs', 'Sheets', 'Slides', 'Forms', 'Spotify', 'SoundCloud', 'Loom', 'CodePen', 'X', 'Miro'];

/** El `sandbox` de todo iframe de un tercero: lo justo para que funcione (su
 *  propio JavaScript, sus formularios, abrir enlaces en pestaña nueva) y nada
 *  más. SIN `allow-top-navigation`: no puede cambiar nuestra página. */
export const SANDBOX_EMBED = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation';
