// ============================================================================
// CUÁNTO TARDA CADA RUTA, Y DÓNDE SE VA EL TIEMPO (2026-08-22)
// ============================================================================
// Fase 2 de la optimización, y va la segunda a propósito: **hoy no existe
// ninguna medida de tiempos**. Se puede saber cuánto pesa el JavaScript y
// cuántos índices faltan mirando el código, pero «qué ruta es lenta con
// tráfico» no se deduce leyendo — y sin ese dato, cada mejora siguiente es una
// opinión con buena intención.
//
// ── LO QUE MIDE, Y POR QUÉ ESTAS TRES COSAS ────────────────────────────────
// Por cada ruta: cuántas veces se ha pedido, cuánto tarda (mediana, p95, p99 y
// el peor caso), **cuánto de eso fue esperando a la base de datos** y
// **cuántas consultas hizo**.
//
// Las dos últimas son las que convierten el número en una decisión. «Esta ruta
// tarda 400 ms» no dice qué hacer. «Esta ruta tarda 400 ms, 380 en la base de
// datos, repartidos en 47 consultas» dice exactamente qué hacer: son 47
// consultas donde debería haber una. Y «tarda 400 ms, 5 en la base de datos»
// dice lo contrario: el problema está en Node y la base de datos es inocente.
//
// ── POR QUÉ NO GUARDA CADA PETICIÓN ────────────────────────────────────────
// Porque a millones de usuarios eso es el problema, no la medida. Se guardan
// **cubos**: un histograma de 24 cubos por ruta, memoria fija, sin arrays que
// crezcan. Cuesta O(1) por petición y ocupa lo mismo con mil visitas que con
// mil millones. Los percentiles salen del histograma, así que son aproximados
// —±10 % dentro del cubo— y eso es de sobra para decidir qué arreglar. Una
// medida exacta que haya que apagar cuando hay tráfico no sirve para nada.
//
// ── SE AGRUPA POR PATRÓN DE RUTA, NO POR URL ───────────────────────────────
// `/api/territories/T003` y `/api/territories/T052` son la misma ruta. Guardar
// una fila por URL haría crecer la memoria con el catálogo y enterraría la
// señal: se agrupa por el patrón que casó Express (`/api/territories/:id`).
//
// ── LO QUE ESTO NO ES ──────────────────────────────────────────────────────
// No es un sistema de monitorización. Vive en memoria y se pierde al
// reiniciar, así que sirve para «qué está lento ahora y por qué», no para «qué
// pasó el martes». El paso siguiente —cuando haya con qué compararlo— es
// volcarlo cada hora a una tabla. Se hará cuando estos números digan que hace
// falta, no antes.
import type { Express, Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ROLE } from './auth.js';

/** Lo que se va acumulando durante UNA petición. */
type Contexto = { consultas: number; msBaseDatos: number };

const contexto = new AsyncLocalStorage<Contexto>();

/**
 * Los bordes de los cubos, en milisegundos.
 *
 * Se estrechan donde importa decidir. Entre 1 ms y 100 ms es donde vive una
 * ruta sana y donde se nota una que empieza a torcerse; por encima de un
 * segundo da igual si son 3.000 o 4.000 ms, ya hay que arreglarlo.
 */
const CUBOS = [
  1, 2, 3, 5, 8, 12, 18, 25, 35, 50, 70, 100,
  140, 200, 300, 450, 700, 1000, 1500, 2500, 4000, 7000, 15000, Infinity,
];

type Fila = {
  n: number;
  suma: number;
  peor: number;
  errores: number;
  consultas: number;
  msBaseDatos: number;
  cubos: number[];
};

const nueva = (): Fila => ({
  n: 0, suma: 0, peor: 0, errores: 0, consultas: 0, msBaseDatos: 0,
  cubos: new Array(CUBOS.length).fill(0),
});

const rutas = new Map<string, Fila>();
let desde = Date.now();

/** UN TOPE DURO DE RUTAS DISTINTAS. Si algún día una ruta se cuela sin patrón
 *  —un 404, una URL rara— esto impide que la medición se convierta ella misma
 *  en una fuga de memoria. Prefiero perder la ruta 500 que tumbar el
 *  servidor por contarla. */
const MAX_RUTAS = 500;

function apunta(clave: string, ms: number, error: boolean, ctx: Contexto) {
  let f = rutas.get(clave);
  if (!f) {
    if (rutas.size >= MAX_RUTAS) return;
    f = nueva();
    rutas.set(clave, f);
  }
  f.n++;
  f.suma += ms;
  if (ms > f.peor) f.peor = ms;
  if (error) f.errores++;
  f.consultas += ctx.consultas;
  f.msBaseDatos += ctx.msBaseDatos;
  let i = 0;
  while (i < CUBOS.length - 1 && ms > CUBOS[i]) i++;
  f.cubos[i]++;
}

/** El percentil que sale del histograma: el borde del cubo donde cae. */
function percentil(f: Fila, p: number): number {
  const objetivo = f.n * p;
  let acumulado = 0;
  for (let i = 0; i < f.cubos.length; i++) {
    acumulado += f.cubos[i];
    if (acumulado >= objetivo) return CUBOS[i] === Infinity ? f.peor : CUBOS[i];
  }
  return f.peor;
}

