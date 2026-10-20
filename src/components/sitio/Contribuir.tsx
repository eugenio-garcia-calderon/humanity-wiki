import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';

// ============================================================================
// AÑADIR ENTRADAS DESDE LA PÁGINA PUBLICADA (2026-10-20, Eugenio)
// ============================================================================
// Quien puede añadir entradas en una página (ver `server/contribuir.ts`) ve,
// encima de cada base de datos, «Añadir entrada». No entra al editor: rellena
// un formulario con las propiedades que ya existen, enlaza con otras bases de
// datos y sube portada, texto e imágenes. La galería se recarga con la nueva.

const NuevaEntradaPublica = lazy(() => import('./NuevaEntradaPublica'));

type Estado = { puede: boolean; tablas: string[] };
const cache = new Map<string, Promise<Estado>>();
const pedir = (paginaId: string) => {
  if (!cache.has(paginaId)) {
    cache.set(paginaId, fetch(`/api/sitio-contribuir/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { puede: false, tablas: [] })).catch(() => ({ puede: false, tablas: [] })));
  }
  return cache.get(paginaId)!;
};

/** ¿Puede quien mira añadir entradas en esta página? Se vuelve a preguntar al entrar o salir. */
export function useContribuir(paginaId: string | undefined): Estado {
  const [e, setE] = useState<Estado>({ puede: false, tablas: [] });
  useEffect(() => {
    if (!paginaId) return;
    let vivo = true;
    const cargar = () => pedir(paginaId).then(x => { if (vivo) setE(x); });
    cargar();
    const otraVez = () => { cache.delete(paginaId); cargar(); };
    window.addEventListener('sitio:sesion', otraVez);
    return () => { vivo = false; window.removeEventListener('sitio:sesion', otraVez); };
  }, [paginaId]);
  return e;
}

/** Una base de datos de la página publicada, con «Añadir entrada» para quien puede. */
export function BdContribuible({ paginaId, tablaId, children }: { paginaId?: string; tablaId: string; children: (clave: number) => ReactNode }) {
  const { puede, tablas } = useContribuir(paginaId);
  const [clave, setClave] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const aqui = puede && !!paginaId && tablas.includes(tablaId);
  return (
    <>
      {aqui && (
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={() => setAbierto(true)} data-anadir-entrada={tablaId}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Añadir entrada
          </button>
        </div>
      )}
      {children(clave)}
      {abierto && paginaId && (
        <Suspense fallback={null}>
          <NuevaEntradaPublica paginaId={paginaId} tablaId={tablaId} onCerrar={() => setAbierto(false)}
            onCreada={titulo => { setAbierto(false); setClave(c => c + 1); setAviso(`«${titulo}» añadida`); setTimeout(() => setAviso(null), 4000); }} />
        </Suspense>
      )}
      {aviso && <p role="status" className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-xl">{aviso}</p>}
    </>
  );
}
