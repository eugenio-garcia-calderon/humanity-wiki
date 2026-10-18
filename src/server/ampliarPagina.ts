// ============================================================================
// AMPLIAR UNA PÁGINA PUBLICADA (2026-10-18, Wikiproducts W2)
// ============================================================================
// `sitios.ts` arma una página publicada (`paginaPublica`) y escribe su HTML.
// Hay módulos que necesitan meter mano en las dos cosas sin entrar en ese
// fichero, que es de los más disputados del repositorio: la plantilla de
// ficha de una base de datos (W1) mezcla sus bloques con los de la fila y
// sabe que la página es un producto con precio y datos estructurados.
//
// Un módulo se apunta aquí desde su `montar()` en `modulos.ts`. Cada
// ampliación recibe la página ya filtrada para quien pregunta y la puede
// cambiar: sus `config.bloques`, y `meta`, que `sitios.ts` usa al escribir
// el `<head>`.
//
// `req` es `undefined` cuando se arma el HTML del servidor: ese HTML lo lee
// cualquiera (y los buscadores), así que se arma como un anónimo.
import type { Request } from 'express';

/** Lo que una ampliación puede decir del `<head>` de la página. */
export interface MetaPagina {
  /** El `<title>` y `og:title` (en un sitio propio, sin la marca de la plataforma). */
  titulo?: string;
  /** `meta description` y `og:description`. Si no se dice, el primer párrafo
   *  de la página (`descripcionDe`). La ficha de producto guarda su resumen en
   *  un bloque de propiedad, no en un párrafo. */
  descripcion?: string;
  /** `og:type`: `website` si no se dice. */
  ogType?: string;
  /** `false` escribe `noindex` (p. ej. una ficha que no llega al umbral, R10). */
  indexable?: boolean;
  /** Datos estructurados (schema.org). Se escriben como `application/ld+json`.
   *  La ampliación no sabe por qué dirección se abre la página: un texto que
   *  sea exactamente `{{canonica}}` se cambia por la dirección canónica, y uno
   *  que empiece por `/` se completa con el dominio de esa canónica. */
  jsonLd?: object | object[];
  /** `<meta>` extra: `{ property: 'product:price:amount', content: '149.99' }`. */
  metas?: Array<{ property?: string; name?: string; content: string }>;
}

export type Ampliacion = (db: any, req: Request | undefined, pagina: any) => Promise<void>;

const ampliaciones: Ampliacion[] = [];

export function registrarAmpliacion(fn: Ampliacion) {
  ampliaciones.push(fn);
}

/** Pasa la página por todas las ampliaciones. Una que falla no tumba la
 *  página: se ve sin lo suyo, que es mejor que no verla. */
export async function ampliar(db: any, req: Request | undefined, pagina: any): Promise<void> {
  for (const fn of ampliaciones) {
    try { await fn(db, req, pagina); } catch (e) { console.error('ampliarPagina:', e); }
  }
}
