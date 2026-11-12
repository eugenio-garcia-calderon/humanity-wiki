// Data for the «Escalas» window of the «Modelo socioeconómico optimizado»: the
// door into the model (Eugenio, 2026-11-12: «una pestaña donde se expliquen las
// escalas sociales, desde la persona, vecindad hasta el planeta… donde queremos
// repartir y empoderar a cada una de esas escalas, y donde se hable de la
// responsabilidad de cada una de ellas»).
//
// The eight scales themselves (names, colours, who decides) live in
// modeloSocioeconomico.ts; this file adds what this window needs on top: the
// responsibility of each scale, who does that job today, a few everyday tasks
// to show the rule of subsidiarity, and the sources that are new here.
// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
import { ESPANA, HOY, numero, type EscalaId } from './modeloSocioeconomico';

export const APARTADOS: { id: string; t: string }[] = [
  { id: 'escalas', t: 'Resumen' },
  { id: 'escalas-idea', t: 'La idea' },
  { id: 'escalas-hoy', t: 'Hoy' },
  { id: 'escalas-cada', t: 'Cada escala' },
  { id: 'escalas-decide', t: 'Quién decide' },
  { id: 'escalas-ayuda', t: 'Cómo se ayudan' },
  { id: 'escalas-retos', t: 'Lo que falta y fuentes' },
  { id: 'escalas-dinero', t: 'El dinero' },
];

