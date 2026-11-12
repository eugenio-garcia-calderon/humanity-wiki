// The «Vivienda» window (Eugenio, 2026-11-12): «vamos a añadir también el
// apartado de vivienda en el menú, donde actualmente apenas se hace nada por
// parte de las administraciones. Y vamos a poner en cada una de las 8 escalas
// qué se va a promulgar y cómo van a regular.»
// Today with sources (stock, spending, prices, effort, empty homes, the 2023
// law and who holds the competence), the proposal tied to the model (tax tiers,
// production third), the eight scales and the open questions.
// Data: src/data/vivienda.ts.
import { useState, type ReactNode } from 'react';
import { ESCALAS, HOY, euros, numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  FUENTES_VIVIENDA, GASTO_HOY, GASTO_MODELO, HOY_VIVIENDA as V, LEY_2023, PROPUESTA_ESCALAS, PUBLICAS_MODELO,
  POR_ESCALA, QUIEN_HOY, RETOS, TIPO_USO, VIVIENDA_ESCALA, type UsoVivienda,
} from '../../data/vivienda';
import { ESCALA } from '../../data/modeloSocioeconomico';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra, Regulador, Segmentado } from './piezas';
import { cn } from '../../utils/cn';
import { RusticaApartado, SueloApartado } from './ViviendaRustica';

