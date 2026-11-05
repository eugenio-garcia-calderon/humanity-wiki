import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Globe2, Map as MapIcon, ListChecks, Table2, Store, Sparkles,
  CalendarDays, Gamepad2, Database, Globe, Compass, MessageSquare, Scale,
  Search, ArrowRight, Plane, Palette,
} from 'lucide-react';
import { OBJETIVOS } from '../utils/objetivos';
import {
  EstilosPrevias,
  PreviaMapa, PreviaEsquema, PreviaPagina, PreviaTabla, PreviaTareas, PreviaComercio,
  PreviaTelecom, PreviaIA, PreviaMundo, PreviaCalendario, PreviaArchivos,
  PreviaNavegador, PreviaPublicaciones, PreviaDebate,
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
  { nombre: 'Páginas', que: 'Escribe documentos con texto, imágenes y vídeo. Sueltas o dentro de una carpeta.', icono: FileText, Previa: PreviaPagina },
  { nombre: 'Esquemas', que: 'Conecta ideas, causas y soluciones en un lienzo. Lo que sabes, dibujado.', icono: Globe2, Previa: PreviaEsquema },
  { nombre: 'Mapas', que: 'Sitúa lo que ocurre donde ocurre. Territorios, indicadores y tus propios sitios.', icono: MapIcon, Previa: PreviaMapa },
  { nombre: 'Tareas', que: 'Un tablero: por hacer, en curso y hecho.', icono: ListChecks, Previa: PreviaTareas },
  { nombre: 'Tablas', que: 'Tus datos con columnas de verdad: números, fechas, dinero, enlaces.', icono: Table2, Previa: PreviaTabla },
  { nombre: 'Publicaciones', que: 'Un muro donde se comparte lo que cada cual va aprendiendo.', icono: Compass, Previa: PreviaPublicaciones },
  { nombre: 'Debates', que: 'Una afirmación, sus razones a favor y en contra, y las fuentes de cada una. Al final no hay un veredicto: hay un mapa de quién piensa qué y por qué.', icono: Scale, Previa: PreviaDebate },
  { nombre: 'Mensajes y llamadas', que: 'Habla con cualquiera de la plataforma: mensajes, voz y vídeo, sin salir de aquí.', icono: MessageSquare, Previa: PreviaTelecom },
  { nombre: 'Comercio', que: 'Vende lo que haces. Tu tienda, tus pedidos y tus envíos.', icono: Store, Previa: PreviaComercio },
  { nombre: 'Asistente', que: 'Una IA que conoce tus carpetas y crea contigo dentro de ellas.', icono: Sparkles, Previa: PreviaIA },
  { nombre: 'Calendario', que: 'Todas tus fechas, en un solo sitio.', icono: CalendarDays, Previa: PreviaCalendario },
  { nombre: 'Archivos', que: 'Fotos, vídeos y documentos colgados de la tarea a la que pertenecen.', icono: Database, Previa: PreviaArchivos },
  { nombre: 'Visor 3D', que: 'Tus proyectos como un lugar por el que caminar.', icono: Gamepad2, Previa: PreviaMundo },
  { nombre: 'Navegador', que: 'Guarda lo que encuentres en internet.', icono: Globe, Previa: PreviaNavegador },
];

// ── LAS CREACIONES (2026-11-05, la reestructuración) ────────────────────────
// Eugenio: «la gente a través del buscador en esa página web podrá ver todas
// las creaciones». Lo publicado con la herramienta, debajo del titular: La
// Humanidad destacada, los sitios publicados (de `/api/creaciones`, que no es
// una lista a mano: quien publique mañana sale solo) y las dos creaciones que
// son páginas propias de la plataforma. El buscador filtra por nombre y
// resumen; con un solo creador no hace falta pedirle nada al servidor.

type Creacion = { id: string; titulo: string; resumen: string | null; imagen: string | null; url: string; Icono?: any };
const CREACIONES_FIJAS: Creacion[] = [
  { id: 'aeromovil', titulo: 'Aeromóvil Gota', resumen: 'El vehículo volador de la casa: diseño 3D, plan y planos.', imagen: null, url: '/aeromovil', Icono: Plane },
  { id: 'calendario-arte', titulo: 'Calendario de Arte', resumen: 'Un calendario que se diseña entre todos, mes a mes.', imagen: null, url: '/calendario-arte', Icono: Palette },
];

