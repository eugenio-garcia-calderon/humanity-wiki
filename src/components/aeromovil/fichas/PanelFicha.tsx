// The record of a component, under the 3D view (2026-11-24, Eugenio: «se me despliega debajo de la pantalla 3D toda la
// información de ese componente… el proveedor de esa rueda, las alternativas que tenemos, las características, el precio.
// Incluso puedo añadir el stock, el peso… la lista de componentes… una imagen de referencia… documentación»).
//
// Two sources, one panel, no list typed twice:
//  · the DESIGN's own lists (masasSecciones.ts, precios/, proveedores/): weight, price, sub-parts, and each part's supplier,
//    model, links and files: drawn here by the same `DesglosePeso` as the side panel, so editing it here edits it there;
//  · the component's own RECORD on the server (almacen.ts): the internal number, what it is, the stock, the alternatives,
//    the reference images, the documents and the notes. Saved by itself a moment after the last keystroke.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ImagePlus, Paperclip, Plus, Trash2, Upload } from 'lucide-react';
import { Button, Card } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { esHeic, heicAJpg } from '../../../utils/prepararImagen';
import type { Parametros, Resultados } from '../geometria';
import { DesglosePeso } from '../PesoSeccion';
import { ContextoProveedores } from '../proveedores/ProveedorParte';
import { ACEPTA, adjuntosMios, borrarAdjunto, enlaceSeguro, subirAdjunto, tamano, type Adjunto } from '../proveedores/datos';
import { conPrecio, eur } from '../precios/precios';
import { conPeso } from '../precios/EditorPeso';
import { textoPesoSeccion } from '../masasSecciones';
import { cambiarFicha, useFichas, MAX_ALTERNATIVAS, MAX_ARCHIVOS_FICHA, MAX_TEXTO_FICHA, type AlternativaFicha, type FichaValor } from './almacen';
import { datosDe, type ListasDiseno } from './datos';
import { numeroPorDefecto, type DefFicha } from './registro';

const caja = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:bg-slate-50 disabled:text-slate-500';

function Seccion({ titulo, resumen, abierta, children }: { titulo: string; resumen?: string; abierta?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierta} className="group rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 px-3 py-2 text-[13px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
        <span>{titulo}</span>{resumen && <span className="text-xs font-normal text-slate-500">{resumen}</span>}
      </summary>
      <div className="flex flex-col gap-2 border-t border-slate-100 p-3 text-[13px] text-slate-700">{children}</div>
    </details>
  );
}

