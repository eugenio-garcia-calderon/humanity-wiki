import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import Cesta from '../components/knowledge/Cesta';
import VistaPagina, { Cargando, SinPagina } from '../components/sitio/VistaPagina';
import { ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';

// ============================================================================
// LA CARA PÚBLICA DE UNA PÁGINA — `/@nombre/pagina` (2026-08-22)
// ============================================================================
// Faltaba, y faltaba de la peor manera: la dirección respondía 200 porque el
// servidor devuelve la aplicación entera para cualquier ruta, así que parecía
// funcionar y enseñaba otra cosa. Es exactamente el fallo que este proyecto
// tiene documentado —un 200 que esconde que no hay nada— y por eso al probarlo
// contra producción salió «200» y ninguna página.
//
// ── ESTA PANTALLA NO LLEVA EL ARMAZÓN DE TRABAJO ────────────────────────────
// Va FUERA del `Layout`, sin barra lateral, sin herramientas y sin hablarle de
// tú a nadie. Quien llega aquí viene de un enlace que le han pasado: no tiene
// cuenta, no tiene proyectos, y enseñarle «Todavía no tienes proyectos» sería
// contarle su vida en vez de enseñarle lo que venía a leer. Es la misma lección
// que costó B3 y B41.
//
// ── SIRVE PARA LAS DOS DIRECCIONES ──────────────────────────────────────────
// Hoy llega por `/@nombre/pagina`. Cuando exista el DNS comodín llegará por
// `nombre.humanity.wiki/pagina` y el nombre saldrá del `Host` en vez del
// camino. Lo que se pinta es lo mismo, así que cambiar de forma no cambia de
// pantalla.

/**
 * A qué pantalla de la plataforma corresponde cada cosa compartible.
 *
 * Está aquí y no en el servidor a propósito: el servidor sabe QUÉ hay en una
 * dirección, y las rutas de la aplicación son cosa de la aplicación. Añadir un
 * tipo nuevo es una línea; si algún día son diez, se sube a `utils/`.
 */
function rutaDe(x: { tipo: string; slug: string; id: string }): string {
  if (x.tipo === 'proyecto') return `/carpetas/${x.slug || x.id}`;
  return `/`;
}

export default function PaginaPublica({ handleFijo }: { handleFijo?: string }) {
  // React Router 7 no admite un trozo fijo pegado a un parámetro dentro del
  // mismo tramo (`/@:handle` no vale), así que el arroba viaja DENTRO del
  // parámetro y se comprueba aquí. La ruta declarada es `:arroba/:slug`, la
  // menos concreta que existe: el enrutador puntúa lo fijo por encima de lo
  // variable, así que `/retos/:id` y todas las rutas reales ganan siempre, y
  // aquí solo llega lo que no era de nadie.
  const { arroba, slug } = useParams();
  // Por subdominio el nombre llega ya resuelto desde el `Host` (`handleFijo`);
  // por camino viene pegado a un arroba dentro del propio tramo.
  const handle = handleFijo ?? (arroba?.startsWith('@') ? arroba.slice(1) : null);

  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-existe' | 'fallo'>('cargando');
  const [pagina, setPagina] = useState<any>(null);
  /** Si lo que hay en esta dirección no es una página, a dónde se va. */
  const [otroSitio, setOtroSitio] = useState<string | null>(null);

  useEffect(() => {
    // Sin arroba no es una dirección de persona: es cualquier otra cosa que no
    // ha encontrado sitio. No se pregunta al servidor por ella.
    if (!handle) { setEstado('no-existe'); return; }
    let vivo = true;
    /*
     * ── ESTA DIRECCIÓN YA NO ES SÓLO DE PÁGINAS (2026-08-25) ────────────────
     * `/@quien/lo-que-sea` puede ser hoy una página o un proyecto, y mañana un
     * mapa. Se pregunta al resolvedor común de `compartir.ts`, que busca en
     * todo lo que se puede compartir y contesta de qué tipo es.
     *
     * Lo que NO es una página se manda a su propia pantalla en vez de
     * intentar pintarlo aquí: un proyecto ya tiene una página pública que
     * funciona, con su tablero, sus ramas y su gente. Reimplementarla dentro de
     * ésta sería tener dos sitios que enseñan un proyecto y que se separan a la
     * primera que alguien toque uno.
     */
    fetch(`/api/compartir/resolver/${encodeURIComponent(handle)}/${encodeURIComponent(slug || '')}`)
      .then(async r => {
        if (!vivo) return;
        // 404 es «no existe o no está publicada», y son la misma respuesta a
        // propósito: decir «existe pero no puedes verla» ya filtra que existe.
        if (r.status === 404) { setEstado('no-existe'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        const j = await r.json();
        if (j.tipo && j.tipo !== 'pagina') { setOtroSitio(rutaDe(j)); return; }
        // Una página necesita su `config` para pintarse, y el resolvedor común
        // no la trae: devuelve lo que TODO lo compartible tiene en común. Se
        // pide aparte al de siempre, que sigue siendo quien sabe de páginas.
        const r2 = await fetch(`/api/publicar/resolver/${encodeURIComponent(handle)}/${encodeURIComponent(slug || '')}`);
        if (!vivo) return;
        if (!r2.ok) { setEstado(r2.status === 404 ? 'no-existe' : 'fallo'); return; }
        setPagina(await r2.json());
        setEstado('ok');
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [handle, slug]);

  // A dónde va lo que no es una página. `replace` para que el botón de atrás
  // devuelva a donde estaba quien pulsó el enlace, y no a esta pantalla
  // intermedia que rebota otra vez.
  if (otroSitio) return <Navigate to={otroSitio} replace />;

  // Por subdominio es la web de alguien: sin marca, sin «ir a humanity.wiki».
  // Por `/@quien/…` se está en casa y la puerta de vuelta sí tiene sentido.
  const propio = !!handleFijo;
  const sitio = propio ? sitioConAnfitrion(null) : sitioEnCasa(handle || '');

  if (estado === 'cargando') return <Cargando />;

  if (estado !== 'ok') {
    return (
      <SinPagina
        titulo="Esta página no está aquí"
        texto={estado === 'no-existe'
          ? 'O nunca existió, o quien la escribió ha dejado de publicarla.'
          : 'No se ha podido cargar. Inténtalo dentro de un momento.'}
        volver="/"
      />
    );
  }

  return (
    <ProveedorSitio sitio={sitio}>
      <VistaPagina pagina={pagina} propio={propio} pie={<>
        {!propio && (
          <footer className="mt-10 pt-4 border-t border-slate-100">
            <Link to="/" className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
              Publicado en <b>humanity.wiki</b>
            </Link>
          </footer>
        )}
        {/* Sólo dentro de una tienda, y sólo si hay algo dentro: la cesta se
            esconde sola cuando está vacía. */}
        {handleFijo && <Cesta tienda={handleFijo} />}
      </>} />
    </ProveedorSitio>
  );
}
