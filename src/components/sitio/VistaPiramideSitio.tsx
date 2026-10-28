import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useCirculosTerritorio } from './PanelCirculo';
import type { Circulo, Sistema } from './circulosDatos';

// ============================================================================
// LA VISTA «PIRÁMIDE» (2026-10-28, Eugenio)
// ============================================================================
// Nació como una pirámide de Maslow con los cinco sectores, pasó a 3D con dos caras y dibujos, y se quedó con los seis
// niveles de necesidades que escribió Eugenio («no lo hagas con las categorías anteriores, sino con esta estructura»).
// Última vuelta, con la infografía de 20minutos como modelo: «más elegante, con menos colores: un solo azul en
// degradado; el borde de la pirámide, pequeño como en la imagen; quita las ilustraciones, pon los títulos en grande, y
// que el contenido aparezca solo al pasar el ratón por una sección».
// La pirámide de frente con su cara izquierda en sombra, pisos separados por una raya fina, el número en un círculo
// blanco y, desde cada piso, una cinta clara hacia la derecha con el título en grande. Al pasar el ratón (o pinchar)
// un piso, en su cinta aparecen la necesidad y las temáticas; las que son una de nuestras categorías la abren en la
// vista Círculo. En el móvil, los pisos en una columna que se despliegan al tocarlos.

const PATAS = /^(patas?|sector(es)?)$/i;

/** Los seis niveles, de abajo arriba, tal como los escribió Eugenio. */
const NIVELES: Array<{ nombre: string; necesidad: string; tematicas: string[] }> = [
  { nombre: 'Supervivencia', necesidad: 'Mantener la vida',
    tematicas: ['Alimentación', 'agua potable', 'aire', 'energía esencial', 'agricultura', 'nutrición', 'salud básica'] },
  { nombre: 'Seguridad', necesidad: 'Vivir con estabilidad y protección',
    tematicas: ['Vivienda', 'saneamiento', 'hospitales', 'seguridad alimentaria', 'infraestructuras', 'prevención de riesgos', 'protección civil'] },
  { nombre: 'Comunidad', necesidad: 'Pertenecer y convivir',
    tematicas: ['Familia', 'educación básica', 'cultura', 'comunicación', 'relaciones humanas', 'participación', 'cohesión social'] },
  { nombre: 'Autonomía', necesidad: 'Poder decidir y desarrollar una vida digna',
    tematicas: ['Derechos', 'justicia', 'empleo', 'economía', 'movilidad', 'privacidad', 'igualdad de oportunidades', 'gobernanza'] },
  { nombre: 'Conocimiento', necesidad: 'Comprender y ampliar las capacidades humanas',
    tematicas: ['Ciencia', 'matemáticas', 'investigación', 'tecnología', 'educación avanzada', 'pensamiento crítico', 'innovación'] },
  { nombre: 'Trascendencia', necesidad: 'Dar sentido y contribuir a algo mayor',
    tematicas: ['Ética', 'filosofía', 'propósito', 'creatividad', 'exploración del cosmos', 'cooperación global', 'legado para futuras generaciones'] },
];
/** Un solo azul: del más hondo (abajo) al casi blanco (la cúspide). */
const AZUL_ABAJO = [37, 84, 145], AZUL_ARRIBA = [222, 233, 245];
const azul = (i: number, n: number, sombra = 0) => {
  const f = n > 1 ? i / (n - 1) : 0;
  const c = AZUL_ABAJO.map((v, k) => Math.round((v + (AZUL_ARRIBA[k] - v) * f) * (1 - sombra)));
  return `rgb(${c.join(',')})`;
};
/** Hasta dónde llega cada piso, de la cúspide (0) a la base (1): el de arriba, más alto. */
const CORTES = [0, 0.24, 0.395, 0.545, 0.695, 0.848, 1];
/** La raya blanca entre pisos (en `t`, la altura relativa). */
const HUECO = 0.011;

type P = [number, number];
// La pirámide de frente, con la cara izquierda en escorzo (como en la infografía).
const CUSPIDE: P = [560, 40], FRENTE_IZQ: P = [250, 960], FRENTE_DER: P = [1050, 960], FONDO_IZQ: P = [40, 880];
const en = (p: P, t: number): P => [CUSPIDE[0] + (p[0] - CUSPIDE[0]) * t, CUSPIDE[1] + (p[1] - CUSPIDE[1]) * t];
const pts = (...ps: P[]) => ps.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const LETRA_TITULO = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";
const LETRA = "'Helvetica Neue', Arial, sans-serif";
/** Donde empieza el contenido que aparece al pasar el ratón, igual para todos los pisos; y el final de las cintas. */
const COLUMNA = 1410, FIN = 1900;

