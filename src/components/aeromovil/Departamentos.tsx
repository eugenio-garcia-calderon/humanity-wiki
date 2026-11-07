// Panel de un departamento del «fabricante» del Aeromóvil (2026-11-06,
// Eugenio): bajo el 3D, al elegir una pestaña del lateral, se ven la misión y
// responsabilidades del equipo, las tareas hacia el prototipo 1, las decisiones
// pendientes, los aliados (CRM) y los mensajes preparados para pedir presupuesto.
// El contenido vive en `departamentos/<id>.ts` y lo escriben bots; aquí solo se
// enseña. También la comparación de las dos versiones del chasis.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Search } from 'lucide-react';
import { COMPONENTES, fichaComponente } from './componentes';
import type { Parametros, Resultados } from './geometria';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { Departamento } from './departamentos';
import { evaluarChasis, tubosCelosia, type EvaluacionChasis } from './chasisCelosia';
import type { Modelo } from './geometria';

type Pestana = 'equipo' | 'piezas' | 'compras' | 'tareas' | 'decisiones' | 'partners' | 'mensajes' | 'referencias';
const PESTANAS: { k: Pestana; n: string }[] = [
  { k: 'equipo', n: 'Equipo' }, { k: 'piezas', n: 'Piezas' }, { k: 'compras', n: 'Compras' }, { k: 'tareas', n: 'Tareas' }, { k: 'decisiones', n: 'Decisiones' },
  { k: 'partners', n: 'Aliados' }, { k: 'mensajes', n: 'Mensajes' }, { k: 'referencias', n: 'Referencias' },
];
const PRIORIDAD: Record<string, string> = { alta: 'border-red-300 bg-red-50 text-red-700', media: 'border-amber-300 bg-amber-50 text-amber-800', baja: 'border-slate-300 bg-slate-50 text-slate-600' };
const ESTADO: Record<string, string> = { 'por contactar': 'bg-slate-100 text-slate-600', contactado: 'bg-sky-100 text-sky-800', 'en conversación': 'bg-emerald-100 text-emerald-800', descartado: 'bg-slate-100 text-slate-400 line-through' };

