/**
 * The «Compras» page (2026-11-27). Whole page, like «Homologación»: the 3D, the garage and the side panel are hidden.
 * First and only purchase studied so far: the body shell, the project's bottleneck (Eugenio: «Nuestro factor limitante
 * es encontrar esto… necesitamos un carenado»). Every option found, ranked, with filters; nothing is bought from here.
 */
import { useMemo, useState } from 'react';
import { ExternalLink, ShoppingCart, Star } from 'lucide-react';
import { Badge, Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { CATEGORIAS, OPCIONES_CARENADO, RECOMENDACION, VIAS, FECHA_BUSQUEDA } from './carenado';
import type { CategoriaCompra, OpcionCompra, Via } from './tipos';

type Orden = 'puntuacion' | 'parecido' | 'precio';

/** The rank: likeness first, then whether it can actually be bought, then whether its price is known. */
export function puntuacion(o: OpcionCompra): number {
  const estado = { disponible: 1, 'bajo-pedido': 0.9, 'segunda-mano': 0.7, prototipo: 0.3, descatalogado: 0.2, 'no-se-vende': 0 }[o.estado];
  const via = { comprar: 1, adaptar: 0.8, 'a-medida': 0.7, referencia: 0 }[o.via];
  return Math.round(o.parecido * 14 + estado * 15 + via * 10 + (o.precioEur != null ? 5 : 0));
}

const eurTxt = (n: number | null) => (n == null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €');

function Estrellas({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`Parecido ${n} de 5`} title={`Parecido con el render: ${n} de 5`}>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} className={cn('h-3.5 w-3.5', i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />)}
    </span>
  );
}

