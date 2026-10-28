import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCirculosTerritorio } from './PanelCirculo';
import type { Circulo, Sistema } from './circulosDatos';
import { miniatura } from '../../utils/miniatura';

// ============================================================================
// LA VISTA «PIRÁMIDE» (2026-10-28, Eugenio)
// ============================================================================
// «Una nueva vista con la pirámide de Maslow como inspiración: fuera el nombre y lo que contiene.» Después: «que tenga
// dimensiones de 3D, con dos caras y con colores; en una cara el nombre y en la otra las ilustraciones que ya tenemos»
// (con un dibujo de la pirámide en perspectiva como modelo). Y por último: «no lo hagas con las categorías anteriores,
// sino con esta estructura»: seis niveles de necesidades, de la supervivencia a la trascendencia (`NIVELES`).
// Una pirámide vista desde una esquina: la cara izquierda, más clara, con un dibujo de las categorías que ya tenemos;
// la derecha, con el nombre del nivel escrito sobre la cara; y fuera, a la derecha de cada piso, la necesidad y sus
// temáticas. Las temáticas que son una de nuestras categorías se pueden pinchar y la abren en la vista Círculo.
// En el móvil, los pisos en una columna (a ese tamaño el dibujo no se leería).

const PATAS = /^(patas?|sector(es)?)$/i;

/** Los seis niveles, de abajo arriba, tal como los escribió Eugenio. `dibujo`: las categorías cuyo dibujo puede ir en la
 *  cara del piso, por orden de preferencia (la primera que exista). */
const NIVELES: Array<{ nombre: string; necesidad: string; tematicas: string[]; dibujo: string[] }> = [
  { nombre: 'Supervivencia', necesidad: 'Mantener la vida', dibujo: ['Alimentación', 'Agua', 'Salud'],
    tematicas: ['Alimentación', 'agua potable', 'aire', 'energía esencial', 'agricultura', 'nutrición', 'salud básica'] },
  { nombre: 'Seguridad', necesidad: 'Vivir con estabilidad y protección', dibujo: ['Vivienda', 'Infraestructuras'],
    tematicas: ['Vivienda', 'saneamiento', 'hospitales', 'seguridad alimentaria', 'infraestructuras', 'prevención de riesgos', 'protección civil'] },
  { nombre: 'Comunidad', necesidad: 'Pertenecer y convivir', dibujo: ['Convivencia', 'Relaciones', 'Cultura'],
    tematicas: ['Familia', 'educación básica', 'cultura', 'comunicación', 'relaciones humanas', 'participación', 'cohesión social'] },
  { nombre: 'Autonomía', necesidad: 'Poder decidir y desarrollar una vida digna', dibujo: ['Justicia', 'Derechos', 'Política'],
    tematicas: ['Derechos', 'justicia', 'empleo', 'economía', 'movilidad', 'privacidad', 'igualdad de oportunidades', 'gobernanza'] },
  { nombre: 'Conocimiento', necesidad: 'Comprender y ampliar las capacidades humanas', dibujo: ['Ciencia', 'Informática', 'Educación'],
    tematicas: ['Ciencia', 'matemáticas', 'investigación', 'tecnología', 'educación avanzada', 'pensamiento crítico', 'innovación'] },
  { nombre: 'Trascendencia', necesidad: 'Dar sentido y contribuir a algo mayor', dibujo: ['Conciencia', 'Potencial', 'Psicología'],
    tematicas: ['Ética', 'filosofía', 'propósito', 'creatividad', 'exploración del cosmos', 'cooperación global', 'legado para futuras generaciones'] },
];
/** Los colores de los pisos, del 1 (abajo) al 6. */
const COLORES = ['#F2A93B', '#4BA3E3', '#8FCF45', '#D64BAF', '#8B6FE0', '#FFC83D'];
/** Hasta dónde llega cada piso, de la cúspide (0) a la base (1): el de arriba, más alto, como en las pirámides de Maslow. */
const CORTES = [0, 0.27, 0.42, 0.565, 0.71, 0.855, 1];

type P = [number, number];
const CUSPIDE: P = [620, 60], IZQ: P = [150, 740], FRENTE: P = [650, 960], DER: P = [1130, 690];
/** El punto a la altura `t` de la arista que baja de la cúspide a `p`. */
const en = (p: P, t: number): P => [CUSPIDE[0] + (p[0] - CUSPIDE[0]) * t, CUSPIDE[1] + (p[1] - CUSPIDE[1]) * t];
const medio = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const pts = (...ps: P[]) => ps.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
const unidad = (a: P, b: P): P => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
/** Un color mezclado con blanco (`f` de 0 a 1). */
const claro = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * f));
  return `rgb(${c.join(',')})`;
};
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const LETRA = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