type Enlace = { c: Circulo; s: Sistema };
type Pieza = { texto: string; tras: string; enlace: Enlace | null };

/** Las temáticas en frase, partidas en renglones de unos `ancho` caracteres; las que empiezan por el nombre de una de
 *  nuestras categorías llevan su enlace. */
function renglones(tematicas: string[], buscar: (t: string) => Enlace | null, ancho = 40) {
  const piezas: Pieza[] = tematicas.map((t, i, xs) => ({ texto: t, tras: i === xs.length - 1 ? '.' : i === xs.length - 2 ? ' y ' : ', ', enlace: buscar(t) }));
  const lineas: Pieza[][] = [[]];
  let largo = 0;
  for (const p of piezas) {
    const n = p.texto.length + p.tras.length;
    if (largo + n > ancho && lineas[lineas.length - 1].length) { lineas.push([]); largo = 0; }
    lineas[lineas.length - 1].push(p); largo += n;
  }
  return lineas;
}

export default function VistaPiramideSitio({ raizId }: { raizId: string }) {
  const { circulos } = useCirculosTerritorio(raizId, PATAS);
  const { pathname } = useLocation();
  const ir = useNavigate();
  const [encima, setEncima] = useState<number | null>(null);
  const [fijo, setFijo] = useState<number | null>(null);
  const abierto = encima ?? fijo;
  // Nuestras categorías por su nombre, para enlazar las temáticas.
  const categorias = useMemo(() => (circulos || []).flatMap(c => c.sistemas.map(s => ({ c, s, clave: plano(s.titulo) }))), [circulos]);
  const buscar = (t: string): Enlace | null => {
    const x = plano(t);
    const e = categorias.find(k => x === k.clave || x.startsWith(`${k.clave} `));
    return e ? { c: e.c, s: e.s } : null;
  };
  const abrir = (e: Enlace | null) => {
    if (!e) return;
    ir(`${pathname}?${new URLSearchParams({ vista: 'circulos', circulo: e.c.clave, sector: e.s.id }).toString()}`);
    window.scrollTo(0, 0);
  };
  const N = NIVELES.length;
  const temas = (t: string[]) => t.map((x, k) => {
    const e = buscar(x);
    return (
      <span key={x}>{e ? <button type="button" onClick={ev => { ev.stopPropagation(); abrir(e); }} className="font-bold text-slate-900 underline-offset-2 hover:underline">{x}</button> : x}
        {k === t.length - 1 ? '.' : k === t.length - 2 ? ' y ' : ', '}</span>
    );
  });
  return (
    <div data-vista-piramide className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-2 sm:px-6">
      {/* EL DIBUJO, desde 768 px. */}
      <svg viewBox="0 0 1920 1000" className="hidden h-auto w-full md:block" role="group" aria-label="Pirámide de las necesidades"
        onMouseLeave={() => setEncima(null)}>
        <defs>
          <linearGradient id="pir-cinta" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e9eff7" /><stop offset="0.75" stopColor="#f3f6fb" /><stop offset="1" stopColor="#f3f6fb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pir-cinta-on" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#dbe6f3" /><stop offset="0.8" stopColor="#eaf0f8" /><stop offset="1" stopColor="#eaf0f8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <style>{`.pir-piso{cursor:pointer}.pir-piso .pir-cara{transition:opacity .2s}.pir-cont{transition:opacity .2s}.cat{cursor:pointer}.cat:hover{text-decoration:underline}`}</style>
        {NIVELES.map((n, i) => {
          // Del piso 1 (abajo) al 6 (la cúspide): `t0` arriba del piso, `t1` abajo; con la raya fina entre pisos.
          const t0 = CORTES[N - 1 - i] + (i === N - 1 ? 0 : HUECO / 2), t1 = CORTES[N - i] - (i === 0 ? 0 : HUECO / 2);
          const cima = i === N - 1, on = abierto === i, apagado = abierto !== null && !on;
          const frente = [en(FRENTE_IZQ, t0), en(FRENTE_DER, t0), en(FRENTE_DER, t1), en(FRENTE_IZQ, t1)] as P[];
          const lado = [en(FONDO_IZQ, t0), en(FRENTE_IZQ, t0), en(FRENTE_IZQ, t1), en(FONDO_IZQ, t1)] as P[];
          // La cinta: desde la arista derecha hacia la derecha; en la cúspide, solo la parte de abajo (arriba es una punta).
          const tc0 = cima ? t0 + (t1 - t0) * 0.42 : t0 + (t1 - t0) * 0.06;
          const a = en(FRENTE_DER, tc0), b = en(FRENTE_DER, t1);
          const cinta: P[] = [[a[0] + 6, a[1]], [FIN, a[1]], [FIN, b[1]], [b[0] + 6, b[1]]];
          const yc = (a[1] + b[1]) / 2, alto = b[1] - a[1];
          const tm = cima ? t0 + (t1 - t0) * 0.66 : (t0 + t1) / 2;
          const num = [(en(FRENTE_IZQ, tm)[0] + en(FRENTE_DER, tm)[0]) / 2, en(FRENTE_IZQ, tm)[1]] as P;
          const lineas = renglones(n.tematicas, buscar);
          const altoTexto = 32 + lineas.length * 28;
          return (
            <g key={n.nombre} className="pir-piso" data-piso={n.nombre} onMouseEnter={() => setEncima(i)} onClick={() => setFijo(f => (f === i ? null : i))}
              role="button" tabIndex={0} aria-expanded={on} aria-label={`${n.nombre}: ${n.necesidad}`}
              onFocus={() => setEncima(i)} onBlur={() => setEncima(null)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFijo(f => (f === i ? null : i)); } }}>
              <g className="pir-cara" opacity={apagado ? 0.55 : 1}>
                <polygon points={pts(...lado)} fill={azul(i, N, 0.22)} />
                <polygon points={pts(...frente)} fill={azul(i, N)} />
                <circle cx={num[0]} cy={num[1]} r={Math.min(40, (t1 - t0) * 920 * 0.3)} fill="#fff" />
                <text x={num[0]} y={num[1] + 2} textAnchor="middle" dominantBaseline="central" style={{ font: `700 ${Math.min(46, (t1 - t0) * 920 * 0.34)}px ${LETRA_TITULO}`, fill: azul(Math.min(i, 2), N) }}>{i + 1}</text>
              </g>
              <polygon points={pts(...cinta)} fill={on ? 'url(#pir-cinta-on)' : 'url(#pir-cinta)'} />
              <text x={a[0] + 44} y={yc + 1} dominantBaseline="central"
                style={{ font: `700 ${Math.min(52, alto * 0.42)}px ${LETRA_TITULO}`, fill: apagado ? '#94a3b8' : '#0f172a', letterSpacing: '0.02em', textTransform: 'uppercase', transition: 'fill .2s' }}>{n.nombre}</text>
              {/* Lo que contiene: solo al pasar el ratón (o con el piso pinchado). */}
              <g className="pir-cont" opacity={on ? 1 : 0} pointerEvents={on ? 'auto' : 'none'} transform={`translate(${COLUMNA} ${yc - altoTexto / 2 + 12})`} data-contenido-piso={on || undefined}>
                <text x={0} y={0} dominantBaseline="central" style={{ font: `700 25px ${LETRA}`, fill: '#1e3a5f' }}>{n.necesidad}</text>
                <text x={0} y={32} dominantBaseline="central" style={{ font: `400 22px ${LETRA}`, fill: '#475569' }}>
                  {lineas.map((linea, k) => (
                    <tspan key={k} x={0} dy={k === 0 ? 0 : 28}>
                      {linea.map((p, j) => (
                        <tspan key={j}>{p.enlace
                          ? <tspan className="cat" fill="#0f172a" fontWeight={700} onClick={ev => { ev.stopPropagation(); abrir(p.enlace); }} data-categoria-piramide={p.enlace.s.titulo}>{p.texto}</tspan>
                          : p.texto}{p.tras}</tspan>
                      ))}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      {/* EN EL MÓVIL: los pisos de arriba abajo, del azul claro al hondo; al tocar uno, se despliega lo que contiene. */}
      <ol className="space-y-1.5 md:hidden" aria-label="Pirámide de las necesidades">
        {[...NIVELES].reverse().map(n => {
          const i = NIVELES.indexOf(n), on = fijo === i, claro = i >= 3;
          return (
            <li key={n.nombre} data-piso={n.nombre} className="overflow-hidden rounded-xl">
              <button type="button" onClick={() => setFijo(on ? null : i)} aria-expanded={on}
                className="flex w-full items-center gap-3 px-3 py-3 text-left" style={{ background: azul(i, N) }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-base font-bold" style={{ color: azul(Math.min(i, 2), N) }}>{i + 1}</span>
                <span className={`flex-1 text-lg font-bold uppercase tracking-wide ${claro ? 'text-slate-900' : 'text-white'}`}>{n.nombre}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${on ? 'rotate-180' : ''} ${claro ? 'text-slate-600' : 'text-white/80'}`} />
              </button>
              {on && (
                <div className="bg-slate-50 px-4 py-3 text-sm leading-snug text-slate-600" data-contenido-piso>
                  <p className="font-bold text-slate-900">{n.necesidad}</p>
                  <p className="mt-1">{temas(n.tematicas)}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
