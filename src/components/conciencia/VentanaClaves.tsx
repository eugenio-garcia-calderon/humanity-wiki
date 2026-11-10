// «5 claves para comunicar mejor» (2026-11-10, Eugenio: «añade 5 tips para
// mejorar la comunicación de cada una de las 3 formas, de forma plegada, que se
// pinche y sea pop up»).
//
// On the map each lane has a folded chip (a node of shape «consejos»). Tapping
// it while exploring opens this window with its list. The list is map data
// (`Nodo.consejos`), so it is edited in the side panel like any other text.
import { useEffect } from 'react';
import { X, Lightbulb, Play } from 'lucide-react';
import type { Canal, MapaConciencia, Nodo } from '../../data/concienciaMapa';
import { colorSeguro, medir } from './geometria';
import { BotonOscuro } from './botones';

/** The lane a chip sits in: the «franja» whose rectangle contains it. */
export function franjaDe(mapa: MapaConciencia, n: Nodo): Nodo | null {
  return mapa.nodos.find(f => {
    if (f.forma !== 'franja') return false;
    const m = medir(f);
    return Math.abs(n.x - f.x) <= m.w / 2 && Math.abs(n.y - f.y) <= m.h / 2;
  }) ?? null;
}

const CANAL_DE_FRANJA: Record<string, Canal> = { 'franja-vigilia': 'vigilia', 'franja-onirico': 'onirico', 'franja-meditacion': 'meditacion' };

export function VentanaClaves({ mapa, id, onCerrar, onAnimar }: {
  mapa: MapaConciencia; id: string; onCerrar(): void; onAnimar?(c: Canal): void;
}) {
  const n = mapa.nodos.find(x => x.id === id);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  if (!n) return null;
  const franja = franjaDe(mapa, n);
  const canal = franja ? CANAL_DE_FRANJA[franja.id] : undefined;
  const color = colorSeguro(n.color);
  const lista = (n.consejos ?? []).map(c => c.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog" aria-label={`${n.titulo}${franja ? ` · ${franja.titulo}` : ''}`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 p-6 text-slate-100 shadow-2xl sm:rounded-3xl"
        style={{ boxShadow: `0 0 80px ${color}22` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
              <Lightbulb className="h-5 w-5 text-slate-950" />
            </span>
            <div>
              {franja && (
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color }}>
                  {franja.titulo}{franja.subtitulo ? ` · ${franja.subtitulo}` : ''}
                </p>
              )}
              <h3 className="text-xl text-white" style={{ fontFamily: '"Cinzel", Georgia, serif' }}>{n.titulo}</h3>
            </div>
          </div>
          <BotonOscuro onClick={onCerrar} aria-label="Cerrar"><X className="h-4 w-4" /></BotonOscuro>
        </div>

        {lista.length ? (
          <ol className="space-y-3">
            {lista.map((c, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-slate-950" style={{ backgroundColor: color }}>{i + 1}</span>
                <p className="text-sm leading-relaxed text-slate-200">{c}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-400">Todavía no hay claves. Pulsa «Editar mapa», elige este botón y escríbelas, una por línea.</p>
        )}

        {canal && onAnimar && (
          <BotonOscuro onClick={() => { onCerrar(); onAnimar(canal); }} className="mt-5 px-3 py-2 text-sm" style={{ color }}>
            <Play className="h-4 w-4" /> Ver cómo funciona este camino
          </BotonOscuro>
        )}
      </div>
    </div>
  );
}
