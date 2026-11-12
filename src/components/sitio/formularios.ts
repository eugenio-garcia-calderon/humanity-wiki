// ============================================================================
// LOS DOS FORMULARIOS DEL ESCAPARATE: «QUIERO COLABORAR» Y EL BOLETÍN (2026-11-07)
// ============================================================================
// Eugenio, sobre luzhumanidad.com: «con alta calidad, no quiero nada cutre».
// Quien visita un escaparate puede (a) escribir para colaborar y (b) apuntarse
// al boletín; quien lo publica lo ve todo en Humanity.Wiki (`/paginas/:id/formularios`).
//
// Este fichero son LAS REGLAS Y LOS TEXTOS, una sola vez para los dos lados:
// lo leen las pantallas (`FormularioColabora.tsx`, `AltaBoletin.tsx`) y el
// servidor (`src/server/formulariosSitio.ts`). Por eso no importa React ni nada
// del navegador. El navegador valida para ayudar a quien escribe; el que decide
// es el servidor, que vuelve a validar con estas mismas funciones y escribe él
// —nunca lo copia de la petición— el texto del consentimiento que se guarda.

/** «¿Cómo quieres colaborar?» Se guarda el `id`; el texto es lo que se ve. */
export const MOTIVOS = [
  { id: 'voluntariado', texto: 'Voluntariado' },
  { id: 'empresa', texto: 'Empresa o alianza' },
  { id: 'prensa', texto: 'Prensa' },
  { id: 'trabajo', texto: 'Trabaja con nosotros' },
  // 2026-11-12 (Sol Solidario): préstamos solidarios a 7 años, al 0 %, desde 1.000 €.
  { id: 'prestamo', texto: 'Préstamo solidario' },
  { id: 'otro', texto: 'Otro' },
] as const;
export type Motivo = typeof MOTIVOS[number]['id'];
/** La etiqueta de cada motivo, también los que ya no se eligen (2026-11-09: sale la donación del
 *  formulario de Colabora, pero los mensajes que la eligieron antes conservan su nombre). */
const ETIQUETAS: Record<string, string> = { ...Object.fromEntries(MOTIVOS.map(m => [m.id, m.texto])), donacion: 'Donación' };
export const textoMotivo = (id: string | null | undefined) => (id && ETIQUETAS[id]) || 'Otro';

/** ELEGIR EL MOTIVO DESDE FUERA DEL FORMULARIO (2026-11-07, la página «Colabora»): cada tarjeta
 *  de «Formas de colaborar» lanza este evento con `{ motivo }` y el formulario de la misma página
 *  lo marca, aunque ya hubiera otro elegido (`?motivo=` solo vale al abrir la página). */
export const EVENTO_ELEGIR_MOTIVO = 'colabora:elegir-motivo';

/** Los límites, en caracteres. El mensaje admite saltos de línea; lo demás, una línea. */
export const LIMITES = { nombreMin: 2, nombreMax: 120, emailMax: 254, mensajeMin: 10, mensajeMax: 4000, enlacesMax: 5 } as const;

/** Lo mínimo que tarda una persona en rellenar cada formulario, en milisegundos.
 *  Un programa que envía formularios lo hace en el acto; una persona, aunque
 *  el navegador le rellene el nombre y el correo, tarda más que esto. */
export const TIEMPO_MINIMO_MS = { mensaje: 3000, boletin: 1500 } as const;

/** EL CAMPO TRAMPA. Las personas no lo ven (ni el lector de pantalla, ni el
 *  tabulador); un programa que rellena todo lo que encuentra, sí. Con un nombre
 *  que ningún autocompletado reconoce: con «web» o «empresa» el navegador de una
 *  persona de verdad podría rellenarlo y su mensaje se perdería. */
export const CAMPO_TRAMPA = 'nota_interna';

/** La casilla, tal cual se lee junto al formulario. */
export const TEXTO_CASILLA = 'He leído y acepto la política de privacidad';

