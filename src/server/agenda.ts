// ============================================================================
// LA AGENDA DEL IPHONE, SIN EXPORTAR NINGÚN FICHERO (2026-08-23)
// ============================================================================
// Eugenio: «haz que el importador de contactos funcione con el PWA de mi
// iPhone sin tener que exportarlo a un archivo y subirlo».
//
// ── POR QUÉ HACÍA FALTA ALGO NUEVO, Y NO ERA PEREZA ─────────────────────────
// El selector de contactos del navegador (`navigator.contacts.select`) hace
// exactamente eso: una pantalla del sistema, la persona marca a quién trae, y
// no hay fichero por ninguna parte. Pero en el iPhone **viene apagado de
// fábrica**: existe en Safari detrás de una casilla experimental (Ajustes →
// Safari → Avanzado → Funciones experimentales), y una función que hay que ir a
// encender en los ajustes del teléfono no es una función que la gente use.
//
// Así que hay dos caminos sin fichero, y los dos están:
//
//   1. ENCENDER LA CASILLA. Un interruptor una vez y el botón de siempre
//      funciona igual que en Android. Es lo más rápido para quien no se asuste
//      con los ajustes, y la pantalla lo explica con la ruta exacta.
//   2. UN ATAJO DE APPLE. Toda la agenda de una vez, sin tocar ajustes, y se
//      puede volver a ejecutar cuando quieras para poner al día lo nuevo. Es
//      lo que hace este módulo posible.
//
// ── POR QUÉ UN ATAJO NECESITA UNA LLAVE ─────────────────────────────────────
// Un Atajo no es el navegador: no tiene la sesión, no tiene la cookie, no hay
// nadie a quien pedirle la contraseña. Necesita un secreto propio que la
// persona pegue una vez.
//
// Y ESE SECRETO SOLO ABRE UNA PUERTA. No entra en la cuenta, no lee mensajes,
// no publica nada, no cambia nada: **solo puede añadir contactos a tu propia
// agenda**. Si se filtrara, lo peor que puede hacer quien lo tenga es meterte
// gente en tu lista, que se ve y se borra. Esa es la diferencia entre una llave
// de un solo uso y una contraseña, y es lo que hace que esto se pueda ofrecer
// sin ponerle a nadie una trampa.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { importarContactosDe } from './juego.js';
import { anotarFallo, esperaPendiente, ipDe, type Regla } from './limites/index.js';

/** El prefijo hace reconocible la llave a simple vista: si aparece en una
 *  captura, en un registro o pegada donde no debe, se sabe QUÉ es y hay que
 *  retirarla. Un secreto que no se puede reconocer es un secreto que nadie
 *  revoca. Mismo criterio que los tokens de los agentes. */
const PREFIJO = 'hw_agenda_';

/** SHA-256 y no bcrypt: 32 bytes aleatorios no se adivinan por fuerza bruta
 *  como una contraseña humana, y esto se comprueba en cada petición del Atajo —
 *  un hash lento sería un peaje por llamada sin ganar nada. */
const huellaDe = (llave: string) =>
  crypto.createHash('sha256').update(llave, 'utf8').digest('hex');

const nuevaLlave = () => PREFIJO + crypto.randomBytes(32).toString('hex');

// ── EL FRENO DE ESTA PUERTA ─────────────────────────────────────────────────
// Adivinar una llave de 256 bits a base de probar no es la amenaza —no hay
// tiempo en el universo para eso—. La amenaza es más tonta: alguien apuntando
// un bucle a esta dirección hace que cada intento sea una consulta a la base de
// datos, y con eso solo se tumba el servidor.
//
// Regla propia y no una de `REGLAS`, a propósito: ese fichero es de prog6 y
// añadirle una línea desde aquí sería meterme en su área por comodidad.
// `guardian` acepta cualquier `Regla`, así que la puerta se define donde vive
// la puerta.
//
// `abrir` al fallar, y esto sí es una decisión: si el limitador se rompe, el
// Atajo de alguien tiene que seguir pudiendo traer sus contactos. Lo que hay
// detrás no es una cuenta ni un secreto de nadie más — es tu propia libreta.
const FRENO: Regla = {
  puerta: 'agenda',
  gracia: 5,
  baseSegundos: 2,
  topeSegundos: 300,
  alFallar: 'abrir',
};

