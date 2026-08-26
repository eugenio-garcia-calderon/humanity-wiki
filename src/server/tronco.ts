import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// EL TRONCO DEL CONOCIMIENTO (2026-08-26) — fase 1
// ============================================================================
// Eugenio: «en la base tienes la palabra red de conocimiento y sube un tronco
// gordo que se divide en tres áreas… y a raíz de esas tres ramas surgen los
// quince objetivos… el árbol tiene que ir de izquierda a derecha».
//
// Este módulo sólo sirve la capa de arriba —raíz, ramas, objetivos— porque de
// los objetivos hacia abajo ya manda `temas.ts`. El dibujo une las dos.
//
// ── ES UN GRAFO, Y ESO OBLIGA A DOS GUARDIAS ──────────────────────────────
// Eugenio eligió que una rama pueda colgar de varias madres. Con eso, dos
// cosas que en un árbol son imposibles aquí pasan solas:
//
//   1. UN CICLO. Si A cuelga de B y alguien cuelga B de A, el dibujo no
//      termina nunca: el navegador se queda pintando hasta que se cierra la
//      pestaña. No da error, no se recupera solo. Se comprueba ANTES de
//      escribir, bajando desde el hijo a ver si se llega a la madre.
//   2. UN HUÉRFANO. Quitar la última madre de una rama no la borra: la deja
//      escrita en la base de datos y fuera del dibujo, que es la peor de las
//      dos muertes —sigue ocupando el nombre, y nadie la ve para arreglarla—.
//      Por eso quitar la última arista se rechaza con su motivo.
//
// Ninguna de las dos las inventa un atacante: las hace Eugenio arrastrando.

/** La raíz no es una fila: es el punto del que cuelga todo y no tiene nombre
 *  que discutir. Vive aquí como una constante para que no se escriba a mano en
 *  cinco sitios y uno de ellos con una errata. */
const RAIZ = 'RAIZ';