/** Pictures or papers of the component: uploaded to the server (a session is needed), kept in the record by id and link. */
function Archivos({ lista, alCambiar, pieza, imagenes, bloqueado }: { lista: Adjunto[]; alCambiar: (l: Adjunto[]) => void; pieza: string; imagenes: boolean; bloqueado: boolean }) {
  const { user } = useAuth();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mios, setMios] = useState<Set<number>>(new Set());
  const ultima = useRef(lista); ultima.current = lista;
  const ids = lista.map(a => a.id).join(',');
  useEffect(() => { let vivo = true; if (user) adjuntosMios(lista.map(a => a.id)).then(s => { if (vivo) setMios(s); }); else setMios(new Set()); return () => { vivo = false; }; }, [ids, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const subir = async (fs: FileList | null) => {
    if (!fs?.length) return;
    setError(null);
    const libres = MAX_ARCHIVOS_FICHA - lista.length, errores: string[] = [];
    if (fs.length > libres) errores.push(`Caben ${MAX_ARCHIVOS_FICHA} por lista: ${fs.length - Math.max(0, libres)} no se han subido.`);
    for (const a of Array.from(fs).slice(0, Math.max(0, libres))) {
      setSubiendo(a.name);
      try {
        if (imagenes && !/^image\//.test(a.type) && !esHeic(a)) throw new Error(`«${a.name}» no es una imagen. Los documentos van en su lista.`);
        const nuevo = await subirAdjunto(esHeic(a) ? await heicAJpg(a) : a, pieza);
        alCambiar([...ultima.current, nuevo]); setMios(s => new Set(s).add(nuevo.id));
      } catch (e: any) { errores.push(e?.message || `No se ha podido subir «${a.name}».`); }
    }
    setSubiendo(null); setError(errores.join(' ') || null);
    if (entrada.current) entrada.current.value = '';
  };
  const borrar = async (a: Adjunto) => {
    if (!window.confirm(`¿Borrar «${a.nombre}» del servidor? Desaparece también de cualquier otro sitio donde esté. Para quitarlo solo de esta ficha, usa «Quitar».`)) return;
    try { await borrarAdjunto(a.id); alCambiar(ultima.current.filter(x => x.id !== a.id)); } catch (e: any) { setError(e?.message || 'No se ha podido borrar.'); }
  };
  const quitar = (a: Adjunto) => alCambiar(ultima.current.filter(x => x.id !== a.id));
  const url = (a: Adjunto) => new URL(a.url, window.location.origin).href;
  return (
    <div className="flex flex-col gap-2">
      {lista.length > 0 && (imagenes
        ? <ul className="flex flex-wrap gap-2">{lista.map(a => (
            <li key={a.id} className="w-28">
              <a href={url(a)} target="_blank" rel="noopener noreferrer" title={a.nombre}><img src={a.url} alt={a.nombre} loading="lazy" className="h-24 w-28 rounded-md border border-slate-200 bg-slate-50 object-cover" /></a>
              <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-slate-500">
                <span className="min-w-0 truncate" title={a.nombre}>{a.nombre}</span>
                {!bloqueado && <span className="flex shrink-0 items-center">
                  <Button variant="ghost" onClick={() => quitar(a)} className="px-1 py-0 text-[10px] font-normal normal-case tracking-normal" title="Quitarla de esta ficha (el archivo sigue en el servidor)">Quitar</Button>
                  {mios.has(a.id) && <Button variant="ghost" onClick={() => borrar(a)} aria-label={`Borrar ${a.nombre} del servidor`} className="px-1 py-0 text-slate-400 hover:text-rose-700"><Trash2 className="h-3 w-3" /></Button>}
                </span>}
              </div>
            </li>))}</ul>
        : <ul className="flex flex-col gap-1">{lista.map(a => (
            <li key={a.id} className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <a href={url(a)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-slate-700 underline decoration-dotted underline-offset-2 hover:text-teal-800">{a.nombre}</a>
              <span className="shrink-0 font-mono text-[10px] text-slate-400">{tamano(a.bytes)}</span>
              {!bloqueado && <>
                <Button variant="ghost" onClick={() => quitar(a)} className="px-1 py-0 text-[10px] font-normal normal-case tracking-normal" title="Quitarlo de esta ficha (el archivo sigue en el servidor)">Quitar</Button>
                {mios.has(a.id) && <Button variant="ghost" onClick={() => borrar(a)} aria-label={`Borrar ${a.nombre} del servidor`} className="px-1 py-0 text-slate-400 hover:text-rose-700"><Trash2 className="h-3 w-3" /></Button>}
              </>}
            </li>))}</ul>)}
      {lista.length === 0 && <p className="text-xs text-slate-500">{imagenes ? 'Aún no hay ninguna imagen de referencia.' : 'Aún no hay ningún documento.'}</p>}
      {!bloqueado && (user ? (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={entrada} type="file" multiple accept={imagenes ? 'image/*,.heic,.heif' : ACEPTA} className="hidden" onChange={e => subir(e.target.files)} aria-label={imagenes ? 'Subir imágenes de referencia' : 'Subir documentos'} />
          <Button variant="outline" disabled={!!subiendo || lista.length >= MAX_ARCHIVOS_FICHA} onClick={() => entrada.current?.click()} className="gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal">
            {imagenes ? <ImagePlus className="h-3 w-3" aria-hidden /> : <Upload className="h-3 w-3" aria-hidden />}{subiendo ? `Subiendo «${subiendo.slice(0, 30)}»…` : imagenes ? 'Añadir imágenes' : 'Adjuntar documentos'}
          </Button>
          <span className="text-[10px] text-slate-400">{imagenes ? 'JPG, PNG, WebP o fotos del móvil' : 'PDF, Word, Excel, PowerPoint, fotos'} · hasta 10 MB cada uno</span>
        </div>
      ) : <p className="text-[11px] text-slate-500">Para subir archivos <Link to="/login" className="font-semibold text-sky-800 underline">inicia sesión</Link>.</p>)}
      {error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}
    </div>
  );
}

function Alternativas({ lista, alCambiar, bloqueado }: { lista: AlternativaFicha[]; alCambiar: (l: AlternativaFicha[]) => void; bloqueado: boolean }) {
  const cambia = (i: number, c: Partial<AlternativaFicha>) => alCambiar(lista.map((a, j) => (j === i ? { ...a, ...c } : a)));
  return (
    <div className="flex flex-col gap-2">
      {lista.length === 0 && <p className="text-xs text-slate-500">Aún no hay alternativas. Apunta aquí otros modelos o proveedores con los que se podría cambiar, con su precio y el enlace.</p>}
      {lista.map((a, i) => {
        const u = a.url ? enlaceSeguro(a.url) : null;
        return (
          <div key={i} className="grid gap-1.5 rounded-md border border-slate-200 p-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_7rem_auto]">
            <input type="text" value={a.nombre} maxLength={120} disabled={bloqueado} placeholder="Modelo o proveedor" aria-label={`Alternativa ${i + 1}: nombre`} onChange={e => cambia(i, { nombre: e.target.value })} className={caja} />
            <input type="url" inputMode="url" value={a.url ?? ''} maxLength={500} disabled={bloqueado} placeholder="Enlace (opcional)" aria-label={`Alternativa ${i + 1}: enlace`} onChange={e => cambia(i, { url: e.target.value })} className={cn(caja, a.url && !u && 'border-rose-400')} />
            <input type="number" min={0} step={1} value={a.eur ?? ''} disabled={bloqueado} placeholder="€" aria-label={`Alternativa ${i + 1}: precio en euros`} onChange={e => cambia(i, { eur: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })} className={caja} />
            {!bloqueado && <Button variant="ghost" onClick={() => alCambiar(lista.filter((_, j) => j !== i))} aria-label={`Quitar la alternativa ${i + 1}`} className="justify-self-end px-1.5 text-slate-400 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>}
            <input type="text" value={a.nota ?? ''} maxLength={400} disabled={bloqueado} placeholder="Qué gana y qué pierde frente a la actual (peso, precio, plazo…)" aria-label={`Alternativa ${i + 1}: nota`} onChange={e => cambia(i, { nota: e.target.value })} className={cn(caja, 'sm:col-span-4')} />
            {a.url && !u && <p className="text-[11px] text-rose-700 sm:col-span-4">Ese enlace no es una página web (http o https): no se guardará.</p>}
            {u && <a href={u} target="_blank" rel="noopener noreferrer" className="text-[11px] text-teal-700 underline sm:col-span-4">Abrir el enlace</a>}
          </div>
        );
      })}
      {!bloqueado && lista.length < MAX_ALTERNATIVAS && (
        <Button variant="outline" onClick={() => alCambiar([...lista, { nombre: '' }])} className="w-fit gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal"><Plus className="h-3 w-3" aria-hidden />Añadir alternativa</Button>
      )}
    </div>
  );
}

const ESTADO: Record<string, string> = { pendiente: 'Cambios sin guardar…', guardando: 'Guardando…', guardado: 'Guardado', quieto: '' };

export interface PropsPanelFicha {
  def: DefFicha; tipo: string; vehiculo: string; nombreVehiculo: string;
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void;
  res: Resultados; listas: ListasDiseno;
  /** The Aeromóvil's owner (or an admin): the only one who changes anything here, as in the rest of the editor. */
  editable: boolean;
  alCerrar: () => void;
}

export function PanelFicha({ def, tipo, vehiculo, nombreVehiculo, P, set, res, listas, editable, alCerrar }: PropsPanelFicha) {
  const fx = useFichas();
  const f = fx.leer(def.id), st = fx.estado(def.id);
  const d = datosDe(def, tipo, listas);
  const bloqueado = !editable || fx.carga !== 'listo';
  const cambia = (c: Partial<FichaValor>) => cambiarFicha(def.id, c);
  const numero = f.numero?.trim() || numeroPorDefecto(def);
  const pieza = `${def.nombre} (${vehiculo})`;
  const encabezado = useRef<HTMLDivElement>(null);
  // on a narrow screen the record opens under the viewer, out of sight: scroll so the viewer's top sits just under the sticky
  // header (the viewer is 40 % of the screen high while a record is open: the record's title shows right below it)
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    const v = document.querySelector('section[aria-label="Vista 3D"]'), cab = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    if (v) window.scrollTo({ top: window.scrollY + v.getBoundingClientRect().top - cab - 8, behavior: 'smooth' });
    else encabezado.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [def.id]);
  const pesosEd = res.triciclo ? { base: res.triciclo.pesosBase, propios: P.pesos, alCambiar: (nombre: string, v: number | null) => set('pesos', conPeso(P.pesos, nombre, v)) } : undefined;
  return (
    <Card className="mt-3 flex flex-col gap-3 p-3 sm:p-4" role="region" aria-label={`Ficha de ${def.nombre}`} data-ficha={def.id}>
      <div ref={encabezado} className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{nombreVehiculo} · {def.prefijo}</p>
          <h2 className="flex flex-wrap items-baseline gap-2 text-lg font-semibold text-slate-900">
            <span className="rounded-md border border-teal-700 bg-teal-50 px-2 py-0.5 font-mono text-sm text-teal-900" title="Número interno del componente">{numero}</span>
            {def.nombre}
          </h2>
        </div>
        <Button variant="outline" onClick={alCerrar} className="gap-1.5 bg-white px-2.5 py-1.5 text-xs normal-case tracking-normal"><ArrowLeft className="h-4 w-4" aria-hidden />Volver al departamento<span className="hidden text-slate-400 sm:inline"> (Esc)</span></Button>
      </div>

      {!editable && <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">Esta ficha la cambia el dueño del Aeromóvil con su sesión iniciada; aquí puedes leerla.</p>}
      {editable && fx.carga === 'cargando' && <p className="text-xs text-slate-500">Cargando la ficha…</p>}
      {editable && fx.carga === 'error' && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">No se han podido leer las fichas guardadas. Para no pisarlas, no se puede editar hasta que vuelva la conexión: recarga la página.</p>}

      <dl className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Peso</dt><dd className="font-semibold text-slate-900">{textoPesoSeccion(d?.peso ?? null) ?? '—'}</dd></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Precio</dt><dd className="font-semibold text-slate-900">{d?.precio ? eur(d.precio.eur) : '—'}</dd></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Número interno</dt>
          <dd><input type="text" value={f.numero ?? ''} maxLength={40} disabled={bloqueado} placeholder={numeroPorDefecto(def)} aria-label="Número interno" onChange={e => cambia({ numero: e.target.value })} className={cn(caja, 'mt-0.5 py-0.5 font-mono')} /></dd></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><dt className="text-[11px] text-slate-500">Stock (unidades)</dt>
          <dd><input type="number" min={0} step={1} value={f.stock ?? ''} disabled={bloqueado} placeholder="0" aria-label="Unidades en stock" onChange={e => cambia({ stock: e.target.value === '' ? undefined : Math.max(0, Math.round(Number(e.target.value))) })} className={cn(caja, 'mt-0.5 py-0.5')} /></dd></div>
      </dl>

      <Seccion titulo="Qué es y características" abierta>
        <textarea value={f.caracteristicas ?? ''} maxLength={MAX_TEXTO_FICHA} rows={3} disabled={bloqueado} aria-label="Qué es y características" onChange={e => cambia({ caracteristicas: e.target.value })}
          placeholder={def.queEs} className={cn(caja, 'resize-y')} />
      </Seccion>

      <Seccion titulo="Piezas: proveedor, modelo, archivos, peso y precio" resumen={d?.peso ? `${d.peso.partes.length} pieza${d.peso.partes.length === 1 ? '' : 's'}` : undefined} abierta>
        {d?.peso ? (
          <fieldset disabled={!editable} className="contents">
            <ContextoProveedores.Provider value={{ P, set }}>
              <DesglosePeso s={d.peso} abierto precios={{ s: d.precio, alCambiar: (nombre, v) => set('precios', conPrecio(P, nombre, v)) }} pesos={pesosEd} />
            </ContextoProveedores.Provider>
          </fieldset>
        ) : <p className="text-xs text-slate-500">Este vehículo no tiene aún su lista de piezas en la sección «{d?.bloque ?? def.nombre}».</p>}
        <p className="text-[11px] text-slate-400">Es la misma lista que «Peso: todos los componentes» del panel lateral: lo que cambies aquí cambia allí. Se guarda con el diseño.</p>
      </Seccion>

      <Seccion titulo="Alternativas" resumen={f.alternativas?.length ? `${f.alternativas.length}` : undefined} abierta={!!f.alternativas?.length}>
        <Alternativas lista={f.alternativas ?? []} alCambiar={l => cambia({ alternativas: l })} bloqueado={bloqueado} />
      </Seccion>

      <Seccion titulo="Imágenes de referencia" resumen={f.imagenes?.length ? `${f.imagenes.length}` : undefined} abierta={!!f.imagenes?.length}>
        <Archivos lista={f.imagenes ?? []} alCambiar={l => cambia({ imagenes: l })} pieza={pieza} imagenes bloqueado={bloqueado} />
      </Seccion>

      <Seccion titulo="Documentos" resumen={f.documentos?.length ? `${f.documentos.length}` : undefined} abierta={!!f.documentos?.length}>
        <Archivos lista={f.documentos ?? []} alCambiar={l => cambia({ documentos: l })} pieza={pieza} imagenes={false} bloqueado={bloqueado} />
      </Seccion>

      <Seccion titulo="Notas" abierta={!!f.notas}>
        <textarea value={f.notas ?? ''} maxLength={MAX_TEXTO_FICHA} rows={3} disabled={bloqueado} aria-label="Notas" onChange={e => cambia({ notas: e.target.value })} placeholder="Lo que hay que recordar de este componente." className={cn(caja, 'resize-y')} />
      </Seccion>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500" aria-live="polite">
        <Paperclip className="h-3 w-3" aria-hidden />
        {st.estado === 'error' || st.estado === 'conflicto' ? <span role="alert" className="text-rose-700">{st.mensaje}</span> : ESTADO[st.estado]}
        {st.estado === 'quieto' && (fx.registro(def.id)?.por ? `Último cambio de ${fx.registro(def.id)!.por}.` : 'Se guarda sola unos segundos después de escribir.')}
      </p>
    </Card>
  );
}
