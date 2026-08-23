import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Globe2, Map as MapIcon, ListChecks, Table2, Store, Sparkles,
  CalendarDays, Gamepad2, Database, Globe, Compass, MessageSquare,
} from 'lucide-react';
import { OBJETIVOS } from '../utils/objetivos';
import {
  PreviaMapa, PreviaEsquema, PreviaPagina, PreviaTabla, PreviaTareas, PreviaComercio,
  PreviaTelecom, PreviaIA, PreviaMundo, PreviaCalendario, PreviaArchivos,
  PreviaNavegador, PreviaPublicaciones,
} from '../components/bienvenida/previas';

// ============================================================================
// LA PORTADA DE QUIEN TODAVÍA NO TIENE CUENTA (2026-08-23, agente de APP/UX)
// ============================================================================
// LO QUE HABÍA ANTES, Y POR QUÉ ERA MALO. A un visitante sin registrar se le
// enseñaba el muro entero: un botón «+ Crear» que no puede usar, publicaciones
// sueltas sin contexto —«PRUEBA · SaaS», «AI · Tienda de prueba»— y filtros
// para buscar dentro de algo que todavía no sabe qué es. Eugenio: «no puede
// ser. Que aparezca un botón de crear. Que aparezcan publicaciones random».
//
// Tenía razón por debajo de la queja: a quien llega por primera vez no se le
// enseña el CONTENIDO de la plataforma, se le enseña LA PLATAFORMA. El
// contenido no significa nada sin saber para qué sirve el sitio, y un botón que
// no puede pulsar solo enseña que esto no es para él todavía.
//
// UN SOLO BOTÓN, y es una decisión suya que además es la correcta: «un botón
// grande que sea crear cuenta. Es el único botón que tiene que haber en esa
// portada». Cada botón extra reparte la atención y baja el que importa. Los
// enlaces de «Entrar» y de la «i» siguen en la barra de arriba, que es donde
// los busca quien ya sabe lo que quiere.
//
// LAS PREVISUALIZACIONES SON DIBUJOS, NO CAPTURAS. El porqué está en
// `components/bienvenida/previas.tsx`: una captura envejece sin avisar y pesa
// megas; esto son SVG en línea de unos cientos de bytes que no piden red.
//
// LOS 14 OBJETIVOS SALEN DE `utils/objetivos.ts`, no de una lista copiada aquí.
// Ese fichero existe precisamente porque la lista ya se había duplicado una vez
// y las dos copias empezaron a separarse.

interface Herramienta {
  nombre: string;
  que: string;
  icono: any;
  Previa: () => ReactElement;
}

// El orden no es alfabético ni casual: primero lo que casi todo el mundo
// entiende de un vistazo (escribir, dibujar, situar en el mapa), y al final lo
// que hay que explicar. Quien abandona una portada lo hace por arriba.
const HERRAMIENTAS: Herramienta[] = [
  { nombre: 'Páginas', que: 'Escribe documentos con texto, imágenes y vídeo. Solos o dentro de un proyecto.', icono: FileText, Previa: PreviaPagina },
  { nombre: 'Esquemas', que: 'Conecta ideas, causas y soluciones en un lienzo. Lo que sabes, dibujado.', icono: Globe2, Previa: PreviaEsquema },
  { nombre: 'Mapas', que: 'Sitúa lo que ocurre donde ocurre. Territorios, indicadores y tus propios sitios.', icono: MapIcon, Previa: PreviaMapa },
  { nombre: 'Tareas', que: 'Un tablero por proyecto: por hacer, en curso y hecho.', icono: ListChecks, Previa: PreviaTareas },
  { nombre: 'Tablas', que: 'Tus datos con columnas de verdad: números, fechas, dinero, enlaces.', icono: Table2, Previa: PreviaTabla },
  { nombre: 'Publicaciones', que: 'Un muro donde se comparte lo que cada cual va aprendiendo.', icono: Compass, Previa: PreviaPublicaciones },
  { nombre: 'Mensajes y llamadas', que: 'Habla con cualquiera de la plataforma: mensajes, voz y vídeo, sin salir de aquí.', icono: MessageSquare, Previa: PreviaTelecom },
  { nombre: 'Comercio', que: 'Vende lo que haces. Tu tienda, tus pedidos y tus envíos.', icono: Store, Previa: PreviaComercio },
  { nombre: 'Asistente', que: 'Una IA que conoce tus proyectos y crea contigo dentro de ellos.', icono: Sparkles, Previa: PreviaIA },
  { nombre: 'Calendario', que: 'Las fechas de tus proyectos, en un solo sitio.', icono: CalendarDays, Previa: PreviaCalendario },
  { nombre: 'Archivos', que: 'Fotos, vídeos y documentos colgados de la tarea a la que pertenecen.', icono: Database, Previa: PreviaArchivos },
  { nombre: 'Visor 3D', que: 'Tus proyectos como un lugar por el que caminar.', icono: Gamepad2, Previa: PreviaMundo },
  { nombre: 'Navegador', que: 'Guarda lo que encuentres en internet dentro del proyecto que lo necesita.', icono: Globe, Previa: PreviaNavegador },
];

