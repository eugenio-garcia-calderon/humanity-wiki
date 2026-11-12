// Two sections of the «Vivienda» window (Eugenio, 2026-11-12): regulated land
// prices so nobody gets rich by turning farmland into building land, and
// ecological homes on rural land that plant a food forest (10 % homes, 10 %
// productive uses, 80 % vegetation). Data: src/data/viviendaRustica.ts.
import { useState } from 'react';
import { euros, numero } from '../../data/modeloSocioeconomico';
import { FUENTES_VIVIENDA } from '../../data/vivienda';
import {
  ARBOLES_HA, CLASES_SUELO, MARGEN_SUELO, REPARTO_FINCA, RUSTICA_APOYOS, RUSTICA_REGLAS, RUSTICA_RETOS,
  RUSTICA_VIGILANCIA, SALTO, SECANO_M2, SUELO_HOY as S, SUELO_PROPUESTA, SUELO_PROPUESTA_MAS, precioTope,
} from '../../data/viviendaRustica';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Regulador, Segmentado } from './piezas';

function F({ id }: { id: string }) {
  const f = FUENTES_VIVIENDA[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

function Tarjetas({ xs, cols = 'md:grid-cols-2' }: { xs: { t: string; d: string }[]; cols?: string }) {
  return (
    <ul className={`grid gap-4 ${cols}`}>
      {xs.map(x => (
        <li key={x.t} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-slate-900">{x.t}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{x.d}</p>
        </li>
      ))}
    </ul>
  );
}

// ── LAND PRICES ─────────────────────────────────────────────────────────────
export function SueloApartado() {
  return (
    <Apartado id="vivienda-suelo" titulo="Que recalificar un campo no haga rico a nadie" fondo="blanco"
      entradilla="Cuando el plan de un municipio convierte un campo en suelo para construir, su precio se multiplica sin que el dueño haga nada. La propuesta: ese suelo se vende a un precio regulado, y la subida se queda en la escala para hacer vivienda pública.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Cifra valor={`${numero(SECANO_M2, 2)} €`} tono="neutro" texto={<>vale de media un metro cuadrado de tierra de secano (2024)<F id="mapa-tierra" /></>} />
        <Cifra valor={`${numero(S.urbanoM2)} €`} tono="mal" texto={<>vale de media un metro cuadrado de suelo urbano (finales de 2025)<F id="suelo-urbano" /></>} />
        <Cifra valor="hasta × 100" tono="mal" texto={<>puede multiplicarse el precio de una finca solo por recalificarla, según un profesor de derecho administrativo<F id="domenech" /></>}
          nota={`Comparando esas dos medias sale unas ${numero(Math.round(SALTO / 10) * 10)} veces, pero no es la misma finca: solo da una idea del salto.`} />
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Hoy</h3>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
        <p>La ley distingue tres clases de suelo. Quien tiene un campo que pasa a urbanizable cede hoy al ayuntamiento entre un {S.cesionMin} % y un {S.cesionMax} % de lo que se puede construir (hasta un {S.cesionTope} % en casos especiales)<F id="ley-suelo" />. El resto de la subida es suya.</p>
      </div>
      <Mas titulo="cómo se valora hoy el suelo, y las tres clases">
        <p className="mb-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">La ley ya dice que un campo se valora por lo que produce, sin contar lo que se espera construir en él<F id="ley-suelo" />. Pero eso solo se aplica cuando la administración expropia o reparte. En una venta libre, el precio lo pone quien vende, y la expectativa de recalificación ya va dentro.</p>
        <dl className="grid max-w-4xl gap-3 md:grid-cols-3">
          {CLASES_SUELO.map(c => (
            <div key={c.t} className="rounded-xl border border-slate-200 bg-white p-4">
              <dt className="font-semibold text-slate-900">{c.t}</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">{c.d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">Esa subida sin trabajo es la que ha alimentado la especulación y la corrupción urbanística: quien decide recalificar puede hacer rico a un propietario con una firma<F id="domenech" />.</p>
      </Mas>

      <h3 className="mt-10 text-xl font-bold text-slate-900">La propuesta</h3>
      <div className="mt-3"><Tarjetas xs={SUELO_PROPUESTA} cols="md:grid-cols-3" /></div>
      <Mas titulo="quién fija el precio, quién vigila y qué pasa si se hace trampa">
        <Tarjetas xs={SUELO_PROPUESTA_MAS} cols="md:grid-cols-3" />
      </Mas>
      <PrecioSuelo />
    </Apartado>
  );
}

function PrecioSuelo() {
  const [urbanizado, setUrbanizado] = useState<'si' | 'no'>('no');
  const [urbanizar, setUrbanizar] = useState(60);
  const [solares, setSolares] = useState(0.5);
  const [mercado, setMercado] = useState(S.urbanoM2);
  const ha = 10_000;
  const tope = precioTope(SECANO_M2, urbanizar, urbanizado === 'si') * ha;
  const valorMercado = mercado * ha * solares;
  const subida = Math.max(0, valorMercado - tope);
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-lg font-bold text-slate-900">Un ejemplo: una hectárea de secano que pasa a urbanizable</p>
      <Segmentado<'si' | 'no'> etiqueta="¿Quien vende ha urbanizado?" valor={urbanizado} onChange={setUrbanizado} className="mt-3"
        opciones={[{ id: 'no', texto: 'Se vende sin urbanizar' }, { id: 'si', texto: 'Ya urbanizada' }]} />
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          {urbanizado === 'si' && (
            <Regulador etiqueta="Coste de urbanizar, por m² de finca" valor={urbanizar} min={20} max={150} paso={5}
              mostrar={euros(urbanizar)} onChange={setUrbanizar} ayuda="Supuesto: cambia mucho de un sitio a otro. No hay un dato oficial único." />
          )}
          <Regulador etiqueta="Parte de la hectárea que queda en solares" valor={solares} min={0.3} max={0.7} paso={0.05}
            mostrar={`${numero(solares * 100)} %`} onChange={setSolares} ayuda="El resto son calles, zonas verdes y equipamientos. Supuesto." />
          <Regulador etiqueta="Lo que pagaría el mercado por m² de solar" valor={mercado} min={50} max={400} paso={5}
            mostrar={euros(mercado)} onChange={setMercado} ayuda={`La media de España fue ${numero(S.urbanoM2)} €/m² a finales de 2025.`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Cifra valor={euros(tope)} tono="bien" texto="precio tope de la hectárea"
            nota={urbanizado === 'si' ? `Valor de secano + urbanizar, + ${numero(MARGEN_SUELO * 100)} %.` : `Valor de secano + ${numero(MARGEN_SUELO * 100)} %. Sin obra, no se suma urbanizar.`} />
          <Cifra valor={euros(subida)} tono="bien" texto="de subida que va a la escala para vivienda pública, en vez de al dueño"
            nota={`Lo que valdrían los solares (${euros(valorMercado)}) menos el precio tope.`} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-500">El margen del {numero(MARGEN_SUELO * 100)} %, el coste de urbanizar y la parte en solares son supuestos para que Eugenio los fije. Las cifras del ejemplo no salen de una finca real.</p>
    </div>
  );
}

// ── ECOLOGICAL HOMES ON RURAL LAND ──────────────────────────────────────────
export function RusticaApartado() {
  return (
    <Apartado id="vivienda-rustica" titulo="Casas en el campo, si el campo se convierte en bosque"
      entradilla="Se podrá vivir en una finca rústica con una casa ecológica, siempre que la finca se plante: árboles y plantas que den alimento o biomasa y retengan agua, en lugar de un campo de cereal. Como máximo un 10 % para casas, otro 10 % para producir, y el 80 % verde.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Cifra valor={`${numero(4_933_154 / 1e6, 1)} M ha`} tono="neutro" texto={<>de cereal de secano en España en 2025, el 86 % de todo el cereal<F id="esyrce" /></>} />
        <Cifra valor="3,2 M ha" tono="mal" texto={<>de cultivo abandonadas entre 1990 y 2016, sobre todo de secano<F id="abandono" /></>} />
        <Cifra valor={`${ARBOLES_HA} árboles`} tono="bien" texto="por hectárea verde como mínimo, con la propuesta" nota="Cifra propuesta; Eugenio la confirma." />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <DibujoFinca />
        <CalculadoraFinca />
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Las reglas</h3>
      <div className="mt-3"><Tarjetas xs={RUSTICA_REGLAS.slice(0, 3)} cols="md:grid-cols-3" /></div>
      <Mas titulo="más reglas: energía, basura y agricultura">
        <Tarjetas xs={RUSTICA_REGLAS.slice(3)} cols="md:grid-cols-3" />
      </Mas>
      <p className="mt-6 max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[15px] leading-relaxed text-rose-900">
        <strong>Si no se planta el mínimo:</strong> multa grave (3 veces el coste de plantar lo que falta) y, si no se corrige, se retira la licencia de la vivienda.
      </p>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Ayudas</h3>
      <div className="mt-3"><Tarjetas xs={RUSTICA_APOYOS.filter(a => a.t !== 'Formación y asesoramiento')} cols="md:grid-cols-3" /></div>
      <Mas titulo="formación y asesoramiento">
        <Tarjetas xs={RUSTICA_APOYOS.filter(a => a.t === 'Formación y asesoramiento')} cols="" />
      </Mas>

      <Mas titulo="quién vigila y qué multas hay">
        <Tarjetas xs={RUSTICA_VIGILANCIA} />
      </Mas>
      <Mas titulo="qué dice la ley hoy">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>La ley estatal reserva el suelo rústico a usos agrícolas, ganaderos, forestales o de caza. Otros usos, como una vivienda, solo caben como excepción de interés público o social, o si tienen que estar en el campo, y con las condiciones de cada comunidad<F id="ley-suelo" />.</p>
          <p>Cada comunidad autónoma tiene su propia ley de suelo, con sus tamaños mínimos de finca y sus excepciones. No hay ninguna regla que pida plantar a cambio de poder vivir allí.</p>
        </div>
      </Mas>

      <Mas titulo="lo que falta por resolver">
        <Tarjetas xs={RUSTICA_RETOS} />
      </Mas>
    </Apartado>
  );
}

/** A plot split 10 / 10 / 80, drawn to scale. */
function DibujoFinca() {
  const W = 300, H = 200;
  const arboles: [number, number][] = [];
  for (let y = 18; y < H; y += 26) for (let x = 78; x < W; x += 26) arboles.push([x + ((y / 26) % 2 ? 13 : 0), y]);
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Una finca, en tres partes</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
        aria-label="Finca dividida: 10 % viviendas, 10 % usos productivos, 80 % vegetación con árboles">
        <rect x={0} y={0} width={W} height={H} className="fill-emerald-100 stroke-emerald-700" strokeWidth={1.5} />
        {arboles.filter(([x]) => x < W - 6).map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={7} className="fill-emerald-600" />)}
        <rect x={0} y={0} width={60} height={100} className="fill-amber-200 stroke-amber-700" strokeWidth={1.5} />
        <rect x={0} y={100} width={60} height={100} className="fill-sky-200 stroke-sky-700" strokeWidth={1.5} />
        <text x={30} y={46} textAnchor="middle" className="fill-amber-900 text-[11px] font-semibold">Casas</text>
        <text x={30} y={60} textAnchor="middle" className="fill-amber-900 text-[11px]">10 %</text>
        <text x={30} y={146} textAnchor="middle" className="fill-sky-900 text-[11px] font-semibold">Producir</text>
        <text x={30} y={160} textAnchor="middle" className="fill-sky-900 text-[11px]">10 %</text>
      </svg>
      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-3 rounded-sm bg-amber-200 ring-1 ring-amber-700" />Viviendas: como máximo el 10 %</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-3 rounded-sm bg-sky-200 ring-1 ring-sky-700" />Usos productivos: como máximo el 10 %</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-3 rounded-sm bg-emerald-600" />Vegetación: al menos el 80 %, con árboles que den alimento o biomasa</li>
      </ul>
    </figure>
  );
}

function CalculadoraFinca() {
  const [m2, setM2] = useState(10_000);
  const ha = m2 / 10_000;
  const verde = m2 * REPARTO_FINCA.vegetacion;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-lg font-bold text-slate-900">¿Cuánto se puede construir en tu finca?</p>
      <div className="mt-4">
        <Regulador etiqueta="Superficie de la finca" valor={m2} min={2_500} max={100_000} paso={500}
          mostrar={`${numero(m2)} m² (${numero(ha, 2)} ha)`} onChange={setM2} />
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          { t: 'Para viviendas, como máximo', v: `${numero(m2 * REPARTO_FINCA.vivienda)} m²` },
          { t: 'Para usos productivos, como máximo', v: `${numero(m2 * REPARTO_FINCA.productivo)} m²` },
          { t: 'Vegetación, como mínimo', v: `${numero(verde)} m²` },
          { t: 'Árboles a plantar, como mínimo', v: numero(Math.ceil((verde / 10_000) * ARBOLES_HA)) },
        ].map(x => (
          <div key={x.t} className="rounded-xl border border-slate-200 p-3">
            <dt className="text-sm text-slate-600">{x.t}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{x.v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Contamos el 10 % como superficie ocupada por los edificios. El mínimo de {ARBOLES_HA} árboles por hectárea verde es una propuesta.
      </p>
    </div>
  );
}
