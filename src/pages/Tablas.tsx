import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table2, Pencil, Archive, Plus, Loader2, ArrowLeft, LayoutGrid, LineChart } from 'lucide-react';
import Rejilla from '../components/tablas/Rejilla';
import GraficaDeTabla from '../components/graficas/GraficaDeTabla';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

// ============================================================================
// TABLAS — la herramienta
// ============================================================================
// Lista de tus tablas, y una abierta. Qué tabla se está mirando vive en la
// dirección (`?tabla=`) y no en el estado: así una tabla concreta se puede
// compartir con un enlace, y volver atrás en el navegador funciona.

export default function Tablas() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const abierta = params.get('tabla');
  // CÓMO SE MIRA LA TABLA VA EN LA DIRECCIÓN, igual que cuál está abierta: así
  // «mírate esta gráfica» es un enlace, y no «abre la tabla y dale a Gráfica».
  const forma = params.get('ver') === 'grafica' ? 'grafica' : 'rejilla';
  const [tablas, setTablas] = useState<any[] | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    const r = await fetch('/api/bd/tablas', { credentials: 'include' });
    setTablas(r.ok ? await r.json() : []);
  };
  useEffect(() => { if (user) cargar(); }, [user?.id]);

  /**
   * Cambiar el nombre. No se podía: una tabla nacía con su nombre y ese nombre
   * era para siempre, así que corregirlo obligaba a crear otra y copiar los
   * datos a mano. Un nombre es lo que más se equivoca uno al empezar algo.
   */
  async function renombrar(t: any) {
    const nuevo = window.prompt('¿Cómo se llama esta tabla?', t.titulo);
    if (nuevo === null || nuevo.trim() === '' || nuevo.trim() === t.titulo) return;
    const r = await fetch(`/api/bd/tablas/${t.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevo.trim() }),
    });
    if (r.ok) cargar();
  }

  /**
   * Retirarla. Se archiva, no se borra: puede estar metida en páginas de otras
   * personas.
   *
   * SE PREGUNTA ANTES DE TOCAR NADA. La primera versión de esto llamaba al
   * servidor y preguntaba después, con la idea de deshacerlo si decías que no.
   * Eso es archivar primero y pedir perdón luego, y encima dependía de una
   * ruta de restaurar que no existe. Preguntar cuesta lo mismo y no deja a
   * nadie con la tabla retirada por un clic.
   *
   * El servidor añade lo que esta pantalla no sabe: en cuántas páginas está
   * metida. Por eso hay dos preguntas y no una — la segunda sólo aparece
   * cuando hay alguien más a quien le va a cambiar la pantalla.
   */
  async function retirar(t: any) {
    if (!window.confirm(`¿Retirar «${t.titulo}»?\n\nDeja de verse en la lista y en las páginas donde esté. No se borra nada.`)) return;

    const quitar = (confirmado: boolean) => fetch(`/api/bd/tablas/${t.id}`, {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmado }),
    });

    let r = await quitar(false);
    if (r.status === 409) {
      const j = await r.json().catch(() => ({}));
      if (!window.confirm(`${j.error}\n\n¿Retirarla de todas formas?`)) return;
      r = await quitar(true);
    }
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      window.alert(j.error || 'No se ha podido retirar.');
      return;
    }
    cargar();
  }

  const crear = async () => {
    setCreando(true);
    const r = await fetch('/api/bd/tablas', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Tabla sin título' }),
    });
    const j = await r.json();
    setCreando(false);
    if (j.id) { await cargar(); setParams({ tabla: j.id }); }
  };

  if (!user) {
    return <p className="p-6 text-sm text-slate-500">Inicia sesión para ver tus tablas.</p>;
  }

  if (abierta) {
    const ver = (v: 'rejilla' | 'grafica') =>
      setParams(v === 'grafica' ? { tabla: abierta, ver: 'grafica' } : { tabla: abierta });
    const pestaña = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors';
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setParams({})}
            className="inline-flex items-center gap-1.5 h-11 px-2 -ml-2 text-xs font-bold text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" /> Todas las tablas
          </button>
          <div className="flex-1" />
          {/* LOS MISMOS DATOS, DOS MANERAS DE MIRARLOS. La rejilla es para
              escribir; la gráfica, para entender. Antes había que sacar los
              datos a otro sitio para poder verlos dibujados. */}
          <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5">
            <button onClick={() => ver('rejilla')}
              className={cn(pestaña, forma === 'rejilla' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
              <LayoutGrid className="w-3.5 h-3.5" /> Rejilla
            </button>
            <button onClick={() => ver('grafica')}
              className={cn(pestaña, forma === 'grafica' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>
              <LineChart className="w-3.5 h-3.5" /> Gráfica
            </button>
          </div>
        </div>
        {forma === 'grafica' ? <GraficaDeTabla tablaId={abierta} /> : <Rejilla tablaId={abierta} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Tablas</h1>
        <button onClick={crear} disabled={creando}
          className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
          {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Nueva tabla
        </button>
      </div>

      {tablas === null && <p className="text-sm text-slate-400">Cargando…</p>}

      {tablas?.length === 0 && (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Table2 className="w-8 h-8 mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-600">Todavía no tienes tablas.</p>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Una tabla es una base de datos tuya: columnas con tipo, relaciones con otras tablas,
            y columnas que se calculan solas.
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(tablas || []).map(t => (
          // Una fila, dos acciones: abrir es el gesto principal y ocupa todo;
          // renombrar y retirar van al lado, a 44 px, sin menús escondidos.
          <div key={t.id}
            className="flex items-center gap-1 p-1 pl-3 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
            <button onClick={() => setParams({ tabla: t.id })}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-2">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 grid place-items-center">
                <Table2 className="w-4 h-4 text-slate-500" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-800 truncate">{t.titulo}</span>
                <span className="block text-[11px] text-slate-400">{t.filas} {Number(t.filas) === 1 ? 'fila' : 'filas'}</span>
              </span>
            </button>
            <button onClick={() => renombrar(t)} aria-label={`Cambiar el nombre de ${t.titulo}`}
              title="Cambiar el nombre"
              className="w-11 h-11 shrink-0 grid place-items-center rounded-lg hover:bg-white">
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={() => retirar(t)} aria-label={`Retirar ${t.titulo}`}
              title="Retirar de la lista"
              className="w-11 h-11 shrink-0 grid place-items-center rounded-lg hover:bg-white">
              <Archive className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
