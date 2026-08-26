import { useEffect, useState } from 'react';
import { Loader2, Globe, FileQuestion } from 'lucide-react';
import BloquesLectura from '../components/knowledge/BloquesLectura';
import PortadaEspacio from './PortadaEspacio';
import Cesta from '../components/knowledge/Cesta';

// ============================================================================
// LO QUE SE VE EN UN DOMINIO PROPIO — `lamieldelasierra.com` (2026-08-22)
// ============================================================================
// Eugenio: «permitir que el usuario ponga su dominio propio en una de sus
// páginas como hace notion».
//
// ── AQUÍ NO SE MENCIONA HUMANITY.WIKI, Y ESE ES EL PUNTO ────────────────────
// Quien compra un dominio lo compra para que su sitio sea SUYO. Un pie que
// diga «publicado en humanity.wiki» convierte su web en la página de alguien
// alojada en otro sitio, que es justo lo que ha pagado por evitar.
//
// La plataforma sigue estando: en el `/@nombre/pagina` que sigue funcionando,
// en la barra de quien entra con su cuenta. Pero no en la cara que ve su
// cliente.
//
// ── UN DOMINIO PUEDE APUNTAR A DOS COSAS ────────────────────────────────────
// A una PÁGINA suelta —una tienda, un manifiesto, un currículum— o al ESPACIO
// entero de esa persona, que entonces es su web con todas sus páginas dentro.
// El servidor dice cuál con `tipo`, en vez de dejar que el navegador lo
// adivine por qué campos vienen rellenos.

type Estado = 'cargando' | 'pagina' | 'espacio' | 'despublicada' | 'no-existe' | 'fallo';

export default function PaginaDeDominio({ host }: { host: string }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [datos, setDatos] = useState<any>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/dominios/resolver?host=${encodeURIComponent(host)}`)
      .then(async r => {
        if (!vivo) return;
        const j = await r.json().catch(() => ({}));
        if (r.status === 404) { setEstado(j.tipo === 'despublicada' ? 'despublicada' : 'no-existe'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        setDatos(j);
        setEstado(j.tipo === 'espacio' ? 'espacio' : 'pagina');
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [host]);

  useEffect(() => {
    if (estado !== 'pagina' || !datos) return;
    // El título de la pestaña es SÓLO el de la página: sin « · humanity.wiki»
    // detrás. Ver la nota de arriba — el nombre de la plataforma no pinta nada
    // en la ventana del navegador de quien visita un dominio ajeno.
    const antes = document.title;
    document.title = datos.titulo;
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const creada = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = datos.indexable ? 'index,follow' : 'noindex,nofollow';
    return () => { document.title = antes; if (creada && meta) meta.remove(); };
  }, [estado, datos]);

  if (estado === 'cargando') {
    return <Marco><p className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p></Marco>;
  }

  // El espacio entero se pinta con la pantalla que ya existe: es la misma cosa
  // vista desde otra puerta, y dos pantallas para lo mismo son dos sitios donde
  // arreglar cada fallo.
  if (estado === 'espacio' && datos?.handle) {
    return <PortadaEspacio handle={datos.handle} />;
  }

  if (estado !== 'pagina') {
    return (
      <Marco>
        <div className="text-center py-14">
          {estado === 'despublicada'
            ? <FileQuestion className="w-10 h-10 mx-auto text-slate-300" />
            : <Globe className="w-10 h-10 mx-auto text-slate-300" />}
          <h1 className="mt-3 text-lg font-black text-slate-800">
            {estado === 'despublicada' ? 'Esta página ya no está publicada'
              : estado === 'no-existe' ? 'Este dominio todavía no apunta a nada'
              : 'No se ha podido cargar'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {estado === 'despublicada'
              ? 'Quien la escribió ha dejado de compartirla. El dominio sigue siendo suyo.'
              : estado === 'no-existe'
                // Quien ve esto suele ser el dueño, minutos después de
                // configurar el DNS: se le dice qué falta, no «no encontrado».
                ? <>El dominio <b>{host}</b> llega hasta aquí, pero nadie lo ha
                   asociado todavía a una página. Si es tuyo, entra en tu cuenta
                   y añádelo desde «Compartir».</>
                : 'Inténtalo dentro de un momento.'}
          </p>
        </div>
      </Marco>
    );
  }

  const bloques = datos.config?.bloques || datos.config?.blocks || [];

  return (
    <Marco>
      <article>
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 break-words">
            {datos.titulo}
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            {new Date(datos.updated_at || datos.created_at).toLocaleDateString('es-ES')}
          </p>
        </header>
        <BloquesLectura bloques={bloques} comentable={(datos as any).id} />
      </article>
      {/* Si la página vende algo, la cesta va igual: el dominio cambia la
          dirección, no lo que la página es. */}
      {datos.autor?.handle && <Cesta tienda={datos.autor.handle} />}
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-14">{children}</div>
    </div>
  );
}
