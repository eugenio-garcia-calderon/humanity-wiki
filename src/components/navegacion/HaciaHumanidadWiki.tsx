import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// ============================================================================
// EXPLORAR, TEMAS Y OBJETIVOS LLEVAN A HUMANIDAD WIKI (2026-10-18, fase 3)
// ============================================================================
// Eugenio separó las dos cosas: Wiki Creator es la herramienta de crear y
// Humanidad Wiki es una página hecha con ella, en su perfil. Quien llega a
// `/explorar`, `/temas` u `/objetivos` va a esa página, por su dirección
// pública (`/@quien/p/:id`), que es la que deja ver sus subpáginas sin tener
// que publicarlas una a una.
//
// SOLO SI ESTÁ PUBLICADA. Mientras siga privada, la dirección enseña lo de
// siempre (`respaldo`): mandar a todo el mundo a una página que no pueden abrir
// sería quitar Explorar sin poner nada en su sitio. Y una dirección con algo
// detrás del `?` (`/explorar?mias=1`, `?crear=1`, `?papelera=1`…) es una
// herramienta concreta, no «explorar»: se queda donde está.

/** La página «Humanidad Wiki» de Eugenio (creada con `/plantillas/humanidad-wiki`). */
export const HUMANIDAD_WIKI_ID = 'KWMVDWJ25K6T';

let destino: Promise<string | null> | null = null;
/** Su dirección pública, o null si no está publicada. Se pregunta una vez. */
function direccion(): Promise<string | null> {
  destino ||= fetch(`/api/sitio/pagina/${HUMANIDAD_WIKI_ID}`, { credentials: 'include' })
    .then(async r => {
      if (!r.ok) return null;
      const j = await r.json();
      return j?.autor?.handle ? `/@${j.autor.handle}/p/${HUMANIDAD_WIKI_ID}` : null;
    })
    .catch(() => null);
  return destino;
}

export default function HaciaHumanidadWiki({ respaldo }: { respaldo: ReactNode }) {
  const { search } = useLocation();
  const conHerramienta = !!search && search !== '?';
  const [a, setA] = useState<string | null | undefined>(conHerramienta ? null : undefined);

  useEffect(() => {
    if (conHerramienta) return;
    let vivo = true;
    direccion().then(d => { if (vivo) setA(d); });
    return () => { vivo = false; };
  }, [conHerramienta]);

  if (a === undefined) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;
  if (a) return <Navigate to={a} replace />;
  return <>{respaldo}</>;
}
