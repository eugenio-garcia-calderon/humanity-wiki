import { renderToStaticMarkup } from 'react-dom/server';
import { sitioConAnfitrion } from '../components/sitio/ContextoSitio';
import { MarcoLectura, CabeceraLectura, type DatosPagina } from '../components/sitio/CabeceraLectura';
import { fotoDePortada, portadaEsVideo } from '../utils/portadaPropia';
import CabeceraPaginaEscaparate, { esPaginaEscaparate } from '../components/sitio/CabeceraPaginaEscaparate';

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
  pagina = sinReproductorDePortada(pagina);
  return renderToStaticMarkup(
    // El menú y el pie también (2026-10-02): salen con el título, sin salto.
    <MarcoLectura pagina={pagina} rutas={pagina.sitio ? { ...sitioConAnfitrion(raizDominio), raizId: pagina.sitio.raizId } : undefined}>
      <article>
        {/* Una página propia del escaparate (Colabora, Sala de prensa…, 2026-11-07), con SU cabecera:
            la misma que pinta el navegador, así no cambia al arrancar. */}
        {esPaginaEscaparate(pagina)
          ? <CabeceraPaginaEscaparate pagina={pagina} />
          : <CabeceraLectura pagina={pagina} esMovil={esMovil} />}
      </article>
    </MarcoLectura>,
  );
}

/** UN PROYECTO DEL ESCAPARATE CON UN VÍDEO DE PORTADA (2026-11-07, revisión del carril «compartir»).
 *  En el navegador su cabecera (`CabeceraProyectoEscaparate`) enseña la primera foto propia de la
 *  página; aquí se pintaba el reproductor de YouTube con `autoplay` (`MediaPortada`), y al abrir
 *  Luz del Amazonas se pedían YouTube, Google y sus letras antes de que nadie pidiera ver nada.
 *  Ahora el HTML lleva la misma foto que el navegador, sin `<iframe>`. Es un proyecto con la
 *  misma regla que `proyectoEscaparate` en `VistaPagina.tsx`. */
function sinReproductorDePortada(pagina: DatosPagina): DatosPagina {
  const cfg = pagina.config || {};
  const sitio = pagina.sitio;
  const proyecto = sitio?.config?.escaparate === true && sitio.raizId !== pagina.id && !pagina.virtual
    && !!pagina.fila && pagina.fila.tabla_id === sitio.config?.proyectos;
  if (!proyecto || !portadaEsVideo(cfg.portada)) return pagina;
  // Su encuadre era el del vídeo: la foto de recambio va centrada, como en el navegador.
  return { ...pagina, config: { ...cfg, portada: fotoDePortada(cfg)?.url ?? null, encuadre: null } };
}
