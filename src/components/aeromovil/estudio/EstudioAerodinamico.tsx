import { useState } from 'react';
import { AlertTriangle, ChevronDown, FlaskConical, Wind } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { Parametros } from '../geometria';
import { probarParametros } from '../tunel/cliente';
import type { Resolucion } from '../tunel/malla';
import { Bloque } from '../controles';
import { NOMBRE_ZONA, RUIDO } from './reglas';
import { claveEstudio, hacerEstudio, type Estudio, type Pega } from './estudio';

/**
 * «Aerodinámica», inside «Carrocería» (2026-11-17, Eugenio: «mete la parte de aerodinámica dentro de carrocería…
 * con un botón que diga "hacer estudio aerodinámico" y te saque pegas al diseño actual y te haga recomendaciones»).
 * The wind tunnel opens from here as from the 3D view's button, and the study lists the weak points of THIS design with
 * what to change; the gains come from the tunnel run again on a copy of the design (estudio.ts), or say they are estimates.
 */
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${fmt(v * 100, v < 0.1 ? 1 : 0)} %`;
const COLOR: Record<Pega['gravedadFinal'], string> = { alta: 'bg-red-100 text-red-800', media: 'bg-amber-100 text-amber-800', baja: 'bg-slate-100 text-slate-700' };
const NOMBRE_GRAVEDAD: Record<Pega['gravedadFinal'], string> = { alta: 'importante', media: 'media', baja: 'leve' };

export function BloqueAerodinamica({ P, set, kmh, resolucion, tunel, alTunel }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void;
  kmh: number; resolucion: Resolucion; tunel: boolean; alTunel: () => void;
}) {
  const [estudio, setEstudio] = useState<Estudio | null>(null);
  const [avance, setAvance] = useState<[number, number] | null>(null);
  const [error, setError] = useState(false);
  const [verDescartadas, setVerDescartadas] = useState(false);
  const calculando = avance != null;
  const viejo = !!estudio && estudio.clave !== claveEstudio(P);

  const estudiar = async () => {
    setError(false); setAvance([0, 0]);
    try {
      const e = await hacerEstudio(P, async Q => { const r = await probarParametros(Q, resolucion); return r ? { R: r.R, A: r.A } : null; }, kmh, (h, t) => setAvance([h, t]));
      if (e) setEstudio(e); else setError(true);
    } catch (err) { console.error('[estudio aerodinámico]', err); setError(true); }
    setAvance(null);
  };
  const aplicar = (p: Pega) => { for (const [k, v] of Object.entries(p.elegida?.prueba.cambios ?? {})) set(k as keyof Parametros, v as never); };

  const activas = estudio?.pegas.filter(p => p.estado !== 'descartado') ?? [], descartadas = estudio?.pegas.filter(p => p.estado === 'descartado') ?? [];
  const q = estudio?.base.q;
  return (
    <Bloque titulo="Aerodinámica" nota={estudio ? `Cd ${fmt(estudio.base.cd, 3)} · CdA ${fmt(estudio.base.cdA, 3)} m²` : 'túnel de viento'}>
      <p className="text-xs text-slate-600">El túnel de viento calcula el aire alrededor de este diseño; el estudio busca sus puntos débiles y prueba en una copia del diseño cada cambio que propone, para decir cuánto ganaría.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" aria-pressed={tunel} onClick={alTunel}
          className={cn('gap-1.5 bg-white px-3 py-2 text-[13px] font-semibold normal-case tracking-normal', tunel && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>
          <Wind className="h-4 w-4" />{tunel ? 'Cerrar el túnel de viento' : 'Abrir el túnel de viento'}
        </Button>
        <Button variant="primary" onClick={estudiar} disabled={calculando}
          className="gap-1.5 bg-teal-700 px-3 py-2 text-[13px] font-semibold normal-case tracking-normal text-white hover:bg-teal-800">
          <FlaskConical className="h-4 w-4" />{calculando ? 'Estudiando…' : estudio ? 'Repetir el estudio aerodinámico' : 'Hacer estudio aerodinámico'}
        </Button>
      </div>
      {calculando && (
        <p className="flex items-center gap-1.5 text-xs text-sky-800"><Wind className="h-3.5 w-3.5 animate-pulse" />
          {avance![1] ? `El túnel prueba los cambios: ${avance![0]} de ${avance![1]} (≈ medio segundo cada uno).` : 'El túnel calcula el diseño tal como está…'}
        </p>
      )}
      {error && <p className="text-xs text-red-700">El túnel no pudo calcular este diseño. Prueba otra vez o cambia la resolución en la tarjeta del túnel.</p>}
      {estudio && !calculando && (
        <div className="flex flex-col gap-2.5" aria-label="Resultado del estudio aerodinámico">
          {viejo && <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">El diseño ha cambiado desde este estudio: repítelo para ver las pegas de cómo está ahora.</p>}
          {q && (
            <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
              <p>A {q.kmh} km/h: Cd {fmt(q.cd.total, 3)} sobre {fmt(estudio.base.A)} m² → CdA {fmt(estudio.base.cdA, 3)} m². De dónde sale el Cd:</p>
              <Reparto partes={[['Rozamiento', q.cd.friccion], ['Forma', q.cd.forma], ['Estela', q.cd.estela], ['Ruedas', q.cd.ruedas], ['Detalles (fijo)', q.cd.detalles]]} total={q.cd.total} />
            </div>
          )}
          {activas.length === 0 && <p className="text-xs text-slate-600">El estudio no encuentra ningún cambio que el túnel vea mejor en este diseño.</p>}
          <ol className="flex flex-col gap-2">
            {activas.map(p => <TarjetaPega key={p.id} p={p} kmh={estudio.kmh} alAplicar={viejo ? undefined : () => aplicar(p)} />)}
          </ol>
          {descartadas.length > 0 && (
            <div>
              <Button variant="ghost" onClick={() => setVerDescartadas(v => !v)} aria-expanded={verDescartadas}
                className="w-full justify-between px-1 py-1 text-xs font-semibold normal-case tracking-normal text-slate-600">
                <span>Probado y descartado: el túnel no ve mejora ({descartadas.length})</span><ChevronDown className={cn('h-3.5 w-3.5 transition-transform', verDescartadas && 'rotate-180')} />
              </Button>
              {verDescartadas && (
                <ul className="mt-1 flex flex-col gap-1.5 text-xs text-slate-600">
                  {descartadas.map(p => (
                    <li key={p.id} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                      <span className="font-semibold text-slate-700">{p.titulo}.</span> Ya está en su mejor valor para este túnel (o la diferencia es menor del {pct(RUIDO)}, que el cálculo no distingue):{' '}
                      {p.probadas.map(x => `${x.prueba.texto} → ${x.dCdA == null ? 'sin resultado' : `${x.dCdA > 0 ? '+' : '−'}${pct(Math.abs(x.dCdA) / estudio.base.cdA)} de CdA`}`).join('; ')}.
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="text-[11px] leading-snug text-slate-500">
            «Calculado»: el túnel de esta página (método de paneles con capa límite, no CFD) sobre una copia del diseño con ese cambio, a la resolución {estudio.base.R.resolucion}; por debajo del {pct(RUIDO)} no distingue un cambio de su propio error. «Estimado»: lo que el túnel no ve (espejos, la forma de los carenados, el faldón), con cifras de la bibliografía (Hucho, Hoerner) o de su propia fórmula de ruedas. El kWh ahorrado es solo el del aire, a {estudio.kmh} km/h. Los cambios se prueban de uno en uno: juntos no siempre suman.
          </p>
        </div>
      )}
    </Bloque>
  );
}

function Reparto({ partes, total }: { partes: [string, number][]; total: number }) {
  return (
    <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5">
      {partes.map(([n, v]) => (
        <div key={n} className="contents">
          <dt>{n}</dt>
          <dd className="h-1.5 rounded bg-slate-200"><div className="h-1.5 rounded bg-sky-600" style={{ width: `${Math.max(1, Math.min(100, v / total * 100))}%` }} /></dd>
          <dd className="text-right font-mono tabular-nums">{fmt(v, 3)}</dd>
        </div>
      ))}
    </dl>
  );
}

function TarjetaPega({ p, kmh, alAplicar }: { p: Pega; kmh: number; alAplicar?: () => void }) {
  const ganancia = p.estado === 'calculado'
    ? `Calculado con el túnel: −${pct(p.fraccion ?? 0)} de CdA (−${fmt(Math.abs(p.dCdA ?? 0), 3)} m²), ${fmt(p.kWh100 ?? 0, 2)} kWh menos cada 100 km a ${kmh} km/h.`
    : p.estado === 'estimado' ? `Estimado, no calculado: ≈ −${pct(p.fraccion ?? 0)} de CdA (−${fmt(Math.abs(p.dCdA ?? 0), 3)} m², ≈ ${fmt(p.kWh100 ?? 0, 2)} kWh menos cada 100 km a ${kmh} km/h); ${p.estimacion?.fuente}.`
      : `Estimado, no calculado: el Cd real puede ser ≈ ${pct(p.fraccion ?? 0)} más alto; ${p.estimacion?.fuente}.`;
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-slate-200 p-2.5 text-xs">
      <div className="flex items-start gap-2">
        <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', COLOR[p.gravedadFinal])}>{NOMBRE_GRAVEDAD[p.gravedadFinal]}</span>
        <span className="flex-1 text-[13px] font-semibold leading-snug text-slate-900">{p.titulo}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">{NOMBRE_ZONA[p.zona]}</span>
      </div>
      <p className="text-slate-600">{p.porQue}</p>
      <p className="text-slate-800"><span className="font-semibold">Qué hacer:</span> {p.recomendacion}{p.deFondo ? ' (cambio de fondo)' : ''}</p>
      {p.elegida && <p className="text-slate-800"><span className="font-semibold">Cambio probado:</span> {p.elegida.prueba.texto}.</p>}
      <p className={cn('font-medium', p.estado === 'calculado' ? 'text-teal-800' : 'text-slate-700')}>{ganancia}</p>
      {p.elegida && p.elegida.rompe.length > 0 && (
        <p className="flex gap-1.5 text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Con este cambio deja de cumplir: {p.elegida.rompe.join('; ')}.</p>
      )}
      {p.elegida && alAplicar && (
        <Button variant="outline" onClick={alAplicar} className="self-start bg-white px-2 py-1 text-[11px] normal-case tracking-normal">Aplicar este cambio</Button>
      )}
    </li>
  );
}
