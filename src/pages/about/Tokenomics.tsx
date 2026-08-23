import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TokenomicsLibroBlanco from './TokenomicsLibroBlanco';
import TokenomicsTareas from './TokenomicsTareas';
import {
  Coins, HardDrive, Cpu, Sparkles, ShoppingCart, ShieldCheck, Ban,
  BookOpenCheck, Server, ArrowRight, Scale, CircleDot, Activity,
} from 'lucide-react';

// ============================================================================
// TOKENOMICS DE HUMANITY.WIKI (2026-08-22, Eugenio / Programador 7)
// ============================================================================
// The PUBLIC page that explains the platform's point: what exists today, what
// is declared intention, and what the point will never be. Eugenio asked for
// the tokenomics to be public; the Dashboard (relaying Agente 0) added the
// hard constraint this file is written around: a public page is indexed,
// shared and quoted, so IT MUST NOT PRESENT INTENTION AS FACT. Every claim
// here is either something the code does today, or explicitly labelled
// «intención declarada».
//
// What is true today, checked in source before writing this page:
//   - Points exist as an internal balance (`users.puntos`, migration 0026),
//     with a movement ledger (`movimientos_puntos`). No blockchain anywhere.
//   - They are OBTAINED: welcome gift, cents per public-publication view,
//     purchase via Stripe, admin adjustment.
//   - Almost nothing SPENDS them yet: the uses this page lists (storage,
//     compute, advanced AI, discounts) are the declared direction, being
//     built. The page says so with those words.
//   - No token has been issued on any chain, and none is promised.
//
// THE DESIGN DECISION (agreed with Eugenio 2026-08-22): the point is a
// UTILITY credit — a right to USE platform services — and its anchor to the
// Naturaverso hardware is by CAPACITY PRODUCED (GB·month, compute-hours),
// never by ownership share. «1 token = X% of a server» would make it an
// asset-referenced/security token under MiCA (licences, reserves,
// prospectus); «1 token = what that server produces» keeps the same physical
// anchor on the prepaid-service side. Same reason the reference value is a
// service basket and not a fixed euro peg: a pegged circulating token is
// e-money (EMT).
// ============================================================================

/** The service basket the point is INTENDED to buy. Declared intention, not
 *  current fact — the page labels it as such. Phase B turns this table into
 *  data served by a public prices API. */
const CESTA = [
  { icono: HardDrive, servicio: 'Almacenamiento en la nube', unidad: 'gigabytes al mes', nota: 'ficheros, imágenes y copias de tus páginas' },
  { icono: Cpu, servicio: 'Procesamiento en la nube', unidad: 'horas de cómputo', nota: 'mapas, importaciones y trabajos pesados' },
  { icono: Sparkles, servicio: 'Modelos avanzados de IA', unidad: 'acciones asistidas', nota: 'según el modelo elegido y su tarifa publicada' },
  { icono: ShoppingCart, servicio: 'Descuentos en el mercado', unidad: 'parte del precio', nota: 'en productos y servicios de la comunidad' },
];

const NO_ES = [
  { titulo: 'No es una inversión', texto: 'No promete revalorizarse ni da derecho a beneficios. Existe para usarse dentro de la plataforma.' },
  { titulo: 'No es propiedad de hardware', texto: 'El diseño ancla el punto a la capacidad que producen las máquinas (guardar, procesar), nunca a poseer un porcentaje de un servidor.' },
  { titulo: 'No es dinero electrónico ni un criptoactivo', texto: 'No circula fuera de la plataforma y hoy no existe ningún token emitido en ninguna cadena.' },
  // Hasta el 2026-08-23 esta tarjeta decía «No es transferible entre personas».
  // Eugenio decidió que sí lo sea (piloto): se pueden enviar puntos a otra
  // cuenta de la plataforma y pagar con ellos en el mercado. Lo que sigue sin
  // existir, y es la negación que de verdad sostiene el diseño, es el canje.
  { titulo: 'No se canjea por euros', texto: 'Los puntos se pueden enviar a otras personas de la plataforma y gastar en ella (servicios y mercado), pero nunca se cambian de vuelta a euros: es lo que los mantiene como vale de uso y no como medio de pago.' },
];

