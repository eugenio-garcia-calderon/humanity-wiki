import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import ElegirTerritorio, { guardarTerritorio, territorioGuardado, useTerritorios } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { useSitio } from './ContextoSitio';
import { armarCirculos, columnaTerritorio, leerSistemas, type Circulo } from './VistaCirculosSitio';
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
export function useCirculosTerritorio(raizId: string) {
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
  const circulos = useMemo(() => (j === undefined ? null : j ? armarCirculos(j, colT ? territorio || defecto : null) : []), [j, colT, territorio, defecto]);
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

export function PanelCirculo({ c, t, compacto = false, ancla }: {
  c: Circulo; t: ReturnType<typeof useCirculosTerritorio>;
  /** Las tarjetas encogen la imagen con el alto de la ventana para que quepan sin bajar. */
  compacto?: boolean;
  /** El atributo con el que se marca la sección (para bajar hasta ella en el móvil). */
  ancla: string;
}) {
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  return (
    <section aria-live="polite" {...{ [ancla]: c.clave }}>
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">{c.nombre} <span className="font-bold text-slate-500">en</span></h2>
        {t.conTerritorio
          ? <ElegirTerritorio segmento alinear="izquierda" opciones={t.opciones} conDatos={t.conDatos} elegido={t.territorio} onElegir={t.elegirTerritorio} />
          : <span className="text-3xl font-black tracking-tight text-slate-900">{t.nombreTerritorio}</span>}
        {c.nota != null && <NotaCirculo nota={Math.round(c.nota * 10) / 10} tam="pequena" titulo={`${c.nombre} en ${t.nombreTerritorio}`} />}
      </div>
      {c.nota == null && <p className="-mt-2 mb-3 text-sm font-semibold text-slate-500">Todavía no hay notas para {t.nombreTerritorio}.</p>}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {c.sistemas.map(s => (
          <li key={s.id}>
            <Link to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)} data-sistema-panel
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
              <span className={`relative block aspect-[2/1] w-full bg-slate-50 ${compacto ? 'lg:aspect-auto lg:h-[clamp(90px,calc((100dvh-380px)/2),170px)]' : ''}`}>
                {s.imagen && <img src={miniatura(s.imagen, 380)} alt="" className="absolute inset-0 h-full w-full object-contain p-2" />}
              </span>
              <span className="flex items-center justify-between gap-3 px-4 py-1.5">
                <span className="text-lg font-extrabold text-slate-900">{s.titulo}</span>
                {s.nota != null && <NotaCirculo nota={s.nota} tam="barra" titulo={s.titulo} />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
