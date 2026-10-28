import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import { useTerritorioActual } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { useSitio } from './ContextoSitio';
import { useCirculos, type Circulo } from './VistaCirculosSitio';
import NotaCirculo from './NotaCirculo';

// ============================================================================
// CÍRCULO 3.0 (2026-10-28, Eugenio)
// ============================================================================
// «Los círculos con los nombres, sin la nota; anillos más gordos y sin los colores
// de las notas: que sea simplemente un selector. Sin título ni subtítulo, sin
// "círculo 4 de 5"; encima de las tarjetas, "Tecnología en España" y su nota en
// la misma línea; las tarjetas más compactas, que se vean todas sin bajar; el
// círculo más a la izquierda y un 60 % del ancho para las tarjetas.» Se hizo
// aparte de Círculo 2.0 para poder compararlas. Como en la 2.0, pasar el ratón por
// un anillo ya enseña sus sistemas y pinchar lo guarda en `?circulo=`.

const C = 500, R0 = 112, R1 = 496; // centro y radios del círculo del centro y del último

/** El selector: cinco anillos grises con su nombre; el elegido, en negro. */
function Selector({ circulos, elegido, elegir, ver }: { circulos: Circulo[]; elegido: number; elegir: (i: number) => void; ver: (i: number) => void }) {
  const [encima, setEncima] = useState<number | null>(null);
  const n = circulos.length, paso = (R1 - R0) / Math.max(1, n - 1);
  const radio = (i: number) => R0 + paso * i;
  return (
    <svg viewBox="0 0 1000 1000" className="block h-auto w-full" role="group" aria-label="Elige un círculo" data-circulos-c3>
      {[...circulos.keys()].reverse().map(i => {
        const c = circulos[i];
        const on = i === elegido, sobre = i === encima && !on;
        const r = radio(i), rDentro = i === 0 ? 0 : radio(i - 1);
        const y = i === 0 ? C : C - (r + rDentro) / 2; // el nombre, en medio de su anillo, arriba
        return (
          <g key={c.clave} role="button" tabIndex={0} aria-pressed={on} aria-label={c.nombre}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-slate-400"
            onClick={() => elegir(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(i); } }}
            onMouseEnter={() => { setEncima(i); ver(i); }} onMouseLeave={() => setEncima(null)} data-anillo-c3={c.clave}>
            <circle cx={C} cy={C} r={r} fill={on ? '#0f172a' : sobre ? '#cbd5e1' : i % 2 ? '#e8edf3' : '#f1f5f9'} stroke="#fff" strokeWidth={10}
              style={{ transition: 'fill .15s ease' }} />
            <text x={C} y={y + 15} textAnchor="middle" fontSize={i === 0 ? 40 : 42} fontWeight={800} fill={on ? '#fff' : '#334155'}>{c.nombre}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function VistaCirculos3Sitio({ raizId }: { raizId: string }) {
  const circulos = useCirculos(raizId);
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const t = useTerritorioActual();
  const territorio = t?.nombre || 'España';
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const clave = new URLSearchParams(search).get('circulo');
  const deLaDireccion = useMemo(() => Math.max(0, circulos?.findIndex(c => c.clave === clave) ?? 0), [circulos, clave]);
  // El que se ve: el último por el que ha pasado el ratón o, si no, el de la dirección.
  const [visto, setVisto] = useState<number | null>(null);
  const elegido = visto ?? deLaDireccion;
  const elegir = (i: number) => {
    setVisto(null);
    const q = new URLSearchParams(search);
    q.set('circulo', circulos![i].clave);
    ir(`${pathname}?${q.toString()}${hash}`, { replace: true });
    // En el móvil las tarjetas quedan debajo del selector: se baja hasta ellas.
    if (window.innerWidth < 1024) setTimeout(() => document.querySelector('[data-circulo-elegido-c3]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando los círculos…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen círculo: añade a su base de datos una columna de selección «Círculo».</div>;
  const c = circulos[elegido];

  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start gap-6 pt-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10" data-vista-circulos3>
      <div className="mx-auto w-full max-w-[440px] lg:sticky lg:top-40 lg:mx-0">
        <Selector circulos={circulos} elegido={elegido} elegir={elegir} ver={setVisto} />
      </div>
      <section aria-live="polite" data-circulo-elegido-c3={c.clave}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">{c.nombre} <span className="font-bold text-slate-500">en {territorio}</span></h2>
          {c.nota != null && <NotaCirculo nota={Math.round(c.nota * 10) / 10} tam="pequena" titulo={`${c.nombre} en ${territorio}`} />}
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {c.sistemas.map(s => (
            <li key={s.id}>
              <Link to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)} data-sistema-c3
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
                {/* En el ordenador, la imagen se encoge con la ventana para que las tarjetas quepan sin bajar. */}
                <span className="relative block aspect-[2/1] w-full bg-slate-50 lg:aspect-auto lg:h-[clamp(90px,calc((100dvh-440px)/2),170px)]">
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
    </div>
  );
}
