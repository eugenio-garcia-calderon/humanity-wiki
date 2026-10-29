import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType, ConnectionMode, BaseEdge, EdgeLabelRenderer,
  applyNodeChanges, applyEdgeChanges, addEdge, getSmoothStepPath, useInternalNode,
  type Node, type Edge, type NodeProps, type EdgeProps, type NodeChange, type EdgeChange, type Connection, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Building2, Castle, Earth, Flag, Globe, House, RotateCcw, User, Users, X } from 'lucide-react';
import { FloatingEdge } from '../knowledge/aristaFlotante';
import { PuntosConexion } from '../knowledge/lienzoChrome';
import { useCirculosTerritorio } from './PanelCirculo';
import type { Circulo, Sistema } from './circulosDatos';
import { cn } from '../../utils/cn';

// ============================================================================
// LA VISTA «SOCIEDAD» (2026-10-29, Eugenio)
// ============================================================================
// Una foto de post-its amarillos sobre la mesa: «créame una vista de tarjetas que pueda colocar una al lado de otra, una
// encima de otra, como si fuesen post-its, y arrastrarlas; y que se unan con flechas, con esta lógica». Es su forma de
// ordenar la humanidad en sectores y ver cómo se relacionan:
//   · arriba los OBJETIVOS de los actores (salud, alimento, hogar…);
//   · de ellos beben, a los lados, los RECURSOS (espacio, tiempo, materia, energía…) y los VALORES Y PRINCIPIOS;
//   · el PODER POLÍTICO bebe de los dos para debatir, planear y decidir cómo cumplir esos objetivos, y con el poder
//     legislativo cambia la LEY;
//   · la ley da reglas de seguridad a la JUSTICIA, reglas económicas a la ECONOMÍA y reglas técnicas a las TÉCNICAS;
//   · la GESTIÓN (pública o privada) ejecuta: recauda, invierte, atiende y mantiene sistemas e infraestructuras;
//   · y las técnicas producen los bienes que vuelven a cubrir los objetivos (el ciclo de la hoja de la derecha).
// A un lado, el selector de ACTORES: la misma lógica vale para una persona, una familia, un pueblo, una ciudad, una
// región, un país, un continente o el planeta, y al elegir uno las tarjetas se ajustan a esa escala (en una familia, la
// vivienda; en un pueblo, el centro de salud; en una ciudad, el hospital; en un país, los centros de investigación).
// CONCIENCIA · EDUCACIÓN y ECOLOGÍA son transversales: «una especie de membrana que envuelve todo el sistema», y también
// cambian con la escala. Por eso son dos membranas alrededor de las tarjetas, con su nombre y lo de cada escala en el
// borde (tras el bot calificador: sus post-its sueltos fuera de la membrana contradecían la idea).
// Es la pizarra de siempre (React Flow, con los puntos de conexión y la flecha flotante de «Esquemas»): se arrastra, se
// hace zoom y se pueden tirar flechas nuevas desde el borde de una tarjeta. Cómo deja cada uno su pizarra se recuerda
// en su navegador; «Recolocar» la devuelve a la de la foto. Lo que coincide con una de nuestras categorías (Salud,
// Energía, Movilidad…) la abre en la vista Círculo.

const PATAS = /^(patas?|sector(es)?)$/i;
const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const LETRA_TITULO = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

/** Las ocho escalas de los actores, de la persona al planeta. */
const ACTORES = [
  { id: 'individuo', nombre: 'Individuo', Icono: User, escala: 'Una persona: sus necesidades, sus decisiones y lo que sabe hacer.', representa: 'Ella misma' },
  { id: 'familia', nombre: 'Familia', Icono: Users, escala: 'El hogar: quienes conviven, se cuidan y comparten recursos.', representa: 'Los padres o tutores' },
  { id: 'barrio', nombre: 'Pueblo · Barrio', Icono: House, escala: 'Los vecinos y los servicios de cercanía.', representa: 'Alcaldía o junta vecinal' },
  { id: 'ciudad', nombre: 'Ciudad', Icono: Building2, escala: 'Miles de personas que comparten servicios y redes.', representa: 'Alcaldía y concejales' },
  { id: 'region', nombre: 'Región', Icono: Castle, escala: 'Comarcas y ciudades con un gobierno común.', representa: 'Presidencia regional' },
  { id: 'pais', nombre: 'País', Icono: Flag, escala: 'Un Estado, su Constitución y sus instituciones.', representa: 'Gobierno y Cortes' },
  { id: 'continente', nombre: 'Continente', Icono: Globe, escala: 'Países que se unen en mercados y tratados.', representa: 'Unión Europea, Unión Africana…' },
  { id: 'planeta', nombre: 'Planeta', Icono: Earth, escala: 'Toda la humanidad y la biosfera que la sostiene.', representa: 'Naciones Unidas' },
] as const;

type Tarjeta = {
  id: string;
  titulo: string;
  /** Lo que la tarjeta es en general, igual en todas las escalas (como en el post-it). */
  lema: string[];
  /** Lo concreto en cada escala, en el orden de `ACTORES`. */
  nivel: string[][];
  /** Quién trabaja en ella. */
  quien?: string;
  color?: 'amarillo' | 'lila' | 'verde';
  ancho?: number;
  /** Gestión: lo público y lo privado, por escala. */
  publico?: string[][];
  privado?: string[][];
  /** Técnicas: las técnicas con lo que producen. */
  tecnicas?: Array<[string, string]>;
};

