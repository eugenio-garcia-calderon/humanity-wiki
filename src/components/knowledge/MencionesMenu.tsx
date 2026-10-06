import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, FileText, Plus, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { aIso, fechaLarga, mdFecha, mdPagina, mdPersona, parsearFecha, sumarDias } from '../../utils/menciones';

// ============================================================================
// EL SELECTOR DE «@» Y DE «[[» (2026-10-06, carril editorB, #6)
// ============================================================================
// Al escribir «@» se ofrece, como en Notion: personas, páginas tuyas y fechas
// («hoy», «mañana», un calendario). «[[» ofrece sólo páginas, y si no existe la
// que escribes, crearla. Lo que se elige se devuelve como el markdown de la
// mención (`utils/menciones.ts`); quien lo abre lo escribe en el texto.
//
// El teclado se atiende desde la ventana, en la fase de captura: el foco sigue
// en el texto que se está escribiendo (no hay campo de búsqueda propio; lo que
// escribes tras «@» ES la búsqueda) y las flechas, Intro, Tab y Escape no
// deben llegar al editor mientras el selector está abierto.

type Item =
  | { clase: 'fecha'; id: string; titulo: string; ayuda: string; md: string }
  | { clase: 'calendario'; id: 'cal'; titulo: string; ayuda: string }
  | { clase: 'persona'; id: string; titulo: string; ayuda?: string; foto?: string | null; md: string }
  | { clase: 'pagina'; id: string; titulo: string; ayuda?: string; icono?: string | null; md: string }
  | { clase: 'nueva'; id: 'nueva'; titulo: string; ayuda: string };

const SECCION: Record<string, string> = { fecha: 'Fechas', calendario: 'Fechas', persona: 'Personas', pagina: 'Páginas', nueva: 'Páginas' };

