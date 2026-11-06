// ============================================================================
// AEROMÓVIL 1 · páginas de componentes (2026-11-06)
// ============================================================================
//   /aeromovil/componentes        la lista por grupos, con peso y coste totales
//   /aeromovil/componentes/:id    la ficha: qué es, características, peso,
//                                 coste, proveedores y alternativas
// Los datos están en `componentes.ts`. Elegir una alternativa cambia el diseño
// (sus parámetros) y se guarda con él.
import { Fragment, useMemo, useState } from 'react';
import { ArrowLeft, Box, Check, ExternalLink, Feather, Pencil, PiggyBank, RotateCcw, Scale } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { CAPAS, type CapaId } from './Visor3D';
import { areas, calcular, crearModelo } from './geometria';
import type { Modelo, Parametros, Resultados } from './geometria';
import { COMPONENTES, GRUPOS, alternativaElegida, componentePorId, elegirAlternativa, escribirPieza, fichaComponente, totalesComponentes, type Alternativa, type Componente } from './componentes';

const eur = (v: number) => `${Math.round(v).toLocaleString('es-ES')} €`;
const kg = (v: number) => `${v.toLocaleString('es-ES', { minimumFractionDigits: v < 10 ? 1 : 0, maximumFractionDigits: v < 10 ? 1 : 0 })} kg`;

interface Props {
  P: Parametros; res: Resultados; modelo: Modelo; id?: string;
  alCambiar: (P: Parametros) => void;
  alNavegar: (ruta: string) => void;
  alVerEn3D: (capa: CapaId) => void;
}

export function VistaComponentes({ P, res, modelo, id, alCambiar, alNavegar, alVerEn3D }: Props) {
  const c = id ? componentePorId(id) : undefined;
  if (id && !c) return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 text-center text-slate-600">
      <p>No hay ningún componente con ese nombre.</p>
      <Button variant="outline" onClick={() => alNavegar('/aeromovil/componentes')} className="mt-3 normal-case tracking-normal"><ArrowLeft className="mr-1.5 h-4 w-4" />Todos los componentes</Button>
    </div>
  );
  return c ? <Ficha c={c} P={P} res={res} modelo={modelo} alCambiar={alCambiar} alNavegar={alNavegar} alVerEn3D={alVerEn3D} /> : <Lista P={P} res={res} modelo={modelo} alNavegar={alNavegar} />;
}

function Ahorro({ a }: { a: Alternativa['ahorra'] }) {
  const Icono = a === 'peso' ? Feather : a === 'coste' ? PiggyBank : Scale;
  return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal-800"><Icono className="h-3 w-3" />menos {a}</span>;
}