export function registrarTronco(app: Express, db: any) {
  const exigirNivel = (req: Request, res: Response, min: number): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < min) {
      res.status(403).json({ error: 'Sólo un administrador puede cambiar el tronco.' });
      return false;
    }
    return true;
  };

  /** Todas las aristas, tal cual. El grafo es de 18 nodos y 18 aristas: leerlo
   *  entero cuesta menos que preguntar por trozos. */
  const aristas = async (): Promise<Array<{ hijo: string; madre: string; orden: number }>> => {
    const r = await db.execute(sql`SELECT hijo, madre, orden FROM tronco_aristas ORDER BY madre, orden`);
    return r.rows as any;
  };

  /**
   * ¿Se llega de `desde` a `hasta` bajando? Si al colgar X de Y resulta que Y
   * ya estaba debajo de X, se ha cerrado un círculo.
   *
   * `vistos` no es una optimización, es lo que hace que esto termine: en un
   * grafo con un ciclo ya escrito, una búsqueda sin memoria da vueltas para
   * siempre — y entonces la comprobación que existe para evitar un cuelgue
   * sería ella misma el cuelgue.
   */
  const seLlegaBajando = (todas: Array<{ hijo: string; madre: string }>, desde: string, hasta: string): boolean => {
    const vistos = new Set<string>();
    const pila = [desde];
    while (pila.length) {
      const actual = pila.pop()!;
      if (actual === hasta) return true;
      if (vistos.has(actual)) continue;
      vistos.add(actual);
      for (const a of todas) if (a.madre === actual) pila.push(a.hijo);
    }
    return false;
  };

  // ── LEER ────────────────────────────────────────────────────────────────
  // Sin sesión también: mirar el árbol del conocimiento común no pide cuenta.
  app.get('/api/tronco', async (_req: Request, res: Response) => {
    try {
      const ramas = await db.execute(sql`
        SELECT id, nombre, color, orden FROM tronco_ramas
         WHERE archived_at IS NULL ORDER BY orden, nombre
      `);
      res.json({ raiz: RAIZ, ramas: ramas.rows, aristas: await aristas() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── MOVER: quitar de una madre y poner en otra, sin pasar por el vacío ──
  // Es lo que hace el arrastre. Va en una transacción porque el paso
  // intermedio —quitado de la vieja, aún no puesto en la nueva— es
  // exactamente el huérfano que el otro guardia existe para impedir.
  app.put('/api/tronco/mover', async (req: Request, res: Response) => {
    if (!exigirNivel(req, res, ROLE.ADMIN)) return;
    const { hijo, de, a } = req.body || {};
    if (!hijo || !de || !a) return res.status(400).json({ error: 'Faltan hijo, de o a.' });
    if (de === a) return res.json({ success: true, sinCambios: true });
    if (hijo === a) return res.status(400).json({ error: 'Una rama no puede colgar de sí misma.' });
    try {
      const todas = await aristas();
      if (seLlegaBajando(todas, hijo, a)) {
        return res.status(409).json({
          error: `No se puede: ${a} ya está debajo de ${hijo}, y colgarlo ahí cerraría un círculo.`,
        });
      }
      await db.execute(sql`
        WITH quitada AS (
          DELETE FROM tronco_aristas WHERE hijo = ${hijo} AND madre = ${de} RETURNING orden
        )
        INSERT INTO tronco_aristas (hijo, madre, orden)
        SELECT ${hijo}, ${a}, COALESCE((SELECT orden FROM quitada), 0)
        ON CONFLICT (hijo, madre) DO NOTHING
      `);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── COLGAR TAMBIÉN DE: la segunda madre, que es el grafo ────────────────
  app.post('/api/tronco/arista', async (req: Request, res: Response) => {
    if (!exigirNivel(req, res, ROLE.ADMIN)) return;
    const { hijo, madre } = req.body || {};
    if (!hijo || !madre) return res.status(400).json({ error: 'Faltan hijo o madre.' });
    if (hijo === madre) return res.status(400).json({ error: 'Una rama no puede colgar de sí misma.' });
    try {
      const todas = await aristas();
      if (seLlegaBajando(todas, hijo, madre)) {
        return res.status(409).json({
          error: `No se puede: ${madre} ya está debajo de ${hijo}, y colgarlo ahí cerraría un círculo.`,
        });
      }
      await db.execute(sql`
        INSERT INTO tronco_aristas (hijo, madre, orden)
        VALUES (${hijo}, ${madre}, ${Number(req.body?.orden) || 0})
        ON CONFLICT (hijo, madre) DO NOTHING
      `);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── DESCOLGAR, salvo que sea la última ──────────────────────────────────
  app.delete('/api/tronco/arista', async (req: Request, res: Response) => {
    if (!exigirNivel(req, res, ROLE.ADMIN)) return;
    const { hijo, madre } = req.body || {};
    if (!hijo || !madre) return res.status(400).json({ error: 'Faltan hijo o madre.' });
    try {
      const cuantas = await db.execute(sql`SELECT count(*)::int AS n FROM tronco_aristas WHERE hijo = ${hijo}`);
      if (((cuantas.rows[0] as any)?.n ?? 0) <= 1) {
        return res.status(409).json({
          error: 'Es la única madre que tiene. Si la quitas desaparece del árbol sin borrarse: muévela a otra rama en vez de descolgarla.',
        });
      }
      await db.execute(sql`DELETE FROM tronco_aristas WHERE hijo = ${hijo} AND madre = ${madre}`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── UNA RAMA NUEVA ──────────────────────────────────────────────────────
  app.post('/api/tronco/rama', async (req: Request, res: Response) => {
    if (!exigirNivel(req, res, ROLE.ADMIN)) return;
    const nombre = String(req.body?.nombre || '').trim();
    const madre = String(req.body?.madre || RAIZ);
    if (!nombre) return res.status(400).json({ error: 'La rama necesita un nombre.' });
    try {
      const id = `TR_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
      await db.execute(sql`
        INSERT INTO tronco_ramas (id, nombre, color, orden)
        VALUES (${id}, ${nombre}, ${String(req.body?.color || '#94a3b8')},
                COALESCE((SELECT max(orden) + 1 FROM tronco_ramas), 0))
      `);
      await db.execute(sql`INSERT INTO tronco_aristas (hijo, madre, orden) VALUES (${id}, ${madre}, 0)`);
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
