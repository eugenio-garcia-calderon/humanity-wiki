import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ImagePlus, Link2, Search, Trash2 } from 'lucide-react';
import { subirArchivo } from '../../utils/subir';
import { cn } from '../../utils/cn';

// ============================================================================
// EL FORMULARIO DE UNA ENTRADA NUEVA, EN LA PÁGINA PUBLICADA (2026-10-20)
// ============================================================================
// Ver `Contribuir.tsx` y `server/contribuir.ts`. Sólo las propiedades que ya
// existen (sin crear ninguna), las relaciones para enlazar con otras bases de
// datos, una portada, y el contenido de la página de la entrada: texto e
// imágenes.

type Columna = { id: string; nombre: string; tipo: string; opciones: { id: string; label: string; color: string | null }[]; varios: boolean; destino: string | null };
type Definicion = { tabla: string; columnas: Columna[] };
type Pieza = { tipo: 'parrafo'; texto: string } | { tipo: 'imagen'; url: string };

export default function NuevaEntradaPublica({ paginaId, tablaId, onCerrar, onCreada }: {
  paginaId: string; tablaId: string; onCerrar: () => void; onCreada: (titulo: string) => void;
}) {
  const base = `/api/sitio-contribuir/${encodeURIComponent(paginaId)}/tablas/${encodeURIComponent(tablaId)}`;
  const [def, setDef] = useState<Definicion | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [celdas, setCeldas] = useState<Record<string, any>>({});
  const [nombresRel, setNombresRel] = useState<Record<string, string>>({});
  const [portada, setPortada] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const primero = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(base, { credentials: 'include' }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setFallo(j.error || 'No se puede añadir aquí.'); else setDef(j);
    }).catch(() => setFallo('No hay conexión.'));
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (def) primero.current?.focus(); }, [def]);

  const poner = (id: string, v: any) => setCeldas(c => ({ ...c, [id]: v }));
  const subir = async (f: File, para: 'portada' | 'imagen') => {
    setSubiendo(para === 'portada' ? 'Subiendo la portada…' : `Subiendo ${f.name.slice(0, 24)}…`);
    const r = await subirArchivo(f, undefined, undefined, { contribuir: paginaId });
    setSubiendo(null);
    if (!r.url) { setFallo(r.error || 'No se ha podido subir la imagen.'); return; }
    if (para === 'portada') setPortada(r.url); else setImagenes(l => [...l, r.url!]);
  };

  const guardar = async () => {
    if (!titulo.trim()) { setFallo('Ponle un nombre a la entrada.'); primero.current?.focus(); return; }
    setGuardando(true); setFallo(null);
    const cuerpo: Pieza[] = [
      ...texto.split(/\n{2,}/).map(t => t.trim()).filter(Boolean).map(t => ({ tipo: 'parrafo' as const, texto: t })),
      ...imagenes.map(url => ({ tipo: 'imagen' as const, url })),
    ];
    const limpias = Object.fromEntries(Object.entries(celdas).filter(([, v]) => v !== '' && v !== undefined && !(Array.isArray(v) && !v.length)));
    const r = await fetch(`${base}/filas`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: titulo.trim(), celdas: limpias, portada, cuerpo }),
    });
    const j = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) {
      const detalle = Array.isArray(j.fallos) && j.fallos.length
        ? ' ' + j.fallos.map((f: any) => `${def?.columnas.find(c => c.id === f.columna)?.nombre || ''}: ${f.error}`).join(' · ') : '';
      setFallo((j.error || 'No se ha podido guardar.') + detalle);
      return;
    }
    onCreada(titulo.trim());
  };

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-6" onClick={onCerrar}>
      <div role="dialog" aria-label="Añadir una entrada" onClick={e => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Añadir una entrada</p>
            <p className="truncate text-base font-black text-slate-900">{def?.tabla || '…'}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!def && !fallo && <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p>}
          {def && (
            <>
              <Campo etiqueta="Nombre">
                <input ref={primero} aria-label="Nombre" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="El nombre de la entrada"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base font-bold text-slate-900 outline-none focus:border-emerald-400" />
              </Campo>

              <Campo etiqueta="Portada">
                {portada ? (
                  <div className="relative w-fit">
                    <img src={portada} alt="" className="max-h-48 rounded-xl object-contain" />
                    <button type="button" onClick={() => setPortada(null)} aria-label="Quitar la portada"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-500 shadow hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <Subir texto="Subir una imagen de portada" onArchivos={fs => fs[0] && subir(fs[0], 'portada')} />
                )}
              </Campo>

              {def.columnas.map(c => (
                <Campo key={c.id} etiqueta={c.nombre}>
                  <Entrada c={c} valor={celdas[c.id]} onCambio={v => poner(c.id, v)} base={base}
                    nombres={nombresRel} onNombres={n => setNombresRel(x => ({ ...x, ...n }))} />
                </Campo>
              ))}

              <Campo etiqueta="Contenido">
                <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={5}
                  placeholder="Escribe aquí lo que quieras contar. Deja una línea en blanco para separar párrafos."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-slate-700 outline-none focus:border-emerald-400" />
                {imagenes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {imagenes.map((u, i) => (
                      <div key={u + i} className="relative">
                        <img src={u} alt="" className="h-20 w-20 rounded-lg object-cover" />
                        <button type="button" onClick={() => setImagenes(l => l.filter((_, k) => k !== i))} aria-label="Quitar la imagen"
                          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 hover:text-rose-600"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2"><Subir texto="Añadir imágenes" varias onArchivos={async fs => { for (const f of fs) await subir(f, 'imagen'); }} /></div>
              </Campo>
            </>
          )}
          {subiendo && <p className="flex items-center gap-2 text-xs font-bold text-emerald-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {subiendo}</p>}
          {fallo && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{fallo}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          <button type="button" onClick={onCerrar} className="h-11 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
          <button type="button" onClick={guardar} disabled={!def || guardando || !!subiendo}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Añadir entrada
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={etiqueta}>
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-400">{etiqueta}</span>
      {children}
    </div>
  );
}

function Subir({ texto, varias, onArchivos }: { texto: string; varias?: boolean; onArchivos: (f: File[]) => void }) {
  return (
    <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-700">
      <ImagePlus className="h-4 w-4" /> {texto}
      <input type="file" accept="image/*,.heic,.heif" multiple={varias} className="hidden"
        onChange={e => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) onArchivos(fs); }} />
    </span>
  );
}

const claseCampo = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-emerald-400';

function Entrada({ c, valor, onCambio, base, nombres, onNombres }: {
  c: Columna; valor: any; onCambio: (v: any) => void; base: string;
  nombres: Record<string, string>; onNombres: (n: Record<string, string>) => void;
}) {
  switch (c.tipo) {
    case 'texto_largo':
      return <textarea value={valor || ''} onChange={e => onCambio(e.target.value)} rows={3} className={cn(claseCampo, 'h-auto py-2.5')} />;
    case 'numero': case 'moneda': case 'porcentaje': case 'valoracion':
      return <input type="number" inputMode="decimal" value={valor ?? ''} onChange={e => onCambio(e.target.value === '' ? '' : Number(e.target.value))} className={claseCampo} />;
    case 'fecha':
      return <input type="date" value={valor || ''} onChange={e => onCambio(e.target.value)} className={claseCampo} />;
    case 'casilla':
      return (
        <span className="flex h-11 items-center gap-2">
          <input type="checkbox" checked={!!valor} onChange={e => onCambio(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
          <span className="text-sm text-slate-600">Sí</span>
        </span>
      );
    case 'url': return <input type="url" inputMode="url" value={valor || ''} onChange={e => onCambio(e.target.value)} placeholder="https://…" className={claseCampo} />;
    case 'email': return <input type="email" value={valor || ''} onChange={e => onCambio(e.target.value)} className={claseCampo} />;
    case 'telefono': return <input type="tel" value={valor || ''} onChange={e => onCambio(e.target.value)} className={claseCampo} />;
    case 'seleccion':
      return (
        <div className="flex flex-wrap gap-1.5">
          {c.opciones.map(o => (
            <button key={o.id} type="button" onClick={() => onCambio(valor === o.id ? '' : o.id)} aria-pressed={valor === o.id}
              className={cn('h-9 rounded-full border px-3 text-sm font-bold transition-colors', valor === o.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
              {o.label}
            </button>
          ))}
        </div>
      );
    case 'seleccion_multiple': {
      const lista: string[] = Array.isArray(valor) ? valor : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {c.opciones.map(o => {
            const si = lista.includes(o.id);
            return (
              <button key={o.id} type="button" onClick={() => onCambio(si ? lista.filter(x => x !== o.id) : [...lista, o.id])} aria-pressed={si}
                className={cn('h-9 rounded-full border px-3 text-sm font-bold transition-colors', si ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    case 'relacion':
      return <Relacion c={c} valor={Array.isArray(valor) ? valor : []} onCambio={onCambio} base={base} nombres={nombres} onNombres={onNombres} />;
    default:
      return <input value={valor || ''} onChange={e => onCambio(e.target.value)} className={claseCampo} />;
  }
}

/** Enlazar con entradas de otra base de datos: buscar y marcar. */
function Relacion({ c, valor, onCambio, base, nombres, onNombres }: {
  c: Columna; valor: string[]; onCambio: (v: string[]) => void; base: string;
  nombres: Record<string, string>; onNombres: (n: Record<string, string>) => void;
}) {
  const [q, setQ] = useState('');
  const [filas, setFilas] = useState<{ id: string; titulo: string }[]>([]);
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(() => {
      fetch(`${base}/relacion/${encodeURIComponent(c.id)}?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : { filas: [] })).then(j => {
          setFilas(j.filas || []);
          onNombres(Object.fromEntries((j.filas || []).map((f: any) => [f.id, f.titulo])));
        }).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [q, abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = (id: string) => {
    if (valor.includes(id)) onCambio(valor.filter(x => x !== id));
    else onCambio(c.varios ? [...valor, id] : [id]);
  };
  return (
    <div>
      {valor.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {valor.map(id => (
            <span key={id} className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-50 pl-3 pr-1 text-sm font-bold text-emerald-800">
              {nombres[id] || 'Entrada'}
              <button type="button" onClick={() => alternar(id)} aria-label="Quitar el enlace" className="grid h-6 w-6 place-items-center rounded-full hover:bg-emerald-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      {abierto ? (
        <div className="rounded-xl border border-slate-200 p-2">
          <div className="flex items-center gap-2 px-1">
            <Search className="h-4 w-4 text-slate-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar para enlazar…"
              className="h-9 min-w-0 flex-1 text-sm outline-none" />
          </div>
          <div className="mt-1 max-h-48 overflow-y-auto">
            {filas.map(f => (
              <button key={f.id} type="button" onClick={() => alternar(f.id)}
                className={cn('flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50', valor.includes(f.id) && 'font-bold text-emerald-700')}>
                <span className="truncate">{f.titulo}</span>{valor.includes(f.id) && <span aria-hidden>✓</span>}
              </button>
            ))}
            {!filas.length && <p className="px-2 py-2 text-xs text-slate-400">Nada que enlazar con ese nombre.</p>}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
          <Link2 className="h-4 w-4" /> Enlazar
        </button>
      )}
    </div>
  );
}
