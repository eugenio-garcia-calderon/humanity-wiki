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

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <EditProvider>
          <DesignProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<MapPage />} />
                <Route path="territorios/:id" element={<TerritoryProfile />} />
                <Route path="retos/:id" element={<ChallengeProfile />} />
                <Route path="soluciones/:id" element={<SolutionProfile />} />
                                <Route path="objetivos/:id" element={<ObjectiveDetail />} />
                <Route path="objetivos" element={<Objectives />} />
                <Route path="indicadores/:id" element={<IndicatorDetail />} />
                <Route path="indicadores" element={<Indicators />} />
                <Route path="retos" element={<Challenges />} />
                <Route path="soluciones" element={<Solutions />} />
                <Route path="territorios" element={<Territories />} />
                <Route path="proyectos" element={<Projects />} />
                <Route path="organizaciones" element={<Organizations />} />
                <Route path="proyectos/:id" element={<ProjectProfile />} />
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
  );
}
