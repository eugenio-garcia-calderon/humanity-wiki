import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Clock, Loader2, CalendarCheck, ChevronLeft, Settings2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { PropsLectura } from '../tipos';
import { pedir, euros, parametro } from '../chat/api';
import Conversacion from '../chat/Conversacion';
import Gestion from './Gestion';
import { useSitio } from '../../sitio/ContextoSitio';

/** `compacto`: la versión para la ficha de un producto (una línea por experto,
 *  sin panel de gestión, y nada si no hay expertos). `pagina`: la página del
 *  sitio con todos los expertos, para enlazarla desde la versión compacta. */
export type DatosExperto = { titulo?: string; intro?: string; expertos?: string[]; compacto?: boolean; pagina?: string };

export type Experto = {
  id: string; nombre: string; especialidad: string | null; bio: string | null; foto: string | null;
  precioCentimos: number; moneda: string; duracionMin: number; comisionBps: number; zonaHoraria: string;
  proximo?: string | null; huecosLibres?: number;
};
type Hueco = { inicio: string; fin: string };
type Lista = { sitio: string; equipo: boolean; soyExperto: boolean; pagosActivos: boolean; pagosEnPruebas?: boolean; expertos: Experto[] };

/** ¿Se puede llegar al pago de este experto? Con la clave de pruebas de
 *  Stripe una tarjeta de verdad se rechaza: sólo el equipo prueba (con 4242). */
const sePuedePagar = (l: Lista, e: Experto) => !e.precioCentimos || (l.pagosActivos && (!l.pagosEnPruebas || l.equipo));
const PRONTO = 'Muy pronto podrás reservar y pagar aquí.';

/**
 * EL BLOQUE «RESERVAR EXPERTO» (3.12 del plan de Wikiproducts).
 *
 * Los expertos del sitio, con su precio, cuánto de ese precio se queda el
 * sitio (la comisión es pública o no es transparente) y su agenda. Se elige
 * un hueco, se paga, y se abre una conversación con el experto.
 *
 * Al equipo del sitio, además, le sale el panel para dar de alta expertos y
 * ver las consultas; al experto, el suyo (su agenda y sus consultas).
 */
