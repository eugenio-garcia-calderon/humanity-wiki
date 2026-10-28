import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import { guardarTerritorio, territorioGuardado, useTerritorios } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { useSitio } from './ContextoSitio';
import { armarCirculos, columnaTerritorio, leerSistemas, type Circulo, type Sistema } from './circulosDatos';
import NotaCirculo from './NotaCirculo';

// ============================================================================
// EL PANEL DE UN CÍRCULO (Círculo 3.0 y 4.0, 2026-10-28, Eugenio)
// ============================================================================
// «Donde pone "Ecología en España", lo de España tiene que ser seleccionable y
// cambiar de territorio; y quita el selector de territorio de arriba y la nota
// global: solo la nota de cada sistema.» El título es «Ecología en [España ▾]» con
// la nota del círculo en ese territorio, y debajo sus sistemas en tarjetas.
//
// Y el círculo elegido: pasar el ratón por un anillo lo enseña hasta que se pincha
// uno; desde entonces manda el pinchado (2026-10-28, Eugenio: «si pincho en un
// anillo, que luego al mover el ratón no se haga hover: nunca puedo llegar a las
// tarjetas»).

/** Los círculos del sitio con las notas del territorio elegido, y el selector de ese territorio. */
export function useCirculosTerritorio(raizId: string, columna?: RegExp) {
  const [j, setJ] = useState<any>(undefined);
  useEffect(() => { let vivo = true; leerSistemas(raizId).then(x => { if (vivo) setJ(x || null); }); return () => { vivo = false; }; }, [raizId]);
  const colT = j ? columnaTerritorio(j) : null;
  // Los territorios que tienen notas en la base de datos; el primero es el de por defecto (España).
  const conNotas = useMemo(() => {
    const ids: string[] = [];
    for (const f of j?.filas || []) { const v = colT ? f.celdas?.[colT.id]?.valor : null; for (const id of Array.isArray(v) ? v : v ? [v] : []) if (!ids.includes(id)) ids.push(id); }
    return ids;
  }, [j, colT]);
  const defecto = conNotas[0] || '';
  const [territorio, setTerritorio] = useState<string>('');
  useEffect(() => { if (defecto && !territorio) setTerritorio(territorioGuardado(defecto)); }, [defecto]); // eslint-disable-line react-hooks/exhaustive-deps
  const opciones = useTerritorios(colT?.tabla || null);
  const conDatos = useMemo(() => new Set(conNotas), [conNotas]);
  const circulos = useMemo(() => (j === undefined ? null : j ? armarCirculos(j, colT ? territorio || defecto : null, columna) : []), [j, colT, territorio, defecto]); // eslint-disable-line react-hooks/exhaustive-deps
  const elegirTerritorio = (id: string) => { setTerritorio(id); guardarTerritorio(id, defecto); };
  const nombreTerritorio = opciones.find(o => o.id === (territorio || defecto))?.nombre || 'España';
  return { circulos, territorio: territorio || defecto, nombreTerritorio, opciones, conDatos, elegirTerritorio, conTerritorio: !!colT && opciones.length > 0 };
}

