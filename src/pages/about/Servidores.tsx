// ============================================================================
// SERVIDORES — visión, coste real y tareas pendientes (2026-08-22, prog6)
// ============================================================================
// Eugenio: «vas a crear una página en (i) donde pondrás ahí tu visión y
// estrategia de los servidores y pondrás la información en tiempo real de los
// mismos de forma transparente a nivel de coste y eso. Y pondrás un kanban como
// el del hormiguero con las tareas que tienes pendientes».
//
// VA EN (i) Y NO EN EL PANEL DE ADMINISTRACIÓN, y eso decide el tono: lo lee
// cualquiera, no el equipo. El coste sale de `/api/gasto`, que ya es público —
// aquí no se abre nada que no estuviera abierto.
//
// Y LO QUE NO SE PONE: nada de la forma de la máquina que sirva para atacarla.
// Cuánto cuesta y qué queda por hacer, sí. La IP, las versiones y los agujeros
// conocidos, no — para eso está el tablero de seguridad, que pide permiso.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Server, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import Tablero from '../../components/tablero/Tablero';
import { cn } from '../../utils/cn';

interface Gasto {
  actualizado: string;
  cache_horas: number;
  servidores: {
    estado: 'ok' | 'sin_conectar' | 'error';
    mensaje?: string;
    total_mes_eur?: number;
    consumo_mes_eur?: number;
    servidores?: { nombre: string; tipo: string; eur_mes: number; consumo_eur?: number }[];
  };
  copias?: {
    hay: boolean;
    ultima?: string;
    objetos?: number;
    fuera: 'ok' | 'sin_configurar' | 'error' | 'desconocido';
    fuera_ultima?: string;
    copias_fuera?: number;
  };
}

