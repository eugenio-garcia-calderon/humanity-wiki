import type { ReactNode } from 'react';
import { LayoutCabecera, FilaTitulo, ladoIcono, letraDescripcion } from '../knowledge/CabeceraPagina';

// ============================================================================
// EL MARCO Y LA CABECERA DE UNA PÁGINA PUBLICADA (2026-10-01)
// ============================================================================
// Son lo primero que ve quien entra por un dominio propio, y el servidor los
// pinta DENTRO del HTML (`src/server/cabeceraSitio.tsx`) para que el título y
// la imagen salgan antes de que llegue el JavaScript. El servidor importa
// este mismo fichero para que sea el mismo dibujo: dos copias acabarían
// distintas y la página daría un salto al arrancar.
//
// Por eso vive aparte de `VistaPagina` y no usa ganchos, ni el enrutador, ni
// nada del navegador: el servidor no tiene ventana ni historial, y lo que se
// importe aquí se ejecuta también al arrancar el servidor.

// SIEMPRE DE ANCHO COMPLETO (2026-10-01, Eugenio, por medio de prog8-pizarra):
// ya no es una opción de la página. `cfg.anchoCompleto` se ignora; el
// interruptor de «Ajustes de la página» se quita en el editor.
export function MarcoLectura({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto px-5 sm:px-8 pb-16 pt-6 sm:pt-12 max-w-6xl">
        {children}
      </div>
    </div>
  );
}

export function CabeceraLectura({ pagina, esMovil }: { pagina: DatosPagina; esMovil: boolean }) {
  const cfg = pagina.config || {};
  const mostrarAutor = cfg.mostrarAutor === true;
  const mostrarFecha = cfg.mostrarFecha === true;
  const icono: string | null = cfg.icono || null;
  const lado = ladoIcono(cfg.cabecera, esMovil);
  return (
    // La misma cabecera que el editor: imagen arriba, debajo o a un
    // lado, con el tamaño que eligió el autor.
    <header className="mb-8">
      <LayoutCabecera
        cabecera={cfg.cabecera}
        // `fetchPriority`: es lo primero que se ve, que no espere detrás
        // de los iconos y las imágenes de más abajo.
        imagen={cfg.portada ? <img src={cfg.portada} alt="" fetchPriority="high" className="rounded-2xl" /> : null}
        cuerpo={<>
          <FilaTitulo cabecera={cfg.cabecera} icono={icono ? (
            <div>
              {esUrl(icono)
                ? <img src={icono} alt="" style={{ width: lado, height: lado }} className="rounded-xl object-cover bg-white" />
                : <span style={{ fontSize: Math.round(lado * 0.85), lineHeight: 1 }}>{icono}</span>}
            </div>
          ) : null}>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 break-words">
            {pagina.titulo || 'Sin título'}
          </h1>
          {/* Si está escrita, se publica. */}
          {cfg.subtitulo && (
            <p className="mt-2 text-slate-500 leading-snug whitespace-pre-line break-words"
              style={{ fontSize: letraDescripcion(cfg.cabecera, esMovil) }}>
              {cfg.subtitulo}
            </p>
          )}
          </FilaTitulo>
          {(mostrarAutor || mostrarFecha) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              {mostrarAutor && pagina.autor?.avatar && (
                <img src={pagina.autor.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
              )}
              {mostrarAutor && pagina.autor?.nombre && <span>de <b className="text-slate-600">{pagina.autor.nombre}</b></span>}
              {mostrarAutor && mostrarFecha && <span>·</span>}
              {mostrarFecha && <span>{new Date(pagina.updated_at || pagina.created_at || Date.now()).toLocaleDateString('es-ES')}</span>}
            </div>
          )}
        </>}
      />
    </header>
  );
}

export type DatosPagina = {
  id: string;
  titulo: string;
  config: any;
  indexable?: boolean | null;
  created_at?: string;
  updated_at?: string;
  autor?: { handle?: string; nombre?: string; avatar?: string | null };
  padre?: { id: string; titulo: string; slug: string | null; handle: string } | null;
};

const esUrl = (s: string) => /^(https?:|\/)/.test(s);
