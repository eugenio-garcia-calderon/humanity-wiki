import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProveedorSitio, sitioConAnfitrion } from './components/sitio/ContextoSitio';
import PaginaDeDominio, { type Resuelto } from './pages/PaginaDeDominio';
import SubpaginaSitio from './pages/SubpaginaSitio';
import { resolverPrecargado } from './utils/precargado';

// ── SIN `lazy` AQUÍ DENTRO (2026-10-01) ──────────────────────────────────────
// Este fichero ya llega aparte de la plataforma (`main.tsx` lo importa a
// demanda), así que partirlo otra vez sólo añadía un viaje más en fila antes
// del título: medido, medio segundo. Y con `lazy`, al montar se enseñaba la
// rueda ENCIMA de la cabecera que el servidor ya había pintado.

/** Lo que contesta el resolvedor, traducido a lo que la pantalla necesita. */
function traducir(status: number, j: any): Resuelto {
  if (status === 404) return { estado: j?.tipo === 'despublicada' ? 'despublicada' : 'no-existe' };
  if (status < 200 || status >= 300) return { estado: 'fallo' };
  return { estado: j?.tipo === 'espacio' ? 'espacio' : 'pagina', datos: j };
}

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
// ── TODO LLEVA A LA MISMA PÁGINA, SALVO LAS SUBPÁGINAS ─────────────────────
// Un dominio propio apunta a UNA cosa. Si alguien escribe
// `lamieldelasierra.com/loquesea`, lo que quiere ver es la miel, no un error.
// La única excepción son las páginas que cuelgan de ella (los elementos de sus
// bases de datos), que viven en `/p/:id` — ver `SubpaginaSitio`.

export default function AplicacionDeDominio({ host }: { host: string }) {
  // Se pregunta UNA vez a qué apunta el dominio, antes de enrutar: la raíz del
  // sitio tiene que saberse para que una subpágina pueda volver a «/» en vez
  // de a `/p/:id` de la misma página.
  // Normalmente la respuesta ya viene dentro del HTML (`precargado.ts`) y no
  // se pregunta nada: la página se pinta en el primer render.
  const [resuelto, setResuelto] = useState<Resuelto | null>(() => {
    const p = resolverPrecargado(host);
    return p ? traducir(p.status, p.body) : null;
  });
  useEffect(() => {
    if (resuelto) return;
    let vivo = true;
    fetch(`/api/dominios/resolver?host=${encodeURIComponent(host)}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (vivo) setResuelto(traducir(r.status, j));
      })
      .catch(() => vivo && setResuelto({ estado: 'fallo' }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  if (!resuelto) return <Esperando />;
  const raizId = resuelto.estado === 'pagina' ? resuelto.datos?.id : null;

  return (
    <BrowserRouter>
      <ProveedorSitio sitio={sitioConAnfitrion(raizId)}>
          <Routes>
            {/* LAS SUBPÁGINAS SE QUEDAN EN EL DOMINIO (2026-09-30). Antes todo
                camino llevaba a la misma página; ahora un elemento de una base
                de datos se abre en `dominio.com/p/…`, sin salir de aquí. */}
            <Route path="p/:id" element={<SubpaginaSitio propio />} />
            <Route path="*" element={<PaginaDeDominio host={host} resuelto={resuelto} />} />
          </Routes>
      </ProveedorSitio>
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
