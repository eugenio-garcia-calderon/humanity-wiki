import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Activity, ArrowRight, Megaphone, Calculator, ChevronDown, Clock, Gauge, HardHat, Lightbulb, PencilRuler,
  Recycle, SearchCheck, ShieldCheck, Stamp, Truck, TriangleAlert, Users,
} from 'lucide-react';
import { miniatura } from '../utils/miniatura';

// ============================================================================
// LA CADENA DE VALOR DE LA ENERGÍA SOLAR EN ESPAÑA (2026-11-12, Eugenio)
// ============================================================================
// «Haz un web en luzhumanidad.com que sea de la cadena de valor de instalación
// de energía solar en España, desde el diseño de la instalación, presupuesto,
// sourcing, instalación, legalización, mantenimiento, monitoreo, optimización,
// reparto en comunidades, etc. Hazlo visual.» And then: «hazlo de forma
// horizontal la cadena, con desplegables donde cuando pinches te muestren las
// actividades de cada cadena».
//
// The page of the «Cadena de valor solar» row (`config.aplicacion =
// 'cadena-solar'`, migration 0204), under the site bar (SubpaginaSitio,
// CON_BARRA). Everything it shows lives in this file: the chain (ESLABONES),
// the times, the cost split, the sharing simulator and the actors.
//
// FIGURES: the rules are those in force in November 2026 (RD 244/2019, REBT,
// Orden TED/1247/2021, RD 110/2015). Prices and times are ORDERS OF MAGNITUDE
// for a home installation and say so on the page; nothing here is a quote.

type Fase = 'antes' | 'obra' | 'vida' | 'compartir';

const FASES: { id: Fase; titulo: string; color: string; claro: string; texto: string }[] = [
  { id: 'antes', titulo: 'Antes de la obra', color: '#f59e0b', claro: '#fef3c7', texto: 'Encontrar al cliente, saber qué necesita y cuánto cuesta' },
  { id: 'obra', titulo: 'La obra', color: '#0ea5e9', claro: '#e0f2fe', texto: 'Comprar, montar y legalizar' },
  { id: 'vida', titulo: 'Los 30 años de vida', color: '#10b981', claro: '#d1fae5', texto: 'Que produzca lo que debe' },
  { id: 'compartir', titulo: 'Compartir y cerrar el ciclo', color: '#8b5cf6', claro: '#ede9fe', texto: 'Repartir la energía y reciclar' },
];

type Eslabon = {
  id: string; fase: Fase; nombre: string; Icono: ComponentType<{ className?: string }>;
  resumen: string; actividades: string[]; quien: string[]; plazo: string;
  atasco: string; mejora: string;
};

