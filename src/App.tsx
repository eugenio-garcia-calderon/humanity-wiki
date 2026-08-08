import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
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
import Universo from './pages/Universo';
import Inicio from './pages/Inicio';
import BaseDeDatos from './pages/BaseDeDatos';
import MiConocimiento from './pages/MiConocimiento';
import Vision from './pages/Vision';
import Explorar from './pages/Explorar';
import { Proyectos, Proyecto } from './pages/Proyectos';
import RetoVistas from './pages/RetoVistas';
import IncendiosMapa from './pages/IncendiosMapa';
import Login from './pages/Login';
import AdminDesign from './pages/AdminDesign';
import AboutRoot from './pages/about/AboutRoot';
import AboutScoring from './pages/about/AboutScoring';
import Contribuye from './pages/Contribuye';
import HazteSocio from './pages/HazteSocio';
import SocioConfirmacion from './pages/SocioConfirmacion';
import { AuthProvider } from './contexts/AuthContext';
import { EditProvider } from './contexts/EditContext';
import { DesignProvider } from './contexts/DesignContext';
import { DataProvider } from './contexts/DataContext';
import { SettingsProvider } from './contexts/SettingsContext';

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
                <Route index element={<Inicio />} />
                <Route path="red" element={<Grafos />} />
                <Route path="grafos" element={<Grafos />} />
                <Route path="base-de-datos" element={<BaseDeDatos />} />
                <Route path="mi-conocimiento" element={<MiConocimiento />} />
                <Route path="vision" element={<Vision />} />
                <Route path="explorar" element={<Explorar />} />
                <Route path="mis-publicaciones" element={<Explorar mias />} />
                <Route path="proyectos" element={<Proyectos />} />
                <Route path="proyectos/:slug" element={<Proyecto />} />
                <Route path="grafos/:slug" element={<GrafoCanvas />} />
                <Route path="universo" element={<Universo />} />
                <Route path="retos-vistas/:id" element={<RetoVistas />} />
                <Route path="mapas" element={<Mapas />} />
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
            <Route path="mapa" element={<MapPage />} />
                <Route path="login" element={<Login />} />
                <Route path="admin/design" element={<AdminDesign />} />
                <Route path="sobre-red-humana" element={<AboutRoot />} />
                <Route path="sobre-red-humana/puntuacion-territorios" element={<AboutScoring />} />
                <Route path="contribuye" element={<Contribuye />} />
                <Route path="Contribuye" element={<Contribuye />} />
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