export function registerAgendaRoutes(app: Express, db: any) {
  /**
   * POST /api/agenda/llave — hacerse una llave para el Atajo.
   *
   * SE ENSEÑA UNA VEZ Y NO SE PUEDE VOLVER A VER. Aquí solo queda la huella. Es
   * incómodo a propósito: una llave que se puede volver a consultar es una
   * llave que se queda para siempre abierta en una pestaña de alguien.
   *
   * Crear una nueva revoca la anterior. No es una limitación, es lo que hace
   * que «me he equivocado, dame otra» signifique también «invalida la que se me
   * escapó», sin que nadie tenga que entender qué es revocar.
   */
  app.post('/api/agenda/llave', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const llave = nuevaLlave();
      await db.execute(sql`
        UPDATE llaves_agenda SET revocada_at = now()
        WHERE user_id = ${req.user.id} AND revocada_at IS NULL
      `);
      await db.execute(sql`
        INSERT INTO llaves_agenda (user_id, huella) VALUES (${req.user.id}, ${huellaDe(llave)})
      `);
      res.json({ llave });
    } catch (e: any) {
      console.error('[agenda] llave:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/agenda/llave — ¿tengo una llave viva, y ha llegado algo por ella?
   *
   * No devuelve la llave (no se puede: solo hay huella). Devuelve lo único que
   * la persona necesita saber: si hay una, y **cuándo entró el último contacto
   * por ella**. Eso último es lo que convierte «he pulsado el Atajo y no sé si
   * ha pasado algo» en «tu iPhone mandó contactos hace dos minutos».
   */
  app.get('/api/agenda/llave', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`
        SELECT creada_at, usada_at FROM llaves_agenda
        WHERE user_id = ${req.user.id} AND revocada_at IS NULL
        ORDER BY creada_at DESC LIMIT 1
      `);
      const l = r.rows[0] as any;
      res.json({ hay: Boolean(l), creada: l?.creada_at || null, usada: l?.usada_at || null });
    } catch (e: any) {
      console.error('[agenda] estado de la llave:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/agenda/llave — retirarla. El Atajo deja de funcionar. */
  app.delete('/api/agenda/llave', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      await db.execute(sql`
        UPDATE llaves_agenda SET revocada_at = now()
        WHERE user_id = ${req.user.id} AND revocada_at IS NULL
      `);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('[agenda] revocar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/agenda/contactos — por aquí entra el Atajo del iPhone.
   *
   *   Authorization: Bearer hw_agenda_…
   *   { "contactos": [{ "nombre": "Ana Ruiz", "telefono": "+34600111222" }] }
   *
   * ── LO QUE SE CONTESTA CUANDO LA LLAVE NO VALE ────────────────────────────
   * Un 401 seco y la misma respuesta para «no existe», «está revocada» y «te
   * has dejado media pegada». La diferencia solo le sirve a quien esté probando
   * llaves; a quien se equivoca de verdad le sirve igual de poco saber cuál de
   * las tres es, porque la solución es la misma: hacerse otra.
   *
   * ── Y POR QUÉ ACEPTA VARIAS FORMAS DE LISTA ───────────────────────────────
   * El Atajo lo construye una persona a mano en su teléfono, no un programa. Lo
   * que salga de «Buscar contactos» puede llegar como lista de objetos, o como
   * un texto con una línea por contacto, según qué acciones haya encadenado.
   * Rechazar por la forma sería mandarle a depurar un Atajo sin herramientas.
   * Se acepta lo razonable y se dice qué llegó.
   */
  app.post('/api/agenda/contactos', async (req: Request, res: Response) => {
    try {
      const ip = ipDe(req);
      // `await` y `db`: el freno vive en Postgres desde la migración 0097, para
      // que con `cluster` no se convierta en ocho frenos independientes.
      const espera = await esperaPendiente(db, FRENO, ip);
      if (espera > 0) {
        res.setHeader('Retry-After', String(espera));
        return res.status(429).json({ error: `Demasiados intentos. Prueba en ${espera} segundos.` });
      }

      const cabecera = req.header('authorization') || '';
      const llave = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : String(req.query.llave || '');
      const noVale = async () => {
        await anotarFallo(db, FRENO, ip).catch(() => {});
        return res.status(401).json({ error: 'Llave no válida.' });
      };
      if (!llave.startsWith(PREFIJO)) return noVale();

      const r = await db.execute(sql`
        SELECT id, user_id FROM llaves_agenda
        WHERE huella = ${huellaDe(llave)} AND revocada_at IS NULL
      `);
      const fila = r.rows[0] as any;
      if (!fila) return noVale();

      const brutos = normalizarEntrada(req.body);
      if (!brutos) return res.status(400).json({ error: 'No he reconocido la lista de contactos.' });
      if (brutos.length > 2000) return res.status(400).json({ error: 'Máximo 2.000 contactos de una vez.' });

      const salida = await importarContactosDe(db, String(fila.user_id), brutos);
      db.execute(sql`UPDATE llaves_agenda SET usada_at = now() WHERE id = ${fila.id}`)
        .catch(() => { /* la marca de uso no puede tumbar una importación */ });

      // El Atajo enseña esta frase en una notificación del teléfono. Por eso va
      // escrita para leerse ahí y no en una consola: es lo único que verá la
      // persona, y tiene que decirle si ha funcionado sin abrir la web.
      res.json({
        ...salida,
        resumen: salida.error
          ? salida.error
          : `${salida.nuevos} nuevos · ${salida.actualizados} ya estaban · ${salida.ignorados} sin número`,
      });
    } catch (e: any) {
      console.error('[agenda] contactos:', e);
      res.status(500).json({ error: e.message });
    }
  });
}

/**
 * Lo que mande el Atajo, convertido en una lista de contactos.
 *
 * Tres formas, porque son las tres que salen de encadenar acciones distintas en
 * la aplicación Atajos y ninguna es «la mala»:
 *
 *   { contactos: [{ nombre, telefono }] }   lo que pide la documentación
 *   [{ nombre, telefono }]                  la lista pelada
 *   "Ana Ruiz, +34600111222\n…"             texto, una línea por contacto
 *
 * La tercera es la que más se da: «Buscar contactos» seguido de «Combinar
 * texto» es la forma más corta de montar el Atajo, y produce texto plano.
 */
function normalizarEntrada(cuerpo: any): any[] | null {
  if (Array.isArray(cuerpo?.contactos)) return cuerpo.contactos;
  if (Array.isArray(cuerpo)) return cuerpo;

  const texto = typeof cuerpo === 'string' ? cuerpo : typeof cuerpo?.texto === 'string' ? cuerpo.texto : null;
  if (!texto) return null;

  return texto.split(/\r?\n/).map(linea => {
    // Nombre y número separados por coma, punto y coma o tabulador. El número
    // es lo que va detrás de la ÚLTIMA separación: «Ruiz, Ana, +34600111222»
    // tiene dos comas y el teléfono sigue siendo el final.
    const trozos = linea.split(/[,;\t]/).map(t => t.trim()).filter(Boolean);
    if (trozos.length < 2) return null;
    return { nombre: trozos.slice(0, -1).join(' '), telefono: trozos[trozos.length - 1] };
  }).filter(Boolean) as any[];
}
