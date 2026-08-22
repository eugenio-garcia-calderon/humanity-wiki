// ============================================================================
// EL HORMIGUERO — el canal con quien programa (2026-08-22)
// ============================================================================
// Eugenio: «permite al usuario crear tareas para el equipo de desarrollo de la
// APP […] esta va a ser la forma en la que nos comuniques».
//
// Es de ida y vuelta: él escribe lo que falla o lo que quiere, y quien programa
// contesta cambiando el estado y dejando dicho qué le hace falta. Por eso hay
// `respuesta` y `necesita` y no solo un estado: un semáforo sin texto dice que
// algo está parado y no por qué, y entonces hay que preguntar por otro canal —
// que es justo lo que esto viene a sustituir.
//
// QUIÉN PUEDE QUÉ: cualquiera con sesión abre una incidencia y edita las suyas
// mientras estén esperando. El ESTADO solo lo cambia un administrador, porque
// es quien programa: si el que la abre pudiera marcarla «hecha», el tablero
// dejaría de decir lo que de verdad está hecho.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { quienEscribe } from './agentesIA';

// ══ LOS CUATRO ESTADOS ═══════════════════════════════════════════════════════
// `propuesta` es de 2026-08-22 (Eugenio: «las creadas por otros usuarios cada X
// tiempo las revisaremos para que yo las apruebe contigo»). Es donde caen las
// notas de quien no es del equipo: no están esperando a que alguien las
// programe, están esperando a que alguien decida si se programan. Mezclarlas
// con las demás convertía la lista de «qué hay que hacer» en un buzón de ideas.
const ESTADOS = new Set(['propuesta', 'esperando', 'bloqueada', 'hecha']);
const CLASES = new Set(['fallo', 'mejora']);

// ══ LOS DOS TABLEROS (2026-08-22, prog6) ════════════════════════════════════
// Eugenio: «hay cuatro cosas de seguridad en el hormiguero […] trasládalas ahí
// para limpiar el hormiguero, que es un tema para el público».
//
// El Hormiguero lo lee cualquiera. Cuatro notas abiertas ahí decían en texto
// llano que el login no tiene límite de intentos y que la aplicación entra a la
// base de datos como superusuario: un mapa para quien quiera aprovecharlo, en
// la página que más se mira.
//
// Es una columna y no un tablero nuevo porque toda la maquinaria de aquí
// —estados, adjuntos, permisos, el token de los agentes— vale igual para las
// dos. Lo único que cambia es quién lo ve.
//
// `servidores` (2026-08-22, Eugenio: «pondrás un kanban como el del hormiguero
// con las tareas que tienes pendientes») es LO CONTRARIO de `seguridad`: se
// enseña a todo el mundo a propósito, junto al coste real de las máquinas. Por
// eso el candado de abajo nombra a `seguridad` y no a «todo lo que no sea
// general» — lo que se esconde se decide una por una, no por descarte.
const AREAS = new Set(['general', 'seguridad', 'servidores']);