/** A «fuente» link from this window's own source list. */
function F({ id }: { id: string }) {
  const f = FUENTES_VIVIENDA[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

const mill = (m: number) => `${numero(m)} M€`;
const redondo = (m: number) => Math.round(m / 100) * 100;

export function ViviendaVentana() {
  return (
    <>
      <Resumen />
      <Hoy />
      <QuienManda />
      <Propuesta />
      <Escalas />
      <SueloApartado />
      <RusticaApartado />
      <Retos />
      <Apartado id="vivienda-fuentes" titulo="Fuentes"
        entradilla="Consultadas en noviembre de 2026. Las cifras del modelo son estimaciones hechas en esta misma web, a partir de sus cuentas.">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {Object.entries(FUENTES_VIVIENDA).map(([id, f]) => (
            <li key={id}><a href={f.url} target="_blank" rel="noreferrer" className="break-words text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
          ))}
        </ul>
      </Apartado>
    </>
  );
}

// ── 1. SUMMARY ──────────────────────────────────────────────────────────────
function Resumen() {
  return (
    <Apartado id="vivienda" titulo="Vivienda: un derecho que casi nadie construye"
      entradilla={<>La Constitución promete una vivienda digna, pero en España menos de 2 de cada 100 viviendas son públicas de alquiler, y los precios suben más de un 12 % en un año. La propuesta: que cada una de las 8 escalas sepa qué normas hace y cómo regula, y que parte de su dinero construya vivienda que no se vende nunca.</>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra valor={porcentaje(V.publicaPct)} tono="mal"
          texto={<>de las viviendas son públicas de alquiler, unas {numero(V.publicas)}<F id="housing-europe" /></>}
          nota={<>En la Unión Europea, la vivienda social es de media el {porcentaje(V.socialUE, 0)}<F id="ocde-social" /></>} />
        <Cifra valor={porcentaje(V.precios)} tono="mal"
          texto={<>subió el precio de la vivienda en un año, hasta junio de 2026<F id="ine-ipv" /></>} />
        <Cifra valor={porcentaje(V.sobrecargaES)} tono="mal"
          texto={<>de quienes alquilan a precio de mercado gastan más del 40 % de lo que ganan en la casa<F id="sobrecarga-es" /></>}
          nota={<>En la Unión Europea, el {numero(V.sobrecargaUE, 1)} %<F id="sobrecarga-ue" /></>} />
        <Cifra valor={`≈ ${mill(redondo(GASTO_MODELO))}`} tono="bien"
          texto={<>al año para vivienda pública con el modelo, frente a {mill(GASTO_HOY)} de hoy</>}
          nota="Estimación del modelo: municipio, provincia, región y nación juntos." />
      </div>
      <ParqueSocial />
    </Apartado>
  );
}

/** Share of social rental housing: Spain, the EU average and the countries at the top. */
function ParqueSocial() {
  const filas = [
    { t: 'España (vivienda pública)', v: V.publicaPct, txt: porcentaje(V.publicaPct), c: 'bg-rose-700', f: 'housing-europe' },
    { t: 'Media de la Unión Europea', v: V.socialUE, txt: `${V.socialUE} %`, c: 'bg-slate-500', f: 'ocde-social' },
    { t: 'Países Bajos, Austria y Dinamarca', v: V.socialTop, txt: `más del ${V.socialTop} %`, c: 'bg-slate-300', f: 'ocde-social' },
  ];
  return (
    <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">De cada 100 viviendas, ¿cuántas son sociales de alquiler?</figcaption>
      <div className="mt-4 space-y-3" role="img"
        aria-label={filas.map(f => `${f.t}: ${f.txt}`).join('; ')}>
        {filas.map(f => (
          <div key={f.t} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[250px_1fr]">
            <span className="text-sm text-slate-700">{f.t}</span>
            <span className="flex items-center gap-2">
              <span className={cn('h-4 shrink-0 rounded-r-[4px]', f.c)} style={{ width: `${(f.v / 22) * 70}%` }} />
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800">{f.txt}<F id={f.f} /></span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        La cifra de España es solo vivienda pública; contando también la protegida en manos privadas, llega a un 3,4 %<F id="housing-europe" />. Los datos europeos son de la OCDE, de 2022 o del último año que tiene cada país.
      </p>
    </figure>
  );
}

// ── 2. TODAY ────────────────────────────────────────────────────────────────
function Hoy() {
  const iniciadas = V.protegidasIniciadas + V.libresIniciadas;
  const gastos = [
    { t: 'Vivienda', v: GASTO_HOY, c: 'bg-rose-700' },
    { t: 'Educación', v: HOY.educacion2024, c: 'bg-slate-400' },
    { t: 'Sanidad', v: HOY.sanidad2024, c: 'bg-slate-400' },
  ];
  const max = HOY.sanidad2024;
  return (
    <Apartado id="vivienda-hoy" titulo="Cada vez más cara, y casi sin vivienda pública" fondo="blanco"
      entradilla="Faltan casas donde está el trabajo, los precios corren, y las administraciones dedican a vivienda muy poco comparado con otros servicios básicos.">
      <div className="grid gap-4 md:grid-cols-3">
        <Tarjeta t="Faltan casas">
          En 2025 se formaron unos {numero(V.hogaresNuevos2025)} hogares nuevos y se terminaron unas {numero(V.viviendasNuevas2025)} viviendas. El Banco de España calcula que ya faltan <strong>{numero(V.deficit)}</strong><F id="bde-2025" />.
        </Tarjeta>
        <Tarjeta t="Comprar cuesta años de sueldo">
          Una familia que alquila necesitaría <strong>{numero(V.anosRenta, 1)} años</strong> de todo lo que gana, sin gastar nada, para comprar una casa. En Madrid o Barcelona, más de diez<F id="bde-2025" />.
        </Tarjeta>
        <Tarjeta t="Los precios no paran">
          En un año, la vivienda usada subió un {porcentaje(V.preciosUsada)} y la nueva un {porcentaje(V.preciosNueva)}<F id="ine-ipv" />. Quien alquila lo nota antes que nadie.
        </Tarjeta>
      </div>

      <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="text-lg font-bold text-slate-900">Lo que gastaron todas las administraciones en 2024</figcaption>
        <p className="mt-1 text-sm text-slate-600">Vivienda frente a otros dos servicios básicos, en millones de euros.</p>
        <div className="mt-4 space-y-2" role="img" aria-label={gastos.map(g => `${g.t}: ${mill(g.v)}`).join('; ')}>
          {gastos.map(g => (
            <div key={g.t} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[120px_1fr]">
              <span className="text-sm text-slate-700">{g.t}</span>
              <span className="flex items-center gap-2">
                <span className={cn('h-4 min-w-2 shrink-0 rounded-r-[4px]', g.c)} style={{ width: `${(g.v / max) * 70}%` }} />
                <span className="whitespace-nowrap text-sm tabular-nums text-slate-700">{mill(g.v)}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
          Por cada 100 € que se gastan en sanidad, unos {numero((GASTO_HOY / HOY.sanidad2024) * 100, 1)} € van a vivienda<F id="igae-cofog" />. En ayudas al alquiler y vivienda social, España pone {euros(V.ayudaPersonaES)} por habitante al año; la media europea, {euros(V.ayudaPersonaUE)}<F id="eurostat-ayudas" />.
        </p>
        <Mas titulo="qué entra en esa cifra">
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li><strong>{mill(V.urbanismo2024)}</strong> en construir, comprar y rehabilitar vivienda y en urbanismo (grupo 06.1 de las cuentas públicas).</li>
            <li><strong>{mill(V.ayudas2024)}</strong> en ayudas a la vivienda dentro de la protección social (grupo 10.6).</li>
            <li>No se cuentan el agua, el alumbrado ni las calles, que las cuentas meten en el mismo capítulo: con ellos, el total es de {mill(V.division2024)}<F id="igae-cofog" />.</li>
            <li>Los datos de 2024 son provisionales.</li>
          </ul>
        </Mas>
      </figure>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Tarjeta t={`${numero(V.vacias)} viviendas vacías`}>
          Son el {porcentaje(V.vaciasPct)} de todas, según el censo de 2021<F id="ine-vacias" />. Muchas están en pueblos sin demanda, en mal estado o a la venta; aun así, son la reserva más grande que hay.
          <Mas titulo="cómo se cuentan">
            <p className="text-[15px] leading-relaxed text-slate-700">El INE mira el contador de la luz: una casa es vacía si no tiene contrato o si en un año gastó menos que una casa de su municipio ocupada 15 días. Por eso entran también casas en ruinas o en obras.</p>
          </Mas>
        </Tarjeta>
        <Tarjeta t="Poca vivienda protegida nueva">
          En un año se empezaron {numero(V.protegidasIniciadas)} viviendas protegidas de {numero(iniciadas)} en total: unas {numero((V.protegidasIniciadas / iniciadas) * 100, 0)} de cada 100<F id="protegidas" />. Entre {numero(V.esperaMin)} y {numero(V.esperaMax)} hogares esperan una, hasta cinco años en las ciudades grandes<F id="housing-europe" />.
        </Tarjeta>
      </div>
    </Apartado>
  );
}

function Tarjeta({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="font-bold text-slate-900">{t}</p>
      <div className="mt-1 text-[15px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

// ── 3. WHO HOLDS THE COMPETENCE TODAY ──────────────────────────────────────
function QuienManda() {
  return (
    <Apartado id="vivienda-quien" titulo="Mandan las comunidades, y cada una hace lo que quiere"
      entradilla="La vivienda es competencia de las comunidades autónomas. El Estado pone reglas básicas y reparte dinero; los ayuntamientos deciden dónde se construye. Si una comunidad no quiere actuar, nadie la obliga.">
      <div className="grid gap-4 md:grid-cols-2">
        {QUIEN_HOY.map(n => (
          <div key={n.nivel} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-bold text-slate-900">{n.nivel}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-800"><span className="font-semibold">Manda en: </span>{n.manda}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">Hace: </span>{n.hace}{n.fuentes.map(f => <F key={f} id={f} />)}</p>
          </div>
        ))}
      </div>
      <Mas titulo="qué dice la ley por el derecho a la vivienda de 2023">
        <p className="mb-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">Es la primera ley estatal de vivienda (Ley 12/2023)<F id="ley-vivienda" />. Respeta la competencia de las comunidades, así que casi todo depende de que cada una la quiera aplicar.</p>
        <dl className="grid max-w-4xl gap-3 md:grid-cols-2">
          {LEY_2023.map(l => (
            <div key={l.t} className="rounded-xl border border-slate-200 bg-white p-4">
              <dt className="font-semibold text-slate-900">{l.t}</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-slate-600">{l.d}</dd>
            </div>
          ))}
        </dl>
      </Mas>
    </Apartado>
  );
}

// ── 4. THE PROPOSAL ─────────────────────────────────────────────────────────
function Propuesta() {
  const principios = [
    { t: 'Un solo impuesto, según el uso', d: 'La casa en la que vives paga el tramo básico, un 10 %, al comprarla o en el alquiler. Una segunda vivienda paga el tramo secundario, un 20 %. Desaparecen el IBI, el impuesto de transmisiones y la plusvalía.' },
    { t: 'El tercio para producir hace casas', d: 'Cada escala reparte su dinero en tres tercios: uno para producir (cosas que duran y dan servicio, como una casa), uno para cuidar a las personas y uno libre. El tercio para producir compra, construye o rehabilita vivienda, que se alquila y no se vende nunca.' },
    { t: 'Cada escala, lo suyo', d: 'Del edificio al planeta, cada escala promulga solo las normas que le tocan y regula lo que puede ver de cerca. Están una a una en el apartado siguiente.' },
    { t: 'Ayuda antes que subsidio', d: 'Quien pasa un mal momento recibe un préstamo al IPC de su comunidad o su municipio: devuelve lo mismo más lo que hayan subido los precios (el IPC), así que nadie gana dinero con él. Las personas con discapacidad tienen acceso directo a una vivienda, pagado con el tercio de cuidados.' },
  ];
  return (
    <Apartado id="vivienda-propuesta" titulo="Vivienda que se paga con el tramo básico y no se vende" fondo="blanco"
      entradilla="El modelo tiene un solo impuesto, que se suma al precio de lo que compras, con cuatro tramos. El tramo básico, el más bajo (10 %), es para lo necesario, y la casa en la que vives lo es. Y lo que cada escala aparta para producir se convierte en casas de alquiler que se quedan para siempre en manos públicas.">
      <ol className="grid gap-4 md:grid-cols-2">
        {principios.map(p => (
          <li key={p.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900">{p.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
          </li>
        ))}
      </ol>
      <CasasVacias />
      <Calculadora />
      <DineroModelo />
    </Apartado>
  );
}

function Calculadora() {
  const [uso, setUso] = useState<UsoVivienda>('habitual');
  const [precio, setPrecio] = useState(200_000);
  const [renta, setRenta] = useState(900);
  const alquiler = uso === 'alquiler';
  const base = alquiler ? renta : precio;
  const tipo = TIPO_USO[uso];
  const impuesto = base * tipo;
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-lg font-bold text-slate-900">Cuánto paga una vivienda con el modelo</p>
      <Segmentado<UsoVivienda> etiqueta="Tipo de vivienda" valor={uso} onChange={setUso} className="mt-3"
        opciones={[{ id: 'habitual', texto: 'Mi casa' }, { id: 'segunda', texto: 'Segunda' }, { id: 'alquiler', texto: 'Alquiler' }]} />
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          {alquiler
            ? <Regulador etiqueta="Alquiler al mes" valor={renta} min={300} max={2_500} paso={50} mostrar={euros(renta)} onChange={setRenta} />
            : <Regulador etiqueta="Precio de la vivienda" valor={precio} min={50_000} max={800_000} paso={5_000} mostrar={euros(precio)} onChange={setPrecio} />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Cifra valor={euros(impuesto)} tono="neutro" texto={<>de impuesto{alquiler ? ' al mes' : ''}: el {numero(tipo * 100)} %, tramo {uso === 'segunda' ? 'secundario' : 'básico'}</>} />
          <Cifra valor={euros(base + impuesto)} tono="neutro" texto={alquiler ? 'paga al mes quien alquila, con el impuesto dentro' : 'precio final, con el impuesto dentro'} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {alquiler
          ? <>Hoy el alquiler de vivienda no paga IVA<F id="iva" />, pero el dueño paga el IBI y el IRPF por lo que cobra. Con el modelo, ese 10 % es el único impuesto de esa casa.</>
          : <>Hoy una vivienda nueva paga un 10 % de IVA<F id="iva" /> y una usada el impuesto de transmisiones de su comunidad, sea o no la casa en la que vives; después, el IBI cada año y la plusvalía al vender. Con el modelo, el impuesto se paga una vez y no hay más.</>}
      </p>
    </div>
  );
}

/** Housing money today against the model, scale by scale. */
function DineroModelo() {
  const filas = PUBLICAS_MODELO.map(id => ({ id, v: VIVIENDA_ESCALA[id] }));
  const max = GASTO_MODELO;
  const interior = GASTO_MODELO + VIVIENDA_ESCALA.vecindad;
  return (
    <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Dinero para vivienda pública al año</figcaption>
      <p className="mt-1 text-sm text-slate-600">Hoy (2024) y con el modelo, en millones de euros: construir, comprar, rehabilitar y ayudar a pagar la casa. Con el modelo, unas {numero(GASTO_MODELO / GASTO_HOY, 0)} veces más. Lo del modelo es una estimación.</p>
      <div className="mt-4 space-y-2" role="img"
        aria-label={`Hoy ${mill(GASTO_HOY)}; con el modelo ${mill(redondo(GASTO_MODELO))}: ${filas.map(f => `${ESCALA[f.id].nombre} ${mill(redondo(f.v))}`).join(', ')}`}>
        <div className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_1fr]">
          <span className="text-sm text-slate-700">Hoy</span>
          <span className="flex items-center gap-2">
            <span className="h-5 shrink-0 rounded-r-[4px] bg-rose-700" style={{ width: `${(GASTO_HOY / max) * 70}%` }} />
            <span className="whitespace-nowrap text-sm tabular-nums text-slate-700">{mill(GASTO_HOY)}<F id="igae-cofog" /></span>
          </span>
        </div>
        <div className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_1fr]">
          <span className="text-sm text-slate-700">Con el modelo</span>
          <span className="flex items-center gap-2">
            <span className="flex h-5 shrink-0 gap-[2px] overflow-hidden rounded-r-[4px]" style={{ width: `${70}%` }}>
              {filas.map(f => <span key={f.id} className="h-full" style={{ width: `${(f.v / max) * 100}%`, backgroundColor: ESCALA[f.id].color }} title={`${ESCALA[f.id].nombre}: ${mill(redondo(f.v))}`} />)}
            </span>
            <span className="whitespace-nowrap text-sm tabular-nums text-slate-700">≈ {mill(redondo(GASTO_MODELO))}</span>
          </span>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
        {filas.map(f => <li key={f.id} className="flex items-center gap-1.5"><Muestra color={ESCALA[f.id].color} />{ESCALA[f.id].nombre}: {mill(redondo(f.v))}</li>)}
      </ul>
      <Mas titulo="de dónde sale esta estimación">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>Cada escala recibe la misma parte del impuesto único, unos {mill(redondo(POR_ESCALA))} al año entre todas las de su tipo en España. La matriz del modelo dice qué parte va a vivienda: el municipio un 10 %, la provincia un 6 %, la región un 8 % y la nación un 3 %.</p>
          <p>Para hacer casas, el modelo pone unas {numero(GASTO_MODELO / GASTO_HOY, 0)} veces lo de hoy. Pero si se mira todo lo que rodea a la vivienda, el total se parece al de hoy: la ventana Presupuestos suma al gasto público el agua y el alumbrado de las calles ({mill(V.division2024)} en total) y las cuotas de comunidad que pagan los vecinos (unos {mill(HOY.cuotasComunidades)}), y le salen {mill(V.division2024 + HOY.cuotasComunidades)}. En el modelo, la comunidad vecinal dedica un 30 % a cuidar su edificio, unos {mill(redondo(VIVIENDA_ESCALA.vecindad))}, en lugar de las cuotas; con eso, el total es ≈ {mill(redondo(interior))}.</p>
          <p>Es decir: el modelo no gasta mucho más en conjunto, pero mueve dinero de las cuotas a construir casas.</p>
          <p>Cuántas viviendas salen de ahí depende del precio del suelo y de la obra en cada sitio, y no lo hemos calculado.</p>
        </div>
      </Mas>
    </figure>
  );
}

// ── 5. THE EIGHT SCALES ─────────────────────────────────────────────────────
function Escalas() {
  return (
    <Apartado id="vivienda-escalas" titulo="Qué promulga y cómo regula cada escala"
      entradilla="De la persona al planeta, en una frase cada una. Promulgar es aprobar una norma o un programa; regular es vigilar que se cumpla y decidir qué pasa si no. Es la propuesta para el modelo, no lo que hay hoy.">
      <ol className="grid gap-4 lg:grid-cols-2">
        {ESCALAS.map(e => {
          const p = PROPUESTA_ESCALAS[e.id];
          const m = VIVIENDA_ESCALA[e.id];
          return (
            <li key={e.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Muestra color={e.color} className="h-4 w-4" />{e.nombre}</h3>
              <p className="mt-2 text-[17px] leading-snug text-slate-800">{p.resumen}</p>
              <p className="mt-3 text-sm leading-relaxed text-emerald-800"><span className="font-semibold">Dinero: </span>{p.dinero}{m > 0 && <> Unos {mill(redondo(m))} al año.</>}</p>
              <Mas titulo="qué promulga y cómo regula" className="mt-3">
                <div className="space-y-4">
                  {p.promulga.length > 0 && <Lista t="Promulga (normas y programas)" xs={p.promulga} />}
                  <Lista t="Hace" xs={p.hace} />
                  <Lista t="Cómo regula (quién vigila y qué pasa si no se cumple)" xs={p.regula} />
                  <p className="text-sm leading-relaxed text-slate-500"><span className="font-semibold">Hoy: </span>{p.hoy}</p>
                </div>
              </Mas>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-500">
        En el planeta, hoy hay unos 318 millones de personas sin hogar y 2.800 millones sin una vivienda adecuada, según ONU-Hábitat<F id="onu-habitat" />. El derecho a la vivienda está en el artículo 25 de la Declaración Universal<F id="dudh" /> y en el 47 de la Constitución española<F id="constitucion" />.
      </p>
    </Apartado>
  );
}

function Lista({ t, xs }: { t: string; xs: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{t}</p>
      <ul className="mt-1 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">{xs.map(x => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

/** Empty homes: the default rule of the proposal and the alternatives Eugenio decides. */
function CasasVacias() {
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-lg font-bold text-slate-900">Las casas vacías</p>
      <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        Sin IBI, tener un piso cerrado no cuesta nada. La regla de partida es la <strong>bolsa municipal con renta garantizada</strong>: el dueño le deja el piso al municipio; el municipio lo arregla si hace falta (la obra se descuenta poco a poco de la renta), lo alquila a un vecino y paga al dueño cada mes, haya inquilino o no. Al acabar el plazo, el dueño recupera su casa.
      </p>
      <Mas titulo="las alternativas, si la bolsa no basta">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Alquiler obligatorio:</strong> en una zona con escasez, un piso vacío más de dos años pasa a la bolsa aunque el dueño no quiera. Mueve más casas, pero toca la propiedad y acabaría en los tribunales.</li>
          <li><strong>Un recargo:</strong> pagar algo cada año por tener un piso vacío. Funciona como el IBI de hoy, pero sería un segundo impuesto, y el modelo quiere uno solo.</li>
          <li>Cuál se usa, y desde cuándo, lo decide Eugenio. Por ahora la página solo propone la bolsa.</li>
        </ul>
      </Mas>
    </div>
  );
}

// ── 6. WHAT IS STILL OPEN ───────────────────────────────────────────────────
function Retos() {
  return (
    <Apartado id="vivienda-retos" titulo="Lo que falta por resolver" fondo="blanco"
      entradilla="La propuesta tiene huecos. Estos son los que hay que decidir antes de que funcione.">
      <ul className="grid gap-4 md:grid-cols-2">
        {RETOS.map(r => (
          <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900">{r.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
          </li>
        ))}
      </ul>
    </Apartado>
  );
}
