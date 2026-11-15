// The model at a glance, for the cover (Eugenio, 2026-11-15: «qué mejorarías para que sea más pedagógico, útil, real y
// certero, y hazlo»). Four blocks, each answering a question a first-time reader has before choosing an area:
//   IdeasModelo      what the model changes, in four sentences, each linked to its area;
//   CuentasPortada   where every 100 € goes, and what does not add up yet, computed live from the same accounts
//                    the windows use (so the cover can never disagree with them);
//   ComoLeer         the order every area follows, and the three kinds of number;
//   Glosario         the words the windows use without explaining.
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  ESCALAS, ESPANA, HOY, OCTAVO, TRAMOS, cuentasPais, millones, modeloPorFuncion, numero, porcentaje,
} from '../../data/modeloSocioeconomico';
import { COSTE_PROPUESTA } from '../../data/pensionesPropuesta';
import { CLASE_CIFRA, EtiquetaClase, Mas, type ClaseCifra } from './ventanas';
import { HoyPropuesta } from './graficos/HoyPropuesta';

const tipos = TRAMOS.map(t => numero(t.tipo * 100)).join(', ').replace(/, (\d+)$/, ' o $1');

/** A plain in-page link to an area or a section. */
function Ir({ a, children }: { a: string; children: ReactNode }) {
  return (
    <a href={`#${a}`} className="inline-flex items-center gap-1 font-semibold text-slate-900 underline decoration-slate-300 underline-offset-[3px] hover:decoration-slate-900">
      {children}<ArrowRight aria-hidden className="h-3.5 w-3.5" />
    </a>
  );
}

