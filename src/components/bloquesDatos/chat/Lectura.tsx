import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, X, Loader2, Send, Inbox, ChevronLeft } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import type { PropsLectura } from '../tipos';
import { pedir, hace, parametro, type EstadoSitio } from './api';
import Conversacion from './Conversacion';

export type DatosChat = { titulo?: string; intro?: string; flotante?: boolean };

/**
 * EL BLOQUE «CHAT DE AYUDA» (3.12 del plan de Wikiproducts).
 *
 * Quien visita el sitio ve una caja para preguntar; quien es del equipo del
 * sitio ve, en el mismo bloque, la bandeja con todas las preguntas. Así el
 * dueño atiende desde su propia web sin otra pantalla que aprender.
 *
 * `flotante`: en vez de ocupar su sitio en la página, sale como una burbuja
 * abajo a la derecha que se abre al pulsarla.
 */
export default function ChatAyuda({ datos, paginaId }: PropsLectura) {
  const d = datos as DatosChat;
  const [abierto, setAbierto] = useState(!d.flotante || !!parametro('soporte'));
  if (!paginaId) return <p className="text-sm text-slate-400">El chat de ayuda funciona en una página guardada.</p>;

  const panel = <Panel paginaId={paginaId} datos={d} />;
  if (!d.flotante) return panel;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {abierto && (
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex justify-end px-1 pt-1">
            <Button variant="ghost" className="px-2 py-1" aria-label="Cerrar el chat" onClick={() => setAbierto(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {panel}
        </div>
      )}
      {!abierto && (
        <Button className="h-14 w-14 rounded-full p-0 shadow-lg" aria-label={d.titulo || 'Abrir el chat de ayuda'} onClick={() => setAbierto(true)}>
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

function Panel({ paginaId, datos }: { paginaId: string; datos: DatosChat }) {
  const [estado, setEstado] = useState<EstadoSitio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try { setEstado(await pedir<EstadoSitio>(`/api/soporte/sitio/${encodeURIComponent(paginaId)}`)); setError(null); }
    catch (e: any) { setError(e.message); }
  }, [paginaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (error) return <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">{error}</p>;
  if (!estado) return <div className="flex h-24 items-center justify-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (estado.equipo) return <Bandeja paginaId={paginaId} estado={estado} />;
  return <Visitante paginaId={paginaId} estado={estado} datos={datos} recargar={cargar} />;
}

/** Lo que ve quien visita: su conversación, o la caja para empezarla. */
function Visitante({ paginaId, estado, datos, recargar }: { paginaId: string; estado: EstadoSitio; datos: DatosChat; recargar: () => void }) {
  const delSitio = estado.conversaciones.find(c => !c.experto);
  const [elegida, setElegida] = useState<string | null>(parametro('soporte') || delSitio?.id || null);
  const [texto, setTexto] = useState('');
  const [nombre, setNombre] = useState(estado.yo?.nombre || '');
  const [email, setEmail] = useState(estado.yo?.email || '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actual = elegida && estado.conversaciones.some(c => c.id === elegida) ? elegida : null;

  const empezar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const r = await pedir<{ conversacion: string }>(`/api/soporte/sitio/${encodeURIComponent(paginaId)}/mensajes`, {
        metodo: 'POST', cuerpo: { texto, nombre: nombre || undefined, email: email || undefined },
      });
      setTexto('');
      setElegida(r.conversacion);
      recargar();
    } catch (e: any) { setError(e.message); }
    setEnviando(false);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <MessageCircle className="h-4 w-4 text-emerald-500" /> {datos.titulo || '¿Tienes una duda?'}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {estado.enLinea
            ? <><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Hay alguien del equipo de {estado.sitio} conectado ahora.</>
            : `Ahora no hay nadie conectado: te responderemos aquí${estado.yo?.conCuenta ? ' y te avisaremos' : ' (y por correo, si nos lo dejas)'}.`}
        </p>
        {estado.conversaciones.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {estado.conversaciones.map(c => (
              <button key={c.id} type="button" onClick={() => setElegida(c.id)}
                className={cn('rounded-full px-2.5 py-1 text-xs', c.id === actual ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
                {c.experto ? `Consulta con ${c.experto.nombre}` : 'Ayuda'}{c.sinLeer ? ` · ${c.sinLeer}` : ''}
              </button>
            ))}
          </div>
        )}
      </header>
      {actual ? <Conversacion id={actual} onCambio={recargar} /> : (
        <form className="space-y-2 p-4" onSubmit={e => { e.preventDefault(); void empezar(); }}>
          {datos.intro && <p className="text-sm text-slate-600">{datos.intro}</p>}
          <label className="block text-xs font-medium text-slate-600" htmlFor={`chat-txt-${paginaId}`}>Tu pregunta</label>
          <textarea id={`chat-txt-${paginaId}`} rows={3} value={texto} maxLength={5000} onChange={e => setTexto(e.target.value)}
            placeholder="Por ejemplo: ¿esta batería sirve para una nevera portátil de 12 V?"
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
          {!estado.yo?.conCuenta && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor={`chat-nom-${paginaId}`}>Tu nombre (opcional)</label>
                <input id={`chat-nom-${paginaId}`} value={nombre} maxLength={80} onChange={e => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600" htmlFor={`chat-mail-${paginaId}`}>Tu correo, para avisarte (opcional)</label>
                <input id={`chat-mail-${paginaId}`} type="email" value={email} maxLength={200} onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
              </div>
            </div>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <Button type="submit" disabled={!texto.trim() || enviando}>
            {enviando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />} Enviar
          </Button>
        </form>
      )}
    </section>
  );
}

type FilaBandeja = {
  id: string; estado: string; sinLeer: number; ultimo: string; cliente: string; email: string | null;
  conCuenta: boolean; experto: { id: string; nombre: string } | null; vistazo: string;
};

/** Lo que ve el equipo: las preguntas del sitio, la primera la más reciente. */
function Bandeja({ paginaId, estado }: { paginaId: string; estado: EstadoSitio }) {
  const [filtro, setFiltro] = useState<'abierta' | 'cerrada'>('abierta');
  const [filas, setFilas] = useState<FilaBandeja[] | null>(null);
  const [elegida, setElegida] = useState<string | null>(parametro('soporte'));
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await pedir<{ conversaciones: FilaBandeja[] }>(`/api/soporte/bandeja/${encodeURIComponent(paginaId)}?estado=${filtro}`);
      setFilas(r.conversaciones); setError(null);
    } catch (e: any) { setError(e.message); }
  }, [paginaId, filtro]);
  useEffect(() => {
    void cargar();
    const t = setInterval(() => { if (!document.hidden) void cargar(); }, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <Inbox className="h-4 w-4 text-emerald-500" /> Bandeja de ayuda de {estado.sitio}
        </h3>
        <span className="text-xs text-slate-500">Lo ves porque eres del equipo; los visitantes ven aquí la caja para preguntar.</span>
        <div className="ml-auto flex gap-1">
          {(['abierta', 'cerrada'] as const).map(f => (
            <button key={f} type="button" onClick={() => { setFiltro(f); setElegida(null); }}
              className={cn('rounded-full px-2.5 py-1 text-xs', f === filtro ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
              {f === 'abierta' ? 'Pendientes' : 'Resueltas'}
            </button>
          ))}
        </div>
      </header>
      {error && <p className="p-3 text-sm text-rose-600">{error}</p>}
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className={cn('max-h-[28rem] overflow-y-auto border-slate-100 md:border-r', elegida && 'hidden md:block')}>
          {filas === null && <li className="p-4 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></li>}
          {filas?.length === 0 && (
            <li className="p-4 text-sm text-slate-500">{filtro === 'abierta' ? 'No hay preguntas pendientes.' : 'Todavía no hay conversaciones resueltas.'}</li>
          )}
          {filas?.map(f => (
            <li key={f.id}>
              <button type="button" onClick={() => setElegida(f.id)}
                className={cn('block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', f.id === elegida && 'bg-emerald-50')}>
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {f.cliente}
                  {f.experto && <span className="rounded bg-sky-50 px-1.5 text-[10px] text-sky-700">Consulta · {f.experto.nombre}</span>}
                  {f.sinLeer > 0 && <span className="ml-auto rounded-full bg-emerald-500 px-1.5 text-[10px] text-white">{f.sinLeer}</span>}
                </span>
                <span className="block truncate text-xs text-slate-500">{f.vistazo}</span>
                <span className="text-[10px] text-slate-400">{hace(f.ultimo)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={cn(!elegida && 'hidden md:block')}>
          {elegida ? (
            <>
              <Button variant="ghost" className="m-1 normal-case tracking-normal md:hidden" onClick={() => setElegida(null)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Volver a la lista
              </Button>
              <Conversacion key={elegida} id={elegida} alto="h-96" onCambio={cargar} />
            </>
          ) : <p className="p-6 text-sm text-slate-400">Elige una conversación.</p>}
        </div>
      </div>
    </section>
  );
}