const TARJETAS: Tarjeta[] = [
  { id: 'objetivos', titulo: 'Objetivos', lema: ['Salud', 'Alimento', 'Hogar', 'Integridad', 'Aprecio y amor', 'Autonomía'],
    nivel: [
      ['Comer y dormir bien', 'Un techo propio', 'Sentirse querido', 'Decidir su vida'],
      ['Cuidar a los suyos', 'Un hogar digno', 'Educar a los hijos', 'Llegar a fin de mes'],
      ['Convivencia tranquila', 'Servicios cerca', 'Calles seguras', 'Vida en común'],
      ['Vivienda asequible', 'Aire limpio', 'Empleo', 'Moverse con facilidad'],
      ['Cohesión del territorio', 'Sanidad y escuelas para todos', 'Oportunidades', 'Cultura propia'],
      ['Bienestar de la población', 'Paz y seguridad', 'Prosperidad', 'Derechos garantizados'],
      ['Paz entre países', 'Mercado común', 'Libre circulación', 'Ayuda ante las crisis'],
      ['Que nadie pase hambre', 'Paz mundial', 'Clima estable', 'Dignidad para todos'],
    ] },
  { id: 'recursos', titulo: 'Recursos', lema: ['Espacio', 'Tiempo', 'Materia', 'Energía', 'Inteligencia y cultura', 'Vida'],
    nivel: [
      ['Su cuerpo y su salud', '24 horas al día', 'Sus ingresos', 'Lo que sabe'],
      ['La casa', 'Ingresos y ahorros', 'Tiempo en común', 'Redes de apoyo'],
      ['Plazas y locales', 'Comercio cercano', 'Asociaciones', 'Huertos y parques'],
      ['Suelo urbano', 'Presupuesto municipal', 'Talento y universidades', 'Redes de agua y energía'],
      ['Territorio y paisaje', 'Agua y cuencas', 'Industria y campo', 'Lengua y patrimonio'],
      ['Población', 'Recursos naturales', 'Presupuesto del Estado', 'Ciencia y cultura'],
      ['Cientos de millones de personas', 'Fondos comunes', 'Redes de transporte y energía', 'Diversidad cultural'],
      ['Biosfera', 'Océanos y atmósfera', 'Minerales y sol', 'El saber de la humanidad'],
    ] },
  { id: 'valores', titulo: 'Valores y principios', lema: ['Ética', 'Razón', 'Libertad', 'Justicia', 'Conocimiento'],
    nivel: [
      ['Conciencia propia', 'Honestidad', 'Responsabilidad'],
      ['Cariño', 'Respeto', 'Ejemplo', 'Cuidado mutuo'],
      ['Buena vecindad', 'Solidaridad', 'Confianza'],
      ['Civismo', 'Diversidad', 'Participación'],
      ['Identidad', 'Solidaridad entre comarcas', 'Autogobierno'],
      ['Constitución', 'Democracia', 'Igualdad ante la ley'],
      ['Carta de derechos fundamentales', 'Estado de derecho', 'Subsidiariedad'],
      ['Derechos humanos', 'Paz', 'Sostenibilidad', 'Fraternidad'],
    ] },
  { id: 'politica', titulo: 'Poder político', lema: ['Debate', 'Plan', 'Estrategia', 'Acción'], quien: 'Políticos, ciudadanía, asociaciones',
    nivel: [
      ['Decidir qué quiere', 'Plan de vida', 'Votar y opinar'],
      ['Conversación familiar', 'Presupuesto de casa', 'Reparto de tareas'],
      ['Asamblea vecinal', 'Pleno del pueblo', 'Junta de distrito'],
      ['Pleno municipal', 'Alcaldía', 'Presupuestos participativos'],
      ['Parlamento regional', 'Gobierno autonómico'],
      ['Cortes y Senado', 'Gobierno', 'Partidos y elecciones'],
      ['Parlamento Europeo', 'Consejo y Comisión', 'Unión Africana, ASEAN…'],
      ['Asamblea de la ONU', 'Cumbres del G20', 'Acuerdos mundiales'],
    ] },
  { id: 'justicia', titulo: 'Justicia · Seguridad', lema: ['Crimen', 'Respeto', 'Orden'], quien: 'Policías, abogados, jueces',
    nivel: [
      ['Respetar a los demás', 'Reparar el daño causado', 'Denunciar un delito'],
      ['Resolver hablando', 'Mediación familiar', 'Protección de menores'],
      ['Policía local', 'Juez de paz', 'Mediación vecinal'],
      ['Juzgados', 'Policía municipal', 'Bomberos'],
      ['Tribunal superior', 'Policía autonómica', 'Protección civil'],
      ['Tribunal Supremo', 'Policía y Guardia Civil', 'Ejército'],
      ['Tribunal de Justicia de la UE', 'Tribunal Europeo de Derechos Humanos', 'Europol'],
      ['Corte Internacional de Justicia', 'Corte Penal Internacional', 'Cascos azules'],
    ] },
  { id: 'ley', titulo: 'Ley', lema: ['Derechos', 'Obligaciones', 'Libertades'], quien: 'Legisladores y juristas',
    nivel: [
      ['Derechos fundamentales', 'Contratos que firma', 'Deberes cívicos'],
      ['Normas de casa', 'Acuerdos de pareja', 'Derecho de familia'],
      ['Normas de la comunidad', 'Ordenanzas del pueblo'],
      ['Ordenanzas municipales', 'Plan urbanístico'],
      ['Leyes autonómicas', 'Estatuto de autonomía'],
      ['Constitución', 'Leyes y códigos'],
      ['Tratados de la Unión', 'Directivas y reglamentos'],
      ['Declaración Universal de los Derechos Humanos', 'Tratados internacionales'],
    ] },
  { id: 'economia', titulo: 'Economía', lema: ['Intercambio', 'Comercio', 'Moneda', 'Trabajo', 'Financiación'], quien: 'Empresarios, inversores, economistas',
    nivel: [
      ['Sueldo', 'Gastos', 'Ahorro', 'Consumo responsable'],
      ['Ingresos de la casa', 'Alquiler o hipoteca', 'Ahorro y herencia'],
      ['Comercio de cercanía', 'Mercado semanal', 'Cooperativas'],
      ['Empresas y empleo', 'Impuestos municipales', 'Turismo'],
      ['Industria y agricultura', 'Financiación autonómica', 'Cajas y bancos'],
      ['Banco central y moneda', 'Impuestos y Seguridad Social', 'Deuda pública'],
      ['Mercado único', 'Euro y Banco Central Europeo', 'Fondos de cohesión'],
      ['Comercio mundial (OMC)', 'FMI y Banco Mundial', 'Cadenas de suministro'],
    ] },
  { id: 'gestion', titulo: 'Gestión · Administración', ancho: 420,
    lema: ['Servicio o producto', 'Recaudación', 'Inversión y gasto', 'Atención', 'Sistemas e infraestructuras'],
    quien: 'Funcionarios, empresarios, trabajadores', nivel: [],
    publico: [
      ['DNI y trámites', 'Declaración de la renta'], ['Empadronamiento', 'Ayudas familiares'], ['Ayuntamiento', 'Consultorio', 'Escuela'],
      ['Ayuntamiento', 'Transporte público', 'Recogida de basuras'], ['Gobierno regional', 'Sanidad y educación'],
      ['Ministerios', 'Hacienda', 'Seguridad Social'], ['Comisión Europea', 'Agencias europeas'], ['Agencias de la ONU (OMS, FAO…)'],
    ],
    privado: [
      ['Su trabajo o negocio', 'Su presupuesto'], ['Cuentas de casa', 'Tareas domésticas'], ['Tiendas', 'Bares', 'Talleres'],
      ['Empresas', 'Comercio', 'Servicios'], ['Industria', 'Cooperativas agrarias'], ['Grandes empresas', 'Bancos', 'Pymes'],
      ['Multinacionales europeas'], ['Multinacionales', 'Fundaciones y ONG'],
    ] },
  { id: 'tecnicas', titulo: 'Técnicas · Ciencias', ancho: 1280, lema: ['Reglas técnicas que garantizan seguridad, calidad y ecología'],
    quien: 'Ingenieros, médicos, técnicos, investigadores',
    tecnicas: [
      ['Materiales', 'minería, tejidos'], ['Agricultura', 'cultivo'], ['Ganadería', 'animales'], ['Alimentación', 'cocina'],
      ['Construcción', 'vivienda'], ['Movilidad', 'transporte'], ['Energía', 'electricidad'], ['Comunicación', 'internet, informática'],
      ['Agua', 'fontanería'], ['Limpieza', 'higiene'], ['Salud', 'medicina, farmacología'],
    ],
    nivel: [
      ['Cocinar', 'Primeros auxilios', 'Conducir', 'Manejar un ordenador'],
      ['Vivienda', 'Cocina', 'Huerto', 'Botiquín'],
      ['Centro de salud', 'Depósito de agua', 'Caminos', 'Escuela'],
      ['Hospital', 'Metro y autobuses', 'Depuradora', 'Fibra óptica'],
      ['Hospitales de referencia', 'Embalses', 'Trenes regionales', 'Universidades técnicas'],
      ['Centros de investigación médica', 'Red eléctrica', 'Alta velocidad', 'Puertos y aeropuertos'],
      ['Redes transeuropeas', 'Agencia Espacial', 'Interconexiones eléctricas', 'Grandes laboratorios'],
      ['Internet', 'Satélites', 'Vacunas', 'Estación Espacial'],
    ] },
  { id: 'educacion', titulo: 'Conciencia · Educación', color: 'lila', lema: ['Conciencia', 'Sabiduría', 'Conocimiento', 'Escuelas', 'Información', 'Experiencia'],
    quien: 'Maestros, investigadores, familias',
    nivel: [
      ['Autoconocimiento', 'Aprender toda la vida', 'Pensamiento crítico'],
      ['Crianza', 'Valores en casa', 'Ejemplo de los mayores'],
      ['Escuela', 'Biblioteca', 'Asociaciones culturales'],
      ['Institutos', 'Universidad', 'Museos y medios locales'],
      ['Sistema educativo regional', 'Lengua y cultura propias'],
      ['Sistema educativo', 'Investigación científica', 'Medios de comunicación'],
      ['Erasmus', 'Espacio europeo de educación', 'Programas de investigación'],
      ['UNESCO', 'Ciencia abierta', 'Alfabetización universal'],
    ] },
  { id: 'ecologia', titulo: 'Ecología', color: 'verde', lema: ['Límites del planeta', 'Derecho animal', 'Contaminación', 'Sostenibilidad'],
    quien: 'Ecólogos, guardas, activistas',
    nivel: [
      ['Huella personal', 'Consumo responsable', 'Trato a los animales'],
      ['Reciclar en casa', 'Ahorrar agua y energía', 'Mascotas'],
      ['Recogida de residuos', 'Zonas verdes', 'Fuentes y ríos limpios'],
      ['Calidad del aire', 'Transporte limpio', 'Depuración del agua'],
      ['Espacios naturales', 'Cuencas hidrográficas', 'Incendios forestales'],
      ['Parques nacionales', 'Emisiones y energía limpia', 'Protección animal'],
      ['Pacto Verde', 'Red Natura 2000', 'Mercado de emisiones'],
      ['Límites planetarios', 'Clima', 'Biodiversidad', 'Océanos'],
    ] },
];
const POR_ID = Object.fromEntries(TARJETAS.map(t => [t.id, t])) as Record<string, Tarjeta>;

