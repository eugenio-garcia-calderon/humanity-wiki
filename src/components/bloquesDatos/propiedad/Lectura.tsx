import { useState } from 'react';
import { ImageOff, Star, ShoppingCart, Columns3 } from 'lucide-react';
import { Badge, Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import TextoConEnlaces from '../../ui/TextoConEnlaces';
import type { PropsLectura } from '../tipos';
import { useFicha } from '../ficha/useFicha';
import { vistaPropiedad, DESCRIPCION_NATURALEZA, type Valor, type Linea, type Nota } from '../ficha/vistas';
import { fechaCorta, type Procedencia } from '../ficha/modelo';
import { AvisoVistaPrevia, Cargando, MarcaProcedencia, Seccion, SinFila, useEnlaceFila } from '../ficha/comunes';

// PROPERTIES OF THE CURRENT ROW (plan §3.2). What it shows is decided in
// `ficha/vistas.ts` (`vistaPropiedad`); the server writes the same thing in
// `ficha/html.ts`. This file only draws.

function ValorConEnlace({ v }: { v: Valor }) {
  const enlace = useEnlaceFila();
  const href = enlace(v.paginaId);
  if (href) return <a href={href} className="font-semibold text-sky-700 hover:underline">{v.texto}</a>;
  if (v.enlace) return <a href={v.enlace} target="_blank" rel="noopener nofollow" className="text-sky-700 hover:underline">{v.texto}</a>;
  return <TextoConEnlaces texto={v.texto} />;
}

/** The product photo with its credit. A photo that fails to load (a moved
 *  file, a site that refuses hotlinking) disappears with its caption instead
 *  of leaving a broken frame with the alt text in it. */
function Foto({ src, alt, credito }: { src: string; alt: string; credito: string }) {
  const [rota, setRota] = useState(false);
  // A photo that fails keeps its box: collapsing it moved the whole sheet up
  // after the first paint (part of the CLS the evaluator measured).
  if (rota) {
    return (
      <div className="grid h-56 w-full shrink-0 place-items-center rounded-2xl border border-slate-100 bg-slate-50 text-center text-sm text-slate-500 sm:w-56" role="img" aria-label={`${alt}: foto no disponible`}>
        <span className="flex flex-col items-center gap-1"><ImageOff className="h-6 w-6 text-slate-400" aria-hidden />Foto no disponible</span>
      </div>
    );
  }
  return (
    <figure className="shrink-0">
      <img src={src} alt={alt} loading="eager" onError={() => setRota(true)} className="h-56 w-full rounded-2xl border border-slate-100 bg-white object-contain p-2 sm:w-56" />
      {credito ? <figcaption className="mt-1 text-sm leading-snug text-slate-500 sm:w-56"><TextoConEnlaces texto={credito} /></figcaption> : null}
    </figure>
  );
}

export function VistaPropiedad({ datos, paginaId, enEditor }: PropsLectura & { enEditor?: boolean }) {
  const { ficha, cargando } = useFicha(paginaId);
  if (cargando) return <Cargando />;
  if (!ficha) return enEditor ? <SinFila que="Este bloque enseña los datos de una fila." /> : null;
  const v = vistaPropiedad(ficha, datos);
  const aviso = enEditor && ficha.vista_previa ? <AvisoVistaPrevia nombre={ficha.tabla.filas.find(x => x.id === ficha.fila_id)?.titulo || ''} /> : null;
  if (!v) return enEditor ? <>{aviso}<p className="text-sm text-slate-400">Esta fila no tiene datos para este bloque.</p></> : null;

  if (v.estilo === 'cabecera') {
    // THE SHOPPER'S SUMMARY (2026-10-18, «inspired by Amazon's product
    // pages»): photo on the left, and beside it what decides a purchase —
    // score, price, the key figures and the way to the shops — before any
    // table. Everything comes from the row's columns (`vistas.ts`).
    const identidad = [v.subcategoria, v.modelo && `Modelo ${v.modelo}`].filter(Boolean).join(' · ');
    return (
      <div className="my-2">
        {aviso}
        <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
          {v.imagen ? <Foto key={v.imagen} src={v.imagen} alt={v.nombre} credito={v.credito} /> : null}
          <div className={cn('min-w-0 space-y-3', !v.imagen && 'sm:col-span-2')}>
            <p className="text-base text-slate-700">
              {v.marca ? <>Marca: <ValorConEnlace v={v.marca} /></> : null}
              {v.marca && identidad ? ' · ' : null}{identidad}
            </p>
            {v.nota ? <Puntuacion n={v.nota} /> : null}
            {v.compra ? (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {v.compra.desde ? (
                  <>
                    <p className="text-3xl font-black text-slate-900"><span className="text-base font-semibold text-slate-600">Desde </span>{v.compra.desde}</p>
                    <p className="text-sm text-slate-600">
                      {v.compra.hasta ? <>hasta {v.compra.hasta} · </> : null}
                      en {v.compra.tiendas || 1} {(v.compra.tiendas || 1) === 1 ? 'tienda' : 'tiendas'}
                    </p>
                    {v.compra.porUnidad ? <p className="text-base font-bold text-slate-800" title="Precio más bajo de las tiendas dividido por la potencia o la energía que declara la marca"><span className="font-normal text-slate-600">{v.compra.etiquetaUnidad}: </span>{v.compra.porUnidad}</p> : null}
                  </>
                ) : <p className="text-base font-semibold text-slate-600">Sin precio todavía: ninguna tienda lo vende aquí.</p>}
                {v.estado ? <Badge className="!text-sm !normal-case !tracking-normal" variant={/venta/i.test(v.estado) ? 'success' : 'default'}>{v.estado}</Badge> : null}
              </div>
            ) : v.estado ? <Badge className="!text-sm !normal-case !tracking-normal" variant={/venta/i.test(v.estado) ? 'success' : 'default'}>{v.estado}</Badge> : null}
            {v.destacados.length ? <Destacados lineas={v.destacados} /> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {v.compra?.desde ? (
                <Button onClick={() => irA('ofertas')} className="min-h-[44px] gap-2 normal-case tracking-normal text-sm">
                  <ShoppingCart className="h-4 w-4" aria-hidden /> Ver dónde comprarlo
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => irA('comparador')} className="min-h-[44px] gap-2 normal-case tracking-normal text-sm">
                <Columns3 className="h-4 w-4" aria-hidden /> Comparar con otros
              </Button>
            </div>
            {v.gtin ? <p className="text-sm text-slate-500">EAN <span className="font-mono">{v.gtin}</span></p> : null}
          </div>
        </div>
      </div>
    );
  }

  if (v.estilo === 'texto') {
    return (
      <Seccion titulo={v.titulo}>
        {aviso}
        <p className="text-base leading-relaxed text-slate-700"><TextoConEnlaces texto={v.texto} /></p>
        <MarcaProcedencia p={v.procedencia} />
      </Seccion>
    );
  }

  if (v.estilo === 'pie') {
    return (
      <footer className="my-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
        {aviso}
        <p>
          {v.revisado ? <>Datos revisados el {fechaCorta(v.revisado)}. </> : <>Estos datos todavía no tienen fecha de revisión. </>}
          {v.fuentes.length ? <>Fuentes: {v.fuentes.join(', ')}.</> : null}
        </p>
        <p>{DESCRIPCION_NATURALEZA}</p>
      </footer>
    );
  }

  if (v.estilo === 'lista') {
    return (
      <Seccion titulo={v.titulo}>
        {aviso}
        <ul className="space-y-1.5 text-base">
          {v.lineas.map(l => (
            <li key={l.columnaId} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-slate-500">{l.etiqueta}:</span>
              <span className="text-slate-800"><ValorConEnlace v={l.valor} /></span>
              <MarcaProcedencia p={l.valor.procedencia} />
            </li>
          ))}
        </ul>
      </Seccion>
    );
  }

  // A grid of tiles, name above value (the look of a database entry's
  // properties since 2026-10-18): two to four per row instead of one long
  // two-column table. A long value takes the whole row.
  return (
    <Seccion titulo={v.titulo}>
      {aviso}
      {v.lineas.length ? (
        <dl className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,10rem),1fr))]">
          {v.lineas.map(l => <Casilla key={l.columnaId} l={l} />)}
        </dl>
      ) : null}
      {v.sinDato.map(s => (
        <p key={s.motivo} className="mt-2 text-sm text-slate-600">
          <span className="font-semibold text-amber-700">{s.motivo}:</span> {s.etiquetas.join(', ')}.
        </p>
      ))}
    </Seccion>
  );
}