const ESLABONES: Eslabon[] = [
  {
    // 2026-11-12 (Eugenio): «añade el eslabón de generación de leads».
    id: 'captacion', fase: 'antes', nombre: 'Captación', Icono: Megaphone,
    resumen: 'Generación de leads',
    actividades: [
      'Atraer interesados: buscador, redes sociales, anuncios y web con simulador de ahorro',
      'Acuerdos con canales: comercializadoras, bancos, tiendas, administradores de fincas',
      'Puerta a puerta, ferias y charlas en ayuntamientos y asociaciones',
      'Recibir contactos (leads) y comprar leads a portales comparadores',
      'Filtrar: ¿tiene tejado propio, consumo suficiente, decide él?',
      'Llamar en menos de un día y pedir la factura para el estudio',
    ],
    quien: ['Instaladora (equipo comercial)', 'Agencias de marketing', 'Portales de leads', 'Comercializadoras y bancos'],
    plazo: 'Continuo; de 1 a 4 semanas por cliente',
    atasco: 'Es el eslabón más caro: un lead se paga caro, se vende a varias instaladoras a la vez y la mayoría no llega a firmar.',
    mejora: 'Campañas colectivas con el ayuntamiento o la asociación de vecinos: confianza ya ganada y un coste por cliente mucho menor.',
  },
  {
    id: 'estudio', fase: 'antes', nombre: 'Estudio', Icono: SearchCheck,
    resumen: 'Conocer el consumo y el tejado',
    actividades: [
      'Leer las facturas del último año y la potencia contratada',
      'Descargar la curva de consumo hora a hora (Datadis)',
      'Visitar o mirar el tejado: orientación, inclinación, sombras, estado',
      'Comprobar la referencia catastral y si es vivienda, nave o comunidad',
      'Estimar la producción del sitio (PVGIS)',
    ],
    quien: ['Cliente', 'Instaladora o ingeniería', 'Distribuidora (datos)'],
    plazo: '1 a 7 días',
    atasco: 'Muchas ofertas se hacen «a ojo», sin la curva horaria: se sobredimensiona y sobran excedentes mal pagados.',
    mejora: 'Pedir la curva horaria al empezar y dimensionar con ella, no con el total anual.',
  },
  {
    id: 'diseno', fase: 'antes', nombre: 'Diseño', Icono: PencilRuler,
    resumen: 'Ingeniería de la instalación',
    actividades: [
      'Dimensionar la potencia (kWp) según consumo, tejado y excedentes',
      'Colocar los módulos y calcular sombras',
      'Agrupar en cadenas (strings) y elegir el inversor (relación DC/AC)',
      'Decidir si lleva baterías, y de qué tamaño',
      'Elegir estructura: coplanar, inclinada o lastrada; cargas de viento y nieve',
      'Calcular cables y protecciones (REBT, ITC-BT-40)',
      'Redactar la memoria técnica, o el proyecto si pasa de 10 kW',
    ],
    quien: ['Ingeniería', 'Instaladora'],
    plazo: '2 a 10 días',
    atasco: 'Diseño copiado de una instalación a otra: inversores mal ajustados y cubiertas que no aguantan el peso.',
    mejora: 'Plantillas de diseño abiertas y revisadas, con el cálculo de cargas incluido.',
  },
  {
    id: 'presupuesto', fase: 'antes', nombre: 'Presupuesto', Icono: Calculator,
    resumen: 'Precio, ahorro y financiación',
    actividades: [
      'Medir y valorar materiales, mano de obra y trámites',
      'Calcular el ahorro anual y los años de retorno',
      'Buscar ayudas: bonificación del IBI y del ICIO del ayuntamiento, deducciones del IRPF si siguen vigentes',
      'Ofrecer financiación: préstamo, renting, cuota solar o préstamo solidario',
      'Firmar el contrato y el calendario de obra',
    ],
    quien: ['Instaladora', 'Cliente', 'Banco o financiador', 'Ayuntamiento'],
    plazo: '3 a 20 días (lo que tarde en decidirse)',
    atasco: 'Los presupuestos no se pueden comparar: cada uno cuenta el ahorro a su manera y algunos prometen retornos inflados.',
    mejora: 'Un formato común de presupuesto, con el ahorro calculado sobre la curva real y la degradación incluida.',
  },
  {
    id: 'sourcing', fase: 'obra', nombre: 'Compras', Icono: Truck,
    resumen: 'Sourcing de equipos y material',
    actividades: [
      'Pedir módulos, inversor, baterías y estructura al mayorista',
      'Comprobar certificados (CE, IEC 61215 y 61730, inversor homologado)',
      'Comparar garantías: de producto (10-25 años) y de rendimiento (25-30)',
      'Cablear, protecciones, contador y medidor de consumo',
      'Organizar transporte y almacén hasta la obra',
    ],
    quien: ['Fabricantes', 'Distribuidor mayorista', 'Instaladora'],
    plazo: '1 a 4 semanas',
    atasco: 'Casi toda la fabricación de módulos está en China: precios y plazos dependen de aranceles y fletes.',
    mejora: 'Comprar en común entre instaladoras pequeñas y cooperativas; exigir trazabilidad del origen.',
  },
  {
    id: 'instalacion', fase: 'obra', nombre: 'Instalación', Icono: HardHat,
    resumen: 'Montaje en el tejado',
    actividades: [
      'Preparar la seguridad: líneas de vida, andamios, plan de prevención',
      'Montar la estructura y anclarla sin romper la impermeabilización',
      'Colocar los módulos y cablear la parte de continua',
      'Instalar inversor, baterías y protecciones de alterna',
      'Poner la toma de tierra y el medidor de consumo',
      'Probar, medir y poner en marcha',
    ],
    quien: ['Empresa instaladora habilitada en baja tensión'],
    plazo: '1 a 3 días en una casa',
    atasco: 'Faltan instaladores formados; los trabajos en altura son el mayor riesgo del oficio.',
    mejora: 'Formar a vecinos como instaladores (lo hace Sol Solidario): empleo local y obra más barata.',
  },
  {
    id: 'legalizacion', fase: 'obra', nombre: 'Legalización', Icono: Stamp,
    resumen: 'Papeles y conexión a la red',
    actividades: [
      'Ayuntamiento: licencia de obra o declaración responsable, y pago del ICIO',
      'Comunidad autónoma: certificado de instalación (boletín) con la memoria o el proyecto',
      'Inspección inicial por un organismo de control si pasa de 25 kW',
      'Inscripción en el registro de autoconsumo autonómico, que avisa al estatal',
      'Distribuidora: permiso de acceso y conexión si vierte y pasa de 15 kW; código CAU',
      'Comercializadora: contrato de compensación simplificada de excedentes',
    ],
    quien: ['Instaladora o gestoría', 'Ayuntamiento', 'Comunidad autónoma', 'Distribuidora eléctrica', 'Comercializadora'],
    plazo: '1 a 6 meses',
    atasco: 'Es el eslabón más lento: hasta que la distribuidora y la comercializadora no lo activan, los excedentes se regalan.',
    mejora: 'Un expediente único y digital que viaje solo entre ayuntamiento, comunidad, distribuidora y comercializadora.',
  },
  {
    id: 'monitoreo', fase: 'vida', nombre: 'Monitorización', Icono: Activity,
    resumen: 'Ver lo que produce y consume',
    actividades: [
      'Conectar el inversor a internet y dar acceso al cliente',
      'Seguir producción, consumo, vertido y batería hora a hora',
      'Comparar con lo esperado: rendimiento (kWh/kWp) y performance ratio',
      'Recibir avisos de fallo, cortes o caídas de producción',
      'Cruzar con la factura y con los datos de Datadis',
    ],
    quien: ['Cliente', 'Instaladora', 'Plataforma del fabricante'],
    plazo: 'Siempre, en tiempo real',
    atasco: 'Cada marca tiene su app y nadie la mira: un inversor parado puede pasar meses sin que nadie lo note.',
    mejora: 'Un panel común, independiente de la marca, con avisos que llegan a una persona.',
  },
  {
    id: 'mantenimiento', fase: 'vida', nombre: 'Mantenimiento', Icono: ShieldCheck,
    resumen: 'Preventivo y correctivo',
    actividades: [
      'Revisión anual: aprietes, cables, protecciones y tierra',
      'Limpieza de los módulos donde hay polvo, polen o salitre',
      'Termografía para encontrar células o conexiones calientes',
      'Reparar o cambiar el inversor (suele durar 10-15 años)',
      'Gestionar garantías y seguro',
    ],
    quien: ['Empresa de mantenimiento (O&M)', 'Instaladora', 'Fabricante (garantías)'],
    plazo: '1 visita al año',
    atasco: 'En las casas casi nadie lo contrata; en las naves, sí. La pérdida silenciosa es la más cara.',
    mejora: 'Mantenimiento colectivo por barrio: una visita, muchas instalaciones, coste por casa mínimo.',
  },
  {
    id: 'optimizacion', fase: 'vida', nombre: 'Optimización', Icono: Gauge,
    resumen: 'Sacar más de cada kWh',
    actividades: [
      'Mover lavadora, lavavajillas y agua caliente a las horas de sol',
      'Bajar la potencia contratada si ya no hace falta',
      'Añadir batería, aerotermia o cargador del coche eléctrico',
      'Usar batería virtual o cambiar de comercializadora para cobrar mejor los excedentes',
      'Ampliar la instalación cuando crece el consumo',
    ],
    quien: ['Cliente', 'Comercializadora', 'Asesor energético'],
    plazo: 'Revisarlo una vez al año',
    atasco: 'El excedente se compensa a precio bajo y con tope: lo que no se consume se aprovecha poco.',
    mejora: 'Compartir el excedente con los vecinos: lo que a uno le sobra, al de al lado le falta.',
  },
  {
    id: 'reparto', fase: 'compartir', nombre: 'Reparto', Icono: Users,
    resumen: 'Autoconsumo colectivo y comunidades',
    actividades: [
      'Reunir a los vecinos: misma finca, mismo centro de transformación o dentro de la distancia que permite la ley',
      'Elegir la forma jurídica de la comunidad energética (asociación, cooperativa)',
      'Acordar el reparto: coeficientes fijos o variables hora a hora',
      'Firmar el acuerdo y mandarlo a la distribuidora',
      'Repartir costes, ahorros y nuevas altas y bajas de socios',
    ],
    quien: ['Vecinos', 'Comunidad energética', 'Ayuntamiento', 'Distribuidora', 'Comercializadoras de cada vecino'],
    plazo: '2 a 12 meses montarla',
    atasco: 'Cada vecino tiene su comercializadora y cada cambio de reparto es un trámite.',
    mejora: 'Coeficientes horarios calculados con la curva de cada vecino: más autoconsumo, menos excedente.',
  },
  {
    id: 'reciclaje', fase: 'compartir', nombre: 'Fin de vida', Icono: Recycle,
    resumen: 'Repotenciar y reciclar',
    actividades: [
      'Repotenciar: cambiar módulos viejos por otros más potentes en el mismo tejado',
      'Dar segunda vida a módulos que aún producen (proyectos sociales, aislados)',
      'Entregar los módulos como residuo eléctrico (RAEE) al sistema del fabricante',
      'Recuperar vidrio, aluminio, cobre y plata',
    ],
    quien: ['Instaladora', 'Sistema de responsabilidad del productor', 'Gestor de residuos'],
    plazo: 'A los 25-35 años',
    atasco: 'Aún llegan pocos módulos al final de su vida; en 2040 serán una montaña.',
    mejora: 'Mercado de segunda mano con garantía para llevar luz donde no la hay.',
  },
];

