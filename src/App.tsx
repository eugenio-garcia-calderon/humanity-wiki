import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';

// Mundo 3D: la escena pesa ~1 MB (three.js), así que la página entera
// se carga en diferido — el resto de la app no paga por el motor del juego.
const JuegoVital = lazy(() => import('./pages/JuegoVital'));
import TerritoryProfile from './pages/TerritoryProfile';
import ChallengeProfile from './pages/ChallengeProfile';
import SolutionProfile from './pages/SolutionProfile';
import Objectives from './pages/Objectives';
import ObjectiveDetail from './pages/ObjectiveDetail';
import Indicators from './pages/Indicators';
import IndicatorDetail from './pages/IndicatorDetail';
import Challenges from './pages/Challenges';
import Solutions from './pages/Solutions';
import Territories from './pages/Territories';
import Projects from './pages/Projects';
import Organizations from './pages/Organizations';
import ProjectProfile from './pages/ProjectProfile';
import OrganizationProfile from './pages/OrganizationProfile';
import MapPage from './pages/Map';
import Mercado from './pages/Mercado';
import PanelFinanciero from './pages/PanelFinanciero';
import Muro from './pages/Muro';
import PersonaPublica from './pages/PersonaPublica';
import Grafos from './pages/Grafos';
import GrafoCanvas from './pages/GrafoCanvas';
import UserMapa from './pages/UserMapa';
import Mapas from './pages/Mapas';
import Esquemas from './pages/Esquemas';
import Tareas from './pages/Tareas';
import Hormiguero from './pages/Hormiguero';
import IA from './pages/IA';
import Paginas from './pages/Paginas';
import Mensajes from './pages/Mensajes';
import Persona from './pages/Persona';
import Calendario from './pages/Calendario';
import Personas from './pages/Personas';
import Entrada from './pages/Entrada';
import Configuracion from './pages/Configuracion';
import BaseDeDatos from './pages/BaseDeDatos';
import Archivos from './pages/Archivos';
import MiConocimiento from './pages/MiConocimiento';
import Vision from './pages/Vision';
import Explorar from './pages/Explorar';
import { Proyectos, Proyecto } from './pages/Proyectos';
import Documento from './pages/Documento';
import Presentacion from './pages/Presentacion';
import RetoVistas from './pages/RetoVistas';
import IncendiosMapa from './pages/IncendiosMapa';
import Login from './pages/Login';
import Restablecer from './pages/Restablecer';
import AdminDesign from './pages/AdminDesign';
import AdminUsuarios from './pages/AdminUsuarios';
import AboutRoot from './pages/about/AboutRoot';
import AboutScoring from './pages/about/AboutScoring';
import HazteSocio from './pages/HazteSocio';
import SocioConfirmacion from './pages/SocioConfirmacion';
import { AuthProvider } from './contexts/AuthContext';
import { EditProvider } from './contexts/EditContext';
import { DesignProvider } from './contexts/DesignContext';
import { DataProvider } from './contexts/DataContext';
import { SettingsProvider } from './contexts/SettingsContext';

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

export default function App() {
  return (
    <SettingsProvider>
    <AuthProvider>
      <DataProvider>
        <EditProvider>
          <DesignProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
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
                <Route index element={<Explorar />} />
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
                    <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-400 animate-pulse">Cargando el Mundo 3D…</div>}>
                      <JuegoVital />
                    </Suspense>
                  }
                />
                <Route path="vision" element={<Vision />} />
                <Route path="explorar" element={<Explorar />} />
                {/* Atajo, no una página aparte: si fuera <Explorar mias /> el cambio
                    de ruta desmontaría el componente y perdería la carpeta abierta
                    al tocar el interruptor De la Humanidad/Mías (2026-08-08). */}
                <Route path="mis-publicaciones" element={<Navigate to="/explorar?mias=1" replace />} />
                <Route path="proyectos" element={<Proyectos />} />
                <Route path="tareas" element={<Tareas />} />
                <Route path="hormiguero" element={<Hormiguero />} />
                <Route path="ia" element={<IA />} />
                <Route path="calendario" element={<Calendario />} />
                <Route path="personas" element={<Personas />} />
                <Route path="paginas" element={<Paginas />} />
                <Route path="mensajes" element={<Mensajes />} />
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
              </Route>
            </Routes>
          </BrowserRouter>
          </DesignProvider>
        </EditProvider>
      </DataProvider>
    </AuthProvider>
    </SettingsProvider>
  );
}
