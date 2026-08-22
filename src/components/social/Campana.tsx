// ============================================================================
// LA CAMPANA (2026-08-21, Eugenio: «crea una campanita arriba a la derecha en
// el menú para gestionar las notificaciones de cuando alguien te pone un
// comentario, etc»)
// ============================================================================
// La tabla de avisos llevaba meses vacía porque nadie los escribía; ahora los
// escribe `avisos.ts` y esto es donde se leen.
//
// SOLO PIDE EL NÚMERO. Cada minuto se pregunta cuántos hay sin leer, que es un
// entero; la lista completa se pide únicamente al abrir. Traerse cincuenta
// avisos cada minuto para pintar un «3» sería pagar una lista para mirar un
// número.
//
// MARCAR UNO NO ES MARCAR TODOS. Al pulsar un aviso se marca ese; al pulsar
// «marcar todo» se marcan todos. Marcarlos todos solo por abrir la campana
// haría desaparecer los que no has llegado a leer.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Heart, UserPlus, Bookmark, AtSign, CornerDownRight, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useCerrarAlPulsarFuera } from '../../hooks/useCerrarAlPulsarFuera';

interface Aviso {
  id: number;
  type: string;
  payload: any;
  entity_type: string;
  entity_id: string;
  read_at: string | null;
  created_at: string;
}

/** Cada tipo con su icono y su frase. Un aviso que no sabe redactarse no se
 *  esconde: sale con su tipo en crudo, que al menos dice que algo pasó. */
const COMO: Record<string, { icono: any; frase: (n: string) => string }> = {
  comentario:        { icono: MessageSquare,   frase: n => `${n} ha comentado tu publicación` },
  respuesta:         { icono: CornerDownRight, frase: n => `${n} ha respondido a tu comentario` },
  mencion:           { icono: AtSign,          frase: n => `${n} te ha nombrado` },
  reaccion:          { icono: Heart,           frase: n => `A ${n} le gusta lo que has publicado` },
  seguidor:          { icono: UserPlus,        frase: n => `${n} ha empezado a seguirte` },
  guardado:          { icono: Bookmark,        frase: n => `${n} ha guardado algo tuyo` },
  nueva_publicacion: { icono: FileText,        frase: n => `${n} ha publicado algo nuevo` },
};

/** «hace 3 min», «ayer». Una fecha completa en una lista de avisos obliga a
 *  restar para saber si es de ahora o de la semana pasada. */
const hace = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ayer';
  return `hace ${Math.floor(s / 86400)} días`;
};

/** Adónde lleva un aviso. Si no se sabe, NO se navega a ninguna parte: llevar
 *  a alguien a una página en blanco es peor que no llevarlo. */
const destinoDe = (a: Aviso): string | null => {
  if (a.entity_type === 'users') return `/personas/${a.entity_id}`;
  if (a.entity_type === 'publications') return `/explorar`;
  if (a.entity_type === 'knowledge_windows') return `/paginas/${a.entity_id}`;
  if (a.entity_type === 'proyectos') return `/proyectos`;
  return null;
};