function TarjetaCreacion({ c, grande = false }: { c: Creacion; grande?: boolean }) {
  const dentro = c.url.startsWith('/');
  const Icono = c.Icono || Globe2;
  const cuerpo = (
    <>
      <div className={grande ? 'grid aspect-[21/9] w-full place-items-center overflow-hidden bg-slate-900' : 'grid aspect-[16/9] w-full place-items-center overflow-hidden bg-slate-50'}>
        {c.imagen
          ? <img src={c.imagen} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          : <Icono className={grande ? 'h-12 w-12 text-emerald-400' : 'h-9 w-9 text-slate-300'} />}
      </div>
      <div className="px-4 py-3">
        <h3 className="inline-flex items-center gap-1.5 text-[15px] font-black text-slate-900">
          {c.titulo} <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
        </h3>
        {c.resumen && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{c.resumen}</p>}
      </div>
    </>
  );
  const clase = 'group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg';
  return dentro
    ? <Link to={c.url} className={clase}>{cuerpo}</Link>
    : <a href={c.url} className={clase}>{cuerpo}</a>;
}

function Creaciones() {
  const [publicadas, setPublicadas] = useState<Creacion[]>([]);
  const [busca, setBusca] = useState('');
  useEffect(() => {
    let vivo = true;
    fetch('/api/creaciones').then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo && j?.creaciones) setPublicadas(j.creaciones); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  const todas = useMemo(() => {
    const vistas = new Set(publicadas.map(c => c.id));
    return [...publicadas, ...CREACIONES_FIJAS.filter(c => !vistas.has(c.id))];
  }, [publicadas]);
  const q = busca.trim().toLocaleLowerCase('es');
  const filtradas = q ? todas.filter(c => `${c.titulo} ${c.resumen || ''}`.toLocaleLowerCase('es').includes(q)) : todas;
  const humanidad = filtradas.find(c => c.url === '/humanidad');
  const resto = filtradas.filter(c => c !== humanidad);
  return (
    <section className="mt-4">
      <h2 className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        Las creaciones
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
        Lo que ya está hecho con la herramienta. De momento crea Eugenio; pronto, más creadores.
      </p>
      <label className="mx-auto mt-5 flex h-11 max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-300">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Busca una creación…"
          aria-label="Buscar una creación" className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
      </label>
      {/* La Humanidad, destacada: el mapa vivo de los temas de la humanidad. */}
      {humanidad && (
        <div className="mx-auto mt-6 max-w-3xl">
          <TarjetaCreacion c={{ ...humanidad, resumen: humanidad.resumen || 'Los temas de la humanidad en un mapa vivo: el círculo, la pirámide, la sociedad y el flujo.' }} grande />
        </div>
      )}
      {resto.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resto.map(c => <TarjetaCreacion key={c.id} c={c} />)}
        </div>
      )}
      {filtradas.length === 0 && <p className="mt-6 text-center text-sm text-slate-400">No hay ninguna creación con ese nombre todavía.</p>}
    </section>
  );
}

/** El botón. Se repite arriba y abajo del todo — es el mismo, no dos. */
function BotonCrearCuenta({ grande = false }: { grande?: boolean }) {
  return (
    <Link
      to="/login?crear=1"
      className={
        grande
          ? 'inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-10 py-4 text-lg font-black text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-700'
          : 'inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-emerald-700'
      }
    >
      Crear cuenta
    </Link>
  );
}

