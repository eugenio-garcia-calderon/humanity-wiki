import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2, Lock, Unlock, CalendarClock } from 'lucide-react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { pedir, hace, ESTADO_CONSULTA, type Conversacion as TConversacion } from './api';

/** Cada cuánto se pregunta si hay mensajes nuevos con la conversación abierta.
 *  La sesión de un visitante no tiene el cable en vivo de la plataforma
 *  (ver la cabecera de `src/server/soporte.ts`), así que se pregunta. Con la
 *  pestaña oculta no se pregunta nada. */
const CADA_MS = 8000;

/**
 * Una conversación del chat de ayuda: los mensajes y la caja para contestar.
 * La usan el visitante, el equipo (desde la bandeja) y el bloque de expertos
 * (tras reservar). Quién es cada uno lo dice el servidor (`papel`).
 */
export default function Conversacion({ id, alto = 'h-80', onCambio }: { id: string; alto?: string; onCambio?: () => void }) {
  const [conv, setConv] = useState<TConversacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const abajo = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      setConv(await pedir<TConversacion>(`/api/soporte/conversaciones/${encodeURIComponent(id)}`));
      setError(null);
    } catch (e: any) { setError(e.message); }
  }, [id]);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => { if (!document.hidden) void cargar(); }, CADA_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const cuantos = conv?.mensajes.length || 0;
  useEffect(() => { abajo.current?.scrollIntoView({ block: 'nearest' }); }, [cuantos]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      await pedir(`/api/soporte/conversaciones/${encodeURIComponent(id)}/mensajes`, { metodo: 'POST', cuerpo: { texto: t } });
      setTexto('');
      await cargar();
      onCambio?.();
    } catch (e: any) { setError(e.message); }
    setEnviando(false);
  };

  const cambiarEstado = async (estado: 'abierta' | 'cerrada') => {
    try {
      await pedir(`/api/soporte/conversaciones/${encodeURIComponent(id)}/estado`, { metodo: 'PUT', cuerpo: { estado } });
      await cargar();
      onCambio?.();
    } catch (e: any) { setError(e.message); }
  };

  if (!conv) {
    return error
      ? <p className="p-3 text-sm text-rose-600">{error}</p>
      : <div className="flex h-24 items-center justify-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }
  const mio = (de: string) => (conv.papel === 'equipo' ? de === 'equipo' : de === 'cliente');

  return (
    <div className="flex flex-col">
      {(conv.cliente || conv.consulta || conv.papel === 'equipo') && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
          {conv.cliente && (
            <span>
              <strong className="text-slate-700">{conv.cliente.nombre || 'Visitante sin nombre'}</strong>
              {conv.cliente.email ? ` · ${conv.cliente.email}` : ' · sin correo'}
              {conv.cliente.conCuenta ? ' · con cuenta' : ''}
            </span>
          )}
          {conv.consulta && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {new Date(conv.consulta.inicio).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' · '}{ESTADO_CONSULTA[conv.consulta.estado] || conv.consulta.estado}
            </span>
          )}
          {conv.papel === 'equipo' && (
            <Button variant="ghost" className="ml-auto px-2 py-1 normal-case tracking-normal"
              onClick={() => cambiarEstado(conv.estado === 'abierta' ? 'cerrada' : 'abierta')}>
              {conv.estado === 'abierta'
                ? <><Lock className="mr-1 h-3.5 w-3.5" /> Marcar resuelta</>
                : <><Unlock className="mr-1 h-3.5 w-3.5" /> Reabrir</>}
            </Button>
          )}
        </div>
      )}
      <div className={cn('space-y-2 overflow-y-auto px-3 py-3', alto)} aria-live="polite">
        {conv.mensajes.map(m => m.de === 'sistema' ? (
          <p key={m.id} className="mx-auto max-w-[90%] whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">{m.texto}</p>
        ) : (
          <div key={m.id} className={cn('flex', mio(m.de) ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 text-sm',
              mio(m.de) ? 'rounded-br-sm bg-emerald-500 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800')}>
              <p className="whitespace-pre-line break-words">{m.texto}</p>
              <p className={cn('mt-0.5 text-[10px]', mio(m.de) ? 'text-emerald-50' : 'text-slate-400')}>
                {m.de === 'equipo' && m.autor && !mio(m.de) ? `${m.autor} · ` : ''}{hace(m.fecha)}
              </p>
            </div>
          </div>
        ))}
        <div ref={abajo} />
      </div>
      {error && <p className="px-3 pb-1 text-xs text-rose-600">{error}</p>}
      <form className="flex items-end gap-2 border-t border-slate-100 p-2" onSubmit={e => { e.preventDefault(); void enviar(); }}>
        <label className="sr-only" htmlFor={`resp-${id}`}>Escribe tu mensaje</label>
        <textarea id={`resp-${id}`} rows={2} value={texto} maxLength={5000}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); } }}
          placeholder={conv.papel === 'equipo' ? 'Escribe la respuesta…' : 'Escribe tu mensaje…'}
          className="min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none" />
        <Button type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar" className="h-10 w-10 rounded-xl p-0">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
