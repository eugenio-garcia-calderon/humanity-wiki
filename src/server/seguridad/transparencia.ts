// ============================================================================
// LO QUE UN ADMINISTRADOR MIRA, QUEDA ESCRITO (2026-08-22)
// ============================================================================
// Eugenio: «haz lo que falte para que los datos de los usuarios estén seguros
// incluso protegidos de los administradores e IAs».
//
// ── LO QUE HAY HOY, MEDIDO ANTES DE ESCRIBIR NADA ──────────────────────────
// Un administrador puede, desde el navegador de base de datos de la propia
// plataforma (`GET /api/db/tables/:name`), **leer el contenido de cualquier
// tabla**: las conversaciones privadas, las finanzas que cada uno anota en su
// Juego Vital, las filas de las tablas que la gente crea. Dos clics. Y no queda
// constancia en ninguna parte de que lo haya hecho.
//
// Eso no se arregla del todo sin cifrado de punta a punta —que es una decisión
// de producto con un precio: quien pierde la contraseña pierde el contenido— y
// esa decisión es de Eugenio, no mía. Está escrita, con sus alternativas, en
// `memory/09_TARGET_ARCHITECTURE/06_PROTECT_FROM_ADMINS.md`.
//
// Mientras tanto, esto hace las dos cosas que sí se pueden hacer hoy:
//
//   1. CERRAR LA PUERTA ANCHA. Hay tablas que NO se sirven por el navegador
//      genérico, a nadie, ni siquiera al administrador. No es que el dato
//      desaparezca: es que la forma cómoda de leerlo entero deja de existir, y
//      quien lo necesite de verdad tendrá que abrir una ruta con su motivo.
//   2. DEJAR RASTRO DE LO DEMÁS. Toda lectura privilegiada que sí se permite
//      queda anotada en el registro sellado — encadenada y firmada, donde
//      **quien la hizo no la puede borrar**.
//
// ── POR QUÉ ESTO NO ES «SEGURIDAD DE VERDAD», Y AUN ASÍ IMPORTA ────────────
// Un administrador sigue pudiendo leer casi todo por otros caminos, y quien
// tenga la contraseña de la base de datos se salta esto entero. Lo que cambia
// es que **mirar deja de ser gratis**: hay un sitio donde se ve quién miró qué
// y cuándo. Contra el descuido y contra el abuso ocasional, eso funciona; contra
// alguien decidido con acceso al servidor, no. Decirlo es parte del trabajo.
import type { Express, Request, Response, NextFunction } from 'express';
import { anotar } from './registro.js';

/**
 * Tablas que NO se sirven por el navegador genérico de base de datos.
 *
 * El criterio no es «son importantes» —eso lo dice la clasificación— sino:
 * **¿el contenido de esta tabla es de una persona y no nuestro?** Un
 * administrador tiene motivos legítimos para mirar territorios o indicadores.
 * No tiene ninguno para leerse las conversaciones de dos personas desde un
 * listado genérico.
 */
export const NO_SE_ASOMAN = new Map<string, string>([
  ['mensajes', 'conversaciones privadas entre dos personas'],
  ['sessions', 'una sesión abierta es una llave: leerla es poder usarla'],
  ['password_resets', 'un testigo de restablecimiento abre la cuenta de otro'],
  ['agentes_ia', 'las huellas de las llaves de los programadores IA'],
  ['game_finanzas', 'las finanzas personales que cada uno anota en su juego'],
  ['objetivos_financieros', 'sus objetivos de ahorro'],
  ['bd_filas', 'los datos de las tablas que crea la gente: puede haber cualquier cosa'],
  ['ai_conversations', 'lo que cada persona le cuenta al asistente'],
  ['ai_messages', 'los mensajes de esas conversaciones'],
  ['spotify_accounts', 'llaves de una cuenta de otro servicio'],
  ['youtube_accounts', 'llaves de una cuenta de otro servicio'],
  ['content_reports', 'quién ha denunciado a quién'],
]);

/** Las rutas de lectura que solo puede usar quien manda, y qué enseñan.
 *  Se declaran a mano y no se deducen: igual que la tabla de permisos, esto
 *  dice lo que DEBERÍA vigilarse, no lo que el código hace hoy. */
const LECTURAS_PRIVILEGIADAS: { patron: RegExp; que: string }[] = [
  { patron: /^\/api\/db\/tables\/([a-z_]+)/, que: 'el contenido de una tabla entera' },
  { patron: /^\/api\/db\/tables$/, que: 'la lista de tablas y cuántas filas tiene cada una' },
  { patron: /^\/api\/admin\/users/, que: 'la lista de personas con sus correos' },
  { patron: /^\/api\/incidencias\?.*area=seguridad/, que: 'el tablero de seguridad' },
];

