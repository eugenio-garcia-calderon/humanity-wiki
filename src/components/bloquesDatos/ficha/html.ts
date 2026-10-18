// ============================================================================
// THE SHEET BLOCKS AS PLAIN HTML (2026-10-18, Wikiproducts W1, SEO R1)
// ============================================================================
// What a crawler that runs no JavaScript reads: GPTBot, ClaudeBot,
// PerplexityBot and Google's first pass. Registered with W2's
// `server/htmlBloques.ts` from `server/bd/plantillaFicha.ts`.
//
// Same decisions as the React blocks, because both draw the same `vistas.ts`
// result. Plain semantic HTML, no classes: the app replaces it on load, and a
// crawler only needs the structure (h2, table/th scope, ul, q, time).
import type { Ficha, TablaFicha, Procedencia } from './modelo';
import { etiquetaProcedencia, sitioDe, fechaCorta } from './modelo';
import {
  vistaPropiedad, vistaComparador, vistaAlternativas, vistaAfirmaciones, vistaRetiradas,
  porDefecto, fraseSinRetiradas, ETIQUETA_VEREDICTO, DESCRIPCION_NATURALEZA, type Valor,
  NOTA_POR_DATOS, NOTA_ORDEN,
} from './vistas';

/** What the server lends the writers: escaping, inline markup and the
 *  address of another page inside the site being visited. */
export type Herramientas = {
  esc: (t: unknown) => string;
  enLinea: (t: string) => string;
  enlacePagina: (id: string) => string;
  hrefSeguro: (h: string) => string | null;
};

/** The extra key a pinned comparator's table is preloaded under. */
export const claveTablaComparador = (tablaId: string) => `ficha:tabla:${tablaId}`;

function procedencia(p: Procedencia | null, h: Herramientas): string {
  if (!p?.naturaleza) return '';
  const texto = h.esc(p.etiqueta || etiquetaProcedencia(p));
  const href = p.fuente ? h.hrefSeguro(p.fuente) : null;
  return ` <small>(${href ? `<a href="${h.esc(href)}" rel="nofollow noopener">${texto}</a>` : texto})</small>`;
}

function valor(v: Valor, h: Herramientas): string {
  if (v.paginaId) return `<a href="${h.esc(h.enlacePagina(v.paginaId))}">${h.esc(v.texto)}</a>`;
  const href = v.enlace ? h.hrefSeguro(v.enlace) : null;
  if (href) return `<a href="${h.esc(href)}" rel="nofollow noopener">${h.esc(v.texto)}</a>`;
  return h.enLinea(v.texto);
}

const h2 = (t: string, h: Herramientas) => (t ? `<h2>${h.esc(t)}</h2>` : '');