/** Un correo con forma de correo. No se intenta más: la única prueba de que un
 *  correo es de alguien es que le llegue (por eso el boletín pide confirmarlo). */
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[^\s@<>()[\]\\,;:".]{2,}$/;
export const correoValido = (e: string) => e.length <= LIMITES.emailMax && EMAIL.test(e);

/** El correo para comparar y guardar en el boletín: sin espacios y en minúsculas. */
export const normalizarCorreo = (e: unknown) => String(e ?? '').trim().toLowerCase();

/** Una línea limpia: sin caracteres de control y con los espacios juntos. */
const linea = (v: unknown) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Un texto de varias líneas: sin caracteres de control (salvo el salto), sin
 *  espacios sobrantes y con tres saltos seguidos como mucho. */
const parrafos = (v: unknown) => String(v ?? '')
  .replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{4,}/g, '\n\n\n')
  .trim();

/** Lo que llega de un formulario de casillas: `true`, `'on'` (formulario sin JavaScript) o `'true'`. */
const marcada = (v: unknown) => v === true || v === 'on' || v === 'true' || v === '1';

/** La primera capa de información de protección de datos (art. 13 del RGPD),
 *  como recomienda la AEPD: quién, para qué, con qué base, a quién llega y qué
 *  derechos hay, junto al formulario. El resto, en la política de privacidad.
 *
 *  DESTINATARIOS (2026-11-07, revisión): la fórmula de la AEPD («no se ceden
 *  datos a terceros, salvo obligación legal») y, porque la guía de la AEPD pide
 *  decir en esta capa si hay transferencias fuera de la UE, que las hay: la
 *  plataforma desde la que se leen los mensajes va detrás de Cloudflare (EE. UU.,
 *  adherida al Marco de Privacidad de Datos UE-EE. UU.). El detalle, en
 *  `textoLegal('privacidad')` (`sitioWeb.ts`). Si eso cambia, cambia aquí. */
export function capaBasica(finalidad: 'mensaje' | 'boletin', responsable: string): string {
  const para = finalidad === 'mensaje' ? 'responder a tu mensaje y organizar tu colaboración' : 'enviarte el boletín';
  return `Responsable: ${responsable}. Finalidad: ${para}. Legitimación: tu consentimiento. `
    // «EE. UU.» con un espacio que no se parte: en el teléfono quedaba «EE.» al final de una línea y «UU.» en la otra.
    + 'Destinatarios: no se ceden datos a terceros, salvo obligación legal; un proveedor técnico puede tratarlos en EE. UU. con garantías adecuadas. '
    + 'Derechos: acceso, rectificación, supresión y los demás que explica la política de privacidad.';
}

/** Los días que se guarda un alta en el boletín que nadie confirma, contados
 *  desde el último correo de confirmación que salió (2026-11-07, revisión: «las
 *  altas que nunca se confirman se guardan para siempre»). Lo cumple la pasada
 *  diaria de `formulariosSitio.ts` y lo dicen la política de privacidad y el
 *  propio correo. Sin correo configurado no sale ninguno, y el alta espera. */
export const PLAZO_CONFIRMAR_DIAS = 30;

/** El texto que se guarda como consentimiento: la casilla y la información que
 *  la acompañaba, exactamente como se leían. */
export const textoConsentimiento = (finalidad: 'mensaje' | 'boletin', responsable: string) =>
  `${TEXTO_CASILLA}. ${capaBasica(finalidad, responsable)}`;

/** Quién responde de los datos en este sitio: el titular legal; si no lo hay, la organización o el nombre del sitio. */
export function responsableDe(sitio: any, nombreSitio?: string | null): string {
  const t = sitio?.titular || {};
  return linea(t.nombre) || linea(sitio?.seo?.organizacion) || linea(sitio?.pie?.nombre) || linea(nombreSitio) || 'el titular de esta web';
}

export type Errores = Record<string, string>;

export type DatosMensaje = {
  nombre: string; email: string; motivo: Motivo; proyecto: string | null; mensaje: string;
};

/** Valida un mensaje. `proyectos`: los nombres cortos (`slug`) de los proyectos
 *  que se pueden elegir; sin lista, el proyecto no se comprueba (en el navegador). */
