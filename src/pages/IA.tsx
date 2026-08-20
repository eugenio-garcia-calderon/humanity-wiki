// ============================================================================
// LA HERRAMIENTA «IA» (2026-08-20, petición de Eugenio: «añade una nueva
// página que sea "IA" que abra en pantalla completa el mismo elemento de ia
// que ya tenemos construido […] todo lo mismo que la ventana de la derecha
// pero esta vez más ampliada. sin duplicar nada»).
// ============================================================================
// NO HAY UN SEGUNDO CHAT. Es el mismo `AIAssistant` de la columna derecha,
// montado en `modo="pagina"`: por dentro reutiliza `panelBody`, el bloque que
// ya servía igual para el escritorio y para el móvil. Un segundo chat con su
// propio estado sería la cuarta cara del mismo asistente y acabaría
// comportándose distinto — es exactamente el error que costó las páginas
// «Universo» I, II y III (ver src/pages/CLAUDE.md).
//
// Lo que esta página añade es SITIO: el historial y los ajustes caben sin
// apretujarse, y al lado entra el panel de gasto, que en una columna de 20%
// no se podía enseñar.
import { useState } from 'react';
import { Sparkles, Euro, MessageSquare } from 'lucide-react';
import AIAssistant from '../components/ai/AIAssistant';
import PanelMedicion from '../components/ai/PanelMedicion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

const ADMIN = 4;

export default function IA() {
  const { user } = useAuth();
  // En pantallas estrechas no caben las dos columnas: se alternan con
  // pestañas en vez de encogerlas hasta que ninguna sirva.
  const [vista, setVista] = useState<'chat' | 'gasto'>('chat');

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Pestañas, solo en estrecho */}
      <div className="lg:hidden flex items-center gap-1 p-2 border-b border-slate-100 shrink-0">
        {([['chat', 'Conversación', MessageSquare], ['gasto', 'En qué se gasta', Euro]] as const).map(([k, etiqueta, Icono]) => (
          <button
            key={k}
            onClick={() => setVista(k)}
            className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              vista === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50')}
          >
            <Icono className="w-3.5 h-3.5" /> {etiqueta}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* EL CHAT — el mismo componente de siempre, a lo ancho. */}
        <div className={cn('flex-1 min-w-0 min-h-0', vista === 'chat' ? 'flex' : 'hidden lg:flex')}>
          <div className="flex-1 min-w-0 min-h-0">
            <AIAssistant modo="pagina" />
          </div>
        </div>

        {/* EL GASTO — lo que en la columna estrecha no cabía. */}
        <aside className={cn('w-full lg:w-80 xl:w-96 shrink-0 border-l border-slate-200 bg-slate-50/40 min-h-0',
          vista === 'gasto' ? 'block' : 'hidden lg:block')}>
          {user ? (
            <PanelMedicion esAdmin={(user.roleLevel ?? 0) >= ADMIN} />
          ) : (
            <div className="p-6 text-center">
              <Sparkles className="w-6 h-6 mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Inicia sesión para ver tu consumo de IA.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