export function propiedadHtml(f: Ficha | null | undefined, datos: any, h: Herramientas): string {
  if (!f) return '';
  const v = vistaPropiedad(f, datos || {});
  if (!v) return '';
  switch (v.estilo) {
    case 'cabecera': {
      const filas: Array<[string, string]> = [];
      if (v.marca) filas.push(['Marca', valor(v.marca, h)]);
      if (v.modelo) filas.push(['Modelo', h.esc(v.modelo)]);
      filas.push(['Categoría', h.esc(v.subcategoria || v.categoria)]);
      if (v.nota) filas.push(['Valoración de la comunidad', v.nota.media ? `${h.esc(v.nota.media)} de 5 (${v.nota.votos} ${v.nota.votos === 1 ? 'voto' : 'votos'})` : 'Sin valoraciones suficientes todavía']);
      if (v.compra) filas.push(['Precio', v.compra.desde ? `Desde ${h.esc(v.compra.desde)}${v.compra.hasta ? ` hasta ${h.esc(v.compra.hasta)}` : ''} en ${v.compra.tiendas || 1} ${(v.compra.tiendas || 1) === 1 ? 'tienda' : 'tiendas'}${v.compra.sinPrecio ? ` · ${v.compra.sinPrecio} más sin precio confirmado` : ''}${v.compra.porUnidad ? ` (${h.esc(v.compra.etiquetaUnidad.charAt(0).toLowerCase() + v.compra.etiquetaUnidad.slice(1))}: ${h.esc(v.compra.porUnidad)})` : ''}` : 'Sin precio todavía']);
      if (v.estado) filas.push(['Estado', h.esc(v.estado)]);
      for (const l of v.destacados) filas.push([h.esc(l.etiqueta), `${valor(l.valor, h)}${procedencia(l.valor.procedencia, h)}`]);
      if (v.gtin) filas.push(['EAN', h.esc(v.gtin)]);
      const img = v.imagen && h.hrefSeguro(v.imagen);
      const foto = img ? `<figure><img src="${h.esc(img)}" alt="${h.esc(v.nombre)}">${v.credito ? `<figcaption>${h.enLinea(v.credito)}</figcaption>` : ''}</figure>` : '';
      return `<section>${foto}<dl>${filas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></section>`;
    }
    case 'texto':
      return `<section>${h2(v.titulo, h)}<p>${h.enLinea(v.texto)}${procedencia(v.procedencia, h)}</p></section>`;
    case 'pie':
      return `<footer><p>${v.revisado ? `Datos revisados el <time datetime="${h.esc(v.revisado)}">${h.esc(fechaCorta(v.revisado))}</time>.` : 'Estos datos todavía no tienen fecha de revisión.'}${v.fuentes.length ? ` Fuentes: ${h.esc(v.fuentes.join(', '))}.` : ''}</p><p>${h.esc(DESCRIPCION_NATURALEZA)}</p></footer>`;
    case 'lista':
      return `<section>${h2(v.titulo, h)}<ul>${v.lineas.map(l => `<li>${h.esc(l.etiqueta)}: ${valor(l.valor, h)}${procedencia(l.valor.procedencia, h)}</li>`).join('')}</ul></section>`;
    default: {
      const sin = v.sinDato.map(x => `<p>${h.esc(x.motivo)}: ${h.esc(x.etiquetas.join(', '))}.</p>`).join('');
      const tabla = v.lineas.length ? `<table><tbody>${v.lineas.map(l => `<tr><th scope="row">${h.esc(l.etiqueta)}</th><td>${valor(l.valor, h)}${procedencia(l.valor.procedencia, h)}</td></tr>`).join('')}</tbody></table>` : '';
      return `<section>${h2(v.titulo, h)}${tabla}${sin}</section>`;
    }
  }
}

/** In `fila` mode the server shows the default siblings (`porDefecto`): it has
 *  no address query to read, and the default is the same the browser starts
 *  with when there is none. */
export function comparadorHtml(f: Ficha | null | undefined, tablaSuelta: TablaFicha | null | undefined, datos: any, h: Herramientas): string {
  const d = datos || {};
  const deFila = (d.modo || 'fila') === 'fila';
  const tabla = deFila ? f?.tabla : tablaSuelta;
  if (!tabla) return '';
  const actualId = deFila ? f!.fila_id : null;
  const ids = deFila ? porDefecto(tabla, actualId!) : (d.modo === 'fijo' && Array.isArray(d.filas) ? d.filas.map(String) : tabla.filas.slice(0, 2).map(x => x.id));
  const v = vistaComparador(tabla, ids, { actualId, titulo: d.titulo, columnas: d.columnas });
  if (!v || v.productos.length < 2) return '';
  const cab = v.productos.map(p => `<th scope="col">${p.paginaId && !p.actual ? `<a href="${h.esc(h.enlacePagina(p.paginaId))}">${h.esc(p.nombre)}</a>` : h.esc(p.nombre)}</th>`).join('');
  const filas = v.lineas.map(l => `<tr><th scope="row">${h.esc(l.etiqueta)}</th>${l.celdas.map(c => `<td>${c.mejor ? `<strong>${h.esc(c.texto)}</strong> (mejor)` : h.esc(c.texto)}</td>`).join('')}</tr>`).join('');
  return `<section>${h2(v.titulo, h)}${v.mezcla ? `<p>${h.esc(v.mezcla)}</p>` : ''}<table><thead><tr><th scope="col">Dato</th>${cab}</tr></thead><tbody>${filas}</tbody></table></section>`;
}

