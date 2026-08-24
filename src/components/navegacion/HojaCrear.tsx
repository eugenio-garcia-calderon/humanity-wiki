import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { abrirVentana } from '../ventanas/bus';
import {
  EstilosPrevias,
  PreviaMapa, PreviaEsquema, PreviaPagina, PreviaTabla, PreviaTareas, PreviaComercio,
  PreviaTelecom, PreviaIA, PreviaCalendario, PreviaArchivos, PreviaPublicaciones,
  PreviaMundo, PreviaNavegador,
} from '../bienvenida/previas';

/*
 * CREAR — LA HOJA QUE SUBE DESDE EL BOTÓN (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Eugenio: «el botón del centro será un botón de crear, y aquí estarán todas
 * las herramientas que hemos desarrollado hasta ahora. Se abrirá un menú desde
 * el centro inferior hasta la mitad de la pantalla, tanto en móvil como en
 * ordenador».
 *
 * MEDIA PANTALLA Y NO MÁS, en los dos tamaños: crear es un paso de un segundo
 * —eliges qué y te vas—, no una pantalla donde quedarse. Ocupando la mitad, lo
 * que estabas haciendo sigue ahí detrás y se ve; a pantalla completa habría que
 * cerrarla para recordar de dónde venías.
 *
 * SUBE DESDE ABAJO porque es de donde sale el botón que la abre. Un menú que
 * aparece lejos del dedo que lo ha pedido obliga a buscarlo con la vista.
 *
 * EL ORDEN NO ES EL DEL RAÍL. Aquí manda con qué frecuencia se crea cada cosa,
 * no cómo se organizan después: la cámara y la publicación primero —lo que se
 * hace de pie, con el móvil en la mano— y las herramientas de escritorio
 * después. Es la misma lista de cosas y dos preguntas distintas.
 */

/*
 * CADA COSA CON SU DIBUJO (2026-08-24). Eugenio: «en el cajetín central de
 * herramientas utiliza las imágenes y animaciones que hiciste para esta
 * página, son preciosas y chulas con esa función de HOVER animada».
 *
 * Son LAS MISMAS de la portada, importadas de `bienvenida/previas.tsx`, no
 * copiadas. Y eso importa más aquí que en ninguna otra parte: el dibujo que ve
 * un desconocido al decidir si se registra tiene que ser exactamente el que
 * verá al ir a crear esa cosa. Si se separan, la promesa de la portada deja de
 * cumplirse en la primera pantalla de dentro.
 *
 * TRECE COSAS Y ONCE DIBUJOS: «Proyecto» y «Tarea» comparten el tablero, y
 * «Foto o vídeo» comparte con «Archivo» las miniaturas. Repetir un dibujo
 * cuando dos cosas se parecen de verdad es honesto; inventar dos distintos para
 * que no se repitan sería decorar una diferencia que no existe.
 */
/*
 * ALGUNAS COSAS NO SON UNA PÁGINA (2026-08-24). Eugenio: «la herramienta de
 * navegador, donde podía navegar en internet, cuando hago clic no me lleva
 * ahí».
 *
 * Y no llevaba a ningún sitio porque no lo hay: el navegador no es una ruta,
 * es una VENTANA que `GestorVentanas` abre encima de lo que estés haciendo
 * (vive en el Layout, así que está montado en todas las páginas). La tarjeta
 * apuntaba a `/archivos` —lo más parecido que había— y por eso al pulsarla
 * aparecían tus archivos en vez de internet.
 *
 * Por eso una cosa lleva `a` (una ruta) **o** `abrir` (una orden). Nunca las
 * dos: si tuviera las dos, la tarjeta haría dos cosas y habría que leer el
 * código para saber cuál gana.
 */
interface Cosa {
  nombre: string;
  Previa: () => any;
  a?: string;
  abrir?: () => void;
  nota?: string;
}

