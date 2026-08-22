// ============================================================================
// EN QUÉ SE GASTA LA IA (2026-08-20, paso 2 del plan de costes de Eugenio:
// «caché → medición → contexto dinámico → routing → RAG»).
// ============================================================================
// La pregunta que esta pantalla existe para responder no es «cuánto cuesta un
// millón de tokens», sino:
//
//        ¿CUÁNTO CUESTA UNA ACCIÓN CORRECTA EN CADA MODELO?
//
// Porque un modelo diez veces más barato que falla el triple sale caro. Ese
// número es el que decide si algún día se cambia de proveedor o se alquila una
// GPU, y hasta hoy se decidía a ojo.
//
// «Correcta» = la propuso el modelo, tú dijiste que sí, y el servidor la
// ejecutó. Rechazada = dijiste que no. Fallida = los parámetros no valían.
import { useEffect, useState } from 'react';
import { Euro, Cpu, Target, Loader2, Users2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModeloMedido {
  model: string;
  etiqueta: string;
  gratis: boolean;
  llamadas: number;
  coste_cents: number;
  pagado_cents: number;
  entrada: number;
  salida: number;
  propuestas: number;
  correctas: number;
  rechazadas: number;
  fallidas: number;
  pendientes: number;
  acierto: number | null;
  coste_por_accion: number | null;
  coste_por_llamada: number | null;
}

interface Medicion {
  dias: number;
  global: boolean;
  modelos: ModeloMedido[];
  porDia: Array<{ dia: string; coste_cents: number; llamadas: number }>;
  total: { coste_cents: number; pagado_cents: number; llamadas: number; correctas: number; propuestas: number };
  /** Lo que ha costado el chat abierto a visitantes sin cuenta. `null` cuando
   *  no se ha preguntado (no eres administrador o miras solo lo tuyo) — que no
   *  es lo mismo que un cero. */
  anonimo?: { llamadas: number; coste_cents: number } | null;
}

/** Céntimos → euros, con los decimales que hacen falta para que 0,04 € no se
 *  lea como 0,00 €. La IA se mide en fracciones de céntimo. */
const euros = (cents: number, finos = false) =>
  `${(cents / 100).toLocaleString('es-ES', {
    minimumFractionDigits: finos ? 4 : 2,
    maximumFractionDigits: finos ? 4 : 2,
  })} €`;

export default function PanelMedicion({ esAdmin }: { esAdmin?: boolean }) {
  const [datos, setDatos] = useState<Medicion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dias, setDias] = useState(30);
  // Un administrador puede mirar el total de la plataforma, que es lo que hace
  // falta para decidir de proveedor; por defecto, lo suyo.
  const [todos, setTodos] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    fetch(`/api/ai/medicion?dias=${dias}${todos ? '&todos=1' : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (vivo && !d?.error) setDatos(d); })
      .catch(() => {})
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [dias, todos]);

  const maxDia = Math.max(1, ...(datos?.porDia || []).map(d => d.coste_cents));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
          <Euro className="w-4 h-4 text-emerald-600" /> En qué se gasta
        </h2>
        <div className="ml-auto inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors',
                dias === d ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50')}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {esAdmin && (
        <button
          onClick={() => setTodos(v => !v)}
          className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-colors',
            todos ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}
        >
          <Users2 className="w-3 h-3" /> {todos ? 'Toda la plataforma' : 'Solo lo mío'}
        </button>
      )}

      {cargando && !datos ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </div>
      ) : !datos || !datos.modelos.length ? (
        <p className="text-xs text-slate-400 italic py-10 text-center">
          Todavía no hay consumo en este periodo.
        </p>
      ) : (
        <>
          {/* Las dos cifras de cabecera: lo que ha costado y lo que has pagado.
              Con el router, casi todo lo cubre la plataforma — verlo separado
              es lo que hace entender de un vistazo qué te estás ahorrando. */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Coste real</p>
              <p className="text-lg font-black text-slate-900 leading-tight">{euros(datos.total.coste_cents)}</p>
              <p className="text-[10px] text-slate-400">{datos.total.llamadas} llamadas</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Has pagado</p>
              <p className={cn('text-lg font-black leading-tight',
                datos.total.pagado_cents > 0 ? 'text-slate-900' : 'text-emerald-600')}>
                {datos.total.pagado_cents > 0 ? euros(datos.total.pagado_cents) : 'nada'}
              </p>
              <p className="text-[10px] text-slate-400">
                {datos.total.pagado_cents > 0 ? 'incl. comisión' : 'lo cubre la plataforma'}
              </p>
            </div>
          </div>

          {/* LO QUE CUESTA EL CHAT ABIERTO. No tiene límite —decisión de
              Eugenio— y por eso hay que poder verlo: dejar algo abierto solo se
              sostiene si se sabe lo que vale. Hasta hoy este gasto no se
              apuntaba en ninguna parte y el panel enseñaba menos que la
              factura. Va dentro del coste real de arriba; aquí solo se separa
              la parte que no tiene dueño. */}
          {datos.anonimo && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-700">
                Visitantes sin cuenta
              </p>
              <p className="text-lg font-black text-amber-900 leading-tight">{euros(datos.anonimo.coste_cents)}</p>
              <p className="text-[10px] text-amber-700/80">
                {datos.anonimo.llamadas} {datos.anonimo.llamadas === 1 ? 'pregunta' : 'preguntas'} · sin límite, lo paga la plataforma
              </p>
            </div>
          )}

          {/* La curva: para ver si un día se disparó algo. */}
          {datos.porDia.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">Por día</p>
              <div className="flex items-end gap-0.5 h-16">
                {datos.porDia.map(d => (
                  <div
                    key={d.dia}
                    title={`${new Date(d.dia).toLocaleDateString('es-ES')} · ${euros(d.coste_cents, true)} · ${d.llamadas} llamadas`}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-500 rounded-t transition-colors min-h-[2px]"
                    style={{ height: `${Math.max(3, (d.coste_cents / maxDia) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Modelo a modelo. Aquí está la comparación de verdad. */}
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 inline-flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Por modelo
            </p>
            {datos.modelos.map(m => (
              <div key={m.model} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black text-slate-800 truncate">{m.etiqueta}</p>
                  {m.gratis && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider shrink-0">
                      gratis
                    </span>
                  )}
                  <span className="ml-auto text-xs font-black text-slate-900 shrink-0">{euros(m.coste_cents)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">Llamadas</p>
                    <p className="text-xs font-bold text-slate-700">{m.llamadas}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">Por llamada</p>
                    <p className="text-xs font-bold text-slate-700">
                      {m.coste_por_llamada !== null ? euros(m.coste_por_llamada, true) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">Acierto</p>
                    <p className={cn('text-xs font-bold',
                      m.acierto === null ? 'text-slate-300'
                        : m.acierto >= 0.8 ? 'text-emerald-600'
                        : m.acierto >= 0.5 ? 'text-amber-600' : 'text-red-600')}>
                      {m.acierto === null ? '—' : `${Math.round(m.acierto * 100)}%`}
                    </p>
                  </div>
                </div>

                {/* LA CIFRA QUE DECIDE. Solo aparece cuando hay acciones de
                    verdad: un «0,00 € por acción» sin datos engañaría más de
                    lo que informa. */}
                {m.coste_por_accion !== null ? (
                  <p className="text-[10px] font-bold text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 inline-flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-emerald-600 shrink-0" />
                    {euros(m.coste_por_accion, true)} por acción correcta
                    <span className="text-slate-400 font-normal">
                      ({m.correctas} de {m.propuestas})
                    </span>
                  </p>
                ) : m.propuestas > 0 && !m.llamadas ? (
                  <p className="text-[10px] text-slate-400 italic">
                    {m.correctas} de {m.propuestas} correctas. Son de antes de que se
                    guardara qué modelo respondía, así que su coste no se puede repartir.
                  </p>
                ) : m.propuestas > 0 ? (
                  <p className="text-[10px] text-slate-400 italic">
                    {m.propuestas} {m.propuestas === 1 ? 'acción propuesta' : 'acciones propuestas'}, ninguna ejecutada todavía.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-300 italic">Sin acciones en este periodo.</p>
                )}

                {(m.rechazadas > 0 || m.fallidas > 0) && (
                  <p className="text-[10px] text-slate-400">
                    {m.rechazadas > 0 && `${m.rechazadas} rechazadas`}
                    {m.rechazadas > 0 && m.fallidas > 0 && ' · '}
                    {m.fallidas > 0 && `${m.fallidas} fallidas`}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            «Acción correcta» es una que el modelo propuso, tú aceptaste y el servidor
            ejecutó. Es la cifra que compara modelos de verdad: uno más barato que
            falla más sale caro.
          </p>
        </>
      )}
    </div>
  );
}