export function alternativasHtml(f: Ficha | null | undefined, datos: any, h: Herramientas): string {
  if (!f) return '';
  const v = vistaAlternativas(f, datos || {});
  if (!v) return '';
  const li = v.criterios.map(c => {
    const quien = c.esEsta ? 'Este producto' : c.ganador.paginaId ? `<a href="${h.esc(h.enlacePagina(c.ganador.paginaId))}">${h.esc(c.ganador.nombre)}</a>` : h.esc(c.ganador.nombre);
    const segun = c.base === 'votos' ? ' (según los votos de la comunidad)' : c.base ? ` (según los datos: ${h.esc(c.segun || '')})` : '';
    const mas = c.empates ? ` y ${c.empates} más` : '';
    return `<li>${h.esc(c.criterio)}${segun}: ${quien}${mas} (${h.esc(c.ganador.valor)})${!c.esEsta && c.puesto ? `. Este producto: ${c.puesto.n}.º de ${c.puesto.de}` : ''}</li>`;
  }).join('');
  const sub = v.ambito ? `<p>${h.esc(v.ambito)}</p>` : '';
  return `<section>${h2(v.titulo, h)}${sub}<ul>${li}</ul><p><small>${h.esc(v.porDatos ? NOTA_POR_DATOS : NOTA_ORDEN)}</small></p></section>`;
}

export function afirmacionHtml(f: Ficha | null | undefined, datos: any, h: Herramientas): string {
  const d = datos || {};
  const v = vistaAfirmaciones(d.modo === 'manual' ? null : f || null, d);
  if (!v) return '';
  if (v.vacia) return `<section>${h2(v.titulo, h)}<p>${h.esc(v.vacia)}</p></section>`;
  const li = v.items.map(a => {
    const donde = a.donde && h.hrefSeguro(a.donde);
    return `<li><p><q>${h.esc(a.texto)}</q>: <strong>${ETIQUETA_VEREDICTO[a.veredicto]}</strong></p>${a.explicacion ? `<p>${h.enLinea(a.explicacion)}</p>` : ''}${donde ? `<p>Dónde se dice: <a href="${h.esc(donde)}" rel="nofollow noopener">${h.esc(sitioDe(donde))}</a></p>` : ''}${a.fuentes ? `<p>Fuentes: ${h.enLinea(a.fuentes)}</p>` : ''}</li>`;
  }).join('');
  return `<section>${h2(v.titulo, h)}<ul>${li}</ul></section>`;
}

export function retiradaHtml(f: Ficha | null | undefined, datos: any, h: Herramientas): string {
  const d = datos || {};
  const v = vistaRetiradas(d.modo === 'manual' ? null : f || null, d);
  if (!v) return '';
  const busq = v.busqueda && v.estado !== 'sin_comprobar' ? `<p><small>Dónde se buscó: ${h.enLinea(v.busqueda)}</small></p>` : '';
  if (v.estado !== 'hay') return `<section>${h2(v.titulo, h)}<p>${h.esc(fraseSinRetiradas(v))}</p>${busq}</section>`;
  const li = v.items.map(r => {
    const enlace = r.enlace && h.hrefSeguro(r.enlace);
    return `<li><p><strong>${h.esc(r.titulo)}</strong></p><p>${h.esc([r.fecha, r.organismo, r.pais].filter(Boolean).join(' · '))}${r.referencia ? ` · Ref. ${h.esc(r.referencia)}` : ''}</p>${r.motivo ? `<p>${h.enLinea(r.motivo)}</p>` : ''}${enlace ? `<p><a href="${h.esc(enlace)}" rel="nofollow noopener">Aviso oficial (${h.esc(sitioDe(enlace))})</a></p>` : ''}</li>`;
  }).join('');
  return `<section>${h2(v.titulo, h)}<ul>${li}</ul>${busq}</section>`;
}
