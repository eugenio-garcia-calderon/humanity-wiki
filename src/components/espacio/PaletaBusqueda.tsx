import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Clock, CornerDownLeft, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEspacio } from '../../utils/espacio';
import { etiquetaTipo, IconoResultado, Resaltado, type TipoResultado } from './Resaltado';
import { cn } from '../../utils/cn';
import { t } from '../../i18n';

// ============================================================================
// LA PALETA DE BÚSQUEDA RÁPIDA — ⌘K y ⌘P (2026-10-06, #15)
// ============================================================================
// Escribes, flechas, Intro, y estás en esa página, base de datos, carpeta o
// persona. Vacía enseña tus recientes. Es la puerta rápida: para filtrar por
// autor, fecha o carpeta está «Ver todos los resultados» (`/busqueda`).
//
// ⌘P se roba a «Imprimir» del navegador a propósito (lo pidió Eugenio, y es lo
// que hace Notion): quien quiera imprimir la página tiene el menú del
// navegador. Solo con sesión iniciada: sin ella no hay nada que buscar.
// Con el foco en un campo de texto también vale: ⌘K no es una letra.

type Item = { tipo: TipoResultado; id: string; titulo: string; icono: string | null; ruta: string; autor?: string | null; carpeta?: string | null; fragmento?: string | null };

export default function PaletaBusqueda() {
  const { user } = useAuth();
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();
  const { recientes } = useEspacio();
  const entrada = useRef<HTMLInputElement | null>(null);
  const lista = useRef<HTMLDivElement | null>(null);
  const hay = !!user;

  useEffect(() => {
    if (!hay) return;
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setAbierta(a => !a);
      }
    };
    const abrir = () => setAbierta(true);
    window.addEventListener('keydown', tecla);
    window.addEventListener('humanity:paleta', abrir);
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('humanity:paleta', abrir); };
  }, [hay]);

  useEffect(() => { if (abierta) { setQ(''); setSel(0); setFallo(false); setTimeout(() => entrada.current?.focus(), 0); } }, [abierta]);

  // Con lo escrito, a la búsqueda (con un respiro de 150 ms para no preguntar por cada letra).
  useEffect(() => {
    if (!abierta) return;
    const t = q.trim();
    if (!t) { setItems([]); setCargando(false); return; }
    setCargando(true);
    const ctl = new AbortController();
    const espera = setTimeout(() => {
      fetch(`/api/espacio/buscar?limite=8&q=${encodeURIComponent(t)}`, { credentials: 'include', signal: ctl.signal })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then(j => { setItems(j.resultados || []); setFallo(false); setSel(0); })
        .catch(e => { if (e.name !== 'AbortError') setFallo(true); })
        .finally(() => { if (!ctl.signal.aborted) setCargando(false); });
    }, 150);
    return () => { clearTimeout(espera); ctl.abort(); };
  }, [q, abierta]);

  const mostrados: Item[] = q.trim() ? items : recientes.map(r => ({ tipo: (r.tipo === 'bd' ? 'bd' : r.tipo) as TipoResultado, id: r.id, titulo: r.titulo, icono: r.icono, ruta: r.ruta }));
  useEffect(() => { lista.current?.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  if (!hay || !abierta) return null;
  const ir = (ruta: string) => { setAbierta(false); navigate(ruta); };
  const verTodos = () => ir(`/busqueda${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setAbierta(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, Math.max(mostrados.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey || !mostrados[sel]) verTodos(); else ir(mostrados[sel].ruta);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-900/40 px-3 pt-[12vh]" onMouseDown={e => { if (e.target === e.currentTarget) setAbierta(false); }}>
      <div role="dialog" aria-modal="true" aria-label={t('Buscar')} onKeyDown={teclado}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input ref={entrada} value={q} onChange={e => setQ(e.target.value)} autoComplete="off" spellCheck={false}
            placeholder={t('Busca una página, base de datos, carpeta o persona…')} aria-label={t('Buscar')}
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400" />
          {cargando && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        <div ref={lista} className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
          {!q.trim() && mostrados.length > 0 && <p className="flex items-center gap-1 px-2.5 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><Clock className="h-3 w-3" /> {t('Recientes')}</p>}
          {!q.trim() && mostrados.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-slate-500">{t('Escribe para buscar. Aquí saldrán también lo último que abras.')}</p>}
          {q.trim() && !cargando && !fallo && mostrados.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-slate-500">{t('No hay nada que coincida con «{q}».', { q: q.trim() })}</p>}
          {fallo && <p role="alert" className="px-3 py-6 text-center text-[13px] font-bold text-rose-600">{t('La búsqueda ha fallado. Prueba otra vez.')}</p>}
          {mostrados.map((it, i) => (
            <button key={`${it.tipo}:${it.id}`} type="button" role="option" aria-selected={i === sel} data-sel={i === sel}
              onMouseEnter={() => setSel(i)} onClick={() => ir(it.ruta)}
              className={cn('flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left', i === sel ? 'bg-slate-100' : 'hover:bg-slate-50')}>
              <span className="mt-0.5"><IconoResultado tipo={it.tipo} icono={it.icono} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-bold text-slate-900">{it.titulo}</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">{etiquetaTipo(it.tipo)}</span>
                </span>
                {it.fragmento && <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-slate-500"><Resaltado texto={it.fragmento} /></span>}
              </span>
              {i === sel && <CornerDownLeft className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          <span><kbd className="font-bold">↑↓</kbd> {t('moverte')} · <kbd className="font-bold">{t('Intro')}</kbd> {t('abrir')} · <kbd className="font-bold">Esc</kbd> {t('cerrar')}</span>
          <button type="button" onClick={verTodos} className="font-bold text-emerald-700 hover:underline">{q.trim() ? t('Ver todos los resultados') : t('Ver todos los resultados y filtros')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