/** El botón. Se repite arriba y abajo del todo — es el mismo, no dos. */
function BotonCrearCuenta({ grande = false }: { grande?: boolean }) {
  return (
    <Link
      to="/login?crear=1"
      className={
        grande
          ? 'inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-10 py-5 text-lg font-black text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-700'
          : 'inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-700'
      }
    >
      Crear cuenta
    </Link>
  );
}

export default function Bienvenida() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">

      {/* ── EL TITULAR ─────────────────────────────────────────────────────
          El subtítulo es la visión, literal, la misma que está publicada en
          «i → Visión». No se reescribe aquí: si se reescribe, en un mes hay
          dos visiones distintas y nadie sabe cuál es la buena. */}
      <header className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-slate-900 sm:text-7xl">
          humanity<span className="text-emerald-600">.wiki</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          Agregar el conocimiento de la humanidad y repartir lo que genere entre
          quienes lo crean.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          Hoy el saber está partido: los datos en un sitio, los mapas en otro, las
          conversaciones en un tercero, y lo que cada persona sabe encerrado en su
          cabeza. Aquí se junta el dato en crudo, el conocimiento conectado y el
          conocimiento situado en el territorio, sobre una sola base.
        </p>
        <div className="mt-9">
          <BotonCrearCuenta grande />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Empiezas con 100 puntos. Gratis.
        </p>
      </header>

      {/* ── LAS HERRAMIENTAS ───────────────────────────────────────────────
          Rejilla de tarjetas, cada una con su dibujo arriba. En un móvil van a
          una columna: dos columnas de 160 px dejan el dibujo tan pequeño que
          deja de reconocerse, y entonces no cumple su único trabajo. */}
      <section className="mt-20">
        <h2 className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Todo esto es tuyo desde el primer día
        </h2>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HERRAMIENTAS.map(({ nombre, que, icono: Icono, Previa }) => (
            <article
              key={nombre}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="aspect-[16/9] w-full border-b border-slate-100">
                <Previa />
              </div>
              <div className="p-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                  <Icono className="h-4 w-4 text-emerald-600" /> {nombre}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{que}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── LOS 14 OBJETIVOS ───────────────────────────────────────────────
          Eugenio: «todo eso enlazarlo con los objetivos de la humanidad y pones
          ahí todos los temas, los catorce que hay, en un grid de pequeñas
          tarjetitas». La frase de arriba es la que hace el enlace: sin ella
          esto sería una lista de temas suelta debajo de una lista de
          herramientas suelta. */}
      <section className="mt-20">
        <h2 className="text-center text-2xl font-black tracking-tight text-slate-900">
          Y todo apunta a los mismos catorce sitios
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
          Cada página, cada mapa y cada proyecto de la plataforma habla de alguno
          de estos retos. No son categorías que hayamos inventado: son las cosas
          que a la humanidad le faltan por resolver.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {OBJETIVOS.map(({ id, titulo, icono: Icono }) => (
            <div
              key={id}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-4 text-center"
            >
              <Icono className="h-5 w-5 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                {titulo}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Y EL MISMO BOTÓN AL FINAL ──────────────────────────────────────
          Quien ha bajado hasta aquí ya ha decidido. Hacerle subir otra vez a
          buscar el botón es la forma más tonta de perderlo. */}
      <section className="mt-20 rounded-3xl bg-slate-900 px-6 py-14 text-center">
        <h2 className="text-3xl font-black tracking-tight text-white">
          Empieza tu primer proyecto
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
          Lo que publiques en abierto sigue siendo tuyo, y genera puntos cada vez
          que le sirve a alguien.
        </p>
        <div className="mt-8">
          <BotonCrearCuenta grande />
        </div>
      </section>
    </div>
  );
}