const FASES = [
  {
    etiqueta: 'Fase A · Hoy',
    titulo: 'Puntos internos con libro de movimientos',
    texto: 'Lo único que existe hoy. El saldo vive en la base de datos de la plataforma, sin blockchain. Los puntos se obtienen (alta, vistas de tus publicaciones, compra) y cada movimiento queda anotado con su motivo. Los usos descritos arriba se están construyendo y se irán activando uno a uno.',
    estado: 'activa' as const,
  },
  {
    etiqueta: 'Fase B · Intención',
    titulo: 'Valor expresado en unidades de servicio',
    texto: 'El punto dejaría de explicarse en euros y pasaría a explicarse en lo que compra: la cesta de servicio de arriba, con precios publicados en una API pública que cualquiera pueda consultar. No está construido; es la dirección declarada.',
    estado: 'prevista' as const,
  },
  {
    etiqueta: 'Fase C · Condicionada',
    titulo: 'Token de utilidad anotado en cadena',
    texto: 'Hoy no existe y no hay fecha. Solo se plantearía cuando al menos tres instituciones independientes operasen un nodo, y con la regla europea de protección de datos por delante: en una cadena nunca viajarían datos personales — ni cifrados ni en forma de huella —, solo anotaciones de capacidad.',
    estado: 'condicionada' as const,
  },
];

/** El icono de cada servicio de la API de precios, por su clave estable. */
const ICONO_SERVICIO: Record<string, typeof HardDrive> = {
  almacenamiento_gb_mes: HardDrive,
  computo_hora: Cpu,
  ia_accion_estandar: Sparkles,
};

