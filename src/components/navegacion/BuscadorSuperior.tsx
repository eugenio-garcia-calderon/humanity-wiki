import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import CajaBusqueda from '../buscador/CajaBusqueda';

/*
 * EL BUSCADOR DE ARRIBA (2026-08-24, agente de APP/UX)
 * ============================================================================
 * Eugenio: «quiero que la barra del buscador esté arriba centrada como en
 * YouTube, y que tenga la opción de IA como la imagen que te adjunto, entonces
 * el nombre de la plataforma pasa a estar a la izquierda».
 *
 * DOS BÚSQUEDAS DISTINTAS EN UNA CAJA, y el interruptor dice cuál:
 *
 *   · apagado → busca PALABRAS en lo que ya existe. Instantáneo y gratis.
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
 *
 * ── LO QUE CAMBIA HOY, Y POR QUÉ (2026-08-24, prog2) ────────────────────────
 * Esta caja llevaba a `/explorar?q=…`, que filtra el muro. Eugenio pidió otra
 * cosa: «según vas escribiendo se va actualizando… y cuando el usuario le dé a
 * buscar se abre una página con esas publicaciones como si fuese un buscador de
 * Google o Yahoo». Eso son dos piezas —las sugerencias mientras escribes y una
 * página de resultados con el resumen de la IA arriba— y las dos existen ya.
 *
 * Lo único que había que decidir es si escribirlas otra vez aquí. **No.** El
 * cuerpo de la caja es `CajaBusqueda`, el mismo componente que usa la página de
 * resultados, y aquí sólo se le pone la piel de la barra y estos dos botones.
 * Dos cajas de buscar empiezan iguales y acaban portándose distinto según dónde
 * pinches, que es la peor forma de romper un buscador: sin que falle nada.
 */

export default function BuscadorSuperior({ compacto = false }: { compacto?: boolean }) {
  const navegar = useNavigate();
  const [conIA, setConIA] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
      <CajaBusqueda
        pastilla
        compacto={compacto}
        placeholder={conIA ? 'Pregúntale a la IA…' : 'Buscar en la Red…'}
        className={cn(conIA && '[&_form]:border-violet-300 [&_form]:ring-1 [&_form]:ring-violet-200')}
        // CON EL INTERRUPTOR ENCENDIDO, BUSCAR ES PREGUNTAR. Las sugerencias de
        // debajo siguen saliendo y siguen llevando a la cosa concreta: son
        // gratis y no dependen de la IA. Lo que cambia es a dónde va el Intro.
        alBuscar={q => navegar(conIA ? `/ia?q=${encodeURIComponent(q)}` : `/buscar?q=${encodeURIComponent(q)}`)}
        derecha={
          <>
            {/* EL INTERRUPTOR, DENTRO DE LA CAJA. Fuera sería un ajuste de la
                página; dentro es una propiedad de lo que estás escribiendo, que
                es lo que de verdad es. */}
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
              {/* La pastilla del interruptor: dice si está encendido sin tener
                  que interpretar un color. */}
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
          </>
        }
      />
    </div>
  );
}