const nuevoId = () => `INC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export function registerIncidenciasRoutes(app: Express, db: any) {
  /** GET /api/incidencias — todo el hormiguero, lo más nuevo primero.
   *
   *  SIN FILTRO POR AUTOR: esto no es la bandeja de nadie, es un tablero
   *  común. Ver lo que ya reportó otro es lo que evita reportarlo dos veces. */
  app.get('/api/incidencias', async (req: Request, res: Response) => {
    try {
      // Sin decir nada se devuelve el Hormiguero de siempre. Un cliente viejo
      // que no conozca `area` sigue viendo exactamente lo que veía — menos las
      // de seguridad, que es el objetivo.
      const area = AREAS.has(String(req.query.area)) ? String(req.query.area) : 'general';

      // ══ EL TABLERO DE SEGURIDAD NO SE ENSEÑA A CUALQUIERA ════════════════
      // Un tablero de seguridad es, literalmente, LA LISTA DE POR DÓNDE
      // ENTRAR. Si esto heredara la visibilidad del Hormiguero —que no pide ni
      // sesión— publicaríamos los agujeros conocidos a quien pase por ahí.
      //
      // Lo comprueba EL SERVIDOR y no la pantalla: una página que decide qué
      // enseñar no protege nada, porque la respuesta ya viajó entera al
      // navegador y basta con mirarla. Aviso de prog4 al revisar esto, y tiene
      // razón: es la única parte de este cambio que no es aditiva.
      if (area === 'seguridad') {
        const quien = await quienEscribe(req, db);
        if (!quien) return res.status(401).json({ error: 'Inicia sesión.' });
        if (!quien.admin) return res.status(403).json({ error: 'Este tablero es del equipo.' });

        // ══ Y ESTO INCLUYE A LOS PROGRAMADORES IA, A PROPÓSITO ═════════════
        // `quienEscribe` devuelve `admin: true` para un agente con su token,
        // así que cualquiera de nosotros lee este tablero entero. Es lo que se
        // quiere —somos quienes trabajamos estas notas— pero **cambia el
        // alcance del token** y por eso queda escrito aquí, señalado por prog4:
        //
        // Hasta hoy, lo peor que conseguía un token robado era dejar el
        // Hormiguero con un color equivocado. Desde hoy también abre la lista
        // de por dónde entrar. Si algún día se decide lo contrario, la línea
        // es `quien.clase === 'persona' && quien.admin` — y entonces ningún
        // agente puede trabajar estas notas, que es el precio.
      }
      const r = await db.execute(sql`
        SELECT i.*, u.display_name AS autor_nombre, u.avatar_url AS autor_foto,
          -- ══ LOS ADJUNTOS, EN LA MISMA CONSULTA ═══════════════════════════
          -- (2026-08-22, hormiguero: «permite adjuntar archivos cuando se
          -- reporta un bug»).
          --
          -- Van aquí y no en una llamada por nota: el tablero tiene decenas de
          -- notas y pedir los ficheros de cada una serían decenas de viajes
          -- para pintar una pantalla. Una captura pesa; su ficha no.
          --
          -- COALESCE a lista vacía: así «no tiene adjuntos» es una lista de
          -- cero y no un «null» que cada cliente tenga que recordar
          -- comprobar.
          COALESCE((
            SELECT json_agg(json_build_object(
                     'id', a.id, 'url', a.url, 'nombre', a.nombre,
                     'clase', a.clase, 'bytes', a.bytes) ORDER BY a.created_at)
            FROM archivos a
            WHERE a.incidencia_id = i.id AND a.archived_at IS NULL
          ), '[]'::json) AS adjuntos
        FROM incidencias i LEFT JOIN users u ON u.id = i.autor_user_id
        WHERE i.archived_at IS NULL AND i.area = ${area}
        ORDER BY
          -- EL ORDEN DICE QUÉ MIRAR ANTES:
          --   0 · bloqueada  — parada esperando a una persona. Enterrarla entre
          --                    lo demás es cómo algo se queda parado una semana.
          --   1 · esperando  — la cola de trabajo del equipo.
          --   2 · propuesta  — lo que ha entrado por el buzón y está por
          --                    aprobar. No es trabajo todavía, así que no puede
          --                    estar por encima de lo que sí lo es.
          --   3 · hecha
          CASE i.estado
            WHEN 'bloqueada' THEN 0 WHEN 'esperando' THEN 1
            WHEN 'propuesta' THEN 2 ELSE 3 END,
          i.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      console.error('incidencias GET:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/incidencias — anotar algo que falla o que falta. */
  app.post('/api/incidencias', async (req: Request, res: Response) => {
    // Puede anotar una persona con sesión o un PROGRAMADOR IA con su token
    // (2026-08-22): un agente que encuentra algo mientras trabaja tiene que
    // poder dejarlo escrito aquí en vez de contarlo en un chat que se pierde.
    const quien = await quienEscribe(req, db);
    if (!quien) return res.status(401).json({ error: 'Inicia sesión para anotar algo.' });
    try {
      const titulo = String(req.body?.titulo || '').trim();
      if (!titulo) return res.status(400).json({ error: 'Cuéntame en una línea qué pasa.' });
      const clase = CLASES.has(String(req.body?.clase)) ? String(req.body.clase) : 'fallo';
      // El tablero de seguridad NO recibe notas de fuera del equipo: una
      // propuesta anónima ahí sería un sitio público donde escribir lo que se
      // ha encontrado, que es exactamente lo que estamos quitando del
      // Hormiguero. De fuera, todo entra en `general`.
      const areaPedida = AREAS.has(String(req.body?.area)) ? String(req.body.area) : 'general';
      const id = nuevoId();

      // ══ DE QUIÉN VIENE DECIDE DÓNDE ENTRA (2026-08-22) ═══════════════════
      // Del equipo —un administrador, o un programador IA— entra en la cola de
      // trabajo. De cualquier otra persona entra como PROPUESTA, a la espera de
      // que Eugenio la apruebe. No es desconfianza: es que «lo que hay que
      // hacer» y «lo que alguien ha sugerido» son dos listas distintas, y
      // juntarlas hace que la primera deje de decir nada.
      //
      // Se guarda como una FOTO (`de_admin`), no como una consulta al rol de
      // hoy: si alguien asciende mañana, sus notas de ayer no pueden
      // reescribirse como si siempre hubiera sido del equipo.
      const delEquipo = quien.clase === 'agente' || quien.admin;
      const estadoInicial = delEquipo ? 'esperando' : 'propuesta';
      await db.execute(sql`
        INSERT INTO incidencias (id, titulo, detalle, clase, autor_user_id, respondido_por,
                                 de_admin, estado, area)
        VALUES (${id}, ${titulo.slice(0, 300)}, ${req.body?.detalle || null}, ${clase},
                ${quien.clase === 'persona' ? quien.id : null},
                ${quien.clase === 'agente' ? quien.nombre : null},
                ${delEquipo}, ${estadoInicial}, ${delEquipo ? areaPedida : 'general'})
      `);
      const r = await db.execute(sql`
        SELECT i.*, u.display_name AS autor_nombre, u.avatar_url AS autor_foto
        FROM incidencias i LEFT JOIN users u ON u.id = i.autor_user_id WHERE i.id = ${id}
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('incidencias POST:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/incidencias/:id — cambiar estado, responder, o corregir la tuya.
   *
   * EL ESTADO ES DE QUIEN PROGRAMA. Un administrador puede moverlo y dejar
   * dicho qué necesita; el autor solo puede corregir el texto de la suya
   * mientras siga esperando. Dejar que el autor la marcase hecha convertiría el
   * tablero en una lista de deseos con casillas marcadas por ilusión.
   */
  app.put('/api/incidencias/:id', async (req: Request, res: Response) => {
    // ══ QUIÉN PUEDE MOVER ESTO ═══════════════════════════════════════════════
    // Una persona con sesión, o un PROGRAMADOR IA con su token (2026-08-22,
    // Eugenio: «así podréis daros permisos de edición del hormiguero y será más
    // fácil trabajar desde producción»).
    //
    // El agente entra por aquí y NO por la puerta de las personas: no tiene
    // `req.user`, así que ninguna otra ruta de la plataforma lo va a confundir
    // con alguien. Hasta hoy, poner una nota en verde exigía fabricar a mano
    // una sesión de Eugenio en producción —entrar como él sin su contraseña— o
    // escribir por SSH en la base de datos. Las dos cosas eran peores que esto.
    const quien = await quienEscribe(req, db);
    if (!quien) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const fila = await db.execute(sql`SELECT * FROM incidencias WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const i = fila.rows[0] as any;
      if (!i) return res.status(404).json({ error: 'Esa nota no existe.' });

      const admin = quien.admin;
      const suya = quien.clase === 'persona' && i.autor_user_id === quien.id;
      if (!admin && !suya) return res.status(403).json({ error: 'Esa nota no es tuya.' });

      const d = req.body || {};
      const estado = admin && ESTADOS.has(String(d.estado)) ? String(d.estado) : null;
      // MOVER UNA NOTA DE TABLERO. Solo un administrador, y por eso no está
      // junto a `titulo` y `detalle`: cambiar el área de una nota decide quién
      // puede volver a verla. Mover algo a `seguridad` lo esconde del público;
      // moverlo a `general` lo publica. Lo segundo es lo peligroso.
      const areaNueva = admin && AREAS.has(String(d.area)) ? String(d.area) : null;
      if (d.estado && !admin) {
        return res.status(403).json({ error: 'El estado lo cambia quien programa.' });
      }
      // «Bloqueada» SIN decir qué hace falta no se acepta: un naranja mudo es
      // exactamente el problema que este campo viene a resolver.
      if (estado === 'bloqueada' && !String(d.necesita || i.necesita || '').trim()) {
        return res.status(400).json({ error: 'Si está bloqueada, di qué hace falta.' });
      }

      await db.execute(sql`
        UPDATE incidencias SET
          titulo    = COALESCE(${suya && !i.respuesta ? (d.titulo ?? null) : null}, titulo),
          detalle   = COALESCE(${suya ? (d.detalle ?? null) : null}, detalle),
          estado    = COALESCE(${estado}, estado),
          area      = COALESCE(${areaNueva}, area),
          necesita  = COALESCE(${admin ? (d.necesita ?? null) : null}, necesita),
          respuesta = COALESCE(${admin ? (d.respuesta ?? null) : null}, respuesta),
          -- QUIÉN LO HA MOVIDO. Con dos agentes trabajando a la vez, «hecha» sin
          -- decir por quién es justo lo que hay que poder distinguir. Solo se
          -- escribe cuando de verdad se toca el estado o la respuesta: abrir la
          -- nota para corregir una falta no cambia quién la contestó.
          respondido_por = CASE
            WHEN ${estado !== null || (admin && d.respuesta != null)}::boolean
            THEN ${quien.nombre} ELSE respondido_por END,
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      const r = await db.execute(sql`
        SELECT i.*, u.display_name AS autor_nombre, u.avatar_url AS autor_foto
        FROM incidencias i LEFT JOIN users u ON u.id = i.autor_user_id WHERE i.id = ${req.params.id}
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('incidencias PUT:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE — se archiva, como todo aquí (regla 6 de la Constitución). */
  app.delete('/api/incidencias/:id', async (req: Request, res: Response) => {
    // UN PROGRAMADOR IA PUEDE RETIRAR LAS SUYAS, y solo las suyas (2026-08-22).
    // Encontrado al probar el token contra producción: un agente podía abrir
    // una nota y luego no tenía forma de retirarla, así que una abierta por
    // error se quedaba en el tablero de todos para siempre. Deshacer lo que uno
    // acaba de hacer no es un permiso de más: es la otra mitad del que ya tenía.
    const quien = await quienEscribe(req, db);
    if (!quien) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const fila = await db.execute(sql`SELECT autor_user_id, respondido_por FROM incidencias WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const i = fila.rows[0] as any;
      if (!i) return res.status(404).json({ error: 'Esa nota no existe.' });
      // Un agente no tiene fila en `users`: su autoría vive en el nombre con el
      // que la abrió.
      const suya = quien.clase === 'agente'
        ? i.respondido_por === quien.nombre
        : i.autor_user_id === quien.id;
      // UN AGENTE SOLO RETIRA LAS SUYAS, aunque para el resto de esta ruta
      // cuente como quien programa (2026-08-22, encontrado probándolo en
      // producción: Claude 2 pudo retirar una nota de Claude 1, porque
      // `admin` es verdadero para los dos y el permiso de administrador se
      // comía la comprobación de autoría).
      //
      // Mover un estado es reversible y queda firmado; retirar una nota la
      // quita del tablero de TODOS. Que un agente pueda borrar lo que ha
      // escrito Eugenio no lo pidió nadie, y es justo lo que el alcance corto
      // venía a evitar. Una persona administradora sí puede: es su tablero.
      const puedeRetirar = quien.clase === 'agente' ? suya : (suya || quien.admin);
      if (!puedeRetirar) {
        return res.status(403).json({ error: 'Esa nota no es tuya.' });
      }
      await db.execute(sql`UPDATE incidencias SET archived_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/incidencias/cuenta — para el punto del botón de la hormiga.
   *  Solo el número, como la campana: pedir la lista entera para pintar un
   *  punto es traerse un tablero para mirar un color. */
  app.get('/api/incidencias/cuenta', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE estado = 'bloqueada')::int AS bloqueadas,
          count(*) FILTER (WHERE estado = 'esperando')::int AS esperando,
          -- Lo que está por aprobar se cuenta aparte: no es trabajo pendiente,
          -- es una decisión pendiente, y son dos cosas que se atienden en
          -- momentos distintos.
          count(*) FILTER (WHERE estado = 'propuesta')::int AS propuestas
        -- SOLO EL HORMIGUERO. El punto de la hormiga lo ve cualquiera, así
        -- que si contara también las de seguridad, ese número diría cuántos
        -- agujeros abiertos hay a quien no puede ver ni uno. Un contador
        -- también filtra información.
        FROM incidencias WHERE archived_at IS NULL AND area = 'general'
      `);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
