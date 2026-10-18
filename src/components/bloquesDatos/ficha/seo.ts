// ============================================================================
// WHAT A PRODUCT SHEET TELLS SEARCH ENGINES (2026-10-18, Wikiproducts W1)
// ============================================================================
// SEO requirements (/mnt/project-files/wikiproducto/seo/requisitos-tecnicos.md):
//   R4  JSON-LD `Product` + `AggregateOffer` + `BreadcrumbList`, generated
//       from the data, never written by hand. `AggregateRating` ONLY with real
//       votes: an invented rating is a manual penalty and against the house.
//   R5  og:type=product, product:price:*, and the title pattern
//       «{Marca} {Modelo}: datos, precio y opiniones | {sitio}» within 60 chars.
//   R10 `noindex` until the sheet clears the quality bar (`calidadFicha`).
//   R11 dateModified = the last real data check, never today by default.
// Everything here is derived from the same `Ficha` the blocks paint, so the
// page cannot say one thing and the markup another (Google calls that
// «marking up content that is not visible», and it is penalised).
import {
  type Ficha, columnaPorRol, filaActual, textoDe, numeroDe, tieneValor, grupoDe, visible,
  calidadFicha, fechaRevision, relacionadasPor,
} from './modelo';

export type MetaFicha = {
  titulo: string;
  descripcion: string;
  ogType: 'product';
  indexable: boolean;
  /** Why it is not indexable yet, for the editor. Empty when it is. */
  faltan: string[];
  jsonLd: any[];
  metas: Array<{ property?: string; name?: string; content: string }>;
  dateModified: string | null;
};

export type Miga = { nombre: string; url: string };

const LIMITE_TITULO = 60;

/** R5: «Anker 737: datos, precio y opiniones | Wikiproducts», shortened by
 *  dropping the least important part first, never by cutting a word in half. */
export function tituloFicha(nombre: string, sitio?: string | null): string {
  const n = nombre.trim();
  const opciones = [
    sitio ? `${n}: datos, precio y opiniones | ${sitio}` : '',
    `${n}: datos, precio y opiniones`,
    sitio ? `${n}: datos y precio | ${sitio}` : '',
    sitio ? `${n} | ${sitio}` : '',
    n,
  ].filter(Boolean);
  return opciones.find(t => t.length <= LIMITE_TITULO) || n;
}

/** A GTIN goes in the property named by its length (schema.org). */
function gtin(valor: string): Record<string, string> {
  const d = valor.replace(/\D/g, '');
  if (d.length === 8) return { gtin8: d };
  if (d.length === 12) return { gtin12: d };
  if (d.length === 13) return { gtin13: d };
  if (d.length === 14) return { gtin14: d };
  return d ? { gtin: d } : {};
}

