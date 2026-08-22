// ============================================================================
// LOS PROGRAMADORES IA (2026-08-22)
// ============================================================================
// Eugenio: «crea un código que te permita sin mayor complicación tener un
// usuario de programador IA propia […] y así podréis daros permisos de edición
// del hormiguero y será más fácil trabajar desde producción».
//
// Un agente se identifica con un TOKEN en la cabecera, no con una sesión:
//
//     Authorization: Bearer hw_ia_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// ── POR QUÉ UN TOKEN Y NO UNA CUENTA CON CONTRASEÑA ────────────────────────
// Una cuenta trae sesión, cookie y con ella la plataforma entera. Un token es
// una llave sola: no caduca en una cookie, no se arrastra entre pestañas, no se
// puede usar desde un navegador que alguien deje abierto, y se apaga cambiando
// una fila. Y sobre todo: se puede limitar a UNA cosa, que es lo que hace falta.
//
// ── LO QUE ESTE MÓDULO NO HACE, A PROPÓSITO ────────────────────────────────
// No devuelve un `req.user`. Ni uno falso, ni uno «equivalente a admin». Si un
// agente pudiera hacerse pasar por una persona, cada comprobación de permisos
// de la plataforma —las de proyectos, las de páginas, las de tablas— lo estaría
// dejando pasar sin haber decidido nunca que quería dejarlo. Aquí devuelve un
// agente, y solo las rutas que saben qué es un agente lo aceptan. Hoy: las del
// hormiguero.
//
// ── EL RIESGO REAL, ESCRITO ────────────────────────────────────────────────
// Un agente LEE el hormiguero, y en el hormiguero escribe cualquiera. O sea:
// lee texto de desconocidos teniendo una llave de producción en la mano. Si esa
// llave abriera más puertas, una nota bien escrita podría dirigirlo a abrirlas.
// Con este alcance, lo peor que puede salir de ahí es una nota con el color
// equivocado: se ve, se deshace, y lleva al lado el nombre de quien lo hizo.
import type { Request } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface AgenteIA { id: string; nombre: string }

/** El prefijo hace reconocible un token a simple vista: si alguno aparece en un
 *  registro, en un pegado o en una captura, se sabe QUÉ es y hay que retirarlo.
 *  Un secreto que no se puede reconocer es un secreto que nadie revoca. */
export const PREFIJO_TOKEN = 'hw_ia_';

/** La huella de un token. SHA-256 y no bcrypt a propósito: un token de 32 bytes
 *  aleatorios no se adivina por fuerza bruta como una contraseña humana, y aquí
 *  se comprueba en cada petición — un hash lento sería un peaje por llamada. */
export const huellaDe = (token: string) =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

/** Un token nuevo. 32 bytes de aleatoriedad criptográfica: 256 bits. */
export const nuevoToken = () =>
  PREFIJO_TOKEN + crypto.randomBytes(32).toString('hex');

/**
 * Quién viene en esta petición, si es un agente.
 *
 * Devuelve `null` cuando no hay token o no vale — nunca lanza y nunca dice por
 * qué falló. Que un token inválido y uno revocado den la misma respuesta es
 * deliberado: la diferencia solo le sirve a quien esté probando llaves.
 *
 * SE ANOTA EL ÚLTIMO USO, sin esperar a que termine. Sirve para ver de un
 * vistazo qué agentes siguen vivos y cuáles se pueden apagar; que esa escritura
 * retrase la respuesta sería pagar latencia por una estadística.
 */
export async function agenteDe(req: Request, db: any): Promise<AgenteIA | null> {
  const cabecera = req.header('authorization') || '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
  if (!token.startsWith(PREFIJO_TOKEN)) return null;
  try {
    const r = await db.execute(sql`
      SELECT id, nombre FROM agentes_ia
      WHERE token_hash = ${huellaDe(token)} AND activo
    `);
    const a = r.rows[0] as any;
    if (!a) return null;
    db.execute(sql`UPDATE agentes_ia SET ultimo_uso = now() WHERE id = ${a.id}`)
      .catch(() => { /* la marca de uso no puede tumbar una petición */ });
    return { id: a.id, nombre: a.nombre };
  } catch {
    // La tabla puede no existir todavía (código desplegado antes que la
    // migración). Entonces no hay agentes, que es la verdad.
    return null;
  }
}

/**
 * Quién está escribiendo: una persona con sesión, un agente con token, o nadie.
 *
 * Un solo sitio que conteste a esa pregunta, para que las rutas no tengan que
 * acordarse de mirar en dos lados. El que se olvidara de mirar el token dejaría
 * fuera a los agentes; el que se olvidara de mirar la sesión, a las personas.
 */
export async function quienEscribe(req: Request, db: any): Promise<
  | { clase: 'persona'; id: string; nombre: string; admin: boolean }
  | { clase: 'agente'; id: string; nombre: string; admin: true }
  | null
> {
  if (req.user) {
    return {
      clase: 'persona',
      id: req.user.id,
      nombre: (req.user as any).displayName || (req.user as any).display_name || 'Alguien',
      admin: (req.user.roleLevel ?? 0) >= 4,
    };
  }
  const a = await agenteDe(req, db);
  // `admin: true` significa aquí «puede mover el estado de una nota», que es lo
  // único que este permiso decide EN LAS RUTAS QUE ACEPTAN AGENTES. No es un
  // rol de la plataforma y no vale fuera del hormiguero.
  return a ? { clase: 'agente', id: a.id, nombre: a.nombre, admin: true } : null;
}
