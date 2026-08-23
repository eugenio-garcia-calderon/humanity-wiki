import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { subdominioDeUsuario } from './utils/subdominio';

// Mundo 3D: la escena pesa ~1 MB (three.js), así que la página entera
// se carga en diferido — el resto de la app no paga por el motor del juego.
const JuegoVital = lazy(() => import('./pages/JuegoVital'));

// ══ CADA HERRAMIENTA SE DESCARGA AL ABRIRLA (2026-08-22) ═════════════════════
// Eugenio: «haz que la web sea más ligera y que se vaya desplegando al abrir
// herramientas, fundamental».
//
// Antes, las 53 páginas de la plataforma entraban en el MISMO fichero que se
// descarga al entrar. Alguien que solo venía a leer una publicación se
// descargaba el editor de páginas, el lienzo, el mercado, el panel financiero,
// el administrador de usuarios y el mapa entero de Mapbox antes de ver una
// letra. Medido antes de tocar nada: 1.137 KB comprimidos para pintar la
// portada.
//
// Con `lazy()`, cada página es su propio fichero y solo se baja cuando alguien
// la abre. La primera vez cuesta un instante de carga —por eso hay una pantalla
// de espera de verdad, abajo—; a partir de ahí queda en la caché del navegador.
//
// QUÉ NO SE DIFIERE, y por qué: la portada (`Explorar`), la entrada y el
// login. Diferir lo primero que alguien ve solo cambia una espera por otra: la
// pantalla se pintaría vacía y JUSTO DESPUÉS pediría el trozo que necesita para
// llenarla. Lo que se difiere es todo lo que hay DETRÁS de un clic.
const AboutRoot = lazy(() => import('./pages/about/AboutRoot'));
const AboutScoring = lazy(() => import('./pages/about/AboutScoring'));
const AdminDesign = lazy(() => import('./pages/AdminDesign'));
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios'));
const Archivos = lazy(() => import('./pages/Archivos'));
const BaseDeDatos = lazy(() => import('./pages/BaseDeDatos'));
const Calendario = lazy(() => import('./pages/Calendario'));
const ChallengeProfile = lazy(() => import('./pages/ChallengeProfile'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Documento = lazy(() => import('./pages/Documento'));
const Esquemas = lazy(() => import('./pages/Esquemas'));
const GrafoCanvas = lazy(() => import('./pages/GrafoCanvas'));
const Grafos = lazy(() => import('./pages/Grafos'));
const HazteSocio = lazy(() => import('./pages/HazteSocio'));
const Hormiguero = lazy(() => import('./pages/Hormiguero'));
const IA = lazy(() => import('./pages/IA'));
const IncendiosMapa = lazy(() => import('./pages/IncendiosMapa'));
const IndicatorDetail = lazy(() => import('./pages/IndicatorDetail'));
const Indicators = lazy(() => import('./pages/Indicators'));
const MapPage = lazy(() => import('./pages/Map'));
const Mapas = lazy(() => import('./pages/Mapas'));
const Mensajes = lazy(() => import('./pages/Mensajes'));
const Telefono = lazy(() => import('./pages/Telefono'));
const Mercado = lazy(() => import('./pages/Mercado'));
const MiConocimiento = lazy(() => import('./pages/MiConocimiento'));
const Muro = lazy(() => import('./pages/Muro'));
const ObjectiveDetail = lazy(() => import('./pages/ObjectiveDetail'));
const Objectives = lazy(() => import('./pages/Objectives'));
const OrganizationProfile = lazy(() => import('./pages/OrganizationProfile'));
const Organizations = lazy(() => import('./pages/Organizations'));
const Paginas = lazy(() => import('./pages/Paginas'));
const PanelFinanciero = lazy(() => import('./pages/PanelFinanciero'));
const Persona = lazy(() => import('./pages/Persona'));
const PersonaPublica = lazy(() => import('./pages/PersonaPublica'));
const Personas = lazy(() => import('./pages/Personas'));
const Presentacion = lazy(() => import('./pages/Presentacion'));
const ProjectProfile = lazy(() => import('./pages/ProjectProfile'));
const Projects = lazy(() => import('./pages/Projects'));
const Proyecto = lazy(() => import('./pages/Proyectos').then(m => ({ default: m.Proyecto })));
const Proyectos = lazy(() => import('./pages/Proyectos').then(m => ({ default: m.Proyectos })));
const Restablecer = lazy(() => import('./pages/Restablecer'));
const RetoVistas = lazy(() => import('./pages/RetoVistas'));
const SocioConfirmacion = lazy(() => import('./pages/SocioConfirmacion'));
const SolutionProfile = lazy(() => import('./pages/SolutionProfile'));
const Buscar = lazy(() => import('./pages/Buscar'));
const Comercio = lazy(() => import('./pages/Comercio'));
const NoEncontrada = lazy(() => import('./pages/NoEncontrada'));
const PaginaPublica = lazy(() => import('./pages/PaginaPublica'));
const PortadaEspacio = lazy(() => import('./pages/PortadaEspacio'));
const MiPedido = lazy(() => import('./pages/MiPedido'));
const FichaProducto = lazy(() => import('./pages/FichaProducto'));
const Solutions = lazy(() => import('./pages/Solutions'));
const Tablas = lazy(() => import('./pages/Tablas'));
const Tareas = lazy(() => import('./pages/Tareas'));
const Territories = lazy(() => import('./pages/Territories'));
const TerritoryProfile = lazy(() => import('./pages/TerritoryProfile'));
const UserMapa = lazy(() => import('./pages/UserMapa'));
import { PAGINAS_INFO } from './paginasInfo';
const Vision = lazy(() => import('./pages/Vision'));
import Entrada from './pages/Entrada';
import Explorar from './pages/Explorar';
import Bienvenida from './pages/Bienvenida';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EditProvider } from './contexts/EditContext';
import { DesignProvider } from './contexts/DesignContext';
import { DataProvider } from './contexts/DataContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TextosProvider } from './components/ui/TextoEditable';

/** `/documentos/:id` era donde vivía el editor antes de que documentos y
 *  páginas se fundieran. Se conserva para que ningún enlace guardado se rompa. */
function RedirigirPagina() {
  const { id } = useParams();
  return <Navigate to={`/paginas/${id}`} replace />;
}

/** Lo mismo con `/grafos/:slug`, que ahora es `/esquemas/:slug`. */
function RedirigirEsquema() {
  const { slug } = useParams();
  return <Navigate to={`/esquemas/${slug}`} replace />;
}

/**
 * LO QUE SE VE MIENTRAS BAJA UNA PÁGINA (2026-08-22).
 *
 * Con las páginas en diferido, entre pulsar y ver hay un instante en el que el
 * navegador está pidiendo el trozo. Sin nada ahí, la pantalla se queda en
 * blanco y parece que la aplicación se ha roto — que es exactamente lo que no
 * puede pasar al hacerla «más ligera».
 *
 * NO ES UNA RUEDA GIRANDO EN EL CENTRO: es la silueta de lo que va a aparecer.
 * Una cabecera, un par de bloques. El ojo entiende que ESTÁ VINIENDO algo con
 * esa forma, y cuando llega no hay salto.
 *
 * Y ES SOBRIA A PROPÓSITO. En una conexión buena esto dura 80 milisegundos:
 * cualquier animación llamativa se vería como un parpadeo molesto en cada clic.
 */
function Esperando() {
  return (
    <div className="w-full max-w-5xl mx-auto px-5 py-8 animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="h-7 w-52 rounded-lg bg-slate-100" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-50" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-slate-50 border border-slate-100" />
        <div className="h-28 rounded-2xl bg-slate-50 border border-slate-100" />
        <div className="h-28 rounded-2xl bg-slate-50 border border-slate-100" />
        <div className="h-28 rounded-2xl bg-slate-50 border border-slate-100" />
      </div>
    </div>
  );
}

// Se decide UNA VEZ, al cargar, y no cambia: el navegador no se muda de
// dominio sin recargar. Calcularlo dentro del render sería preguntar lo mismo
// en cada pintada para obtener siempre la misma respuesta.
const ESPACIO_DE = subdominioDeUsuario();

/**
 * UN SUBDOMINIO NO ES LA PLATAFORMA CON OTRO NOMBRE: ES LA CASA DE ALGUIEN.
 *
 * Por eso `nombre.humanity.wiki` no monta el armazón de trabajo ni sus 40
 * rutas. Monta tres cosas y ninguna más: la portada de esa persona, sus
 * páginas publicadas, y una salida clara si la dirección no lleva a nada.
 *
 * El primer intento fue añadir las dos rutas al árbol de siempre, y no
 * funcionó: la ruta `/` del `Layout` empata con la portada y gana ella, así
 * que la raíz del subdominio seguía enseñando la aplicación entera. Empatar
 * rutas para que gane la que a uno le conviene es frágil; separarlas es
 * decir lo que de verdad se quiere.
 */
function AplicacionDeEspacio({ handle }: { handle: string }) {
  return (
    <BrowserRouter>
      <Suspense fallback={<Esperando />}>
        <Routes>
          <Route path="/" element={<PortadaEspacio handle={handle} />} />
          {/* Antes que `:slug`, porque si no una tienda con una página
              llamada «pedido» se comería esta pantalla. Lo fijo gana a lo
              variable, pero sólo si existe: mejor declararlo. */}
          <Route path="pedido" element={<MiPedido />} />
          {/* La ficha de un producto. Va antes que `:slug` porque `producto`
              es fijo y `:slug` variable: si no se declarara, una tienda con
              una página llamada «producto» se comería todas las fichas. */}
          <Route path="producto/:producto" element={<FichaProducto handle={handle} />} />
          <Route path=":slug" element={<PaginaPublica handleFijo={handle} />} />
          <Route path="*" element={<PaginaPublica handleFijo={handle} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/**
 * QUÉ SE VE EN «/».
 *
 * Mientras se resuelve la sesión no se pinta ninguna de las dos: enseñar la
 * portada de bienvenida a alguien que sí tiene cuenta —aunque sea medio
 * segundo— le dice que ha perdido su trabajo. Es el mismo error que el botón
 * de «Iniciar sesión» de la barra de arriba tuvo que arreglar (B21), y aquí
 * costaría más caro porque ocupa la pantalla entera.
 */
function Inicio() {
  const { user, loading: cargandoSesion } = useAuth();
  if (cargandoSesion) return null;
  return user ? <Explorar /> : <Bienvenida />;
}

export default function App() {
  // Se decide antes de montar nada: los proveedores de la plataforma no
  // llegan a existir en un subdominio, así que un visitante sin cuenta no
  // paga por cargarlos.
  if (ESPACIO_DE) return <AplicacionDeEspacio handle={ESPACIO_DE} />;

  return (
    <SettingsProvider>
    <AuthProvider>
            <BrowserRouter>
            {/* UNA SOLA FRONTERA DE ESPERA PARA TODAS LAS RUTAS. Envolver cada
                una por separado serían 51 copias del mismo envoltorio, y la
                primera que se olvidara dejaría una pantalla en blanco sin que
                nadie supiera por qué. */}
            <Suspense fallback={<Esperando />}>
            <Routes>
              {/* La cara publica de una pagina compartida: `/@nombre/pagina`.
                  Va FUERA del Layout a proposito — quien llega aqui viene de un
                  enlace, no tiene cuenta, y no debe ver la barra de trabajo ni
                  un «todavia no tienes proyectos» que no es su vida. */}
              <Route path=":arroba/:slug" element={<PaginaPublica />} />

              {/* LA MISMA PÁGINA, POR LA PUERTA CORTA. En
                  `claude-dos.humanity.wiki/mi-pagina` el nombre viaja en el
                  `Host` y el camino tiene un solo tramo, así que la ruta de
                  arriba no la coge. Esta solo existe cuando de verdad estamos
                  en el espacio de alguien: en `humanity.wiki` no se declara, y
                  por tanto no puede tapar ninguna de las 40 rutas de un tramo
                  que ya existen. */}
              {/* Los tres proveedores de datos envuelven SOLO el Layout, no la
                  aplicacion entera. Estaban arriba del todo, y eso hacia que
                  quien abria una pagina compartida —sin cuenta, a leer un
                  texto— disparase las OCHO cargas del taller: territorios,
                  objetivos, retos, soluciones, proyectos, organizaciones,
                  causas e indicadores. Medido el 2026-08-22 en esta misma
                  pantalla. Un lector no pide el almacen entero para leer una
                  pagina. */}
              <Route path="/" element={
                <DataProvider>
                  <EditProvider>
                    <DesignProvider>
                      {/* LOS TEXTOS EDITABLES POR UN ADMINISTRADOR (2026-08-22).
                          El Programador 1 escribió el proveedor, el componente,
                          la tabla y las rutas, y verificó las rutas — pero el
                          proveedor no llegó a enchufarse a la aplicación, así
                          que la pieza estaba publicada y muerta. Se ve al ir a
                          usarla, no al escribirla, y por eso lo enchufa quien
                          llegó después. Va DENTRO de `AuthProvider` (mira si
                          eres administrador para enseñar el lápiz) y FUERA de
                          `Layout`, que es quien pinta las páginas. */}
                      <TextosProvider>
                        <Layout />
                      </TextosProvider>
                    </DesignProvider>
                  </EditProvider>
                </DataProvider>
              }>
                {/* Fase 11: los Grafos de Conocimiento son el nuevo inicio;
                    el mapa conserva su ruta /mapa (enlazada en el menú). */}
                {/* La portada presenta las TRES formas de ver (2026-08-06).
                    La Red de Datos (antes «Grafos») vive en /red. */}
                {/* LA PORTADA ES PUBLICACIONES (2026-08-21, Eugenio: «la
                    página de publicaciones será a partir de ahora la página de
                    inicio»). Antes la raíz era `Entrada`, que a quien no había
                    entrado le mandaba directo a /login: la plataforma no
                    enseñaba nada antes de pedir la cuenta. Ahora lo primero
                    que se ve es lo que la gente ha publicado. */}
                {/* LA PORTADA DEPENDE DE SI TIENES CUENTA (2026-08-23).
                    Sin sesión, el muro no significa nada: publicaciones sueltas
                    de gente que no conoces y un botón «Crear» que no puedes
                    pulsar. Con sesión, ese muro ES la aplicación. Así que la
                    misma dirección enseña dos cosas distintas — y es lo
                    correcto: «/» significa «lo primero que te interesa», y eso
                    cambia según quién seas. */}
                <Route index element={<Inicio />} />
                <Route path="entrada" element={<Entrada />} />
                {/* ESQUEMAS (2026-08-20, Eugenio: «llámalo Esquemas, y unifica
                    todo para ese mismo nombre»). Un lienzo, un grafo y la red
                    de datos eran la misma fila de la base de datos dibujada de
                    tres maneras; ahora se llaman igual. Las direcciones viejas
                    redirigen, así que ningún enlace guardado se rompe. */}
                <Route path="esquemas" element={<Esquemas />} />
                <Route path="red" element={<Grafos />} />
                <Route path="grafos" element={<Navigate to="/esquemas" replace />} />
                <Route path="base-de-datos" element={<BaseDeDatos />} />
                <Route path="archivos" element={<Archivos />} />
                <Route path="mi-conocimiento" element={<MiConocimiento />} />
                <Route
                  path="juego"
                  element={
                    <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-400 animate-pulse">Cargando el Visor 3D…</div>}>
                      <JuegoVital />
                    </Suspense>
                  }
                />
                <Route path="vision" element={<Vision />} />

                {/* LAS PÁGINAS DE LA «i», DESDE SU LISTA (2026-08-22). Añadir
                    una es una línea en `src/paginasInfo.ts` y ningún cambio
                    aquí — que es lo que evita cuatro PRs sobre este fichero la
                    misma tarde. Las que ya tenían ruta propia (vision,
                    sobre-red-humana) no traen componente y no se montan dos
                    veces. */}
                {PAGINAS_INFO.filter(p => p.componente).map(p => {
                  const Pagina = p.componente!;
                  return <Route key={p.ruta} path={p.ruta} element={<Pagina />} />;
                })}
                <Route path="explorar" element={<Explorar />} />
                {/* Atajo, no una página aparte: si fuera <Explorar mias /> el cambio
                    de ruta desmontaría el componente y perdería la carpeta abierta
                    al tocar el interruptor De la Humanidad/Mías (2026-08-08). */}
                <Route path="mis-publicaciones" element={<Navigate to="/explorar?mias=1" replace />} />
                <Route path="proyectos" element={<Proyectos />} />
                <Route path="tareas" element={<Tareas />} />
                <Route path="hormiguero" element={<Hormiguero />} />
                <Route path="buscar" element={<Buscar />} />
                <Route path="comercio" element={<Comercio />} />
                <Route path="tablas" element={<Tablas />} />
                <Route path="ia" element={<IA />} />
                <Route path="calendario" element={<Calendario />} />
                <Route path="personas" element={<Personas />} />
                <Route path="paginas" element={<Paginas />} />
                <Route path="mensajes" element={<Mensajes />} />
                <Route path="telefono" element={<Telefono />} />
                {/* Una persona de TU mundo: su ficha y vuestra conversación, sin
                    cargar el Mundo 3D entero (Eugenio, 2026-08-20). */}
                <Route path="persona/:id" element={<Persona />} />
                <Route path="proyectos/:slug" element={<Proyecto />} />
                {/* /paginas/nuevo?prompt=… genera con la IA en directo;
                    /paginas/:id abre uno guardado. */}
                {/* El editor de documentos y el de páginas son EL MISMO
                    (Eugenio, 2026-08-20: «se fusiona con el builder de páginas,
                    que son lo mismo a partir de ahora»), así que vive donde
                    dice lo que es. */}
                <Route path="paginas/:id" element={<Documento />} />
                <Route path="documentos/:id" element={<RedirigirPagina />} />
                <Route path="presentaciones/:id" element={<Presentacion />} />
                <Route path="esquemas/:slug" element={<GrafoCanvas />} />
                <Route path="grafos/:slug" element={<RedirigirEsquema />} />
                <Route path="lienzos" element={<Navigate to="/esquemas" replace />} />
                <Route path="retos-vistas/:id" element={<RetoVistas />} />
                <Route path="mis-mapas" element={<Mapas />} />
                <Route path="mapas" element={<MapPage />} />
                <Route path="mapas/:slug" element={<UserMapa />} />
                <Route path="incendios-espana-mapa" element={<IncendiosMapa />} />
                <Route path="territorios/:id" element={<TerritoryProfile />} />
                <Route path="retos/:id" element={<ChallengeProfile />} />
                <Route path="soluciones/:id" element={<SolutionProfile />} />
                                <Route path="objetivos/:id" element={<ObjectiveDetail />} />
                <Route path="objetivos" element={<Objectives />} />
                <Route path="mercado" element={<Mercado />} />
                <Route path="panel-financiero" element={<PanelFinanciero />} />
                <Route path="muro" element={<Muro />} />
                <Route path="personas/:id" element={<PersonaPublica />} />
                <Route path="indicadores/:id" element={<IndicatorDetail />} />
                <Route path="indicadores" element={<Indicators />} />
                <Route path="retos" element={<Challenges />} />
                <Route path="soluciones" element={<Solutions />} />
                <Route path="territorios" element={<Territories />} />
                {/* Las iniciativas vivían en /proyectos hasta que los proyectos
                    tipo Trello ocuparon esa ruta (2026-08-08) y las dejaron
                    inalcanzables. La tabla se llama `initiatives` desde hace
                    tiempo, así que la URL pasa a decir lo mismo. */}
                <Route path="iniciativas" element={<Projects />} />
                <Route path="organizaciones" element={<Organizations />} />
                <Route path="iniciativas/:id" element={<ProjectProfile />} />
                <Route path="organizaciones/:id" element={<OrganizationProfile />} />
            <Route path="mapa" element={<Navigate to="/mapas" replace />} />
                <Route path="login" element={<Login />} />
                <Route path="restablecer" element={<Restablecer />} />
                <Route path="configuracion" element={<Configuracion />} />
                <Route path="admin/design" element={<AdminDesign />} />
                <Route path="admin/usuarios" element={<AdminUsuarios />} />
                <Route path="sobre-red-humana" element={<AboutRoot />} />
                <Route path="sobre-red-humana/puntuacion-territorios" element={<AboutScoring />} />
                <Route path="hazte-socio" element={<HazteSocio />} />
                <Route path="socio-confirmacion" element={<SocioConfirmacion />} />

                {/* LA ULTIMA, Y A PROPOSITO. Se queda con todo lo que ninguna
                    otra ha cogido. Sin ella, una direccion mal escrita deja la
                    pantalla en blanco, y una pantalla en blanco no dice «no
                    existe»: dice «se ha roto». */}
                <Route path="*" element={<NoEncontrada />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
    </AuthProvider>
    </SettingsProvider>
  );
}