/** Long enough to need the whole row. */
const LARGO = 60;

function Casilla({ l, compacta }: { l: Linea; compacta?: boolean }) {
  return (
    <div className={cn('min-w-0 rounded-xl bg-slate-50 px-3 py-2 text-center', !compacta && l.valor.texto.length > LARGO && 'col-span-full text-left')}>
      <dt className="text-sm text-slate-500">{l.etiqueta}</dt>
      <dd className="break-words text-base font-semibold text-slate-900"><ValorConEnlace v={l.valor} /></dd>
      {l.valor.procedencia?.naturaleza ? <ProcedenciaCorta p={l.valor.procedencia} /> : null}
    </div>
  );
}

/** `MarcaProcedencia`, short, for a tile: the label and the source site, in
 *  full and wrapping — cut to one line it read «Según la marca · …», which
 *  hid the very thing it is there to say (evaluator round 2). The note and
 *  the date stay in the tooltip and behind the link. */
function ProcedenciaCorta({ p }: { p: Procedencia }) {
  const tono = p.naturaleza === 'medido' ? 'text-emerald-700' : p.naturaleza === 'no_publicado' ? 'text-amber-700' : 'text-slate-500';
  const texto = p.etiqueta || '';
  const titulo = [texto, p.nota, p.fecha && `Consultado el ${fechaCorta(p.fecha)}`].filter(Boolean).join(' · ');
  return (
    <dd className={cn('text-sm font-semibold [overflow-wrap:anywhere]', tono)} title={titulo}>
      {p.fuente ? <a href={p.fuente} target="_blank" rel="noopener nofollow" className="hover:underline">{texto}</a> : texto}
    </dd>
  );
}

