import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * EL BUSCADOR DE ARRIBA (2026-08-24, agente de APP/UX)
 * ============================================================================
 * Eugenio: «quiero que la barra del buscador esté arriba centrada como en
 * YouTube, y que tenga la opción de IA como la imagen que te adjunto, entonces
 * el nombre de la plataforma pasa a estar a la izquierda».
 *
 * DOS BÚSQUEDAS DISTINTAS EN UNA CAJA, y el interruptor dice cuál:
 *
 *   · apagado → busca PALABRAS en lo que ya existe. Va a `/explorar?q=…`, que
 *     es la pantalla que ya sabe filtrar. Instantáneo y gratis.
 *   · encendido → le PREGUNTA a la IA. Va a `/ia?q=…`. Tarda unos segundos y
 *     gasta puntos.
 *
 * POR ESO EL INTERRUPTOR ES VISIBLE Y NO UN AJUSTE ESCONDIDO: son dos cosas con
 * dos precios y dos velocidades, y quien escribe tiene que saber cuál va a
 * pulsar antes de pulsarla. Un buscador que a veces cobra sin avisar es un
 * buscador en el que se deja de escribir.
 *
 * EL ESTADO NO SE RECUERDA, a propósito. La IA es la excepción, no la forma
 * normal de buscar: si se quedara encendido, la siguiente búsqueda tonta
 * —«camión»— costaría puntos sin que nadie lo hubiera pedido esta vez.
 */

export default function BuscadorSuperior({ compacto = false }: { compacto?: boolean }) {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [conIA, setConIA] = useState(false);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = texto.trim();
    if (!q) return;
    navegar(conIA ? `/ia?q=${encodeURIComponent(q)}` : `/explorar?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={buscar} className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
      <div className={cn(
        'flex min-w-0 flex-1 items-center rounded-full border bg-white transition-colors',
        'max-w-xl focus-within:border-slate-400',
        conIA ? 'border-violet-300 ring-1 ring-violet-200' : 'border-slate-300',
        compacto ? 'h-7' : 'h-9',
      )}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={conIA ? 'Pregúntale a la IA…' : 'Buscar en la Red…'}
          aria-label={conIA ? 'Preguntar a la IA' : 'Buscar'}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />

        {/* EL INTERRUPTOR, DENTRO DE LA CAJA. Fuera sería un ajuste de la
            página; dentro es una propiedad de lo que estás escribiendo, que es
            lo que de verdad es. */}
        <button
          type="button"
          onClick={() => setConIA(v => !v)}
          title={conIA ? 'Buscando con IA — cuesta puntos' : 'Búsqueda con IA'}
          aria-label="Búsqueda con IA"
          aria-pressed={conIA}
          className={cn(
            'mr-1 flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 transition-colors',
            conIA ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden text-[11px] font-black lg:inline">IA</span>
          {/* La pastilla del interruptor: dice si está encendido sin tener que
              interpretar un color. */}
          <span className={cn('relative h-3.5 w-6 shrink-0 rounded-full transition-colors',
            conIA ? 'bg-violet-600' : 'bg-slate-300')}>
            <span className={cn('absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all',
              conIA ? 'left-3' : 'left-0.5')} />
          </span>
        </button>

        <button
          type="submit"
          title="Buscar"
          aria-label="Buscar"
          className={cn(
            'grid shrink-0 place-items-center rounded-full text-white transition-colors',
            conIA ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800',
            compacto ? 'mr-0.5 h-6 w-8' : 'mr-1 h-7 w-10',
          )}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