/** Times of a home installation, in days (min and max). Orders of magnitude. */
const PLAZOS: { id: string; min: number; max: number }[] = [
  { id: 'captacion', min: 7, max: 28 }, { id: 'estudio', min: 1, max: 7 }, { id: 'diseno', min: 2, max: 10 }, { id: 'presupuesto', min: 3, max: 20 },
  { id: 'sourcing', min: 7, max: 28 }, { id: 'instalacion', min: 1, max: 3 }, { id: 'legalizacion', min: 30, max: 180 },
];

/** Where the money goes in a ~5 kWp home installation without batteries. Orders of magnitude. */
const COSTE: { parte: string; pct: number; color: string }[] = [
  { parte: 'Módulos', pct: 22, color: '#0ea5e9' },
  { parte: 'Inversor', pct: 14, color: '#6366f1' },
  { parte: 'Estructura', pct: 8, color: '#64748b' },
  { parte: 'Cables y protecciones', pct: 9, color: '#94a3b8' },
  { parte: 'Mano de obra', pct: 18, color: '#f59e0b' },
  { parte: 'Ingeniería y trámites', pct: 8, color: '#ef4444' },
  { parte: 'Captación comercial y margen', pct: 21, color: '#10b981' },
];

/** Who takes part in each link. */
const ACTORES: { nombre: string; en: string[] }[] = [
  { nombre: 'Cliente o vecinos', en: ['captacion', 'estudio', 'presupuesto', 'monitoreo', 'optimizacion', 'reparto'] },
  { nombre: 'Ingeniería', en: ['estudio', 'diseno', 'legalizacion'] },
  { nombre: 'Instaladora', en: ['captacion', 'estudio', 'diseno', 'presupuesto', 'sourcing', 'instalacion', 'legalizacion', 'monitoreo', 'mantenimiento', 'reciclaje'] },
  { nombre: 'Fabricantes', en: ['sourcing', 'monitoreo', 'mantenimiento', 'reciclaje'] },
  { nombre: 'Mayoristas', en: ['sourcing'] },
  { nombre: 'Financiadores', en: ['captacion', 'presupuesto'] },
  { nombre: 'Marketing y portales de leads', en: ['captacion'] },
  { nombre: 'Ayuntamiento', en: ['captacion', 'presupuesto', 'legalizacion', 'reparto'] },
  { nombre: 'Comunidad autónoma', en: ['legalizacion'] },
  { nombre: 'Distribuidora eléctrica', en: ['estudio', 'legalizacion', 'monitoreo', 'reparto'] },
  { nombre: 'Comercializadora', en: ['captacion', 'legalizacion', 'optimizacion', 'reparto'] },
  { nombre: 'Comunidad energética', en: ['captacion', 'reparto', 'optimizacion', 'mantenimiento'] },
  { nombre: 'Mantenimiento (O&M)', en: ['mantenimiento', 'monitoreo'] },
  { nombre: 'Gestor de residuos', en: ['reciclaje'] },
];

