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
};

export type Sitio = {
  menu: Menu;
  pie: Pie;
  titular: Titular;
  /** Texto propio para un documento legal. Vacío: la plantilla. */
  textos: Partial<Record<DocLegal, string>>;
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
};

/** El sitio con todo lo que falte puesto por defecto. Una página vieja, o un
 *  `config.sitio` a medias, nunca deja un campo sin valor. */
export function completarSitio(s: any): Sitio {
  return {
    menu: { ...MENU_POR_DEFECTO, ...(s?.menu || {}), enlaces: Array.isArray(s?.menu?.enlaces) ? s.menu.enlaces : MENU_POR_DEFECTO.enlaces },
    pie: {
      ...PIE_POR_DEFECTO, ...(s?.pie || {}),
      contacto: { ...(s?.pie?.contacto || {}) },
      legales: { ...PIE_POR_DEFECTO.legales, ...(s?.pie?.legales || {}) },
      enlaces: Array.isArray(s?.pie?.enlaces) ? s.pie.enlaces : [],
    },
    titular: { ...(s?.titular || {}) },
    textos: { ...(s?.textos || {}) },
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
// cookie ni guarda nada en el navegador del visitante. Si eso cambia (un
// contador de visitas, un vídeo incrustado), este texto tiene que cambiar.

const falta = (v: string | undefined, que: string) => (v && v.trim()) || `[${que}]`;

export function textoLegal(doc: DocLegal, s: Sitio, sitioNombre: string): string {
  const propio = s.textos[doc];
  if (propio && propio.trim()) return propio;
  const t = s.titular;
  const nombre = falta(t.nombre, 'nombre o razón social del titular');
  const email = falta(t.email || s.pie.contacto.email, 'correo de contacto');
  const web = sitioNombre || 'esta web';

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
      `## Base jurídica`,
      `Tu consentimiento al contactarnos (art. 6.1.a del RGPD) y, si compras algo, la ejecución del contrato (art. 6.1.b).`,
      `## Cuánto tiempo los guardamos`,
      `El necesario para atenderte y, después, el que exijan las obligaciones legales (por ejemplo, las fiscales).`,
      `## Quién más los ve`,
      `No se ceden a terceros salvo obligación legal. El proveedor que aloja la web trata los datos por cuenta nuestra, dentro de la Unión Europea.`,
      `## Tus derechos`,
      `Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos escribiendo a ${email}. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
    ].join('\n\n');
  }

  return [
    `# Política de cookies`,
    `Esta web no instala cookies de seguimiento, de análisis ni de publicidad, y no guarda información en tu navegador para identificarte.`,
    `Si en algún momento se añadiera alguna que no sea estrictamente necesaria, se te pedirá permiso antes, como exige el artículo 22.2 de la LSSI-CE.`,
    `Para cualquier duda: ${email}.`,
  ].join('\n\n');
}