/** La colocación de la foto: objetivos arriba; recursos, política y valores; justicia, ley y economía; gestión; técnicas.
 *  Educación y ecología no son tarjetas sueltas: son las dos membranas que envuelven a todas. */
const ANCHO = 300;
const L = -640, C = -150, R = 340;
const INICIO: Record<string, { x: number; y: number }> = {
  objetivos: { x: C, y: 0 },
  recursos: { x: L, y: 360 }, politica: { x: C, y: 360 }, valores: { x: R, y: 360 },
  justicia: { x: L, y: 730 }, ley: { x: C, y: 730 }, economia: { x: R, y: 730 },
  gestion: { x: C - 60, y: 1110 },
  tecnicas: { x: L, y: 1470 },
};
/** Las flechas de la lógica de Eugenio, con lo que lleva cada una. */
const FLECHAS: Array<[string, string, string, string?]> = [
  ['objetivos', 'politica', 'objetivos de los actores'],
  ['recursos', 'politica', 'recursos'],
  ['valores', 'politica', 'principios'],
  ['politica', 'ley', 'poder legislativo'],
  ['ley', 'justicia', 'reglas de seguridad'],
  ['ley', 'economia', 'reglas económicas'],
  ['ley', 'tecnicas', 'reglas técnicas', 'escalon'],
  ['ley', 'gestion', 'poder ejecutivo'],
  ['economia', 'gestion', 'recaudación e inversión'],
  ['gestion', 'tecnicas', 'sistemas e infraestructuras'],
  ['tecnicas', 'objetivos', 'bienes y servicios', 'vuelta'],
];
const NUCLEO = Object.keys(INICIO);
/** En el móvil, las tarjetas en una columna, en el orden del ciclo, con lo que lleva cada flecha entre ellas. */
const COLUMNA: Array<[string, string?]> = [
  ['objetivos'], ['recursos', 'se cubren con'], ['valores', 'y se guían por'], ['politica', 'de los dos bebe el'],
  ['ley', 'poder legislativo'],
];
/** …y de la ley salen tres reglas a la vez (tras el bot: en fila parecía que las económicas salían de la justicia). */
const RAMAS: Array<[string, string]> = [['justicia', 'reglas de seguridad'], ['economia', 'reglas económicas'], ['tecnicas', 'reglas técnicas']];

