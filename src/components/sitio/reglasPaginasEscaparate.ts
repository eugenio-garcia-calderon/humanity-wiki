// ============================================================================
// LAS PÁGINAS PROPIAS DEL ESCAPARATE: COLABORA, SALA DE PRENSA Y QUIÉNES SOMOS (2026-11-07)
// ============================================================================
// Eugenio, sobre luzhumanidad.com: «con alta calidad, no quiero nada cutre».
//
// Son páginas normales de la plataforma y se escriben en el editor de siempre: su
// texto (títulos, párrafos, el «Sobre Light Humanity» para periodistas…) son bloques
// de los de siempre. Lo que se calcula solo va en UN bloque de datos, `escaparate`
// (`bloquesDatos/escaparate`), que dice en `datos.seccion` qué parte es:
//
//   · Colabora: las formas de colaborar (cada tarjeta elige su motivo en el
//     formulario) y el formulario «Quiero colaborar» (`FormularioColabora`).
//   · Sala de prensa: el contacto de prensa, las cifras (las de la portada), las
//     notas de prensa (las páginas de los proyectos), lo publicado en los medios por
//     años, los logotipos y las fotos con su crédito.
//   · Quiénes somos: la organización, las áreas del laboratorio, el equipo, la
//     historia y el mapa de la portada, la transparencia y, al final, la llamada a
//     colaborar (que lleva a «Colabora»).
//
// Así Eugenio mueve, quita o rodea de texto cada parte sin que nadie toque código, y
// una cifra, un proyecto o una noticia nuevos salen solos. Lo pinta el navegador
// (`sitio/SeccionesEscaparate.tsx`) y lo escribe el servidor dentro del HTML
// (`server/paginasEscaparate.tsx`), con el mismo componente y los mismos datos. Este fichero no importa
// React: lo leen los dos lados.

/** Las partes que sabe pintar el bloque `escaparate`, con el nombre que ve quien edita. */
export const SECCIONES_ESCAPARATE = {
  formas: 'Formas de colaborar',
  formulario: 'Formulario «Quiero colaborar»',
  contacto: 'Contacto de prensa',
  cifras: 'Cifras del laboratorio',
  notas: 'Notas de prensa',
  medios: 'En los medios, por años',
  marca: 'Logotipos',
  fotos: 'Fotos con su crédito',
  organizacion: 'La organización',
  areas: 'Las áreas del laboratorio',
  equipo: 'El equipo',
  portada: 'Historia y mapa de la portada',
  transparencia: 'Transparencia',
  llamada: 'Llamada a colaborar',
} as const;
export type SeccionEscaparate = keyof typeof SECCIONES_ESCAPARATE;

/** La sección de un bloque `escaparate`, o `null` si no es uno (o no se conoce). */
export function seccionDe(b: any): SeccionEscaparate | null {
  const s = b?.tipo === 'escaparate' ? b?.datos?.seccion : null;
  return typeof s === 'string' && Object.prototype.hasOwnProperty.call(SECCIONES_ESCAPARATE, s) ? s as SeccionEscaparate : null;
}

/** Las secciones que hay en una lista de bloques (a cualquier profundidad). */
export function seccionesDe(bloques: unknown, out = new Set<SeccionEscaparate>(), prof = 0): Set<SeccionEscaparate> {
  if (!Array.isArray(bloques) || prof > 8) return out;
  for (const b of bloques) {
    const s = seccionDe(b);
    if (s) out.add(s);
    seccionesDe(b?.bloques, out, prof + 1);
    if (Array.isArray(b?.columnas)) for (const c of b.columnas) seccionesDe(Array.isArray(c) ? c : c?.bloques, out, prof + 1);
  }
  return out;
}

/** Qué es la página para schema.org, por lo que enseña: el formulario la hace de
 *  contacto; la organización, el equipo o la transparencia, «quiénes somos»; las notas,
 *  los medios o el kit de prensa, una colección (la sala de prensa). */
export function tipoDePagina(s: Set<SeccionEscaparate>): 'ContactPage' | 'AboutPage' | 'CollectionPage' | 'WebPage' {
  if (s.has('formulario') || s.has('formas')) return 'ContactPage';
  if (s.has('organizacion') || s.has('equipo') || s.has('transparencia')) return 'AboutPage';
  if (s.has('notas') || s.has('medios') || s.has('marca') || s.has('fotos')) return 'CollectionPage';
  return 'WebPage';
}