// ── 1. FOUR IDEAS ───────────────────────────────────────────────────────────
export function IdeasModelo() {
  const ideas: { t: string; d: ReactNode; ir: string; irTexto: string }[] = [
    {
      t: 'Un solo impuesto',
      d: <>Sustituye a los impuestos y cotizaciones de hoy. Se suma al precio de lo que se compra y al coste de cada sueldo, al {tipos} % según lo que sea.</>,
      ir: 'impuestos', irTexto: 'Cómo funciona',
    },
    {
      t: 'Ocho escalas, a partes iguales',
      d: <>Lo recaudado se reparte en {ESCALAS.length} partes iguales, de la persona al planeta. Cada escala divide la suya en tres: producir, cuidar y lo que decida su asamblea.</>,
      ir: 'escalas', irTexto: 'Las escalas',
    },
    {
      t: 'Una sola pensión',
      d: <>Igual al salario mínimo, en lugar de las cuantías distintas de hoy. Una parte se guarda aparte para ayudas puntuales de los servicios sociales.</>,
      ir: 'pensiones', irTexto: 'Las pensiones',
    },
    {
      t: 'Dinero nuevo solo para producir',
      d: <>Los bancos solo crean crédito nuevo para producir y para la primera y la segunda vivienda. Ninguna escala se endeuda: cada una ahorra para emergencias.</>,
      ir: 'economia', irTexto: 'Economía',
    },
  ];
  return (
    <section aria-labelledby="ideas-titulo" className="mt-10">
      <h2 id="ideas-titulo" className="text-xl font-[750] tracking-tight text-slate-900">El modelo en cuatro ideas</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ideas.map(i => (
          <li key={i.t} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-[750] leading-snug text-slate-900">{i.t}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{i.d}</p>
            <p className="mt-auto pt-4 text-sm"><Ir a={i.ir}>{i.irTexto}</Ir></p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[15px] text-slate-700">
        ¿Cuánto pagarías tú? <Ir a="ejemplo">Calcúlalo con tu sueldo y tus gastos</Ir>
      </p>
    </section>
  );
}

// ── 2. THE ACCOUNTS, HONESTLY ───────────────────────────────────────────────
export function CuentasPortada() {
  const pais = cuentasPais('literal');
  const funciones = modeloPorFuncion('literal');
  const sumar = (k: 'hoy' | 'modelo') => funciones.reduce((s, f) => s + f[k], 0);
  const serviciosHoy = sumar('hoy');
  const serviciosModelo = sumar('modelo');
  const salud = funciones.find(f => f.id === 'salud')!;
  const educacion = funciones.find(f => f.id === 'educacion')!;
  const diferencia = pais.recaudacion - HOY.impuestosYCotizaciones2025;
  // Of every 100 € collected: the person scale, the five scales inside the country, and the two outside it.
  const cien = { persona: 100 * OCTAVO, dentro: 100 * OCTAVO * 5, fuera: 100 * OCTAVO * 2 };
  const fueraHoy = HOY.aportacionUE + HOY.aod2025;

  return (
    <section aria-labelledby="cuentas-portada-titulo" className="mt-16">
      <h2 id="cuentas-portada-titulo" className="text-[1.75rem] font-[750] leading-tight tracking-tight text-slate-900">Las cuentas, en una mirada</h2>
      <p className="mt-2 max-w-[64ch] text-[17px] leading-relaxed text-slate-600">
        Calculadas con los datos de 2025 y el reparto inicial del modelo. Son las mismas cuentas que usan todas las áreas: si cambian allí, cambian aquí.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <HoyPropuesta
          titulo={`Adónde iría cada 100 € recaudados`}
          subtitulo={<>Cada escala recibe lo mismo: {numero(100 * OCTAVO, 1)} €.</>}
          leyenda={[
            { serie: 'tinta', texto: 'A cada persona, por igual' },
            { serie: 'acento', texto: 'Vecindad, municipio, provincia, región y nación' },
            { serie: 'trama', texto: 'Europa y el planeta' },
          ]}
          filas={[{
            etiqueta: 'Con el modelo', total: '100 €', partes: [
              { nombre: 'A cada persona, por igual', valor: cien.persona, texto: `${numero(cien.persona, 1)} €`, serie: 'tinta' },
              { nombre: 'Vecindad, municipio, provincia, región y nación', valor: cien.dentro, texto: `${numero(cien.dentro, 1)} €`, serie: 'acento' },
              { nombre: 'Europa y el planeta', valor: cien.fuera, texto: `${numero(cien.fuera, 1)} €`, serie: 'trama' },
            ],
          }]}
          pie={<>Hoy España dedica a la Unión Europea y a la cooperación con otros países unos {millones(fueraHoy)} al año, alrededor de {numero((fueraHoy / HOY.impuestosYCotizaciones2025) * 100, 0)} € de cada 100. Con el modelo serían {numero(cien.fuera, 0)} €: {millones(pais.porEscala * 2)}.</>}
        />
        <HoyPropuesta
          titulo="Lo que se recauda"
          subtitulo="Hoy, todos los impuestos y cotizaciones (estimación para 2025); con el modelo, el impuesto único"
          leyenda={[{ serie: 'gris', texto: 'Hoy' }, { serie: 'acento', texto: 'Con el modelo' }]}
          filas={[
            { etiqueta: 'Hoy', total: millones(HOY.impuestosYCotizaciones2025), partes: [{ nombre: 'Hoy', valor: HOY.impuestosYCotizaciones2025, texto: millones(HOY.impuestosYCotizaciones2025), serie: 'gris' }] },
            { etiqueta: 'Con el modelo', total: millones(pais.recaudacion), partes: [{ nombre: 'Con el modelo', valor: pais.recaudacion, texto: millones(pais.recaudacion), serie: 'acento' }] },
          ]}
          diferencia={<>{diferencia >= 0 ? 'Recauda más' : 'Recauda menos'}: {millones(Math.abs(diferencia))} al año. Con el modelo, el {porcentaje(pais.pctPIB, 0)} del PIB; hoy, el {porcentaje((HOY.impuestosYCotizaciones2025 / ESPANA.pib) * 100, 0)}.</>}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
        <h3 className="text-lg font-[750] text-slate-900">Lo que todavía no cuadra</h3>
        <p className="mt-1 max-w-[64ch] text-[15px] text-slate-700">El modelo está en construcción. Estas tres cuentas siguen abiertas, y cada área explica los caminos que se están estudiando.</p>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          <li className="text-[15px] leading-relaxed text-slate-700">
            <strong className="block text-slate-900">Recauda menos que hoy</strong>
            {millones(Math.abs(diferencia))} menos al año con los tipos actuales del modelo. <Ir a="cuentas">Ver las cuentas</Ir>
          </li>
          <li className="text-[15px] leading-relaxed text-slate-700">
            <strong className="block text-slate-900">Los servicios recibirían menos</strong>
            De la vecindad a la nación llegarían {millones(serviciosModelo)}, frente a {millones(serviciosHoy)} de hoy (2024, pensiones incluidas).
            La sanidad pasaría de {millones(salud.hoy)} a {millones(salud.modelo)} y la educación de {millones(educacion.hoy)} a {millones(educacion.modelo)}. <Ir a="presupuestos">En qué se gasta</Ir>
          </li>
          <li className="text-[15px] leading-relaxed text-slate-700">
            <strong className="block text-slate-900">La pensión aún no está en estas cuentas</strong>
            La pensión igual al salario mínimo costaría unos {millones(COSTE_PROPUESTA / 1e6)} al año, y falta decidir de dónde sale. <Ir a="pensiones-cuentas">Las cuentas de las pensiones</Ir>
          </li>
        </ul>
      </div>
    </section>
  );
}

// ── 3. WHAT EACH AREA HOLDS (most follow this order; Justicia and Recaudación put the proposal before today) ──────────────────────────────────────────────────
export function ComoLeer() {
  const pasos: { t: string; d: string }[] = [
    { t: 'Otras propuestas', d: 'Qué proponen los partidos y otros autores, de izquierda a derecha, con su fuente.' },
    { t: 'Resumen', d: 'Las cifras que más importan, en tarjetas.' },
    { t: 'Hoy', d: 'Cómo funciona ahora, con datos publicados.' },
    { t: 'La propuesta', d: 'Qué cambiaría y cuánto costaría.' },
    { t: 'Las escalas', d: 'Qué hace cada una, de la persona al planeta.' },
    { t: 'Retos', d: 'Lo que falta por resolver o por decidir.' },
    { t: 'Fuentes', d: 'De dónde sale cada dato, con enlace.' },
  ];
  const clases: ClaseCifra[] = ['dato', 'calculo', 'propuesta'];
  return (
    <section aria-labelledby="como-leer-titulo" className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div>
        <h2 id="como-leer-titulo" className="text-xl font-[750] tracking-tight text-slate-900">Qué hay en cada área</h2>
        <p className="mt-1 text-[15px] text-slate-600">Las partes que tienen casi todas, en el orden más habitual.</p>
        <ol className="mt-4 space-y-2">
          {pasos.map((p, i) => (
            <li key={p.t} className="flex gap-3 text-[15px] leading-relaxed">
              <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white tabular-nums">{i + 1}</span>
              <span><strong className="font-semibold text-slate-900">{p.t}.</strong> <span className="text-slate-600">{p.d}</span></span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h2 className="text-xl font-[750] tracking-tight text-slate-900">Tres clases de cifra</h2>
        <p className="mt-1 text-[15px] text-slate-600">Cada tarjeta dice de cuál es, para no confundir lo que se ha medido con lo que se propone.</p>
        <ul className="mt-4 space-y-3">
          {clases.map(c => (
            <li key={c} className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-700">
              <span className="mt-0.5 w-24 shrink-0"><EtiquetaClase clase={c} /></span>
              {CLASE_CIFRA[c].ayuda}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── 4. GLOSSARY ─────────────────────────────────────────────────────────────
export function Glosario() {
  const terminos: { t: string; d: ReactNode }[] = [
    { t: 'M€ y billones', d: <>M€ son millones de euros. 1.000 M€ son mil millones, y un billón son un millón de millones: 1.000.000 M€.</> },
    { t: 'PIB', d: <>El valor de todo lo que se produce en un país en un año. El de España en 2025: {millones(ESPANA.pib)}.</> },
    { t: 'Recaudación', d: 'Todo lo que las administraciones cobran en impuestos y cotizaciones.' },
    { t: 'Cotizaciones', d: 'Lo que hoy pagan la empresa y quien trabaja a la Seguridad Social por cada sueldo. Pagan sobre todo las pensiones.' },
    { t: 'Déficit', d: 'Lo que falta en un año cuando se gasta más de lo que se ingresa.' },
    { t: 'Deuda pública', d: 'Lo que deben las administraciones por los déficits de todos los años anteriores, más sus intereses.' },
    { t: 'Escala', d: `Cada nivel en que se reparten el poder y el dinero: ${ESCALAS.map(e => e.nombre.toLowerCase()).join(', ').replace(/, ([^,]+)$/, ' y $1')}.` },
    { t: 'Tramo', d: `El porcentaje de impuesto de una compra o un sueldo: ${tipos} %, según sea lo básico, lo secundario, el ocio o el lujo, o según el tamaño de la empresa.` },
    { t: 'Tercio', d: 'Cada escala reparte lo que recibe en tres partes iguales: producir, cuidar y lo que decida su asamblea.' },
    { t: 'Dividendo', d: 'La parte de la escala de la persona: la misma cantidad para cada habitante, trabaje o no.' },
    { t: 'IPC e inflación', d: 'El IPC mide cuánto cuesta una cesta de compra típica. Si sube, el dinero ahorrado compra menos: eso es la inflación.' },
    { t: 'Crédito', d: 'Dinero que presta un banco. Hoy, la mayor parte del dinero nuevo nace cuando un banco concede un préstamo.' },
  ];
  return (
    <section aria-label="Palabras que usa el modelo" className="mt-10">
      <Mas titulo="palabras que usa el modelo, explicadas">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {terminos.map(x => (
            <div key={x.t}>
              <dt className="font-semibold text-slate-900">{x.t}</dt>
              <dd className="text-[15px] leading-relaxed text-slate-600">{x.d}</dd>
            </div>
          ))}
        </dl>
      </Mas>
    </section>
  );
}
