// ============================================================================
// AGRICULTURA SINTRÓPICA · THE BASE-PATTERN MENU (2026-11-25)
// ============================================================================
// Eugenio: «permite modificar el patrón base de manera sencilla con un menú
// entero solo para ese patrón base». Everything that changes the module that is
// repeated over the plot lives here, next to the module drawn large:
//   start from a template or from the key alone · size and spacing · add a
//   number, a ring around the key, mirror east–west / north–south · edit the
//   selected position by typing its metres · the list of every position.
// Positions are stored as drawn (`huecosBase`); what is shown is what gets
// planted (`huecosDe`, with the spacing factor applied).

import { useState } from 'react';
import { Copy, FlipHorizontal2, FlipVertical2, Magnet, Plus, RotateCcw, Trash2, CircleDot, Eraser } from 'lucide-react';
import { Button } from '../ui/core';
import { Deslizador } from '../ui/Deslizador';
import { cn } from '../../utils/cn';
import { DISENOS, NOMBRE_ROL, diseno, etiquetasDe, rol, type Hueco } from './disenos';
import { ESPECIE } from './especies';
import { aBase, distancias, huecosBase, huecosDe, type Parametros } from './modelo';
import { COLOR_ROL } from './paleta';

const ETIQUETAS = ['1', '2', '2a', '2b', '2c', '2d', '3', '3a', '3b', '3c', '3d', '4', '4a', '4b', '4c', '5', '5a', '5b', '5c'];
const num = (v: number, d = 2) => v.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });
const sel = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200';
const btn = 'border-slate-700 text-slate-200 hover:bg-slate-800';
const limitar = (x: number) => Math.max(-0.5, Math.min(0.4999, x));

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="space-y-2.5 rounded-xl border border-slate-800 p-3"><h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{titulo}</h3>{children}</section>;
}
const Numero = ({ e }: { e: string }) => (
  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold text-slate-900" style={{ background: COLOR_ROL[rol(e)] }}>{e}</span>
);

