import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import VistaPagina, { Cargando, SinPagina, type DatosPagina } from '../components/sitio/VistaPagina';
import { useSitio, ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';
import { paginaPrecargada } from '../utils/precargado';

// ============================================================================
// UNA SUBPÁGINA DE UN SITIO PUBLICADO — `/p/:id` (2026-09-30)
// ============================================================================
// Lo que se abre al pinchar una tarjeta de la galería de una página publicada.
// Eugenio: «cuando se pincha en un elemento de la base de datos vuelve a
// aparecer el menú general de Humanity Wiki, y eso es un error. Tiene que
// permanecer en ese dominio como si fuese una página».
//
// Quién puede verla lo decide el servidor (`sitios.ts`): la página si está
// publicada, o si lo está la página que contiene su base de datos.

export default function SubpaginaSitio({ propio }: { propio: boolean }) {
  const { id } = useParams();
  const sitio = useSitio();
  // Al entrar directamente por `/p/:id`, la página ya viene en el HTML.
  const [pagina, setPagina] = useState<DatosPagina | null>(() => paginaPrecargada(id));
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no' | 'fallo'>(pagina ? 'ok' : 'cargando');

  useEffect(() => {
    if (pagina?.id === id) return;
    let vivo = true;
    setEstado('cargando');
    fetch(`/api/sitio/pagina/${encodeURIComponent(id || '')}`)
      .then(async r => {
        if (!vivo) return;
        if (r.status === 404) { setEstado('no'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        setPagina(await r.json());
        setEstado('ok');
        window.scrollTo(0, 0);
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [id]);

  if (estado === 'cargando') return <Cargando />;
  if (estado !== 'ok' || !pagina) {
    return (
      <SinPagina
        titulo={estado === 'no' ? 'Esta página no está aquí' : 'No se ha podido cargar'}
        texto={estado === 'no' ? 'O nunca existió, o ha dejado de estar publicada.' : 'Inténtalo dentro de un momento.'}
        volver={sitio && propio ? '/' : null}
      />
    );
  }
  return <VistaPagina pagina={pagina} propio={propio} />;
}

/** Por subdominio: `quien.humanity.wiki/p/:id`. */
export function SubpaginaEnEspacio() {
  return (
    <ProveedorSitio sitio={sitioConAnfitrion(null)}>
      <SubpaginaSitio propio />
    </ProveedorSitio>
  );
}

/** En casa: `humanity.wiki/@quien/p/:id`. */
export function SubpaginaEnCasa() {
  const { arroba } = useParams();
  if (!arroba?.startsWith('@')) return <SinPagina titulo="Esta página no está aquí" texto="La dirección no es correcta." volver="/" />;
  return (
    <ProveedorSitio sitio={sitioEnCasa(arroba.slice(1))}>
      <SubpaginaSitio propio={false} />
    </ProveedorSitio>
  );
}