/**
 * Envuelve el acceso a la base de datos para saber cuánto se espera en él.
 *
 * NO CAMBIA NADA DE LO QUE HACE `db`: llama a lo mismo, devuelve lo mismo y
 * deja pasar los errores tal cual. Solo apunta el tiempo, y solo si hay una
 * petición en curso — un `db.execute` de arranque o de una tarea de fondo no
 * pertenece a ninguna ruta y no se cuenta en ninguna.
 */
export function medirBaseDeDatos<T extends { execute: (...a: any[]) => any }>(db: T): T {
  const original = db.execute.bind(db);
  (db as any).execute = async (...args: any[]) => {
    const ctx = contexto.getStore();
    if (!ctx) return original(...args);
    const t0 = process.hrtime.bigint();
    try {
      return await original(...args);
    } finally {
      ctx.consultas++;
      ctx.msBaseDatos += Number(process.hrtime.bigint() - t0) / 1e6;
    }
  };
  return db;
}

/**
 * El cronómetro. Va SEPARADO de las rutas de lectura, y no por gusto:
 *
 *   · el middleware tiene que montarse ANTES que todo lo demás, o mediría el
 *     trozo del medio en vez del tiempo que espera quien pide;
 *   · las rutas que ENSEÑAN la medida tienen que montarse DESPUÉS de la
 *     autenticación, porque comprueban que quien mira es administrador y
 *     `req.user` lo instala `registerAuthRoutes`.
 *
 * Estaban juntas y la consecuencia fue un 403 con una sesión de nivel 4
 * perfectamente válida: la ruta se registraba antes de que existiera
 * `req.user`, así que para ella no había nadie identificado. El fallo es la
 * lección: en Express el orden de montaje es parte del comportamiento.
 */
export function medirPeticiones(app: Express) {
  // Usa `res.on('finish')` en vez de envolver `res.json`, porque así también
  // cuenta lo que no devuelve JSON: una descarga, una redirección, un 500 de
  // los que no pasan por el manejador de errores.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api/')) return next();
    const t0 = process.hrtime.bigint();
    const ctx: Contexto = { consultas: 0, msBaseDatos: 0 };
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      // El PATRÓN que casó Express, no la URL. Si no casó ninguno (un 404),
      // se agrupa todo bajo una sola clave: qué URL exacta falló es cosa del
      // registro, no de una tabla de rendimiento.
      const patron = (req as any).route?.path
        ? `${req.method} ${(req.baseUrl || '') + (req as any).route.path}`
        : `${req.method} (sin ruta)`;
      apunta(patron, ms, res.statusCode >= 500, ctx);
    });
    contexto.run(ctx, next);
  });
}

export function registerMedicionRoutes(app: Express, db: any) {
  /**
   * GET /api/medicion/rutas — la tabla, para un administrador.
   *
   * Ordenada por TIEMPO TOTAL (n × mediana), no por la más lenta. Una ruta de
   * 2 segundos que se pide una vez al día importa menos que una de 80 ms que
   * se pide diez mil veces: la segunda es la que se lleva la máquina.
   */
  app.get('/api/medicion/rutas', async (req: Request, res: Response) => {
    if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
      return res.status(403).json({ error: 'Solo para administradores.' });
    }
    const filas = [...rutas.entries()].map(([ruta, f]) => {
      const mediana = percentil(f, 0.5);
      return {
        ruta,
        peticiones: f.n,
        media_ms: +(f.suma / f.n).toFixed(1),
        mediana_ms: mediana,
        p95_ms: percentil(f, 0.95),
        p99_ms: percentil(f, 0.99),
        peor_ms: +f.peor.toFixed(1),
        errores: f.errores,
        // Por petición, que es como se decide qué arreglar.
        consultas_por_peticion: +(f.consultas / f.n).toFixed(1),
        // OJO: SUMA, no reloj. Varias consultas en paralelo suman más de lo
        // que tarda la ruta entera. Sirve para comparar rutas entre sí y para
        // ver de un vistazo cuál hace demasiadas; no para decir «se pasó
        // tanto tiempo esperando».
        ms_base_datos_por_peticion: +(f.msBaseDatos / f.n).toFixed(1),
        // Cuánto del tiempo total de la máquina se lleva esta ruta.
        tiempo_total_ms: +f.suma.toFixed(0),
      };
    }).sort((a, b) => b.tiempo_total_ms - a.tiempo_total_ms);

    res.json({
      desde: new Date(desde).toISOString(),
      minutos: +((Date.now() - desde) / 60000).toFixed(1),
      // SE DICE QUE LOS PERCENTILES SON APROXIMADOS. Un número redondo que se
      // presenta como exacto se acaba citando como exacto.
      aviso: 'Los percentiles salen de un histograma de cubos: aproximados por arriba, nunca por abajo. '
        + '`ms_base_datos_por_peticion` es la SUMA del tiempo de todas las consultas, no el reloj: '
        + 'si van en paralelo puede salir mayor que el tiempo total de la ruta, y eso no es un error.',
      rutas: filas,
    });
  });

  /** Volver a empezar, para medir un cambio concreto sin el ruido de antes. */
  app.post('/api/medicion/reiniciar', async (req: Request, res: Response) => {
    if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
      return res.status(403).json({ error: 'Solo para administradores.' });
    }
    rutas.clear();
    desde = Date.now();
    res.json({ ok: true, desde: new Date(desde).toISOString() });
  });

  void db;
}