// ── LAS FORMAS DE COLABORAR (las tarjetas de «Colabora») ─────────────────────
// Una por motivo del formulario (`formularios.ts`). Cada una elige su motivo en el
// formulario de la misma página; la donación y la prensa llevan además a su página
// (`datos.enlaces.donacion` y `datos.enlaces.prensa` del bloque: una dirección del
// sitio, «/donar»). Los textos se pueden cambiar por bloque (`datos.textos`).
// Lo que dicen sale de lo que ya cuenta la web: la página de donar (una vez o cada
// mes, con tarjeta; empresas, fundaciones y administraciones) y el formulario.
export type FormaColaborar = {
  motivo: 'voluntariado' | 'donacion' | 'empresa' | 'prensa';
  titulo: string;
  texto: string;
  /** El botón que elige el motivo en el formulario. */
  accion: string;
  /** Si lleva además a otra página: la clave de `datos.enlaces` y el texto de su botón. */
  enlace?: { clave: 'donacion' | 'prensa'; texto: string };
};

export const FORMAS_COLABORAR: FormaColaborar[] = [
  {
    motivo: 'voluntariado', titulo: 'Voluntariado',
    texto: 'Cuéntanos qué sabes hacer y cuánto tiempo tienes, y buscamos juntos el proyecto en el que encajas.',
    accion: 'Quiero participar',
  },
  {
    motivo: 'donacion', titulo: 'Donación',
    texto: 'Las donaciones sostienen los proyectos del laboratorio. Puedes donar una sola vez o cada mes, con tarjeta.',
    accion: 'Escríbenos sobre tu donación', enlace: { clave: 'donacion', texto: 'Donar' },
  },
  {
    motivo: 'empresa', titulo: 'Empresas y alianzas',
    texto: 'Si tu empresa, fundación o administración quiere patrocinar un proyecto o aportar conocimiento, datos o equipos, hablemos.',
    accion: 'Proponer una alianza',
  },
  {
    motivo: 'prensa', titulo: 'Prensa',
    texto: 'Si eres periodista, en la Sala de prensa tienes los datos, las notas, las imágenes y nuestro contacto.',
    accion: 'Escribir como periodista', enlace: { clave: 'prensa', texto: 'Sala de prensa' },
  },
];

/** Las formas con los textos propios del bloque encima (`datos.textos[motivo]`). */
export function formasDe(datos: any): FormaColaborar[] {
  const t = datos?.textos && typeof datos.textos === 'object' ? datos.textos : {};
  const limpio = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
  return FORMAS_COLABORAR.map(f => ({
    ...f,
    titulo: limpio(t[f.motivo]?.titulo, 60) || f.titulo,
    texto: limpio(t[f.motivo]?.texto, 280) || f.texto,
  }));
}