const GRIS = '#64748b';
const FONDO: Record<NonNullable<Tarjeta['color']>, string> = { amarillo: '#fdf19a', lila: '#ece3ff', verde: '#dcf5cf' };
/** El borde de las membranas: un gris cálido, sin rellenos (Eugenio pide pocos colores). */
const BORDE_MEMBRANA = '#b3a68f';
/** Un giro pequeño y fijo por tarjeta, para que parezcan pegadas a mano. */
const giro = (id: string) => ((id.charCodeAt(0) + id.length * 7) % 5 - 2) * 0.45;

function estiloFlecha(tipo?: string): Partial<Edge> {
  return {
    type: tipo === 'vuelta' || tipo === 'escalon' ? tipo : 'flotante',
    style: { stroke: GRIS, strokeWidth: tipo === 'vuelta' ? 2.5 : 1.6 },
    markerEnd: { type: MarkerType.ArrowClosed, color: GRIS, width: 18, height: 18 },
  };
}
const flechasBase = (): Edge[] => FLECHAS.map(([s, t, label, tipo]) => ({
  id: `${s}>${t}`, source: s, target: t, data: { label, tipo }, ...estiloFlecha(tipo),
}));

// Cada uno deja la pizarra a su gusto en su navegador (sin cuenta); «Recolocar» la devuelve a la foto.
const LLAVE = 'luz-sociedad-v3';
type Guardado = { pos: Record<string, { x: number; y: number }>; flechas: Array<{ id: string; source: string; target: string; label?: string; tipo?: string }> };
function leer(): Guardado | null {
  try { const j = JSON.parse(localStorage.getItem(LLAVE) || 'null'); return j && j.pos && Array.isArray(j.flechas) ? j : null; } catch { return null; }
}
function guardar(g: Guardado | null) {
  try { if (g) localStorage.setItem(LLAVE, JSON.stringify(g)); else localStorage.removeItem(LLAVE); } catch { /* sin almacenamiento: no pasa nada */ }
}

type Enlace = { c: Circulo; s: Sistema };
const Ctx = createContext<{ nivel: number; buscar: (t: string) => Enlace | null; abrir: (e: Enlace) => void }>({ nivel: 0, buscar: () => null, abrir: () => {} });

/** Las asas invisibles del centro: las flechas flotantes no las usan, pero React Flow necesita que existan. */
function AsasCentro() {
  const st = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (<><Handle type="source" position={Position.Top} style={st} /><Handle type="target" position={Position.Top} style={st} /></>);
}

/** Una palabra que, si es una de nuestras categorías, abre la vista Círculo. */
function Palabra({ t, className }: { t: string; className?: string }) {
  const { buscar, abrir } = useContext(Ctx);
  const e = buscar(t);
  if (!e) return <span className={className}>{t}</span>;
  return (
    <button type="button" onClick={() => abrir(e)} title={`Ver ${e.s.titulo} en el Círculo`} data-palabra-categoria
      className={cn('nodrag cursor-pointer underline-offset-2 hover:underline', className)}>{t}<span aria-hidden className="ml-0.5 align-super text-[0.6em] text-slate-500">↗</span></button>
  );
}

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="space-y-0.5 text-[17px] leading-snug text-slate-900">
      {items.map(x => <li key={x} className="flex gap-1.5"><span aria-hidden className="text-slate-900/40">•</span><Palabra t={x} /></li>)}
    </ul>
  );
}
const enLinea = (xs: string[]) => xs.map((x, i) => <span key={x}>{i > 0 && <span aria-hidden className="text-slate-900/30"> · </span>}<Palabra t={x} /></span>);