export default function Campana({ compacto }: { compacto?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [abierta, setAbierta] = useState(false);
  const [sinLeer, setSinLeer] = useState(0);
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  // El número, cada minuto. No cada segundo: un aviso que tarda medio minuto
  // en aparecer no le arruina el día a nadie, y una petición por segundo por
  // persona sí le arruina el día al servidor.
  useEffect(() => {
    if (!user) { setSinLeer(0); return; }
    const pedir = () => fetch('/api/notifications/sin-leer', { credentials: 'include' })
      .then(r => r.json()).then(j => setSinLeer(j?.n || 0)).catch(() => {});
    pedir();
    const t = setInterval(pedir, 60000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!abierta) return;
    fetch('/api/notifications', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setAvisos(Array.isArray(j) ? j : []))
      .catch(() => setAvisos([]));
  }, [abierta]);

  // ESTA ERA LA RARA DE LAS SIETE: escuchaba `click` en `window`, que se
  // dispara al SOLTAR el botón, así que el mismo clic que abría el panel podía
  // cerrarlo antes de que se viera. Ahora usa lo mismo que las demás.
  useCerrarAlPulsarFuera(caja, abierta, () => setAbierta(false));

  const abrirAviso = async (a: Aviso) => {
    if (!a.read_at) {
      setAvisos(v => (v || []).map(x => (x.id === a.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setSinLeer(n => Math.max(0, n - 1));
      fetch('/api/notifications/read', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id }),
      }).catch(() => {});
    }
    const d = destinoDe(a);
    if (d) { setAbierta(false); navigate(d); }
  };

  const marcarTodo = () => {
    setAvisos(v => (v || []).map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setSinLeer(0);
    fetch('/api/notifications/read', { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  if (!user) return null;

  return (
    <div className="relative shrink-0" ref={caja}>
      <button
        onClick={e => { e.stopPropagation(); setAbierta(v => !v); }}
        title={sinLeer ? `${sinLeer} sin leer` : 'Notificaciones'}
        aria-label={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
        className={cn('relative grid place-items-center rounded-lg transition-colors',
          compacto ? 'w-7 h-7' : 'w-9 h-9',
          abierta ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
      >
        <Bell className={cn(compacto ? 'w-4 h-4' : 'w-5 h-5')} />
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black grid place-items-center">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierta && (
        <div
          onClick={e => e.stopPropagation()}
          className={cn(
            'overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150',
            // ══ EN EL MÓVIL, CENTRADA Y FIJA ═══════════════════════════════
            // (2026-08-22, hormiguero: «la ventanita que se abre de
            // notificaciones no está centrada en versión móvil»).
            //
            // Colgaba de la campana con `absolute right-0`, y la campana está
            // pegada al borde derecho: en una pantalla de 375 px, un panel de
            // 304 px salía descentrado y rozando el borde, con el texto de la
            // izquierda casi contra el marco.
            //
            // En el teléfono pasa a ser `fixed` y centrada en la PANTALLA, con
            // el mismo margen a los dos lados y un alto que nunca se sale.
            // Fija y no absoluta a propósito: absoluta la arrastra el
            // desplazamiento de la cabecera y se va de la vista.
            'fixed left-1/2 -translate-x-1/2 top-[3.25rem] w-[calc(100vw-1.5rem)] max-w-[22rem] max-h-[70vh]',
            // En pantalla ancha se queda como estaba: colgando de la campana,
            // que es donde el ojo la busca cuando hay sitio de sobra.
            'sm:absolute sm:left-auto sm:translate-x-0 sm:right-0 sm:top-full sm:mt-1 sm:w-[19rem] sm:max-h-[26rem]',
          )}
        >
          <div className="sticky top-0 bg-white px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Notificaciones</p>
            {sinLeer > 0 && (
              <button onClick={marcarTodo} className="text-[10px] font-bold text-emerald-700 hover:underline">
                Marcar todo como leído
              </button>
            )}
          </div>

          {avisos === null ? (
            <p className="px-3 py-4 text-[11px] text-slate-300 italic">Cargando…</p>
          ) : avisos.length === 0 ? (
            <p className="px-3 py-6 text-[11px] text-slate-400 text-center">
              Nada todavía. Aquí aparecerá cuando alguien comente, responda o te siga.
            </p>
          ) : avisos.map(a => {
            const c = COMO[a.type];
            const Icono = c?.icono || Bell;
            const nombre = a.payload?.nombre || 'Alguien';
            return (
              <button
                key={a.id}
                onClick={() => abrirAviso(a)}
                className={cn('w-full text-left px-3 py-2 flex items-start gap-2.5 border-b border-slate-50 last:border-0 transition-colors',
                  a.read_at ? 'hover:bg-slate-50' : 'bg-emerald-50/50 hover:bg-emerald-50')}
              >
                <span className={cn('mt-0.5 w-6 h-6 shrink-0 rounded-full grid place-items-center',
                  a.read_at ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700')}>
                  <Icono className="w-3 h-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-slate-700 leading-snug">
                    {c ? c.frase(nombre) : `${nombre}: ${a.type}`}
                  </span>
                  {a.payload?.texto && (
                    <span className="block text-[10px] text-slate-400 truncate mt-0.5">«{a.payload.texto}»</span>
                  )}
                  <span className="block text-[9px] text-slate-300 mt-0.5">{hace(a.created_at)}</span>
                </span>
                {!a.read_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
