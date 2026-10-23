import type { Express } from 'express';

// ============================================================================
// LA MEMORIA CORTA DE LAS LECTURAS PÚBLICAS (2026-10-22, Eugenio)
// ============================================================================
// «Mejora los 0,9 s de la API.» Medido con una copia de producción: abrir la
// página de una entrada (`/api/sitio/pagina/:id`, Movilidad) hacía 414
// consultas. Las mismas preguntas una y otra vez: «¿se ve esta página?» (62
// subidas recursivas por el árbol), «¿en qué páginas está esta tabla?» (68) y
// la tabla entera leída por la ficha de cada relación. Cada consulta tarda
// poco; juntas, casi un segundo.
//
// Esas respuestas son las mismas para cualquier lector anónimo y sólo cambian
// cuando alguien ESCRIBE. Así que se guardan unos segundos y se tiran en
// cuanto entra cualquier escritura (POST, PUT, PATCH o DELETE a la API): quien
// edita nunca ve una respuesta vieja, y quien lee no repite el trabajo.
//
// Se guarda la PROMESA, no el resultado: diez peticiones a la vez que
// preguntan lo mismo esperan a la misma consulta en vez de lanzar diez.

const todas = new Set<Map<string, { t: number; v: Promise<any> }>>();

export function cacheCorta<T>(ms = 30_000) {
  const m = new Map<string, { t: number; v: Promise<T> }>();
  todas.add(m);
  return {
    dar(clave: string, hacer: () => Promise<T>): Promise<T> {
      const x = m.get(clave);
      if (x && Date.now() - x.t < ms) return x.v;
      const v = hacer();
      m.set(clave, { t: Date.now(), v });
      v.catch(() => m.delete(clave));
      if (m.size > 5000) m.delete(m.keys().next().value as string);
      return v;
    },
  };
}

/**
 * Una ruta GET cuya respuesta es la misma para todos (los territorios del mapa):
 * se guarda la respuesta entera por dirección y las siguientes salen de memoria.
 */
export function memoRespuesta(ms = 600_000) {
  const m = new Map<string, { t: number; codigo: number; cuerpo: any }>();
  todas.add(m as any);
  return (req: any, res: any, next: any) => {
    if (req.method !== 'GET' || req.user) return next();
    const clave = req.originalUrl;
    const x = m.get(clave);
    if (x && Date.now() - x.t < ms) {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1500');
      return res.status(x.codigo).json(x.cuerpo);
    }
    const json = res.json.bind(res);
    res.json = (cuerpo: any) => {
      if (res.statusCode === 200) { m.set(clave, { t: Date.now(), codigo: 200, cuerpo }); if (m.size > 2000) m.delete(m.keys().next().value as string); }
      return json(cuerpo);
    };
    next();
  };
}

/** Tira todo lo guardado. */
export function vaciarCaches() { for (const m of todas) m.clear(); }

/** Escrituras que no cambian ni páginas, ni tablas, ni quién ve qué: contar una
 *  visita (cada página publicada manda una al abrirse), entrar, seguir, comentar,
 *  subir un archivo (aún no está en ninguna página)… Si vaciaran la memoria, cada
 *  visita la tiraría y no serviría de nada. */
const NO_CAMBIAN = /^\/api\/(estadisticas|seguir|auth|uploads|voz|valoraciones|comments|comentarios|report|notifications|avisos|feedback|chat|ai|medicion|cesta|publicar\/favoritos|sitio-miembros\/[^/]+\/(entrar|salir|registro|enlace|pedir-acceso|guardados))(\/|$)/;

/** Cualquier otra escritura vacía la memoria (montado al principio, `modulos.ts`). */
export function registrarVaciado(app: Express) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && !NO_CAMBIAN.test(req.path)) {
      vaciarCaches();
      // Y OTRA VEZ AL TERMINAR (2026-10-23): una lectura que llegue mientras se
      // escribe guardaría lo de antes, y se serviría viejo 30 s (pasó al
      // ordenar las pestañas de la red: recargar enseñaba el orden anterior).
      res.on('finish', vaciarCaches);
    }
    next();
  });
}
