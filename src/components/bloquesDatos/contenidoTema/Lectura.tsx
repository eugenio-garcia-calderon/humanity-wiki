import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { OBJETIVOS, hexDelColor } from '../../../utils/objetivos';
import { cn } from '../../../utils/cn';

type Item = { tipo: string; id: string; titulo: string; extracto: string | null; ruta: string; imagen?: string | null; extra?: string | null };
type Seccion = { clave: string; titulo: string; total: number; items: Item[] };
type Respuesta = { subtemas: Array<{ id: string; nombre: string; cosas: number }>; secciones: Seccion[]; total: number };

const esFuera = (ruta: string) => /^https?:\/\//i.test(ruta);

/** Lo que hay publicado sobre un tema, por secciones. En el editor los enlaces no navegan. */
export function VistaContenidoTema({ datos, enEditor = false }: { datos: Record<string, unknown>; enEditor?: boolean }) {
  const tema = OBJETIVOS.find(o => o.id === datos.tema) || OBJETIVOS[0];
  const elegidas = Array.isArray(datos.secciones) ? (datos.secciones as string[]) : null;
  const porSeccion = Math.min(12, Math.max(1, Number(datos.porSeccion) || 6));
  const titulo = typeof datos.titulo === 'string' && datos.titulo.trim() ? datos.titulo.trim() : null;
  const [subtema, setSubtema] = useState<string | null>(null);
  const [resp, setResp] = useState<Respuesta | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [cuantas, setCuantas] = useState<Record<string, number>>({});
  const [mas, setMas] = useState<Record<string, Item[]>>({});
  const base = `/api/feed-tema/${encodeURIComponent(tema.id)}?ambito=todos${subtema ? `&subtema=${encodeURIComponent(subtema)}` : ''}`;

  useEffect(() => {
    let vivo = true;
    setResp(null); setFallo(null); setMas({}); setCuantas({});
    fetch(base, { credentials: 'include' })
      .then(async r => { const j = await r.json().catch(() => ({})); if (!vivo) return; if (!r.ok) setFallo(j.error || 'No se ha podido cargar.'); else setResp(j); })
      .catch(() => vivo && setFallo('No hay conexión.'));
    return () => { vivo = false; };
  }, [base]);

  const verMas = async (s: Seccion) => {
    const ya = cuantas[s.clave] ?? porSeccion;
    const propios = [...s.items, ...(mas[s.clave] || [])];
    if (propios.length < ya + porSeccion && propios.length < s.total) {
      const r = await fetch(`${base}&seccion=${s.clave}&offset=${propios.length}`, { credentials: 'include' });
      const j = await r.json().catch(() => null);
      const nuevos: Item[] = j?.secciones?.find((x: Seccion) => x.clave === s.clave)?.items || [];
      setMas(m => ({ ...m, [s.clave]: [...(m[s.clave] || []), ...nuevos] }));
    }
    setCuantas(c => ({ ...c, [s.clave]: ya + porSeccion }));
  };

  const color = hexDelColor(tema.color);
  const Icono = tema.icono;
  const secciones = (resp?.secciones || []).filter(s => s.items.length && (!elegidas || elegidas.includes(s.clave)));

  return (
    <section aria-label={titulo || tema.titulo}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50" style={{ color }}><Icono className="h-4 w-4" /></span>
        <h3 className="text-base font-black text-slate-900">{titulo || tema.titulo.charAt(0) + tema.titulo.slice(1).toLocaleLowerCase('es')}</h3>
        {resp && <span className="text-xs font-bold text-slate-400">{resp.total}</span>}
      </div>
      {!!resp?.subtemas?.some(s => s.cosas > 0) && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setSubtema(null)}
            className={cn('h-7 rounded-full px-2.5 text-[11px] font-bold', !subtema ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>Todo</button>
          {resp.subtemas.filter(s => s.cosas > 0).map(s => (
            <button key={s.id} type="button" onClick={() => setSubtema(s.id)}
              className={cn('h-7 rounded-full px-2.5 text-[11px] font-bold', subtema === s.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {s.nombre} <span className="opacity-60">{s.cosas}</span>
            </button>
          ))}
        </div>
      )}
      {fallo && <p className="text-sm text-rose-600">{fallo}</p>}
      {!resp && !fallo && <div className="grid h-24 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>}
      {resp && !secciones.length && <p className="text-sm text-slate-400">Todavía no hay nada publicado sobre este tema.</p>}
      <div className="space-y-6">
        {secciones.map(s => {
          const todos = [...s.items, ...(mas[s.clave] || [])];
          const visibles = todos.slice(0, cuantas[s.clave] ?? porSeccion);
          return (
            <div key={s.clave}>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{s.titulo} <span className="text-slate-300">{s.total}</span></p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibles.map(it => (
                  <a key={`${it.tipo}:${it.id}`} href={it.ruta} onClick={enEditor ? e => e.preventDefault() : undefined}
                    target={esFuera(it.ruta) ? '_blank' : undefined} rel={esFuera(it.ruta) ? 'noopener noreferrer' : undefined}
                    className="group flex gap-3 rounded-2xl border border-slate-100 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50">
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-50">
                      {it.imagen ? <img src={it.imagen} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FileText className="h-5 w-5 text-slate-300" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-[13px] font-bold leading-snug text-slate-800 line-clamp-2">
                        {it.titulo || 'Sin título'}{esFuera(it.ruta) && <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />}
                      </span>
                      {(it.extracto || it.extra) && <span className="mt-0.5 block text-xs leading-snug text-slate-500 line-clamp-2">{it.extracto || it.extra}</span>}
                    </span>
                  </a>
                ))}
              </div>
              {todos.length < s.total || visibles.length < todos.length ? (
                <button type="button" onClick={() => verMas(s)}
                  className="mt-2 h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Ver más {s.titulo.toLocaleLowerCase('es')}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Lectura({ datos }: PropsLectura) {
  return <VistaContenidoTema datos={datos} />;
}
