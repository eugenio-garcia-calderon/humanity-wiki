// ============================================================================
// EL MENÚ Y EL PIE DE UN SITIO PUBLICADO (2026-10-02)
// ============================================================================
// Eugenio: «un creador de menú para la página pública que sea sofisticado con
// todas las cosas necesarias para un buen menú, pero al mismo tiempo simple
// [...] Y un footer. Tanto el menú como el footer tienen que ser homogéneos en
// toda la página web. Y en el footer la política de privacidad y el aviso
// legal que exige la Unión Europea, el contacto, el logotipo, el nombre».
//
// Se guarda en `config.sitio` de la página que hace de raíz del sitio. Las
// subpáginas no tienen copia: el servidor les manda el de la página más
// cercana por encima que lo tenga (`sitios.ts`). Así es UNO para toda la web y
// cambiarlo en un sitio lo cambia en todas.
//
// Este fichero no importa React ni nada del navegador: lo leen la pantalla,
// el editor y el servidor.

/** Adónde lleva un enlace. Se guarda QUÉ es, no la dirección: «Inicio» es `/`
 *  en un dominio propio y `/@quien/pagina` dentro de humanity.wiki. */
export type Destino =
  | { tipo: 'inicio' }
  | { tipo: 'pagina'; id: string; titulo?: string }
  | { tipo: 'seccion'; bloque: string; titulo?: string }
  /** Una base de datos de esta página (2026-10-08). `scroll`: baja hasta ella
   *  sin salir de la página (el ancla es el id del BLOQUE, no el de la tabla:
   *  la misma tabla puede estar dos veces). `pagina`: abre su página propia
   *  (`/bd/:tabla/:nombre`), con su dirección y sus etiquetas para buscadores. */
  | { tipo: 'basedatos'; tabla: string; bloque?: string; titulo?: string; modo: 'scroll' | 'pagina' }
  | { tipo: 'url'; url: string }
  | { tipo: 'legal'; doc: DocLegal }
  | { tipo: 'contacto' };

export type Enlace = {
  id: string;
  texto: string;
  destino: Destino;
  /** `lucide:Home` o un emoji. Vacío, sin icono. */
  icono?: string;
  estilo?: 'texto' | 'boton';
  /** Abrir en otra pestaña (2026-10-08). Vacío: la misma. No cuenta cuando el
   *  enlace sólo baja por la misma página. */
  nuevaPestana?: boolean;
};

/** Un nombre para la dirección: «Mis Tiendas Ñ» → «mis-tiendas-n». */
export const slugDe = (t?: string | null) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);


export type Tamano = 'pequeno' | 'mediano' | 'grande';

export type Menu = {
  activo: boolean;
  posicion: 'arriba' | 'lateral';
  /** Las tres rayas: nunca, sólo en el teléfono, o siempre. */
  plegado: 'nunca' | 'movil' | 'siempre';
  alineacion: 'izquierda' | 'centro' | 'derecha';
  tamano: Tamano;
  /** Pegado arriba al bajar la página. */
  fijo: boolean;
  fondo: string;
  texto: string;
  /** El color de los enlaces en forma de botón. */
  acento: string;
  /** Vacíos, se usan el icono y el título de la página. */
  logo?: string;
  nombre?: string;
  mostrarLogo: boolean;
  mostrarNombre: boolean;
  /** Una raya fina debajo (arriba) o al lado (lateral). */
  borde: boolean;
  /** Una caja para buscar dentro del sitio (2026-10-18). Apagada en los
   *  sitios que ya existían: su menú no cambia sin que lo decida su autor. */
  buscador?: boolean;
  enlaces: Enlace[];
};

export type DocLegal = 'aviso-legal' | 'privacidad' | 'cookies';

export type Titular = {
  nombre?: string;
  nif?: string;
  domicilio?: string;
  email?: string;
  telefono?: string;
  /** Registro Mercantil u otro, si lo hay. */
  registro?: string;
};

