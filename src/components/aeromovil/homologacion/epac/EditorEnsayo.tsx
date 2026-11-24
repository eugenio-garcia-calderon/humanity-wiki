// «El programita» of one test (2026-11-24, Eugenio: «crea un programita para poder hacer cada uno de los ensayos y apuntar
// los resultados del ensayo, cómo se ha hecho, cómo ha sido la prueba… y luego, cuando pongo los resultados, se genera el
// documento»). The engineer follows the proposed procedure, writes down how he did it and what he measured, concludes,
// signs, and the report is built from exactly that. A failed attempt stays in the file (a re-test is a new attempt).
import { useMemo, useState } from 'react';
import { AlertTriangle, Download, FileSignature, Lock, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import type { FichaHomologacion } from '../ficha';
import { obligacionesDeEnsayo } from './catalogo';
import { configuracionDeDiseno, type CampoResultado, type Ensayo } from './ensayos';
import { cambiar, claveEnsayo } from './almacen';
import { estadoEnsayo } from './progreso';
import type { EnsayoGuardado, Fabricante, Intento } from './tipos';
import { abrirHtml, descargarHtml, informeEnsayo, paginaHtml } from './exportar';
import { Adjuntos } from './Adjuntos';
import { Area, Chip, Desplegable, fechaCorta, hoyIso, idNuevo, Peso, type Ir } from './ui';

const MAX_INTENTOS = 6;
const lista = (xs: string[]) => xs.map(x => `- ${x}`).join('\n');
const numerada = (xs: string[]) => xs.map((x, i) => `${i + 1}. ${x}`).join('\n');

/** What the law fixes in numbers, checked against what was measured: a measurement over the limit cannot be signed «conforme». */
const LIMITE_LEGAL: Record<string, { campo: string; max: number; unidad: string }> = {
  e01: { campo: 'pot', max: 250, unidad: 'W' },
  e02: { campo: 'vcorte', max: 25, unidad: 'km/h' },
};
const numero = (s: string | undefined) => { const n = Number((s ?? '').replace(',', '.')); return s?.trim() && Number.isFinite(n) ? n : null; };

function intentoNuevo(e: Ensayo, ficha: FichaHomologacion): Intento {
  return {
    id: idNuevo(), fecha: hoyIso(), unidad: '',
    configuracion: configuracionDeDiseno(ficha), instrumentos: lista(e.instrumentos), calibracion: '', condiciones: lista(e.condiciones),
    procedimiento: numerada(e.procedimiento), criterio: e.criterio, valores: {}, observaciones: '', conclusion: '', adjuntos: [],
  };
}

const editar = (e: Ensayo, f: (v: EnsayoGuardado) => EnsayoGuardado) => cambiar<EnsayoGuardado>(claveEnsayo(e.id), { intentos: [] }, f);
const editarIntento = (e: Ensayo, id: string, parcial: Partial<Intento>) => editar(e, v => ({ ...v, intentos: v.intentos.map(i => i.id === id ? { ...i, ...parcial } : i) }));

function CampoValor({ c, valor, ficha, disabled, alCambiar }: { c: CampoResultado; valor: string; ficha: FichaHomologacion; disabled: boolean; alCambiar: (v: string) => void }) {
  const diseno = c.diseno ? c.diseno(ficha) : null;
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-2">
      <span className="text-xs font-semibold text-slate-700">{c.etiqueta}</span>
      {c.tipo === 'sino' ? (
        <div className="flex gap-1" role="group" aria-label={c.etiqueta}>
          {(['si', 'no'] as const).map(x => (
            <Button key={x} variant="outline" disabled={disabled} aria-pressed={valor === x} onClick={() => alCambiar(valor === x ? '' : x)}
              className={cn('px-3 py-1 text-xs normal-case tracking-normal', valor === x ? (x === 'si' ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700' : 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700') : 'bg-white text-slate-700')}>{x === 'si' ? 'Sí' : 'No'}</Button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input value={valor} disabled={disabled} maxLength={c.tipo === 'texto' ? 400 : 20} inputMode={c.tipo === 'num' ? 'decimal' : undefined} onChange={ev => alCambiar(ev.target.value)}
            aria-label={c.etiqueta} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-[13px] text-slate-900 disabled:bg-slate-50" />
          {c.unidad && <span className="text-xs text-slate-500">{c.unidad}</span>}
        </div>
      )}
      {c.ayuda && <span className="text-[11px] text-slate-500">{c.ayuda}</span>}
      {diseno && <span className="text-[11px] text-teal-800">El diseño 3D dice: <strong>{diseno}</strong> (compáralo con lo medido)</span>}
    </div>
  );
}

function Informe({ e, i, n, fab }: { e: Ensayo; i: Intento; n: number; fab: Fabricante }) {
  const html = useMemo(() => paginaHtml(informeEnsayo(e, i, n, fab, window.location.origin), false), [e, i, n, fab]);
  const htmlConBoton = () => paginaHtml(informeEnsayo(e, i, n, fab, window.location.origin), true);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => descargarHtml(`Informe-${e.codigo}-intento-${n}`, htmlConBoton())} className="gap-1.5 px-2.5 py-1 text-xs normal-case tracking-normal"><Download className="h-3.5 w-3.5" />Descargar el informe</Button>
        <Button variant="outline" onClick={() => abrirHtml(htmlConBoton())} className="gap-1.5 px-2.5 py-1 text-xs normal-case tracking-normal"><Printer className="h-3.5 w-3.5" />Abrir para imprimir o guardar en PDF</Button>
        <span className="text-[11px] text-slate-500">El informe se genera con lo que has escrito arriba. Descárgalo y adjúntalo a la matriz como prueba.</span>
      </div>
      <iframe title={`Informe ${e.codigo}, intento ${n}`} sandbox="" srcDoc={html} className="h-[28rem] w-full rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}

function Intento1({ e, i, n, ficha, fab, editable }: { e: Ensayo; i: Intento; n: number; ficha: FichaHomologacion; fab: Fabricante; editable: boolean }) {
  const [firmante, setFirmante] = useState(fab.responsable);
  const [borrar, setBorrar] = useState(false);
  const cerrado = !!i.firma || !editable;
  const poner = (p: Partial<Intento>) => editarIntento(e, i.id, p);
  const lim = LIMITE_LEGAL[e.id];
  const medido = lim ? numero(i.valores[lim.campo]) : null;
  const pasaLimite = lim != null && medido != null && medido > lim.max;
  const faltas = [
    !i.unidad.trim() && 'qué unidad se ha ensayado (nº de serie o nombre del prototipo)',
    !i.procedimiento.trim() && 'cómo se ha hecho la prueba',
    !i.criterio.trim() && 'el criterio de aceptación',
    !Object.values(i.valores).some(v => v?.trim()) && 'al menos un resultado medido',
    !i.conclusion && 'la conclusión (conforme o no conforme)',
    pasaLimite && i.conclusion === 'conforme' && `la conclusión: has medido ${medido} ${lim!.unidad}, por encima del máximo legal de ${lim!.max} ${lim!.unidad}; no puede ser conforme`,
  ].filter(Boolean) as string[];
  return (
    <div className="flex flex-col gap-3">
      {i.firma && (
        <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px]', i.conclusion === 'conforme' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-rose-300 bg-rose-50 text-rose-900')}>
          <Lock className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">Firmado por <strong>{i.firma.nombre}</strong> el {fechaCorta(i.firma.fecha)}: <strong>{i.conclusion === 'conforme' ? 'CONFORME' : 'NO CONFORME'}</strong>. Para cambiar algo hay que reabrirlo (se pierde la firma).</span>
          {editable && <Button variant="outline" onClick={() => poner({ firma: undefined })} className="gap-1 px-2 py-0.5 text-xs normal-case tracking-normal"><RotateCcw className="h-3 w-3" />Reabrir</Button>}
        </div>
      )}

      <fieldset disabled={cerrado} className="flex min-w-0 flex-col gap-3 border-0 p-0">
        <section className="flex flex-col gap-2" aria-label="Cómo se ha hecho">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Cómo se ha hecho</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 text-xs font-semibold text-slate-700">Fecha del ensayo
              <input type="date" value={i.fecha} disabled={cerrado} onChange={ev => poner({ fecha: ev.target.value })} className="rounded-md border border-slate-300 px-2 py-1.5 text-[13px] font-normal text-slate-900 disabled:bg-slate-50" /></label>
            <label className="flex flex-col gap-0.5 text-xs font-semibold text-slate-700">Unidad ensayada
              <input value={i.unidad} maxLength={200} disabled={cerrado} onChange={ev => poner({ unidad: ev.target.value })} placeholder="Nº de serie o nombre del prototipo" className="rounded-md border border-slate-300 px-2 py-1.5 text-[13px] font-normal text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50" /></label>
          </div>
          <Area etiqueta="Configuración del vehículo y de los componentes" valor={i.configuracion} alCambiar={v => poner({ configuracion: v })} filas={3} disabled={cerrado} ayuda="Viene del diseño 3D. Añade marca, modelo y número de serie del motor, el controlador, la batería, los frenos y los neumáticos." />
          <div className="grid gap-2 md:grid-cols-2">
            <Area etiqueta="Instrumentos de medida" valor={i.instrumentos} alCambiar={v => poner({ instrumentos: v })} filas={4} disabled={cerrado} />
            <Area etiqueta="Identificación y calibración de los instrumentos" valor={i.calibracion} alCambiar={v => poner({ calibracion: v })} filas={4} disabled={cerrado} ayuda="Marca, nº de serie y fecha de la última calibración o contraste." />
          </div>
          <Area etiqueta="Condiciones del ensayo" valor={i.condiciones} alCambiar={v => poner({ condiciones: v })} filas={4} disabled={cerrado} ayuda="Anota los valores reales: temperatura, carga de la batería, masa del ocupante…" />
          <Area etiqueta="Procedimiento (los pasos que seguiste)" valor={i.procedimiento} alCambiar={v => poner({ procedimiento: v })} filas={7} disabled={cerrado} ayuda="Es el procedimiento propuesto. Cámbialo por lo que hiciste de verdad: el informe cuenta lo que escribas aquí." />
          <Area etiqueta="Criterio de aceptación" valor={i.criterio} alCambiar={v => poner({ criterio: v })} filas={3} disabled={cerrado}
            ayuda={e.criterioLegal ? 'La cifra sale de la ley (ver arriba). No la cambies.' : 'La ley no da esta cifra. Es el criterio propuesto: sustitúyelo por el de la norma que sigas (EN 15194, ISO 4210…) y anota de dónde lo sacas.'} />
        </section>

        <section className="flex flex-col gap-2" aria-label="Resultados">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resultados medidos</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {e.campos.map(c => <CampoValor key={c.id} c={c} valor={i.valores[c.id] ?? ''} ficha={ficha} disabled={cerrado} alCambiar={v => poner({ valores: { ...i.valores, [c.id]: v } })} />)}
          </div>
          <Area etiqueta="Observaciones" valor={i.observaciones} alCambiar={v => poner({ observaciones: v })} filas={3} disabled={cerrado} ayuda="Cualquier cosa rara que viste, aunque el resultado sea bueno: ruidos, calentamientos, fallos a repetir." />
        </section>
      </fieldset>

      <section className="flex flex-col gap-1.5" aria-label="Fotos y evidencias">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fotos, vídeos de la prueba y registros</h4>
        <Adjuntos adjuntos={i.adjuntos} alCambiar={l => poner({ adjuntos: l })} pieza={`Ensayo ${e.codigo} intento ${n}`} soloLectura={cerrado} etiqueta="Adjuntar foto, registro o captura" />
        {!i.adjuntos.length && <p className="text-[11px] text-slate-500">Sin archivos: una inspección querrá ver al menos una foto del montaje y el registro de datos.</p>}
      </section>

      {!i.firma && editable && (
        <section className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5" aria-label="Conclusión y firma">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Conclusión y firma</h4>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Conclusión">
            {(['conforme', 'noConforme'] as const).map(x => (
              <Button key={x} variant="outline" aria-pressed={i.conclusion === x} onClick={() => poner({ conclusion: i.conclusion === x ? '' : x })}
                className={cn('px-3 py-1 text-xs normal-case tracking-normal', i.conclusion === x ? (x === 'conforme' ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700' : 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700') : 'bg-white text-slate-700')}>{x === 'conforme' ? 'Conforme' : 'No conforme'}</Button>
            ))}
            <span className="text-[11px] text-slate-500">Un «no conforme» también se firma: queda en el expediente y el siguiente intento lo corrige.</span>
          </div>
          {pasaLimite && <p className="flex items-start gap-1.5 text-xs text-rose-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Has medido {medido} {lim!.unidad}: supera el máximo legal de {lim!.max} {lim!.unidad}. Con esa cifra el vehículo no es un ciclo de pedales con pedaleo asistido.</p>}
          <label className="flex flex-col gap-0.5 text-xs font-semibold text-slate-700">Firma: nombre de quien responde del ensayo
            <input value={firmante} maxLength={120} onChange={ev => setFirmante(ev.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-normal text-slate-900" /></label>
          {faltas.length > 0 && <p className="text-xs text-slate-600">Para firmar falta: {faltas.join('; ')}.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={faltas.length > 0 || !firmante.trim()} onClick={() => poner({ firma: { nombre: firmante.trim(), fecha: hoyIso() } })} className="gap-1.5 px-3 py-1.5 text-xs normal-case tracking-normal"><FileSignature className="h-3.5 w-3.5" />Firmar el ensayo</Button>
            {(borrar
              ? <span className="flex items-center gap-1.5 text-xs"><span className="text-rose-800">¿Quitar este intento sin firmar?</span><Button variant="outline" onClick={() => { editar(e, v => ({ ...v, intentos: v.intentos.filter(x => x.id !== i.id) })); setBorrar(false); }} className="border-rose-300 px-2 py-0.5 text-xs normal-case tracking-normal text-rose-700">Sí, quitarlo</Button><Button variant="ghost" onClick={() => setBorrar(false)} className="px-2 py-0.5 text-xs normal-case tracking-normal">No</Button></span>
              : <Button variant="ghost" onClick={() => setBorrar(true)} className="gap-1 px-2 py-0.5 text-xs normal-case tracking-normal text-slate-500 hover:text-rose-700"><Trash2 className="h-3 w-3" />Quitar este intento</Button>)}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-1.5" aria-label="Informe">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">El informe de este intento</h4>
        <Informe e={e} i={i} n={n} fab={fab} />
      </section>
    </div>
  );
}

export function EditorEnsayo({ e, g, ficha, fab, editable, ir }: { e: Ensayo; g: EnsayoGuardado | undefined; ficha: FichaHomologacion; fab: Fabricante; editable: boolean; ir: Ir }) {
  const intentos = g?.intentos ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const actual = intentos.find(i => i.id === sel) ?? intentos[intentos.length - 1];
  const obligaciones = obligacionesDeEnsayo(e.id);
  const estado = estadoEnsayo(g);
  const tamano = g ? JSON.stringify(g).length : 0;
  const empezar = () => { const nuevo = intentoNuevo(e, ficha); editar(e, v => ({ ...v, intentos: [...v.intentos, nuevo] })); setSel(nuevo.id); };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-slate-800"><span className="font-semibold">Para qué sirve:</span> {e.objetivo}</p>
      <p className="text-xs text-slate-600"><span className="font-semibold">Norma:</span> {e.norma}{e.normaLeida ? '' : ' (texto de pago: no leído)'}</p>
      <p className="text-xs text-slate-600"><span className="font-semibold">Criterio:</span> {e.criterio} {e.criterioLegal ? <span className="rounded bg-emerald-50 px-1 font-semibold text-emerald-800">cifra de la ley</span> : <span className="rounded bg-amber-50 px-1 font-semibold text-amber-900">la ley no da la cifra: la fija el responsable del ensayo</span>}</p>
      {obligaciones.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600"><span className="font-semibold">Demuestra:</span>
          {obligaciones.map(o => <Button key={o.id} variant="outline" onClick={() => ir('matriz', o.id)} title={o.exige} className="gap-1 px-1.5 py-0.5 text-[11px] normal-case tracking-normal"><Peso peso={o.peso} />{o.id} {o.titulo}</Button>)}</p>
      )}

      <Desplegable titulo="Cómo se hace: instrumentos, preparación y pasos" resumen="Propuesta para seguir, no copia de ninguna norma">
        <div className="grid gap-3 md:grid-cols-2">
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Instrumentos</h4><ul className="list-disc pl-5">{e.instrumentos.map(x => <li key={x}>{x}</li>)}</ul></div>
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Preparación</h4><ul className="list-disc pl-5">{e.preparacion.map(x => <li key={x}>{x}</li>)}</ul></div>
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pasos</h4><ol className="list-decimal pl-5">{e.procedimiento.map(x => <li key={x}>{x}</li>)}</ol></div>
          <div><h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Condiciones a anotar</h4><ul className="list-disc pl-5">{e.condiciones.map(x => <li key={x}>{x}</li>)}</ul></div>
        </div>
        {e.ojo && e.ojo.length > 0 && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"><p className="font-semibold">Ojo con</p><ul className="list-disc pl-5">{e.ojo.map(x => <li key={x}>{x}</li>)}</ul></div>}
      </Desplegable>

      {tamano > 60_000 && <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Este ensayo ya ocupa mucho espacio guardado ({Math.round(tamano / 1000)} mil de 80 mil caracteres). Si deja de guardar, mueve los textos largos a un archivo adjunto.</p>}

      {!editable ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">Solo el dueño del Aeromóvil puede hacer y firmar ensayos.</p> : (
        <section className="flex flex-col gap-2" aria-label={`Intentos de ${e.codigo}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Intentos</span>
            {intentos.map((i, k) => (
              <Button key={i.id} variant="outline" aria-pressed={actual?.id === i.id} onClick={() => setSel(i.id)}
                className={cn('gap-1.5 px-2 py-1 text-xs normal-case tracking-normal', actual?.id === i.id ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : 'bg-white text-slate-800')}>
                {k + 1} · {fechaCorta(i.fecha)}{i.firma ? (i.conclusion === 'conforme' ? ' ✓' : ' ✗') : ' …'}
              </Button>
            ))}
            <Button variant={intentos.length ? 'outline' : 'primary'} disabled={intentos.length >= MAX_INTENTOS || intentos.some(i => !i.firma)} onClick={empezar} className="gap-1 px-2.5 py-1 text-xs normal-case tracking-normal"><Plus className="h-3.5 w-3.5" />{intentos.length ? 'Repetir el ensayo' : 'Empezar el ensayo'}</Button>
            {estado !== 'pendiente' && <Chip estado={estado} />}
          </div>
          {intentos.some(i => !i.firma) && intentos.length > 0 && <p className="text-[11px] text-slate-500">Firma el intento abierto antes de empezar otro.</p>}
          {!intentos.length && <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">Todavía no hay ningún intento. Al empezar se rellena solo con la configuración de tu diseño y el procedimiento propuesto; tú lo corriges con lo que hagas de verdad.</p>}
          {actual && <Intento1 key={actual.id} e={e} i={actual} n={intentos.indexOf(actual) + 1} ficha={ficha} fab={fab} editable={editable} />}
        </section>
      )}
    </div>
  );
}
