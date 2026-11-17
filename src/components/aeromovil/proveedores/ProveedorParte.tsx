/**
 * Supplier, model and files on a part's line of «De qué está hecho este peso» (2026-11-17, Eugenio: «que todos los
 * componentes, aparte de tener un peso y un precio, se pueda elegir un proveedor y un modelo… escrito… y también… un
 * enlace o subir un archivo… varios archivos, igual hay presupuestos… un PDF»).
 *
 * Calm by default: a line with nothing shows only a small «Proveedor» link next to the price; a line with data shows
 * one quiet sentence under the name («Proveedor · Modelo · 2 archivos»). A tap opens, under that line only, the two
 * names, their links and the files. Text and links go with the design (`datos.ts`); files go to the server and need a
 * session, which this panel says before anyone tries.
 *
 * The design and its setter come from `ContextoProveedores`, given once by the side panel (LadoTriciclo.tsx), so the
 * parts list (PesoSeccion.tsx) needs one line and no new props.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, Store, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { esHeic, heicAJpg } from '../../../utils/prepararImagen';
import type { Parametros } from '../geometria';
import {
  ACEPTA, MAX_ADJUNTOS, MAX_TEXTO, MAX_URL, adjuntosMios, borrarAdjunto, conFicha, enlaceSeguro, fichaDe, subirAdjunto,
  sugerencia, tamano, tieneDatos, type Adjunto, type ProveedorPieza,
} from './datos';

export interface ContextoP { P: Parametros; set: (k: 'proveedores', v: Record<string, ProveedorPieza> | undefined) => void }
export const ContextoProveedores = createContext<ContextoP | null>(null);

/** A link the page shows: only http(s), in a new tab, telling the other site nothing about this page. */
function Enlace({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const u = enlaceSeguro(href);
  if (!u) return <span className={className}>{children}</span>;
  return <a href={u} target="_blank" rel="noopener noreferrer" className={cn('underline decoration-dotted underline-offset-2 hover:text-sky-800', className)}>{children}</a>;
}

/** The line's own row: the summary under the name, and the toggle. `nivel` 0 only (a part, not a tube of a part). */
export function ProveedorParte({ nombre }: { nombre: string }) {
  const cx = useContext(ContextoProveedores);
  const [abierto, setAbierto] = useState(false);
  if (!cx) return null;
  const f = fichaDe(cx.P, nombre), sug = sugerencia(nombre, cx.P);
  const n = f.adjuntos?.length ?? 0;
  // own text wins; a name typed without a link keeps no link from the catalogue (it may be another supplier)
  const prov = f.proveedor || f.proveedorUrl ? { t: f.proveedor || enlaceSeguro(f.proveedorUrl)?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '', u: f.proveedorUrl } : sug?.proveedor ? { t: sug.proveedor, u: sug.proveedorUrl } : null;
  const mod = f.modelo || f.modeloUrl ? { t: f.modelo || 'ficha', u: f.modeloUrl } : sug?.modelo ? { t: sug.modelo, u: sug.modeloUrl } : null;
  const trozos = [prov, mod].filter((x): x is { t: string; u?: string } => !!x && !!x.t);
  const resumen = trozos.map(x => x.t).concat(n ? [`${n} archivo${n > 1 ? 's' : ''}`] : []).join(' · ');
  return (
    <div className="mt-0.5">
      <div className="flex items-baseline justify-between gap-2">
        {resumen
          ? <span className={cn('min-w-0 truncate text-[11px]', tieneDatos(f) ? 'text-slate-600' : 'text-slate-400')} title={tieneDatos(f) ? resumen : `Del ${sug?.de}`}>
              {trozos.map((x, i) => <span key={i}>{i > 0 && ' · '}{x.u ? <Enlace href={x.u}>{x.t}</Enlace> : x.t}</span>)}
              {n > 0 && <>{trozos.length ? ' · ' : ''}<Button variant="ghost" onClick={() => setAbierto(true)} className="inline p-0 text-[11px] font-normal normal-case tracking-normal underline decoration-dotted underline-offset-2">{n} archivo{n > 1 ? 's' : ''}</Button></>}
            </span>
          : <span />}
        <Button variant="ghost" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} title="Proveedor, modelo, enlaces y archivos de esta pieza"
          className={cn('shrink-0 gap-1 rounded px-1 py-0 text-[11px] font-normal normal-case tracking-normal text-slate-500 underline decoration-dotted underline-offset-2', abierto && 'bg-slate-100')}>
          <Store className="h-3 w-3" aria-hidden />{tieneDatos(f) ? 'Ver' : 'Proveedor'}
        </Button>
      </div>
      {abierto && <EditorProveedor nombre={nombre} f={f} cx={cx} alCerrar={() => setAbierto(false)} />}
    </div>
  );
}