/**
 * Se registra como un módulo más, y **antes** que las rutas que vigila.
 *
 * No decide permisos: eso ya lo hacen las rutas. Hace dos cosas distintas y las
 * hace por separado a propósito — una corta, la otra solo mira.
 */
export function registrarTransparencia(app: Express, db: any) {
  // ── 1. La puerta ancha, cerrada ──────────────────────────────────────────
  app.get('/api/db/tables/:name', (req: Request, res: Response, next: NextFunction) => {
    const motivo = NO_SE_ASOMAN.get(String(req.params.name || '').toLowerCase());
    if (!motivo) return next();

    // A quien no es administrador le contesta la ruta de siempre con su 401 o
    // su 403. Si respondiéramos nosotros, alguien sin permisos aprendería que
    // esa tabla existe y que está protegida aparte — información gratis a
    // cambio de nada. Esto va contra el administrador, que es el único que
    // llegaría a leerla.
    if ((req.user?.roleLevel ?? 0) < 4) return next();

    // Se anota el intento, tanto si venía de buena fe como si no. Un rechazo
    // que no deja rastro no distingue «alguien se equivocó de tabla» de
    // «alguien lo intentó tres veces seguidas de madrugada».
    anotar(db, {
      clase: 'lectura_denegada',
      actor: req.user?.id || 'sin sesión',
      asunto: `tabla:${req.params.name}`,
      datos: { ruta: req.path, motivo, nivel: req.user?.roleLevel ?? 0 },
    }).catch(() => { /* el registro no puede tumbar una respuesta */ });

    return res.status(403).json({
      error: `Esta tabla no se puede leer desde el navegador de base de datos: ${motivo}. `
           + 'No es una limitación de tu nivel: no la puede leer nadie por aquí. '
           + 'Si hace falta para algo concreto, se abre una ruta para ese algo concreto.',
    });
  });

  // ── 2. Lo demás: se permite y se anota ───────────────────────────────────
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const ruta = (req.baseUrl || '') + (req.path || '');
    const entera = ruta + (req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '');
    const cual = LECTURAS_PRIVILEGIADAS.find((l) => l.patron.test(entera) || l.patron.test(ruta));
    if (!cual) return next();

    // Solo interesa cuando quien mira tiene poder para ver lo que no es suyo.
    // Una persona normal pidiendo `/api/admin/users` recibe un 403 de la ruta y
    // eso no es un hecho que merezca guardarse para siempre.
    const nivel = req.user?.roleLevel ?? 0;
    const esAgente = (req.header('authorization') || '').startsWith('Bearer hw_ia_');
    if (nivel < 4 && !esAgente) return next();

    anotar(db, {
      clase: 'lectura_privilegiada',
      actor: esAgente ? 'agente:token' : (req.user?.id || 'desconocido'),
      asunto: ruta,
      // Nunca el contenido: qué se miró, no qué ponía. Este registro se resume
      // hacia fuera (fase D) y lo que sale no puede hablar de nadie.
      datos: { que: cual.que, nivel, agente: esAgente },
    }).catch(() => { /* nunca bloquea la lectura */ });

    return next();
  });

  // ── 3. Y que se pueda mirar ──────────────────────────────────────────────
  /** GET /api/seguridad/miradas — quién ha usado sus privilegios para mirar.
   *
   *  Lo ve **cualquiera con sesión**, no solo un administrador, y eso es el
   *  punto entero: un registro de vigilancia que solo pueden leer los vigilados
   *  por él no vigila nada. */
  app.get('/api/seguridad/miradas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const { sql } = await import('drizzle-orm');
      const r = await db.execute(sql`
        SELECT n, momento, clase, actor, asunto, datos
        FROM registro_sellado
        WHERE clase IN ('lectura_privilegiada', 'lectura_denegada')
        ORDER BY n DESC LIMIT 200
      `);
      res.json({
        // Se dice lo que esto es y lo que no, en la propia respuesta: quien lo
        // lea desde fuera no tiene por qué saber el alcance de memoria.
        alcance: 'Lecturas privilegiadas anotadas desde que existe el registro sellado. '
               + 'Dice QUÉ se miró y quién, nunca qué ponía. No cubre lo que alguien pueda '
               + 'leer directamente en la base de datos con la contraseña del servidor.',
        miradas: r.rows,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