const FUENTES: { texto: string; url: string | null }[] = [
  { texto: 'Real Decreto 244/2019, de autoconsumo', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-5089' },
  { texto: 'Reglamento electrotécnico de baja tensión (RD 842/2002)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099' },
  { texto: 'Orden TED/1247/2021, coeficientes de reparto variables', url: null },
  { texto: 'Real Decreto 110/2015, de residuos eléctricos (RAEE)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-1762' },
  { texto: 'PVGIS: producción solar de cualquier punto (Comisión Europea)', url: 'https://re.jrc.ec.europa.eu/pvg_tools/es/' },
  { texto: 'Datadis: tus datos de consumo de todas las distribuidoras', url: 'https://datadis.es' },
  { texto: 'IDAE: guía y ayudas al autoconsumo', url: 'https://www.idae.es' },
];

const PORTADA = '/uploads/2026/11/144a05f5-696a-4695-ad96-35c067d081d2.jpg';
/** Pablo Sánchez, founder of Suntropy (his portada in Personas). */
const FOTO_PABLO = '/uploads/2026/10/90900c44-6880-4566-aa65-116803d25584.png';
const fase = (id: Fase) => FASES.find(f => f.id === id)!;
const eslabon = (id: string) => ESLABONES.find(e => e.id === id)!;

// ── The chain, horizontal, with a drop-down per link ─────────────────────────
function Cadena() {
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(['captacion', 'legalizacion']));
  const todos = abiertos.size === ESLABONES.length;
  const alternar = (id: string) => setAbiertos(prev => {
    const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s;
  });
  // The links of the cover (`#e-<id>`) open that link of the chain and bring it into view.
  useEffect(() => {
    const ir = () => {
      const id = window.location.hash.slice(1);
      if (!id.startsWith('e-') || !ESLABONES.some(e => `e-${e.id}` === id)) return;
      setAbiertos(prev => new Set(prev).add(id.slice(2)));
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' }), 80);
    };
    ir();
    window.addEventListener('hashchange', ir);
    return () => window.removeEventListener('hashchange', ir);
  }, []);
  let n = 0;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-slate-600">Pincha en cada eslabón para ver sus actividades. <span className="hidden sm:inline">Desliza hacia la derecha para recorrer la cadena.</span></p>
        <button type="button" onClick={() => setAbiertos(todos ? new Set() : new Set(ESLABONES.map(e => e.id)))}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">
          <ChevronDown className={`h-4 w-4 transition-transform ${todos ? 'rotate-180' : ''}`} /> {todos ? 'Plegar todo' : 'Desplegar todo'}
        </button>
      </div>
      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-6 sm:-mx-8 sm:px-8" data-cadena-solar>
        <div className="flex w-max items-start gap-3">
          {FASES.map(f => {
            const suyos = ESLABONES.filter(e => e.fase === f.id);
            return (
              <div key={f.id} className="flex flex-col gap-3">
                {/* The phase band over its links. */}
                <div className="rounded-xl px-3 py-2" style={{ background: f.claro }}>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: f.color }}>{f.titulo}</p>
                  <p className="text-[13px] font-semibold text-slate-700">{f.texto}</p>
                </div>
                <div className="flex items-start gap-3">
                  {suyos.map(e => {
                    n += 1;
                    const abierto = abiertos.has(e.id);
                    const ultimo = e.id === ESLABONES[ESLABONES.length - 1].id;
                    return (
                      <div key={e.id} className="flex items-start gap-3">
                        <div id={`e-${e.id}`} className={`w-[244px] shrink-0 scroll-mt-40 overflow-hidden rounded-2xl border bg-white transition-shadow ${abierto ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
                          style={{ borderColor: abierto ? f.color : '#e2e8f0' }}>
                          <button type="button" onClick={() => alternar(e.id)} aria-expanded={abierto} aria-controls={`act-${e.id}`}
                            className="flex w-full items-center gap-3 p-3 text-left">
                            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: f.color }}>
                              <e.Icono className="h-6 w-6" />
                              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[11px] font-black text-white">{n}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-lg font-black leading-tight text-slate-900">{e.nombre}</span>
                              <span className="block text-[13px] leading-snug text-slate-500">{e.resumen}</span>
                            </span>
                            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                          </button>
                          {abierto && (
                            <div id={`act-${e.id}`} className="border-t border-slate-100 px-3 pb-4 pt-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Actividades</p>
                              <ol className="mt-2 space-y-2">
                                {e.actividades.map((a, i) => (
                                  <li key={a} className="flex gap-2 text-[14px] leading-snug text-slate-700">
                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black" style={{ background: f.claro, color: f.color }}>{i + 1}</span>
                                    <span>{a}</span>
                                  </li>
                                ))}
                              </ol>
                              <div className="mt-4 flex items-center gap-2 text-[13px] font-bold text-slate-700"><Clock className="h-4 w-4 text-slate-400" /> {e.plazo}</div>
                              <div className="mt-3 flex flex-wrap gap-1">
                                {e.quien.map(q => <span key={q} className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-slate-600">{q}</span>)}
                              </div>
                              <p className="mt-4 flex gap-2 rounded-xl bg-rose-50 p-2.5 text-[13px] leading-snug text-rose-900"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {e.atasco}</p>
                              <p className="mt-2 flex gap-2 rounded-xl bg-emerald-50 p-2.5 text-[13px] leading-snug text-emerald-900"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {e.mejora}</p>
                            </div>
                          )}
                        </div>
                        {!ultimo && <ArrowRight className="mt-6 h-5 w-5 shrink-0 text-slate-300" aria-hidden />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Times: two days on the roof, months of paperwork ────────────────────────
function Plazos() {
  const tope = 180;
  return (
    <div className="space-y-3">
      {PLAZOS.map(p => {
        const e = eslabon(p.id); const f = fase(e.fase);
        return (
          <div key={p.id} className="grid grid-cols-[110px_1fr] items-center gap-3 sm:grid-cols-[150px_1fr_120px]">
            <span className="text-sm font-bold text-slate-800">{e.nombre}</span>
            <div className="relative h-7 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 rounded-full opacity-35" style={{ left: 0, width: `${(p.max / tope) * 100}%`, background: f.color }} />
              <div className="absolute inset-y-0 rounded-full" style={{ left: 0, width: `max(6px, ${(p.min / tope) * 100}%)`, background: f.color }} />
            </div>
            <span className="col-start-2 text-[13px] tabular-nums text-slate-500 sm:col-start-auto">{e.plazo}</span>
          </div>
        );
      })}
      <div className="grid grid-cols-[110px_1fr] gap-3 text-[12px] text-slate-400 sm:grid-cols-[150px_1fr_120px]">
        <span />
        <div className="flex justify-between tabular-nums"><span>0</span><span>1 mes</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6 meses</span></div>
      </div>
    </div>
  );
}

// ── Cost: where each euro goes ──────────────────────────────────────────────
function Coste() {
  return (
    <div>
      <div className="flex h-16 w-full overflow-hidden rounded-2xl" role="img"
        aria-label={COSTE.map(c => `${c.parte} ${c.pct} %`).join(', ')}>
        {COSTE.map(c => (
          <div key={c.parte} className="flex items-center justify-center text-sm font-black text-white" style={{ width: `${c.pct}%`, background: c.color }} title={`${c.parte}: ${c.pct} %`}>
            <span className="hidden sm:inline">{c.pct} %</span>
          </div>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {COSTE.map(c => (
          <li key={c.parte} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: c.color }} />
            <span className="font-semibold">{c.parte}</span><span className="tabular-nums text-slate-500">{c.pct} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Sharing: fixed against hourly coefficients ──────────────────────────────
// A spring day: 5 kWp on a shared roof and three neighbours who use energy at
// different times. Fixed: each gets a third every hour. Hourly: each hour's
// energy is split by what each one uses in it (Orden TED/1247/2021).
const HORAS = Array.from({ length: 24 }, (_, h) => h);
const PRODUCCION = HORAS.map(h => (h < 7 || h > 20 ? 0 : 4 * Math.pow(Math.max(0, Math.sin(Math.PI * (h - 7) / 13)), 1.4)));
const VECINOS = [
  { nombre: 'Familia que trabaja fuera', color: '#0ea5e9',
    consumo: [.3, .25, .25, .25, .25, .3, .6, 1.1, .7, .3, .25, .25, .3, .5, .6, .35, .3, .4, .8, 1.3, 1.6, 1.4, .9, .5] },
  { nombre: 'Teletrabajo', color: '#f59e0b',
    consumo: [.25, .2, .2, .2, .2, .25, .4, .7, .9, 1.0, 1.1, 1.1, 1.3, 1.5, 1.2, 1.0, .9, .9, 1.0, 1.2, 1.3, 1.0, .7, .4] },
  { nombre: 'Jubilados con aerotermia', color: '#10b981',
    consumo: [.4, .35, .35, .35, .35, .4, .5, .8, 1.2, 1.6, 1.9, 2.0, 2.1, 2.2, 1.6, 1.2, 1.0, 1.0, 1.1, 1.3, 1.2, .9, .6, .5] },
];

function Reparto() {
  const [modo, setModo] = useState<'fijo' | 'horario'>('fijo');
  const r = useMemo(() => {
    const porVecino = VECINOS.map(() => ({ usada: 0, sobra: 0 }));
    const barras = HORAS.map(h => {
      const total = VECINOS.reduce((s, v) => s + v.consumo[h], 0);
      return VECINOS.map((v, i) => {
        const beta = modo === 'fijo' ? 1 / VECINOS.length : (total > 0 ? v.consumo[h] / total : 0);
        const asignada = PRODUCCION[h] * beta;
        const usada = Math.min(asignada, v.consumo[h]);
        porVecino[i].usada += usada; porVecino[i].sobra += asignada - usada;
        return { usada, sobra: asignada - usada };
      });
    });
    const prod = PRODUCCION.reduce((a, b) => a + b, 0);
    const usada = porVecino.reduce((s, p) => s + p.usada, 0);
    return { barras, porVecino, prod, usada };
  }, [modo]);
  const alto = 180; const escala = alto / 4.2;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-slate-100 p-1" role="tablist">
          {([['fijo', 'Coeficientes fijos'], ['horario', 'Coeficientes por hora']] as const).map(([m, t]) => (
            <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => setModo(m)}
              className={`h-10 rounded-full px-4 text-sm font-bold ${modo === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>{t}</button>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Energía aprovechada por los vecinos:{' '}
          <strong className="text-2xl font-black tabular-nums text-slate-900">{Math.round((r.usada / r.prod) * 100)} %</strong>
        </p>
      </div>
      <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-slate-600">
        {modo === 'fijo'
          ? 'Cada vecino recibe un tercio de la energía a todas horas. A mediodía, la familia que trabaja fuera no está en casa: su parte se vierte a la red y se paga poco.'
          : 'Cada hora, la energía se reparte según lo que usa cada vecino en esa hora. Lo que a uno le sobra lo aprovecha el de al lado.'}
      </p>
      <div className="mt-6 overflow-x-auto">
        <svg viewBox={`0 0 ${24 * 28} ${alto + 24}`} className="h-auto w-full" role="img" aria-label="Energía de cada hora repartida entre los tres vecinos">
          {HORAS.map(h => {
            let y = alto;
            return (
              <g key={h} transform={`translate(${h * 28 + 4},0)`}>
                <rect x={0} y={alto - PRODUCCION[h] * escala} width={20} height={PRODUCCION[h] * escala} fill="#fef3c7" />
                {r.barras[h].map((b, i) => {
                  const hu = b.usada * escala; const hs = b.sobra * escala;
                  y -= hu; const yu = y; y -= hs; const ys = y;
                  return (
                    <g key={i}>
                      <rect x={0} y={yu} width={20} height={hu} fill={VECINOS[i].color} />
                      {hs > 0.3 && <rect x={0} y={ys} width={20} height={hs} fill={VECINOS[i].color} opacity={0.25} />}
                    </g>
                  );
                })}
                {h % 3 === 0 && <text x={10} y={alto + 16} textAnchor="middle" fontSize={11} fill="#94a3b8">{h}h</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {VECINOS.map((v, i) => {
          const p = r.porVecino[i]; const tot = p.usada + p.sobra;
          return (
            <li key={v.nombre} className="rounded-2xl bg-slate-50 p-3">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900"><span className="h-3 w-3 rounded-sm" style={{ background: v.color }} /> {v.nombre}</p>
              <p className="mt-1 text-[13px] text-slate-600">
                Recibe <strong className="tabular-nums">{tot.toFixed(1)} kWh</strong>, usa <strong className="tabular-nums">{p.usada.toFixed(1)}</strong> y vierte <strong className="tabular-nums">{p.sobra.toFixed(1)}</strong>.
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] text-slate-400">Color lleno: energía que usa cada vecino. Color claro: la que le toca y se vierte a la red. Un día de primavera, 5 kWp en un tejado compartido; perfiles de consumo inventados para el ejemplo.</p>
    </div>
  );
}

// ── Who does what ───────────────────────────────────────────────────────────
function Actores() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white p-3 text-left text-[12px] font-black uppercase tracking-wider text-slate-400">Actor</th>
            {ESLABONES.map(e => {
              const f = fase(e.fase);
              return (
                <th key={e.id} className="p-2 text-center align-bottom">
                  <span className="mx-auto grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: f.color }} title={e.nombre}><e.Icono className="h-4 w-4" /></span>
                  <span className="mt-1 block text-[11px] font-bold leading-tight text-slate-600">{e.nombre}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ACTORES.map(a => (
            <tr key={a.nombre} className="border-t border-slate-100">
              <th scope="row" className="sticky left-0 z-10 bg-white p-3 text-left font-bold text-slate-800">{a.nombre}</th>
              {ESLABONES.map(e => (
                <td key={e.id} className="p-2 text-center">
                  {a.en.includes(e.id) && <span className="mx-auto block h-3.5 w-3.5 rounded-full" style={{ background: fase(e.fase).color }} aria-label="sí" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Seccion({ id, etiqueta, titulo, texto, children }: { id: string; etiqueta: string; titulo: string; texto?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40 pt-16 sm:pt-24">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">{etiqueta}</p>
      <h2 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">{titulo}</h2>
      {texto && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{texto}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function CadenaSolar() {
  return (
    <div data-cadena-valor-solar className="pb-16">
      <header data-fondo-oscuro className="relative isolate overflow-hidden bg-slate-950" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
        <img src={miniatura(PORTADA, 1600)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
        <div className="mx-auto max-w-[1840px] px-5 py-16 sm:px-10 sm:py-24">
          <div className="max-w-3xl text-white">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Energía solar en España</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">La cadena de valor de una instalación solar</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
              De buscar al cliente al reciclaje del último panel: doce eslabones, quién hace cada uno, cuánto tarda y dónde se atasca.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {ESLABONES.map((e, i) => (
                <a key={e.id} href={`#e-${e.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-white/20">
                  <span className="tabular-nums text-amber-300">{i + 1}</span> {e.nombre}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1840px] px-4 sm:px-8">
        <Seccion id="cadena" etiqueta="La cadena" titulo="Doce eslabones, del cliente al reciclaje.">
          <Cadena />
        </Seccion>

        <Seccion id="plazos" etiqueta="Plazos" titulo="Montarla, dos días. Legalizarla, meses."
          texto="En una casa, la obra en el tejado se hace en uno a tres días. Los papeles con el ayuntamiento, la comunidad autónoma, la distribuidora y la comercializadora pueden durar medio año, y mientras tanto los excedentes no se cobran.">
          <Plazos />
          <p className="mt-4 text-[12px] text-slate-400">Color fuerte: lo que tarda en el mejor caso. Color claro: lo que puede llegar a tardar. Órdenes de magnitud de una instalación doméstica.</p>
        </Seccion>

        <Seccion id="coste" etiqueta="Precio" titulo="A dónde va cada euro."
          texto="En una casa con unos 5 kWp y sin baterías, el equipo es menos de la mitad del precio. El resto es trabajo, trámites y, sobre todo, conseguir al cliente.">
          <Coste />
          <p className="mt-4 text-[12px] text-slate-400">Reparto orientativo; cambia mucho según la empresa, el tamaño y el año. En instalaciones grandes, el peso del equipo sube y el de la captación baja.</p>
        </Seccion>

        <Seccion id="reparto" etiqueta="Reparto en comunidad" titulo="El mismo sol, mejor repartido."
          texto="En el autoconsumo colectivo, un acuerdo dice qué parte de la energía le toca a cada vecino. Puede ser fija o cambiar cada hora. Prueba la diferencia.">
          <Reparto />
        </Seccion>

        <Seccion id="actores" etiqueta="Actores" titulo="Quién está en cada eslabón."
          texto="Una instalación pasa por las manos de una docena de actores. La instaladora está en casi todo; el cliente, solo al principio y al final, si nadie le ayuda.">
          <Actores />
        </Seccion>

        <Seccion id="que-hacemos" etiqueta="Qué hacemos" titulo="Donde se atasca la cadena, ahí trabajamos."
          texto="Light for Humanity actúa en los eslabones que más valor pierden: la captación de clientes, la financiación, la formación de instaladores y el reparto entre vecinos.">
          {/* 2026-11-12 (Eugenio): «pon bastante arriba que Luz y Humanidad ha invertido en la empresa Suntropy… Suntropy añádelo como pionero en España en optimización». */}
          <a href="/p/KWOPTIMENERGIA1" className="group mb-5 grid items-center gap-5 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[auto_1fr_auto] sm:p-8">
            <img src={miniatura(FOTO_PABLO, 400)} alt="Pablo Sánchez, fundador de Suntropy" className="h-24 w-24 rounded-full bg-slate-100 object-cover object-top sm:h-28 sm:w-28" loading="lazy" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Eslabones 1 a 4: captar, estudiar, diseñar y presupuestar</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Invertimos en Suntropy, pionera en España en optimización</h3>
              <p className="mt-2 max-w-3xl text-slate-600">En 2022, Luz & Humanidad invirtió en Suntropy para desarrollar sistemas inteligentes que optimicen el sector de la energía. Desde entonces incubamos a su fundador, Pablo Sánchez, para desarrollar los proyectos.</p>
            </div>
            <span className="inline-flex items-center gap-2 font-black text-slate-900 group-hover:text-amber-600">Optimización del sistema de energía <ArrowRight className="h-4 w-4" /></span>
          </a>
          <div className="grid gap-5 md:grid-cols-2">
            <a href="/comunidades-energeticas-en-pueblos" className="group relative isolate block overflow-hidden rounded-3xl bg-slate-900 p-6 text-white sm:p-8" data-fondo-oscuro>
              <img src={miniatura(PORTADA, 800)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-50" loading="lazy" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Eslabones 1 y 11: captar y repartir</p>
              <h3 className="mt-2 text-2xl font-black sm:text-3xl">Comunidades energéticas en pueblos</h3>
              <p className="mt-2 text-white/85">Vecinos que comparten el sol de los tejados municipales en Villalbilla y Nuevo Baztán.</p>
              <span className="mt-5 inline-flex items-center gap-2 font-black text-amber-300">Ver el proyecto <ArrowRight className="h-4 w-4" /></span>
            </a>
            <a href="/sol-solidario" className="group block rounded-3xl bg-amber-400 p-6 text-slate-950 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-900">Eslabones 4 y 6: financiar y formar</p>
              <h3 className="mt-2 text-2xl font-black sm:text-3xl">Sol Solidario</h3>
              <p className="mt-2 text-slate-900/80">Préstamos solidarios, donaciones e instaladores formados para llevar energía solar a quien sufre la pobreza energética.</p>
              <span className="mt-5 inline-flex items-center gap-2 font-black">Ver Sol Solidario <ArrowRight className="h-4 w-4" /></span>
            </a>
          </div>
        </Seccion>

        <section id="fuentes" className="pt-16">
          <h2 className="text-lg font-black text-slate-900">Normas y herramientas</h2>
          <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {FUENTES.map(f => (
              <li key={f.texto} className="text-sm text-slate-600">{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">{f.texto}</a> : f.texto}</li>
            ))}
          </ul>
          <p className="mt-4 max-w-3xl text-[12px] text-slate-400">Normativa vigente en noviembre de 2026. Las ayudas, los plazos y los límites cambian: compruébalos con el ayuntamiento, la comunidad autónoma y el IDAE antes de cada obra.</p>
        </section>
      </div>
    </div>
  );
}