/** One name with its optional link; changes reach the design on a short pause (each one recalculates the vehicle). */
function CampoConEnlace({ etiqueta, id, valor, enlace, sugerido, sugeridoUrl, alCambiar }: {
  etiqueta: string; id: string; valor?: string; enlace?: string; sugerido?: string; sugeridoUrl?: string;
  alCambiar: (texto: string, url: string) => void;
}) {
  const [t, setT] = useState(valor ?? ''), [u, setU] = useState(enlace ?? '');
  const reloj = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setT(valor ?? ''); }, [valor]);
  useEffect(() => { setU(enlace ?? ''); }, [enlace]);
  useEffect(() => () => clearTimeout(reloj.current), []);
  const poner = (a: string, b: string) => { setT(a); setU(b); clearTimeout(reloj.current); reloj.current = setTimeout(() => alCambiar(a, b), 400); };
  const malo = u.trim() !== '' && !enlaceSeguro(u);
  const caja = 'w-full min-w-0 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs placeholder:text-slate-400';
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-semibold text-slate-600">{etiqueta}</label>
      <input id={id} type="text" value={t} maxLength={MAX_TEXTO} placeholder={sugerido ? `${sugerido} (del catálogo)` : 'Nombre'} onChange={e => poner(e.target.value, u)} className={caja} />
      <input type="url" inputMode="url" value={u} maxLength={MAX_URL} placeholder={sugeridoUrl ? `${sugeridoUrl.replace(/^https?:\/\//, '').slice(0, 48)} (del catálogo)` : 'Enlace (opcional): https://…'}
        aria-label={`Enlace de ${etiqueta.toLowerCase()}`} aria-invalid={malo} onChange={e => poner(t, e.target.value)} className={cn(caja, malo && 'border-amber-400')} />
      {malo && <p className="text-[11px] text-amber-700">Ese enlace no es una dirección web (http o https): no se mostrará.</p>}
      {!t && !u && sugerido && <p className="text-[11px] text-slate-400">Sin escribir nada se muestra lo del catálogo{sugeridoUrl ? <> (<Enlace href={sugeridoUrl}>su ficha</Enlace>)</> : null}.</p>}
    </div>
  );
}