const eur = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export default function Servidores() {
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [falloGasto, setFalloGasto] = useState(false);

  useEffect(() => {
    fetch('/api/gasto', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setGasto)
      .catch(() => setFalloGasto(true));
  }, []);

  const s = gasto?.servidores;
  const c = gasto?.copias;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Link to="/sobre-red-humana" className="inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700">
        <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Sobre Humanity.wiki
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display mb-4">Servidores</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Dónde vive esta plataforma, qué cuesta mantenerla y qué queda por hacer.
          Está aquí, a la vista de cualquiera, porque una plataforma que pide
          confianza no puede ser opaca sobre lo que gasta.
        </p>
      </div>

      {/* ══ EL COSTE, LO PRIMERO ══════════════════════════════════════════════
          Es el dato que la gente no encuentra nunca en ninguna plataforma. */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
          <Server className="w-4 h-4" /> Lo que cuestan ahora mismo
        </h2>

        {falloGasto ? (
          <p className="mt-4 text-sm text-slate-500">Ahora mismo no se puede leer el coste.</p>
        ) : !gasto ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Leyendo el coste…
          </p>
        ) : s?.estado !== 'ok' ? (
          <p className="mt-4 text-sm text-slate-500">
            {s?.mensaje || 'El coste de los servidores todavía no está conectado.'}
          </p>
        ) : (
          <>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {eur(s.consumo_mes_eur ?? s.total_mes_eur ?? 0)}
              <span className="ml-2 text-base font-medium text-slate-400">
                {s.consumo_mes_eur != null ? 'consumido este mes' : 'al mes'}
              </span>
            </p>

            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {(s.servidores || []).map((m, n) => (
                <li key={n} className="flex items-baseline justify-between py-2">
                  {/* El modelo de máquina solo llega si quien mira es del
                      equipo: a los demás el servidor lo quita, porque decir
                      «CPX42» es decir cuánta máquina hay que tumbar. */}
                  <span className="font-semibold text-slate-700">
                    {m.nombre}
                    {m.tipo && <span className="font-normal text-slate-400"> · {m.tipo}</span>}
                  </span>
                  <span className="tabular-nums text-slate-600">{eur(m.eur_mes)}/mes</span>
                </li>
              ))}
            </ul>

            {/* «En tiempo real» tiene letra pequeña, y es más honesto decirla
                que dejar que alguien suponga que el número es de este segundo. */}
            <p className="mt-3 text-[11px] text-slate-400">
              Se actualiza cada {gasto.cache_horas} h. Última lectura:{' '}
              {new Date(gasto.actualizado).toLocaleString('es-ES')}.
            </p>
          </>
        )}
      </section>

      {/* ══ LAS COPIAS DE SEGURIDAD ═══════════════════════════════════════════
          Eugenio, 2026-08-22: «mete esta info de las copias de seguridad en la
          parte de información».

          NO ES UN CARTEL, ES UN DATO: lo que sale aquí lo lee el servidor de
          los ficheros que escriben los propios servicios de copia, así que el
          día que dejen de hacerse, esta sección lo dirá sola. Una página que
          promete copias sin mirar si existen es peor que no tener página. */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
          <ShieldCheck className="w-4 h-4" /> Las copias de seguridad
        </h2>

        {!c ? (
          <p className="mt-4 text-sm text-slate-500">Ahora mismo no se puede leer el estado de las copias.</p>
        ) : (
          <>
            <p className="mt-3 text-slate-700 leading-relaxed">
              Todo lo que se escribe en esta plataforma se copia entera{' '}
              <strong>una vez al día</strong>, y cada copia se comprueba antes de
              darla por buena. Se guardan las de los últimos <strong>14 días</strong>{' '}
              y la del día 1 de cada mes durante <strong>6 meses</strong>.
            </p>

            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className={cn('mt-1.5 w-2 h-2 shrink-0 rounded-full', c.hay ? 'bg-emerald-500' : 'bg-rose-500')} />
                <span className="text-slate-700">
                  {c.hay
                    ? <>Copia del día hecha y comprobada{c.objetos ? <> — {c.objetos.toLocaleString('es-ES')} elementos dentro</> : null}</>
                    : <>No hay copia del día. <strong>Esto es un problema y el equipo lo ve</strong></>}
                  {c.ultima && <span className="block text-[11px] text-slate-400">
                    Última: {new Date(c.ultima).toLocaleString('es-ES')}
                  </span>}
                </span>
              </li>

              <li className="flex items-start gap-2">
                <span className={cn('mt-1.5 w-2 h-2 shrink-0 rounded-full',
                  c.fuera === 'ok' ? 'bg-emerald-500' : c.fuera === 'error' ? 'bg-rose-500' : 'bg-amber-500')} />
                <span className="text-slate-700">
                  {c.fuera === 'ok' ? (
                    <>
                      <strong>Las copias salen del servidor.</strong> Se guardan además en
                      un proveedor distinto{c.copias_fuera ? <>, donde hay {c.copias_fuera}</> : null}
                      <span className="block text-[11px] text-slate-400">
                        Una copia guardada en la misma máquina que protege no protege de
                        perder la máquina.
                      </span>
                    </>
                  ) : c.fuera === 'sin_configurar' ? (
                    <>Las copias todavía <strong>no salen del servidor</strong>: se hacen, pero viven donde viven los datos</>
                  ) : c.fuera === 'error' ? (
                    <>La copia fuera del servidor <strong>está fallando</strong>. El equipo lo ve</>
                  ) : (
                    <>No se puede saber si las copias están saliendo del servidor</>
                  )}
                </span>
              </li>
            </ul>

            {/* La frase que de verdad importa, y la que casi nadie puede decir. */}
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <strong>Y se restauran.</strong> No basta con guardar un fichero: hay que
              poder abrirlo. Cada copia se comprueba al hacerla, y la vuelta entera
              —traerla de fuera y volcarla— se ha hecho a mano y funcionó.
            </p>

            {c.fuera !== 'ok' && (
              <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-700">
                <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                Esta sección dice lo que hay, no lo que nos gustaría que hubiera.
              </p>
            )}
          </>
        )}
      </section>

      {/* ══ LA ESTRATEGIA ═════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Cómo se decide crecer</h2>

        <p className="text-slate-700 leading-relaxed">
          Toda la plataforma vive hoy en <strong>una sola máquina</strong>: la base
          de datos, la aplicación y el servidor que reparte las páginas. Eso suena
          frágil y no lo es tanto — lo frágil sería crecer antes de saber qué se
          está quedando corto.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-sm text-slate-700">
          <p><strong className="text-slate-900">1 · Usar lo que ya se paga antes de pagar más.</strong>{' '}
            La máquina tiene ocho núcleos y la aplicación usa uno. Repartir el
            trabajo entre los ocho no cuesta un euro más y es lo primero.</p>
          <p><strong className="text-slate-900">2 · Que la mayoría de las visitas no lleguen aquí.</strong>{' '}
            Una página guardada en la red de reparto se responde sin molestar a
            esta máquina. Es capacidad que se gana sin comprar nada.</p>
          <p><strong className="text-slate-900">3 · Separar lo que estorba, cuando estorbe.</strong>{' '}
            Sacar la base de datos a su propia máquina se hace el día que se
            demuestre que se pisa con la aplicación, no por si acaso.</p>
          <p><strong className="text-slate-900">4 · Y antes que todo eso, no perder nada.</strong>{' '}
            Escalar sin copias de seguridad solo aumenta lo que puedes perder.
            Por eso las copias fueron lo primero que se hizo, y no lo último.</p>
        </div>

        <p className="text-slate-700 leading-relaxed">
          La regla de fondo: <strong>cada paso se justifica con una medida, no con
          una intuición.</strong> «Esto no escala» no es un motivo; «esta consulta
          tarda 59 ms y con un índice tarda 1,3 ms» sí lo es.
        </p>
      </section>

      {/* ══ EL TABLERO ════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Lo que queda por hacer</h2>
        <p className="text-sm text-slate-600">
          Las mismas tres luces que en el Hormiguero: rojo es cola de trabajo,
          naranja está parado esperando a una persona, verde está hecho.
        </p>
        <Tablero area="servidores" vacio="Nada pendiente en servidores ahora mismo." />
      </section>
    </div>
  );
}
