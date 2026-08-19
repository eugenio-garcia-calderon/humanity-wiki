// ============================================================================
// ESCRITORIO (2026-08-19, petición de Eugenio: «ventanas donde en una esté el
// juego, en otra otra página de la app, y en otra el navegador propio, y la IA
// interna puede verlo e interactuar a través del chat»).
// ============================================================================
// Aquí solo viven tres cosas: el gestor de ventanas, la dirección que hay
// abierta en el navegador, y el chat que la lee.
//
// El chat NO es uno nuevo: es el asistente de siempre, al que se le cuenta qué
// web estás mirando. Duplicarlo habría significado dos historiales, dos
// contadores de gasto y dos sitios donde arreglar el mismo fallo.
import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Globe, X, ExternalLink } from 'lucide-react';
import GestorVentanas from '../components/ventanas/GestorVentanas';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';

interface Turno { quien: 'tu' | 'ia'; texto: string }

export default function Escritorio() {
  /** Qué web hay abierta AHORA en la ventana del navegador. */
  const [pagina, setPagina] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turnos, pensando]);

  /**
   * Preguntar CON la página delante. El servidor lee la web (el mismo
   * `/api/navegador/leer` que usa la barra de direcciones) y le pasa a la IA el
   * texto y los enlaces: eso es literalmente «que la IA vea el navegador».
   */
  const preguntar = async () => {
    const q = texto.trim();
    if (!q || pensando) return;
    setTexto('');
    setTurnos(t => [...t, { quien: 'tu', texto: q }]);
    setPensando(true);
    try {
      let contexto = '';
      if (pagina) {
        const r = await fetch(`/api/navegador/leer?url=${encodeURIComponent(pagina)}`, { credentials: 'include' });
        const j = await r.json();
        if (!j.error) {
          contexto = [
            `[La persona está mirando esta página en el navegador de la app]`,
            `Dirección: ${j.url}`,
            j.titulo ? `Título: ${j.titulo}` : '',
            '',
            'CONTENIDO DE LA PÁGINA:',
            (j.texto || '').slice(0, 24000),
            j.recortado ? '\n[…la página sigue, se ha recortado]' : '',
            '',
            'ENLACES DE LA PÁGINA (puedes proponer abrir uno):',
            (j.enlaces || []).slice(0, 30).map((e: any) => `- ${e.texto} → ${e.url}`).join('\n'),
            '',
          ].join('\n');
        }
      }
      const r = await fetch('/api/ai/chat', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contexto ? `${contexto}\n\nPREGUNTA: ${q}` : q,
          // El mismo asistente de la app; no uno aparte.
          conversation_id: null,
        }),
      });
      const j = await r.json().catch(() => null);
      const respuesta = j?.reply || j?.message || j?.texto
        || (r.ok ? 'No he sabido qué contestar.' : (j?.error || 'El asistente no ha contestado.'));
      setTurnos(t => [...t, { quien: 'ia', texto: String(respuesta) }]);
    } catch {
      setTurnos(t => [...t, { quien: 'ia', texto: 'No he podido conectar con el asistente.' }]);
    } finally { setPensando(false); }
  };

  return (
    <div className="absolute inset-0 flex">
      <div className="relative flex-1 min-w-0">
        <GestorVentanas onPaginaNavegador={setPagina} />
      </div>

      {/* El chat, pegado a la derecha */}
      {abierto ? (
        <aside className="w-[22rem] shrink-0 flex flex-col border-l border-slate-200 bg-white">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
            <Bot className="w-4 h-4 text-emerald-600" />
            <p className="text-xs font-black text-slate-800">Asistente</p>
            <button onClick={() => setAbierto(false)} className="ml-auto p-1 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Qué está viendo: si no se dice, nadie sabe que la IA lo ve */}
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[10px] border-b',
            pagina ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400')}>
            <Globe className="w-3 h-3 shrink-0" />
            {pagina ? (
              <>
                <span className="truncate">Viendo: {(() => { try { return new URL(pagina).hostname; } catch { return pagina; } })()}</span>
                <a href={pagina} target="_blank" rel="noreferrer" className="ml-auto shrink-0 hover:text-emerald-600">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            ) : <span>Abre el navegador y la IA verá lo que tú veas.</span>}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
            {turnos.length === 0 && (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pregúntame sobre la página que tengas abierta: «resúmemela», «¿cuánto cuesta?»,
                «¿qué enlaces hay que me interesen?».
              </p>
            )}
            {turnos.map((t, i) => (
              <div key={i} className={cn('text-[11px] leading-relaxed rounded-xl px-3 py-2 whitespace-pre-wrap',
                t.quien === 'tu' ? 'bg-emerald-50 text-emerald-900 ml-6' : 'bg-slate-50 text-slate-700 mr-2')}>
                {t.texto}
              </div>
            ))}
            {pensando && (
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {pagina ? 'Leyendo la página…' : 'Pensando…'}
              </p>
            )}
            <div ref={finRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); preguntar(); }}
            className="flex items-center gap-1.5 p-2.5 border-t border-slate-100">
            <input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={pagina ? 'Pregunta sobre esta página…' : 'Pregunta lo que quieras…'}
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-300"
            />
            <Button type="submit" disabled={!texto.trim() || pensando} className="p-2 shrink-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </aside>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          title="Abrir el asistente"
          className="absolute right-3 bottom-16 z-[100001] w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white grid place-items-center shadow-xl"
        >
          <Bot className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
