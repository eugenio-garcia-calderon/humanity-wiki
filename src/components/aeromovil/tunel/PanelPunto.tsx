import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, X } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { Parametros } from '../geometria';
import type { ResultadoTunel } from './calculo';
import type { CuerpoTunel } from './nuestro';
import type { Resolucion } from './malla';
import { probarParametros, type ResultadoPrueba } from './cliente';
import { explicar, type Frase, type Mejora } from './explicaciones';
import { porVelocidad, puntosDe, type TipoPunto } from './puntos';
import { CALIBRACION } from './calibracion';

/**
 * The explanation of one critical point of the tunnel, opened by clicking its
 * label in the 3D view or its row in the card (2026-11-09, Eugenio). It lives
 * inside the 3D view's <section>, so it also shows in full screen.
 *
 * «Probar» runs the tunnel on a modified COPY of our design's parameters (in the
 * Web Worker) and shows before → after. It never writes the parameters: nothing
 * changes in the editor and nothing is saved, whoever presses it.
 */

export interface SeleccionPunto { cuerpo: string; punto: string }

const RHO = 1.2;
const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const signo = (v: number, d = 2) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt(Math.abs(v), d)}`;
const PUNTO: Record<TipoPunto, string> = { remanso: 'bg-red-600', succion: 'bg-blue-700', adverso: 'bg-amber-600', separacion: 'bg-pink-700', estela: 'bg-violet-600', burbuja: 'bg-teal-700' };

function Origen({ o }: { o: Frase['origen'] }) {
  return o === 'calculo'
    ? <span className="ml-1 whitespace-nowrap rounded bg-sky-100 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wide text-sky-800" title="Sale de este túnel: método de paneles y capa límite, no CFD">calculado</span>
    : <span className="ml-1 whitespace-nowrap rounded bg-slate-100 px-1 py-px text-[9.5px] font-semibold uppercase tracking-wide text-slate-600" title="Conocimiento general de aerodinámica: no se ha calculado aquí">general</span>;
}

function Frases({ lista }: { lista: Frase[] }) {
  return <>{lista.map((f, i) => <p key={i} className="mt-1 text-[12px] leading-snug text-slate-700">{f.texto}<Origen o={f.origen} /></p>)}</>;
}

/** The figure each kind of point cares about, before and after a «Probar». */
function cifraPropia(tipo: TipoPunto, R: ResultadoTunel, kmh: number, zona: string | undefined): [string, number, string, number] | null {
  const q = porVelocidad(R, kmh);
  if (tipo === 'remanso') { const k = R.criticos.find(x => x.tipo === 'remanso'); return k ? ['altura del remanso', k.p[1], 'm', 2] : null; }
  if (tipo === 'succion') { const k = R.criticos.filter(x => x.tipo === 'succion' && x.zona === zona && x.p[0] >= q.xSeparacion - 0.02).sort((a, b) => a.cp - b.cp)[0]; return k ? ['succión más fuerte en esa zona, Cp', k.cp, '', 2] : null; }
  if (tipo === 'adverso') return ['empieza a frenarse, a', R.geometria.xMorro - q.advTecho, 'm del morro', 2];
  if (tipo === 'separacion' || tipo === 'burbuja') return ['área detrás de la separación', q.areaBase, 'm²', 3];
  return ['Cd de forma y estela', q.cd.forma + q.cd.estela, '', 3];
}

export function PanelPunto({ sel, cuerpos, resultados, kmh, resolucion, P, puedeDecidir, alCerrar, alElegir, className }: {
  sel: SeleccionPunto; cuerpos: CuerpoTunel[]; resultados: Record<string, ResultadoTunel | undefined>; kmh: number; resolucion: Resolucion;
  /** Our design's parameters (for «Probar»). */
  P?: Parametros; puedeDecidir: boolean;
  alCerrar: () => void; alElegir: (s: SeleccionPunto) => void; className?: string;
}) {
  const cuerpo = cuerpos.find(c => c.id === sel.cuerpo), R = resultados[sel.cuerpo];
  const puntos = useMemo(() => R ? puntosDe(R, kmh) : [], [R, kmh]);
  const punto = puntos.find(p => p.id === sel.punto) ?? (sel.punto.startsWith('succion') ? puntos.find(p => p.tipo === 'succion') : undefined);
  const nuestro = sel.cuerpo === 'aeromovil';
  const ex = useMemo(() => (cuerpo && R && punto) ? explicar({
    punto, cuerpo, R, kmh, P: nuestro ? P : undefined,
    otros: cuerpos.filter(c => c.id !== cuerpo.id && resultados[c.id]).map(c => ({ cuerpo: c, R: resultados[c.id]! })),
  }) : null, [cuerpo, R, punto, kmh, P, nuestro, cuerpos, resultados]);
  const [pruebas, setPruebas] = useState<Record<string, { estado: 'calculando' | 'listo' | 'error'; r?: ResultadoPrueba }>>({});
  // a different design, resolution or speed makes old results stale
  const claveDiseno = JSON.stringify(P ?? null) + resolucion;
  useEffect(() => setPruebas({}), [claveDiseno]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar(); };
    window.addEventListener('keydown', tecla); return () => window.removeEventListener('keydown', tecla);
  }, [alCerrar]);
  if (!cuerpo) return null;
  const i = punto ? puntos.indexOf(punto) : -1;
  const ir = (d: number) => { if (puntos.length) alElegir({ cuerpo: sel.cuerpo, punto: puntos[(i + d + puntos.length) % puntos.length].id }); };

  const probar = (m: Mejora) => {
    if (!m.prueba || !P) return;
    const clave = `${String(m.prueba.clave)}=${m.prueba.valor}`;
    setPruebas(s => ({ ...s, [clave]: { estado: 'calculando' } }));
    probarParametros({ ...P, [m.prueba.clave]: m.prueba.valor }, resolucion).then(r => setPruebas(s => ({ ...s, [clave]: r ? { estado: 'listo', r } : { estado: 'error' } })));
  };
  const v = kmh / 3.6, qd = 0.5 * RHO * v * v;

  return (
    <div role="dialog" aria-label={ex ? `Explicación: ${ex.titulo}` : 'Explicación del punto'} className={cn('z-[16] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/[0.97] text-slate-800 shadow-lg backdrop-blur', className)}>
      <div className="flex items-start gap-2 border-b border-slate-100 px-3 py-2">
        <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', ex ? PUNTO[ex.color] : 'bg-slate-400')} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-slate-900">{ex?.titulo ?? 'Calculando…'}</p>
          <p className="text-[11px] text-slate-500">{cuerpo.nombre} · a {kmh} km/h{puntos.length > 1 && i >= 0 ? ` · ${i + 1} de ${puntos.length}` : ''}</p>
        </div>
        {puntos.length > 1 && <>
          <Button variant="ghost" aria-label="Punto anterior" onClick={() => ir(-1)} className="px-1 py-1"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" aria-label="Punto siguiente" onClick={() => ir(1)} className="px-1 py-1"><ChevronRight className="h-4 w-4" /></Button>
        </>}
        <Button variant="ghost" aria-label="Cerrar la explicación" onClick={alCerrar} className="px-1 py-1"><X className="h-4 w-4" /></Button>
      </div>
      {!ex || !R || !punto ? <p className="p-3 text-[12px] text-slate-500">{R ? 'Este punto ya no está a esta velocidad: elige otro en la tarjeta del túnel.' : 'Calculando el flujo de este coche…'}</p> : (
        <div key={`${sel.cuerpo}:${sel.punto}`} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">En este coche</p>
            <Frases lista={ex.valor} />
          </div>
          <h3 className="mt-3 text-[12px] font-semibold text-slate-900">Qué es</h3>
          <Frases lista={ex.queEs} />
          <h3 className="mt-3 text-[12px] font-semibold text-slate-900">Por qué importa</h3>
          <Frases lista={ex.porQue} />
          {ex.comparacion.length > 0 && <>
            <h3 className="mt-3 text-[12px] font-semibold text-slate-900">Comparado con los otros coches del túnel</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-snug text-slate-700">{ex.comparacion.map((f, k) => <li key={k}>{f.texto}<Origen o={f.origen} /></li>)}</ul>
          </>}
          <h3 className="mt-3 text-[12px] font-semibold text-slate-900">Cómo mejorarlo</h3>
          {ex.notaMejoras && <p className="mt-1 text-[12px] leading-snug text-slate-700">{ex.notaMejoras}</p>}
          <ul className="mt-1 space-y-2">
            {ex.mejoras.map((m, k) => {
              const clave = m.prueba ? `${String(m.prueba.clave)}=${m.prueba.valor}` : '', pr = clave ? pruebas[clave] : undefined;
              const antes = porVelocidad(R, kmh), despues = pr?.r ? porVelocidad(pr.r.R, kmh) : null;
              const propiaA = cifraPropia(punto.tipo, R, kmh, punto.zona), propiaB = pr?.r ? cifraPropia(punto.tipo, pr.r.R, kmh, punto.zona) : null;
              const kA = qd * antes.cd.total * cuerpo.area / 36, kB = pr?.r && despues ? qd * despues.cd.total * pr.r.A / 36 : 0;
              return (
                <li key={k} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                  {m.deslizador && <p className="text-[11.5px] font-semibold text-teal-800">«{m.deslizador}» <span className="font-normal text-slate-500">· {m.donde}</span></p>}
                  <p className="text-[12px] leading-snug text-slate-700">{m.texto}<Origen o={m.origen} /></p>
                  {m.enElExtremo && <p className="mt-0.5 text-[11px] text-slate-500">{m.enElExtremo}</p>}
                  {m.prueba && (
                    <div className="mt-1">
                      <Button variant="outline" onClick={() => probar(m)} disabled={pr?.estado === 'calculando'}
                        className="gap-1 px-2 py-0.5 text-[11px] normal-case tracking-normal" title="Calcula el túnel con este cambio sin tocar tu diseño">
                        <FlaskConical className="h-3.5 w-3.5" />{pr?.estado === 'calculando' ? 'Calculando…' : `Probar: ${m.prueba.desc}`}
                      </Button>
                      {pr?.estado === 'error' && <p className="mt-0.5 text-[11px] text-amber-800">No se ha podido calcular este cambio.</p>}
                      {pr?.r && despues && (
                        <div className="mt-1 rounded bg-sky-50 px-2 py-1 text-[11.5px] leading-snug text-slate-700 tabular-nums">
                          <p>Cd del túnel <b>{fmt(antes.cd.total, 3)} → {fmt(despues.cd.total, 3)}</b> ({signo((despues.cd.total - antes.cd.total) / antes.cd.total * 100, 1)} %) · área frontal {fmt(cuerpo.area)} → {fmt(pr.r.A)} m²</p>
                          <p>Aire a {kmh} km/h: <b>{fmt(kA)} → {fmt(kB)} kWh cada 100 km</b> ({signo(kB - kA)})</p>
                          <p>Separación media: a {fmt(R.geometria.xMorro - antes.xSeparacion)} m del morro → {fmt(pr.r.R.geometria.xMorro - despues.xSeparacion)} m ({fmt(antes.xSeparacion - R.geometria.xCola)} → {fmt(despues.xSeparacion - pr.r.R.geometria.xCola)} m antes del final)</p>
                          {propiaA && propiaB && <p>{propiaA[0]}: {fmt(propiaA[1], propiaA[3])} → {fmt(propiaB[1], propiaB[3])} {propiaA[2]}</p>}
                          <p className="mt-0.5 text-[10.5px] text-slate-500">Calculado en {fmt(pr.r.msTotal / 1000, 1)} s con la malla {resolucion}, sobre una copia: tu diseño no ha cambiado. Para quedarte con el cambio, mueve «{m.deslizador}» en {m.donde}{puedeDecidir ? '.' : ' (solo puede hacerlo el dueño del diseño, con su sesión iniciada).'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-2 text-[10.5px] leading-snug text-slate-500">
            <Origen o="calculo" /> sale de este túnel: un cálculo aproximado (método de paneles y capa límite), no un CFD ni un túnel de verdad; con los coches cerrados que publican el suyo se equivoca de media un ±{fmt(CALIBRACION.ajusteActual.banda * 100, 0)} %, y se le da un margen de ±{fmt(CALIBRACION.banda * 100, 0)} %, más ancho a propósito.
            {' '}<Origen o="general" /> es conocimiento general de aerodinámica, no calculado aquí.
          </p>
        </div>
      )}
    </div>
  );
}