function Lista({ P, res, modelo, alNavegar }: Pick<Props, 'P' | 'res' | 'modelo' | 'alNavegar'>) {
  const tot = totalesComponentes(P, res, modelo);
  const elegidas = COMPONENTES.filter(c => alternativaElegida(c, P)).length;
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Componentes del Aeromóvil 1</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Cada pieza con lo que es, lo que pesa, lo que cuesta, quién la vende y qué alternativa la hace más ligera o más barata sin perder lo que hace. El peso sale del modelo 3D; el coste es una estimación de noviembre de 2026 para una unidad, sin IVA.</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Peso del vehículo</dt>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Coste de las piezas</dt>
          <dd className="font-mono text-xl tabular-nums text-slate-900">{kg(res.mVeh)}</dd>
          <dd className="font-mono text-xl tabular-nums text-slate-900">{eur(tot.coste)}</dd>
          {elegidas > 0 && <dd className="col-span-2 mt-1 text-xs text-teal-800">{elegidas} {elegidas === 1 ? 'alternativa elegida' : 'alternativas elegidas'}</dd>}
        </dl>
      </header>
      {GRUPOS.map(g => {
        const cs = COMPONENTES.filter(c => c.grupo === g);
        const masa = cs.reduce((s, c) => s + fichaComponente(c, P, res, modelo).masa, 0), coste = cs.reduce((s, c) => s + fichaComponente(c, P, res, modelo).coste, 0);
        return (
          <section key={g} className="rounded-xl border border-slate-200 bg-white">
            <h3 className="flex items-baseline justify-between border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {g}<span className="font-mono text-[11px] font-normal normal-case tracking-normal text-slate-400">{kg(masa)} · {eur(coste)}</span>
            </h3>
            <ul className="divide-y divide-slate-100">
              {cs.map(c => {
                const f = fichaComponente(c, P, res, modelo);
                return (
                  <li key={c.id}>
                    <Button variant="ghost" onClick={() => alNavegar(`/aeromovil/componentes/${c.id}`)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 rounded-none px-4 py-2.5 text-left font-normal normal-case tracking-normal hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{f.nombre}{f.unidades > 1 && <span className="ml-1.5 font-mono text-xs text-slate-400">× {f.unidades}</span>}{f.manual && <span className="ml-1.5 rounded bg-amber-50 px-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">a mano</span>}</span>
                        <span className="block truncate text-xs text-slate-500">{f.manual?.proveedor ? `Proveedor: ${f.manual.proveedor}` : f.alternativa ? <span className="text-teal-800">Alternativa elegida: {f.alternativa.nombre}</span> : c.caracteristicas.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>
                      </span>
                      <span className="font-mono text-xs tabular-nums text-slate-700">{kg(f.masa)}</span>
                      <span className="w-20 text-right font-mono text-xs tabular-nums text-slate-700">{eur(f.coste)}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-xs text-slate-500">Las alternativas solo incluyen piezas que hacen lo mismo que la de serie: ninguna baja la velocidad, la autonomía ni la seguridad. Los precios vienen de catálogos públicos y hay que confirmarlos con un presupuesto; los enlaces llevan al proveedor.</p>
    </div>
  );
}

function Ficha({ c, P, res, modelo, alCambiar, alNavegar, alVerEn3D }: { c: Componente } & Omit<Props, 'id'>) {
  const f = fichaComponente(c, P, res, modelo);
  // Lo de serie, para las diferencias de cada alternativa: el diseño con este componente sin alternativa.
  const serie = useMemo(() => {
    if (!alternativaElegida(c, P)) return { masa: c.masaKg(P, res, modelo), coste: c.costeEur(P, res, modelo) };
    const Q = elegirAlternativa(P, c, null), mq = crearModelo(Q), rq = calcular(mq, areas(mq));
    return { masa: c.masaKg(Q, rq, mq), coste: c.costeEur(Q, rq, mq) };
  }, [c, P, res, modelo]);
  const serieMasa = serie.masa, serieCoste = serie.coste;
  const capa = CAPAS.find(k => k.k === c.capa)?.n ?? c.capa;
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 py-5">
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Button variant="ghost" onClick={() => alNavegar('/aeromovil/componentes')} className="px-2 py-1 text-sm normal-case tracking-normal text-slate-600"><ArrowLeft className="mr-1 h-4 w-4" />Componentes</Button>
        <span className="text-slate-300">/</span><span className="text-slate-500">{c.grupo}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{f.nombre}{f.manual?.nombre && <span className="ml-2 align-middle text-sm font-normal text-slate-500">({c.nombre})</span>}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.que}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <dl className="grid grid-cols-2 gap-x-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Peso{f.unidades > 1 ? ` (× ${f.unidades})` : ''}</dt>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Coste</dt>
            <dd className="font-mono text-xl tabular-nums text-slate-900">{kg(f.masa)}</dd>
            <dd className="font-mono text-xl tabular-nums text-slate-900">{eur(f.coste)}</dd>
          </dl>
          <Button variant="outline" onClick={() => alVerEn3D(c.capa)} className="bg-white text-xs normal-case tracking-normal"><Box className="mr-1.5 h-3.5 w-3.5" />Ver en el 3D</Button>
        </div>
      </header>

      {f.alternativa && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <Check className="h-4 w-4" />
          <span>Este diseño lleva la alternativa <strong>{f.alternativa.nombre}</strong>{Object.keys(f.alternativa.aplicar).length ? '; sus parámetros ya están aplicados en el diseño 3D.' : '.'}</span>
          <Button variant="outline" onClick={() => alCambiar(elegirAlternativa(P, c, null))} className="ml-auto bg-white text-xs normal-case tracking-normal"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Volver a la de serie</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{f.manual?.caracteristicas?.length ? 'Características (escritas a mano)' : 'Características de la pieza de serie'}</h3>
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-4 gap-y-1.5 text-sm">
            {(f.manual?.caracteristicas?.length ? f.manual.caracteristicas : c.caracteristicas).map(([k, v], i) => <Fragment key={`${k}-${i}`}><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></Fragment>)}
            <dt className="text-slate-500">Capa del 3D</dt><dd className="text-slate-900">{capa}</dd>
            {c.deslizador && <><dt className="text-slate-500">Su peso lo fija</dt><dd className="text-slate-900">el deslizador «{c.deslizador}» de «Peso del vehículo», en el diseño 3D</dd></>}
          </dl>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proveedores</h3>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm">
            {f.manual?.proveedor && (
              <li className="flex flex-col rounded-lg bg-amber-50 px-2.5 py-1.5">
                {f.manual.url ? <a href={f.manual.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-800 underline-offset-2 hover:underline">{f.manual.proveedor}<ExternalLink className="h-3 w-3" /></a> : <span className="font-medium text-slate-900">{f.manual.proveedor}</span>}
                <span className="text-xs text-amber-800">Escrito a mano en esta ficha{f.manual.coste !== undefined ? ` · ${eur(f.manual.coste)}` : ''}</span>
              </li>
            )}
            {c.proveedores.map(p => (
              <li key={p.nombre} className="flex flex-col">
                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-teal-800 underline-offset-2 hover:underline">{p.nombre}<ExternalLink className="h-3 w-3" /></a> : <span className="font-medium text-slate-900">{p.nombre}</span>}
                {p.nota && <span className="text-xs text-slate-500">{p.nota}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <FormularioPieza c={c} P={P} res={res} modelo={modelo} alCambiar={alCambiar} />

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Alternativas sin perder funcionalidad</h3>
        {c.alternativas.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No hay una alternativa que pese o cueste menos y haga lo mismo: lo de serie ya es lo mínimo.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {c.alternativas.map(a => {
              const elegida = f.alternativa?.id === a.id;
              const dMasa = a.masaKg - serieMasa, dCoste = a.costeEur - serieCoste;
              return (
                <article key={a.id} className={cn('flex flex-col gap-2 rounded-xl border bg-white p-4', elegida ? 'border-teal-700 ring-1 ring-teal-700' : 'border-slate-200')}>
                  <div className="flex flex-wrap items-center gap-2"><Ahorro a={a.ahorra} />{elegida && <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800">elegida</span>}</div>
                  <h4 className="text-base font-semibold text-slate-900">{a.nombre}</h4>
                  <p className="text-sm text-slate-700">{a.descripcion}</p>
                  <dl className="grid grid-cols-2 gap-x-4 text-sm">
                    <dt className="text-xs text-slate-500">Peso</dt><dt className="text-xs text-slate-500">Coste</dt>
                    <dd className="font-mono tabular-nums text-slate-900">{kg(a.masaKg)} <span className={cn('text-xs', dMasa < 0 ? 'text-emerald-700' : 'text-amber-700')}>({dMasa > 0 ? '+' : ''}{kg(dMasa)})</span></dd>
                    <dd className="font-mono tabular-nums text-slate-900">{eur(a.costeEur)} <span className={cn('text-xs', dCoste < 0 ? 'text-emerald-700' : 'text-amber-700')}>({dCoste > 0 ? '+' : ''}{eur(dCoste)})</span></dd>
                  </dl>
                  {a.proveedor && (
                    <p className="text-xs text-slate-500">
                      {a.proveedor.url ? <a href={a.proveedor.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-800 underline-offset-2 hover:underline">{a.proveedor.nombre}<ExternalLink className="h-3 w-3" /></a> : a.proveedor.nombre}
                      {a.proveedor.nota && ` · ${a.proveedor.nota}`}
                    </p>
                  )}
                  <div className="mt-auto pt-1">
                    {elegida
                      ? <Button variant="outline" onClick={() => alCambiar(elegirAlternativa(P, c, null))} className="text-xs normal-case tracking-normal"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Volver a la de serie</Button>
                      : <Button variant="primary" onClick={() => alCambiar(elegirAlternativa(P, c, a))} className="text-xs normal-case tracking-normal"><Check className="mr-1.5 h-3.5 w-3.5" />Usar esta en el diseño</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/** Escribir a mano la pieza real: nombre, proveedor, precio, peso y características. Se guarda con el diseño. */
function FormularioPieza({ c, P, res, modelo, alCambiar }: { c: Componente } & Pick<Props, 'P' | 'res' | 'modelo' | 'alCambiar'>) {
  const manual = P.piezas?.[c.id];
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(manual?.nombre ?? '');
  const [proveedor, setProveedor] = useState(manual?.proveedor ?? '');
  const [url, setUrl] = useState(manual?.url ?? '');
  const [coste, setCoste] = useState(manual?.coste !== undefined ? String(manual.coste) : '');
  const [masa, setMasa] = useState(manual?.masa !== undefined ? String(manual.masa) : '');
  const [carac, setCarac] = useState((manual?.caracteristicas ?? []).map(([k, v]) => `${k}: ${v}`).join('\n'));
  const num = (t: string) => { const v = Number(t.replace(',', '.')); return t.trim() !== '' && Number.isFinite(v) && v >= 0 ? v : undefined; };
  const guardar = () => {
    const caracteristicas = carac.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); return (i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, '']) as [string, string]; });
    const datos = { nombre: nombre.trim() || undefined, proveedor: proveedor.trim() || undefined, url: /^https?:\/\//.test(url.trim()) ? url.trim() : undefined, coste: num(coste), masa: num(masa), caracteristicas: caracteristicas.length ? caracteristicas : undefined };
    const vacio = Object.values(datos).every(v => v === undefined);
    alCambiar(escribirPieza(c, P, res, modelo, vacio ? null : datos)); setAbierto(false);
  };
  const borrar = () => { alCambiar(escribirPieza(c, P, res, modelo, null)); setNombre(''); setProveedor(''); setUrl(''); setCoste(''); setMasa(''); setCarac(''); setAbierto(false); };
  const campo = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-teal-700 focus:outline-none';
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">La pieza real, escrita a mano</h3>
        {!abierto && <Button variant="outline" onClick={() => setAbierto(true)} className="text-xs normal-case tracking-normal"><Pencil className="mr-1.5 h-3.5 w-3.5" />{manual ? 'Editar' : 'Añadir datos'}</Button>}
      </div>
      {!abierto && <p className="mt-1 text-sm text-slate-600">{manual ? 'Esta ficha lleva datos tuyos (precio, proveedor, peso o características). Se guardan con el diseño y mandan sobre la estimación.' : 'Cuando tengas un presupuesto o la pieza elegida, escribe aquí su nombre, proveedor, precio, peso y características: el peso entra en el 3D y en el total, y el precio sustituye a la estimación.'}</p>}
      {abierto && (
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={e => { e.preventDefault(); guardar(); }}>
          <label className="flex flex-col gap-1 text-xs text-slate-600">Nombre de la pieza<input className={campo} value={nombre} onChange={e => setNombre(e.target.value)} placeholder={c.nombre} /></label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">Proveedor<input className={campo} value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Marca o tienda" /></label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">Enlace del proveedor<input className={campo} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" inputMode="url" /></label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">Precio total, sin IVA (€){typeof c.unidades === 'number' && c.unidades > 1 ? ` · las ${c.unidades} unidades` : ''}<input className={campo} value={coste} onChange={e => setCoste(e.target.value)} placeholder="p. ej. 1450" inputMode="decimal" /></label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">Peso por unidad (kg)<input className={campo} value={masa} onChange={e => setMasa(e.target.value)} placeholder="p. ej. 12,5" inputMode="decimal" /></label>
          <label className="flex flex-col gap-1 text-xs text-slate-600 md:col-span-2">Características físicas, una por línea («Potencia: 15 kW»)<textarea className={cn(campo, 'min-h-24 font-mono text-xs')} value={carac} onChange={e => setCarac(e.target.value)} placeholder={c.caracteristicas.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join('\n')} /></label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" variant="primary" className="text-xs normal-case tracking-normal"><Check className="mr-1.5 h-3.5 w-3.5" />Guardar en el diseño</Button>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="text-xs normal-case tracking-normal">Cancelar</Button>
            {manual && <Button type="button" variant="ghost" onClick={borrar} className="text-xs normal-case tracking-normal text-red-700"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Quitar lo escrito a mano</Button>}
          </div>
          {c.parametroMasa === undefined && !['cargador', 'cableado', 'puertas', 'maleteros', 'luces'].includes(c.id) && <p className="text-xs text-slate-500 md:col-span-2">El peso de esta pieza sale del modelo; lo que escribas aquí no lo cambia.</p>}
        </form>
      )}
    </section>
  );
}

/** Los botones de la barra lateral: uno por componente, agrupados. */
export function BotonesComponentes({ P, res, modelo, alNavegar }: Pick<Props, 'P' | 'res' | 'modelo' | 'alNavegar'>) {
  const tot = totalesComponentes(P, res, modelo);
  return (
    <div className="flex flex-col gap-2">
      {GRUPOS.map(g => (
        <div key={g}>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
          <div className="flex flex-wrap gap-1">
            {COMPONENTES.filter(c => c.grupo === g).map(c => {
              const alt = alternativaElegida(c, P);
              return (
                <Button key={c.id} variant="outline" onClick={() => alNavegar(`/aeromovil/componentes/${c.id}`)} title={alt ? `Alternativa: ${alt.nombre}` : c.nombre}
                  className={cn('px-2 py-1 text-xs font-medium normal-case tracking-normal', alt && 'border-teal-700 bg-teal-50 text-teal-900')}>{c.corto}</Button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-slate-500">Piezas: <span className="font-mono tabular-nums">{eur(tot.coste)}</span> estimados. También puedes pinchar una pieza en el 3D.</p>
    </div>
  );
}
