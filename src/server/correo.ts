// ============================================================================
// MANDAR UN CORREO (2026-10-05, carril «acceso»)
// ============================================================================
// La plataforma no tiene proveedor de correo (ver `auth.ts`, «TODO(correo)»).
// Las invitaciones a una página y los enlaces mágicos de los sitios con
// miembros necesitan uno, así que aquí queda la puerta, una sola, para el día
// que lo haya: con `RESEND_API_KEY` (y `CORREO_REMITENTE`) en el entorno, se
// envía por la API HTTP de Resend, sin dependencias nuevas.
//
// SIN PROVEEDOR NO SE FINGE. `enviarCorreo` devuelve `false` y quien llama lo
// dice en la pantalla («no se ha enviado ningún correo: pásale tú el
// enlace»). Prometer un correo que no sale es la peor de las dos opciones.
//
// Nunca revienta lo que la llama: un correo que no sale no deshace la
// invitación, que ya está guardada.
//
// POR SMTP (2026-11-09, Eugenio eligió su Google Workspace frente a Cloudflare y
// Resend): con `SMTP_USUARIO` y `SMTP_CLAVE` (una contraseña de aplicación de
// Google) en el entorno, se envía por smtp.gmail.com y tiene preferencia sobre
// Resend. Ese usuario es también el remitente: Google no deja firmar con otro.
// `SMTP_SERVIDOR` y `SMTP_PUERTO` sólo hacen falta si no es Google.

import nodemailer from 'nodemailer';

const smtp = () => {
  const usuario = (process.env.SMTP_USUARIO || '').trim();
  // Google enseña la contraseña de aplicación en grupos con espacios; no forman parte de ella.
  const clave = (process.env.SMTP_CLAVE || '').replace(/\s+/g, '');
  return usuario && clave ? { usuario, clave } : null;
};

export const hayCorreo = () => !!smtp() || !!(process.env.RESEND_API_KEY || '').trim();

/** El remitente por defecto, `Nombre <dirección>`. */
const remitentePorDefecto = () => process.env.CORREO_REMITENTE || smtp()?.usuario || 'humanity.wiki <avisos@humanity.wiki>';

/**
 * EL REMITENTE CON EL NOMBRE DE UN SITIO (2026-11-07, formularios del escaparate).
 * Un sitio publicado no enseña la plataforma («que no haya ninguna referencia a
 * la infraestructura», Eugenio, `sitios.ts`): su correo sale con SU nombre
 * («Luz & Humanidad <avisos@…>») y desde la dirección verificada de siempre, que
 * es la única que el proveedor deja usar.
 */
export function remitenteConNombre(nombre: string): string {
  const base = remitentePorDefecto();
  const direccion = /<([^>]+)>/.exec(base)?.[1] || base.trim();
  const limpio = String(nombre || '').replace(/["<>\r\n]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return limpio ? `"${limpio}" <${direccion}>` : base;
}

export async function enviarCorreo(c: {
  para: string; asunto: string; texto: string; html?: string; remitente?: string;
  /** A quién va la respuesta si quien lo recibe pulsa «Responder» (2026-11-07). */
  responderA?: string;
  /** Cabeceras extra, p. ej. `List-Unsubscribe` para darse de baja en un clic (2026-11-07). */
  cabeceras?: Record<string, string>;
}): Promise<boolean> {
  const cuenta = smtp();
  if (cuenta) {
    // El 587 con STARTTLS, no el 465: Hetzner corta las salidas por el 25 y el 465 (2026-11-09).
    const puerto = Number(process.env.SMTP_PUERTO) || 587;
    const envio = nodemailer.createTransport({
      host: (process.env.SMTP_SERVIDOR || 'smtp.gmail.com').trim(), port: puerto, secure: puerto === 465, requireTLS: puerto === 587,
      auth: { user: cuenta.usuario, pass: cuenta.clave },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000,
    });
    try {
      await envio.sendMail({
        from: c.remitente || remitentePorDefecto(), to: c.para, subject: c.asunto, text: c.texto,
        ...(c.html ? { html: c.html } : {}),
        ...(c.responderA ? { replyTo: c.responderA } : {}),
        ...(c.cabeceras && Object.keys(c.cabeceras).length ? { headers: c.cabeceras } : {}),
      });
      return true;
    } catch (e: any) {
      // Sólo el código y el mensaje: nunca el objeto entero, que lleva la configuración.
      console.error('correo smtp:', e?.code || '', e?.message || e);
      return false;
    } finally {
      envio.close();
    }
  }
  const clave = (process.env.RESEND_API_KEY || '').trim();
  if (!clave) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: c.remitente || remitentePorDefecto(),
        to: [c.para], subject: c.asunto, text: c.texto, ...(c.html ? { html: c.html } : {}),
        ...(c.responderA ? { reply_to: c.responderA } : {}),
        ...(c.cabeceras && Object.keys(c.cabeceras).length ? { headers: c.cabeceras } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error('correo: el proveedor dijo', r.status, (await r.text()).slice(0, 200));
    return r.ok;
  } catch (e: any) {
    console.error('correo:', e?.message || e);
    return false;
  }
}
