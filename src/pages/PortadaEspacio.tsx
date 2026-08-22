import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, FileText, UserX } from 'lucide-react';

// ============================================================================
// LA CASA DE UNA PERSONA — `nombre.humanity.wiki` a secas (2026-08-22)
// ============================================================================
// Fase 1 del plan de tiendas (`memory/11_PLAN_TIENDAS.md`). Hasta hoy, entrar
// en `claude-dos.humanity.wiki` sin pedir página enseñaba LA APLICACIÓN: el
// menú de trabajo, el mercado global, las publicaciones de todo el mundo.
//
// Es la peor pantalla posible para esa dirección. Quien la escribe está
// buscando a UNA persona —le han dado su nombre, o lo ha visto en una tarjeta—
// y se encuentra la plataforma entera. No sabe si se ha equivocado, no
// encuentra a quien buscaba, y lo que ve no es de esa persona.
//
// Esta pantalla enseña lo que hay detrás de ese nombre y nada más.

export default function PortadaEspacio({ handle }: { handle: string }) {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'no-existe' | 'fallo'>('cargando');
  const [datos, setDatos] = useState<any>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/publicar/espacio/${encodeURIComponent(handle)}`)
      .then(async r => {
        if (!vivo) return;
        if (r.status === 404) { setEstado('no-existe'); return; }
        if (!r.ok) { setEstado('fallo'); return; }
        setDatos(await r.json());
        setEstado('ok');
      })
      .catch(() => vivo && setEstado('fallo'));
    return () => { vivo = false; };
  }, [handle]);

  useEffect(() => {
    if (estado !== 'ok' || !datos) return;
    const antes = document.title;
    document.title = `${datos.espacio.nombre} · humanity.wiki`;
    return () => { document.title = antes; };
  }, [estado, datos]);

  if (estado === 'cargando') {
    return <Marco><p className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p></Marco>;
  }

  if (estado !== 'ok') {
    return (
      <Marco>
        <div className="text-center py-12">
          <UserX className="w-10 h-10 mx-auto text-slate-300" />
          <h1 className="mt-3 text-lg font-black text-slate-800">
            {estado === 'no-existe' ? 'Aquí no vive nadie' : 'No se ha podido cargar'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {estado === 'no-existe'
              ? <>Nadie ha reservado el nombre <b>{handle}</b>.</>
              : 'Inténtalo dentro de un momento.'}
          </p>
          <a href="https://humanity.wiki"
             className="inline-block mt-5 h-11 leading-[2.75rem] px-5 rounded-xl bg-slate-900 text-white text-sm font-bold">
            Ir a humanity.wiki
          </a>
        </div>
      </Marco>
    );
  }

  const { espacio, paginas } = datos;

  return (
    <Marco>
      <header className="flex items-center gap-4 pb-6 mb-6 border-b border-slate-100">
        {espacio.avatar
          ? <img src={espacio.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          : <div className="w-16 h-16 rounded-2xl bg-slate-100 grid place-items-center text-xl font-black text-slate-400 shrink-0">
              {(espacio.nombre || '?').slice(0, 1).toUpperCase()}
            </div>}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 truncate">
            {espacio.nombre}
          </h1>
          <p className="text-sm text-slate-400">@{espacio.handle}</p>
          {espacio.bio && <p className="mt-1.5 text-sm text-slate-600">{espacio.bio}</p>}
        </div>
      </header>

      {paginas.length === 0 ? (
        // «No ha publicado nada» NO es «no existe», y por eso se dice distinto.
        // Quien llega tiene que poder saber que ha encontrado a la persona
        // correcta aunque todavía no haya nada que leer.
        <p className="text-sm text-slate-500">
          <b>{espacio.nombre}</b> todavía no ha publicado nada aquí.
        </p>
      ) : (
        <ul className="space-y-2">
          {paginas.map((p: any) => (
            <li key={p.slug}>
              <Link to={`/${p.slug}`}
                className="flex gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors">
                <FileText className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-slate-800 truncate">{p.titulo}</p>
                  {p.adelanto && <p className="text-sm text-slate-500 line-clamp-2">{p.adelanto}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 pt-4 border-t border-slate-100">
        <a href="https://humanity.wiki" className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
          Publicado en <b>humanity.wiki</b>
        </a>
      </footer>
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-14">{children}</div>
    </div>
  );
}