type Enlace = { c: Circulo; s: Sistema };
type Pieza = { texto: string; tras: string; enlace: Enlace | null };

/** Las temáticas en frase («Alimentación, agua potable… y salud básica»), partidas en renglones de unos `ancho`
 *  caracteres; las que empiezan por el nombre de una de nuestras categorías llevan su enlace. */
function renglones(tematicas: string[], buscar: (t: string) => Enlace | null, ancho = 54) {
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
  // Nuestras categorías por su nombre, para enlazar las temáticas y sacar los dibujos.
  const categorias = useMemo(() => (circulos || []).flatMap(c => c.sistemas.map(s => ({ c, s, clave: plano(s.titulo) }))), [circulos]);
  const buscar = (t: string): Enlace | null => {
    const x = plano(t);
    const e = categorias.find(k => x === k.clave || x.startsWith(`${k.clave} `));
    return e ? { c: e.c, s: e.s } : null;
  };
  const dibujoDe = (nombres: string[]) => {
    for (const n of nombres) { const e = categorias.find(k => k.clave === plano(n) && k.s.imagen); if (e) return e; }
    return null;
  };
  const abrir = (e: Enlace | null) => {
    if (!e) return;
    ir(`${pathname}?${new URLSearchParams({ vista: 'circulos', circulo: e.c.clave, sector: e.s.id }).toString()}`);
    window.scrollTo(0, 0);
  };
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  // Los ejes de la cara derecha, para escribir el nombre tumbado sobre ella: a lo largo de la base y bajando por la arista.
  const [ux, uy] = unidad(FRENTE, DER), [vx, vy] = unidad(CUSPIDE, FRENTE);
  const N = NIVELES.length, COLUMNA = 1150;
  return (
    <div data-vista-piramide className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-2 sm:px-6">
      {/* EL DIBUJO, desde 768 px. */}
      <svg viewBox="0 0 1720 1000" className="hidden h-auto w-full md:block" role="group" aria-label="Pirámide de las necesidades">
        <defs>
          {NIVELES.map((n, i) => (
            <linearGradient key={n.nombre} id={`pir-der-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={claro(COLORES[i], 0.35)} /><stop offset="0.35" stopColor={COLORES[i]} /><stop offset="1" stopColor={COLORES[i]} />
            </linearGradient>
          ))}
        </defs>
        <style>{`.piso{transition:filter .15s}.piso[data-con-enlace]{cursor:pointer}.piso[data-con-enlace]:hover{filter:brightness(1.07) saturate(1.1)}.cat{cursor:pointer;font-weight:700}.cat:hover{text-decoration:underline}`}</style>
        {NIVELES.map((n, i) => {
          // Del piso 1 (abajo) al 6 (la cúspide): `t0` arriba del piso, `t1` abajo.
          const t0 = CORTES[N - 1 - i], t1 = CORTES[N - i], tm = (t0 + t1) / 2, cima = i === N - 1;
          const izq = [en(IZQ, t0), en(FRENTE, t0), en(FRENTE, t1), en(IZQ, t1)] as P[];
          const der = [en(FRENTE, t0), en(DER, t0), en(DER, t1), en(FRENTE, t1)] as P[];
          const alto = (t1 - t0) * (FRENTE[1] - CUSPIDE[1]);
          // El dibujo, derecho, en el centro de la cara izquierda del piso (en la cúspide, más abajo, donde hay sitio).
          const ci = en(medio(IZQ, FRENTE), cima ? t0 + (t1 - t0) * 0.62 : tm);
          const hDib = Math.min(alto * (cima ? 0.5 : 0.8), 130), wDib = hDib * 1.6;
          // El nombre, en el centro de la cara derecha, del tamaño que quepa a esa altura (se estrecha hacia arriba; unos
          // 0,8 em por letra en mayúsculas gruesas). Si no cabe legible, sale desde la arista del frente y se escapa por
          // la derecha de la cara, como en el dibujo que sirvió de modelo.
          const tc = cima ? t0 + (t1 - t0) * 0.82 : tm;
          const anchoCara = Math.hypot(en(DER, tc)[0] - en(FRENTE, tc)[0], en(DER, tc)[1] - en(FRENTE, tc)[1]);
          const cabe = Math.min(alto * 0.34, 44, (anchoCara * 0.82) / (n.nombre.length * 0.8));
          const escapa = cima || cabe < 24;
          const letra = cima ? Math.min(28, alto * 0.2) : Math.max(cabe, 24);
          const f = en(FRENTE, tc);
          const cd: P = escapa ? [f[0] + ux * 14, f[1] + uy * 14] : en(medio(FRENTE, DER), tc);
          const borde = en(DER, tm);
          const dib = dibujoDe(n.dibujo);
          const principal = dib ? { c: dib.c, s: dib.s } : null;
          const lineas = renglones(n.tematicas, buscar);
          const alturaTexto = 28 + lineas.length * 23;
          return (
            <g key={n.nombre} data-piso={n.nombre}>
              <g className="piso" data-con-enlace={principal ? '' : undefined} onClick={() => abrir(principal)} role={principal ? 'button' : undefined} aria-label={principal ? `Abrir ${principal.s.titulo}` : undefined}>
                <polygon points={pts(...izq)} fill={claro(COLORES[i], 0.45)} stroke="#1a1a1a" strokeWidth={2.5} strokeLinejoin="round" />
                <polygon points={pts(...der)} fill={`url(#pir-der-${i})`} stroke="#1a1a1a" strokeWidth={2.5} strokeLinejoin="round" />
                {dib?.s.imagen && <image href={miniatura(dib.s.imagen, 260)} x={ci[0] - wDib / 2} y={ci[1] - hDib / 2} width={wDib} height={hDib} preserveAspectRatio="xMidYMid meet" />}
                <text transform={`matrix(${ux} ${uy} ${vx * 0.35} ${vy} ${cd[0]} ${cd[1]})`} textAnchor={escapa ? 'start' : 'middle'} dominantBaseline="central"
                  style={{ font: `900 ${letra}px ${LETRA}`, fill: '#1a1a1a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n.nombre}</text>
              </g>
              {/* Fuera, la necesidad y sus temáticas: una raya de su color desde la arista. */}
              <line x1={Math.max(borde[0] + 10, 880)} y1={borde[1]} x2={COLUMNA - 12} y2={borde[1]} stroke={COLORES[i]} strokeWidth={3} strokeLinecap="round" />
              <g transform={`translate(${COLUMNA} ${borde[1] - alturaTexto / 2 + 14})`}>
                <text x={0} y={0} dominantBaseline="central" style={{ font: `700 21px 'Helvetica Neue', Arial, sans-serif`, fill: '#0f172a' }}>{i + 1}. {n.necesidad}</text>
                <text x={0} y={28} dominantBaseline="central" style={{ font: `400 18.5px 'Helvetica Neue', Arial, sans-serif`, fill: '#475569' }}>
                  {lineas.map((linea, k) => (
                    <tspan key={k} x={0} dy={k === 0 ? 0 : 23}>
                      {linea.map((p, j) => (
                        <tspan key={j}>{p.enlace
                          ? <tspan className="cat" fill="#0f172a" onClick={() => abrir(p.enlace)} data-categoria-piramide={p.enlace.s.titulo}>{p.texto}</tspan>
                          : p.texto}{p.tras}</tspan>
                      ))}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
        {/* Las aristas de fuera, más gruesas, como un dibujo a tinta. */}
        <polyline points={pts(IZQ, CUSPIDE, DER)} fill="none" stroke="#1a1a1a" strokeWidth={5} strokeLinejoin="round" />
        <polyline points={pts(IZQ, FRENTE, DER)} fill="none" stroke="#1a1a1a" strokeWidth={5} strokeLinejoin="round" />
        <line x1={CUSPIDE[0]} y1={CUSPIDE[1]} x2={FRENTE[0]} y2={FRENTE[1]} stroke="#1a1a1a" strokeWidth={4} />
      </svg>
      {/* EN EL MÓVIL: cada piso, de arriba abajo, con su dibujo, su nombre, la necesidad y sus temáticas. */}
      <ol className="space-y-3 md:hidden" aria-label="Pirámide de las necesidades">
        {[...NIVELES].reverse().map(n => {
          const i = NIVELES.indexOf(n), dib = dibujoDe(n.dibujo);
          return (
            <li key={n.nombre} className="flex items-stretch overflow-hidden rounded-2xl border-2 border-slate-900" data-piso={n.nombre}>
              <div className="grid w-24 shrink-0 place-items-center p-1.5" style={{ background: claro(COLORES[i], 0.45) }}>
                {dib?.s.imagen && <img src={miniatura(dib.s.imagen, 120)} alt="" className="h-14 w-full object-contain" />}
              </div>
              <div className="min-w-0 flex-1 px-3 py-2" style={{ background: COLORES[i] }}>
                <p className="text-base font-black uppercase tracking-wide text-slate-900">{i + 1}. {n.nombre}</p>
                <p className="text-[13px] font-bold text-slate-900">{n.necesidad}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-900/80">
                  {n.tematicas.map((t, k) => {
                    const e = buscar(t);
                    return (
                      <span key={t}>{e ? <button type="button" onClick={() => abrir(e)} className="font-bold underline-offset-2 hover:underline">{t}</button> : t}
                        {k === n.tematicas.length - 1 ? '.' : k === n.tematicas.length - 2 ? ' y ' : ', '}</span>
                    );
                  })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
