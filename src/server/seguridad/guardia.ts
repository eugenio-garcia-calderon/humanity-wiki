// ============================================================================
// EL GUARDIÁN: LA TABLA, APLICADA (fase 0, 2026-08-22)
// ============================================================================
// `politica.ts` dice quién puede escribir por cada ruta. Esto lo aplica, antes
// de que la petición llegue a ninguna ruta.
//
// ── ARRANCA EN MODO «AVISAR», Y ESO NO ES TIMIDEZ ──────────────────────────
// Un guardián puesto de golpe sobre 150 rutas no protege: rompe. Basta con que
// una sola línea de la tabla diga «nivel 2» donde el código pedía sesión para
// que alguien deje de poder trabajar, y el fallo aparece en producción, en
// forma de gente que no puede hacer su trabajo.
//
//   SEGURIDAD_MODO=avisar   (por defecto)  anota lo que HABRÍA rechazado
//   SEGURIDAD_MODO=exigir                  rechaza de verdad
//
// El camino es: se despliega avisando, se leen los avisos unos días, y cuando
// el registro sale limpio se cambia una variable de entorno. Si hubiera que
// volver atrás, se vuelve cambiando esa misma variable — sin desplegar nada.
//
// ── LO QUE NO PUEDE COMPROBAR, LO DICE ─────────────────────────────────────
// «Ser el dueño de esto» no se puede resolver aquí: hace falta ir a la base de
// datos a ver de quién es la cosa, y eso ya lo hace la ruta. El guardián exige
// lo que SÍ sabe (que haya sesión) y deja el resto a la ruta. Y con las
// `revisar` no hace absolutamente nada: nadie las ha mirado, así que no puede
// afirmar nada sobre ellas — la tercera respuesta, otra vez.
import type { Express, Request, Response, NextFunction } from 'express';
import { politicaDe, type Guardia } from './politica.js';

const ESCRITURAS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type Modo = 'avisar' | 'exigir';

/** Se lee en cada petición, no al cargar el módulo: así cambiar la variable no
 *  obliga a reconstruir la imagen, solo a reiniciar el proceso. */
const modo = (): Modo => (process.env.SEGURIDAD_MODO === 'exigir' ? 'exigir' : 'avisar');

interface Veredicto {
  /** `null` = la petición pasa. */
  codigo: 401 | 403 | null;
  mensaje?: string;
  /** Qué se ha podido comprobar de verdad, para el registro. */
  comprobado: string;
}

/** Un token de programador IA. No se valida aquí (eso cuesta una consulta y ya
 *  lo hace `agenteDe`): solo se mira si viene, que es lo que el guardián
 *  necesita para no cerrarle la puerta a un agente legítimo. */
const traeTokenDeAgente = (req: Request) =>
  (req.header('authorization') || '').startsWith('Bearer hw_ia_');

function juzgar(g: Guardia, req: Request): Veredicto {
  const nivel = req.user?.roleLevel ?? 0;
  const haySesion = !!req.user;

  switch (g.tipo) {
    case 'publica':
    case 'firma':
      return { codigo: null, comprobado: g.tipo };

    case 'revisar':
      // Nadie la ha revisado: el guardián no opina. La ruta sigue mandando.
      return { codigo: null, comprobado: 'sin revisar' };

    case 'sesion':
      return haySesion
        ? { codigo: null, comprobado: 'sesión' }
        : { codigo: 401, mensaje: 'Debes iniciar sesión.', comprobado: 'sesión' };

    case 'agente':
      return haySesion || traeTokenDeAgente(req)
        ? { codigo: null, comprobado: 'sesión o token de agente' }
        : { codigo: 401, mensaje: 'Debes iniciar sesión.', comprobado: 'sesión o token de agente' };

    case 'propietario':
      // Aquí solo se puede exigir el suelo: que haya alguien. De quién es la
      // cosa lo sabe la ruta, y lo comprueba ella.
      return haySesion
        ? { codigo: null, comprobado: 'hay sesión (el dueño lo comprueba la ruta)' }
        : { codigo: 401, mensaje: 'Debes iniciar sesión.', comprobado: 'hay sesión' };

    case 'nivel':
      if (!haySesion) return { codigo: 401, mensaje: 'Debes iniciar sesión.', comprobado: `nivel ${g.minimo}` };
      return nivel >= g.minimo
        ? { codigo: null, comprobado: `nivel ${g.minimo}` }
        : { codigo: 403, mensaje: `Requiere nivel ${g.minimo} o superior.`, comprobado: `nivel ${g.minimo}` };
  }
}

/**
 * Se registra ANTES que los módulos de rutas, y después de `attachUser` —
 * necesita `req.user` ya puesto para poder mirar el nivel.
 */
export function registrarGuardia(app: Express) {
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (!ESCRITURAS.has(req.method)) return next();

    // `req.baseUrl` es '/api'; `req.path` viene sin él. La tabla guarda la
    // ruta entera, así que se recompone: comparar media ruta no encontraría
    // nada y el guardián se quedaría callado creyendo que todo va bien.
    const ruta = (req.baseUrl || '') + (req.path || '');
    const entrada = politicaDe(req.method, ruta);

    if (!entrada) {
      // Una ruta que escribe y no está en la tabla. La auditoría lo impide en
      // el código, así que si aparece aquí es que se ha montado en caliente.
      console.warn(`[seguridad] ruta sin declarar: ${req.method} ${ruta}`);
      return next();
    }

    const v = juzgar(entrada.guardia, req);
    if (!v.codigo) return next();

    if (modo() === 'exigir') {
      return res.status(v.codigo).json({ error: v.mensaje });
    }
    console.warn(
      `[seguridad] avisar: habría devuelto ${v.codigo} en ${req.method} ${ruta} ` +
      `(exige ${v.comprobado}; quien llama tiene nivel ${req.user?.roleLevel ?? 'sin sesión'})`,
    );
    return next();
  });
}