export default function ReservarExperto({ datos, paginaId }: PropsLectura) {
  const d = datos as DatosExperto;
  const ids = (Array.isArray(d.expertos) ? d.expertos : []).filter(x => typeof x === 'string');
  const [lista, setLista] = useState<Lista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState<Experto | null>(null);
  const [gestionar, setGestionar] = useState(false);
  const [vuelta, setVuelta] = useState<{ estado: string; conversacion?: string; mensaje?: string } | null>(null);

  const cargar = useCallback(async () => {
    if (!paginaId) return;
    try {
      setLista(await pedir(`/api/expertos/sitio/${encodeURIComponent(paginaId)}${ids.length ? `?ids=${ids.map(encodeURIComponent).join(',')}` : ''}`));
      setError(null);
    } catch (e: any) { setError(e.message); }
  }, [paginaId, ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void cargar(); }, [cargar]);

  // LA VUELTA DEL PAGO: Stripe devuelve a esta misma página con la consulta
  // y la sesión. Se le pregunta al servidor, que se lo pregunta a Stripe.
  useEffect(() => {
    const consulta = parametro('consulta');
    if (!consulta) return;
    if (parametro('cancelada')) { setVuelta({ estado: 'cancelada', mensaje: 'Has salido del pago sin pagar. El hueco queda libre otra vez en unos minutos.' }); return; }
    const sesion = parametro('sesion');
    if (!sesion) return;
    let intentos = 0;
    const comprobar = async () => {
      try {
        const r = await pedir<{ estado: string; conversacion?: string; pendiente?: boolean; reembolso?: boolean }>(
          `/api/expertos/consultas/${encodeURIComponent(consulta)}/confirmar`, { metodo: 'POST', cuerpo: { sesion } });
        if (r.pendiente && intentos++ < 5) { setTimeout(comprobar, 2000); setVuelta({ estado: 'comprobando' }); return; }
        setVuelta({ estado: r.estado, conversacion: r.conversacion });
      } catch (e: any) { setVuelta({ estado: 'error', mensaje: e.message }); }
    };
    void comprobar();
  }, []);

  if (!paginaId) return <p className="text-sm text-slate-400">La reserva de expertos funciona en una página guardada.</p>;
  if (d.compacto) {
    // En una ficha, un bloque vacío o con un error es ruido: no sale nada
    // (salvo al equipo, que tiene que saber por qué no sale).
    if (error || !lista) return null;
    if (!lista.expertos.length && !lista.equipo && !vuelta) return null;
    return <Compacto d={d} lista={lista} paginaId={paginaId} vuelta={vuelta} elegido={elegido} setElegido={setElegido} cargar={cargar} />;
  }
  if (error) return <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">{error}</p>;
  if (!lista) return <div className="flex h-24 items-center justify-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  return (
    <section className="space-y-3">
      {vuelta && <AvisoVuelta vuelta={vuelta} />}
      <header className="flex flex-wrap items-start gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <GraduationCap className="h-5 w-5 text-emerald-500" /> {d.titulo || 'Pide consejo a un experto'}
          </h3>
          {d.intro && <p className="mt-1 text-sm text-slate-600">{d.intro}</p>}
        </div>
        {/* El equipo gestiona todos; un experto del sitio, sólo lo suyo. */}
        {(lista.equipo || lista.soyExperto) && (
          <Button variant="outline" className="ml-auto normal-case tracking-normal" onClick={() => setGestionar(g => !g)}>
            <Settings2 className="mr-1 h-4 w-4" /> {gestionar ? 'Cerrar la gestión' : lista.equipo ? 'Gestionar expertos' : 'Mi agenda y mis consultas'}
          </Button>
        )}
      </header>

      {gestionar && <Gestion paginaId={paginaId} onCambio={cargar} />}

      {lista.equipo && lista.pagosActivos && lista.pagosEnPruebas && lista.expertos.some(e => e.precioCentimos > 0) && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Stripe está con una clave de pruebas: los visitantes ven «{PRONTO}» en lugar de reservar. Tú puedes probar el pago con la tarjeta 4242 4242 4242 4242.
        </p>
      )}
      {!lista.pagosActivos && lista.expertos.some(e => e.precioCentimos > 0) && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Los pagos todavía no están activados en este servidor: se pueden ver los expertos y sus horarios, pero no reservar consultas de pago.
        </p>
      )}

      {elegido ? (
        <Reserva experto={elegido} paginaId={paginaId} volver={() => { setElegido(null); void cargar(); }} />
      ) : lista.expertos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          {lista.equipo ? 'Todavía no hay expertos. Da de alta el primero en «Gestionar expertos».' : 'Todavía no hay expertos disponibles en este sitio.'}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.expertos.map(e => (
            <li key={e.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-3">
                {e.foto
                  ? <img src={e.foto} alt="" className="h-14 w-14 rounded-full object-cover" loading="lazy" />
                  : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-lg font-semibold text-emerald-700">{e.nombre.slice(0, 1)}</div>}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{e.nombre}</p>
                  {e.especialidad && <p className="text-sm text-slate-600">{e.especialidad}</p>}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> {e.duracionMin} min · {e.precioCentimos ? euros(e.precioCentimos, e.moneda) : 'Gratis'}
                  </p>
                </div>
              </div>
              {e.bio && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-slate-600">{e.bio}</p>}
              <Comision experto={e} />
              <div className="mt-auto flex items-center gap-2 pt-3">
                <Button onClick={() => setElegido(e)} disabled={!e.huecosLibres || !sePuedePagar(lista, e)}>Ver horarios</Button>
                <span className="text-xs text-slate-500">
                  {!sePuedePagar(lista, e) && lista.pagosActivos ? PRONTO : e.proximo ? `Próximo hueco: ${new Date(e.proximo).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Sin huecos libres en las próximas tres semanas'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * La versión de la ficha de un producto: «¿Dudas antes de comprar?» y una
 * línea por experto con su precio. Al elegir uno se abre aquí mismo la misma
 * reserva que en la página de expertos.
 */
function Compacto({ d, lista, paginaId, vuelta, elegido, setElegido, cargar }: {
  d: DatosExperto; lista: Lista; paginaId: string;
  vuelta: { estado: string; conversacion?: string; mensaje?: string } | null;
  elegido: Experto | null; setElegido: (e: Experto | null) => void; cargar: () => Promise<void>;
}) {
  const sitio = useSitio();
  // Fuera de un sitio publicado (el editor), la página en la plataforma.
  const todos = d.pagina ? (sitio ? sitio.enlacePagina(d.pagina) : `/paginas/${encodeURIComponent(d.pagina)}`) : null;
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      {vuelta && <AvisoVuelta vuelta={vuelta} />}
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <GraduationCap className="h-5 w-5 text-emerald-500" /> {d.titulo || '¿Dudas antes de comprar? Consulta a un experto'}
        </h3>
        {d.intro && <p className="mt-1 text-sm text-slate-600">{d.intro}</p>}
      </div>
      {!lista.expertos.length ? (
        <p className="text-sm text-slate-500">
          Sólo lo ve el equipo: no hay expertos dados de alta, así que este recuadro no sale en la ficha.
          {todos && <> Dalos de alta en la <a className="underline" href={todos}>página de expertos</a>.</>}
        </p>
      ) : elegido ? (
        <Reserva experto={elegido} paginaId={paginaId} volver={() => { setElegido(null); void cargar(); }} />
      ) : (
        <ul className="divide-y divide-emerald-100">
          {lista.expertos.map(e => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{e.nombre}{e.especialidad ? <span className="font-normal text-slate-600"> · {e.especialidad}</span> : null}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> {e.duracionMin} min · {e.precioCentimos ? euros(e.precioCentimos, e.moneda) : 'Gratis'}
                  {!e.huecosLibres && ' · sin huecos libres en las próximas tres semanas'}
                </p>
              </div>
              {sePuedePagar(lista, e)
                ? <Button onClick={() => setElegido(e)} disabled={!e.huecosLibres}>Elegir hora</Button>
                : <span className="text-xs text-slate-500">{PRONTO}</span>}
            </li>
          ))}
        </ul>
      )}
      {todos && lista.expertos.length > 0 && !elegido && (
        <p className="text-xs"><a className="text-emerald-700 underline" href={todos}>Quiénes son y cómo funcionan las consultas</a></p>
      )}
    </section>
  );
}

/** Cuánto se queda el sitio y cuánto el experto, en euros. */
function Comision({ experto: e }: { experto: Experto }) {
  if (!e.precioCentimos) return null;
  const sitio = Math.round((e.precioCentimos * e.comisionBps) / 10000);
  return (
    <p className="mt-2 text-xs text-slate-500">
      {e.comisionBps
        ? `De ${euros(e.precioCentimos, e.moneda)}, ${euros(e.precioCentimos - sitio, e.moneda)} son para el experto y ${euros(sitio, e.moneda)} (${(e.comisionBps / 100).toLocaleString('es-ES')} %) para el sitio.`
        : 'El sitio no se queda comisión: todo el precio es para el experto.'}
    </p>
  );
}

function AvisoVuelta({ vuelta }: { vuelta: { estado: string; conversacion?: string; mensaje?: string } }) {
  if (vuelta.estado === 'comprobando') {
    return <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Comprobando el pago…</p>;
  }
  if (vuelta.estado === 'pagada' || vuelta.estado === 'hecha') {
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
        <p className="flex items-center gap-2 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Consulta reservada y pagada. Aquí puedes hablar con el experto; también te lo hemos mandado por correo.
        </p>
        {vuelta.conversacion && <Conversacion id={vuelta.conversacion} alto="h-64" />}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl bg-amber-50 text-sm text-amber-800">
      <p className="flex items-center gap-2 p-3">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {vuelta.mensaje || (vuelta.estado === 'cancelada'
          ? 'La consulta no se ha podido reservar (el hueco se ocupó mientras pagabas). Si llegaste a pagar, te devolvemos el importe.'
          : 'Todavía no nos consta el pago. Si has pagado, recarga la página en un momento.')}
      </p>
      {vuelta.conversacion && vuelta.estado === 'cancelada' && <div className="bg-white"><Conversacion id={vuelta.conversacion} alto="h-40" /></div>}
    </div>
  );
}

/** Elegir hueco, contar el tema y pagar. */
function Reserva({ experto: e, paginaId, volver }: { experto: Experto; paginaId: string; volver: () => void }) {
  const [huecos, setHuecos] = useState<Hueco[] | null>(null);
  const [hueco, setHueco] = useState<Hueco | null>(null);
  const [tema, setTema] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecha, setHecha] = useState<string | null>(null);

  useEffect(() => {
    pedir<{ huecos: Hueco[] }>(`/api/expertos/${encodeURIComponent(e.id)}/huecos`)
      .then(r => setHuecos(r.huecos)).catch(err => setError(err.message));
  }, [e.id]);

  // Por días, en la hora de quien mira (la del experto se dice aparte).
  const porDia = useMemo(() => {
    const m = new Map<string, Hueco[]>();
    for (const h of huecos || []) {
      const k = new Date(h.inicio).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      m.set(k, [...(m.get(k) || []), h]);
    }
    return [...m.entries()];
  }, [huecos]);
  const miZona = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const reservar = async () => {
    if (!hueco || enviando) return;
    setEnviando(true); setError(null);
    try {
      const r = await pedir<{ url?: string; pagada?: boolean; conversacion?: string }>(`/api/expertos/${encodeURIComponent(e.id)}/reservar`, {
        metodo: 'POST',
        cuerpo: { inicio: hueco.inicio, tema, nombre: nombre || undefined, email: email || undefined, pagina: paginaId, volver: window.location.pathname },
      });
      if (r.url) { window.location.href = r.url; return; }
      if (r.pagada) setHecha(r.conversacion || '');
    } catch (err: any) { setError(err.message); }
    setEnviando(false);
  };

  if (hecha !== null) {
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
        <p className="flex items-center gap-2 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Consulta reservada.</p>
        {hecha && <Conversacion id={hecha} alto="h-64" />}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Button variant="ghost" className="mb-2 px-2 normal-case tracking-normal" onClick={volver}><ChevronLeft className="mr-1 h-4 w-4" /> Todos los expertos</Button>
      <p className="font-semibold text-slate-800">Consulta con {e.nombre} · {e.duracionMin} min · {e.precioCentimos ? euros(e.precioCentimos, e.moneda) : 'Gratis'}</p>
      <p className="text-xs text-slate-500">
        Horas en tu zona ({miZona}).{miZona !== e.zonaHoraria ? ` El experto está en ${e.zonaHoraria}.` : ''}
      </p>
      <Comision experto={e} />

      {!huecos && !error && <div className="py-6 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>}
      {huecos?.length === 0 && <p className="py-4 text-sm text-slate-500">No quedan huecos libres en las próximas tres semanas.</p>}
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
        {porDia.map(([dia, hs]) => (
          <div key={dia}>
            <p className="text-xs font-medium capitalize text-slate-600">{dia}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {hs.map(h => (
                <button key={h.inicio} type="button" onClick={() => setHueco(h)}
                  aria-pressed={hueco?.inicio === h.inicio}
                  className={cn('rounded-lg border px-2.5 py-1 text-sm',
                    hueco?.inicio === h.inicio ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-700 hover:border-emerald-300')}>
                  {new Date(h.inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hueco && (
        <form className="mt-4 space-y-2 border-t border-slate-100 pt-4" onSubmit={ev => { ev.preventDefault(); void reservar(); }}>
          <p className="flex items-center gap-1 text-sm text-slate-700">
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
            {new Date(hueco.inicio).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </p>
          <label className="block text-xs font-medium text-slate-600">
            ¿Qué quieres consultar? (opcional, ayuda al experto a prepararla)
            <textarea rows={3} value={tema} maxLength={1000} onChange={ev => setTema(ev.target.value)}
              placeholder="Por ejemplo: tengo 4 kWp en el tejado y dudo entre dos baterías domésticas."
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal focus:border-emerald-400 focus:outline-none" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              Tu nombre
              <input value={nombre} maxLength={80} onChange={ev => setNombre(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal focus:border-emerald-400 focus:outline-none" />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Tu correo (para la confirmación)
              <input type="email" value={email} maxLength={200} onChange={ev => setEmail(ev.target.value)}
                placeholder="Si has entrado, se usa el de tu cuenta"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal focus:border-emerald-400 focus:outline-none" />
            </label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={enviando}>
            {enviando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {e.precioCentimos ? `Reservar y pagar ${euros(e.precioCentimos, e.moneda)}` : 'Reservar'}
          </Button>
          {e.precioCentimos > 0 && <p className="text-xs text-slate-500">El pago se hace en Stripe. Tienes 30 minutos para pagar; mientras, el hueco es tuyo.</p>}
        </form>
      )}
      {error && !hueco && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