export type Pie = {
  activo: boolean;
  fondo: string;
  texto: string;
  logo?: string;
  nombre?: string;
  mostrarLogo: boolean;
  descripcion?: string;
  contacto: { email?: string; telefono?: string; direccion?: string };
  enlaces: Enlace[];
  /** Qué textos legales se enlazan en el pie. */
  legales: Record<DocLegal, boolean>;
  /** Línea «© 2026 Nombre». */
  copyright: boolean;
  /** EL MAPA WEB (2026-10-26, Eugenio): todas las páginas del sitio, ordenadas por las del menú. Por defecto, sí. */
  mapaWeb: boolean;
  /** Enseñar el correo, el teléfono y la dirección (siguen usándose en los textos legales). */
  mostrarContacto: boolean;
  /** Una sola línea: los textos legales y el correo (2026-11-06, Eugenio en luzhumanidad.com:
   *  «quita el footer; deja solo los avisos legales, la política de privacidad y un correo»). */
  sencillo?: boolean;
  /** EL MAPA DEL SITIO DE UN ESCAPARATE (2026-11-06, SEO): los proyectos por área. No se
   *  guarda: lo calcula el servidor al servir la página (`seoEscaparate.ts`), así sale ya
   *  escrito en el HTML para los buscadores. */
  mapaProyectos?: Array<{ titulo: string; entradas: Array<{ titulo: string; url: string }> }>;
  /** Los perfiles en redes, con su icono en el pie sencillo (2026-11-06, Eugenio: «el Instagram,
   *  el YouTube y el LinkedIn, conéctalos»). */
  redes?: Array<{ red: string; url: string }>;
};

export type Sitio = {
  menu: Menu;
  pie: Pie;
  titular: Titular;
  /** Texto propio para un documento legal. Vacío: la plantilla. */
  textos: Partial<Record<DocLegal, string>>;
  /** Los códigos de Google Search Console y Bing Webmaster Tools para
   *  demostrar que el sitio es tuyo (SEO R17, `seoSitio.ts`). */
  verificacion: { google?: string; bing?: string };
  /** Avisar a Bing y compañía de cada cambio (IndexNow, `indexNow.ts`). */
  avisarBuscadores?: boolean;
  /** UN ESCAPARATE (2026-11-06, `escaparate.ts`): un laboratorio que solo enseña. Desde el
   *  2026-11-07 con sus dos formularios —colaborar y el boletín, `formularios.ts`—, que su
   *  política de privacidad explica. Lo pone quien publica; el editor no lo toca. */
  escaparate?: boolean;
  /** Los datos de la organización para buscadores (`seoEscaparate.ts`). */
  seo?: { organizacion?: string; descripcion?: string; fundador?: string; perfiles?: string[]; otrosNombres?: string[] };
};

export const NOMBRES_LEGALES: Record<DocLegal, string> = {
  'aviso-legal': 'Aviso legal',
  privacidad: 'Política de privacidad',
  cookies: 'Política de cookies',
};

export const MENU_POR_DEFECTO: Menu = {
  activo: true, posicion: 'arriba', plegado: 'movil', alineacion: 'derecha', tamano: 'mediano',
  fijo: true, fondo: '#ffffff', texto: '#0f172a', acento: '#0f172a',
  mostrarLogo: true, mostrarNombre: true, borde: true,
  enlaces: [
    { id: 'm1', texto: 'Inicio', destino: { tipo: 'inicio' } },
    { id: 'm2', texto: 'Contacto', destino: { tipo: 'contacto' }, estilo: 'boton' },
  ],
};

export const PIE_POR_DEFECTO: Pie = {
  activo: true, fondo: '#0f172a', texto: '#e2e8f0', mostrarLogo: true,
  contacto: {}, enlaces: [],
  legales: { 'aviso-legal': true, privacidad: true, cookies: true },
  copyright: true,
  mapaWeb: true,
  mostrarContacto: true,
};

/** El sitio con todo lo que falte puesto por defecto. Una página vieja, o un
 *  `config.sitio` a medias, nunca deja un campo sin valor.
 *
 *  LO QUE NO ES DEL MENÚ NI DEL PIE SE CONSERVA (2026-11-07). El editor del menú y
 *  del pie (`CreadorMenu`) guarda lo que devuelve esta función como `config.sitio`
 *  entero: sin copiar el resto, editar el pie borraba `escaparate`, `seo`,
 *  `proyectos`, `personas`, `vistas`… y el escaparate dejaba de serlo (y de tener
 *  sus formularios) sin que nadie lo hubiera pedido. */
export function completarSitio(s: any): Sitio {
  return {
    ...(s && typeof s === 'object' && !Array.isArray(s) ? s : {}),
    menu: { ...MENU_POR_DEFECTO, ...(s?.menu || {}), enlaces: Array.isArray(s?.menu?.enlaces) ? s.menu.enlaces : MENU_POR_DEFECTO.enlaces },
    pie: {
      ...PIE_POR_DEFECTO, ...(s?.pie || {}),
      contacto: { ...(s?.pie?.contacto || {}) },
      legales: { ...PIE_POR_DEFECTO.legales, ...(s?.pie?.legales || {}) },
      enlaces: Array.isArray(s?.pie?.enlaces) ? s.pie.enlaces : [],
    },
    titular: { ...(s?.titular || {}) },
    textos: { ...(s?.textos || {}) },
    verificacion: { ...(s?.verificacion || {}) },
    avisarBuscadores: s?.avisarBuscadores === true,
  };
}