export function validarMensaje(entrada: any, proyectos?: string[] | null): { datos: DatosMensaje } | { errores: Errores } {
  const e = entrada || {};
  const errores: Errores = {};
  const nombre = linea(e.nombre);
  if (!nombre) errores.nombre = 'Dinos cómo te llamas.';
  else if (nombre.length < LIMITES.nombreMin) errores.nombre = 'Escribe tu nombre completo.';
  else if (nombre.length > LIMITES.nombreMax) errores.nombre = `El nombre es demasiado largo: ${LIMITES.nombreMax} caracteres como mucho.`;

  const email = linea(e.email);
  if (!email) errores.email = 'Escribe tu correo para poder contestarte.';
  else if (!correoValido(email)) errores.email = 'Ese correo no parece válido. Revisa que tenga la forma nombre@dominio.org.';

  const motivo = MOTIVOS.find(m => m.id === e.motivo)?.id;
  if (!motivo) errores.motivo = 'Elige cómo quieres colaborar.';

  const proyecto = linea(e.proyecto).toLowerCase() || null;
  if (proyecto && (!/^[a-z0-9][a-z0-9/-]{0,119}$/.test(proyecto) || (proyectos && !proyectos.includes(proyecto)))) {
    errores.proyecto = 'Ese proyecto ya no está en la web. Elige otro de la lista o déjalo en blanco.';
  }

  const mensaje = parrafos(e.mensaje);
  if (!mensaje) errores.mensaje = 'Cuéntanos algo en el mensaje.';
  else if (mensaje.length < LIMITES.mensajeMin) errores.mensaje = 'Cuéntanos un poco más: al menos 10 caracteres.';
  else if (mensaje.length > LIMITES.mensajeMax) errores.mensaje = 'El mensaje es demasiado largo: 4.000 caracteres como mucho.';
  else if ((mensaje.match(/https?:\/\/|www\./gi) || []).length > LIMITES.enlacesMax) errores.mensaje = 'Tu mensaje lleva demasiados enlaces. Quita algunos y vuelve a enviarlo.';

  if (!marcada(e.consentimiento)) errores.consentimiento = 'Para enviarlo, marca que aceptas la política de privacidad.';

  if (Object.keys(errores).length) return { errores };
  return { datos: { nombre, email, motivo: motivo!, proyecto, mensaje } };
}

/** Valida un alta en el boletín. */
export function validarAlta(entrada: any): { email: string } | { errores: Errores } {
  const e = entrada || {};
  const errores: Errores = {};
  const email = normalizarCorreo(e.email);
  if (!email) errores.email = 'Escribe tu correo.';
  else if (!correoValido(email)) errores.email = 'Ese correo no parece válido. Revisa que tenga la forma nombre@dominio.org.';
  if (!marcada(e.consentimiento)) errores.consentimiento = 'Para suscribirte, marca que aceptas la política de privacidad.';
  return Object.keys(errores).length ? { errores } : { email };
}

/** LOS ENLACES DE LOS CORREOS van con el testigo detrás de `#`: lo que va
 *  después de `#` nunca sale del navegador (ni al servidor, ni a los registros,
 *  ni a otra web como «de dónde vienes»). Los lee el pie (`AltaBoletin.tsx`). */
export const ANCLA_CONFIRMAR = 'boletin-confirmar';
export const ANCLA_BAJA = 'boletin-baja';
/** La vuelta del formulario sin JavaScript (ver `formulariosSitio.ts`). */
export const ANCLA_RESULTADO = 'boletin-resultado';
export const TESTIGO = /^[A-Za-z0-9_-]{32,64}$/;

/** Un enlace `mailto:` que no se puede torcer (2026-11-07, revisión). La
 *  expresión EMAIL admite `?`, `#`, `%` y `&` en la parte de antes de la `@`
 *  (son legales), y sin codificar `a?cc=x%40otro.com&b=@ejemplo.org` añadía una
 *  copia a otra persona al pulsar «Responder». Cada parte va codificada. */
export function enlaceCorreo(email: string, asunto?: string): string {
  const i = email.lastIndexOf('@');
  const para = i > 0 ? `${encodeURIComponent(email.slice(0, i))}@${encodeURIComponent(email.slice(i + 1))}` : encodeURIComponent(email);
  return `mailto:${para}${asunto ? `?subject=${encodeURIComponent(asunto)}` : ''}`;
}
