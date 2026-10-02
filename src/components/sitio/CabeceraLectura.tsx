import type { ReactNode } from 'react';
import { MarcoSitio, type Rutas } from './MenuSitio';
import { completarSitio } from './sitioWeb';
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
// CON SU MENÚ Y SU PIE (2026-10-02): `pagina.sitio` es el de la página raíz
// del sitio, que el servidor manda con cada página para que el menú sea el
// mismo en todas. Ver `sitioWeb.ts`.
export function MarcoLectura({ pagina, rutas, children }: {
  pagina?: DatosPagina | null; rutas?: Rutas; children: ReactNode;
}) {
  const s = pagina?.sitio;
  const sitio = s?.config ? completarSitio(s.config) : null;
  const conMarco = !!sitio && (sitio.menu.activo || sitio.pie.activo);
  const cuerpo = (
    <div className={conMarco ? 'bg-white' : 'min-h-screen bg-white'}>
      <div className="mx-auto px-5 sm:px-8 pb-16 pt-6 sm:pt-12 max-w-6xl">
        {children}
      </div>
    </div>
  );
  if (!conMarco) return cuerpo;
  return (
    <MarcoSitio sitio={sitio} rutas={rutas || { enlacePagina: id => `/p/${id}`, raizId: s!.raizId }}
      logo={s!.icono} nombre={s!.titulo}>
      {cuerpo}
    </MarcoSitio>
  );
}

export function CabeceraLectura({ pagina, esMovil }: { pagina: DatosPagina; esMovil: boolean }) {
  const cfg = pagina.config || {};
  const mostrarAutor = cfg.mostrarAutor === true;
  const icono: string | null = cfg.icono || null;
  const lado = ladoIcono(cfg.cabecera, esMovil);
  return (
    // La misma cabecera que el editor: imagen arriba, debajo o a un
    // lado, con el tamaño que eligió el autor.
    <header className="mb-8">
      <LayoutCabecera
        centrado
        cabecera={cfg.cabecera}
        // `fetchPriority`: es lo primero que se ve, que no espere detrás
        // de los iconos y las imágenes de más abajo.
        imagen={cfg.portada ? <img src={cfg.portada} alt="" fetchPriority="high" className="rounded-2xl" /> : null}
        cuerpo={<>
          <FilaTitulo centrado cabecera={cfg.cabecera} icono={icono ? (
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
          {/* LA FECHA YA NO SE PUBLICA (2026-10-02, Eugenio: «quita la fecha que
              está debajo del icono»). `cfg.mostrarFecha`, que tienen algunas
              páginas viejas, se ignora. */}
          {mostrarAutor && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
              {pagina.autor?.avatar && (
                <img src={pagina.autor.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
              )}
              {pagina.autor?.nombre && <span>de <b className="text-slate-600">{pagina.autor.nombre}</b></span>}
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
  /** El menú y el pie del sitio, de la página más cercana por encima que los
   *  tenga (ella misma incluida). Lo pone el servidor. */
  sitio?: { config: any; raizId: string; titulo: string; icono: string | null } | null;
};

const esUrl = (s: string) => /^(https?:|\/)/.test(s);