export function metaFicha(f: Ficha, opciones: { url: string; sitio?: string | null; migas?: Miga[]; imagenAbsoluta?: (u: string) => string }): MetaFicha {
  const fila = filaActual(f);
  const t = f.tabla;
  const abs = opciones.imagenAbsoluta || ((u: string) => u);
  const nombre = fila?.titulo || 'Producto';
  const valorRol = (rol: Parameters<typeof columnaPorRol>[1]) => {
    const c = columnaPorRol(t, rol);
    return c ? textoDe(fila, c) : '';
  };
  const marca = valorRol('marca');
  const modelo = valorRol('modelo');
  const resumen = valorRol('resumen');
  const imagen = valorRol('imagen') || fila?.imagen || '';
  const codigo = valorRol('gtin');
  const calidad = calidadFicha(f);
  const fecha = fechaRevision(f);

  const cMin = columnaPorRol(t, 'precio_min');
  const cMax = columnaPorRol(t, 'precio_max');
  const cNum = columnaPorRol(t, 'num_ofertas');
  const precioMin = cMin ? numeroDe(fila, cMin) : null;
  const precioMax = cMax ? numeroDe(fila, cMax) : null;
  const nOfertas = cNum ? numeroDe(fila, cNum) : null;
  const moneda = cMin?.config?.moneda || 'EUR';

  // Every technical value that has one, with its unit: what lets an AI
  // search engine answer «how many Wh does it have» from our page.
  const propiedades = t.columnas
    .filter(c => grupoDe(c) === 'tecnico' && visible(c) && tieneValor(fila, c))
    .map(c => {
      const n = numeroDe(fila, c);
      return {
        '@type': 'PropertyValue',
        name: c.nombre.replace(/\s*\([^)]*\)\s*$/, ''),
        value: n ?? textoDe(fila, c),
        ...(c.config?.unidad && n !== null ? { unitText: c.config.unidad } : {}),
      };
    });

  const producto: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: nombre,
    url: opciones.url,
    ...(marca ? { brand: { '@type': 'Brand', name: marca } } : {}),
    ...(modelo ? { model: modelo, mpn: modelo } : {}),
    ...(codigo ? gtin(codigo) : {}),
    ...(imagen ? { image: [abs(imagen)] } : {}),
    ...(resumen ? { description: resumen } : {}),
    category: t.titulo,
    ...(propiedades.length ? { additionalProperty: propiedades } : {}),
  };
  if (precioMin !== null) {
    producto.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: moneda,
      lowPrice: precioMin,
      ...(precioMax !== null ? { highPrice: precioMax } : {}),
      ...(nOfertas ? { offerCount: nOfertas } : {}),
    };
  }
  // AggregateRating only from real votes: W4's overall community score
  // (tipo 'comunidad', criterio 'media'). Its cell is empty under 3 voters,
  // and then there is nothing to declare.
  const cMedia = t.columnas.find(c => c.tipo === 'comunidad' && c.config?.criterio === 'media');
  const celdaMedia: any = cMedia ? fila?.celdas?.[cMedia.id] : null;
  const nota = celdaMedia?.estado === 'ok' ? Number(celdaMedia.media ?? celdaMedia.valor) : null;
  const votos = celdaMedia?.estado === 'ok' ? Number(celdaMedia.votos) || 0 : 0;
  if (nota !== null && Number.isFinite(nota) && votos > 0) {
    producto.aggregateRating = { '@type': 'AggregateRating', ratingValue: Math.round(nota * 10) / 10, ratingCount: votos, bestRating: 5, worstRating: 1 };
  }

  const jsonLd: any[] = [producto];
  if (opciones.migas?.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [...opciones.migas, { nombre, url: opciones.url }].map((m, i) => ({
        '@type': 'ListItem', position: i + 1, name: m.nombre, item: m.url,
      })),
    });
  }
  // R4 for recalls: a recall is about this product. Kept inside the sheet's
  // markup because the recall is shown on the sheet.
  const cRet = columnaPorRol(t, 'retiradas');
  if (cRet) {
    const rel = relacionadasPor(f, cRet);
    if (rel?.filas.length) {
      const cFecha = columnaPorRol(rel.tabla, 'fecha');
      for (const r of rel.filas) {
        jsonLd.push({
          '@context': 'https://schema.org', '@type': 'Article', headline: r.titulo,
          ...(cFecha && tieneValor(r, cFecha) ? { datePublished: String((r.celdas[cFecha.id] as any).valor).slice(0, 10) } : {}),
          about: { '@type': 'Product', name: nombre, url: opciones.url },
        });
      }
    }
  }

  const metas: MetaFicha['metas'] = [];
  if (precioMin !== null) {
    metas.push({ property: 'product:price:amount', content: String(precioMin) });
    metas.push({ property: 'product:price:currency', content: moneda });
  }
  if (marca) metas.push({ property: 'product:brand', content: marca });
  if (fecha) {
    producto.dateModified = fecha;
    metas.push({ property: 'og:updated_time', content: fecha });
  }

  return {
    titulo: tituloFicha(nombre, opciones.sitio),
    descripcion: (resumen || `${nombre}: datos técnicos con fuente, precio y opiniones.`).slice(0, 300),
    ogType: 'product',
    indexable: calidad.indexable,
    faltan: calidad.faltan,
    jsonLd,
    metas,
    dateModified: fecha,
  };
}
