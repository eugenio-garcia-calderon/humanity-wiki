import type { ReactNode } from 'react';

// ============================================================================
// LA INFOGRAFÍA DE LA RED (2026-10-22, Eugenio)
// ============================================================================
// «Una infografía de cómo funciona la tecnología matemática de las bases de
// datos conectadas unas con otras, con un lenguaje más divulgativo, con diseños
// esquemáticos para que todo el mundo lo pueda entender.»
//
// Seis pasos, cada uno con su dibujo: lo de hoy (desperdigado), la ficha, los
// hilos (las relaciones), el árbol de temas (y la herencia), la red (la cuenta
// de los saltos: 10 → 100 → 1.000) y las decisiones. Los textos van en `datos`
// y se editan; los dibujos están aquí, en SVG, para que se lean nítidos en
// cualquier pantalla y no haya que rehacer imágenes al cambiar una palabra.

export type PasoInfografia = { titulo?: string; texto?: string; dibujo?: string };

export const PASOS_INFOGRAFIA: PasoInfografia[] = [
  { dibujo: 'disperso', titulo: 'Hoy, el conocimiento está desperdigado', texto: 'Estudios, proyectos, leyes, datos y personas expertas viven en sitios distintos que no se hablan. Quien busca una solución tiene que reconstruir el puzle cada vez, y casi nunca lo consigue entero.' },
  { dibujo: 'ficha', titulo: 'Cada cosa, una ficha', texto: 'En la plataforma, cada pieza de conocimiento es una ficha: una solución, un proyecto, una entidad, una persona, un territorio o un dato. Como las fichas de una biblioteca, pero vivas y con foto.' },
  { dibujo: 'hilos', titulo: 'Las fichas se unen con hilos', texto: 'Un proyecto aplica una solución, en un municipio, y lo lidera una persona. Cada hilo dice algo y se ve desde los dos lados: si el proyecto apunta al municipio, el municipio enseña el proyecto.' },
  { dibujo: 'arbol', titulo: 'Un árbol ordena los temas', texto: 'Todos los temas cuelgan de un único árbol: Energía › Energía solar › Fotovoltaica. Basta con colgar una ficha de la rama más concreta: sube sola y aparece también en todas las ramas de las que cuelga.' },
  { dibujo: 'red', titulo: 'Desde cualquier punto llegas a todo', texto: 'Si cada ficha tiene 10 hilos, a un paso hay 10 fichas, a dos pasos 100 y a tres pasos 1.000. Es la matemática de las redes: con pocas conexiones bien hechas, todo el conocimiento queda a unos pocos clics.' },
  { dibujo: 'decision', titulo: 'Decisiones con toda la información', texto: 'Gobiernos, empresas y ciudadanía pueden ver, para cada tema y cada territorio, qué funciona, dónde se aplica y quién lo hace. Decidir con toda la información en la mano, y no a ciegas.' },
];

const NAVY = '#1e1b4b';
const AMARILLO = '#facc15';
const VERDE = '#10b981';
const CIELO = '#0ea5e9';
const ROSA = '#f43f5e';
const VIOLETA = '#8b5cf6';
const GRIS = '#cbd5e1';

