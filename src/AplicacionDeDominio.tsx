import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const PaginaDeDominio = lazy(() => import('./pages/PaginaDeDominio'));

// ============================================================================
// LA APLICACIÓN QUE SE MONTA EN UN DOMINIO PROPIO (2026-08-22)
// ============================================================================
// Eugenio: «permitir que el usuario ponga su dominio propio en una de sus
// páginas como hace notion».
//
// ── POR QUÉ ES OTRA APLICACIÓN Y NO UNA RUTA MÁS ────────────────────────────
// En `lamieldelasierra.com` no existe la plataforma. No hay barra lateral, no
// hay menú de herramientas, no hay proyectos ni mercado ni asistente. Hay una
// web que es de otra persona.
//
// Montarlo como una ruta dentro de la aplicación grande obligaría a cargar sus
// cincuenta páginas, sus proveedores de datos y su armazón para acabar
// pintando un texto. Y sobre todo: cualquier ruta que se añadiera mañana
// aparecería también aquí, en el dominio de alguien, sin que nadie lo
// decidiera.
//
// Así que la decisión se toma antes de montar nada, en `main.tsx`. Es la misma
// forma que ya tienen los subdominios, y por el mismo motivo.
//
// ── TODO LLEVA A LA MISMA PÁGINA, A PROPÓSITO ───────────────────────────────
// Un dominio propio apunta a UNA cosa. Si alguien escribe
// `lamieldelasierra.com/loquesea`, lo que quiere ver es la miel, no un error:
// el camino sobra y no significa nada aquí. Cuando un dominio pueda apuntar a
// un espacio con varias páginas, esto crecerá; hoy sería inventar una
// estructura que no existe.

export default function AplicacionDeDominio({ host }: { host: string }) {
  return (
    <BrowserRouter>
      <Suspense fallback={<Esperando />}>
        <Routes>
          <Route path="*" element={<PaginaDeDominio host={host} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/**
 * Lo que se ve mientras baja la página.
 *
 * Sobrio y sin marca: es el sitio de otra persona y todavía no sabemos ni de
 * qué color es. Una rueda girando con nuestro logo sería lo primero que ve
 * alguien que entra en la tienda de un desconocido.
 */
function Esperando() {
  return (
    <div className="min-h-screen bg-white grid place-items-center">
      <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
    </div>
  );
}