/** ¿Esta página se pinta con el menú del sitio encendido? Entonces el icono de cuenta va dentro de él. */
export const conMenuDeSitio = (pagina: any): boolean => !!pagina?.sitio?.config && completarSitio(pagina.sitio.config).menu.activo;

/** Negro o blanco, el que se lea mejor sobre ese color. */
export function textoSobre(fondo: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(fondo || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#0f172a' : '#ffffff';
}

// ── LOS TEXTOS LEGALES ──────────────────────────────────────────────────────
// PLANTILLAS ORIENTATIVAS, y el editor lo dice. Cubren lo que piden la LSSI-CE
// (art. 10: quién es el titular y cómo contactarle) y el RGPD (art. 13: quién
// trata los datos, para qué, con qué base, cuánto tiempo y qué derechos hay).
// Se rellenan con los datos del titular; lo que falte sale entre corchetes
// para que se vea que falta, no se inventa.
//
// LO DE LAS COOKIES ES VERDAD HOY, y por eso puede decirse: medido el
// 2026-10-02 en luzhumanidad.com, la página publicada no instala ninguna
// cookie a quien sólo la visita. Desde que un sitio puede tener miembros
// (src/server/miembros.ts), quien entra con su cuenta recibe una cookie de
// sesión `rh_sitio_<raíz>` (HttpOnly, 30 días): técnica, y el texto lo dice.
// Si eso cambia (un contador de visitas, un vídeo incrustado), este texto
// tiene que cambiar.

const falta = (v: string | undefined, que: string) => (v && v.trim()) || `[${que}]`;

export function textoLegal(doc: DocLegal, s: Sitio, sitioNombre: string): string {
  const propio = s.textos[doc];
  if (propio && propio.trim()) return propio;
  const t = s.titular;
  const nombre = falta(t.nombre || s.seo?.organizacion, 'nombre o razón social del titular');
  const email = falta(t.email || s.pie.contacto.email, 'correo de contacto');
  const web = sitioNombre || 'esta web';

  // UN ESCAPARATE (2026-11-07): no vende ni tiene cuentas; recoge datos en dos
  // formularios, el de colaborar y el del boletín (`formularios.ts`). Su política
  // dice eso y solo eso, con lo que hace de verdad `formulariosSitio.ts`: qué se
  // guarda, para qué, con qué base, cuánto tiempo, y que la baja borra la dirección.
  if (doc === 'privacidad' && s.escaparate) {
    // El nombre por el que se conoce a la organización, si no es el legal: «Asociación … («Light Humanity»)».
    const marca = (s.seo?.organizacion || '').trim();
    const conocida = t.nombre && marca && marca !== t.nombre ? ` («${marca}»)` : '';
    return [
      `# Política de privacidad`,
      `## Responsable del tratamiento`,
      `${nombre}${conocida}${t.nif ? `, con NIF/CIF ${t.nif}` : ''}${t.domicilio ? `, con domicilio en ${t.domicilio}` : ''}. Contacto: ${email}.`,
      `## Qué datos tratamos`,
      `Los que nos das en los dos formularios de esta web: el de colaborar con nosotros y el del boletín. No elaboramos perfiles ni tomamos decisiones automatizadas.`,
      `## Si nos escribes para colaborar`,
      [
        `- **Qué guardamos:** tu nombre, tu correo, cómo quieres colaborar, el proyecto que elijas, tu mensaje, la página desde la que lo envías, la fecha y el texto que aceptas al enviarlo.`,
        `- **Para qué:** para leer tu mensaje, responderte y, si sigues adelante, organizar tu colaboración.`,
        `- **Base jurídica:** tu consentimiento, que das al marcar la casilla (art. 6.1.a del RGPD).`,
        `- **Cuánto tiempo:** el necesario para atender tu mensaje y tu colaboración. Si nos pides que los borremos, borramos tu nombre, tu correo y tu mensaje.`,
      ].join('\n'),
      `## Si te suscribes al boletín`,
      [
        `- **Qué guardamos:** tu correo, la fecha y el texto que aceptas al suscribirte y, cuando la confirmas, la fecha de la confirmación.`,
        `- **Para qué:** para enviarte el boletín con las novedades de ${web}. Antes de enviarte ninguno te pedimos que confirmes la suscripción desde tu correo.`,
        `- **Base jurídica:** tu consentimiento (art. 6.1.a del RGPD).`,
        `- **Cuánto tiempo:** mientras sigas suscrito. Cada correo que te enviemos lleva un enlace para darte de baja y, al darte de baja, borramos tu dirección.`,
      ].join('\n'),
      `## Quién más los ve`,
      `No se ceden a terceros salvo obligación legal. El proveedor que aloja la web trata los datos por cuenta nuestra, dentro de la Unión Europea.`,
      `## Tus derechos`,
      `Puedes retirar tu consentimiento cuando quieras, sin que eso afecte a lo anterior, y pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos escribiendo a ${email}. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
    ].join('\n\n');
  }

  if (doc === 'aviso-legal') {
    return [
      `# Aviso legal`,
      `En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de ${web}:`,
      `- **Titular:** ${nombre}`,
      `- **NIF/CIF:** ${falta(t.nif, 'NIF o CIF')}`,
      `- **Domicilio:** ${falta(t.domicilio || s.pie.contacto.direccion, 'domicilio')}`,
      `- **Correo electrónico:** ${email}`,
      t.telefono || s.pie.contacto.telefono ? `- **Teléfono:** ${t.telefono || s.pie.contacto.telefono}` : '',
      t.registro ? `- **Datos registrales:** ${t.registro}` : '',
      `## Uso de la web`,
      `El acceso a esta web es libre y gratuito. Quien la visita se compromete a usarla de forma lícita y a no dañar su funcionamiento ni el de terceros.`,
      `## Propiedad intelectual`,
      `Los textos, imágenes, logotipos y demás contenidos son de ${nombre} o se usan con permiso de sus autores. No pueden reproducirse sin autorización, salvo en los casos que permite la ley.`,
      `## Responsabilidad`,
      `${nombre} procura que la información sea correcta y esté actualizada, pero no responde de los daños que pudieran derivarse de su uso ni del contenido de las webs de terceros a las que se enlace.`,
      `## Ley aplicable`,
      `Este aviso se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la ley.`,
    ].filter(Boolean).join('\n\n');
  }

  if (doc === 'privacidad') {
    return [
      `# Política de privacidad`,
      `## Responsable del tratamiento`,
      `${nombre}${t.nif ? `, con NIF/CIF ${t.nif}` : ''}${t.domicilio ? `, con domicilio en ${t.domicilio}` : ''}. Contacto: ${email}.`,
      `## Qué datos tratamos y para qué`,
      `Sólo los que nos facilites al escribirnos o al hacer un pedido (por ejemplo, tu nombre, tu correo o tu dirección de envío), para atender tu consulta o tu pedido. Esta web no elabora perfiles ni toma decisiones automatizadas.`,
      `## Si te creas una cuenta`,
      `Guardamos tu correo, el nombre que elijas y tu contraseña, que nunca se guarda tal cual: sólo una huella cifrada que no permite recuperarla. También lo que publiques con tu cuenta, como tus valoraciones. Sirven para que puedas entrar y para mostrar tus aportaciones. La base jurídica es la ejecución de las condiciones de uso que aceptas al registrarte (art. 6.1.b del RGPD).`,
      `Los guardamos mientras tengas la cuenta. Puedes borrarla cuando quieras, también escribiendo a ${email}: queda 15 días en una papelera por si te arrepientes y después se borran tus datos personales. Lo que hayas publicado, como tus valoraciones, se queda sin tu nombre.`,
      `## Base jurídica`,
      `Tu consentimiento al contactarnos (art. 6.1.a del RGPD), la ejecución del contrato si compras algo o te creas una cuenta (art. 6.1.b).`,
      `## Cuánto tiempo los guardamos`,
      `El necesario para atenderte (o, si tienes cuenta, mientras la tengas) y, después, el que exijan las obligaciones legales (por ejemplo, las fiscales).`,
      `## Quién más los ve`,
      `No se ceden a terceros salvo obligación legal. El proveedor que aloja la web trata los datos por cuenta nuestra, dentro de la Unión Europea.`,
      `## Tus derechos`,
      `Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos escribiendo a ${email}. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
    ].join('\n\n');
  }

  return [
    `# Política de cookies`,
    `Esta web no instala cookies de seguimiento, de análisis ni de publicidad.`,
    `Sólo usa una cookie técnica de sesión, y únicamente si entras con tu cuenta: sirve para que sigas dentro mientras navegas (dura 30 días o hasta que salgas) y no se usa para nada más. Al ser estrictamente necesaria, no requiere tu permiso.`,
    `Si en algún momento se añadiera alguna que no sea estrictamente necesaria, se te pedirá permiso antes, como exige el artículo 22.2 de la LSSI-CE.`,
    `Para cualquier duda: ${email}.`,
  ].join('\n\n');
}
