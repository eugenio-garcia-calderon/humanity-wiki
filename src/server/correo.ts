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

export async function enviarCorreo(c: { para: string; asunto: string; texto: string; html?: string; remitente?: string }): Promise<boolean> {
  const clave = (process.env.RESEND_API_KEY || '').trim();
  if (!clave) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: c.remitente || process.env.CORREO_REMITENTE || 'humanity.wiki <avisos@humanity.wiki>',
        to: [c.para], subject: c.asunto, text: c.texto, ...(c.html ? { html: c.html } : {}),
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
