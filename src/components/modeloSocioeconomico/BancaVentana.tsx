// The «Banca» window of the «Modelo Público Optimizado» (Eugenio, 2026-11-12):
// «Añade un apartado que sea banca … propuestas para una banca que sea más
// inclusiva y sostenible en el tiempo … Richard Werner … que solo se conceda un
// préstamo bancario y se cree nueva masa monetaria para financiar la compra de la
// primera vivienda … los que quieren comprar una tercera vivienda no se les
// concede, y tampoco se concede a empresas … una propuesta equilibrada entre una
// economía de mercado y una economía que protege a las personas.»
// Part of the «Economía» window (Deuda · Banca · Moneda): inflation, the euro and
// the ECB live in «Moneda» (#moneda) and are linked, not repeated.
// Data and sources: src/data/banca.ts.
import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { ESCALAS, euros, numero, porcentaje } from '../../data/modeloSocioeconomico';
import { BURBUJA, ESCALAS_BANCA, FUENTES_BANCA, HOY_BANCA as H, RETOS_BANCA, TRES_CREDITOS, WERNER } from '../../data/banca';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra, Regulador, Segmentado } from './piezas';
import { cn } from '../../utils/cn';

/** A «fuente» link from this window's own source list. */
function F({ id }: { id: string }) {
  const f = FUENTES_BANCA[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

/** A link to another section or window, inside the page. */
function Ir({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900">{children}</a>;
}

/** Mortgages as a share of all credit to households and firms, one coherent series (June 2026). */
const pctHipotecas = (H.hipotecas2026 / (H.hogares2026 + H.empresas2026)) * 100;
const milesMillones = (m: number) => `${numero(m)} millones`;

export function BancaVentana() {
  return (
    <>
      <Resumen />
      <ComoNace />
      <Werner />
      <Hoy />
      <Propuesta />
      <PuedoPedir />
      <Inclusiva />
      <Escalas />
      <Retos />
      <Apartado id="banca-fuentes" titulo="Fuentes" fondo="blanco"
        entradilla="Consultadas en noviembre de 2026. Los trabajos de Werner enlazan a la revista o al repositorio de su universidad.">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {Object.entries(FUENTES_BANCA).map(([id, f]) => (
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
    <Apartado id="banca" titulo="Dinero nuevo para producir y para tu casa, no para acumular casas"
      entradilla={<>Casi todo el dinero que usamos lo crean los bancos al dar un préstamo. Hoy, buena parte de ese dinero nuevo se usa para comprar casas que ya existen, y eso sube su precio. La propuesta: que los bancos solo creen dinero para producir y para la primera y la segunda vivienda de cada persona. Para una tercera, o para una empresa que compra casas, solo dinero que ya existe.</>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra valor={porcentaje(pctHipotecas, 0)} tono="mal"
          texto={<>de todo el crédito de familias y empresas son hipotecas para comprar casa<F id="credito-2026" /></>}
          nota={<>Junio de 2026: {numero(H.hipotecas2026)} de {numero(H.hogares2026 + H.empresas2026)} millones. Cuenta propia con datos del Banco de España.</>} />
        <Cifra valor="+150 %" tono="mal"
          texto={<>subió el precio de la vivienda entre 2001 y 2007; las hipotecas, un 250 %<F id="linde-2017" /></>} />
        <Cifra valor={porcentaje(H.oficinasCaida, 0)} tono="mal"
          texto={<>de las oficinas bancarias han cerrado desde 2008. Quedan {numero(H.oficinas2025)}<F id="ivie-2026" /></>}
          nota={<>{numero(H.municipiosSinAcceso)} municipios no tienen ningún punto de atención.</>} />
        <Cifra valor="0 €" tono="bien"
          texto="de dinero recién creado para comprar una tercera vivienda o para que una empresa compre casas"
          nota="Propuesta: eso se paga con ahorro o con inversores." />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-slate-900">Lo que se mantiene: el mercado</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Los bancos siguen siendo privados, compiten entre ellos y prestan a las empresas que producen. Quien tiene ahorros puede invertirlos en lo que quiera, también en casas.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-slate-900">Lo que se protege: tu casa</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Crédito barato, con interés regulado, para la casa en la que vives y para una segunda. Y deja de ser negocio comprar casas con dinero que el banco acaba de crear.</p>
        </div>
      </div>
    </Apartado>
  );
}

// ── 2. HOW MONEY IS BORN ────────────────────────────────────────────────────
function ComoNace() {
  return (
    <Apartado id="banca-dinero" titulo="El banco no presta tu dinero: lo crea" fondo="blanco"
      entradilla={<>Cuando un banco te da un préstamo, no saca ese dinero de la cuenta de otro cliente. Escribe en tu cuenta un número nuevo. Ese dinero no existía antes. Cuando lo devuelves, desaparece. Lo explican el propio Banco de España<F id="bde-crea" />, el Banco de Inglaterra<F id="boe-2014" /> y el Bundesbank alemán<F id="bundesbank-2017" />.</>}>
      <DibujoPrestamo />
      <Mas titulo="lo que dicen los bancos centrales, con sus palabras">
        <ul className="max-w-3xl list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Banco de España:</strong> la mayor parte del dinero que usamos lo crean los bancos al prestar; al devolver la deuda, ese dinero bancario se destruye<F id="bde-crea" />.</li>
          <li><strong>Banco de Inglaterra (2014):</strong> la mayor parte del dinero lo crean los bancos al dar préstamos; no son simples intermediarios que prestan los depósitos de los ahorradores<F id="boe-2014" />.</li>
          <li><strong>Bundesbank (2017):</strong> al conceder un préstamo, el banco anota un depósito nuevo en la cuenta del cliente; no necesita tener antes ese dinero. Lo limitan el negocio, las normas de capital y el tipo de interés del banco central<F id="bundesbank-2017" />.</li>
          <li><strong>Fondo Monetario Internacional (2016):</strong> un préstamo nuevo crea un depósito nuevo del mismo importe<F id="fmi-2016" />.</li>
        </ul>
        <Mas titulo="¿entonces pueden crear todo el dinero que quieran?">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">No. Un banco presta si cree que se lo van a devolver y gana dinero con ello; tiene que cumplir normas de capital (dinero propio que responde si hay pérdidas); y el banco central encarece o abarata el crédito con el tipo de interés. Pero ninguna de esas reglas mira <em>para qué</em> se presta. Esa es la pieza que añade esta propuesta. Cómo afecta todo esto a la inflación y al euro está en <Ir href="#moneda">Moneda</Ir>.</p>
        </Mas>
      </Mas>
    </Apartado>
  );
}

/** Two bank balance sheets: before and after a 200,000 € loan. */
function DibujoPrestamo() {
  const paso = 'rounded-2xl border border-slate-200 bg-white p-5';
  return (
    <figure className="grid gap-4 md:grid-cols-3" role="img"
      aria-label="Antes del préstamo, Ana tiene 0 euros. El banco le concede 200.000 euros: anota 200.000 en lo que Ana le debe y 200.000 en la cuenta de Ana. Ana paga la casa y el dinero pasa a la cuenta del vendedor. Cuando Ana devuelve el préstamo, los dos apuntes desaparecen.">
      <div className={paso}>
        <p className="text-sm font-semibold text-slate-500">1. Ana pide una hipoteca</p>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-700">En su cuenta tiene <strong className="tabular-nums">0 €</strong>. Pide {euros(200_000)} para una casa.</p>
      </div>
      <div className={cn(paso, 'border-slate-900')}>
        <p className="text-sm font-semibold text-slate-500">2. El banco escribe dos números</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-slate-500">Ana debe al banco</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{euros(200_000)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-emerald-800">Cuenta de Ana</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-800">+ {euros(200_000)}</p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">Ningún otro cliente tiene menos. Ese dinero es <strong>nuevo</strong>.</p>
      </div>
      <div className={paso}>
        <p className="text-sm font-semibold text-slate-500">3. Paga la casa, y años después, devuelve</p>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-700">El dinero pasa a la cuenta del vendedor y sigue circulando. Cuando Ana devuelve el préstamo, los dos números se borran y el dinero desaparece.</p>
      </div>
      <figcaption className="text-sm leading-relaxed text-slate-500 md:col-span-3">Por eso importa tanto <strong>para qué</strong> se presta: cada préstamo pone dinero nuevo a perseguir algo. Si persigue casas que ya existen, sube su precio.</figcaption>
    </figure>
  );
}

// ── 3. WERNER ───────────────────────────────────────────────────────────────
function Werner() {
  return (
    <Apartado id="banca-werner" titulo="Richard Werner: no todo el crédito es igual"
      entradilla={<>Richard Werner es un economista alemán que ha trabajado en Japón y en universidades británicas. Fue el primero en comprobar, mirando las cuentas de un banco por dentro, que el dinero se crea al prestar. Y su idea central es sencilla: lo que importa es <strong>para qué</strong> se usa el dinero nuevo.</>}>
      <h3 className="text-xl font-bold text-slate-900">Tres tipos de crédito, tres efectos</h3>
      <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-600">Es su «teoría cuantitativa del crédito», de los años 90, que explica así en su trabajo de 2021<F id="werner-2021" />:</p>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {TRES_CREDITOS.map(c => (
          <li key={c.id} className={cn('rounded-2xl border bg-white p-5', c.tono === 'bien' ? 'border-emerald-300' : c.tono === 'mal' ? 'border-rose-300' : 'border-amber-300')}>
            <p className={cn('text-lg font-bold', c.tono === 'bien' ? 'text-emerald-800' : c.tono === 'mal' ? 'text-rose-700' : 'text-amber-800')}>{c.t}</p>
            <p className="mt-1 text-sm text-slate-500">{c.ejemplo}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{c.efecto}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        Werner sostiene que el crédito a empresas que producen genera crecimiento <strong>sin inflación</strong>, porque el dinero nuevo llega junto con más bienes y servicios. La inflación aparece cuando el dinero nuevo va a consumir; y las burbujas, cuando va a comprar casas, suelo o acciones que ya existen. Qué es la inflación y quién la decide en el euro, en <Ir href="#moneda">Moneda</Ir>.
      </p>

      <Mas titulo="qué propone Werner para el sistema bancario">
        <ul className="max-w-3xl list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Orientar el crédito.</strong> El banco central debería vigilar cuánto crédito crece y a qué sectores va, frenar el que no produce y favorecer el que sí. Pone como ejemplo a Japón en los años 60 y a Corea, Taiwán y China<F id="werner-2021" />. En Japón se llamaba «guía de ventana»: el Banco de Japón decía a cada banco cuánto podía prestar<F id="werner-libros" />.</li>
          <li><strong>Limitar el crédito para comprar activos.</strong> Recomienda vigilar el crédito para comprar activos frente al resto y actuar antes de que se dispare, porque es la señal de una burbuja<F id="werner-2021" />.</li>
          <li><strong>Muchos bancos pequeños y locales.</strong> Señala que Alemania tiene miles de bancos pequeños con sede en su territorio, que prestan más a familias y pequeñas empresas y menos para comprar activos<F id="werner-2021" />. Los países con bancos así y con crédito orientado han crecido de forma más estable<F id="werner-2016" />.</li>
        </ul>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">La regla de contar viviendas de esta propuesta no es de Werner: es de este modelo, inspirada en su idea. Werner habla de orientar y limitar el crédito por sectores, no de un número de casas por persona.</p>
      </Mas>

      <Mas titulo={`sus trabajos, uno a uno (${WERNER.length})`}>
        <ol className="grid gap-4 md:grid-cols-2">
          {WERNER.map(w => (
            <li key={w.titulo} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold tabular-nums text-slate-500">{w.ano}</p>
              <p className="mt-1 font-bold leading-snug text-slate-900">
                <a href={FUENTES_BANCA[w.fuente].url} target="_blank" rel="noreferrer" className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">{w.titulo}</a>
              </p>
              <p className="mt-1 text-sm text-slate-500">{w.donde}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{w.que}</p>
            </li>
          ))}
        </ol>
      </Mas>
    </Apartado>
  );
}

// ── 4. SPAIN TODAY ──────────────────────────────────────────────────────────
function Hoy() {
  return (
    <Apartado id="banca-hoy" titulo="En España, el crédito va sobre todo a comprar casas" fondo="blanco"
      entradilla="Los bancos prestan mucho más para comprar vivienda que para casi cualquier otra cosa. Cuando ese crédito se dispara, los precios lo siguen, como pasó antes de 2008.">
      <div className="grid gap-4 md:grid-cols-3">
        <Tarjeta t="Hipotecas: el préstamo más grande">
          Las familias deben <strong>{milesMillones(H.hipotecas2026)} de euros</strong> por comprar su casa, de {milesMillones(H.hogares2026)} que deben en total (junio de 2026). Las empresas deben {milesMillones(H.empresas2026)}<F id="credito-2026" />. Las hipotecas son el {porcentaje(pctHipotecas, 0)} del total.
        </Tarjeta>
        <Tarjeta t="Constructoras e inmobiliarias">
          A finales de 2023 debían unos <strong>{milesMillones(H.promotor2023)}</strong>, el {porcentaje(H.promotorPct, 1)} del crédito al sector privado: un 80 % menos que en 2008<F id="promotor-2023" />.
        </Tarjeta>
        <Tarjeta t="Los precios vuelven a correr">
          En 2025 la vivienda subió un <strong>{porcentaje(H.precios2025, 1)}</strong>, y las hipotecas nuevas crecieron con fuerza<F id="ief-2026" />.
        </Tarjeta>
      </div>

      <Burbuja />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Tarjeta t="Menos dueños, más casas por dueño">
          En 2008, 79 de cada 100 hogares eran dueños de su casa; en 2022, 64. Las viviendas en manos de quien tiene más de diez pasaron de {numero(H.viviendasGrandes2008)} a <strong>{numero(H.viviendasGrandes2025)}</strong> entre 2008 y 2025<F id="concentracion-vivienda" />.
        </Tarjeta>
        <Tarjeta t="Pocos bancos grandes">
          Los cinco mayores bancos tienen el <strong>{porcentaje(H.cr5, 1)}</strong> del mercado (2023), una de las cifras más altas entre los grandes países de la Unión Europea<F id="cr5" />.
        </Tarjeta>
        <Tarjeta t="Pueblos sin banco">
          Quedan {numero(H.oficinas2025)} oficinas, un {H.oficinasCaida} % menos que en 2008. {numero(H.municipiosSinAcceso)} municipios no tienen ningún punto de atención, y el {porcentaje(H.poblacionSinOficina, 2)} de la población vive sin oficina en su pueblo<F id="ivie-2026" />.
        </Tarjeta>
      </div>
      <Mas titulo="por qué otras cifras dicen un 42,5 %">
        <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">El Banco de España, en su informe de estabilidad, cuenta solo los préstamos de los bancos a familias y empresas, y ahí las hipotecas para vivienda son el {porcentaje(H.hipotecasPct, 1)} (junio de 2025)<F id="ief-2025" />. La cifra de arriba ({porcentaje(pctHipotecas, 0)}) usa otra serie, la de todo el crédito de familias y empresas de junio de 2026. Miden cosas distintas; las dos dicen que la vivienda se lleva la mayor parte.</p>
      </Mas>
      <Mas titulo="qué puede hacer hoy el Banco de España">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Colchón de capital anticíclico:</strong> obliga a los bancos a guardar más capital propio cuando el crédito crece rápido, para aguantar si luego llegan pérdidas. Lo subió al {H.colchon} %, exigible desde el 1 de octubre de 2026<F id="ccyb-2025" />.</li>
          <li><strong>Límites a las hipotecas:</strong> un máximo de préstamo según el valor de la casa o según lo que gana la persona. En España no hay ninguno en vigor; el Banco de España está estudiando cómo aplicarlos<F id="ief-2026" />.</li>
          <li><strong>Lo que no puede hacer:</strong> decidir los tipos de interés del euro, que fija el Banco Central Europeo. Está explicado en <Ir href="#moneda">Moneda</Ir>.</li>
        </ul>
      </Mas>
    </Apartado>
  );
}

/** Growth 2001–2007: GDP against credit and house prices (one scale, direct labels). */
function Burbuja() {
  const max = Math.max(...BURBUJA.map(b => b.v));
  return (
    <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Cuánto creció cada cosa entre 2001 y 2007</figcaption>
      <p className="mt-1 text-sm text-slate-600">Lo que produce el país creció un 67 %. El crédito, de tres a ocho veces más. Y el precio de las casas lo siguió.</p>
      <div className="mt-4 space-y-2" role="img" aria-label={BURBUJA.map(b => `${b.t}: más ${b.v} %`).join('; ')}>
        {BURBUJA.map(b => (
          <div key={b.t} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[260px_1fr]">
            <span className="text-sm text-slate-700">{b.t}</span>
            <span className="flex items-center gap-2">
              <span className={cn('h-4 shrink-0 rounded-r-[4px]', b.tono === 'pib' ? 'bg-slate-400' : b.tono === 'precio' ? 'bg-amber-600' : 'bg-rose-700')}
                style={{ width: `${(b.v / max) * 72}%` }} />
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800">+{b.v} %</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Datos del gobernador del Banco de España ante el Congreso en 2017. El precio de la vivienda se multiplicó por 2,5 en euros de cada año (+150 %) y por 2 descontando la inflación<F id="linde-2017" />.</p>
    </figure>
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

// ── 5. THE PROPOSAL ─────────────────────────────────────────────────────────
function Propuesta() {
  const reglas = [
    { si: true, t: 'Empresas que producen', d: 'Crédito con dinero nuevo para fábricas, talleres, granjas, tecnología, energía… y para construir viviendas nuevas, porque eso también es producir.' },
    { si: true, t: 'Tu primera vivienda', d: 'Crédito con dinero nuevo, a un interés regulado. Propuesta: como máximo, lo que paga el Estado por su deuda a diez años más un margen fijo que pone la ley. Es la casa en la que vives.' },
    { si: true, t: 'Tu segunda vivienda', d: 'También con dinero nuevo e interés regulado, para quien necesita otra casa (por trabajo, por la familia, en el pueblo).' },
    { si: false, t: 'La tercera vivienda y siguientes', d: 'Sin dinero nuevo. Se compra con ahorro propio o con dinero que otras personas ya tienen y prestan o invierten.' },
    { si: false, t: 'Empresas que compran casas o suelo', d: 'Sin dinero nuevo. Fondos y sociedades buscan inversores reales y dinero que ya existe.' },
  ];
  return (
    <Apartado id="banca-propuesta" titulo="Crear dinero para producir y para vivir, no para acumular"
      entradilla="Los bancos siguen prestando y siguen siendo privados. Lo que cambia es para qué pueden crear dinero nuevo. Comprar casas que ya existen con dinero recién creado sube su precio para todos, y deja muchas casas en pocas manos. Ese es el negocio que la propuesta saca de la ecuación.">
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {reglas.map(r => (
          <li key={r.t} className={cn('flex gap-3 rounded-2xl border bg-white p-5', r.si ? 'border-emerald-300' : 'border-rose-300')}>
            <span aria-hidden className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', r.si ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700')}>
              {r.si ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            <div>
              <p className="font-bold text-slate-900"><span className="sr-only">{r.si ? 'Sí: ' : 'No: '}</span>{r.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Tarjeta t="Por qué reduce la desigualdad">
          Quien no tiene casa sigue teniendo crédito barato para comprarla. Quien ya tiene dos puede comprar más, pero con su dinero, no con dinero creado para la ocasión. Así deja de competir con ventaja frente a las familias, y las casas dejan de subir solo porque haya crédito.
        </Tarjeta>
        <Tarjeta t="Por qué es un equilibrio">
          No se prohíbe invertir en vivienda ni se fija el precio de las casas: el mercado sigue funcionando. Lo que se protege es el acceso a la casa en la que se vive. Es lo que busca este modelo: una economía de mercado que protege a las personas.
        </Tarjeta>
      </div>

      <Mas titulo="cómo se presta «dinero que ya existe»">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>Hay tres formas, y las tres solo mueven dinero de una cuenta a otra, sin crear más:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Ahorro propio:</strong> pagar la casa con lo que ya tienes.</li>
            <li><strong>Inversores:</strong> una empresa o un fondo reúne dinero de personas que lo ponen a cambio de una parte del negocio. Si va mal, pierden ellos.</li>
            <li><strong>Ahorro prestado a plazo:</strong> un ahorrador deja su dinero al banco para ese préstamo y no puede usarlo mientras dure, como en un depósito a plazo. El banco hace de intermediario, no de creador.</li>
          </ul>
          <p>Esto se parece a la idea de financiar más con capital (socios que comparten el riesgo) y menos con deuda: menos pagos fijos, y las pérdidas las asume quien invierte, no el banco ni el Estado.</p>
        </div>
      </Mas>

      <Mas titulo="las herramientas para que funcione">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Un registro de viviendas por persona,</strong> cruzando Catastro, Registro de la Propiedad y Hacienda, que el banco consulta antes de prestar.</li>
          <li><strong>Un tope al préstamo de la primera y la segunda casa,</strong> según su precio y según lo que gana la persona, para que el crédito barato no se convierta en otra burbuja. El Banco de España ya puede usar este tipo de límite<F id="ief-2026" />.</li>
          <li><strong>Más capital propio a los bancos cuando el crédito para comprar casas crece demasiado,</strong> como el colchón anticíclico que ya existe<F id="ccyb-2025" />.</li>
          <li><strong>Un límite a cuánto puede prestar un banco a un solo sector,</strong> para que no vuelva a pasar lo de 2001–2007, cuando el crédito a constructoras e inmobiliarias se multiplicó por seis<F id="linde-2017" />.</li>
        </ul>
      </Mas>
    </Apartado>
  );
}

// ── 6. CAN I GET A LOAN? ────────────────────────────────────────────────────
type Quien = 'persona' | 'empresa';
type ParaPersona = 'vivienda' | 'negocio' | 'consumo';
type ParaEmpresa = 'producir' | 'construir' | 'comprar';

function PuedoPedir() {
  const [quien, setQuien] = useState<Quien>('persona');
  const [paraP, setParaP] = useState<ParaPersona>('vivienda');
  const [paraE, setParaE] = useState<ParaEmpresa>('producir');
  const [casas, setCasas] = useState(0);

  let tono: 'si' | 'no' | 'abierto' = 'si';
  let titulo = '';
  let texto: ReactNode = '';
  if (quien === 'persona' && paraP === 'vivienda') {
    if (casas === 0) { titulo = 'Sí, con dinero nuevo e interés regulado'; texto = 'Es tu primera vivienda. El banco puede crear el dinero, con el interés máximo que fija la ley y un tope según el precio de la casa y lo que ganas.'; }
    else if (casas === 1) { titulo = 'Sí, con dinero nuevo e interés regulado'; texto = 'Es tu segunda vivienda. Se permite con las mismas reglas que la primera.'; }
    else { tono = 'no'; titulo = 'No con dinero nuevo'; texto = `Ya tienes ${casas >= 5 ? '5 o más' : casas} viviendas. Puedes comprar otra con tus ahorros o con dinero que alguien ya tiene y te presta o invierte contigo, pero el banco no crea dinero para ella.`; }
  } else if (quien === 'persona' && paraP === 'negocio') {
    titulo = 'Sí, con dinero nuevo'; texto = 'Abrir o ampliar un negocio que produce bienes o servicios es justo lo que el crédito nuevo debe financiar. El banco decide, como hoy, si el proyecto es viable.';
  } else if (quien === 'persona') {
    tono = 'abierto'; titulo = 'Por decidir'; texto = 'Este modelo todavía no dice nada del crédito al consumo. Werner dice que sube los precios. Queda por decidir si se limita y cómo.';
  } else if (paraE === 'producir') {
    titulo = 'Sí, con dinero nuevo'; texto = 'Maquinaria, tecnología, energía, campo, servicios: crédito para producir. Según Werner, hace crecer la economía sin subir los precios.';
  } else if (paraE === 'construir') {
    titulo = 'Sí, con dinero nuevo'; texto = 'Construir viviendas nuevas es producir: añade casas. El préstamo se da para la obra y se comprueba que la casa se levanta.';
  } else {
    tono = 'no'; titulo = 'No con dinero nuevo'; texto = 'Comprar viviendas o suelo que ya existen no añade nada: solo sube su precio. La empresa tendrá que usar su capital o buscar inversores.';
  }

  return (
    <Apartado id="banca-vivienda" titulo="¿Puedo pedir un préstamo?" fondo="blanco"
      entradilla="Elige quién lo pide y para qué. Es la regla de la propuesta, contada caso a caso. Une las dos partes de la idea: la banca y la vivienda.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">¿Quién lo pide?</p>
            <Segmentado<Quien> etiqueta="Quién pide el préstamo" valor={quien} onChange={setQuien}
              opciones={[{ id: 'persona', texto: 'Una persona' }, { id: 'empresa', texto: 'Una empresa' }]} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">¿Para qué?</p>
            {quien === 'persona'
              ? <Segmentado<ParaPersona> etiqueta="Para qué es el préstamo" valor={paraP} onChange={setParaP}
                  opciones={[{ id: 'vivienda', texto: 'Comprar casa' }, { id: 'negocio', texto: 'Un negocio' }, { id: 'consumo', texto: 'Consumo' }]} />
              : <Segmentado<ParaEmpresa> etiqueta="Para qué es el préstamo" valor={paraE} onChange={setParaE}
                  opciones={[{ id: 'producir', texto: 'Producir' }, { id: 'construir', texto: 'Construir casas' }, { id: 'comprar', texto: 'Comprar casas o suelo' }]} />}
          </div>
          {quien === 'persona' && paraP === 'vivienda' && (
            <div className="max-w-md">
              <Regulador etiqueta="¿Cuántas viviendas tienes ya?" valor={casas} min={0} max={5} paso={1}
                mostrar={casas >= 5 ? '5 o más' : String(casas)} onChange={setCasas}
                ayuda="Contando las que tengas a través de empresas o a medias." />
            </div>
          )}
        </div>
        <div aria-live="polite" className={cn('mt-5 flex gap-3 rounded-xl p-4',
          tono === 'si' ? 'bg-emerald-50' : tono === 'no' ? 'bg-rose-50' : 'bg-amber-50')}>
          <span aria-hidden className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            tono === 'si' ? 'bg-emerald-700 text-white' : tono === 'no' ? 'bg-rose-700 text-white' : 'bg-amber-600 text-white')}>
            {tono === 'si' ? <Check className="h-4 w-4" /> : tono === 'no' ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
          </span>
          <div>
            <p className={cn('text-lg font-bold', tono === 'si' ? 'text-emerald-800' : tono === 'no' ? 'text-rose-700' : 'text-amber-800')}>{titulo}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{texto}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">
        Hoy no existe esta regla: cada banco decide el interés y a quién presta, y una empresa puede pedir una hipoteca para comprar casas como una familia. Desde 2023 el Estado avala el 20 % de la hipoteca de la primera vivienda a menores de 35 años y familias con hijos, ampliado hasta 2027<F id="ico-avales" />. La parte de la vivienda está en la ventana <Ir href="#vivienda-propuesta">Vivienda</Ir>.
      </p>
    </Apartado>
  );
}

// ── 7. INCLUSIVE BANKING ────────────────────────────────────────────────────
function Inclusiva() {
  const ideas = [
    { t: 'Cuenta básica gratis para todos', hoy: <>Existe la «cuenta de pago básica»: todos los bancos deben ofrecerla, cobrando como mucho 3 € al mes, y gratis para personas vulnerables<F id="cuenta-basica" />.</>, propuesta: 'Que sea gratis para cualquiera, sin condiciones, con tarjeta, transferencias y recibos.' },
    { t: 'Atención en persona', hoy: <>Desde 2022 los bancos se comprometieron a dar horario ampliado y atención preferente a los mayores<F id="protocolo-mayores" />, y algún punto de acceso en todos los municipios: oficina, cajero, agente o furgoneta<F id="presencial-2022" />.</>, propuesta: 'Que sea un derecho por ley, no un compromiso voluntario, y que el municipio pueda exigirlo.' },
    { t: 'Bancos locales y cooperativos', hoy: <>En Alemania hay {H.sparkassen} cajas de ahorro públicas locales y {H.cooperativas} cooperativas de crédito, cada una en su territorio<F id="bundesbank-2025" />. En España, tras la crisis, casi todas las cajas desaparecieron o se hicieron bancos.</>, propuesta: 'Facilitar que nazcan cajas y cooperativas de crédito en cada comarca, que presten a quien está cerca.' },
    { t: 'Banca pública', hoy: <>El ICO (Instituto de Crédito Oficial) es el banco público del Estado: presta y avala a empresas y hoy también hipotecas de jóvenes<F id="ico-avales" />.</>, propuesta: 'Que la banca pública preste solo para producir y para vivienda nueva, con las mismas reglas que los demás.' },
    { t: 'Banca ética', hoy: <>En España trabajan Triodos Bank, que presta a proyectos sociales, culturales, de agricultura ecológica y de energía renovable, no financia armas y publica a quién presta, y Fiare Banca Ética, una cooperativa gobernada por sus socios<F id="bancaetica" />. Son pequeños.</>, propuesta: 'Que publicar a quién y para qué se presta sea obligatorio para todos los bancos, como ya hacen ellos.' },
    { t: 'Crédito verde', hoy: <>El ICO emite «bonos verdes»: pide dinero a inversores para prestarlo a empresas que hacen la transición ecológica, por ejemplo 500 millones en 2022<F id="ico-verde" />. Es dinero que ya existe, de inversores.</>, propuesta: 'Que el crédito para producir de forma limpia (energía, rehabilitar casas para que gasten menos) tenga prioridad dentro del crédito productivo.' },
  ];
  return (
    <Apartado id="banca-inclusiva" titulo="Una banca para todos, y que dure"
      entradilla="Inclusiva quiere decir que nadie se quede sin cuenta ni sin atención, viva donde viva y tenga la edad que tenga. Sostenible quiere decir que no vuelva a hacer falta rescatar a los bancos, y que el crédito cuide también del planeta.">
      <ul className="grid gap-4 md:grid-cols-2">
        {ideas.map(i => (
          <li key={i.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-bold text-slate-900">{i.t}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">Hoy: </span>{i.hoy}</p>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-emerald-800"><span className="font-semibold">Propuesta: </span>{i.propuesta}</p>
          </li>
        ))}
      </ul>
      <Mas titulo="por qué muchos bancos pequeños son más estables">
        <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">Un banco pequeño y local conoce a sus clientes y presta a empresas y familias de su zona. Werner señala que en Alemania, con miles de bancos así, se presta menos para comprar activos y más a pequeñas empresas<F id="werner-2021" />. Y si un banco pequeño quiebra, no arrastra a todo el país. Hoy en España los cinco mayores tienen casi el 70 % del mercado<F id="cr5" />.</p>
      </Mas>
    </Apartado>
  );
}

// ── 8. THE EIGHT SCALES ─────────────────────────────────────────────────────
function Escalas() {
  return (
    <Apartado id="banca-escalas" titulo="Qué hace cada escala" fondo="blanco"
      entradilla="De la persona al planeta, en una frase cada una. Es la propuesta para el modelo, no lo que hay hoy.">
      <ol className="grid gap-4 lg:grid-cols-2">
        {ESCALAS.map(e => {
          const p = ESCALAS_BANCA[e.id];
          if (!p) return null;
          return (
            <li key={e.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Muestra color={e.color} className="h-4 w-4" />{e.nombre}</h3>
              <p className="mt-2 text-[17px] leading-snug text-slate-800">{p.hace}</p>
              <Mas titulo="qué más hace" className="mt-3">
                <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">{p.detalle.map(d => <li key={d}>{d}</li>)}</ul>
              </Mas>
            </li>
          );
        })}
      </ol>
    </Apartado>
  );
}

// ── 9. WHAT IS STILL OPEN ───────────────────────────────────────────────────
function Retos() {
  return (
    <Apartado id="banca-retos" titulo="Lo que falta por resolver"
      entradilla="La propuesta tiene huecos y riesgos. Estos son los que hay que decidir antes de que funcione.">
      <ul className="grid gap-4 md:grid-cols-2">
        {RETOS_BANCA.map(r => (
          <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900">{r.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
            {r.enlace && <p className="mt-2 text-[15px]"><Ir href={r.enlace.href}>{r.enlace.texto}</Ir></p>}
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-500">Lo que cuesta la casa con el impuesto del modelo está en <Ir href="#vivienda-propuesta">Vivienda</Ir>; la inflación, el euro y el Banco Central Europeo, en <Ir href="#moneda">Moneda</Ir>.</p>
    </Apartado>
  );
}