// ── SOURCES NEW TO THIS WINDOW ──────────────────────────────────────────────
// The rest are ids of `FUENTES` in modeloSocioeconomico.ts (igae-cofog,
// ue-presupuesto, ue-espana, aod-2025, ine-poblacion, comunidades-cuotas).
export const F = {
  carta: { url: 'https://www.boe.es/eli/es/ai/1985/10/15/(1)/con', titulo: 'BOE · Carta Europea de Autonomía Local (en vigor en España, BOE de 24-2-1989), artículos 4 y 9' },
  tue: { url: 'https://eur-lex.europa.eu/eli/treaty/teu_2016/art_5/oj/spa', titulo: 'EUR-Lex · Tratado de la Unión Europea, artículo 5: el principio de subsidiariedad' },
  constitucion: { url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229', titulo: 'BOE · Constitución Española, artículos 137 a 142: municipios, provincias y comunidades autónomas' },
  lbrl: { url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-5392', titulo: 'BOE · Ley 7/1985, reguladora de las Bases del Régimen Local: qué hace el ayuntamiento (art. 25-26) y la diputación (art. 36)' },
  ueHacienda: { url: 'https://www.fondoseuropeos.hacienda.gob.es/sitios/dgfc/es-ES/rpue/rfeue/Documents/RELACIONES%20FINANCIERAS%20ENTRE%20ESPA%C3%91A%20Y%20LA%20UE%202024%20PDF%20ACCESIBLE.pdf', titulo: 'Ministerio de Hacienda · Relaciones financieras entre España y la UE 2024: aportación de España en 2023, 13.985,71 M€' },
  lph: { url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1960-10906', titulo: 'BOE · Ley 49/1960, de Propiedad Horizontal: las comunidades de propietarios' },
} as const;

// ── TODAY: WHO SPENDS SPAIN'S PUBLIC MONEY ──────────────────────────────────
// IGAE, consolidated spending by subsector in 2024 (transfers between
// administrations removed, so each euro is counted once, where it is finally
// spent). They add up to the total, 725.001 M€.
export const HOY_SUBSECTORES = [
  { id: 'local', nombre: 'Ayuntamientos y diputaciones', escalas: 'Municipio y provincia', millones: HOY.gastoLocal2024, color: 'municipio' as EscalaId },
  { id: 'regional', nombre: 'Comunidades autónomas', escalas: 'Región', millones: HOY.gastoRegional2024, color: 'region' as EscalaId },
  { id: 'central', nombre: 'Estado', escalas: 'Nación', millones: HOY.gastoCentral2024, color: 'nacion' as EscalaId },
  { id: 'ss', nombre: 'Seguridad Social', escalas: 'Nación', millones: HOY.gastoSeguridadSocial2024, color: 'nacion' as EscalaId },
];
export const HOY_TOTAL = HOY.gastoTotal2024;
/** Spain's gross contribution to the EU budget in 2023, M€ (F.ueHacienda). */
export const APORTACION_UE_2023 = 13_985.71;
/** Share of health and education spending done by the regions in 2024 (IGAE, igae-cofog). */
export const HOY_REGIONAL_SANIDAD = 93.0;
export const HOY_REGIONAL_EDUCACION = 91.0;

// ── THE RESPONSIBILITY OF EACH SCALE ────────────────────────────────────────
// Written for this page from Eugenio's matrix (MATRIZ) and the «devuelve» line
// of each scale: a starting point, not a law. `hoy` is who does that job today.
export interface Responsabilidad {
  /** One short line, for the summary. */
  corta: string;
  /** «Responde de: …», short, for the summary. */
  respondeDe: string;
  /** What this scale answers for: what fails if it does not do its part. */
  responde: string;
  /** What it does not try to do alone, and passes up. */
  sube: string;
  /** Who it helps, and how. */
  ayuda: string;
  /** Who does this job today in Spain. */
  hoy: string;
  /** Source for `hoy`, when there is a law behind it. */
  hoyFuente?: keyof typeof F;
}

export const RESPONSABILIDAD: Record<EscalaId, Responsabilidad> = {
  persona: {
    corta: 'Cuidar de sí misma y de los suyos, y participar',
    respondeDe: 'su salud, aprender, su colchón y votar',
    responde: 'De su salud, de aprender, de tener un pequeño colchón propio y de ir a votar a sus escalas. Recibe un dividendo cada mes y decide en qué lo usa.',
    sube: 'Lo que no puede pagar o hacer sola (el tejado, la escuela, el hospital) se lo pide a su comunidad vecinal o a su municipio.',
    ayuda: 'A su familia y a quien tenga cerca: puede prestarles sin intereses, solo ajustando la subida de precios: no gana nada.',
    hoy: 'Hoy no recibe nada por ser persona: lo público le llega en forma de servicios, pensiones o ayudas que pide y que deciden otros.',
  },
  vecindad: {
    corta: 'Que el edificio o la casa estén cuidados y nadie quede solo',
    respondeDe: 'el edificio y sus vecinos mayores o con discapacidad',
    responde: 'Del edificio o de la casa (tejado, ascensor, accesibilidad, energía) y de que los vecinos mayores o con discapacidad no se queden solos.',
    sube: 'Las calles, el agua y la recogida de basura, que son del municipio.',
    ayuda: 'A una familia del edificio que pase un mal momento, con un préstamo sin intereses, solo ajustado a la subida de precios, o una donación puntual.',
    hoy: 'La comunidad de propietarios, que se paga con cuotas de cada vecino y donde solo votan quienes son dueños.',
    hoyFuente: 'lph',
  },
  municipio: {
    corta: 'El agua, las calles, la escuela infantil y el trabajo cercano',
    respondeDe: 'agua, calles, residuos, escuela infantil y empleo cercano',
    responde: 'De agua, calles, residuos, parques, escuela infantil, consultorio, vivienda municipal y de ofrecer una ocupación a quien se queda sin ingresos.',
    sube: 'Lo que un pueblo pequeño no puede sostener solo: bomberos, instituto, urgencias, carreteras entre pueblos.',
    ayuda: 'A los hogares y a las comunidades vecinales, con préstamos sin intereses, solo ajustados a la subida de precios, y donaciones puntuales; y a otros pueblos, de igual a igual.',
    hoy: 'El ayuntamiento, con lo que le marca la ley de régimen local.',
    hoyFuente: 'lbrl',
  },
  provincia: {
    corta: 'Lo que los pueblos no pueden sostener solos',
    respondeDe: 'carreteras entre pueblos, bomberos e institutos',
    responde: 'De carreteras entre pueblos, bomberos, institutos, urgencias comarcales y del equipo técnico que comparten todos los municipios pequeños.',
    sube: 'Hospitales, universidades y trenes regionales, que son de la región.',
    ayuda: 'A los municipios: con técnicos (arquitectura, ingeniería, asesoría jurídica) y con préstamos sin intereses, solo ajustados a la subida de precios.',
    hoy: 'La diputación provincial (o el cabildo y el consejo insular en las islas), cuyo papel principal es ayudar a los municipios.',
    hoyFuente: 'lbrl',
  },
  region: {
    corta: 'Hospitales, universidades, transporte regional y vivienda',
    respondeDe: 'hospitales, universidades, cercanías y vivienda',
    responde: 'De hospitales y especialistas, profesorado y universidades, cercanías, vivienda pública y emergencias (112).',
    sube: 'Lo que necesitan todas las regiones a la vez: grandes redes, defensa, justicia común.',
    ayuda: 'A las provincias y municipios que más lo necesitan, con préstamos sin intereses, solo ajustados a la subida de precios.',
    hoy: 'La comunidad autónoma, que hoy hace casi toda la sanidad y la educación.',
    hoyFuente: 'constitucion',
  },
  nacion: {
    corta: 'Lo que todas las regiones necesitan a la vez',
    respondeDe: 'discapacidad, redes, defensa y justicia',
    responde: 'Del apoyo en especie a las personas con discapacidad, la red eléctrica y el ferrocarril, la defensa, la justicia, los medicamentos y vacunas, y del sistema de pago que reparte el dinero.',
    sube: 'Lo que cruza fronteras: trenes y redes entre países, defensa común.',
    ayuda: 'A las regiones, con préstamos sin intereses, solo ajustados a la subida de precios.',
    hoy: 'El Estado y la Seguridad Social, que paga las pensiones.',
    hoyFuente: 'constitucion',
  },
  continente: {
    corta: 'Lo que une a los países de Europa',
    respondeDe: 'redes entre países, cohesión y defensa común',
    responde: 'De las redes entre países (trenes, electricidad), la cohesión entre regiones, la defensa común, el Erasmus y la compra conjunta de vacunas.',
    sube: 'Lo que es de todo el planeta: clima, océanos, paz.',
    ayuda: 'A las naciones y regiones con menos medios, con fondos de cohesión.',
    hoy: 'La Unión Europea, que se financia sobre todo con aportaciones de los países.',
    hoyFuente: 'tue',
  },
  planeta: {
    corta: 'Clima, océanos, paz y catástrofes',
    respondeDe: 'clima, océanos, paz y catástrofes',
    responde: 'Del clima, los océanos, la paz, la respuesta a catástrofes, el hambre cero, la salud global y la ciencia abierta.',
    sube: 'Nada: es la última escala.',
    ayuda: 'A los continentes y países donde falta lo básico: energía limpia, semillas, salud.',
    hoy: 'Las Naciones Unidas y sus agencias, y la ayuda al desarrollo que cada país decide dar.',
  },
};

// ── «WHO TAKES CARE OF…?»: THE RULE, WITH EVERYDAY THINGS ──────────────────
export interface Tarea { id: string; texto: string; escala: EscalaId; porque: string }
export const TAREAS: Tarea[] = [
  { id: 'tejado', texto: 'Arreglar el tejado del edificio', escala: 'vecindad', porque: 'Es de quienes viven bajo él. Si la obra es muy cara, el municipio le presta sin intereses, solo ajustando la subida de precios.' },
  { id: 'farola', texto: 'Una farola fundida en la calle', escala: 'municipio', porque: 'La calle es de todo el pueblo, y el ayuntamiento está a la vuelta de la esquina.' },
  { id: 'bomberos', texto: 'Un parque de bomberos', escala: 'provincia', porque: 'Un pueblo de 400 habitantes no puede pagar uno; diez pueblos juntos, sí.' },
  { id: 'hospital', texto: 'Un hospital con especialistas', escala: 'region', porque: 'Hace falta mucha población para llenar sus quirófanos y sus consultas.' },
  { id: 'vacunas', texto: 'Comprar medicamentos y vacunas', escala: 'nacion', porque: 'Comprando para todo el país a la vez se paga menos y nadie se queda sin ellos.' },
  { id: 'tren', texto: 'Un tren de Madrid a París', escala: 'continente', porque: 'Cruza fronteras: ningún país puede hacerlo solo.' },
  { id: 'clima', texto: 'Frenar el cambio climático', escala: 'planeta', porque: 'El aire no tiene fronteras: lo que hace un país lo nota toda la Tierra.' },
  { id: 'curso', texto: 'Un curso para aprender un idioma', escala: 'persona', porque: 'Es una decisión suya: lo paga con su dividendo, si quiere.' },
];

// ── WHAT IS STILL OPEN ──────────────────────────────────────────────────────
export const RETOS: { t: string; d: string; fuente?: string }[] = [
  { t: 'Igual por habitante no es igual por necesidad', d: 'Cada escala recibe lo mismo por cada persona que vive en ella. Pero un pueblo con mucha gente mayor o muy disperso necesita más que una ciudad. La ayuda entre escalas lo compensa, y faltan reglas claras de cuándo y cuánto.' },
  { t: 'Dónde acaba cada escala', d: 'Varias comunidades autónomas tienen una sola provincia (Madrid, Murcia, Asturias…): allí la provincia y la región ocupan el mismo territorio. Hay que decidir si se unen, si la provincia se convierte en comarcas o si las dos conviven con tareas distintas.' },
  { t: 'Pueblos sin técnicos', d: `${numero(ESPANA.municipiosMenos1000)} de los ${numero(ESPANA.municipios)} municipios de España tienen menos de 1.000 habitantes. Un pueblo así no puede pagar un arquitecto, un ingeniero y un abogado propios. Sin el equipo técnico compartido de la provincia, el dinero no se convierte en obras.`, fuente: 'ine-poblacion' },
  { t: 'Europa y el planeta no dependen de España', d: 'Hoy la Unión Europea y la ONU se financian con aportaciones de los países. Que reciban directamente su parte exige acuerdos entre muchos países; mientras tanto, España tendría que entregarla como aportación.' },
  { t: 'Que la gente participe de verdad', d: 'Asambleas por sorteo y votos desde el móvil piden tiempo, información clara y una identidad digital segura. Si participa poca gente, deciden unos pocos. Hay que medirlo y corregirlo.' },
  { t: 'Quién responde si una escala falla', d: 'Si un municipio no arregla el agua, la asamblea puede cambiar su comité técnico. Falta decidir cuándo una escala de arriba puede intervenir, sin quitarle a la de abajo lo que le toca.' },
  { t: 'Cambiar las leyes', d: 'La Constitución organiza hoy el territorio en municipios, provincias y comunidades autónomas, y la ley de régimen local reparte sus tareas. Darle dinero propio a la persona y a la comunidad vecinal exige reformarlas.' },
];
