import { lazy, Suspense, type ReactNode } from 'react';
import TextoEnriquecido from '../knowledge/TextoEnriquecido';
import { cn } from '../../utils/cn';
import { anchoDePagina, clasesDePagina } from '../../utils/ajustesPagina';
import { MarcoSitio, type Rutas } from './MenuSitio';
import { completarSitio } from './sitioWeb';
import MediaPortada from '../ui/MediaPortada';
import { esVideoPortada } from '../../utils/videoPortada';
import { LayoutCabecera, FilaTitulo, ladoIcono, letraDescripcion, tituloPagina } from '../knowledge/CabeceraPagina';
import {
  CabeceraElementos, elementosDe, usaDisenoNuevo, cabeceraFija,
  tamTitulo, tamIcono, tamDescripcion, altoPortada, tallaBotones, zoomPropiedades,
} from '../knowledge/DisenoCabecera';
// Las propiedades de la entrada, en diferido: sólo las páginas que son una
// entrada de base de datos las cargan (y el HTML del servidor no las pinta).
const PropiedadesFila = lazy(() => import('../tablas/PropiedadesFila'));
// Los botones de la cabecera (2026-10-20): con ganchos y ventana, sólo en el navegador.
const BotonesLectura = lazy(() => import('./BotonesLectura'));
const BarraFijaLectura = lazy(() => import('./BotonesLectura').then(m => ({ default: m.BarraFijaLectura })));

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
    <div className={cn('sitio-lectura', conMarco ? 'bg-white' : 'min-h-screen bg-white')}>
      {/* Ancho, letra y tamaño que eligió el autor (2026-10-06, #29). Sin
          elegir, ancho completo y letra de siempre. */}
      <div className={cn('mx-auto px-5 sm:px-8 pb-16 pt-[18px] sm:pt-5', anchoDePagina(pagina?.config), clasesDePagina(pagina?.config))}>
        {children}
      </div>
    </div>
  );
  if (!conMarco) return cuerpo;
  return (
    <MarcoSitio sitio={sitio} rutas={rutas || { enlacePagina: id => `/p/${id}`, raizId: s!.raizId }}
      logo={s!.icono} nombre={s!.titulo} cuenta={(pagina as any)?.miembros?.raiz || null}>
      {cuerpo}
    </MarcoSitio>
  );
}

export function CabeceraLectura({ pagina, esMovil }: { pagina: DatosPagina; esMovil: boolean }) {
  const cfg = pagina.config || {};
  const fija = cabeceraFija(cfg.cabecera) && (
    <Suspense fallback={null}><BarraFijaLectura config={cfg} titulo={pagina.titulo} /></Suspense>
  );
  if (usaDisenoNuevo(cfg.cabecera)) return <>{cabeceraPorElementos(pagina, esMovil)}{fija}</>;
  return <>{cabeceraDeAntes(pagina, esMovil)}{fija}</>;
}

/** LA CABECERA POR ELEMENTOS (2026-10-20). Ver `DisenoCabecera.tsx`. */
function cabeceraPorElementos(pagina: DatosPagina, esMovil: boolean) {
  const cfg = pagina.config || {};
  const c = cfg.cabecera;
  const els = elementosDe(c);
  const el = (id: string) => els.find(e => e.id === id);
  const icono: string | null = cfg.icono || null;
  const lado = tamIcono(c, esMovil, el('icono'));
  const der = (id: string) => el(id)?.col === 'der';
  const hayBotones = Array.isArray(cfg.botones) && cfg.botones.length > 0;
  return (
    <header className="mb-5" data-cabecera-elementos>
      <CabeceraElementos elementos={els} iconoEncima={c?.iconoPos === 'encima'} piezas={{
        icono: icono ? (esUrl(icono)
          ? <img src={icono} alt="" style={{ width: lado, height: lado }} className="rounded-xl object-cover bg-white" />
          : <span style={{ fontSize: Math.round(lado * 0.85), lineHeight: 1 }}>{icono}</span>) : null,
        titulo: (
          <h1 className={cn('font-black tracking-tight text-slate-900 break-words leading-tight', cfg.ocultarTitulo && 'sr-only')}
            style={{ fontSize: tamTitulo(c, el('titulo')) }}>
            {pagina.titulo || 'Sin título'}
          </h1>
        ),
        descripcion: cfg.subtitulo ? (
          <p className="mt-1 text-slate-500 leading-snug whitespace-pre-line break-words" style={{ fontSize: tamDescripcion(c, esMovil, el('descripcion')) }}>
            <TextoEnriquecido texto={cfg.subtitulo} />
          </p>
        ) : null,
        portada: cfg.portada ? (
          <div style={{ '--alto': `${altoPortada(c, el('portada'))}px` } as any}
            className={cn('[&_img]:h-auto [&_img]:max-h-[var(--alto)] [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain', der('portada') && 'flex justify-end')}>
            <MediaPortada src={cfg.portada} prioridad className={esVideoPortada(cfg.portada) ? 'rounded-2xl w-full' : 'rounded-2xl'} />
          </div>
        ) : null,
        botones: hayBotones ? (
          <Suspense fallback={null}><BotonesLectura config={cfg} centrado={false} derecha={der('botones')} talla={tallaBotones(c, el('botones'))} /></Suspense>
        ) : null,
        propiedades: pagina.fila ? (
          <div className="text-left" style={{ zoom: zoomPropiedades(el('propiedades')) }}>
            <Suspense fallback={null}>
              <PropiedadesFila tablaId={pagina.fila.tabla_id} filaId={pagina.fila.fila_id} editable={false} alDerecha={der('propiedades')} />
            </Suspense>
          </div>
        ) : null,
      }} />
    </header>
  );
}

