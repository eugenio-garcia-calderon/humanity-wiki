import { lazy, Suspense } from 'react';
import { SettingsProvider } from '../contexts/SettingsContext';
import { AuthProvider } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import { EditProvider } from '../contexts/EditContext';
import { DesignProvider } from '../contexts/DesignContext';
import { TextosProvider } from '../components/ui/TextoEditable';

// ============================================================================
// EL MAPA DE INDICADORES EN UN DOMINIO PROPIO (2026-10-21, Eugenio)
// ============================================================================
// El bloque «Mapa de indicadores» es un marco a `/mapa?embed=1`. En
// humanity.wiki esa ruta existe; en un dominio propio (luzhumanidad.com) la
// aplicación es la del sitio y `/mapa` se tomaba por una página del sitio que
// no existe. Aquí se pinta el mismo mapa, sólo en modo incrustado, con los
// MISMOS proveedores que la aplicación de la casa (`App.tsx`): la ficha del
// territorio usa `useEdit` y sin su proveedor la página se rompía.
const MapPage = lazy(() => import('./Map'));

export default function MapaDominio() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <DataProvider>
          <EditProvider>
            <DesignProvider>
              <TextosProvider>
                <div className="h-screen w-screen overflow-hidden">
                  <Suspense fallback={null}><MapPage /></Suspense>
                </div>
              </TextosProvider>
            </DesignProvider>
          </EditProvider>
        </DataProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
