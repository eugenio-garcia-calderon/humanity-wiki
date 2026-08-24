import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAbrirAlAcercarse } from '../../hooks/useAbrirAlAcercarse';

/*
 * EL CALENDARIO, ARRIBA A LA DERECHA (2026-08-24)
 * ============================================================================
 * Eugenio: «pon el acceso al calendario arriba a la derecha, y que cuando se
 * haga hover te dé una preview del día de hoy y si tienes algún evento, y si se
 * pincha ya te lleva a la página de calendario».
 *
 * ── LAS DOS COSAS SON DISTINTAS Y POR ESO SON DOS GESTOS ────────────────────
 * Pasar el ratón CONTESTA una pregunta —«¿tengo algo hoy?»— sin sacarte de
 * donde estás. Pulsar te LLEVA a otro sitio. La mayoría de las veces la
 * pregunta es la única que se tiene, y hasta hoy contestarla costaba abandonar
 * la página en la que estabas trabajando y volver.
 *
 * ── NO SE PIDE NADA HASTA QUE SE ACERCA EL RATÓN ────────────────────────────
 * Este botón está en TODAS las pantallas. Si cargara el día al montarse, sería
 * una consulta a la base de datos en cada visita de cada persona para pintar un
 * icono que casi nadie mira. Se pide la primera vez que alguien se acerca, y
 * después se guarda: dentro de la misma visita el día de hoy no cambia.
 *
 * ── EL «TODAVÍA NO LO SÉ» SE VE ────────────────────────────────────────────
 * Mientras carga se enseña que está cargando, y no un «no tienes nada hoy» que
 * sería mentira durante medio segundo. Un calendario que dice que tienes el día
 * libre cuando aún no lo ha mirado es peor que uno lento: se le cree.
 */

type Cosa = {
  id: string; clase: 'evento' | 'tarea'; titulo: string;
  inicio: string; fin: string | null; todoElDia: boolean; lugar: string | null;
};

/** `2026-08-24` en hora local. Con `toISOString()` saldría el día de ayer para
 *  cualquiera que esté al oeste de Londres después de comer. */
function claveDeHoy(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hora(c: Cosa): string {
  if (c.todoElDia) return 'Todo el día';
  const d = new Date(c.inicio);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function BotonCalendario({ compacto = false, activo = false }: {
  compacto?: boolean;
  activo?: boolean;
}) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  // `null` es «no lo he mirado todavía» y `[]` es «hoy no hay nada». Son dos
  // respuestas distintas y se pintan distinto: es la misma regla que el resto
  // de la plataforma sigue con lo medido y lo no medido.
  const [cosas, setCosas] = useState<Cosa[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const pedido = useRef(false);

  const gesto = useAbrirAlAcercarse(() => setAbierto(true), () => setAbierto(false), { abierto });

  useEffect(() => {
    if (!abierto || pedido.current) return;
    pedido.current = true;
    const hoy = claveDeHoy();
    fetch(`/api/calendario?desde=${hoy}&hasta=${hoy}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => setCosas(Array.isArray(d?.items) ? d.items : []))
      .catch(() => {
        setFallo(true);
        // Se permite volver a intentarlo: un fallo de red no puede dejar la
        // vista previa muerta para el resto de la sesión.
        pedido.current = false;
      });
  }, [abierto]);

  const hoy = new Date();

  return (
    <div className="relative shrink-0" {...gesto}>
      <button
        onClick={() => navigate('/calendario')}
        title="Calendario"
        aria-label="Calendario"
        className={cn('relative grid shrink-0 place-items-center rounded-lg transition-colors',
          compacto ? 'w-7 h-7' : 'w-9 h-9',
          activo ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
      >
        <CalendarDays className={cn(compacto ? 'w-4 h-4' : 'w-5 h-5')} />
        {/* EL PUNTO SÓLO CUANDO SE SABE QUE HAY ALGO. No se pinta mientras no
            se ha mirado: un aviso que aparece medio segundo después de cargar
            la página enseña a no fiarse de los avisos. */}
        {cosas && cosas.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
            {hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>

          {fallo ? (
            <p className="px-3 py-3 text-xs text-slate-400">No se ha podido consultar el calendario.</p>
          ) : cosas === null ? (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mirando tu día…
            </p>
          ) : cosas.length === 0 ? (
            <p className="px-3 py-3 text-xs text-slate-400">Hoy no tienes nada apuntado.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {cosas.slice(0, 6).map(c => (
                <li key={c.id} className="flex items-start gap-2 px-3 py-1.5">
                  <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                    c.clase === 'tarea' ? 'bg-amber-500' : 'bg-emerald-500')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-700">{c.titulo}</span>
                    <span className="block text-[10px] text-slate-400">
                      {hora(c)}{c.lugar ? ` · ${c.lugar}` : ''}
                    </span>
                  </span>
                </li>
              ))}
              {cosas.length > 6 && (
                <li className="px-3 pt-1 text-[10px] text-slate-400">y {cosas.length - 6} más</li>
              )}
            </ul>
          )}

          <button
            onClick={() => { setAbierto(false); navigate('/calendario'); }}
            className="mt-1 w-full border-t border-slate-100 px-3 pt-2 text-left text-[11px] font-bold text-slate-500 hover:text-slate-800"
          >
            Abrir el calendario
          </button>
        </div>
      )}
    </div>
  );
}