/** Lo de dentro del post-it: el mismo en la pizarra y en la columna del móvil. */
function Contenido({ t }: { t: Tarjeta }) {
  const { nivel } = useContext(Ctx);
  // Lo de esta escala, separado por una raya como en la foto; con un fundido al cambiar de escala, para que se note.
  const escala = (
    <div key={nivel} className="soc-fundido mt-3 border-t border-slate-900/15 pt-2.5" data-escala-bloque>
      <p className="mb-1 text-[13px] font-black uppercase tracking-[0.12em] text-slate-900" data-escala>{ACTORES[nivel].nombre}</p>
      {t.publico && t.privado ? (
        <div className="grid grid-cols-2 gap-3">
          <div><p className="mb-0.5 text-[12px] font-black uppercase tracking-wide text-slate-600">Público</p><Lista items={t.publico[nivel]} /></div>
          <div className="border-l border-slate-900/15 pl-3"><p className="mb-0.5 text-[12px] font-black uppercase tracking-wide text-slate-600">Privado</p><Lista items={t.privado[nivel]} /></div>
        </div>
      ) : t.tecnicas ? (
        <p className="text-[18px] font-semibold leading-snug">{enLinea(t.nivel[nivel])}</p>
      ) : <Lista items={t.nivel[nivel]} />}
    </div>
  );
  return (
    <>
      <h3 className="text-[30px] font-black uppercase leading-none tracking-wide" style={{ fontFamily: LETRA_TITULO }}>{t.titulo}</h3>
      <p className="mt-2 text-[15px] font-semibold leading-snug text-slate-700">{enLinea(t.lema)}</p>
      {escala}
      {/* Las técnicas, iguales en todas las escalas: pequeñas, debajo de lo que sí cambia. */}
      {t.tecnicas && (
        <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-6">
          {t.tecnicas.map(([n, d]) => (
            <div key={n} className="rounded bg-white/40 px-2 py-1 leading-tight">
              <Palabra t={n} className="text-[12.5px] font-black" /> <span className="text-[11px] text-slate-600">{d}</span>
            </div>
          ))}
        </div>
      )}
      {t.quien && <p className="mt-2.5 text-[13px] italic leading-snug text-slate-600">{t.quien}</p>}
    </>
  );
}

/** EL POST-IT de la pizarra. */
function PostIt({ data, selected }: NodeProps<Node<{ t: Tarjeta }>>) {
  const t = data.t;
  return (
    <div data-postit={t.id} style={{ width: t.ancho ?? ANCHO, background: FONDO[t.color || 'amarillo'], transform: `rotate(${giro(t.id)}deg)` }}
      className={cn('relative rounded-[3px] px-5 pb-4 pt-4 text-slate-900 transition-shadow',
        selected ? 'shadow-[0_18px_40px_-12px_rgba(15,23,42,0.45)] ring-2 ring-slate-900/70' : 'shadow-[0_10px_24px_-14px_rgba(15,23,42,0.55)] hover:shadow-[0_16px_32px_-14px_rgba(15,23,42,0.55)]')}>
      <AsasCentro />
      <PuntosConexion visible={!!selected} />
      <Contenido t={t} />
    </div>
  );
}

/** El rótulo de una membrana: su nombre en grande y lo que es en la escala elegida. */
function RotuloMembrana({ tipo }: { tipo: 'educacion' | 'ecologia' }) {
  const { nivel } = useContext(Ctx);
  const t = POR_ID[tipo];
  return (
    <div data-rotulo-membrana={tipo}>
      <p className="leading-none text-slate-900">
        <span className="text-[26px] font-black uppercase tracking-wide" style={{ fontFamily: LETRA_TITULO }}>{t.titulo}</span>
        <span className="ml-2 text-[14px] font-semibold text-slate-500">— {tipo === 'ecologia' ? 'los límites del planeta lo envuelven todo' : 'atraviesa todo el sistema'}</span>
      </p>
      <p key={nivel} className="soc-fundido mt-1 text-[15px] leading-snug text-slate-800">
        <span className="font-black uppercase tracking-[0.1em] text-[12.5px]">{ACTORES[nivel].nombre}:</span> {t.nivel[nivel].join(' · ')}
      </p>
    </div>
  );
}

/** LAS MEMBRANAS: educación por dentro (raya discontinua) y ecología por fuera (raya continua), alrededor de todas las tarjetas. */
function Membrana({ data }: NodeProps<Node<{ tipo: 'educacion' | 'ecologia'; w: number; h: number }>>) {
  const eco = data.tipo === 'ecologia';
  return (
    <div data-membrana={data.tipo} style={{ width: data.w, height: data.h, borderColor: BORDE_MEMBRANA, borderStyle: eco ? 'solid' : 'dashed' }}
      className="pointer-events-none relative rounded-[64px] border-2">
      <div className="absolute left-12 right-12" style={{ top: eco ? 16 : 22 }}><RotuloMembrana tipo={data.tipo} /></div>
    </div>
  );
}
/** Los huecos de las membranas: la de educación, a los lados y arriba (con sitio para su rótulo y la flecha del ciclo);
 *  la de ecología, una banda más por fuera. */
const HUECO_EDU = { lado: 140, arriba: 124 }, BANDA_ECO = 92;

/** La flecha del ciclo: de las técnicas vuelve a los objetivos por fuera, por la izquierda, con su nombre en horizontal
 *  en el tramo de arriba (es el cierre del ciclo de la hoja de Eugenio: bienes, impuestos, inversión social). */
