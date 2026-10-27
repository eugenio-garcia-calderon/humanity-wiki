import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { colorDeNota, textoSobre } from '../../utils/nota';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';
import { useSitio } from './ContextoSitio';
import { raizDe } from './CabeceraSitio';

// ============================================================================
// LA VISTA DE CÍRCULOS DEL SITIO (2026-10-27, Eugenio)
// ============================================================================
// «Organízalo por círculos concéntricos: Personas, Hogar, Sociedad, Tecnología y
// Planeta… mételo como una tercera vista, junto a la vista de mapa y tabla.»
// Los sistemas son los de la base de datos del sitio (`sitio.sistemas`) y cada uno
// dice en qué círculo va con su columna de selección «Círculo»: el orden de sus
// opciones es el de los anillos, del centro hacia fuera. Pinchar un círculo abre
// su página intermedia (`?vista=circulos&circulo=sociedad`) con sus sistemas; pinchar
// un sistema abre la página del sistema.

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ICONOS: Record<string, string> = { personas: '🧍', hogar: '🏠', sociedad: '🏛', tecnologia: '⚙️', planeta: '🌍' };
// Un tono claro por anillo, del cálido del centro al verde del planeta.
const TONOS = ['#fff4cc', '#fde7d3', '#ede7fb', '#e0ecfc', '#dff3e7', '#f1f5f9', '#fce7f3'];

type Sistema = { id: string; titulo: string; imagen: string | null; descripcion: string; nota: number | null };
type Circulo = { clave: string; nombre: string; icono: string; tono: string; sistemas: Sistema[]; nota: number | null };