function EditorProveedor({ nombre, f, cx, alCerrar }: { nombre: string; f: ProveedorPieza; cx: ContextoP; alCerrar: () => void }) {
  const { user } = useAuth();
  const sug = sugerencia(nombre, cx.P);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mios, setMios] = useState<Set<number>>(new Set());
  const entrada = useRef<HTMLInputElement>(null);
  // Latest design for the async upload: the person may keep typing while a file goes up.
  const ultimo = useRef(cx); ultimo.current = cx;
  const adjuntos = f.adjuntos ?? [];
  const ids = adjuntos.map(a => a.id).join(',');
  useEffect(() => { let vivo = true; if (user) adjuntosMios(adjuntos.map(a => a.id)).then(s => { if (vivo) setMios(s); }); else setMios(new Set()); return () => { vivo = false; }; }, [ids, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (c: Partial<ProveedorPieza>) => { const { P, set } = ultimo.current; set('proveedores', conFicha(P, nombre, c)); };
  const quitarDeLista = (id: number) => cambiar({ adjuntos: (fichaDe(ultimo.current.P, nombre).adjuntos ?? []).filter(a => a.id !== id) });

  const subir = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setError(null);
    const libres = MAX_ADJUNTOS - adjuntos.length;
    const archivos = Array.from(lista).slice(0, Math.max(0, libres));
    const errores: string[] = [];
    if (lista.length > libres) errores.push(`Caben ${MAX_ADJUNTOS} archivos por pieza: ${lista.length - Math.max(0, libres)} no se han subido.`);
    for (const a of archivos) {
      setSubiendo(a.name);
      try {
        const listo = esHeic(a) ? await heicAJpg(a) : a;
        const nuevo: Adjunto = await subirAdjunto(listo, nombre);
        cambiar({ adjuntos: [...(fichaDe(ultimo.current.P, nombre).adjuntos ?? []), nuevo] });
        setMios(s => new Set(s).add(nuevo.id));
      } catch (e: any) { errores.push(e?.message || `No se ha podido subir «${a.name}».`); }
    }
    setSubiendo(null);
    if (errores.length) setError(errores.join(' '));
    if (entrada.current) entrada.current.value = '';
  };

  const borrar = async (a: Adjunto) => {
    if (!window.confirm(`¿Borrar «${a.nombre}» del servidor? Desaparece también de cualquier otro diseño que lo tenga. Para quitarlo solo de este diseño, usa «Quitar».`)) return;
    try { await borrarAdjunto(a.id); quitarDeLista(a.id); } catch (e: any) { setError(e?.message || 'No se ha podido borrar.'); }
  };

  const id = `prov-${nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <CampoConEnlace etiqueta="Proveedor" id={`${id}-p`} valor={f.proveedor} enlace={f.proveedorUrl} sugerido={sug?.proveedor} sugeridoUrl={sug?.proveedorUrl}
          alCambiar={(t, u) => cambiar({ proveedor: t, proveedorUrl: u })} />
        <CampoConEnlace etiqueta="Modelo" id={`${id}-m`} valor={f.modelo} enlace={f.modeloUrl} sugerido={sug?.modelo} sugeridoUrl={sug?.modeloUrl}
          alCambiar={(t, u) => cambiar({ modelo: t, modeloUrl: u })} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600"><Paperclip className="h-3 w-3" aria-hidden />Archivos{adjuntos.length ? ` (${adjuntos.length})` : ''}</span>
        {adjuntos.length > 0 && (
          <ul className="flex flex-col gap-1">
            {adjuntos.map(a => (
              <li key={a.id} className="flex items-center gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                <Enlace href={new URL(a.url, window.location.origin).href} className="min-w-0 flex-1 truncate text-slate-700">{a.nombre}</Enlace>
                <span className="shrink-0 font-mono text-[10px] text-slate-400">{tamano(a.bytes)}</span>
                <Button variant="ghost" onClick={() => quitarDeLista(a.id)} title="Quitarlo de este diseño (el archivo sigue en el servidor)" className="px-1 py-0 text-[10px] font-normal normal-case tracking-normal">Quitar</Button>
                {mios.has(a.id) && <Button variant="ghost" onClick={() => borrar(a)} title="Borrarlo del servidor (lo subiste tú)" aria-label={`Borrar ${a.nombre} del servidor`} className="px-1 py-0 text-slate-400 hover:text-rose-700"><Trash2 className="h-3 w-3" /></Button>}
              </li>
            ))}
          </ul>
        )}
        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <input ref={entrada} type="file" multiple accept={ACEPTA} className="hidden" onChange={e => subir(e.target.files)} aria-label={`Subir archivos de ${nombre}`} />
            <Button variant="outline" disabled={!!subiendo || adjuntos.length >= MAX_ADJUNTOS} onClick={() => entrada.current?.click()} className="gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal">
              <Upload className="h-3 w-3" aria-hidden />{subiendo ? `Subiendo «${subiendo.slice(0, 30)}»…` : 'Subir archivos'}
            </Button>
            <span className="text-[10px] text-slate-400">PDF, fotos, Word, Excel, PowerPoint · hasta 10 MB cada uno</span>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">Para subir archivos (presupuestos, fichas técnicas, PDF…) <Link to="/login" className="font-semibold text-sky-800 underline">inicia sesión</Link>. El proveedor, el modelo y los enlaces se pueden escribir sin cuenta.</p>
        )}
        {error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <p className="flex-1 text-[10px] leading-snug text-slate-400">Se guarda con el diseño. Cualquiera que abra este diseño ve los nombres, los enlaces y los archivos.</p>
        <Button variant="ghost" onClick={alCerrar} className="px-2 py-0.5 text-[10px]">Hecho</Button>
      </div>
    </div>
  );
}
