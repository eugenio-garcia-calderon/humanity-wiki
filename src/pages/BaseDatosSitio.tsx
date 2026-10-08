import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import VistaPagina, { Cargando, SinPagina, type DatosPagina } from '../components/sitio/VistaPagina';
import MuroMiembros from '../components/sitio/MuroMiembros';
import { ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';

// ============================================================================
// LA PÁGINA PROPIA DE UNA BASE DE DATOS — `/bd/:tabla/:nombre` (2026-10-08)
// ============================================================================
// La galería de una base de datos como página en sí, con su dirección para
// buscadores y con el menú y el pie de la página que la enseña. El servidor la
// arma al vuelo (`baseDatosPublica`, en `sitios.ts`): no hay nada guardado.
// El `:nombre` sólo es para quien lee la dirección; manda el id.

function Vista({ modo, arroba }: { modo: 'espacio' | 'casa'; arroba?: string }) {
  const { tablaId } = useParams();
  const [pagina, setPagina] = useState<DatosPagina | null>(null);
  const [muro, setMuro] = useState<any>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no' | 'fallo'>('cargando');

  useEffect(() => {
    if (!tablaId) return;
    let vivo = true;
    setEstado('cargando');
    fetch(`/api/sitio/bd/${encodeURIComponent(tablaId)}`, { credentials: 'include' })
      .then(async r => {
        if (!vivo) return;
        const j = await r.json().catch(() => ({}));
        if (r.status === 404) { setEstado('no'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        setMuro(j.muro || null); setPagina(j.muro ? null : j); setEstado('ok'); window.scrollTo(0, 0);
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [tablaId]);

  if (estado === 'cargando') return <Cargando />;
  if (muro) return <MuroMiembros muro={muro} paginaId={tablaId} onDentro={() => window.location.reload()} />;
  if (estado !== 'ok' || !pagina) {
    return (
      <SinPagina
        titulo={estado === 'no' ? 'Esta página no está aquí' : 'No se ha podido cargar'}
        texto={estado === 'no' ? 'O nunca existió, o ha dejado de estar publicada.' : 'Inténtalo dentro de un momento.'}
        volver={modo === 'espacio' ? '/' : null}
      />
    );
  }
  const sitio = modo === 'espacio' ? sitioConAnfitrion(pagina.sitio?.raizId) : sitioEnCasa(arroba || pagina.autor?.handle || '');
  return <ProveedorSitio sitio={sitio}><VistaPagina pagina={pagina} propio={modo === 'espacio'} /></ProveedorSitio>;
}

/** Subdominio o dominio propio: `quien.humanity.wiki/bd/:tabla`. */
export function BaseDatosEnEspacio() { return <Vista modo="espacio" />; }

/** En casa: `humanity.wiki/@quien/bd/:tabla`, o `humanity.wiki/bd/:tabla` (el autor sale de la página). */
export function BaseDatosEnCasa() {
  const { arroba } = useParams();
  return <Vista modo="casa" arroba={arroba?.startsWith('@') ? arroba.slice(1) : undefined} />;
}