const media = (s: Sistema[]) => {
  const v = s.map(x => x.nota).filter((n): n is number => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const coma = (n: number) => n.toFixed(1).replace('.', ',');
const PROBADOS: Record<string, number[]> = { '1-3': [90, 180, 270], '2-4': [55, 125, 235, 305], '3-4': [90, 150, 210, 270], '4-3': [50, 180, 310] };
let lienzo: CanvasRenderingContext2D | null = null;
/** El ancho de un texto en el SVG, para que las pastillas abracen su nombre. */
function medir(t: string, fuente: string) {
  lienzo ||= typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (!lienzo) return t.length * 8.5;
  lienzo.font = fuente;
  return lienzo.measureText(t).width;
}

function useCirculos(raizId: string) {
  const [circulos, setCirculos] = useState<Circulo[] | null>(null);
  useEffect(() => {
    let vivo = true;
    raizDe(raizId).then(async r => {
      const tabla = r?.config?.sitio?.sistemas;
      if (!tabla) { if (vivo) setCirculos([]); return; }
      const j = await fetch(`/api/bd/tablas/${encodeURIComponent(tabla)}?lectura=1`, { credentials: 'include' }).then(x => (x.ok ? x.json() : null)).catch(() => null);
      const cols: any[] = j?.columnas || [];
      const colCirculo = cols.find(c => c.tipo === 'seleccion' && /^c[ií]rculos?$/i.test(String(c.nombre).trim()));
      const colNota = cols.find(c => c.tipo === 'nota');
      if (!colCirculo) { if (vivo) setCirculos([]); return; }
      const lista: Circulo[] = (colCirculo.opciones || []).map((o: any, i: number) => {
        const clave = plano(String(o.label || ''));
        return { clave, nombre: String(o.label || ''), icono: ICONOS[clave] || '◯', tono: TONOS[i % TONOS.length], sistemas: [], nota: null, _id: o.id } as Circulo & { _id: string };
      });
      for (const f of j?.filas || []) {
        if (f.oculta || !f.pagina_id) continue;
        const v = f.celdas?.[colCirculo.id]?.valor;
        const c = lista.find(x => (x as any)._id === v);
        if (!c) continue;
        const n = colNota ? f.celdas?.[colNota.id]?.valor : null;
        c.sistemas.push({ id: f.pagina_id, titulo: f.pagina?.titulo || 'Sin título', imagen: f.pagina?.imagen || null, descripcion: f.pagina?.descripcion || '', nota: typeof n === 'number' ? n : null });
      }
      for (const c of lista) c.nota = media(c.sistemas);
      if (vivo) setCirculos(lista.filter(c => c.sistemas.length));
    });
    return () => { vivo = false; };
  }, [raizId]);
  return circulos;
}

function Nota({ nota, grande = false }: { nota: number | null; grande?: boolean }) {
  if (nota == null) return null;
  const color = colorDeNota(nota);
  return (
    <span className={cn('inline-flex shrink-0 items-baseline rounded-full font-black', grande ? 'px-3 py-0.5 text-base' : 'px-1.5 text-xs')}
      style={{ background: color, color: textoSobre(color) }}>
      {Number.isInteger(nota) ? nota : coma(nota)}{grande && <small className="ml-0.5 text-[0.65em] opacity-80">/10</small>}
    </span>
  );
}

/** El esquema: un círculo dentro de otro, con los sistemas de cada anillo en pastillas. */
function Esquema({ circulos, activo, setActivo, enlace, irCirculo }: {
  circulos: Circulo[]; activo: number | null; setActivo: (i: number | null) => void;
  enlace: (id: string) => string; irCirculo: (c: Circulo) => void;
}) {
  const ir = useNavigate();
  const N = circulos.length, C = 550, R0 = 150, paso = (530 - R0) / Math.max(1, N - 1);
  const R = circulos.map((_, i) => R0 + paso * i);
  // Ángulos (grados desde arriba) escalonados entre anillos para que las pastillas vecinas no se pisen:
  // los probados para el reparto de hoy y, si cambia, repartidos dejando libre el nombre de arriba.
  const angulos = (i: number, n: number) => PROBADOS[`${i}-${n}`] || Array.from({ length: n }, (_, k) => (k + 1) * 360 / (n + 1) + (i % 2 ? 0 : 180 / (n + 1) / 2));
  const ancho = (t: string) => medir(t, '600 15px system-ui,-apple-system,sans-serif') + 48;
  return (
    <svg viewBox="0 0 1100 1100" className="mx-auto block h-auto w-full max-w-[820px]" role="img" aria-label={`Círculos: ${circulos.map(c => c.nombre).join(', ')}`} data-esquema-circulos>
      {[...circulos.keys()].reverse().map(i => {
        const c = circulos[i];
        const ri = i ? R[i - 1] : 0, m = i ? (ri + R[i]) / 2 : 0;
        const titulo = `${c.icono} ${c.nombre}`;
        const wt = medir(titulo, '800 21px system-ui,-apple-system,sans-serif'), total = wt + 62;
        const ty = i ? C - m : C - 64;
        const pastilla = (s: Sistema, x: number, y: number) => {
          const w = ancho(s.titulo);
          const col = s.nota != null ? colorDeNota(s.nota) : '#cbd5e1';
          return (
            <a key={s.id} href={enlace(s.id)} onClick={e => { e.preventDefault(); e.stopPropagation(); ir(enlace(s.id)); window.scrollTo(0, 0); }} className="[&:hover>rect]:stroke-slate-500">
              <title>{s.titulo}</title>
              <rect x={x - w / 2} y={y - 16} width={w} height={32} rx={16} fill="#fff" stroke="#e2e8f0" strokeWidth={1.5} />
              <text x={x - w / 2 + 13} y={y + 5.5} fontSize={15} fontWeight={600} fill="#0f172a">{s.titulo}</text>
              {s.nota != null && <>
                <circle cx={x + w / 2 - 16} cy={y} r={11} fill={col} />
                <text x={x + w / 2 - 16} y={y + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={800} fill={textoSobre(col)}>{s.nota}</text>
              </>}
            </a>
          );
        };
        return (
          <g key={c.clave} className="cursor-pointer transition-opacity" style={{ opacity: activo != null && activo !== i ? 0.3 : 1 }}
            onClick={() => irCirculo(c)} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)} data-circulo={c.clave}>
            <circle cx={C} cy={C} r={R[i]} fill={c.tono} stroke="#e2e8f0" strokeWidth={2} />
            <text x={C - total / 2} y={ty + 7} fontSize={21} fontWeight={800} fill="#0f172a">{titulo}</text>
            {c.nota != null && <>
              <rect x={C - total / 2 + wt + 10} y={ty - 14} width={52} height={28} rx={14} fill={colorDeNota(c.nota)} />
              <text x={C - total / 2 + wt + 36} y={ty + 5.5} textAnchor="middle" fontSize={15} fontWeight={800} fill={textoSobre(colorDeNota(c.nota))}>{coma(c.nota)}</text>
            </>}
            {i === 0
              ? c.sistemas.map((s, k) => pastilla(s, C + (k % 2 ? 70 : -70), C - 6 + Math.floor(k / 2) * 48))
              : angulos(i, c.sistemas.length).map((a, k) => {
                  const rad = a * Math.PI / 180;
                  return pastilla(c.sistemas[k], C + m * Math.sin(rad), C - m * Math.cos(rad));
                })}
          </g>
        );
      })}
    </svg>
  );
}

/** La página intermedia de un círculo: sus sistemas en tarjetas, cada uno con su portada y su nota. */
function PaginaCirculo({ c, enlace, volver }: { c: Circulo; enlace: (id: string) => string; volver: () => void }) {
  return (
    <section data-pagina-circulo={c.clave} className="mx-auto max-w-6xl">
      <button type="button" onClick={volver} className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Todos los círculos
      </button>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4" style={{ background: c.tono }}>
        <span className="text-4xl leading-none" aria-hidden>{c.icono}</span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{c.nombre}</h1>
        <Nota nota={c.nota} grande />
        <span className="text-sm font-semibold text-slate-600">{c.sistemas.length} sistemas</span>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {c.sistemas.map(s => (
          <li key={s.id}>
            <Link to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)} data-sistema-circulo
              className="flex h-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="text-lg font-bold text-slate-900">{s.titulo}</span>
              <Nota nota={s.nota} grande />
              {s.imagen && <span className="relative block aspect-[16/10] w-full"><img src={miniatura(s.imagen, 480)} alt="" className="absolute inset-0 h-full w-full object-contain" /></span>}
              {s.descripcion && <span className="text-sm text-slate-600">{s.descripcion}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function VistaCirculosSitio({ raizId }: { raizId: string }) {
  const circulos = useCirculos(raizId);
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const [activo, setActivo] = useState<number | null>(null);
  const clave = new URLSearchParams(search).get('circulo');
  const conCirculo = (c: string | null) => {
    const q = new URLSearchParams(search);
    if (c) q.set('circulo', c); else q.delete('circulo');
    ir(`${pathname}?${q.toString()}${hash}`);
    window.scrollTo(0, 0);
  };
  const abierto = useMemo(() => circulos?.find(c => c.clave === clave) || null, [circulos, clave]);

  if (!circulos) return <div className="py-24 text-center text-slate-400" data-vista-circulos>Cargando los círculos…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500" data-vista-circulos>Los sistemas aún no tienen círculo: añade a su base de datos una columna de selección «Círculo».</div>;
  if (abierto) return <div data-vista-circulos className="pt-2"><PaginaCirculo c={abierto} enlace={enlace} volver={() => conCirculo(null)} /></div>;

  return (
    <div data-vista-circulos className="mx-auto grid max-w-[1240px] items-start gap-7 pt-2 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Esquema circulos={circulos} activo={activo} setActivo={setActivo} enlace={enlace} irCirculo={c => conCirculo(c.clave)} />
      <ol className="grid gap-3">
        {circulos.map((c, i) => (
          <li key={c.clave} onMouseEnter={() => setActivo(i)} onMouseLeave={() => setActivo(null)}
            className={cn('rounded-2xl border border-slate-200 border-l-8 px-4 py-3.5 transition-transform', activo === i && 'translate-x-1')}
            style={{ borderLeftColor: c.tono, background: `color-mix(in srgb, ${c.tono} 40%, white)` }}>
            <button type="button" onClick={() => conCirculo(c.clave)} className="flex w-full items-center gap-2.5 text-left" data-tarjeta-circulo={c.clave}>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="whitespace-nowrap text-lg font-black text-slate-900">{c.icono} {c.nombre}</span>
                <span className="text-xs font-semibold text-slate-500">{i + 1}º círculo · {c.sistemas.length} sistemas</span>
              </span>
              <span className="ml-auto"><Nota nota={c.nota} grande /></span>
            </button>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {c.sistemas.map(s => (
                <Link key={s.id} to={enlace(s.id)} onClick={() => window.scrollTo(0, 0)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-sm text-slate-800 hover:border-slate-400">
                  {s.titulo}<Nota nota={s.nota} />
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
