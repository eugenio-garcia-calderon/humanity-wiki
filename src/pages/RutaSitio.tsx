import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import SubpaginaSitio from './SubpaginaSitio';
import { Cargando, SinPagina } from '../components/sitio/VistaPagina';
import { ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';
import { rutaPrecargada, contextoPrecargado, type ContextoRuta } from '../utils/precargado';

// ============================================================================
// LA DIRECCIÓN LEGIBLE DE UNA FICHA — `/powerbanks/anker-737` (2026-10-18)
// ============================================================================
// Wikiproducts, SEO R2. Una ficha (una fila de una base de datos con plantilla
// de dirección, `rutasFila.ts`) se abre por su nombre y no por `/p/BDF…`.
// Aquí sólo se averigua qué página es; se pinta igual que por `/p/:id`.
//
// Al entrar directamente, el servidor ya dejó la respuesta en el HTML
// (`rutaPrecargada`). Si no, se pregunta a `/api/sitio/ruta`. Una dirección
// vieja (la ficha cambió de nombre) lleva a la nueva.

type Estado = { camino: string; id: string | null; no?: boolean; contexto?: ContextoRuta['contexto'] };

export default function RutaSitio({ propio, siNo }: { propio: boolean; siNo?: ReactNode }) {
  const { pathname } = useLocation();
  const ir = useNavigate();
  const [estado, setEstado] = useState<Estado | null>(() => {
    const id = rutaPrecargada(pathname);
    return id ? { camino: pathname, id, contexto: contextoPrecargado(pathname)?.contexto || null } : null;
  });

  useEffect(() => {
    if (estado?.camino === pathname) return;
    let vivo = true;
    setEstado(null);
    fetch(`/api/sitio/ruta?camino=${encodeURIComponent(pathname)}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}));
        if (!vivo) return;
        if (j.redirigir) return ir(j.redirigir, { replace: true });
        setEstado({ camino: pathname, id: r.ok && j.id ? j.id : null, no: !r.ok || !j.id, contexto: j.contexto || null });
      })
      .catch(() => vivo && setEstado({ camino: pathname, id: null, no: true }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!estado || estado.camino !== pathname) return <Cargando />;
  if (!estado.id) {
    return <>{siNo ?? <SinPagina titulo="Esta página no está aquí" texto="O nunca existió, o ha dejado de estar publicada." volver={propio ? '/' : null} />}</>;
  }
  return <SubpaginaSitio key={estado.id} propio={propio} idFijo={estado.id} contexto={estado.contexto || null} />;
}

/** Por subdominio: `quien.humanity.wiki/powerbanks/anker-737`. */
export function RutaEnEspacio() {
  return (
    <ProveedorSitio sitio={sitioConAnfitrion(null)}>
      <RutaSitio propio />
    </ProveedorSitio>
  );
}

/** En casa: `humanity.wiki/@quien/powerbanks/anker-737`. */
export function RutaEnCasa() {
  const { arroba } = useParams();
  if (!arroba?.startsWith('@')) return <SinPagina titulo="Esta página no está aquí" texto="La dirección no es correcta." volver="/" />;
  return (
    <ProveedorSitio sitio={sitioEnCasa(arroba.slice(1))}>
      <RutaSitio propio={false} />
    </ProveedorSitio>
  );
}