export default function MencionesMenu({ x, y, tipo, q, onElegir, onCerrar }: {
  x: number; y: number; tipo: '@' | '[['; q: string;
  onElegir: (md: string) => void;
  onCerrar: () => void;
}) {
  const [datos, setDatos] = useState<{ personas: any[]; paginas: any[] }>({ personas: [], paginas: [] });
  const [cargando, setCargando] = useState(true);
  const [elegido, setElegido] = useState(0);
  const [calendario, setCalendario] = useState(false);
  const [creando, setCreando] = useState(false);

  // Se pregunta al servidor un instante después de la última tecla.
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    const t = setTimeout(() => {
      fetch(`/api/menciones/buscar?q=${encodeURIComponent(q.trim())}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : { personas: [], paginas: [] })
        .catch(() => ({ personas: [], paginas: [] }))
        .then(j => { if (vivo) { setDatos({ personas: j.personas || [], paginas: j.paginas || [] }); setCargando(false); } });
    }, 140);
    return () => { vivo = false; clearTimeout(t); };
  }, [q]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const t = q.trim().toLowerCase();
    if (tipo === '@') {
      const dias: [string, number, string][] = [['Hoy', 0, 'hoy'], ['Mañana', 1, 'manana mañana'], ['Ayer', -1, 'ayer']];
      for (const [nombre, d, claves] of dias) {
        if (t && !claves.split(' ').some(c => c.startsWith(t.normalize('NFD').replace(/[̀-ͯ]/g, '')) || c.startsWith(t))) continue;
        const iso = sumarDias(d);
        out.push({ clase: 'fecha', id: iso, titulo: nombre, ayuda: fechaLarga(iso), md: mdFecha(iso) });
      }
      const escrita = t ? parsearFecha(t) : null;
      if (escrita) out.push({ clase: 'fecha', id: escrita, titulo: fechaLarga(escrita), ayuda: 'Fecha', md: mdFecha(escrita) });
      if (!t || 'fecha calendario elegir'.includes(t)) out.push({ clase: 'calendario', id: 'cal', titulo: 'Elegir fecha…', ayuda: 'Abre un calendario' });
      for (const p of datos.personas) out.push({ clase: 'persona', id: p.id, titulo: p.nombre || 'Persona', foto: p.foto, md: mdPersona(p.id, p.nombre || 'persona') });
    }
    for (const p of datos.paginas) out.push({ clase: 'pagina', id: p.id, titulo: p.titulo || 'Sin título', icono: p.icono, md: mdPagina(p.id, p.titulo || 'Sin título') });
    if (tipo === '[[' && q.trim()) out.push({ clase: 'nueva', id: 'nueva', titulo: `Crear «${q.trim()}»`, ayuda: 'Una página nueva' });
    return out;
  }, [q, tipo, datos]);

  useEffect(() => { setElegido(0); }, [q, datos]);
  // Sin nada que ofrecer y ya cargado: el selector se retira solo (es lo que
  // hace falta si «@» era sólo una arroba).
  useEffect(() => { if (!cargando && !items.length && !calendario) onCerrar(); }, [cargando, items.length, calendario, onCerrar]);

  const crearPagina = async () => {
    const titulo = q.trim();
    if (!titulo || creando) return;
    setCreando(true);
    try {
      const r = await fetch('/api/documentos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) { window.dispatchEvent(new CustomEvent('humanity:menu-cambiado')); onElegir(mdPagina(j.id, titulo)); return; }
    } catch { /* cae al cierre */ }
    setCreando(false);
    onCerrar();
  };

  const elegir = (it: Item | undefined) => {
    if (!it) return;
    if (it.clase === 'calendario') { setCalendario(true); return; }
    if (it.clase === 'nueva') { crearPagina(); return; }
    onElegir(it.md);
  };

  // El teclado, desde la ventana y antes que el editor.
  const ref = useRef({ items, elegido, calendario });
  ref.current = { items, elegido, calendario };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const { items, elegido, calendario } = ref.current;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); return; }
      if (calendario) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault(); e.stopPropagation();
        setElegido(i => (i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length);
      } else if ((e.key === 'Enter' || e.key === 'Tab') && items.length) {
        e.preventDefault(); e.stopPropagation();
        elegir(items[Math.min(elegido, items.length - 1)]);
      }
    };
    const fuera = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.('[data-menu-mencion]')) onCerrar(); };
    window.addEventListener('keydown', tecla, true);
    window.addEventListener('mousedown', fuera, true);
    return () => { window.removeEventListener('keydown', tecla, true); window.removeEventListener('mousedown', fuera, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El elegido se mantiene a la vista al recorrer con las flechas.
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => { lista.current?.querySelector('[data-elegido="true"]')?.scrollIntoView({ block: 'nearest' }); }, [elegido]);

  const ancho = 288;
  const izq = Math.max(8, Math.min(x, window.innerWidth - ancho - 8));
  const abajo = y + 6;
  const cabe = window.innerHeight - abajo > 280;
  const estilo: React.CSSProperties = cabe ? { left: izq, top: abajo } : { left: izq, bottom: window.innerHeight - y + 24 };

  let seccionPrevia = '';
  return createPortal(
    <div data-menu-mencion role="listbox" aria-label={tipo === '@' ? 'Mencionar' : 'Enlazar una página'} style={{ ...estilo, width: ancho }}
      className="fixed z-[120] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
      onMouseDown={e => e.preventDefault() /* el foco se queda en el texto */}>
      {calendario ? (
        <Calendario onElegir={iso => onElegir(mdFecha(iso))} onVolver={() => setCalendario(false)} />
      ) : (
        <div ref={lista} className="max-h-72 overflow-y-auto py-1">
          {items.map((it, i) => {
            const sec = SECCION[it.clase];
            const cab = sec !== seccionPrevia ? (seccionPrevia = sec) : null;
            return (
              <div key={`${it.clase}-${it.id}`}>
                {cab && <p className="px-3 pt-2 pb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">{cab}</p>}
                <button type="button" role="option" aria-selected={i === elegido} data-elegido={i === elegido}
                  onMouseEnter={() => setElegido(i)} onClick={() => elegir(it)}
                  className={cn('w-full min-h-11 flex items-center gap-2.5 px-3 text-left', i === elegido ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                  <Icono it={it} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{it.titulo}</span>
                    {it.ayuda && <span className="block text-[11px] text-slate-400 truncate">{it.ayuda}</span>}
                  </span>
                </button>
              </div>
            );
          })}
          {cargando && !items.length && <p className="px-3 py-3 text-xs text-slate-400">Buscando…</p>}
        </div>
      )}
    </div>,
    document.body,
  );
}

function Icono({ it }: { it: Item }) {
  const caja = 'w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-slate-100 text-slate-500 overflow-hidden';
  if (it.clase === 'persona') {
    return it.foto
      ? <span className={caja}><img src={it.foto} alt="" className="w-full h-full object-cover" /></span>
      : <span className={caja}><User className="w-4 h-4" /></span>;
  }
  if (it.clase === 'pagina') return <span className={caja}>{it.icono && it.icono.length <= 4 ? <span className="text-sm">{it.icono}</span> : <FileText className="w-4 h-4" />}</span>;
  if (it.clase === 'nueva') return <span className={caja}><Plus className="w-4 h-4" /></span>;
  return <span className={caja}><Calendar className="w-4 h-4" /></span>;
}

const MES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Un calendario de mes, de lunes a domingo. */
export function Calendario({ onElegir, onVolver }: { onElegir: (iso: string) => void; onVolver?: () => void }) {
  const hoy = new Date();
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const primero = (mes.getDay() + 6) % 7;                       // lunes = 0
  const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas: (number | null)[] = [...Array(primero).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  const iso = (d: number) => aIso(new Date(mes.getFullYear(), mes.getMonth(), d));
  const hoyIso = aIso(hoy);
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" aria-label="Mes anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-bold text-slate-800 capitalize">{MES_LARGO[mes.getMonth()]} {mes.getFullYear()}</span>
        <button type="button" aria-label="Mes siguiente" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {celdas.map((d, i) => d === null ? <span key={`v${i}`} /> : (
          <button key={d} type="button" onClick={() => onElegir(iso(d))} data-dia={iso(d)}
            className={cn('h-9 rounded-lg text-sm hover:bg-slate-100', iso(d) === hoyIso ? 'bg-emerald-600 text-white font-bold hover:bg-emerald-700' : 'text-slate-700')}>{d}</button>
        ))}
      </div>
      {onVolver && <button type="button" onClick={onVolver} className="mt-2 w-full h-9 text-xs font-bold text-slate-500 hover:text-slate-800">Volver</button>}
    </div>
  );
}
