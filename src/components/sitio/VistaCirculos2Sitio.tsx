import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { colorDeNota, textoSobre, tonosDeNota } from '../../utils/nota';
import { miniatura } from '../../utils/miniatura';
import { useTerritorioActual } from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { useSitio } from './ContextoSitio';
import { useCirculos, type Circulo } from './VistaCirculosSitio';

// ============================================================================
// CÍRCULO 2.0 (2026-10-28, Eugenio: «no se entiende, hazlo de nuevo, demasiado complejo»)
// ============================================================================
// Una sola idea: «elige un círculo y ves sus sistemas». A la izquierda, cinco
// círculos concéntricos —de Personas, en el centro, a Planeta, fuera—, cada uno
// con su nombre y su nota media, sin nada más. A la derecha, los sistemas del
// círculo elegido en tarjetas grandes con su ilustración y su nota. El círculo
// elegido va en la dirección (`?vista=circulos2&circulo=hogar`) para poder
// compartirlo; sin él, el del centro.
// (La primera versión, un diagrama de porciones con fichas al pasar, se retiró:
// demasiada información a la vez.)

const DESCRIPCION: Record<string, string> = {
  personas: 'Lo que cada persona necesita para vivir bien.',
  hogar: 'Dónde y con quién vivimos.',
  sociedad: 'Cómo convivimos, decidimos y compartimos.',
  tecnologia: 'Lo que fabricamos, movemos y conectamos.',
  planeta: 'Lo que nos sostiene a todos.',
};

const C = 500, R0 = 130, R1 = 494; // centro y radios del círculo del centro y del último
const coma = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1).replace('.', ','));
const colorDe = (n: number | null) => (n != null ? colorDeNota(n) : '#94a3b8');
/** El color de la nota mezclado con blanco (0 = el color, 1 = blanco). */
const mezcla = (hex: string, blanco: number) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${c.map(v => Math.round(v + (255 - v) * blanco)).join(',')})`;
};

function Nota({ nota, grande = false }: { nota: number | null; grande?: boolean }) {
  if (nota == null) return null;
  const color = colorDeNota(nota);
  return (
    <span className={`inline-flex shrink-0 items-baseline rounded-full font-black tabular-nums ${grande ? 'px-3.5 py-1 text-2xl' : 'px-2.5 py-0.5 text-base'}`}
      style={{ background: color, color: textoSobre(color) }}>
      {coma(nota)}<span className={`ml-0.5 font-semibold opacity-70 ${grande ? 'text-sm' : 'text-xs'}`}>/10</span>
    </span>
  );
}

/** Los cinco círculos, uno dentro de otro. Cada anillo es un botón; el elegido, más intenso y con borde. */
function Circulos({ circulos, elegido, elegir }: { circulos: Circulo[]; elegido: number; elegir: (i: number) => void }) {
  const [encima, setEncima] = useState<number | null>(null);
  const n = circulos.length, paso = (R1 - R0) / Math.max(1, n - 1);
  const radio = (i: number) => R0 + paso * i;
  return (
    <svg viewBox="0 0 1000 1000" className="block h-auto w-full" role="group" aria-label="Elige un círculo" data-circulos-c2>
      {[...circulos.keys()].reverse().map(i => {
        const c = circulos[i];
        const color = colorDe(c.nota);
        const on = i === elegido, sobre = i === encima;
        const r = radio(i), rDentro = i === 0 ? 0 : radio(i - 1);
        const y = i === 0 ? C : C - (r + rDentro) / 2; // el rótulo, en medio de su anillo, arriba
        return (
          <g key={c.clave} role="button" tabIndex={0} aria-pressed={on} aria-label={`${c.nombre}: ${c.nota != null ? coma(c.nota) : 'sin nota'} sobre 10`}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-slate-900"
            onClick={() => elegir(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(i); } }}
            onMouseEnter={() => setEncima(i)} onMouseLeave={() => setEncima(null)} data-anillo-c2={c.clave}>
            <circle cx={C} cy={C} r={r} fill={mezcla(color, on ? 0.45 : sobre ? 0.66 : 0.82)} stroke={on ? '#0f172a' : '#fff'} strokeWidth={on ? 5 : 8}
              style={{ transition: 'fill .2s ease' }} />
            {/* Nombre y nota en una sola línea, grande: se lee también en el móvil. */}
            {i === 0 ? <>
              {/* En el círculo del centro no cabe en una línea: nombre y nota, uno encima del otro. */}
              <text x={C} y={C - 6} textAnchor="middle" fontSize={44} fontWeight={800} fill="#0f172a">{c.nombre}</text>
              {c.nota != null && <text x={C} y={C + 46} textAnchor="middle" fontSize={44} fontWeight={900} fill={tonosDeNota(c.nota).tinta}>{coma(c.nota)}</text>}
            </> : <text x={C} y={y + 14} textAnchor="middle" fontSize={40} fontWeight={800} fill="#0f172a">
              {c.nombre}{c.nota != null && <tspan fontWeight={900} fill={tonosDeNota(c.nota).tinta} dx={12}>{coma(c.nota)}</tspan>}
            </text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function VistaCirculos2Sitio({ raizId }: { raizId: string }) {
  const circulos = useCirculos(raizId);
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const t = useTerritorioActual();
  const territorio = t?.nombre || 'España';
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const clave = new URLSearchParams(search).get('circulo');
  const elegido = useMemo(() => Math.max(0, circulos?.findIndex(c => c.clave === clave) ?? 0), [circulos, clave]);
  const elegir = (i: number) => {
    const q = new URLSearchParams(search);
    q.set('circulo', circulos![i].clave);
    ir(`${pathname}?${q.toString()}${hash}`, { replace: true });
    // En el móvil los sistemas quedan debajo del dibujo: se baja hasta ellos.
    if (window.innerWidth < 1024) setTimeout(() => document.querySelector('[data-circulo-elegido-c2]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando los círculos…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen círculo: añade a su base de datos una columna de selección «Círculo».</div>;
  const c = circulos[elegido];

  return (
    <div className="mx-auto max-w-[1200px] pt-1" data-vista-circulos2>
      <header className="mb-6 text-center lg:text-left">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Los círculos de la humanidad</h1>
        <p className="mt-1 text-lg text-slate-500">De cada persona, en el centro, al planeta. <b className="font-semibold text-slate-700">Elige un círculo para ver sus sistemas.</b></p>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-12">
        <div className="mx-auto w-full max-w-[460px] lg:sticky lg:top-24">
          <Circulos circulos={circulos} elegido={elegido} elegir={elegir} />
          <p className="mt-3 text-center text-sm text-slate-500">Nota media de cada círculo en {territorio}, del 1 al 10.</p>
        </div>
        <section aria-live="polite" data-circulo-elegido-c2={c.clave}>
          <div className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Círculo {elegido + 1} de {circulos.length}</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-black tracking-tight text-slate-900">{c.nombre}</h2>
            <Nota nota={c.nota} grande />
          </div>
          <p className="mt-2 text-lg text-slate-600">{DESCRIPCION[c.clave] || ''} Tiene {c.sistemas.length} sistemas:</p>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {c.sistemas.map(s => (
              <li key={s.id}>
                <Link to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)} data-sistema-c2
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
                  <span className="relative block aspect-[16/9] w-full bg-slate-50">
                    {s.imagen && <img src={miniatura(s.imagen, 420)} alt="" className="absolute inset-0 h-full w-full object-contain p-3" />}
                  </span>
                  <span className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-lg font-extrabold text-slate-900">{s.titulo}</span>
                    <span className="flex items-center gap-2"><Nota nota={s.nota} /><ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
