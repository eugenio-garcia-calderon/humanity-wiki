import { useLocation, useNavigate } from 'react-router-dom';
import { useCirculosTerritorio } from './PanelCirculo';
import { dibujoPata } from './VistaCirculo2Sitio';
import type { Circulo } from './circulosDatos';

// ============================================================================
// LA VISTA «PIRÁMIDE» (2026-10-28, Eugenio)
// ============================================================================
// «Una nueva vista de las principales categorías con la pirámide de Maslow como inspiración: fuera el nombre y lo que
// contiene.» Y enseguida: «que tenga dimensiones de 3D, con dos caras y con colores; en una cara el nombre y en la otra
// las ilustraciones que ya tenemos» (con un dibujo de la pirámide en perspectiva como modelo).
// Una pirámide vista desde una esquina: la cara izquierda, más clara, con el dibujo de cada sector; la derecha, con su
// nombre escrito sobre la cara; y fuera, a la derecha de cada piso, sus categorías. De abajo arriba, en el orden del
// arco: Ser humano, Sociedad, Economía, Tecnología y Naturaleza. Pinchar un piso abre ese sector en la vista Círculo;
// pinchar una categoría, la categoría. En el móvil, los pisos en una columna (a ese tamaño el dibujo no se leería).

const PATAS = /^(patas?|sector(es)?)$/i;
/** Los colores de los pisos, del 1 (abajo) al 5. */
const COLORES = ['#F2A93B', '#4BA3E3', '#8FCF45', '#D64BAF', '#FFC83D'];
/** Hasta dónde llega cada piso, de la cúspide (0) a la base (1): el de arriba, más alto, como en las pirámides de Maslow. */
const CORTES = [0, 0.3, 0.475, 0.65, 0.825, 1];

type P = [number, number];
const CUSPIDE: P = [620, 70], IZQ: P = [150, 740], FRENTE: P = [650, 950], DER: P = [1130, 690];
/** El punto a la altura `t` de la arista que baja de la cúspide a `p`. */
const en = (p: P, t: number): P => [CUSPIDE[0] + (p[0] - CUSPIDE[0]) * t, CUSPIDE[1] + (p[1] - CUSPIDE[1]) * t];
const pts = (...ps: P[]) => ps.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
const unidad = (a: P, b: P): P => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
/** Un color mezclado con blanco (`f` de 0 a 1). */
const claro = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * f));
  return `rgb(${c.join(',')})`;
};
const LETRA = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

