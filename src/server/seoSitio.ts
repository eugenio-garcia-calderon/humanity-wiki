// ============================================================================
// LO QUE UN SITIO PUBLICADO LE DICE A LOS BUSCADORES (2026-10-18, Wikiproducts W2)
// ============================================================================
// SEO R4 (la parte del sitio, no la de la ficha, que es de W1) y R17:
//
//   · La portada del sitio se presenta como `WebSite` y `Organization`, y si
//     su menú lleva buscador, con la `SearchAction` que lo abre.
//   · Una página que enseña una base de datos lleva su `ItemList`: los
//     elementos en el orden en que se ven, con su dirección.
//   · Las etiquetas de verificación de Google Search Console y de Bing
//     Webmaster Tools que quien publica pegó en «Datos legales».
//
// Todo sale de lo que la página enseña, nunca escrito a mano: un dato
// estructurado que no está en la página es lo que Google castiga.
// Las direcciones son relativas o `{{canonica}}`: `sitios.ts` las completa con
// el dominio canónico (ver `MetaPagina.jsonLd`).
import { sql } from 'drizzle-orm';
import { registrarAmpliacion } from './ampliarPagina';

/** Cuántos elementos como mucho en un `ItemList`. */
const MAX_ELEMENTOS = 100;

/** Lo único que puede llevar un código de verificación. */
const codigoValido = (x: unknown): string | null =>
  typeof x === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(x.trim()) ? x.trim() : null;

/** Los bloques de una página, con los de dentro de columnas y desplegables. */
function todos(bloques: any, out: any[] = [], n = 0): any[] {
  if (!Array.isArray(bloques) || n > 8) return out;
  for (const b of bloques) {
    out.push(b);
    todos(b?.bloques, out, n + 1);
    if (Array.isArray(b?.columnas)) for (const c of b.columnas) todos(c?.bloques, out, n + 1);
  }
  return out;
}

export function registrarSeoSitio() {
  registrarAmpliacion(async (db, req, pagina) => {
    // Sólo cuenta en el HTML del servidor, que se arma sin petición: la página
    // que pide el navegador por la API no lee `meta`, y así no paga las consultas.
    if (req || !pagina || pagina.muro) return;
    const meta = (pagina.meta = pagina.meta || {});
    const ld: any[] = meta.jsonLd ? (Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd]) : [];
    const sitio = pagina.sitio;

    // R17: las verificaciones, en todas las páginas del sitio (Google mira
    // la portada; Bing, la que se le dé).
    const v = sitio?.config?.verificacion || {};
    const metas = (meta.metas = meta.metas || []);
    const google = codigoValido(v.google);
    const bing = codigoValido(v.bing);
    if (google) metas.push({ name: 'google-site-verification', content: google });
    if (bing) metas.push({ name: 'msvalidate.01', content: bing });

    // R4: la portada del sitio.
    if (sitio && sitio.raizId === pagina.id) {
      const nombre = String(sitio.titulo || pagina.titulo || '').trim();
      const logo = typeof sitio.icono === 'string' && /^(https?:|\/)/.test(sitio.icono) ? sitio.icono : undefined;
      const web: any = { '@context': 'https://schema.org', '@type': 'WebSite', name: nombre, url: '{{canonica}}' };
      if (sitio.config?.menu?.buscador) {
        web.potentialAction = {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `/buscar?sitio=${encodeURIComponent(pagina.id)}&q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        };
      }
      ld.push(web);
      ld.push({ '@context': 'https://schema.org', '@type': 'Organization', name: nombre, url: '{{canonica}}', ...(logo ? { logo } : {}) });
    }

    // R4: las bases de datos que enseña, como listas. No en una ficha: la
    // ficha ya es un `Product` (W1) y su lista no es lo que la describe.
    const esFicha = ld.some(x => x && x['@type'] === 'Product');
    const tablas = esFicha ? [] : todos(pagina.config?.bloques).filter(b => b?.tipo === 'basedatos' && b.tabla_id).map(b => String(b.tabla_id));
    for (const tablaId of [...new Set(tablas)].slice(0, 5)) {
      const t = (await db.execute(sql`
        SELECT titulo FROM bd_tablas WHERE id = ${tablaId} AND deleted_at IS NULL AND archived_at IS NULL
      `)).rows[0] as any;
      if (!t) continue;
      // Las mismas filas que enseña el HTML del servidor (`htmlBloques.ts`).
      const filas = (await db.execute(sql`
        SELECT f.pagina_id, w.title, w.slug FROM bd_filas f
        JOIN knowledge_windows w ON w.id = f.pagina_id AND w.deleted_at IS NULL AND w.archived_at IS NULL
        WHERE f.tabla_id = ${tablaId} AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
        ORDER BY f.orden, f.created_at LIMIT ${MAX_ELEMENTOS}
      `)).rows as any[];
      if (!filas.length) continue;
      ld.push({
        '@context': 'https://schema.org', '@type': 'ItemList',
        name: String(t.titulo || '').trim() || undefined,
        numberOfItems: filas.length,
        itemListElement: filas.map((f, i) => ({
          '@type': 'ListItem', position: i + 1,
          name: String(f.title || '').trim() || undefined,
          url: f.slug && String(f.slug).includes('/') ? `/${f.slug}` : `/p/${f.pagina_id}`,
        })),
      });
    }

    if (ld.length) meta.jsonLd = ld;
    if (!metas.length) delete meta.metas;
  });
}
