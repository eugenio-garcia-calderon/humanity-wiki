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

export const hayCorreo = () => !!(process.env.RESEND_API_KEY || '').trim();

/** El remitente por defecto, `Nombre <dirección>`. */
const remitentePorDefecto = () => process.env.CORREO_REMITENTE || 'humanity.wiki <avisos@humanity.wiki>';

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