function Vuelta({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const a = useInternalNode(source), b = useInternalNode(target);
  if (!a || !b) return null;
  const sx = a.internals.positionAbsolute.x, sy = a.internals.positionAbsolute.y + (a.measured.height ?? 0) / 2;
  const tx = b.internals.positionAbsolute.x, ty = b.internals.positionAbsolute.y + (b.measured.height ?? 0) / 2;
  const [d] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: Position.Left, targetX: tx, targetY: ty, targetPosition: Position.Left, offset: 90, borderRadius: 28 });
  const izq = Math.min(sx, tx) - 90;
  return (
    <>
      <path d={d} fill="none" strokeWidth={18} stroke="transparent" className="react-flow__edge-interaction" />
      <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${(izq + tx) / 2}px, ${ty}px)`, color: (style as any)?.stroke }} data-etiqueta-vuelta
          className="nodrag nopan whitespace-nowrap rounded-full border-2 border-current bg-white px-3 py-1 font-black uppercase tracking-wide">↺ {(data as any)?.label} vuelven a los objetivos</div>
      </EdgeLabelRenderer>
    </>
  );
}

/** Una flecha que sale por la izquierda y baja (la ley → las técnicas, por el pasillo entre la justicia y la ley, para no
 *  cruzar la gestión, que está debajo del centro como en la foto). */
function Escalon({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const a = useInternalNode(source), b = useInternalNode(target);
  if (!a || !b) return null;
  const sx = a.internals.positionAbsolute.x, sy = a.internals.positionAbsolute.y + (a.measured.height ?? 0) * 0.62;
  const tx = sx - 95, ty = b.internals.positionAbsolute.y;
  const [d, lx, ly] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: Position.Left, targetX: tx, targetY: ty, targetPosition: Position.Top, borderRadius: 20 });
  return (
    <>
      <path d={d} fill="none" strokeWidth={18} stroke="transparent" className="react-flow__edge-interaction" />
      <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />
      {(data as any)?.label && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, color: (style as any)?.stroke }}
            className="nodrag nopan whitespace-nowrap rounded-full border border-current bg-white/90 px-2 py-0.5 font-black uppercase tracking-wide">{(data as any).label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { postit: PostIt, membrana: Membrana };
const edgeTypes = { flotante: FloatingEdge, vuelta: Vuelta, escalon: Escalon };

const nodosIniciales = (pos?: Guardado['pos']): Node[] => NUCLEO.map(id => ({
  id, type: 'postit', position: pos?.[id] || INICIO[id], data: { t: POR_ID[id] }, deletable: false,
}));
const flechasDe = (g: Guardado | null): Edge[] => (g ? g.flechas.map(f => ({ id: f.id, source: f.source, target: f.target, data: { label: f.label, tipo: f.tipo }, ...estiloFlecha(f.tipo) })) : flechasBase());

/** En el móvil no hay pizarra: las tarjetas en una columna, dentro de las dos membranas, con las flechas entre ellas. */
const PILDORA = 'rounded-full border border-slate-400 bg-white/90 px-2.5 py-0.5 text-center text-[11px] font-black uppercase tracking-wide text-slate-600';
/** Un paso de la columna del móvil: la flecha con su nombre y, si la hay, la tarjeta. */
function Paso({ id, flecha, final }: { id?: string; flecha?: string; final?: boolean }) {
  return (
    <div>
      {flecha && (
        <div className="flex flex-col items-center py-1.5 text-slate-500">
          <span aria-hidden className="h-3 w-px bg-slate-400" /><span className={PILDORA}>{flecha}</span>{!final && <span aria-hidden className="leading-none">↓</span>}
        </div>
      )}
      {id && (
        <div data-postit={id} className="rounded-[3px] px-4 pb-4 pt-4 text-slate-900 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.55)]" style={{ background: FONDO.amarillo }}>
          <Contenido t={POR_ID[id]} />
        </div>
      )}
    </div>
  );
}

function ColumnaMovil() {
  const pill = PILDORA;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3" data-columna-sociedad>
      <div className="rounded-[36px] border-2 p-3 pt-4" style={{ borderColor: BORDE_MEMBRANA }}>
        <div className="px-2 pb-3"><RotuloMembrana tipo="ecologia" /></div>
        <div className="rounded-[28px] border-2 border-dashed p-3 pt-4" style={{ borderColor: BORDE_MEMBRANA }}>
          <div className="px-1 pb-3"><RotuloMembrana tipo="educacion" /></div>
          {COLUMNA.map(([id, flecha]) => <Paso key={id} id={id} flecha={flecha} />)}
          <Paso flecha="de la ley salen tres reglas" />
          <div className="ml-1 border-l-2 border-slate-400 pl-3" data-ramas-ley>
            {RAMAS.map(([id, flecha]) => <Paso key={id} id={id} flecha={flecha} />)}
          </div>
          <Paso id="gestion" flecha="poder ejecutivo · recaudación e inversión" />
          <Paso flecha="mantiene los sistemas e infraestructuras de las técnicas" final />
          <p className="mt-3 text-center"><span className={pill}>↺ bienes y servicios: vuelven a cubrir los objetivos</span></p>
        </div>
      </div>
    </div>
  );
}

function useMovil() {
  const consulta = '(max-width: 767px)';
  const [movil, setMovil] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const f = () => setMovil(m.matches);
    m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, []);
  return movil;
}

export default function VistaSociedadSitio({ raizId }: { raizId: string }) {
  const { pathname } = useLocation();
  const ir = useNavigate();
  const movil = useMovil();
  // La escala va en la dirección (`?actor=familia`) para poder compartirla, pero se cambia sin pasar por el router: sus
  // navegaciones van en una transición que la pizarra (que se mide y se repinta sin parar) no dejaba terminar nunca.
  const [nivel, setNivel] = useState(() => {
    try { return Math.max(0, ACTORES.findIndex(a => a.id === new URLSearchParams(window.location.search).get('actor'))); } catch { return 0; }
  });
  const elegir = (i: number) => {
    setNivel(i);
    try {
      const u = new URL(window.location.href);
      if (i === 0) u.searchParams.delete('actor'); else u.searchParams.set('actor', ACTORES[i].id);
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
    } catch { /* sin dirección que tocar */ }
  };

  // Nuestras categorías por su nombre (como en la Pirámide), para enlazar lo que coincida.
  const { circulos } = useCirculosTerritorio(raizId, PATAS);
  const categorias = useMemo(() => (circulos || []).flatMap(c => c.sistemas.map(s => ({ c, s, clave: plano(s.titulo) }))), [circulos]);
  const buscar = useCallback((t: string): Enlace | null => {
    const x = plano(t);
    const e = categorias.find(k => x === k.clave);
    return e ? { c: e.c, s: e.s } : null;
  }, [categorias]);
  const abrir = useCallback((e: Enlace) => {
    ir(`${pathname}?${new URLSearchParams({ vista: 'circulos', circulo: e.c.clave, sector: e.s.id }).toString()}`);
    window.scrollTo(0, 0);
  }, [ir, pathname]);
  const ctx = useMemo(() => ({ nivel, buscar, abrir }), [nivel, buscar, abrir]);

  const [nodos, setNodos] = useState<Node[]>(() => nodosIniciales(leer()?.pos));
  const [flechas, setFlechas] = useState<Edge[]>(() => flechasDe(leer()));
  const [tocada, setTocada] = useState(() => !!leer());

  // Las membranas se ajustan a donde estén las tarjetas: la de educación pegada a ellas, la de ecología por fuera.
  const membranas = useMemo<Node[]>(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodos) {
      const w = n.measured?.width ?? POR_ID[n.id].ancho ?? ANCHO, h = n.measured?.height ?? 260;
      x0 = Math.min(x0, n.position.x); y0 = Math.min(y0, n.position.y);
      x1 = Math.max(x1, n.position.x + w); y1 = Math.max(y1, n.position.y + h);
    }
    const caja = (tipo: 'educacion' | 'ecologia', mas: number): Node => {
      const x = x0 - HUECO_EDU.lado - mas, y = y0 - HUECO_EDU.arriba - mas;
      const w = x1 + HUECO_EDU.lado + mas - x, h = y1 + HUECO_EDU.lado + mas - y;
      return { id: `membrana-${tipo}`, type: 'membrana', position: { x, y }, data: { tipo, w, h }, width: w, height: h, measured: { width: w, height: h },
        draggable: false, selectable: false, deletable: false, focusable: false, zIndex: -1, className: 'pointer-events-none' };
    };
    return [caja('ecologia', BANDA_ECO), caja('educacion', 0)];
  }, [nodos]);
  const todos = useMemo(() => [...membranas, ...nodos], [membranas, nodos]);

  const onNodesChange = useCallback((ch: NodeChange[]) => {
    const propios = ch.filter(c => !('id' in c) || !String(c.id).startsWith('membrana-'));
    setNodos(ns => applyNodeChanges(propios, ns));
    if (propios.some(c => c.type === 'position' && c.dragging === false)) setTocada(true);
  }, []);
  const onEdgesChange = useCallback((ch: EdgeChange[]) => {
    setFlechas(es => applyEdgeChanges(ch, es));
    if (ch.some(c => c.type === 'remove')) setTocada(true);
  }, []);
  // Una flecha nueva, de una tarjeta a otra (desde los puntos de su borde).
  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target || c.target.startsWith('membrana-')) return;
    setFlechas(es => addEdge({ ...c, id: `${c.source}>${c.target}>${Date.now().toString(36)}`, sourceHandle: null, targetHandle: null, data: {}, ...estiloFlecha() }, es));
    setTocada(true);
  }, []);

  // Recordar la pizarra de cada uno, cuando la ha tocado.
  useEffect(() => {
    if (!tocada) return;
    guardar({
      pos: Object.fromEntries(nodos.map(n => [n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) }])),
      flechas: flechas.map(f => ({ id: f.id, source: f.source, target: f.target, label: (f.data as any)?.label, tipo: (f.data as any)?.tipo })),
    });
  }, [nodos, flechas, tocada]);
  // Doble clic en una flecha: un campo ahí mismo para ponerle (o cambiarle) el nombre.
  const caja = useRef<HTMLDivElement>(null);
  const [editando, setEditando] = useState<{ id: string; x: number; y: number; texto: string } | null>(null);
  const onEdgeDoubleClick = useCallback((e: React.MouseEvent, f: Edge) => {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    setEditando({ id: f.id, x: e.clientX - r.left, y: e.clientY - r.top, texto: String((f.data as any)?.label || '') });
  }, []);
  const nombrar = () => {
    if (!editando) return;
    const label = editando.texto.trim() || undefined;
    setFlechas(es => es.map(f => (f.id === editando.id ? { ...f, data: { ...(f.data || {}), label } } : f)));
    setEditando(null); setTocada(true);
  };
  // La ayuda, flotando sobre la pizarra la primera vez; al cerrarla, no vuelve.
  const [ayuda, setAyuda] = useState(() => { try { return !localStorage.getItem('luz-sociedad-ayuda'); } catch { return true; } });
  const cerrarAyuda = () => { setAyuda(false); try { localStorage.setItem('luz-sociedad-ayuda', '1'); } catch { /* sin almacenamiento */ } };

  const recolocar = () => { guardar(null); setNodos(nodosIniciales()); setFlechas(flechasBase()); setTocada(false); };

  // Dónde acaba la barra: la pizarra llena lo que queda de ventana (como el mapa).
  const [barra, setBarra] = useState(80);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-cabecera-sitio]');
    if (!el) return;
    window.scrollTo(0, 0);
    const medir = () => setBarra(Math.round(el.getBoundingClientRect().bottom));
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    document.documentElement.classList.add('vista-pizarra');
    return () => { ro.disconnect(); document.documentElement.classList.remove('vista-pizarra'); };
  }, []);

  // Al abrir se encuadran las dos membranas y las tres primeras filas, para que se lean; la rueda del ratón desplaza
  // la pizarra hacia la gestión y las técnicas, y el botón de encuadrar la enseña entera.
  const encuadrar = useCallback((rf: ReactFlowInstance) => {
    const eco = membranas[1], fila3 = nodos.find(n => n.id === 'economia');
    if (!eco || !fila3) { rf.fitView(); return; }
    const d = eco.data as { w: number };
    rf.fitBounds({ x: eco.position.x, y: eco.position.y, width: d.w, height: fila3.position.y + 280 - eco.position.y }, { padding: 0.03 });
  }, [membranas, nodos]);
  const actor = ACTORES[nivel];
  return (
    <Ctx.Provider value={ctx}>
      <div data-vista-sociedad className="relative flex flex-col bg-[#f6f1e7] md:flex-row"
        style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', marginTop: -16, marginBottom: -64, height: `calc(100dvh - ${barra}px)` }}>
        <style>{`html.vista-pizarra, html.vista-pizarra body { overflow: hidden; } html.vista-pizarra footer { display: none; }
          [data-vista-sociedad] .react-flow__node-membrana { pointer-events: none !important; }
          [data-vista-sociedad] .react-flow__edgelabel-renderer { z-index: 1001; }
          [data-vista-sociedad] .react-flow__edgelabel-renderer > div { font-size: 12px; }
          @keyframes soc-fundido { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
          .soc-fundido { animation: soc-fundido .25s ease-out; }`}</style>
        {/* EL SELECTOR DE ACTORES, en un lateral como el post-it de la foto (arriba en el móvil). */}
        <aside data-actores className="z-10 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 md:w-64 md:gap-3 md:border-b-0 md:border-r md:px-4 md:py-5">
          <div className="hidden md:block">
            <p className="text-[26px] font-black uppercase leading-none tracking-wide" style={{ fontFamily: LETRA_TITULO }}>Actores</p>
            <p className="mt-1.5 text-[13px] leading-snug text-slate-600">La misma lógica, a cada escala. Elige una y las tarjetas se ajustan a ella.</p>
          </div>
          <div className="relative">
            <nav aria-label="Escala de los actores" className="-mx-1 flex gap-1 overflow-x-auto pb-1 pr-8 md:mx-0 md:flex-col md:overflow-visible md:pb-0 md:pr-0">
              {ACTORES.map((a, i) => (
                <button key={a.id} type="button" onClick={() => elegir(i)} aria-pressed={i === nivel} data-actor={a.id}
                  className={cn('flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-bold transition-colors',
                    i === nivel ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')}>
                  <a.Icono className="h-[18px] w-[18px] shrink-0" /> {a.nombre}
                </button>
              ))}
            </nav>
            {/* En el móvil, un degradado avisa de que hay más escalas a la derecha. */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent md:hidden" />
          </div>
          <p className="text-[12px] leading-snug text-slate-600 md:hidden"><span className="font-bold text-slate-800">{actor.nombre}:</span> {actor.escala}</p>
          <div className="hidden rounded-xl bg-[#fdf19a] p-3 text-[13px] leading-snug shadow-sm md:block" data-escala-actual>
            <p className="font-black">{actor.nombre}</p>
            <p className="mt-0.5 text-slate-700">{actor.escala}</p>
            <p className="mt-1.5 text-slate-600"><span className="font-bold text-slate-800">Le representa:</span> {actor.representa}</p>
          </div>
          <div className="mt-auto hidden space-y-2 md:block">
            {!ayuda && <button type="button" onClick={() => setAyuda(true)} className="text-[12px] font-bold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">¿Cómo se usa la pizarra?</button>}
            {tocada && (
              <button type="button" onClick={recolocar} data-recolocar className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> Recolocar como al principio
              </button>
            )}
          </div>
        </aside>
        {movil ? <ColumnaMovil /> : (
          <div ref={caja} className="relative min-h-0 flex-1" data-pizarra-sociedad>
            <ReactFlow nodes={todos} edges={flechas} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onEdgeDoubleClick={onEdgeDoubleClick}
              zoomOnDoubleClick={false} connectionMode={ConnectionMode.Loose} connectOnClick onInit={encuadrar} minZoom={0.15} maxZoom={1.6}
              panOnScroll zoomOnScroll={false} zoomOnPinch
              deleteKeyCode={['Backspace', 'Delete']} proOptions={{ hideAttribution: true }} elevateNodesOnSelect>
              <Background color="#e3d9c6" gap={28} size={1.4} />
              <Controls showInteractive={false} position="bottom-right" fitViewOptions={{ padding: 0.04 }} />
            </ReactFlow>
            {editando && (
              <input autoFocus value={editando.texto} placeholder="Nombre de la flecha" data-nombre-flecha
                onChange={e => setEditando({ ...editando, texto: e.target.value })} onBlur={nombrar}
                onKeyDown={e => { if (e.key === 'Enter') nombrar(); if (e.key === 'Escape') setEditando(null); }}
                style={{ left: editando.x, top: editando.y }}
                className="absolute z-20 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 shadow-lg outline-none" />
            )}
            {ayuda && (
              <div role="note" data-ayuda-pizarra className="absolute left-1/2 top-3 z-20 flex w-[min(640px,calc(100%-24px))] -translate-x-1/2 items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-[13.5px] leading-snug text-white shadow-xl">
                <p><b>Es una pizarra:</b> arrastra las tarjetas a tu gusto. Para unir dos, pulsa una y tira una flecha desde un punto azul de su borde. Doble clic en una flecha para ponerle nombre; Supr la borra. La rueda del ratón te lleva a la gestión y las técnicas.</p>
                <button type="button" onClick={cerrarAyuda} aria-label="Cerrar la ayuda" className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15"><X className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