/** Una ficha pequeña: un rectángulo con su barra de color y dos líneas de texto. */
function Ficha({ x, y, w = 70, h = 44, color, etiqueta, rot = 0, apagada }: { x: number; y: number; w?: number; h?: number; color: string; etiqueta?: string; rot?: number; apagada?: boolean }) {
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`} opacity={apagada ? 0.55 : 1}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#fff" stroke={apagada ? GRIS : color} strokeWidth={1.6} />
      <rect x={x} y={y} width={w} height={7} rx={3.5} fill={apagada ? GRIS : color} />
      {etiqueta ? (
        <text x={x + w / 2} y={y + h / 2 + 7} textAnchor="middle" fontSize={10} fontWeight={800} fill={apagada ? '#94a3b8' : NAVY}>{etiqueta}</text>
      ) : (
        <>
          <rect x={x + 8} y={y + 15} width={w - 16} height={5} rx={2.5} fill="#e2e8f0" />
          <rect x={x + 8} y={y + 25} width={(w - 16) * 0.6} height={5} rx={2.5} fill="#e2e8f0" />
        </>
      )}
    </g>
  );
}

function Pastilla({ x, y, texto, color }: { x: number; y: number; texto: string; color: string }) {
  const w = texto.length * 6 + 16;
  return (
    <g>
      <rect x={x - w / 2} y={y - 9} width={w} height={18} rx={9} fill={color} />
      <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#fff">{texto}</text>
    </g>
  );
}

const DIBUJOS: Record<string, ReactNode> = {
  disperso: (
    <g>
      <Ficha x={18} y={22} color={CIELO} etiqueta="Estudio" rot={-8} apagada />
      <Ficha x={124} y={14} color={VERDE} etiqueta="Proyecto" rot={6} apagada />
      <Ficha x={228} y={30} color={VIOLETA} etiqueta="Ley" rot={-4} apagada />
      <Ficha x={40} y={120} color={ROSA} etiqueta="Experta" rot={5} apagada />
      <Ficha x={150} y={128} color={AMARILLO} etiqueta="Dato" rot={-7} apagada />
      <Ficha x={238} y={118} color={CIELO} etiqueta="Informe" rot={8} apagada />
      {/* Hilos rotos: nadie conecta con nadie. */}
      {[[88, 52, 124, 42], [194, 44, 228, 52], [80, 120, 70, 70], [200, 140, 238, 140], [180, 100, 170, 64]].map(([x1, y1, x2, y2], i) => {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={mx - 4} y2={my - 2} stroke={GRIS} strokeWidth={2} strokeDasharray="3 4" />
            <line x1={mx + 4} y1={my + 2} x2={x2} y2={y2} stroke={GRIS} strokeWidth={2} strokeDasharray="3 4" />
            <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill={ROSA}>×</text>
          </g>
        );
      })}
      <text x={160} y={196} textAnchor="middle" fontSize={22} fontWeight={900} fill="#94a3b8">?</text>
    </g>
  ),
  ficha: (
    <g>
      {/* La ficha grande, en el centro. */}
      <rect x={95} y={30} width={130} height={140} rx={14} fill="#fff" stroke={NAVY} strokeWidth={2} />
      <rect x={95} y={30} width={130} height={12} rx={6} fill={AMARILLO} />
      <rect x={107} y={52} width={106} height={50} rx={8} fill="#fef9c3" />
      <circle cx={130} cy={72} r={9} fill={AMARILLO} />
      <path d="M115 98 L140 80 L160 94 L178 84 L205 98 Z" fill="#fde68a" />
      <rect x={107} y={112} width={90} height={7} rx={3.5} fill={NAVY} />
      <rect x={107} y={125} width={106} height={5} rx={2.5} fill="#e2e8f0" />
      <rect x={107} y={135} width={80} height={5} rx={2.5} fill="#e2e8f0" />
      <rect x={107} y={148} width={34} height={12} rx={6} fill="#dcfce7" />
      <rect x={146} y={148} width={30} height={12} rx={6} fill="#e0f2fe" />
      {/* Los tipos de ficha, alrededor. */}
      <Pastilla x={48} y={46} texto="Solución" color={VERDE} />
      <Pastilla x={44} y={100} texto="Proyecto" color={CIELO} />
      <Pastilla x={52} y={154} texto="Persona" color={ROSA} />
      <Pastilla x={272} y={46} texto="Territorio" color={VIOLETA} />
      <Pastilla x={276} y={100} texto="Entidad" color="#f97316" />
      <Pastilla x={270} y={154} texto="Dato" color={NAVY} />
    </g>
  ),
  hilos: (
    <g>
      <g className="ig-hilo">
        <path d="M120 100 C 160 100, 170 50, 205 50" fill="none" stroke={VERDE} strokeWidth={2.5} />
        <path d="M120 100 C 160 100, 170 150, 205 150" fill="none" stroke={VIOLETA} strokeWidth={2.5} />
        <path d="M80 100 C 60 100, 55 150, 40 150" fill="none" stroke={ROSA} strokeWidth={2.5} />
      </g>
      <Ficha x={50} y={78} w={80} color={CIELO} etiqueta="Proyecto" />
      <Ficha x={205} y={28} w={88} color={VERDE} etiqueta="Solución" />
      <Ficha x={205} y={128} w={88} color={VIOLETA} etiqueta="Municipio" />
      <Ficha x={4} y={150} w={74} h={40} color={ROSA} etiqueta="Persona" />
      <Pastilla x={165} y={66} texto="aplica" color={VERDE} />
      <Pastilla x={165} y={134} texto="en" color={VIOLETA} />
      <Pastilla x={40} y={124} texto="lidera" color={ROSA} />
      {/* Doble sentido: una flecha que va y otra que vuelve. */}
      <text x={250} y={196} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#64748b">⇄ se ve desde los dos lados</text>
    </g>
  ),
  arbol: (
    <g>
      {/* El tronco y las ramas. */}
      <path d="M70 40 V 100 M70 100 H 120 M70 60 H 40" stroke={GRIS} strokeWidth={2} fill="none" />
      <path d="M150 100 V 158 M150 158 H 195 M150 128 H 120" stroke={GRIS} strokeWidth={2} fill="none" />
      <Ficha x={30} y={14} w={84} h={30} color={AMARILLO} etiqueta="Energía" />
      <Ficha x={110} y={86} w={84} h={30} color={AMARILLO} etiqueta="E. solar" />
      <Ficha x={196} y={144} w={92} h={30} color={AMARILLO} etiqueta="Fotovoltaica" />
      {/* La ficha que se cuelga de lo más concreto… */}
      <Ficha x={232} y={86} w={74} h={34} color={CIELO} etiqueta="Proyecto" />
      <path d="M268 120 V 142" stroke={CIELO} strokeWidth={2.5} markerEnd="url(#ig-flecha-cielo)" />
      {/* …y sube sola por el árbol. */}
      <path className="ig-sube" d="M200 160 C 160 160, 160 110, 196 104 M110 96 C 80 92, 84 40, 112 32" fill="none" stroke={AMARILLO} strokeWidth={3} strokeLinecap="round" strokeDasharray="5 6" />
      <circle cx={18} cy={29} r={9} fill={VERDE} /><path d="M13 29 l4 4 l7 -8" stroke="#fff" strokeWidth={2.2} fill="none" />
      <circle cx={98} cy={128} r={9} fill={VERDE} /><path d="M93 128 l4 4 l7 -8" stroke="#fff" strokeWidth={2.2} fill="none" />
      <text x={20} y={196} fontSize={9.5} fontWeight={700} fill="#64748b">Aparece también en sus temas superiores</text>
    </g>
  ),
  red: (
    <g>
      <circle cx={160} cy={100} r={88} fill="none" stroke="#e2e8f0" strokeDasharray="2 5" />
      <circle cx={160} cy={100} r={60} fill="none" stroke="#e2e8f0" strokeDasharray="2 5" />
      <circle cx={160} cy={100} r={32} fill="none" stroke="#e2e8f0" strokeDasharray="2 5" />
      {Array.from({ length: 30 }, (_, i) => { const a = (i / 30) * Math.PI * 2 + 0.1; return <circle key={`c${i}`} cx={160 + Math.cos(a) * 88} cy={100 + Math.sin(a) * 88} r={2.6} fill={CIELO} opacity={0.5} />; })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.25, b = Math.floor(i / 2) / 6 * Math.PI * 2;
        return (
          <g key={`b${i}`}>
            <line x1={160 + Math.cos(b) * 32} y1={100 + Math.sin(b) * 32} x2={160 + Math.cos(a) * 60} y2={100 + Math.sin(a) * 60} stroke={VERDE} strokeWidth={1.2} opacity={0.5} />
            <circle cx={160 + Math.cos(a) * 60} cy={100 + Math.sin(a) * 60} r={4} fill={VERDE} />
          </g>
        );
      })}
      {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return (
        <g key={`a${i}`}>
          <line x1={160} y1={100} x2={160 + Math.cos(a) * 32} y2={100 + Math.sin(a) * 32} stroke={NAVY} strokeWidth={2} />
          <circle cx={160 + Math.cos(a) * 32} cy={100 + Math.sin(a) * 32} r={6} fill={NAVY} />
        </g>
      ); })}
      <circle className="ig-latido" cx={160} cy={100} r={11} fill={AMARILLO} stroke={NAVY} strokeWidth={2} />
      <g fontSize={10} fontWeight={900}>
        <text x={8} y={22} fill={NAVY}>1 paso → 10</text>
        <text x={8} y={38} fill={VERDE}>2 pasos → 100</text>
        <text x={8} y={54} fill={CIELO}>3 pasos → 1.000</text>
      </g>
    </g>
  ),
  decision: (
    <g>
      {/* El panel: un mapa y una gráfica. */}
      <rect x={70} y={10} width={180} height={112} rx={12} fill="#fff" stroke={NAVY} strokeWidth={2} />
      <path d="M86 40 L104 28 L126 34 L138 52 L128 74 L104 80 L88 66 Z" fill="#a7f3d0" stroke={VERDE} strokeWidth={1.4} />
      <path d="M104 80 L128 74 L140 96 L118 108 L96 100 Z" fill="#fde68a" stroke={AMARILLO} strokeWidth={1.4} />
      {[0, 1, 2, 3, 4].map(i => <rect key={i} x={160 + i * 16} y={100 - [30, 46, 38, 60, 70][i]} width={10} height={[30, 46, 38, 60, 70][i]} rx={2} fill={i === 4 ? AMARILLO : CIELO} />)}
      <line x1={156} y1={102} x2={238} y2={102} stroke={GRIS} strokeWidth={1.4} />
      {/* Tres personas que miran. */}
      {[['Gobierno', 70, VIOLETA], ['Empresa', 160, CIELO], ['Ciudadanía', 250, ROSA]].map(([t, x, c]) => (
        <g key={t as string}>
          <circle cx={x as number} cy={146} r={10} fill={c as string} />
          <path d={`M${(x as number) - 18} 182 C ${(x as number) - 18} 162, ${(x as number) + 18} 162, ${(x as number) + 18} 182 Z`} fill={c as string} />
          <text x={x as number} y={196} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={NAVY}>{t as string}</text>
        </g>
      ))}
    </g>
  ),
};

/** El dibujo de un paso. Uno que no existe no deja hueco: sale el de la red. */
export function DibujoPaso({ dibujo }: { dibujo?: string }) {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" role="img" aria-hidden="true">
      <defs>
        <marker id="ig-flecha-cielo" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={CIELO} />
        </marker>
      </defs>
      {DIBUJOS[dibujo || ''] || DIBUJOS.red}
    </svg>
  );
}

export const DIBUJOS_DISPONIBLES: Array<[string, string]> = [
  ['disperso', 'Desperdigado'], ['ficha', 'Ficha'], ['hilos', 'Hilos'], ['arbol', 'Árbol de temas'], ['red', 'Red (pasos)'], ['decision', 'Decisiones'],
];

const ESTILO = `
@keyframes ig-corre { to { stroke-dashoffset: -22; } }
@keyframes ig-latido { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } }
.ig-sube { animation: ig-corre 1.6s linear infinite; }
.ig-latido { transform-box: fill-box; transform-origin: center; animation: ig-latido 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ig-sube, .ig-latido { animation: none; } }
`;

/** Los seis pasos, numerados y unidos por una línea (en columna en el móvil). */
export function Infografia({ titulo, texto, pasos, oscura }: { titulo?: string; texto?: string; pasos?: PasoInfografia[]; oscura?: boolean }) {
  const lista = pasos && pasos.length ? pasos : PASOS_INFOGRAFIA;
  return (
    <div>
      <style>{ESTILO}</style>
      {(titulo || texto) && (
        <div className="mx-auto mb-10 max-w-3xl text-center">
          {titulo && <h2 className={`text-3xl font-black tracking-tight sm:text-4xl ${oscura ? 'text-white' : 'text-slate-900'}`}>{titulo}</h2>}
          {texto && <p className={`mt-3 text-base leading-relaxed sm:text-lg ${oscura ? 'text-[#cfd6e2]' : 'text-slate-600'}`}>{texto}</p>}
        </div>
      )}
      <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((p, i) => (
          <li key={i} className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="absolute -top-3 left-5 grid h-8 w-8 place-items-center rounded-full bg-[#1e1b4b] text-sm font-black text-[#facc15] shadow ring-4 ring-white">{i + 1}</span>
            <div className="mb-4 mt-2 rounded-2xl bg-slate-50 p-3"><DibujoPaso dibujo={p.dibujo} /></div>
            {p.titulo && <h3 className="text-lg font-black leading-snug text-slate-900">{p.titulo}</h3>}
            {p.texto && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{p.texto}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