function cabeceraDeAntes(pagina: DatosPagina, esMovil: boolean) {
  const cfg = pagina.config || {};
  const mostrarAutor = cfg.mostrarAutor === true;
  const icono: string | null = cfg.icono || null;
  const lado = ladoIcono(cfg.cabecera, esMovil);
  // Con el icono al lado del título, la cabecera va alineada a la izquierda como la descripción. Con el icono encima o sin icono, centrada como siempre.
  const alIzquierda = !!icono && cfg.cabecera?.iconoPos !== 'encima';
  return (
    // La misma cabecera que el editor: imagen arriba, debajo o a un
    // lado, con el tamaño que eligió el autor.
    <header className="mb-5">
      <LayoutCabecera
        centrado={!alIzquierda}
        cabecera={cfg.cabecera}
        // `fetchPriority`: es lo primero que se ve, que no espere detrás
        // de los iconos y las imágenes de más abajo.
        imagen={cfg.portada ? <MediaPortada src={cfg.portada} prioridad className={esVideoPortada(cfg.portada) ? 'rounded-2xl w-full' : 'rounded-2xl'} /> : null}
        cuerpo={<>
          <FilaTitulo centrado={!alIzquierda} cabecera={cfg.cabecera} icono={icono ? (
            <div>
              {esUrl(icono)
                ? <img src={icono} alt="" style={{ width: lado, height: lado }} className="rounded-xl object-cover bg-white" />
                : <span style={{ fontSize: Math.round(lado * 0.85), lineHeight: 1 }}>{icono}</span>}
            </div>
          ) : null}>
          {/* OCULTO AL PÚBLICO SI SE PIDE (2026-10-02, Eugenio: «permite ocultar
              el título de la página»). Se queda para los lectores de pantalla y
              los buscadores (`sr-only`): una página sin título no se entiende. */}
          <h1 className={cn('font-black tracking-tight text-slate-900 break-words', cfg.ocultarTitulo && 'sr-only')}
            style={{ fontSize: tituloPagina(cfg.cabecera) }}>
            {pagina.titulo || 'Sin título'}
          </h1>
          {/* Si está escrita, se publica. */}
          {cfg.subtitulo && (
            <p className="mt-2 text-slate-500 leading-snug whitespace-pre-line break-words"
              style={{ fontSize: letraDescripcion(cfg.cabecera, esMovil) }}>
              <TextoEnriquecido texto={cfg.subtitulo} />
            </p>
          )}
          </FilaTitulo>
          {Array.isArray(cfg.botones) && cfg.botones.length > 0 && (
            <Suspense fallback={null}><BotonesLectura config={cfg} centrado={!alIzquierda} /></Suspense>
          )}
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
          {/* LAS PROPIEDADES DE LA ENTRADA, COMO EN EL EDITOR (2026-10-20): bajo el
              título y la descripción, solo las visibles en la página. */}
          {pagina.fila && (
            <div className={cn('mt-3 text-left',
              // Con el título centrado (sin imagen al lado), las propiedades también.
              !alIzquierda && !(cfg.portada && ['izquierda', 'derecha'].includes(cfg.cabecera?.disposicion || 'derecha')) && '[&>div>div:first-child]:justify-center')}>
              <Suspense fallback={null}>
                <PropiedadesFila tablaId={pagina.fila.tabla_id} filaId={pagina.fila.fila_id} editable={false} />
              </Suspense>
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
  /** La página propia de una base de datos (`/bd/:tabla`), no una página guardada. */
  virtual?: boolean;
  /** Si la página es una entrada de una base de datos: cuál (para sus propiedades). */
  fila?: { fila_id: string; tabla_id: string } | null;
  created_at?: string;
  updated_at?: string;
  autor?: { handle?: string; nombre?: string; avatar?: string | null };
  padre?: { id: string; titulo: string; slug: string | null; handle: string } | null;
  /** El camino desde la portada del sitio hasta la madre, de arriba abajo. */
  migas?: { id: string; titulo: string; slug: string | null; handle: string }[];
  /** El menú y el pie del sitio, de la página más cercana por encima que los
   *  tenga (ella misma incluida). Lo pone el servidor. */
  sitio?: { config: any; raizId: string; titulo: string; icono: string | null } | null;
};

const esUrl = (s: string) => /^(https?:|\/)/.test(s);