/** El círculo que se ve: el del ratón hasta que se pincha uno; después, el pinchado (que va en `?circulo=`). */
export function useCirculoElegido(circulos: Circulo[] | null, ancla: string) {
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const clave = new URLSearchParams(search).get('circulo');
  const pinchado = useMemo(() => (circulos ? circulos.findIndex(c => c.clave === clave) : -1), [circulos, clave]);
  const [visto, setVisto] = useState<number | null>(null);
  const elegido = pinchado >= 0 ? pinchado : visto ?? 0;
  const ver = (i: number) => { if (pinchado < 0) setVisto(i); };
  const elegir = (i: number) => {
    const q = new URLSearchParams(search);
    q.set('circulo', circulos![i].clave);
    ir(`${pathname}?${q.toString()}${hash}`, { replace: true });
    // En el móvil las tarjetas quedan debajo: se baja hasta ellas.
    if (window.innerWidth < 1024) setTimeout(() => document.querySelector(`[${ancla}]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  return { elegido, ver, elegir };
}

// MEDIA PANTALLA Y UNA PALABRA (2026-10-28, Eugenio: «que los tres bloques ocupen solo la mitad de arriba de la
// pantalla; si tienes que hacer las tarjetas más pequeñas, hazlas; y si pincho en Movilidad, que el resto de tarjetas se
// queden más compactas, más pequeñitas y con menos color, dejando un hueco más grande para la tercera parte»). El
// territorio ya no va en el título: se elige arriba, en la barra, al lado del buscador.
//  - Con la rama sola (`apretado` falso): tarjetas con su dibujo en una rejilla que llena el alto que le dan (filas
//    iguales), con más columnas cuantos más sectores haya.
//  - Con un sector elegido (`apretado`): pastillas bajas, un dibujo pequeño y la palabra; las no elegidas, en gris y a
//    media luz.
/** A todo lo ancho, hasta seis en una fila; con más, en dos. */
export const colsUnaFila = (n: number) => (n <= 6 ? Math.max(n, 3) : Math.ceil(n / 2));

export function PanelCirculo({ c, t, ancla, alElegir, elegidoId = null, apretado = false, ancho = false }: {
  c: Circulo; t: ReturnType<typeof useCirculosTerritorio>;
  /** El atributo con el que se marca la sección (para bajar hasta ella en el móvil). */
  ancla: string;
  /** Pinchar una tarjeta la elige aquí mismo en vez de abrir su página. */
  alElegir?: (s: Sistema) => void;
  /** La tarjeta elegida, marcada con el azul de las ilustraciones. */
  elegidoId?: string | null;
  /** Con un sector elegido: pastillas pequeñas, para dejar sitio al tercer bloque. */
  apretado?: boolean;
  /** Solo, a todo lo ancho (la vista Círculo, desde que hay un solo selector a la vez): una fila de hasta seis. */
  ancho?: boolean;
}) {
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const n = c.sistemas.length;
  const cols = apretado ? (n > 8 ? 3 : 2) : ancho ? colsUnaFila(n) : n > 10 ? 5 : n > 6 ? 4 : 3;
  return (
    <section aria-live="polite" {...{ [ancla]: c.clave }} className="flex min-h-0 flex-col md:h-full">
      <div className="mb-3 flex items-center gap-2">
        <h2 className={`${apretado ? 'text-xl' : 'text-3xl'} font-black tracking-tight text-slate-900 transition-all`}>{c.nombre}</h2>
        {c.nota != null && <NotaCirculo nota={Math.round(c.nota * 10) / 10} tam={apretado ? 'barra' : 'pequena'} titulo={`${c.nombre} en ${t.nombreTerritorio}`} />}
      </div>
      <ul className={`grid min-h-0 flex-1 gap-2 ${apretado ? 'content-start overflow-y-auto'
        : ancho ? 'grid-cols-2 sm:grid-cols-3 md:[grid-template-rows:repeat(var(--filas3),minmax(0,1fr))] lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] lg:[grid-template-rows:repeat(var(--filas),minmax(0,1fr))]'
        : 'grid-cols-2 sm:grid-cols-3 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] md:[grid-template-rows:repeat(var(--filas),minmax(0,1fr))]'}`}
        style={{ ...(apretado ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : {}), ['--cols' as string]: cols, ['--filas' as string]: Math.ceil(n / cols), ['--filas3' as string]: Math.ceil(n / 3) }}
        data-cols={cols}>
        {c.sistemas.map(s => {
          const on = elegidoId === s.id, apagada = apretado && !on;
          return (
            <li key={s.id} className={apretado ? '' : 'min-h-0'}>
              <Link to={enlace(s.id)} onClick={e => { if (alElegir) { e.preventDefault(); alElegir(s); return; } window.scrollTo(0, 0); }} data-sistema-panel aria-current={on || undefined} title={s.titulo}
                className={`group flex overflow-hidden border bg-white transition ${apretado ? 'h-11 items-center gap-2 rounded-xl pr-2' : 'h-full flex-col rounded-2xl hover:-translate-y-0.5 hover:shadow-lg'} ${on ? 'border-[#3b82c4] ring-2 ring-[#3b82c4]' : 'border-slate-200 hover:border-slate-300'} ${apagada ? 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}>
                <span className={`relative block shrink-0 bg-slate-50 ${apretado ? 'h-full w-12' : 'w-full max-md:aspect-[2/1] md:min-h-[36px] md:flex-1'}`}>
                  {s.imagen && <img src={miniatura(s.imagen, apretado ? 120 : 380)} alt="" className={`absolute inset-0 h-full w-full object-contain ${apretado ? 'p-0.5' : 'p-2'}`} />}
                </span>
                <span className={`flex min-w-0 items-center justify-between gap-2 ${apretado ? 'flex-1' : 'px-3 py-1.5'}`}>
                  {/* Las palabras largas («Telecomunicaciones») se parten por sílabas antes que empujar la nota fuera. */}
                  <span lang="es" className={`min-w-0 hyphens-auto font-extrabold leading-tight text-slate-900 ${apretado ? 'line-clamp-2 break-words text-[13px]' : cols >= 5 ? 'text-sm' : 'text-base'}`}>{s.titulo}</span>
                  {s.nota != null && !apretado && <NotaCirculo nota={s.nota} tam="barra" titulo={s.titulo} />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