const COSAS: Cosa[] = [
  { nombre: 'Foto o vídeo', Previa: PreviaArchivos,      a: '/?atajo=crear',      nota: 'Con la cámara' },
  { nombre: 'Publicación',  Previa: PreviaPublicaciones, a: '/explorar?crear=1',  nota: 'En el muro' },
  { nombre: 'Proyecto',     Previa: PreviaTareas,        a: '/proyectos?nuevo=1', nota: 'Con su tablero' },
  { nombre: 'Tarea',        Previa: PreviaTareas,        a: '/tareas?nueva=1' },
  { nombre: 'Página',       Previa: PreviaPagina,        a: '/paginas?nueva=1',   nota: 'Texto, fotos y vídeo' },
  { nombre: 'Esquema',      Previa: PreviaEsquema,       a: '/esquemas?nuevo=1',  nota: 'Ideas conectadas' },
  { nombre: 'Mapa',         Previa: PreviaMapa,          a: '/mapas?nuevo=1' },
  { nombre: 'Tabla',        Previa: PreviaTabla,         a: '/tablas?nueva=1',    nota: 'Datos con columnas' },
  { nombre: 'Fecha',        Previa: PreviaCalendario,    a: '/calendario?nuevo=1' },
  { nombre: 'Producto',     Previa: PreviaComercio,      a: '/comercio?nuevo=1',  nota: 'Para vender' },
  { nombre: 'Persona',      Previa: PreviaTelecom,       a: '/personas?nueva=1' },
  { nombre: 'Archivo',      Previa: PreviaArchivos,      a: '/archivos' },
  { nombre: 'Pedírselo a la IA', Previa: PreviaIA,       a: '/ia',                nota: 'Que lo haga ella' },
  // LAS TRES QUE FALTABAN (2026-08-24, Eugenio: «cuidado que hay herramientas
  // que aún no están en ese menú central, como el visor 3D o el navegador o
  // CONTACTOS»). Se habían quedado fuera al montar la hoja, y ahora que el menú
  // de la derecha ya no lleva herramientas, **éste es su único sitio**: si no
  // estuvieran aquí, no habría forma de llegar a ellas.
  { nombre: 'Visor 3D',     Previa: PreviaMundo,         a: '/juego',             nota: 'Camina por tus proyectos' },
  // `about:inicio` es la página de arranque del propio navegador, la misma con
  // la que lo abría el menú ☰ de antes. No se le pasa una web de verdad: quien
  // lo abre desde aquí todavía no ha dicho a dónde quiere ir.
  { nombre: 'Navegador',    Previa: PreviaNavegador,
    abrir: () => abrirVentana({ titulo: 'Navegador', clase: 'navegador', destino: 'about:inicio' }),
    nota: 'Navega por internet' },
  { nombre: 'Contactos',    Previa: PreviaTelecom,       a: '/telefono',          nota: 'Tu gente y sus llamadas' },
];

/*
 * LA HOJA ES PARTE DEL MENÚ, NO ALGO QUE HAY «FUERA» (2026-08-24). Eugenio:
 * «el hover de crear no se queda fijo cuando lo muevo a la ventana central
 * para explorar las herramientas».
 *
 * Cuando la hoja se abre acercando el ratón al botón, el Layout la cierra sola
 * en cuanto el puntero sale de las zonas que cuentan como «aquí». La hoja no
 * estaba en esa lista: mover el ratón hacia las herramientas era, para el
 * contador, alejarse — así que se cerraba justo al ir a usarla.
 *
 * `gesto` es lo que el Layout cuelga de cualquier menú abierto por roce: el
 * `ref` que lo mete en la lista de zonas, y el `onClickCapture` que asciende
 * «me he acercado sin querer» a «lo quiero abierto» en cuanto tocas algo de
 * dentro. Es opcional porque la hoja también se abre pulsando, y entonces no
 * hay nada que vigilar.
 */