/** Una dirección del propio sitio («/donar», «/prensa»): nunca otra web ni un `javascript:`. */
export const rutaDelSitio = (v: unknown): string | null =>
  typeof v === 'string' && /^\/(?!\/)[a-z0-9/_#?=&-]*$/i.test(v.trim()) ? v.trim() : null;

/** Adónde lleva una tarjeta, si lleva a algún sitio (`datos.enlaces[clave]`). */
export const enlaceDeForma = (datos: any, f: FormaColaborar): string | null =>
  f.enlace ? rutaDelSitio(datos?.enlaces?.[f.enlace.clave]) : null;

/** La dirección del formulario con el motivo elegido: funciona también sin JavaScript
 *  (el formulario lee `?motivo=` al abrirse) y se puede compartir. */
export const enlaceMotivo = (motivo: string, ancla = 'formulario') => `?motivo=${encodeURIComponent(motivo)}#${ancla}`;

// ── LAS FOTOS DEL KIT DE PRENSA ──────────────────────────────────────────────
// Solo fotos con su crédito escrito en el pie («… Foto: archivo de Light Humanity») y
// solo las de la propia organización: una foto de agencia o de un periódico está en la
// web con su crédito, pero no es nuestra para ofrecerla a la prensa.
//
// Revisión del 2026-11-07: tampoco una foto en la que se ve a menores (el kit invita a
// descargarla y publicarla: el pie de Luz del Amazonas habla de un niño y el de Divulgación
// en Colegios, de alumnas), ni una compartida con otra entidad («Light Humanity / Solar
// Crowd», la imagen con la que Solar Crowd cuenta su historia). La que no encaje por otra
// razón (un cartel con un lema encima) la quita quien edita, en `datos.excluir` del bloque.

/** El crédito de una imagen: lo que va tras «Foto:» o «Imagen:» al final de su pie. Una
 *  «Captura:» (de una pantalla) no es una foto: no cuenta. */
export function creditoDe(pie: unknown): string | null {
  if (typeof pie !== 'string') return null;
  const m = /(?:^|[\s.(])(?:Foto|Fotos|Imagen|Fotograf[ií]a):\s*([^\n]+?)\s*\.?$/i.exec(pie.trim());
  let c = m?.[1]?.trim().replace(/[.\s]+$/, '') || '';
  // «(Foto: Comunidad Solar)»: el paréntesis de cierre es del pie, no del crédito.
  if (c.endsWith(')') && !c.includes('(')) c = c.slice(0, -1).trim();
  return c && c.length <= 120 ? c : null;
}

/** ¿Es una foto de la propia organización? Solo si el crédito ENTERO es su nombre (o «archivo
 *  de» su nombre): «Light Humanity», «archivo de Light Humanity». Una foto compartida con otra
 *  entidad o de un socio («Light Humanity / Solar Crowd», «EFE / Light Humanity») no es solo
 *  nuestra para dársela a la prensa. */
export function creditoPropio(credito: string, nombres: string[]): boolean {
  const plano = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const todo = plano(credito).replace(/^archivo de (la |el )?/, '');
  return !!todo && nombres.map(n => plano(String(n || ''))).filter(n => n.length >= 6).includes(todo);
}

/** ¿Habla de menores el texto de una foto (su texto alternativo o su pie)? Entonces no va en el
 *  kit de prensa: niños, niñas, menores, alumnos, escolares, bebés, adolescentes, colegios… */
export const mencionaMenores = (texto: unknown): boolean => typeof texto === 'string'
  && /(^|[^\p{L}])(niñ[oa]s?|menores?|alumn[oa]s?|escolares|beb[eé]s?|adolescentes?|chic[oa]s?|colegios?|infantil(es)?)(?=$|[^\p{L}])/iu.test(texto);

/** Las fotos que quien edita quitó del kit (`datos.excluir`: sus direcciones). */
export const excluidasDe = (datos: any): Set<string> => new Set(
  (Array.isArray(datos?.excluir) ? datos.excluir : []).filter((u: unknown): u is string => typeof u === 'string').slice(0, 200));

/** Lo que va delante del crédito en su línea: «Foto», «Imagen»… */
export function etiquetaCredito(pie: unknown): string {
  const m = typeof pie === 'string' ? /(Foto|Fotos|Imagen|Fotograf[ií]a):\s*[^:]*$/i.exec(pie.trim()) : null;
  return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : 'Foto';
}

/** El pie sin el crédito (que se enseña aparte). */
export const pieSinCredito = (pie: unknown) => typeof pie === 'string'
  ? pie.replace(/\s*(?:Foto|Fotos|Imagen|Fotograf[ií]a):\s*[^\n]*$/i, '').trim()
  : '';

// ── LOS DATOS DE CADA SECCIÓN ────────────────────────────────────────────────
// Los calcula el servidor (`datosSeccion`, `server/paginasEscaparate.tsx`) con lo que
// la web ya enseña: viajan con la página dentro del propio bloque (`datos.precargado`),
// así que se pintan a la primera, sin otra petición ni un hueco que salte; y fuera de
// la página (el editor) los da `GET /api/sitio/escaparate/:raiz/:seccion`.
export type Red = { red: string; url: string };
export type PersonaSitio = { pagina: string; titulo: string; url: string; foto: string | null; cargo: string | null };
export type AreaSitio = { nombre: string; descripcion: string | null; imagen: string | null; proyectos: Array<{ titulo: string; url: string }> };
export type FotoSitio = {
  url: string; ancho: number | null; alto: number | null; alt: string; pie: string; credito: string; etiqueta: string;
  /** El nombre con el que se descarga («light-humanity-luz-del-amazonas-1.jpg»). */
  descarga: string;
  proyecto: { titulo: string; url: string };
};
export type LogoSitio = { url: string; formato: string; ancho: number | null; alto: number | null; bytes: number | null; descarga: string };
export type NotaPrensa = {
  pagina: string; titulo: string; url: string; ano: string | null; estado: string | null; color: string | null;
  area: string | null; portada: string | null;
  /** El titular y la entradilla de su página (su primer «titulo1» y su párrafo «entradilla»). */
  titular: string | null; entradilla: string | null;
};
export type MedioNoticia = {
  titulo: string; url: string; medio: string; fecha: string | null; fechaTexto: string | null;
  imagen: string | null; logo: string | null; video: boolean; proyectos: Array<{ titulo: string; url: string }>;
};
export type DatosSeccion = {
  /** La página de colaborar del sitio: las tarjetas llevan a su formulario si están en otra página. */
  formas: { colabora: string | null };
  formulario: { email: string | null; redes: Red[] };
  contacto: { email: string | null; colabora: string | null; redes: Red[] };
  cifras: { cifras: Array<{ valor: string; texto: string }> };
  notas: { notas: NotaPrensa[] };
  medios: { noticias: MedioNoticia[]; medios: number };
  marca: { logos: LogoSitio[]; marca: string; organizacion: string; email: string | null };
  fotos: { fotos: FotoSitio[]; organizacion: string };
  organizacion: {
    nombreLegal: string | null; nombres: string[]; fundador: { nombre: string; url: string | null } | null;
    sede: string | null; redes: Red[];
  };
  areas: { areas: AreaSitio[] };
  equipo: { personas: PersonaSitio[] };
  portada: { primerAno: string | null; proyectos: number; paises: string[] };
  transparencia: {
    nombre: string | null; nif: string | null; domicilio: string | null; registro: string | null; email: string | null;
    legales: Array<{ id: string; nombre: string }>;
  };
  /** La página de colaborar del sitio (`sitio.colabora`); sin ella, la llamada no sale. */
  llamada: { colabora: string | null };
};

/** Las redes del pie, solo las que son una dirección `https`. */
export const redesDe = (pie: any): Red[] => (Array.isArray(pie?.redes) ? pie.redes : [])
  .filter((r: any) => typeof r?.red === 'string' && r.red.trim() && typeof r?.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(r.url))
  .map((r: any) => ({ red: r.red.trim(), url: r.url }));

/** Los documentos que el bloque de transparencia enlaza (`datos.documentos`): solo los que de
 *  verdad existen, con su título y su dirección (un fichero de la web o una dirección `https`).
 *  Nunca un hueco «próximamente». */
export function documentosDe(datos: any): Array<{ titulo: string; url: string }> {
  return (Array.isArray(datos?.documentos) ? datos.documentos : [])
    .filter((x: any) => typeof x?.titulo === 'string' && x.titulo.trim() && typeof x?.url === 'string'
      && (/^\/uploads\/(?!privado\/)[^\s"<>]+$/.test(x.url) || /^https:\/\/[^\s"<>]+$/.test(x.url)))
    .slice(0, 20).map((x: any) => ({ titulo: x.titulo.trim().slice(0, 120), url: x.url }));
}

/** Un texto con marcado (negritas, enlaces) como texto llano, para un titular o una entradilla. */
export const textoLlano = (t: unknown, n = 400): string | null => {
  if (typeof t !== 'string') return null;
  const s = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
};

/** Un tamaño de fichero como se lee en España: «26 KB», «1,3 MB». */
export function pesoDe(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('es-ES')} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
}

/** La extensión de una dirección, en mayúsculas («JPG», «PNG»). */
export const formatoDe = (url: string) => (/\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url)?.[1] || '').toUpperCase().replace('JPEG', 'JPG');

/** La ciudad del domicilio («Calle Bahía de Almería 30, 28042, Madrid» → «Madrid»). */
export function ciudadDe(domicilio: unknown): string | null {
  if (typeof domicilio !== 'string' || !domicilio.trim()) return null;
  const partes = domicilio.split(',').map(x => x.trim()).filter(Boolean);
  const ultima = partes[partes.length - 1] || '';
  const sinCp = ultima.replace(/^\d{5}\s*/, '').trim();
  return sinCp && !/\d/.test(sinCp) ? sinCp : null;
}
