import { renderToStaticMarkup } from 'react-dom/server';
import { sitioConAnfitrion } from '../components/sitio/ContextoSitio';
import { MarcoLectura, CabeceraLectura, type DatosPagina } from '../components/sitio/CabeceraLectura';

// ============================================================================
// EL TÍTULO Y LA IMAGEN, YA ESCRITOS EN EL HTML (2026-10-01)
// ============================================================================
// Eugenio: «que la página cargue en menos de un segundo, al menos la primera
// información que ve el usuario: el título, la imagen».
//
// Esto escribe la cabecera de la página dentro de `#root` antes de mandar el
// HTML. El navegador la pinta en cuanto le llegan el HTML y la hoja de estilos
// —medio segundo en un móvil— sin esperar a ningún JavaScript. Cuando la
// aplicación arranca, `createRoot` la sustituye por la misma cabecera, ya
// viva, y debajo los bloques.
//
// Es el mismo componente que usa el navegador (`CabeceraLectura`), no una
// copia: si alguien cambia cómo se ve la cabecera, cambia en los dos sitios.
//
// El servidor no sabe el ancho de la pantalla; lo adivina por el navegador
// que dice ser. Si se equivoca, el icono sale unos píxeles más grande o más
// pequeño durante ese medio segundo, nada más.

export function cabeceraEnHtml(pagina: DatosPagina, userAgent: string, raizDominio?: string | null): string {
  const esMovil = /Mobi|Android|iPhone|iPad/i.test(userAgent || '');
  return renderToStaticMarkup(
    // El menú y el pie también (2026-10-02): salen con el título, sin salto.
    <MarcoLectura pagina={pagina} rutas={pagina.sitio ? { ...sitioConAnfitrion(raizDominio), raizId: pagina.sitio.raizId } : undefined}>
      <article>
        <CabeceraLectura pagina={pagina} esMovil={esMovil} />
      </article>
    </MarcoLectura>,
  );
}