export default function HojaCrear({ onCerrar, gesto }: {
  onCerrar: () => void;
  gesto?: { ref: RefObject<HTMLDivElement | null>; onClickCapture: () => void };
}) {
  const navegar = useNavigate();

  return (
    <>
      {/* Tocar fuera cierra, que es lo primero que intenta todo el mundo. */}
      <div
        onClick={onCerrar}
        aria-hidden
        className="fixed inset-0 z-[9998] bg-slate-900/30 animate-in fade-in duration-150"
      />
      <div
        {...gesto}
        role="dialog"
        aria-modal="true"
        aria-label="Crear"
        /*
         * 72 vh Y NO LA MITAD (2026-08-23). Eugenio: «haz más grande la ventana
         * central de crear y un poco más pequeñas las tarjetas de herramientas
         * para que quepa todo sin tener que hacer el scroll down».
         *
         * Media pantalla estaba bien elegida por lo que dura el gesto —creas y
         * te vas— y mal por lo que hay que enseñar: son TRECE cosas, y a la
         * mitad quedaban cinco fuera. Una lista donde hay que buscar lo que no
         * se ve pierde justo lo que la hacía rápida.
         *
         * El sitio sale de los dos lados a la vez: la hoja crece y la tarjeta
         * encoge. Sólo agrandando habría hecho falta el 95 % de la pantalla,
         * que ya no es una hoja sino otra página; sólo encogiendo, las tarjetas
         * dejarían de leerse. Con 72 vh y cinco columnas caben las trece en
         * tres filas en un ordenador y en cinco en un móvil.
         */
        /*
         * ARRANCA JUSTO ENCIMA DE LOS CÍRCULOS (2026-08-23). Eugenio: «que
         * cuando le dé a crear se sigan viendo los 3 botones de abajo, y como
         * que esté conectado mediante un diseño bonito esa ventana emergente
         * con el botón central».
         *
         * Antes empezaba en `bottom-0` y se comía los tres botones, incluido el
         * que acababas de pulsar. Una ventana que tapa el botón que la abrió
         * deja sin ancla al que la mira: no queda ni rastro de por qué está ahí.
         *
         * `--alto-circulos` lo publica `TresCirculos`, que es quien sabe cuánto
         * mide —92 px en un ordenador, 70 en un móvil—. Preguntárselo evita el
         * número mágico que se queda viejo el día que cambien de tamaño.
         */
        style={{ bottom: 'calc(var(--alto-circulos, 92px) + env(safe-area-inset-bottom) + 10px)' }}
        // MÁS ALTA EN EL MÓVIL, no menos (2026-08-24). Con los dibujos puestos, las
        // trece tarjetas piden cinco filas a tres columnas y a 64 vh la última
        // se quedaba fuera — medido, no supuesto. En un ordenador caben en tres
        // filas de cinco y 64 vh sobra. La misma rejilla en dos formas distintas
        // no pide la misma altura.
        className="fixed inset-x-0 z-[9998] h-[74vh] animate-in slide-in-from-bottom duration-200 sm:h-[64vh]"
      >
        <div className="relative mx-auto flex h-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
          {/* EL PICO QUE LA CONECTA CON EL BOTÓN. Un triángulo del mismo blanco
              y el mismo borde, centrado sobre el círculo de Crear: la hoja deja
              de ser una ventana que ha aparecido y pasa a ser lo que ha salido
              de ese botón. Es el mismo recurso de un bocadillo de cómic, y
              funciona por lo mismo — dice quién habla.
              El borde se dibuja con dos triángulos superpuestos: el de atrás en
              gris y el de delante en blanco, 1 px más arriba. Un `border` en un
              triángulo de CSS no existe. */}
          <span aria-hidden className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[10px] border-x-transparent border-t-slate-200" />
          <span aria-hidden className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 -translate-y-px border-x-[10px] border-t-[10px] border-x-transparent border-t-white" />
          {/* El tirador de arriba: dice «esto se arrastra o se cierra» sin
              escribirlo, y es lo que la gente ya conoce de su teléfono. */}
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <span className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
            <button onClick={onCerrar} title="Cerrar" aria-label="Cerrar"
              className="absolute right-4 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="px-5 pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Crear</p>
          {/* Las trece animaciones, una sola vez. */}
          <EstilosPrevias />

          {/* `overflow-y-auto` se queda aunque ya no haga falta: en una pantalla
              muy baja —un portátil de 13 pulgadas con la barra del navegador— o
              con la letra del sistema muy grande, trece tarjetas pueden volver a
              no caber. Que entonces se pueda bajar es mejor que quedarse sin
              ver las últimas. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
            {/* SEIS COLUMNAS EN PANTALLA GRANDE (2026-08-24). Con las tres
                herramientas nuevas son dieciséis, y a cinco columnas pedían una
                cuarta fila que ya no cabía — medido, no supuesto. A seis
                vuelven a caber en tres filas. Cada vez que entra una
                herramienta hay que volver a mirar esto: la rejilla no avisa,
                simplemente empieza a hacer falta bajar. */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {COSAS.map(c => (
                <button
                  key={c.nombre}
                  onClick={() => { if (c.abrir) c.abrir(); else if (c.a) navegar(c.a); onCerrar(); }}
                  title={c.nota}
                  // `group` es lo que enciende la animación de dentro del
                  // dibujo: cada previsualización se mueve con `group-hover`.
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  {/* LA FOTO SE AMPLÍA AL PASAR EL RATÓN (2026-08-24, Eugenio:
                      «que cuando hagas hover por encima se amplíe la foto de la
                      herramienta»). Un 8 %, no más: el dibujo tiene que crecer
                      lo justo para responder al gesto, no saltar. Y crece
                      DENTRO de su marco —`overflow-hidden` en el padre—, así
                      que la rejilla no se mueve: si la tarjeta empujara a sus
                      vecinas, pasar el ratón por encima descolocaría la lista
                      que estás intentando leer.
                      El zoom convive con la animación de dentro del dibujo: una
                      escala el contenedor, la otra mueve las piezas. */}
                  <span className="block aspect-[16/9] w-full overflow-hidden border-b border-slate-100">
                    <span className="block h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.08]">
                      <c.Previa />
                    </span>
                  </span>
                  <span className="px-2 py-1.5 text-[12px] font-black leading-tight text-slate-900">
                    {c.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
