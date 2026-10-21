import { lazy, Suspense } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';

// ============================================================================
// EL MAPA DE INDICADORES EN UN DOMINIO PROPIO (2026-10-21, Eugenio)
// ============================================================================
// El bloque «Mapa de indicadores» es un marco a `/mapa?embed=1`. En
// humanity.wiki esa ruta existe; en un dominio propio (luzhumanidad.com) la
// aplicación es la del sitio y `/mapa` se tomaba por una página del sitio que
// no existe. Aquí se pinta el mismo mapa, con lo que necesita alrededor
// (sesión y datos), sólo en modo incrustado: `dominio/mapa` sin `embed`
// sigue siendo una página del sitio.
const MapPage = lazy(() => import('./Map'));

export default function MapaDominio() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className="h-screen w-screen overflow-hidden">
          <Suspense fallback={null}><MapPage /></Suspense>
        </div>
      </DataProvider>
    </AuthProvider>
  );
}