export default function Bienvenida() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      {/* Las trece animaciones, en un solo bloque y una sola vez. */}
      <EstilosPrevias />

      {/* ── EL TITULAR, EN UN TERCIO DE PANTALLA ───────────────────────────
          Eugenio, 2026-08-23: «haz más compacta la parte del titular y
          subtitular y el botón, que ocupe solo un tercio de la pantalla y los
          otros dos tercios muestre las herramientas».

          `min-h-[34vh]` y no una altura fija: el tercio es del ALTO DE LA
          PANTALLA, y una pantalla de portátil y un iPhone no miden lo mismo.
          Con `vh` el reparto se cumple en las dos.

          Es `min-h` y no `h`: si alguien tiene la letra muy grande, el texto
          empuja en vez de salirse de la caja. Un tercio es el objetivo, no una
          promesa que romper a costa de que no se lea.

          Y el párrafo largo se ha ido. Decía lo mismo que el subtítulo con más
          palabras, y aquí sobrar palabras es ocupar el sitio de las
          herramientas — que es lo que hay que ver. Sigue entero en «i → Visión»,
          que es su casa. */}
      <header className="flex min-h-[33vh] flex-col items-center justify-center py-3 text-center">
        {/* EL NOMBRE, Y DEBAJO LO QUE ES (2026-08-26, Eugenio: «vuelve a poner
            wiki creator como nombre del proyecto […] salvo en la portada, que
            también pon wiki creator en grande y debajo pon la red de
            conocimiento»).

            El nombre es el dominio que se teclea y el que sale en la pestaña:
            si la portada dice una cosa y la barra del navegador dice otra,
            nadie sabe cómo se llama esto. «La red de conocimiento» pasa a ser
            lo que hay debajo del nombre —lo que esto ES— y ahí sí puede
            explicar, porque ya no tiene que identificar. */}
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Humanity<span className="text-emerald-600">.Wiki</span>
        </h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-base">
          La herramienta de crear proyectos
        </p>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Crea tus proyectos y tus páginas web, compártelos con el mundo y
          reparte lo que generen entre quienes los crean.
        </p>
        <div className="mt-5">
          <BotonCrearCuenta grande />
        </div>
        {/*
          SIN CIFRA, Y POR DOS RAZONES (2026-08-23).

          LA PRIMERA es que aquí decía «Empiezas con 100 puntos» y esa misma
          tarde el regalo de bienvenida pasó a 5.000. La cifra no vive en el
          código: vive en `PUNTOS_BIENVENIDA`, una variable de entorno que se
          cambia sin tocar un solo fichero. **Cualquier número escrito a mano
          aquí es una promesa que otra persona puede romper sin enterarse**, y
          esta pantalla es lo primero que lee alguien que aún no confía en
          nosotros. Lo pilló el Dashboard mirando la portada diez minutos antes
          de que saliera el cambio.

          LA SEGUNDA importa más: **un número en una unidad que el lector no
          conoce no es un beneficio**. Quien no ha entrado nunca no sabe si
          5.000 puntos es mucho o poco, ni para qué sirven. Decirle para qué son
          y que no cuestan nada informa más que la cifra.

          Si algún día se quiere enseñar el número, que salga del servidor:
          `puntosBienvenida()` en `src/server/puntos.ts` es la única fuente, y
          `/api/auth/me` ya se pide en cada carga, así que llevarlo ahí no
          costaría ni una petición más.
        */}
        <p className="mt-2 text-xs text-slate-400">
          Gratis. Empiezas con puntos para usar la IA y el Mercado.
        </p>
      </header>

      {/* Las creaciones publicadas, con su buscador. */}
      <Creaciones />

      {/* ── LAS HERRAMIENTAS ───────────────────────────────────────────────
          Rejilla de tarjetas, cada una con su dibujo arriba. En un móvil van a
          una columna: dos columnas de 160 px dejan el dibujo tan pequeño que
          deja de reconocerse, y entonces no cumple su único trabajo. */}
      {/* ── LAS HERRAMIENTAS, EN LOS DOS TERCIOS ───────────────────────────
          Galería más pequeña y de cuatro columnas: el objetivo es que quepan
          MUCHAS a la vez, porque lo que impresiona no es una tarjeta bonita
          sino ver de un golpe todo lo que puedes hacer.

          En móvil van a DOS columnas, no a una. A una columna esto son trece
          pantallazos de scroll y nadie llega al final; a dos, el dibujo sigue
          siendo reconocible —que es su único trabajo— y se ven seis de golpe.

          `group` en la tarjeta es lo que enciende la animación de dentro: cada
          previsualización tiene la suya y se dispara con `group-hover`. Está
          explicado en `components/bienvenida/previas.tsx`. */}
      <section className="mt-6">
        <h2 className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Todo esto es tuyo desde el primer día
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HERRAMIENTAS.map(({ nombre, que, icono: Icono, Previa }) => (
            <article
              key={nombre}
              title={que}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
            >
              <div className="aspect-[16/9] w-full border-b border-slate-100">
                <Previa />
              </div>
              <div className="px-3 py-2.5">
                <h3 className="inline-flex items-center gap-1.5 text-[13px] font-black text-slate-900">
                  <Icono className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {nombre}
                </h3>
                {/* La frase larga se queda, pero recortada a dos líneas: la
                    tarjeta tiene que caber en una rejilla de cuatro sin que
                    unas midan el doble que otras. Entera en el `title`. */}
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">{que}</p>
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
      <section className="mt-16">
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