function Destacados({ lineas }: { lineas: Linea[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Lo más importante">
      {lineas.map(l => <Casilla key={l.columnaId} l={l} compacta />)}
    </dl>
  );
}

/** The community score as stars, or why there is none yet. */
function Puntuacion({ n }: { n: Nota }) {
  const valor = Number(n.media.replace(',', '.'));
  return (
    <button type="button" onClick={() => irA('valoracion')} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-base text-slate-700 hover:underline">
      {n.media ? (
        <>
          <span className="flex" aria-hidden>
            {[1, 2, 3, 4, 5].map(i => <Star key={i} className={cn('h-5 w-5', valor >= i - 0.25 ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}
          </span>
          <span><strong>{n.media}</strong> de 5 · {n.votos} {n.votos === 1 ? 'voto' : 'votos'} de la comunidad</span>
        </>
      ) : <span>Sin valoraciones suficientes todavía · <span className="font-semibold text-sky-700">Puntúalo</span></span>}
    </button>
  );
}

/** Scrolls to the first block of a type on this page (`data-tipo` on each
 *  block's wrapper, `BloquesLectura`). */
function irA(tipo: string) {
  const el = document.querySelector(`[data-tipo="${tipo}"]`);
  // 80 px: clear of the site's sticky header.
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
}

export default function Lectura(p: PropsLectura) {
  return <VistaPropiedad {...p} />;
}