export function PanelDepartamento({ d, P, res, modelo }: { d: Departamento; P?: Parametros; res?: Resultados; modelo?: Modelo }) {
  const [pestana, setPestana] = useState<Pestana>('equipo');
  const [copiado, setCopiado] = useState<string | null>(null);
  const vacio = !d.responsabilidades.length && !d.tareas.length;
  const piezas = COMPONENTES.filter(c => d.componentes.includes(c.id));
  const cuenta: Record<Pestana, number> = { equipo: d.responsabilidades.length, piezas: piezas.length, compras: d.opcionesCompra?.length ?? 0, tareas: d.tareas.length, decisiones: d.decisiones.length, partners: d.partners.length, mensajes: d.mensajes.length, referencias: d.referencias.length };
  const copiar = async (texto: string, clave: string) => { try { await navigator.clipboard.writeText(texto); setCopiado(clave); setTimeout(() => setCopiado(null), 1500); } catch { /* sin portapapeles */ } };
  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white" aria-label={`Departamento: ${d.nombre}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{d.nombre}</h2>
          <p className="text-xs text-slate-500">{d.lema}</p>
        </div>
        <span className="font-mono text-[11px] text-slate-400">revisado {d.revisado.fecha} · {d.revisado.por}</span>
      </header>
      {vacio ? (
        <p className="px-4 py-6 text-sm text-slate-500">Este departamento está en manos de un bot ahora mismo: en cuanto termine, aquí aparecerán su misión, sus tareas, sus decisiones, sus aliados y los mensajes preparados.</p>
      ) : (<>
        <nav className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-2" aria-label="Apartados">
          {PESTANAS.filter(p => (p.k !== 'piezas' || piezas.length) && (p.k !== 'compras' || d.objetivos?.length || d.opcionesCompra?.length)).map(p => (
            <Button key={p.k} variant="ghost" aria-pressed={pestana === p.k} onClick={() => setPestana(p.k)}
              className={cn('gap-1.5 px-2.5 py-1 text-xs normal-case tracking-normal', pestana === p.k ? 'bg-teal-700 text-white hover:bg-teal-800' : 'text-slate-600')}>
              {p.n}<span className={cn('rounded-full px-1.5 font-mono text-[10px]', pestana === p.k ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{cuenta[p.k]}</span>
            </Button>
          ))}
        </nav>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm text-slate-700">
          {pestana === 'equipo' && (<>
            <p className="mb-3 leading-relaxed">{d.mision}</p>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Responsabilidades</h3>
            <ul className="list-disc space-y-1 pl-5">{d.responsabilidades.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </>)}
          {pestana === 'piezas' && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {piezas.map(c => { const f = P && res && modelo ? fichaComponente(c, P, res, modelo) : null; return (
                <li key={c.id} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex items-baseline justify-between gap-2"><Link to={`/aeromovil/componentes/${c.id}`} className="font-medium text-teal-800 hover:underline">{f?.nombre ?? c.nombre}</Link>{f && <span className="font-mono text-[11px] text-slate-500">{f.unidades} × {f.masa.toFixed(1)} kg · {Math.round(f.coste).toLocaleString('es-ES')} €</span>}</div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{c.que}</p>
                </li>); })}
            </ul>
          )}
          {pestana === 'compras' && <Compras d={d} />}
          {pestana === 'tareas' && (
            <ol className="space-y-2">
              {d.tareas.map((t, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{i + 1}</span>
                    <span className="font-medium text-slate-900">{t.titulo}</span>
                    <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', PRIORIDAD[t.prioridad])}>{t.prioridad}</span>
                    {t.semanas != null && <span className="font-mono text-[11px] text-slate-500">{t.semanas} sem.</span>}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{t.detalle}</p>
                  {t.entregable && <p className="mt-1 text-[12px] text-slate-500"><span className="font-semibold">Sale:</span> {t.entregable}</p>}
                  {t.dependeDe?.length ? <p className="mt-0.5 text-[12px] text-slate-500"><span className="font-semibold">Después de:</span> {t.dependeDe.join(' · ')}</p> : null}
                </li>
              ))}
            </ol>
          )}
          {pestana === 'decisiones' && (
            <div className="space-y-3">
              {d.decisiones.map((de, i) => (
                <article key={i} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-medium text-slate-900">{de.tema}</h4><span className="text-[11px] text-slate-500">{de.cuando}</span></div>
                  <p className="mt-1 text-[13px] text-slate-600">{de.contexto}</p>
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {de.opciones.map((o, j) => (
                      <li key={j} className={cn('rounded-md border p-2 text-[12px]', o.nombre === de.recomendacion ? 'border-teal-300 bg-teal-50' : 'border-slate-200')}>
                        <div className="font-semibold text-slate-800">{o.nombre}{o.coste ? <span className="ml-1 font-mono font-normal text-slate-500">{o.coste}</span> : null}</div>
                        <div className="text-emerald-800">+ {o.pros}</div><div className="text-red-800">− {o.contras}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[13px]"><span className="font-semibold text-teal-800">Recomendación:</span> {de.recomendacion}. <span className="text-slate-600">{de.porQue}</span></p>
                </article>
              ))}
            </div>
          )}
          {pestana === 'partners' && (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-1 pr-2">Quién</th><th className="py-1 pr-2">Qué nos da</th><th className="py-1 pr-2">Por qué</th><th className="py-1">Estado</th></tr></thead>
              <tbody>
                {d.partners.map((p, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 pr-2"><div className="font-medium text-slate-900">{p.web ? <a href={p.web} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-800 hover:underline">{p.nombre}<ExternalLink className="h-3 w-3" /></a> : p.nombre}</div><div className="text-[11px] text-slate-500">{p.tipo} · {p.pais}{p.verificado ? '' : ' · por verificar'}</div></td>
                    <td className="py-1.5 pr-2 text-slate-700">{p.que}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{p.porQue}</td>
                    <td className="py-1.5"><span className={cn('rounded-full px-1.5 py-0.5 text-[11px]', ESTADO[p.estado])}>{p.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pestana === 'mensajes' && (
            <div className="space-y-3">
              {d.mensajes.map((m, i) => {
                const texto = `Para: ${m.para}\nAsunto: ${m.asunto}\n\n${m.cuerpo}`;
                return (
                  <article key={i} className="rounded-lg border border-slate-200 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><span className="font-medium text-slate-900">{m.para}</span><span className="ml-2 text-[11px] text-slate-500">{m.canal} · {m.idioma === 'es' ? 'español' : 'inglés'}</span></div>
                      <Button variant="outline" onClick={() => copiar(texto, `m${i}`)} className="gap-1 px-2 py-1 text-xs normal-case tracking-normal"><Copy className="h-3 w-3" />{copiado === `m${i}` ? 'Copiado' : 'Copiar'}</Button>
                    </div>
                    <p className="mt-1 text-[13px] font-semibold text-slate-800">{m.asunto}</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-sans text-[12.5px] leading-relaxed text-slate-700">{m.cuerpo}</pre>
                    <p className="mt-1 text-[12px] text-slate-500"><span className="font-semibold">Pedimos:</span> {m.quePedimos.join(' · ')}</p>
                  </article>
                );
              })}
            </div>
          )}
          {pestana === 'referencias' && (
            <ul className="space-y-1.5">
              {d.referencias.map((r, i) => <li key={i} className="text-[13px]"><a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-teal-800 hover:underline">{r.titulo}</a><span className="text-slate-600"> — {r.nota}</span></li>)}
            </ul>
          )}
        </div>
      </>)}
    </section>
  );
}

/**
 * Objetivos de compra frente a las opciones encontradas (2026-11-07, Eugenio,
 * para el motor: «incluye esos objetivos, proveedores, opciones, costes y
 * pesos, de forma visual e interactiva, y un botón para que Claude genere una
 * tarea de búsqueda con todo el contexto»). Cada celda se pinta según cumpla
 * el objetivo; se ordena por columna; las preguntas abiertas se responden
 * aquí y «Pedir búsqueda a Claude» deja en Tareas un encargo con todo.
 */
function Compras({ d }: { d: Departamento }) {
  const objetivos = d.objetivos ?? [], opciones = d.opcionesCompra ?? [];
  const [orden, setOrden] = useState<string | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>(() => Object.fromEntries(opciones.map(o => [o.nombre, o.estado !== 'descartado'])));
  const [envio, setEnvio] = useState<{ estado: 'nada' | 'enviando' | 'listo' | 'error'; texto?: string; error?: string }>({ estado: 'nada' });
  const num = (v: number | string | null | undefined) => (typeof v === 'number' ? v : null);
  const cumple = (ob: typeof objetivos[number], v: number | string | null | undefined): 'si' | 'no' | 'ni' => {
    if (ob.min == null && ob.max == null) return 'ni';
    const n = num(v); if (n == null) return 'ni';
    return (ob.min == null || n >= ob.min) && (ob.max == null || n <= ob.max) ? 'si' : 'no';
  };
  const valorDe = (o: typeof opciones[number], campo: string) => (campo === 'precio' ? o.precio ?? null : o.valores[campo] ?? null);
  const lista = useMemo(() => {
    const l = [...opciones];
    if (orden) l.sort((a, b) => { const x = num(valorDe(a, orden)), y = num(valorDe(b, orden)); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return x - y; });
    return l;
  }, [opciones, orden]);
  const fmtV = (ob: typeof objetivos[number], v: number | string | null | undefined) => v == null ? '—' : typeof v === 'number' ? `${v.toLocaleString('es-ES')}${ob.unidad ? ' ' + ob.unidad : ''}` : String(v);
  const textoBusqueda = () => [
    `BÚSQUEDA DE PROVEEDORES · ${d.nombre} (Aeromóvil 1, humanity.wiki) · ${new Date().toLocaleDateString('es-ES')}`,
    '',
    'Objetivo de compra (son objetivos, no prestaciones verificadas de nadie):',
    ...objetivos.map(o => `- ${o.nombre}: ${o.texto ?? `${o.min ?? ''}${o.min != null && o.max != null ? '–' : ''}${o.max ?? ''} ${o.unidad ?? ''}`.trim()}${o.nota ? ` (${o.nota})` : ''}`),
    '',
    'Opciones ya conocidas (no repetirlas; buscar otras parecidas o mejores):',
    ...opciones.map(o => `- ${marcadas[o.nombre] ? '[en juego]' : '[descartada]'} ${o.nombre} · ${o.fabricante} (${o.pais})${o.web ? ' · ' + o.web : ''} · ${objetivos.map(ob => `${ob.nombre}: ${fmtV(ob, valorDe(o, ob.campo))}`).join(', ')}${o.precioNota ? ' · ' + o.precioNota : ''}${o.nota ? ' · ' + o.nota : ''}`),
    '',
    'Respuestas de Eugenio a las preguntas abiertas:',
    ...(d.preguntasBusqueda ?? []).map((q, i) => `- ${q.pregunta} → ${respuestas[i] ?? '(sin responder)'}`),
    '',
    'Qué pedir a cada fabricante en la oferta:',
    ...(d.datosDeOferta ?? []).map(x => `- ${x}`),
    '',
    'Encargo: buscar fabricantes OEM (China y Europa) que suministren el conjunto de forma repetible, con web real comprobada, y devolver para cada uno: nombre, país, web, producto, potencia continua y pico, pesos, tensión, precio si lo publican, y un borrador de correo de petición de oferta. Marcar «por verificar» lo que no se haya podido comprobar. Añadir las opciones nuevas a `opcionesCompra` en `src/components/aeromovil/departamentos/${d.id}.ts`.',
  ].join('\n');
  const pedir = async () => {
    setEnvio({ estado: 'enviando' });
    const texto = textoBusqueda();
    try {
      let autor = ''; try { autor = localStorage.getItem('aeromovil.autor') || ''; } catch { /* nada */ }
      const r = await fetch('/api/aeromovil/tareas', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, area: d.id === 'propulsion' ? 'motor' : 'general', autor, web: '' }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se ha podido apuntar la búsqueda.');
      setEnvio({ estado: 'listo', texto });
    } catch (e: any) { setEnvio({ estado: 'error', error: e?.message, texto }); }
  };
  const colores = { si: 'bg-emerald-50 text-emerald-800', no: 'bg-amber-50 text-amber-800', ni: 'text-slate-500' };
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Objetivo de compra</h3>
        <ul className="grid gap-1.5 sm:grid-cols-3">
          {objetivos.map(o => (
            <li key={o.campo} className="rounded-md border border-slate-200 px-2 py-1.5 text-[12.5px]">
              <div className="flex items-baseline justify-between gap-2"><span className="text-slate-600">{o.nombre}</span><span className="font-mono text-slate-900">{o.texto ?? `${o.min != null ? o.min.toLocaleString('es-ES') : ''}${o.min != null && o.max != null ? '–' : ''}${o.max != null ? o.max.toLocaleString('es-ES') : ''} ${o.unidad ?? ''}`}</span></div>
              {o.nota && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{o.nota}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-slate-500">Son objetivos de compra, no prestaciones verificadas de ningún proveedor.</p>
      </section>
      {opciones.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Opciones encontradas <span className="font-normal normal-case tracking-normal">· pincha una columna para ordenar · verde cumple, ámbar no, gris sin dato</span></h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="py-1 pr-2"></th><th className="py-1 pr-2">Opción</th>
                  {objetivos.filter(o => o.min != null || o.max != null).map(o => <th key={o.campo} className={cn('cursor-pointer py-1 pr-2 text-right hover:text-teal-800', orden === o.campo && 'text-teal-800')} onClick={() => setOrden(orden === o.campo ? null : o.campo)}>{o.nombre}{orden === o.campo ? ' ↑' : ''}</th>)}
                  <th className="py-1">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(o => (
                  <tr key={o.nombre} className={cn('border-t border-slate-100 align-top', !marcadas[o.nombre] && 'opacity-50')}>
                    <td className="py-1.5 pr-1"><input type="checkbox" checked={!!marcadas[o.nombre]} onChange={e => setMarcadas(m => ({ ...m, [o.nombre]: e.target.checked }))} aria-label={`Incluir ${o.nombre} en la búsqueda`} className="accent-teal-700" /></td>
                    <td className="py-1.5 pr-2">
                      <div className="font-medium text-slate-900">{o.web ? <a href={o.web} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-800 hover:underline">{o.nombre}<ExternalLink className="h-3 w-3" /></a> : o.nombre}</div>
                      <div className="text-[11px] text-slate-500">{o.fabricante} · {o.pais} · {o.tipo}{o.verificado ? '' : ' · por verificar'}</div>
                      {o.nota && <div className="mt-0.5 max-w-md text-[11px] leading-snug text-slate-600">{o.nota}</div>}
                    </td>
                    {objetivos.filter(ob => ob.min != null || ob.max != null).map(ob => { const v = valorDe(o, ob.campo), c = cumple(ob, v); const n = num(v); const lo = ob.min ?? 0, hi = ob.max ?? (lo * 2 || 1), esc = Math.max(hi * 1.6, n ?? 0); return (
                      <td key={ob.campo} className={cn('py-1.5 pr-2 text-right font-mono tabular-nums', colores[c])} title={ob.campo === 'precio' ? o.precioNota : undefined}>
                        {fmtV(ob, v)}
                        {n != null && <div className="relative mt-0.5 h-1 w-20 rounded bg-slate-100"><div className="absolute h-1 rounded bg-emerald-200" style={{ left: `${(lo / esc) * 100}%`, width: `${((hi - lo) / esc) * 100}%` }} /><div className={cn('absolute top-1/2 h-2 w-0.5 -translate-y-1/2', c === 'si' ? 'bg-emerald-700' : 'bg-amber-600')} style={{ left: `${Math.min(100, (n / esc) * 100)}%` }} /></div>}
                      </td>); })}
                    <td className="py-1.5 text-[11px] text-slate-600">{o.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {d.datosDeOferta?.length ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Qué pedir en cada oferta (de fabricación, no precios minoristas)</h3>
          <ul className="list-disc space-y-0.5 pl-5 text-[12.5px] text-slate-700">{d.datosDeOferta.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      ) : null}
      {d.preguntasBusqueda?.length ? (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Preguntas abiertas para orientar la búsqueda</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {d.preguntasBusqueda.map((q, i) => (
              <fieldset key={i} className="rounded-md border border-slate-200 p-2">
                <legend className="px-1 text-[12px] font-medium text-slate-800">{q.pregunta}</legend>
                {q.opciones.map(op => <label key={op} className="flex items-center gap-1.5 py-0.5 text-[12px] text-slate-700"><input type="radio" name={`q${i}`} checked={respuestas[i] === op} onChange={() => setRespuestas(r => ({ ...r, [i]: op }))} className="accent-teal-700" />{op}</label>)}
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-lg border border-teal-200 bg-teal-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12.5px] text-teal-900"><span className="font-semibold">Pedir búsqueda a Claude.</span> Deja en «Tareas» un encargo con los objetivos, las opciones en juego, tus respuestas y la lista de datos a pedir, para que la sesión de Claude Code (con la suscripción, sin coste por consulta) busque proveedores nuevos y los añada aquí.</div>
          <Button variant="outline" onClick={pedir} disabled={envio.estado === 'enviando'} className="gap-1 bg-white px-3 py-1.5 text-xs normal-case tracking-normal"><Search className="h-3.5 w-3.5" />{envio.estado === 'enviando' ? 'Apuntando…' : 'Pedir búsqueda a Claude'}</Button>
        </div>
        {envio.estado === 'error' && <p className="mt-2 text-[12px] text-red-700">{envio.error}</p>}
        {(envio.estado === 'listo' || envio.estado === 'error') && envio.texto && (
          <details className="mt-2" open={envio.estado === 'error'}>
            <summary className="cursor-pointer text-[12px] text-teal-800">{envio.estado === 'listo' ? 'Apuntado en Tareas. Ver el encargo (y copiarlo para pegarlo en un chat de Claude)' : 'El encargo, para copiarlo a mano'}</summary>
            <div className="mt-1 flex justify-end"><Button variant="ghost" onClick={() => navigator.clipboard?.writeText(envio.texto!)} className="gap-1 px-2 py-1 text-[11px] normal-case tracking-normal"><Copy className="h-3 w-3" />Copiar</Button></div>
            <pre className="whitespace-pre-wrap rounded-md bg-white p-2 font-sans text-[11.5px] leading-relaxed text-slate-700">{envio.texto}</pre>
          </details>
        )}
      </section>
    </div>
  );
}

/** Las dos versiones del chasis, lado a lado: peso, tubos, nudos, triángulos y rigidez estimada. */
export function ComparacionChasis({ modelo }: { modelo: Modelo }) {
  const ev = useMemo<[EvaluacionChasis, EvaluacionChasis] | null>(() => {
    if (modelo.tipo !== 'a1') return null;
    const m = modelo as any;
    try {
      const c = m.contextoChasis();
      const v1 = evaluarChasis('largueros', m.tubosEstructuraV1(), c);
      const v2 = evaluarChasis('celosia', tubosCelosia(c), c);
      return [v1, v2];
    } catch { return null; }
  }, [modelo]);
  if (!ev) return null;
  const f = (v: number | null, u: string, d = 0) => (v == null ? '—' : `${v.toLocaleString('es-ES', { maximumFractionDigits: d })} ${u}`);
  const filas: [string, (e: EvaluacionChasis) => string][] = [
    ['Peso de la estructura', e => f(e.masaKg, 'kg', 1)], ['Tubos', e => f(e.nTubos, '')], ['Metros de tubo', e => f(e.largoM, 'm', 1)],
    ['Nudos', e => f(e.nNudos, '')], ['Triángulos', e => f(e.triangulos, '')],
    ['Rigidez a torsión', e => f(e.rigidezTorsion, 'N·m/°')], ['Rigidez a flexión', e => f(e.rigidezFlexion, 'N/mm')],
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <table className="w-full text-[12px]">
        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-500"><th className="py-0.5"></th><th className="py-0.5 text-right">v1 largueros</th><th className="py-0.5 text-right">v2 celosía</th></tr></thead>
        <tbody>{filas.map(([n, g]) => <tr key={n}><td className="py-0.5 text-slate-600">{n}</td><td className="py-0.5 text-right font-mono tabular-nums">{g(ev[0])}</td><td className="py-0.5 text-right font-mono tabular-nums">{g(ev[1])}</td></tr>)}</tbody>
      </table>
      {[...ev[0].notas, ...ev[1].notas].filter(n => n !== 'pendiente').slice(0, 4).map((n, i) => <p key={i} className="mt-1 text-[11px] leading-snug text-slate-500">{n}</p>)}
      {ev[1].notas.includes('pendiente') && <p className="mt-1 text-[11px] text-slate-500">La versión 2 la está diseñando un bot: cuando termine, aquí saldrán sus números.</p>}
    </div>
  );
}