/** Las categorías en frase («salud, alimentación… y conciencia»), partidas en renglones de unos `ancho` caracteres. */
function renglones(c: Circulo, ancho = 40) {
  const piezas = c.sistemas.map((s, i, xs) => ({ s, texto: i === 0 ? s.titulo : s.titulo.toLowerCase(), tras: i === xs.length - 1 ? '' : i === xs.length - 2 ? ' y ' : ', ' }));
  const lineas: typeof piezas[] = [[]];
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
  const abrir = (c: Circulo, sector?: string) => {
    const q = new URLSearchParams({ vista: 'circulos', circulo: c.clave });
    if (sector) q.set('sector', sector);
    ir(`${pathname}?${q.toString()}`);
    window.scrollTo(0, 0);
  };
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  const pisos = circulos.slice(0, 5);
  if (!pisos.length) return <div className="py-24 text-center text-slate-500">Las categorías aún no tienen sector.</div>;
  // Los ejes de la cara derecha, para escribir el nombre tumbado sobre ella: a lo largo de la base y bajando por la arista.
  const [ux, uy] = unidad(FRENTE, DER), [vx, vy] = unidad(CUSPIDE, FRENTE);
  return (
    <div data-vista-piramide className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-2 sm:px-6">
      {/* EL DIBUJO, desde 768 px. */}
      <svg viewBox="0 0 1640 1000" className="hidden h-auto w-full md:block" role="group" aria-label="Pirámide de la Humanidad">
        <defs>
          {pisos.map((c, i) => (
            <linearGradient key={c.clave} id={`pir-der-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={claro(COLORES[i], 0.35)} /><stop offset="0.35" stopColor={COLORES[i]} /><stop offset="1" stopColor={COLORES[i]} />
            </linearGradient>
          ))}
        </defs>
        <style>{`.piso{cursor:pointer;transition:filter .15s}.piso:hover{filter:brightness(1.07) saturate(1.1)}.cat{cursor:pointer}.cat:hover{text-decoration:underline}`}</style>
        {pisos.map((c, i) => {
          // Del piso 1 (abajo) al 5 (la cúspide): `t0` arriba del piso, `t1` abajo.
          const t0 = CORTES[4 - i], t1 = CORTES[5 - i], tm = (t0 + t1) / 2;
          const izq = [en(IZQ, t0), en(FRENTE, t0), en(FRENTE, t1), en(IZQ, t1)] as P[];
          const der = [en(FRENTE, t0), en(DER, t0), en(DER, t1), en(FRENTE, t1)] as P[];
          const alto = (t1 - t0) * (FRENTE[1] - CUSPIDE[1]);
          // El dibujo, derecho, en el centro de la cara izquierda del piso (en la cúspide, abajo, donde hay sitio).
          const ci = i === 4 ? en([(IZQ[0] + FRENTE[0]) / 2, (IZQ[1] + FRENTE[1]) / 2], t0 + (t1 - t0) * 0.62)
            : en([(IZQ[0] + FRENTE[0]) / 2, (IZQ[1] + FRENTE[1]) / 2], tm);
          const hDib = Math.min(alto * (i === 4 ? 0.5 : 0.82), 150), wDib = hDib * 1.6;
          // El nombre, en el centro de la cara derecha del piso, del tamaño que quepa a esa altura (se estrecha hacia
          // arriba; unos 0,8 em por letra en mayúsculas gruesas). En la cúspide no cabe legible: sale desde la arista
          // del frente y se escapa por la derecha de la cara, como en el dibujo que sirvió de modelo.
          const tc = i === 4 ? t0 + (t1 - t0) * 0.82 : tm;
          const anchoCara = Math.hypot(en(DER, tc)[0] - en(FRENTE, tc)[0], en(DER, tc)[1] - en(FRENTE, tc)[1]);
          const cabe = Math.min(alto * 0.34, 46, (anchoCara * 0.82) / (c.nombre.length * 0.8));
          const escapa = i === 4 || cabe < 26;
          const letra = i === 4 ? Math.min(30, alto * 0.2) : Math.max(cabe, 26);
          const cd = escapa ? (() => { const f = en(FRENTE, tc); return [f[0] + ux * 14, f[1] + uy * 14] as P; })()
            : en([(FRENTE[0] + DER[0]) / 2, (FRENTE[1] + DER[1]) / 2], tc);
          // Lo que contiene, en una columna fija a la derecha, a la altura del piso, con una raya desde la arista.
          const borde = en(DER, tm), COLUMNA = 1170;
          const dibujo = dibujoPata(c.clave);
          return (
            <g key={c.clave} data-piso={c.nombre}>
              <g className="piso" onClick={() => abrir(c)} role="button" aria-label={`Abrir ${c.nombre}`}>
                <polygon points={pts(...izq)} fill={claro(COLORES[i], 0.45)} stroke="#1a1a1a" strokeWidth={2.5} strokeLinejoin="round" />
                <polygon points={pts(...der)} fill={`url(#pir-der-${i})`} stroke="#1a1a1a" strokeWidth={2.5} strokeLinejoin="round" />
                {dibujo && <image href={dibujo} x={ci[0] - wDib / 2} y={ci[1] - hDib / 2} width={wDib} height={hDib} preserveAspectRatio="xMidYMid meet" />}
                <text transform={`matrix(${ux} ${uy} ${vx * 0.35} ${vy} ${cd[0]} ${cd[1]})`} textAnchor={escapa ? 'start' : 'middle'} dominantBaseline="central"
                  style={{ font: `900 ${letra}px ${LETRA}`, fill: '#1a1a1a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.nombre}</text>
              </g>
              {/* Fuera, lo que contiene: una raya de su color desde la arista y sus categorías. */}
              <line x1={Math.max(borde[0] + 10, 870)} y1={borde[1]} x2={COLUMNA - 12} y2={borde[1]} stroke={COLORES[i]} strokeWidth={3} strokeLinecap="round" />
              <text x={COLUMNA} y={borde[1] - (renglones(c).length - 1) * 13} dominantBaseline="central"
                style={{ font: `500 22px 'Helvetica Neue', Arial, sans-serif`, fill: '#334155' }}>
                {renglones(c).map((linea, k) => (
                  <tspan key={k} x={COLUMNA} dy={k === 0 ? 0 : 27}>
                    {linea.map(n => (
                      <tspan key={n.s.id}><tspan className="cat" onClick={() => abrir(c, n.s.id)} data-categoria-piramide={n.s.titulo}>{n.texto}</tspan>{n.tras}</tspan>
                    ))}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        {/* Las aristas de fuera, más gruesas, como un dibujo a tinta. */}
        <polyline points={pts(IZQ, CUSPIDE, DER)} fill="none" stroke="#1a1a1a" strokeWidth={5} strokeLinejoin="round" />
        <polyline points={pts(IZQ, FRENTE, DER)} fill="none" stroke="#1a1a1a" strokeWidth={5} strokeLinejoin="round" />
        <line x1={CUSPIDE[0]} y1={CUSPIDE[1]} x2={FRENTE[0]} y2={FRENTE[1]} stroke="#1a1a1a" strokeWidth={4} />
      </svg>
      {/* EN EL MÓVIL: cada piso, de arriba abajo, con su dibujo, su nombre y lo que contiene. */}
      <ol className="space-y-3 md:hidden" aria-label="Pirámide de la Humanidad">
        {[...pisos].reverse().map(c => {
          const i = pisos.indexOf(c), dibujo = dibujoPata(c.clave);
          return (
            <li key={c.clave} className="flex items-stretch overflow-hidden rounded-2xl border-2 border-slate-900" data-piso={c.nombre}>
              <button type="button" onClick={() => abrir(c)} aria-label={`Abrir ${c.nombre}`} className="grid w-28 shrink-0 place-items-center p-1.5" style={{ background: claro(COLORES[i], 0.45) }}>
                {dibujo && <img src={dibujo} alt="" className="h-16 w-full object-contain" />}
              </button>
              <div className="min-w-0 flex-1 px-3 py-2" style={{ background: COLORES[i] }}>
                <button type="button" onClick={() => abrir(c)} className="block text-left text-base font-black uppercase tracking-wide text-slate-900">{c.nombre}</button>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-900/80">
                  {c.sistemas.map((s, k) => (
                    <span key={s.id}><button type="button" onClick={() => abrir(c, s.id)} className="hover:underline">{k === 0 ? s.titulo : s.titulo.toLowerCase()}</button>{k === c.sistemas.length - 1 ? '' : k === c.sistemas.length - 2 ? ' y ' : ', '}</span>
                  ))}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