function Tarjeta({ o, puesto }: { o: OpcionCompra; puesto: number }) {
  const [abierta, setAbierta] = useState(false);
  const cat = CATEGORIAS[o.categoria];
  return (
    <li className="rounded-lg border border-slate-200 bg-white">
      <Button variant="ghost" onClick={() => setAbierta(a => !a)} aria-expanded={abierta}
        className="grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 rounded-lg px-3 py-2 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
        <span className="row-span-2 pt-0.5 font-mono text-xs text-slate-400">{puesto}</span>
        <span className="min-w-0">
          <span className="font-semibold text-slate-900">{o.nombre}</span>
          <span className="text-slate-500"> · {o.proveedor} ({o.pais})</span>
        </span>
        <span className="text-right font-mono text-xs tabular-nums text-slate-800">{o.precioEur != null ? eurTxt(o.precioEur) : o.estimacion ? 'estimado' : 'a consultar'}</span>
        <span className="col-start-2 flex flex-wrap items-center gap-1.5">
          <Estrellas n={o.parecido} />
          <Badge>{cat}</Badge>
          <Badge variant={o.via === 'comprar' ? 'success' : o.via === 'referencia' ? 'default' : 'info'}>{VIAS[o.via]}</Badge>
          {o.estado !== 'disponible' && <Badge variant="warning">{ESTADO[o.estado]}</Badge>}
          {o.ruedasFuera && <Badge variant="info">ruedas fuera</Badge>}
        </span>
        <span className="col-start-3 row-start-2 text-right text-[11px] text-slate-400">{puntuacion(o)} pts</span>
      </Button>
      {abierta && (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-3 pb-3 pt-2 text-[13px] text-slate-700 sm:pl-14">
          <p><span className="font-semibold">Por qué se parece (o no):</span> {o.porQueParecido}</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-slate-500">Qué se compra</dt><dd>{o.queSeCompra}</dd>
            <dt className="text-slate-500">Precio</dt><dd>{o.precio}</dd>
            {o.estimacion && <><dt className="text-slate-500">Estimación</dt><dd>{o.estimacion}</dd></>}
            {o.medidas && <><dt className="text-slate-500">Medidas</dt><dd>{o.medidas}</dd></>}
            {o.plazas && <><dt className="text-slate-500">Plazas</dt><dd>{o.plazas}</dd></>}
            {o.material && <><dt className="text-slate-500">Material</dt><dd>{o.material}</dd></>}
            {o.plazo && <><dt className="text-slate-500">Plazo</dt><dd>{o.plazo}</dd></>}
            <dt className="text-slate-500">Comprobado</dt><dd>{o.verificado}</dd>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            <div><p className="text-xs font-semibold text-emerald-700">A favor</p><ul className="list-disc pl-4 text-xs">{o.pros.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
            <div><p className="text-xs font-semibold text-red-700">En contra</p><ul className="list-disc pl-4 text-xs">{o.contras.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
          </div>
          {o.notas && <p className="text-xs text-slate-500">{o.notas}</p>}
          <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-start text-xs font-semibold text-teal-700 underline">
            Abrir la página del proveedor <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </li>
  );
}

const ESTADO: Record<OpcionCompra['estado'], string> = {
  disponible: 'disponible', 'bajo-pedido': 'bajo pedido', 'segunda-mano': 'segunda mano', prototipo: 'solo prototipo', descatalogado: 'descatalogado', 'no-se-vende': 'no se vende',
};

export function PaginaCompras() {
  const [via, setVia] = useState<Via | 'todas'>('todas');
  const [cat, setCat] = useState<CategoriaCompra | 'todas'>('todas');
  const [minParecido, setMinParecido] = useState(1);
  const [conPrecio, setConPrecio] = useState(false);
  const [orden, setOrden] = useState<Orden>('puntuacion');
  const [texto, setTexto] = useState('');

  const lista = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const l = OPCIONES_CARENADO.filter(o => (via === 'todas' || o.via === via) && (cat === 'todas' || o.categoria === cat) && o.parecido >= minParecido
      && (!conPrecio || o.precioEur != null) && (!q || `${o.nombre} ${o.proveedor} ${o.pais} ${o.notas ?? ''}`.toLowerCase().includes(q)));
    const k = orden === 'precio' ? (o: OpcionCompra) => o.precioEur ?? Infinity : orden === 'parecido' ? (o: OpcionCompra) => -o.parecido * 1000 - puntuacion(o) : (o: OpcionCompra) => -puntuacion(o);
    return [...l].sort((a, b) => k(a) - k(b));
  }, [via, cat, minParecido, conPrecio, orden, texto]);

  const porVia = useMemo(() => Object.fromEntries((Object.keys(VIAS) as Via[]).map(v => [v, OPCIONES_CARENADO.filter(o => o.via === v).length])), []);
  const cats = useMemo(() => [...new Set(OPCIONES_CARENADO.map(o => o.categoria))], []);

  return (
    <section aria-label="Compras" className="mx-auto flex max-w-6xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ShoppingCart className="h-5 w-5 text-teal-700" />Compras · Carenado del cuadriciclo</h2>
        <p className="text-[13px] text-slate-600">
          El cuello de botella del proyecto: una carrocería con la forma del vehículo de producción —cabina estrecha en forma de gota, dos plazas
          en tándem, cúpula grande y las cuatro ruedas fuera, cada una en su carenado—. Ruedas, motor, batería y un bastidor de tubo de acero se
          pueden hacer o comprar aparte. Aquí están todas las opciones encontradas en internet ({OPCIONES_CARENADO.length}), clasificadas.
          Búsqueda del {FECHA_BUSQUEDA}; los precios son los que enseñaba cada página ese día.
        </p>
      </header>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-950">
        <p className="font-semibold">Recomendación</p>
        <ul className="mt-1 list-disc pl-4">{RECOMENDACION.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {(Object.keys(VIAS) as Via[]).map(v => (
          <Button key={v} variant={via === v ? 'primary' : 'outline'} onClick={() => setVia(a => (a === v ? 'todas' : v))} aria-pressed={via === v}
            className="flex-col items-start gap-0.5 px-3 py-2 text-left normal-case tracking-normal">
            <span className="text-[13px]">{VIAS[v]}</span><span className="text-[11px] font-normal opacity-80">{porVia[v]} opciones</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">Tipo
          <select value={cat} onChange={e => setCat(e.target.value as CategoriaCompra | 'todas')} className="rounded border border-slate-200 px-1.5 py-1">
            <option value="todas">Todos</option>
            {cats.map(c => <option key={c} value={c}>{CATEGORIAS[c]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">Parecido mínimo
          <select value={minParecido} onChange={e => setMinParecido(Number(e.target.value))} className="rounded border border-slate-200 px-1.5 py-1">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">Ordenar
          <select value={orden} onChange={e => setOrden(e.target.value as Orden)} className="rounded border border-slate-200 px-1.5 py-1">
            <option value="puntuacion">Mejor opción primero</option>
            <option value="parecido">Más parecido primero</option>
            <option value="precio">Más barato primero</option>
          </select>
        </label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={conPrecio} onChange={e => setConPrecio(e.target.checked)} />Solo con precio</label>
        <input type="search" value={texto} onChange={e => setTexto(e.target.value)} placeholder="Buscar proveedor o país" className="min-w-40 flex-1 rounded border border-slate-200 px-2 py-1" />
        <span className="text-slate-500">{lista.length} de {OPCIONES_CARENADO.length}</span>
      </div>

      <ol className="flex flex-col gap-1.5">{lista.map((o, i) => <Tarjeta key={o.id} o={o} puesto={i + 1} />)}</ol>

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">Cómo se clasifica</summary>
        <p className="mt-1">
          Cada opción lleva de 1 a 5 estrellas de parecido con el render (5: cabina estrecha en gota, tándem, ruedas fuera en carenados). La
          puntuación suma el parecido (14 puntos por estrella), si se puede comprar hoy (hasta 15), si es la carrocería tal cual, a adaptar o a
          medida (hasta 10) y si tiene precio publicado (5). Las de «solo referencia» no se venden: están para aprender de ellas. Un precio
          «estimado» no es del proveedor: lo dice la ficha. Nada se compra desde aquí; pedir presupuesto es el siguiente paso.
        </p>
      </details>
    </section>
  );
}
