// ============================================================================
// TU AGENDA DE GOOGLE, EN LA PLATAFORMA (2026-08-23) — fase 4 de 5
// ============================================================================
// Cierra el círculo que se abrió esta misma noche con el importador del iPhone.
// Allí había tres caminos y los tres pedían algo a la persona: exportar un
// fichero, encender una casilla de Safari, o montarse un Atajo. Este no pide
// nada: si tu agenda está en Google —y en un Android lo está siempre—, entra
// sola y se mantiene al día.
//
// ── NO SE DUPLICA LA LÓGICA DE IMPORTAR, Y ESO ES EL PUNTO ─────────────────
// Todo lo que llega aquí pasa por `importarContactosDe()`, la misma función que
// usan el fichero .vcf y el Atajo del iPhone. Se extrajo esta noche justo para
// esto: hay tres puertas y las tres tienen que casar por número, deduplicar y
// **no pisar el nombre que tú le pusiste** exactamente igual.
//
// Dos copias de esas reglas se separan a la primera corrección, y el día que se
// separen una de las puertas empezará a duplicar gente en silencio.
//
// ── LO QUE SE TRAE Y LO QUE NO ──────────────────────────────────────────────
// Nombre y teléfono. Ni correos, ni direcciones, ni cumpleaños, ni notas, ni
// fotos. La agenda de alguien es de las cosas más íntimas que tiene —dice con
// quién se trata, quién es su médico y quién su abogado— y aquí solo hace falta
// lo que permite decir «esta persona de tu agenda también está en la
// plataforma». Traer el resto sería guardar mucho más de lo necesario, y todo
// eso sale del servidor cada noche en la copia de seguridad.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { tokenDe } from './google.js';
import { importarContactosDe } from './juego.js';

const API = () => process.env.PEOPLE_API_URL || 'https://people.googleapis.com/v1';

/** Un tope, porque una agenda puede ser enorme y `importarContactosDe` hace una
 *  consulta por contacto. Con 2.000 se cubre a casi todo el mundo; quien tenga
 *  más lo verá en la siguiente traída. */
const TOPE = 2000;

export function registerContactosGoogleRoutes(app: Express, db: any) {
  /**
   * POST /api/agenda/google/traer — traerse la agenda de Google.
   *
   * Se dispara a mano, no sola. Sincronizar la agenda de todo el mundo cada
   * hora sería pedirle a Google los contactos de gente que no ha abierto la
   * plataforma en semanas, y la agenda es justo el dato que menos apetece
   * mover sin que nadie lo haya pedido.
   */
  app.post('/api/agenda/google/traer', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });

      const token = await tokenDe(db, req.user.id);
      if (!token) {
        // 409 y no 500: no es un fallo, es que falta un paso que la persona
        // puede dar. La pantalla lo distingue y enseña el botón de conectar.
        return res.status(409).json({ error: 'No tienes conectada tu cuenta de Google.' });
      }

      const contactos: Array<{ nombre: string; telefono: string }> = [];
      let pagina: string | undefined;
      let sinTelefono = 0;
      do {
        const url = `${API()}/people/me/connections?${new URLSearchParams({
          // SOLO NOMBRE Y TELÉFONO. `personFields` es exactamente la lista de
          // lo que Google nos manda: pedir de más aquí sería recibir de más.
          personFields: 'names,phoneNumbers',
          pageSize: '1000',
          ...(pagina ? { pageToken: pagina } : {}),
        })}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15000),
        });
        const j: any = await r.json().catch(() => null);
        if (!r.ok) {
          const motivo = j?.error?.message || `Google ha contestado ${r.status}`;
          console.error('[contactos-google]', motivo);
          return res.status(502).json({ error: 'Google no ha podido darnos tu agenda ahora mismo.' });
        }
        for (const p of j.connections || []) {
          const nombre = p.names?.[0]?.displayName;
          const telefono = p.phoneNumbers?.[0]?.value;
          if (!nombre) continue;
          // SE CUENTAN LOS QUE NO TIENEN NÚMERO. Sin este número, alguien con
          // 400 contactos y 250 importados se pregunta dónde están los otros
          // 150 — y la respuesta («no tienen teléfono») es tranquilizadora.
          if (!telefono) { sinTelefono++; continue; }
          contactos.push({ nombre: String(nombre), telefono: String(telefono) });
        }
        pagina = j.nextPageToken;
      } while (pagina && contactos.length < TOPE);

      const salida = await importarContactosDe(db, req.user.id, contactos);
      await db.execute(sql`
        UPDATE cuentas_google SET usada_at = now() WHERE user_id = ${req.user.id}
      `).catch(() => {});

      res.json({
        ...salida,
        // Los que Google tiene sin teléfono se suman a los ignorados, porque
        // para quien mira son lo mismo: gente de su agenda que no ha entrado.
        ignorados: (salida.ignorados || 0) + sinTelefono,
        sinTelefono,
        resumen: `${salida.nuevos} nuevos · ${salida.actualizados} ya estaban · ${(salida.ignorados || 0) + sinTelefono} sin número`,
      });
    } catch (e: any) {
      console.error('[contactos-google] traer:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
