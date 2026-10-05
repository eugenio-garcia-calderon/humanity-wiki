import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
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
  // Sin interruptor de IA (2026-10-05): preguntar a la IA se hace con el
  // botón flotante del chat, abajo a la derecha.
  const conIA = false;

  return (
    // ══ CENTRADA EN LA PANTALLA, NO EN EL HUECO QUE SOBRA ═══════════════════
    // (2026-08-25, Eugenio: «y que esté centrado».)
    //
    // Centrar en el hueco no basta: el raíl de la derecha (Feedback, iconos,
    // tu foto) es 97 px más ancho que el de la izquierda, así que el centro
    // del hueco cae 53 px a la izquierda del centro de la pantalla. Medido,
    // no estimado.
    //
    // Desde 1280 px la caja se saca del flujo y se clava en el centro de la
    // ventana. **Solo desde ahí**: por debajo no cabe y se montaría encima de
    // los iconos — a 1280 el borde derecho de la caja queda a 916 px y los
    // iconos empiezan en 936, veinte de margen. Por debajo se queda centrada
    // en el hueco, que es lo que se puede.
    //
    // Y AL SACARLA DEL FLUJO HAY QUE DEVOLVERLE EL EMPUJE A OTRO: quien manda
    // los iconos a la derecha era esta caja al crecer. Desde 1280 lo hace el
    // hueco vacío de `Layout.tsx`, que recupera su `flex-1` justo a esa
    // anchura. Si no, los iconos se vendrían al centro con la caja encima.
    // Un 20 % más estrecha (2026-10-05): 34,5 → 27,6 rem, y con tope también
    // por debajo de `xl`, donde antes se estiraba todo lo que hubiera libre.
    <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 lg:max-w-[27.6rem]
      xl:absolute xl:left-1/2 xl:w-[27.6rem] xl:-translate-x-1/2 xl:flex-none">
      {/* ══ EN UNA PANTALLA MUY ESTRECHA, UN BOTÓN Y NO UNA CAJA ══════════
          Medido a 320 px: la caja quedaba en 18 px de ancho **con 116 px de
          botones dentro**, y el campo de escribir medía **0**. O sea que el
          buscador estaba ahí, se veía, y no se podía usar: los iconos se
          pintaban unos encima de otros y no había dónde teclear.

          Un buscador que no acepta una letra es peor que no tener buscador en
          la barra, porque el sitio ya parece ocupado. Así que por debajo de
          `lg` esto es una lupa que lleva a la página de búsqueda —donde la caja
          tiene la pantalla entera— y de `lg` para arriba sigue siendo la caja
          de siempre, con sus sugerencias y su interruptor.

          ── EL CORTE SE ELIGIÓ MIDIENDO, NO A OJO ──────────────────────────
          Primero se puso en `sm` (640) y el campo **seguía midiendo 0**: se
          cambiaba un buscador inservible por otro inservible 320 px más allá.
          En `md` (768) tampoco: a 800 px el campo era 0. El motivo está en el
          resto de la fila — a esos anchos el nombre de la plataforma ya se
          pinta entero y ocupa 183 px, y a la caja le quedan 106.

          A `lg` (1024) el campo mide 78 px con el interruptor compacto: poco,
          pero se escribe y se ve lo escrito. Por debajo, la lupa.

          Es lo mismo que hace YouTube en un teléfono, y por el mismo motivo:
          ahí arriba no caben a la vez un campo de texto útil y la cuenta. */}
      <button
        type="button"
        onClick={() => navegar('/buscar')}
        title="Buscar"
        aria-label="Buscar"
        className={cn(
          'grid shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:hidden',
          compacto ? 'h-7 w-7' : 'h-9 w-9',
        )}
      >
        <Search className="h-5 w-5" />
      </button>

      <CajaBusqueda
        pastilla
        compacto={compacto}
        placeholder="Buscar contenido…"
        className={cn('hidden lg:block', conIA && '[&_form]:border-violet-300 [&_form]:ring-1 [&_form]:ring-violet-200')}
        // CON EL INTERRUPTOR ENCENDIDO, BUSCAR ES PREGUNTAR. Las sugerencias de
        // debajo siguen saliendo y siguen llevando a la cosa concreta: son
        // gratis y no dependen de la IA. Lo que cambia es a dónde va el Intro.
        alBuscar={q => navegar(conIA ? `/ia?q=${encodeURIComponent(q)}` : `/buscar?q=${encodeURIComponent(q)}`)}
        // CON LA IA ENCENDIDA, PEGAR UNA CAPTURA AQUÍ LA MANDA A LA IA
        // (2026-08-25, Eugenio: «el buscador de IA no me permite pegarle
        // imágenes»). Esta caja no sabe adjuntar y no debe aprender: los
        // formatos, el tamaño máximo y el aviso de error viven en el chat, en
        // un solo sitio. Aquí solo se le pasa el fichero y él lo abre y lo
        // adjunta. Con el interruptor apagado no se pasa nada, y pegar un
        // fichero en una caja de buscar palabras sigue sin hacer nada.
        alPegarFichero={conIA ? (f => window.dispatchEvent(new CustomEvent('ai:adjuntar', { detail: f }))) : undefined}
        derecha={
          <>
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
