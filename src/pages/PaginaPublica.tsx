import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, FileQuestion } from 'lucide-react';
import BloquesLectura from '../components/knowledge/BloquesLectura';

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

  useEffect(() => {
    // Sin arroba no es una dirección de persona: es cualquier otra cosa que no
    // ha encontrado sitio. No se pregunta al servidor por ella.
    if (!handle) { setEstado('no-existe'); return; }
    let vivo = true;
    fetch(`/api/publicar/resolver/${encodeURIComponent(handle)}/${encodeURIComponent(slug || '')}`)
      .then(async r => {
        if (!vivo) return;
        // 404 es «no existe o no está publicada», y son la misma respuesta a
        // propósito: decir «existe pero no puedes verla» ya filtra que existe.
        if (r.status === 404) { setEstado('no-existe'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        const j = await r.json();
        setPagina(j);
        setEstado('ok');
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [handle, slug]);

  // El título de la pestaña y la orden a los buscadores. `noindex` se pone
  // cuando el autor ha dicho que no quiere aparecer en Google: publicar y ser
  // encontrable son dos decisiones distintas.
  useEffect(() => {
    if (estado !== 'ok' || !pagina) return;
    const anterior = document.title;
    document.title = `${pagina.titulo} · humanity.wiki`;
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const creada = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = pagina.indexable ? 'index,follow' : 'noindex,nofollow';
    return () => {
      document.title = anterior;
      if (creada && meta) meta.remove();
    };
  }, [estado, pagina]);

  if (estado === 'cargando') {
    return (
      <Marco>
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
        </p>
      </Marco>
    );
  }

  if (estado !== 'ok') {
    return (
      <Marco>
        <div className="text-center py-10">
          <FileQuestion className="w-10 h-10 mx-auto text-slate-300" />
          <h1 className="mt-3 text-lg font-black text-slate-800">Esta página no está aquí</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {estado === 'no-existe'
              ? 'O nunca existió, o quien la escribió ha dejado de publicarla.'
              : 'No se ha podido cargar. Inténtalo dentro de un momento.'}
          </p>
          <Link to="/" className="inline-block mt-4 h-11 leading-[2.75rem] px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">
            Ir a humanity.wiki
          </Link>
        </div>
      </Marco>
    );
  }

  const bloques = pagina.config?.bloques || pagina.config?.blocks || null;

  return (
    <Marco>
      <article>
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 break-words">
            {pagina.titulo}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            {pagina.autor?.avatar && (
              <img src={pagina.autor.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            )}
            <span>de <b className="text-slate-600">{pagina.autor?.nombre}</b></span>
            <span>·</span>
            <span>{new Date(pagina.updated_at || pagina.created_at).toLocaleDateString('es-ES')}</span>
          </div>
        </header>

        {/* El editor no vale aquí: va enredado con el cursor, el guardado y
            los menús, y quien lee no tiene nada de eso. `BloquesLectura` pinta
            los mismos bloques con la misma tabla de estilos. */}
        <BloquesLectura bloques={bloques || []} />
      </article>

      <footer className="mt-10 pt-4 border-t border-slate-100">
        <Link to="/" className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
          Publicado en <b>humanity.wiki</b> — el conocimiento de la humanidad, en común
        </Link>
      </footer>
    </Marco>
  );
}

/** Sin barra lateral y sin herramientas: ver la nota de arriba. */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-14">{children}</div>
    </div>
  );
}
