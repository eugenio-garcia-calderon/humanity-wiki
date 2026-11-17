// The Cuadriciclo Bala side panel.
// Moved out of pages/Aeromovil.tsx unchanged (2026-11-16, refactor «ordenar»). See ./CLAUDE.md for the layout.
import { Fragment } from 'react';
import { cn } from '../../utils/cn';
import { BALA_DEFECTO, DIAMETRO_RUEDA, type ModeloBala, type Parametros, type Pulgadas, type Resultados } from './geometria';
import { BLOQUES_BALA, DESLIZADORES_BALA, INCLINACION, RUEDAS_DT_BALA, RUEDAS_LAT_BALA, TALLA_SENTADO, camposBala, rangoBala, type BloqueBala, type FichaBala } from './geometriaBala';
import { fmt, m2, Deslizador, Bloque, Selector } from './controles';

/**
 * Los deslizadores y las cifras del Cuadriciclo Bala en rombo (2026-11-09, Eugenio: «permíteme editarlo»).
 * Etiquetas, bloques y rangos salen de `DESLIZADORES_BALA` (geometriaBala.ts), la misma tabla que leen las
 * opciones del túnel: si se cambia una etiqueta allí, cambia en los dos sitios.
 */
export function LadoBala({ P, set, res, modelo, cdTunel }: {
  P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void; res: Resultados; modelo: ModeloBala; cdTunel?: number;
}) {
  const B = camposBala(P), rb = res.bala;
  const cm = (v: number) => `${fmt(v * 100, 1)} cm`;
  const mostrar = (k: FichaBala['clave'], v: number): string => {
    switch (k) {
      case 'bSuelo': return `${cm(v)} al suelo`;
      case 'bPuntaMorro': return `${fmt(v, 2)} · ${v < 0.7 ? 'ojiva llena' : v > 0.95 ? 'en aguja' : 'ojiva'}`;
      case 'bCupIni': case 'bCupFin': return `${m2(v)} tras el eje delantero`;
      case 'bVia': return rb?.viaSubida ? `${m2(v)} → ${m2(rb.viaSubida)}` : m2(v);
      case 'bAleta': return `${m2(v)} sobre el suelo`;
      case 'bAlto': return `${fmt(v, 3)} m`;
      default: return m2(v);
    }
  };
  const notaBloque: Record<BloqueBala, string> = {
    Medidas: `${m2(modelo.Lf)} × ${m2(modelo.anchoTotal)} × ${m2(modelo.alto)}`,
    'Morro y cola': `largo ${m2(modelo.Lf)}`,
    'Cúpula': rb ? `cristal ${m2(rb.cupula[0])}–${m2(rb.cupula[1])}` : '',
    Ocupantes: 'dos, a horcajadas',
  };
  const ruedas = (lista: Pulgadas[]) => lista.map(k => ({ k, n: `${k}″ (${Math.round(DIAMETRO_RUEDA[k] * 1000)} mm)` }));
  const malas = res.comprobaciones.filter(c => c.holgura < c.minimo).length;
  return (
    <>
      {BLOQUES_BALA.map(bloque => (
        <Bloque key={bloque} titulo={bloque} nota={notaBloque[bloque]}>
          {DESLIZADORES_BALA.filter(f => f.bloque === bloque).map(f => {
            const [lo, hi] = rangoBala(f.clave, B);
            return <Deslizador key={f.clave} id={`b-${f.clave}`} etiqueta={f.n} valor={B[f.clave]} clave={f.clave} centro={BALA_DEFECTO[f.clave]} min={lo} max={hi} paso={f.paso} mostrar={mostrar(f.clave, B[f.clave])} alCambiar={v => set(f.clave, v)} />;
          })}
          {bloque === 'Medidas' && <>
            {rb?.viaSubida && <p className="-mt-2 text-xs text-amber-800">Con este ancho, la vía sube a {m2(rb.viaSubida)}: es lo mínimo para que los carenados laterales queden a 3 cm de la carrocería.</p>}
            <Selector id="b-ruedaDT" etiqueta="Ruedas delantera y trasera" valor={B.bRuedaDT} clave="bRuedaDT" opciones={ruedas(RUEDAS_DT_BALA)} alCambiar={v => set('bRuedaDT', v)} />
            <Selector id="b-ruedaLat" etiqueta="Ruedas laterales" valor={B.bRuedaLat} clave="bRuedaLat" opciones={ruedas(RUEDAS_LAT_BALA)} alCambiar={v => set('bRuedaLat', v)} />
            <p className="-mt-1 text-xs text-slate-500">El largo total es morro + batalla + cola. Las ruedas delantera y trasera van dentro de la carrocería; las laterales, en carenados que crecen con la rueda. Los carenados no se inclinan.</p>
          </>}
          {bloque === 'Cúpula' && <p className="-mt-2 text-xs text-slate-500">La cúpula se abre hacia delante, con la bisagra en su punta («Abrir cúpula», abajo en el 3D).</p>}
          {bloque === 'Ocupantes' && <p className="-mt-2 text-xs text-slate-500">Piloto y pasajero a horcajadas sobre un sillín escalonado, tipo moto. El manillar y el salpicadero se quedan sobre la rueda delantera; el resto del puesto sigue a cada uno.</p>}
        </Bloque>
      ))}

      <Bloque titulo="Comprobaciones" nota={malas ? `${malas} por revisar` : 'todo cabe'}>
        <ul className="flex flex-col gap-1.5">
          {res.comprobaciones.map(c => {
            const cl = c.holgura < 0 ? 'border-red-300 bg-red-50 text-red-700' : c.holgura < c.minimo ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700';
            return (
              <li key={c.nombre} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
                <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', cl)}>{c.holgura < 0 ? 'roza' : c.holgura < c.minimo ? 'justo' : 'ok'}</span>
                <span className="text-slate-700">{c.nombre}</span>
                <span className="font-mono text-xs tabular-nums">{c.holgura < 0 ? '−' : ''}{fmt(Math.abs(c.holgura) * 100, 1)} cm</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-500">Cabezas: un hombre sentado erguido, inclinado {INCLINACION.piloto}° hacia delante y sin casco, de talla media ({fmt(TALLA_SENTADO.p50 * 100, 1)} cm sentado) y alta (percentil 95, {fmt(TALLA_SENTADO.p95 * 100, 1)} cm), según la encuesta antropométrica del ejército de EE. UU. de 2012 (ANSUR II). Se mide sobre el eje, hasta la cara de dentro del cristal. Con casco hace falta más. Las ruedas, sin contar el recorrido de la suspensión, que el Bala aún no tiene diseñada.</p>
      </Bloque>

      <Bloque titulo="Lo que se puede calcular" nota="estimación">
        {rb ? (
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[13px]">
            {([
              ['Área frontal (todo)', `${fmt(rb.area.total)} m²`],
              ['  la carrocería', `${fmt(rb.area.cuerpo)} m²`],
              ['  + carenados laterales y brazos', `${fmt(rb.area.carenados)} m²`],
              ['  + ruedas (lo que asoma)', `${fmt(rb.area.ruedas)} m²`],
              ['Volumen de la carrocería', `${fmt(rb.vol)} m³`],
              ['Piel de la carrocería', `${fmt(rb.piel - rb.cristal)} m²`],
              ['Cristal de la cúpula', `${fmt(rb.cristal)} m²`],
            ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="whitespace-pre text-slate-600">{a}</dt><dd className="text-right font-mono text-xs tabular-nums">{b}</dd></Fragment>))}
            <dt className="text-slate-600">Cd del túnel (solo la carrocería)</dt>
            <dd className="text-right font-mono text-xs tabular-nums">{cdTunel != null ? fmt(cdTunel, 3) : '—'}</dd>
          </dl>
        ) : <p className="text-xs text-slate-500">Calculando…</p>}
        <p className="text-xs text-slate-500">
          <b>Cd:</b> la fórmula del editor es la de un carenado en gota de velomóvil (esbeltez, dónde está lo más grueso, la punta de cola) y no vale para esta forma, así que aquí no se da. Lo estima el túnel de viento con la silueta de la carrocería; los carenados laterales y sus brazos quedan fuera de ese cálculo, así que el Cd real será algo más alto. {cdTunel == null && 'Ábrelo con «Túnel de viento», debajo del 3D.'}
        </p>
        <p className="text-xs text-slate-500"><b>Masa, consumo y autonomía:</b> sin calcular. El chasis, el motor y la batería del Bala no están diseñados, y cualquier cifra sería inventada. El túnel sí da lo que cuesta empujar el aire.</p>
      </Bloque>
    </>
  );
}