export default function PanelPatron({ p, setP, seleccion, setSeleccion, copas, setCopas, rejilla, setRejilla, onPlantilla, onFicha }: {
  p: Parametros; setP: React.Dispatch<React.SetStateAction<Parametros>>;
  seleccion: number | null; setSeleccion: (i: number | null) => void;
  copas: boolean; setCopas: (v: boolean) => void;
  rejilla: number; setRejilla: (v: number) => void;
  onPlantilla: (id: string) => void; onFicha: (id: string) => void;
}) {
  const [nuevo, setNuevo] = useState('3');
  const [anillo, setAnillo] = useState({ etiqueta: '4', n: 6, radio: 1.5 });
  const W = p.modAncho, H = p.modLargo, d = diseno(p.diseno);
  const huecos = huecosDe(p), etiquetas = etiquetasDe(huecos), esp = distancias(p);
  const clave = huecos.find(h => rol(h.etiqueta) === 1);
  const h = seleccion != null ? huecos[seleccion] : null;
  const aClave = (x: Hueco) => clave ? Math.hypot((x.u - clave.u) * W, (x.v - clave.v) * H) : 0;

  /** Change the stored (drawn) positions. */
  const editar = (f: (base: Hueco[], prev: Parametros) => Hueco[]) => setP(prev => {
    const huecosNuevos = f([...huecosBase(prev)], prev);
    const asign = { ...prev.asign };
    for (const x of huecosNuevos) if (!asign[x.etiqueta]) asign[x.etiqueta] = [];
    return { ...prev, huecos: huecosNuevos, asign };
  });
  const fijar = <K extends keyof Parametros>(k: K, v: Parametros[K]) => setP(prev => ({ ...prev, [k]: v }));
  const libre = (): { u: number; v: number } => {
    // the first point of a coarse grid that is not on top of another position
    for (let r = 0.18; r < 0.5; r += 0.08) for (let a = 0; a < 12; a++) {
      const u = (clave?.u ?? 0) + r * Math.cos((a / 12) * Math.PI * 2), v = (clave?.v ?? 0) + r * Math.sin((a / 12) * Math.PI * 2);
      if (Math.abs(u) < 0.5 && Math.abs(v) < 0.5 && !huecos.some(x => Math.hypot((x.u - u) * W, (x.v - v) * H) < 0.5)) return { u, v };
    }
    return { u: 0.3, v: 0.3 };
  };
  const espejo = (eje: 'u' | 'v') => editar(base => {
    const c = clave ? clave[eje] : 0, out = [...base];
    for (const x of base) {
      if (rol(x.etiqueta) === 1 || Math.abs(x[eje] - c) < 0.02) continue;
      const m = { ...x, [eje]: limitar(2 * c - x[eje]) };
      if (!out.some(y => y.etiqueta === x.etiqueta && Math.hypot((y.u - m.u) * W, (y.v - m.v) * H) < 0.15)) out.push(m);
    }
    return out;
  });
  const ponerAnillo = () => editar(base => {
    const c = clave ?? { u: 0, v: 0 }, out = [...base];
    for (let i = 0; i < anillo.n; i++) {
      const a = Math.PI / 2 + (i / anillo.n) * Math.PI * 2;
      out.push({ u: limitar(c.u + (anillo.radio * Math.cos(a)) / W), v: limitar(c.v + (anillo.radio * Math.sin(a)) / H), etiqueta: anillo.etiqueta });
    }
    return out;
  });
  const mover = (i: number, xm: number, ym: number) => setP(prev => {
    const b = [...huecosBase(prev)]; const q = aBase(prev, i, limitar(xm / prev.modAncho - 0.5), limitar(ym / prev.modLargo - 0.5));
    b[i] = { ...b[i], ...q }; return { ...prev, huecos: b };
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white">Patrón base</h2>
        <p className="text-[11px] leading-relaxed text-slate-400">El módulo que se repite en toda la parcela. Toca un número en el dibujo para seleccionarlo y arrástralo, o escribe aquí su posición. Cada cambio se ve al momento en la parcela, la simulación y los planos.</p>
      </div>

      <Bloque titulo="Empezar desde">
        <select className={sel} value={p.huecos ? '' : p.diseno} onChange={e => { if (e.target.value) { onPlantilla(e.target.value); setSeleccion(null); } }}>
          {p.huecos && <option value="">Patrón propio (modificado)</option>}
          {DISENOS.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
        <div className="flex gap-2">
          <Button variant="outline" className={cn('flex-1 px-2 text-[10px]', btn)} onClick={() => { editar(() => [{ u: 0, v: 0, etiqueta: '1' }]); setSeleccion(0); }}><Eraser size={13} className="mr-1" />Solo la clave</Button>
          <Button variant="outline" className={cn('flex-1 px-2 text-[10px]', btn)} onClick={() => { setP(prev => ({ ...prev, huecos: null, separacion: 1, marcoDenso: diseno(prev.diseno).marco?.defecto ?? 1 })); setSeleccion(null); }}><RotateCcw size={13} className="mr-1" />Restaurar</Button>
        </div>
      </Bloque>

      <Bloque titulo="Tamaño y espacio entre plantas">
        <Deslizador etiqueta="Módulo este–oeste" valor={W} min={2} max={20} paso={0.25} unidad="m" onChange={v => fijar('modAncho', v)} />
        <Deslizador etiqueta="Módulo norte–sur" valor={H} min={2} max={20} paso={0.25} unidad="m" onChange={v => fijar('modLargo', v)} />
        <Deslizador etiqueta="Auxiliares respecto a la clave" valor={Math.round(p.separacion * 100)} min={40} max={160} paso={5} unidad="%" onChange={v => fijar('separacion', v / 100)} />
        {d.marco && !p.huecos && <Deslizador etiqueta={d.marco.etiqueta} valor={p.marcoDenso} min={d.marco.min} max={d.marco.max} paso={0.05} unidad="m" onChange={v => fijar('marcoDenso', v)} />}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            ['Entre claves', esp.claveX != null || esp.claveY != null ? `${esp.claveX != null ? num(esp.claveX, 1) : '—'} × ${esp.claveY != null ? num(esp.claveY, 1) : '—'} m` : '—'],
            ['Auxiliar más cercana a la clave', esp.auxClave != null ? `${num(esp.auxClave)} m` : '—'],
            ['Las dos plantas más juntas', esp.minima != null ? `${num(esp.minima)} m` : '—'],
          ].map(([a, b]) => <div key={a} className="rounded-lg bg-slate-800/60 p-1.5"><div className="font-mono text-xs font-bold text-emerald-300">{b}</div><div className="text-[9px] leading-tight text-slate-400">{a}</div></div>)}
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">El módulo fija la distancia entre árboles clave; el porcentaje acerca o aleja todas las auxiliares de su clave sin mover la clave.</p>
      </Bloque>

      <Bloque titulo="Herramientas">
        <div className="flex items-end gap-2">
          <label className="flex-1 text-[11px] text-slate-400">Añadir un puesto número
            <select className={sel} value={nuevo} onChange={e => setNuevo(e.target.value)}>{ETIQUETAS.map(x => <option key={x} value={x}>{x} · {NOMBRE_ROL[rol(x)]}</option>)}</select>
          </label>
          <Button className="px-3" onClick={() => { const q = libre(); editar(b => [...b, { ...q, etiqueta: nuevo }]); setSeleccion(huecos.length); }}><Plus size={14} /></Button>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-2">
          <div className="mb-1 text-[11px] text-slate-400">Anillo alrededor de la clave</div>
          <div className="grid grid-cols-3 gap-1.5">
            <select className={sel} value={anillo.etiqueta} onChange={e => setAnillo(a => ({ ...a, etiqueta: e.target.value }))}>{ETIQUETAS.filter(x => x !== '1').map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select className={sel} value={anillo.n} onChange={e => setAnillo(a => ({ ...a, n: Number(e.target.value) }))}>{[3, 4, 5, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} plantas</option>)}</select>
            <select className={sel} value={anillo.radio} onChange={e => setAnillo(a => ({ ...a, radio: Number(e.target.value) }))}>{[0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5].map(r => <option key={r} value={r}>a {num(r)} m</option>)}</select>
          </div>
          <Button variant="outline" className={cn('mt-1.5 w-full text-[10px]', btn)} onClick={ponerAnillo}><CircleDot size={13} className="mr-1" />Añadir anillo</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className={cn('px-2 text-[10px]', btn)} onClick={() => espejo('u')}><FlipHorizontal2 size={13} className="mr-1" />Simetría este–oeste</Button>
          <Button variant="outline" className={cn('px-2 text-[10px]', btn)} onClick={() => espejo('v')}><FlipVertical2 size={13} className="mr-1" />Simetría norte–sur</Button>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-300">
          <Magnet size={13} className="text-slate-400" />Al arrastrar, ajustar a
          <select className="rounded-lg border border-slate-700 bg-slate-800 px-1.5 py-1 text-[11px] text-slate-200" value={rejilla} onChange={e => setRejilla(Number(e.target.value))}>
            <option value={0}>libre</option>{[0.1, 0.25, 0.5, 1].map(r => <option key={r} value={r}>cada {num(r)} m</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" className="accent-emerald-500" checked={copas} onChange={e => setCopas(e.target.checked)} />Ver las copas adultas</label>
      </Bloque>

      {h && seleccion != null && (
        <Bloque titulo="Puesto seleccionado">
          <div className="flex items-center gap-2">
            <Numero e={h.etiqueta} />
            <span className="flex-1 text-[11px] text-slate-300">{(p.asign[h.etiqueta] ?? []).map(id => ESPECIE[id]?.nombre).filter(Boolean).join(', ') || 'sin especie'}</span>
          </div>
          <label className="block text-[11px] text-slate-400">Número
            <select className={sel} value={h.etiqueta} onChange={e => editar(b => { b[seleccion] = { ...b[seleccion], etiqueta: e.target.value }; return b; })}>
              {[...new Set([...etiquetas, ...ETIQUETAS])].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).map(x => <option key={x} value={x}>{x} · {NOMBRE_ROL[rol(x)]}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([['x', 'Desde el borde oeste', (h.u + 0.5) * W, W], ['y', 'Desde el borde sur', (h.v + 0.5) * H, H]] as const).map(([k, t, val, max]) => (
              <label key={k} className="text-[11px] text-slate-400">{t} (m)
                <input type="number" step={0.05} min={0} max={max} value={Number(val.toFixed(2))} className={sel}
                  onChange={e => { const n = Number(e.target.value); if (!Number.isFinite(n)) return; k === 'x' ? mover(seleccion, n, (h.v + 0.5) * H) : mover(seleccion, (h.u + 0.5) * W, n); }} />
              </label>
            ))}
          </div>
          {rol(h.etiqueta) !== 1 && <p className="text-[11px] text-slate-400">A <b className="font-mono text-emerald-300">{num(aClave(h))} m</b> de la clave.</p>}
          <div className="grid grid-cols-3 gap-1.5">
            <Button variant="outline" className={cn('px-1 text-[10px]', btn)} onClick={() => { const q = libre(); editar(b => [...b, { ...b[seleccion], ...q }]); setSeleccion(huecos.length); }}><Copy size={12} className="mr-1" />Duplicar</Button>
            <Button variant="outline" className={cn('px-1 text-[10px]', btn)} onClick={() => editar(b => [...b, { ...b[seleccion], u: limitar(2 * (clave?.u ?? 0) - b[seleccion].u) }])}><FlipHorizontal2 size={12} className="mr-1" />Reflejar</Button>
            <Button variant="outline" className={cn('px-1 text-[10px]', btn)} onClick={() => { editar(b => b.filter((_, i) => i !== seleccion)); setSeleccion(null); }}><Trash2 size={12} className="mr-1" />Quitar</Button>
          </div>
          {(p.asign[h.etiqueta] ?? []).map(id => ESPECIE[id] && <Button key={id} variant="ghost" className="mr-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-300 hover:bg-slate-700" onClick={() => onFicha(id)}>Ficha: {ESPECIE[id].nombre}</Button>)}
          <p className="text-[10px] text-slate-500">Las especies de cada número se eligen en la pestaña Diseño.</p>
        </Bloque>
      )}

      <Bloque titulo={`Puestos (${huecos.length})`}>
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="text-slate-500"><th className="text-left font-normal">N.º</th><th className="text-left font-normal">Especie</th><th className="text-right font-normal">x</th><th className="text-right font-normal">y</th><th className="text-right font-normal">a la clave</th></tr></thead>
            <tbody>
              {huecos.map((x, i) => (
                <tr key={i} onClick={() => setSeleccion(i)} className={cn('cursor-pointer border-t border-slate-800 text-slate-300 hover:bg-slate-800/60', seleccion === i && 'bg-emerald-500/10')}>
                  <td className="py-1"><Numero e={x.etiqueta} /></td>
                  <td className="max-w-[7rem] truncate">{(p.asign[x.etiqueta] ?? []).map(id => ESPECIE[id]?.nombre).filter(Boolean).join(', ') || '—'}</td>
                  <td className="text-right font-mono">{num((x.u + 0.5) * W)}</td>
                  <td className="text-right font-mono">{num((x.v + 0.5) * H)}</td>
                  <td className="text-right font-mono text-emerald-300">{rol(x.etiqueta) === 1 ? '—' : num(aClave(x))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloque>
    </div>
  );
}