export default function Tokenomics() {
  // LAS DOS SUBPÁGINAS SON VISTAS DE ESTA, NO RUTAS APARTE (2026-08-22). Las
  // páginas de información se montan desde `paginasInfo.ts` — una entrada,
  // una ruta, una línea del menú (i) — y el libro blanco y las tareas no
  // merecen línea de menú propia: son documentos colgados de esta página. Así
  // que viven en `?vista=libro-blanco` y `?vista=tareas`, el patrón de la casa
  // para «una forma distinta de mirar el mismo sitio» (src/pages/CLAUDE.md),
  // y ningún fichero compartido se toca para tenerlas.
  const [params] = useSearchParams();
  const vista = params.get('vista');
  if (vista === 'libro-blanco') return <TokenomicsLibroBlanco />;
  if (vista === 'tareas') return <TokenomicsTareas />;

  // LOS PRECIOS Y LA CIRCULACIÓN VIENEN DE LA API PÚBLICA (2026-08-22, rama A
  // decidida): /api/tokenomics/precios y /api/tokenomics/resumen no piden
  // sesión — la transparencia del punto no puede depender de tener cuenta.
  // Si la API no contesta, la página enseña la cesta declarada de siempre:
  // peor un dato orientativo que una sección vacía sin explicación.
  const [precios, setPrecios] = useState<{ servicio: string; nombre: string; unidad: string; puntos: number; nota?: string }[] | null>(null);
  const [resumen, setResumen] = useState<{ circulacion: number; cuentas: number } | null>(null);
  useEffect(() => {
    fetch('/api/tokenomics/precios').then(r => r.json())
      .then(j => Array.isArray(j?.vigentes) && j.vigentes.length && setPrecios(j.vigentes)).catch(() => {});
    fetch('/api/tokenomics/resumen').then(r => r.json())
      .then(j => typeof j?.circulacion === 'number' && setResumen(j)).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
          <Coins className="w-3.5 h-3.5" /> Tokenomics
        </p>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display mb-4">El punto de Humanity.wiki</h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
          Un <strong className="text-slate-900">crédito de uso</strong> de los servicios de la
          plataforma. Esta página cuenta dos cosas y las separa siempre:
          lo que el punto <strong className="text-slate-900">es hoy</strong>, y la dirección
          que declaramos para él. Lo que es intención está marcado como intención.
        </p>
      </div>

      {/* ── Qué existe hoy ─────────────────────────────────────────────── */}
      <section className="p-6 bg-emerald-50/60 border border-emerald-100 rounded-3xl">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 font-display mb-3">
          <CircleDot className="w-5 h-5 text-emerald-600" /> Lo que existe hoy
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          Un sistema de puntos <strong>interno</strong>, sin blockchain. Al crear tu cuenta recibes
          un regalo de bienvenida; ganas céntimos de punto cuando otras personas ven tus
          publicaciones públicas; puedes comprar más; desde el 23 de agosto de 2026 puedes
          <strong> enviarlos a otras personas</strong> de la plataforma (piloto, con tope diario) y
          <strong> pagar con ellos en el mercado</strong> cuando el vendedor los acepta — el vendedor
          cobra en puntos con la comisión de la plataforma a la mitad; y cada movimiento queda anotado con su
          motivo en tu libro de movimientos. Los usos del punto — almacenamiento, cómputo,
          modelos avanzados de IA, descuentos — <strong>se están construyendo</strong>: se irán
          activando uno a uno y esta página lo reflejará cuando cada uno sea real.
        </p>
      </section>

      {/* ── Qué comprará un punto (intención) ──────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-slate-900 font-display">Qué comprará un punto</h2>
          <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-wide">Intención declarada</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mb-6">
          Esta es la <strong>cesta de servicio</strong> hacia la que va el punto. La unidad de
          referencia es sencilla: <strong>1 punto = una tarea simple con el modelo de IA más
          barato</strong>; el resto de la cesta se expresa como múltiplo de esa unidad. Los precios se
          publican en una API abierta (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">/api/tokenomics/precios</code>,
          con su historia entera) y son orientativos hasta que cada servicio empiece a cobrar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {precios
            ? precios.map(({ servicio, nombre, unidad, puntos, nota }) => {
                const Icono = ICONO_SERVICIO[servicio] || Sparkles;
                return (
                  <div key={servicio} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                      <Icono className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{nombre}</h3>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">
                        {Number(puntos).toLocaleString('es-ES', { maximumFractionDigits: 4 })} puntos · {unidad}
                      </p>
                      {nota && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{nota}</p>}
                    </div>
                  </div>
                );
              })
            : CESTA.map(({ icono: Icono, servicio, unidad, nota }) => (
                <div key={servicio} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                    <Icono className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{servicio}</h3>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">{unidad}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{nota}</p>
                  </div>
                </div>
              ))}
          {precios && (
            /* El descuento del mercado no es un precio por unidad: se queda
               como pieza declarada de la cesta, fuera de la tabla de precios. */
            <div className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Descuentos en el mercado</h3>
                <p className="text-sm font-black text-emerald-700 mt-0.5">parte del precio</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">en productos y servicios de la comunidad</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Los números, en vivo ────────────────────────────────────────── */}
      {resumen && (
        <section className="p-6 bg-white border border-slate-200 rounded-3xl">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 font-display mb-4">
            <Activity className="w-5 h-5 text-emerald-600" /> Los números, en vivo
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <p className="text-3xl font-black text-slate-900">{resumen.circulacion.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-1">puntos en circulación</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{resumen.cuentas.toLocaleString('es-ES')}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mt-1">cuentas con movimientos</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mt-4 max-w-2xl">
            Salen del libro de movimientos, no de un contador aparte, y cualquiera puede
            consultarlos sin cuenta en <code className="bg-slate-100 px-1 py-0.5 rounded">/api/tokenomics/resumen</code>.
          </p>
        </section>
      )}

      {/* ── Cómo se repartirán los puntos ───────────────────────────────── */}
      {/* (2026-08-22, Eugenio: «cada usuario verificado obtiene X puntos al
          mes… X = 50% de la recaudación mensual del ecommerce / N usuarios
          verificados». La mejora acordada: el bote decide CUÁNTOS puntos se
          emiten cada mes, nunca cuánto VALE cada punto — el valor sigue
          siendo la cesta. Prometer que el valor del token es una parte de los
          ingresos lo convertiría en una participación (security/ART) y
          desharía la rama A recién decidida.) */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-slate-900 font-display">Cómo se repartirán los puntos</h2>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide">Decidido · en construcción</span>
        </div>
        <div className="space-y-3">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">El bote mensual</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada mes hay un <strong>bote de reparto</strong> para las personas verificadas.
              <strong> Al principio es fijo: 1.000 puntos al mes</strong> (decisión del 23 de agosto
              de 2026), para que el reparto arranque y se pueda medir. Más adelante el bote será
              la mitad de la <strong>comisión</strong> que la plataforma ingrese por su mercado — la
              comisión, no la facturación bruta: lo que la plataforma gana, nunca el dinero de los
              vendedores. Cada persona recibe su parte en puntos, para usar en almacenamiento,
              procesamiento y el resto de la cesta.
            </p>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Reparto mixto: el éxito pesa</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              El bote no se reparte a partes iguales: quien más aporta recibe más,
              <strong> proporcional al éxito de sus publicaciones</strong> — vistas válidas (una
              por persona, con sesión), interacción y reseñas positivas. Los números que pesan
              en el reparto son siempre los que no se pueden inflar desde fuera.
            </p>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Caducidad y cuentas dormidas</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Los puntos <strong>caducan a los 10 años</strong>, y una cuenta
              <strong> inactiva durante 24 meses pierde su saldo</strong> — con avisos antes de
              que ocurra. Es lo que impide que el pasivo de puntos crezca sin límite mientras la
              plataforma sigue prestando los servicios que los respaldan.
            </p>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">La regla que sujeta el diseño</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              El bote decide <strong>cuántos puntos se emiten</strong> cada mes — nunca cuánto
              vale cada punto. El valor del punto sigue siendo la cesta de servicios a los
              precios publicados. Así el reparto sube y baja con los ingresos reales, nunca se
              emite más de lo que el mercado respalda, y el punto no se convierte en una
              participación en los ingresos (que lo sacaría del terreno de la utilidad).
            </p>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">Qué se podrá hacer con ellos</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Donarlos</strong> a otra persona (la transferencia del piloto),
              <strong> comprarlos</strong> a la plataforma, y <strong>gastarlos</strong>: en la
              cesta de servicios y como <strong>descuento en el mercado, hasta el 100 % del
              precio</strong> si hay puntos suficientes. Lo que NO existe: canjearlos de vuelta
              a euros — nunca. Y la <strong>venta entre personas</strong> queda condicionada a
              la revisión legal: es el paso que convierte un vale en un activo que circula, y
              se dará con ese informe delante, no antes.
            </p>
          </div>
        </div>
      </section>

      {/* ── De dónde saldrá el valor ────────────────────────────────────── */}
      <section className="p-6 md:p-8 bg-slate-900 rounded-3xl text-white">
        <div className="flex items-start gap-4">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-white/10 text-emerald-400 grid place-items-center">
            <Server className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold font-display mb-2">El principio de diseño: capacidad, no propiedad</h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Detrás de los servicios hay máquinas reales: los servidores y el almacenamiento que
              sostienen la plataforma. El diseño del punto lo ancla a <strong className="text-white">la
              capacidad que ese hardware produce</strong> — tantos gigabytes guardados, tantas horas
              de cómputo — y no a la propiedad de las máquinas. Si el hardware se abarata, cada
              punto compraría más servicio. Es un principio de diseño que guía lo que se construye,
              no una promesa de precio ni de rendimiento.
            </p>
          </div>
        </div>
      </section>

      {/* ── Lo que el punto NO es ───────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 font-display mb-2">Lo que el punto no es</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mb-6">
          Estas cuatro negaciones son deliberadas: mantienen el punto fuera de las categorías
          reguladas de los criptoactivos y del dinero electrónico, y son el compromiso que esta
          página existe para hacer público.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NO_ES.map(({ titulo, texto }) => (
            <div key={titulo} className="p-5 bg-rose-50/60 border border-rose-100 rounded-2xl">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1.5">
                <Ban className="w-4 h-4 text-rose-500" /> {titulo}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Hoja de ruta ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 font-display mb-2">Hoja de ruta</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mb-6">
          Solo la fase A existe. Las otras dos son intención, y la última además está
          condicionada a hechos que no dependen solo de nosotros.
        </p>
        <div className="space-y-4">
          {FASES.map(({ etiqueta, titulo, texto, estado }) => (
            <div key={etiqueta} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl">
              <span className={
                estado === 'activa'
                  ? 'self-start shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide'
                  : estado === 'prevista'
                    ? 'self-start shrink-0 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-wide'
                    : 'self-start shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wide'
              }>
                {etiqueta}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transparencia ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <BookOpenCheck className="w-5 h-5 text-emerald-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">Todo deja justificante</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cada punto que entra o sale queda anotado con su motivo en tu libro de movimientos,
            visible en tu panel. Esto ya funciona así hoy.
          </p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">Un solo emisor, un solo libro</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Los puntos solo los emite y solo los acepta la plataforma. No hay segundo mercado
            ni segunda contabilidad.
          </p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <Scale className="w-5 h-5 text-emerald-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">Cambios, siempre por delante</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Si el diseño del punto cambia — usos, precios, transferibilidad, cadena —, esta
            página lo contará antes de que ocurra.
          </p>
        </div>
      </section>

      {/* ── Los dos documentos de trabajo ───────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/tokenomics?vista=libro-blanco" className="group block p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">Libro blanco (borrador)</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            El punto por escrito, con la estructura que pide MiCA en lenguaje llano: qué es,
            qué derechos da, sus riesgos y sus huecos pendientes. En revisión.
          </p>
        </Link>
        <Link to="/tokenomics?vista=tareas" className="group block p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">Tareas hasta el token</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Todo lo que falta para pasar del punto interno a un token de conocimiento, con el
            estado real de cada tarea y las decisiones que solo puede tomar el emisor.
          </p>
        </Link>
      </section>

      <div className="pt-2">
        <Link to="/sobre-red-humana" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
          Sobre Humanity.wiki <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
