// ============================================================================
// MODELO SOCIOECONÓMICO OPTIMIZADO — data and arithmetic (2026-11-10, Eugenio)
// ============================================================================
// Eugenio's proposal: ONE tax of 20 % on every transaction (a purchase or a
// wage), nothing else, collected automatically by the payment system and split
// in equal parts (2.5 %) among eight scales: person, neighbourhood (or family),
// municipality, province, region, nation, continent and planet. Each scale has
// a citizens' assembly that chooses priorities and a technical committee that
// carries them out at the lowest cost, most effectively and most ecologically.
//
// Everything the page says with a number comes from here: the texts of the
// page read these values instead of repeating them, so a figure can only be
// changed in one place (root CLAUDE.md, «the sentence and the number it
// promises»). Real figures carry a source id (`FUENTES`); estimates say so.
//
// TWO READINGS OF «EVERY TRANSACTION» (decision logged in memory/03_DECISIONS.md):
//   · 'eslabon' (default): every payment carries 20 %, but a business recovers
//     the 20 % it paid on its own purchases when it sells (the way VAT works).
//     Each final product then carries exactly 20 %, never 20 % on top of 20 %.
//   · 'literal': business-to-business purchases also keep their 20 %. It
//     collects about twice as much and stacks the tax along supply chains (the
//     «cascade» Spain had with the IGTE until 1985).

export type Modo = 'eslabon' | 'literal';

export type EscalaId = 'persona' | 'vecindad' | 'municipio' | 'provincia' | 'region' | 'nacion' | 'continente' | 'planeta';

export interface Escala {
  id: EscalaId;
  nombre: string;
  /** Short name for tight places (rings, axis labels). */
  corto: string;
  /** Colour of the scale: an ordered ramp from the closest (gold) to the farthest (indigo). Data, not styling. */
  color: string;
  /** Text colour that reads on `color`. */
  tinta: string;
  /** Who receives this scale's 2.5 %. */
  recibe: string;
  /** In one line: what this scale gives back. */
  devuelve: string;
  /** The place of the worked example at this scale. */
  ejemplo: string;
  /** Residents of the example's place at this scale (for «what your place receives»). */
  habitantesEjemplo: number | null;
  participacion: string;
  comite: string;
  ritmo: string;
}

// The ramp was computed in OKLCH with monotone lightness (0.72 → 0.36) so the
// order near → far reads in the colour itself; the light end keeps ≥ 2.5:1 on white.
export const ESCALAS: Escala[] = [
  {
    id: 'persona', nombre: 'Persona', corto: 'Persona', color: '#D49838', tinta: '#1B2433',
    recibe: 'Lo recibe cada persona por igual, como un dividendo que llega cada mes a su cuenta',
    devuelve: 'Un ingreso para todas las personas, desde que nacen',
    ejemplo: 'Ella misma', habitantesEjemplo: 1,
    participacion: 'Decide ella: el dividendo es suyo y lo usa como quiera.',
    comite: 'No hace falta. Si quiere, puede pedir consejo financiero gratuito al municipio.',
    ritmo: 'Cuando quiera: el dividendo llega cada mes',
  },
  {
    id: 'vecindad', nombre: 'Comunidad vecinal o familia', corto: 'Vecindad', color: '#A1991F', tinta: '#1B2433',
    recibe: 'Lo recibe la comunidad vecinal registrada de cada edificio o urbanización; si la persona vive en una casa independiente, lo recibe su hogar',
    devuelve: 'El edificio o la casa cuidados, sin cuotas de comunidad',
    ejemplo: 'Su hogar (vive en una casa)', habitantesEjemplo: 2,
    participacion: 'Junta vecinal: votan todas las personas que viven allí (no solo las propietarias), una persona un voto, en persona o desde el móvil.',
    comite: 'Dos o tres vecinos que rotan cada año, con un administrador profesional si la junta lo elige.',
    ritmo: 'Cuatro juntas al año',
  },
  {
    id: 'municipio', nombre: 'Municipio', corto: 'Municipio', color: '#60973D', tinta: '#1B2433',
    recibe: 'Lo recibe el ayuntamiento, que da servicios y suministros a sus comunidades vecinales',
    devuelve: 'Agua, calles, residuos, escuela infantil, consultorio y vida en el pueblo',
    ejemplo: 'Su pueblo (400 habitantes)', habitantesEjemplo: 400,
    participacion: 'Asamblea abierta a todo vecino desde los 16 años y presupuestos participativos en la web del municipio.',
    comite: 'El personal técnico municipal (secretaría, arquitectura, ingeniería) con apoyo de la comarca.',
    ritmo: 'Prioridades cada año',
  },
  {
    id: 'provincia', nombre: 'Provincia o comarca', corto: 'Provincia', color: '#008F61', tinta: '#FFFFFF',
    recibe: 'Lo recibe la provincia, que da a los municipios los servicios que solos no pueden sostener',
    devuelve: 'Carreteras entre pueblos, bomberos, institutos y urgencias comarcales',
    ejemplo: 'Provincia de Madrid, organizada por comarcas como la Sierra Norte', habitantesEjemplo: 7_229_000,
    participacion: 'Consejo de delegados elegidos por la asamblea de cada municipio, más una consulta digital de prioridades.',
    comite: 'Un equipo técnico comarcal que comparten todos los municipios.',
    ritmo: 'Prioridades cada año',
  },
  {
    id: 'region', nombre: 'Región', corto: 'Región', color: '#007E80', tinta: '#FFFFFF',
    recibe: 'Lo recibe la región, que agrupa varias provincias, construye infraestructuras y apoya a las que más lo necesitan',
    devuelve: 'Hospitales, universidades, transporte regional y vivienda pública',
    ejemplo: 'Comunidad de Madrid', habitantesEjemplo: 7_229_000,
    participacion: 'Asamblea ciudadana de 150 personas elegidas por sorteo que se renueva cada año y fija prioridades; la ciudadanía las ratifica en votación digital.',
    comite: 'Profesionales seleccionados por concurso público, con datos y cuentas abiertos.',
    ritmo: 'Prioridades cada año',
  },
  {
    id: 'nacion', nombre: 'Nación', corto: 'Nación', color: '#006591', tinta: '#FFFFFF',
    recibe: 'Lo recibe el Estado, que agrupa las regiones y cubre lo que necesitan todas a la vez',
    devuelve: 'Pensiones básicas, grandes redes, defensa, justicia y sanidad común',
    ejemplo: 'España (49,1 millones de habitantes)', habitantesEjemplo: 49_128_297,
    participacion: 'Asamblea ciudadana por sorteo junto al parlamento; las prioridades se votan cada dos años.',
    comite: 'Agencias técnicas independientes, con objetivos públicos y evaluación externa.',
    ritmo: 'Prioridades cada dos años',
  },
  {
    id: 'continente', nombre: 'Continente', corto: 'Continente', color: '#034990', tinta: '#FFFFFF',
    recibe: 'Lo reciben las instituciones europeas, que dan servicios y conexiones entre naciones',
    devuelve: 'Trenes y redes entre países, cohesión, defensa común, Erasmus',
    ejemplo: 'Europa', habitantesEjemplo: null,
    participacion: 'Parlamento continental y asambleas ciudadanas europeas por sorteo.',
    comite: 'Agencias europeas con evaluación pública de resultados.',
    ritmo: 'Prioridades cada cinco años, revisadas cada año',
  },
  {
    id: 'planeta', nombre: 'Planeta', corto: 'Planeta', color: '#392D7D', tinta: '#FFFFFF',
    recibe: 'Lo reciben instituciones que cuidan del planeta y de la humanidad entera',
    devuelve: 'Clima, océanos, paz, catástrofes, ciencia abierta y exploración espacial',
    ejemplo: 'La Tierra', habitantesEjemplo: null,
    participacion: 'Asamblea de delegados de cada continente y consultas globales abiertas a todas las personas.',
    comite: 'Comités científicos (clima, salud, paz, espacio) que publican sus datos y métodos.',
    ritmo: 'Prioridades cada cinco años, revisadas cada año',
  },
];

export const ESCALA = Object.fromEntries(ESCALAS.map(e => [e.id, e])) as Record<EscalaId, Escala>;

/** The single rate and its split. */
export const TIPO = 0.20;
export const PARTE_ESCALA = TIPO / ESCALAS.length; // 0.025

// ── THE FIFTEEN AREAS OF THE MATRIX ─────────────────────────────────────────
// The twelve Eugenio named, plus three the planet scale needs (climate and
// oceans, science and knowledge) and the cost of running each scale, which a
// transparent model has to show rather than hide.
export type AmbitoId =
  | 'salud' | 'economia' | 'educacion' | 'movilidad' | 'vivienda' | 'energia' | 'agricultura' | 'alimentacion'
  | 'cultura' | 'deporte' | 'defensa' | 'seguridad' | 'clima' | 'ciencia' | 'gestion';

export interface Ambito { id: AmbitoId; nombre: string; corto: string }

export const AMBITOS: Ambito[] = [
  { id: 'salud', nombre: 'Salud', corto: 'Salud' },
  { id: 'economia', nombre: 'Economía, pensiones y protección', corto: 'Economía y pensiones' },
  { id: 'educacion', nombre: 'Educación', corto: 'Educación' },
  { id: 'movilidad', nombre: 'Movilidad', corto: 'Movilidad' },
  { id: 'vivienda', nombre: 'Vivienda', corto: 'Vivienda' },
  { id: 'energia', nombre: 'Energía', corto: 'Energía' },
  { id: 'agricultura', nombre: 'Agricultura', corto: 'Agricultura' },
  { id: 'alimentacion', nombre: 'Alimentación', corto: 'Alimentación' },
  { id: 'cultura', nombre: 'Cultura', corto: 'Cultura' },
  { id: 'deporte', nombre: 'Deporte', corto: 'Deporte' },
  { id: 'defensa', nombre: 'Defensa', corto: 'Defensa' },
  { id: 'seguridad', nombre: 'Seguridad', corto: 'Seguridad' },
  { id: 'clima', nombre: 'Agua, clima y naturaleza', corto: 'Agua y clima' },
  { id: 'ciencia', nombre: 'Ciencia y conocimiento', corto: 'Ciencia' },
  { id: 'gestion', nombre: 'Participación y gestión', corto: 'Participación' },
];

export const AMBITO = Object.fromEntries(AMBITOS.map(a => [a.id, a])) as Record<AmbitoId, Ambito>;

export interface Celda {
  /** Share of this scale's budget, in % (null at the person scale: the dividend is free). */
  peso: number | null;
  /** What this scale is responsible for in this area. */
  responsabilidad: string;
  /** What the money is spent on. */
  inversiones: string[];
}

type Fila = Record<AmbitoId, Celda>;
const c = (peso: number | null, responsabilidad: string, ...inversiones: string[]): Celda => ({ peso, responsabilidad, inversiones });

export const MATRIZ: Record<EscalaId, Fila> = {
  persona: {
    salud: c(null, 'Cuidar de su propia salud', 'Comer bien, moverse, dormir', 'Gafas, dentista o terapias que elija'),
    economia: c(null, 'Tener un colchón propio', 'Ahorro para imprevistos', 'Formación para su trabajo'),
    educacion: c(null, 'Seguir aprendiendo toda la vida', 'Cursos, libros, idiomas'),
    movilidad: c(null, 'Elegir cómo moverse', 'Bicicleta, abono de transporte, coche compartido'),
    vivienda: c(null, 'Pagar su parte del hogar', 'Alquiler o hipoteca, muebles, reparaciones propias'),
    energia: c(null, 'Consumir con cabeza', 'Electrodomésticos eficientes, su factura de luz'),
    agricultura: c(null, 'Apoyar al campo cercano', 'Comprar a productores locales'),
    alimentacion: c(null, 'Alimentarse', 'La compra diaria'),
    cultura: c(null, 'Disfrutar y crear cultura', 'Libros, música, teatro'),
    deporte: c(null, 'Mantenerse activo', 'Cuota del club, equipamiento'),
    defensa: c(null, 'Estar preparada ante una emergencia', 'Kit básico de emergencia en casa'),
    seguridad: c(null, 'Proteger lo suyo', 'Cerradura, seguro del hogar'),
    clima: c(null, 'Reducir su huella', 'Reciclar, reparar, consumir menos'),
    ciencia: c(null, 'Estar informada', 'Conexión a internet, divulgación'),
    gestion: c(null, 'Votar y proponer en sus escalas', 'Tiempo para las asambleas a las que quiera ir'),
  },
  vecindad: {
    salud: c(6, 'Cuidados entre vecinos y espacios sin barreras', 'Desfibrilador y botiquín', 'Red de apoyo a mayores que viven solos'),
    economia: c(6, 'Economía cercana entre vecinos', 'Banco de tiempo', 'Compras compartidas'),
    educacion: c(5, 'Aprender juntos', 'Sala de estudio', 'Apoyo escolar entre vecinos'),
    movilidad: c(6, 'Moverse sin depender del coche propio', 'Aparcabicis seguro', 'Coche compartido y punto de recarga'),
    vivienda: c(30, 'Mantener el edificio o la casa', 'Limpieza y ascensor', 'Tejado, fachada y accesibilidad'),
    energia: c(14, 'Energía del propio edificio', 'Placas solares de autoconsumo compartido', 'Aislamiento y ventanas'),
    agricultura: c(3, 'Verde y huerto', 'Huerto comunitario', 'Compostaje'),
    alimentacion: c(3, 'Comer bien cerca', 'Grupo de consumo con productores', 'Cocina común para celebraciones'),
    cultura: c(4, 'Vida en común', 'Fiestas y encuentros', 'Biblioteca de intercambio'),
    deporte: c(2, 'Moverse cerca de casa', 'Patio activo', 'Material deportivo compartido'),
    defensa: c(1, 'Autoprotección', 'Plan de emergencia del edificio', 'Punto de encuentro señalizado'),
    seguridad: c(5, 'Un edificio seguro', 'Portal y cerraduras', 'Extintores y revisiones de gas y luz'),
    clima: c(5, 'Agua y residuos del edificio', 'Reciclaje y recogida de lluvia', 'Árboles y sombra'),
    ciencia: c(1, 'Conocer el edificio', 'Sensores de consumo', 'Mantenimiento antes de que algo se rompa'),
    gestion: c(9, 'Junta vecinal y cuentas abiertas', 'Administración y seguro del edificio', 'App de votación'),
  },
  municipio: {
    salud: c(8, 'Salud de cercanía', 'Consultorio local', 'Prevención y atención a mayores en casa'),
    economia: c(7, 'Empleo y comercio local', 'Mercado y vivero de empresas', 'Ayudas de emergencia a vecinos'),
    educacion: c(9, 'Escuela cercana', 'Escuela infantil de 0 a 3 años', 'Mantenimiento del colegio y escuela de adultos'),
    movilidad: c(10, 'Calles y transporte local', 'Calles y aceras', 'Transporte a demanda para ir a la cabecera de comarca'),
    vivienda: c(10, 'Urbanismo y vivienda', 'Vivienda municipal en alquiler', 'Rehabilitar casas vacías para nuevos vecinos'),
    energia: c(6, 'Energía del pueblo', 'Alumbrado eficiente', 'Comunidad energética local'),
    agricultura: c(3, 'Campo y caminos', 'Caminos rurales', 'Banco de tierras para quien quiera cultivar'),
    alimentacion: c(3, 'Alimentación local', 'Comedor escolar con producto cercano', 'Mercado de productores'),
    cultura: c(6, 'Cultura y fiestas', 'Casa de cultura', 'Patrimonio y fiestas del pueblo'),
    deporte: c(5, 'Instalaciones deportivas', 'Polideportivo y piscina', 'Rutas señalizadas'),
    defensa: c(1, 'Protección civil', 'Voluntariado de emergencias', 'Planes de evacuación'),
    seguridad: c(5, 'Convivencia y seguridad', 'Policía local o de la comarca', 'Mediación vecinal'),
    clima: c(13, 'Agua, residuos y verde', 'Agua potable y depuración', 'Recogida de residuos y parques'),
    ciencia: c(2, 'Pueblo conectado', 'Biblioteca y conexión a internet', 'Datos abiertos del municipio'),
    gestion: c(12, 'Ayuntamiento abierto', 'Asambleas y comité técnico', 'Atención a los vecinos'),
  },
  provincia: {
    salud: c(14, 'Salud comarcal', 'Centros de salud y urgencias', 'Ambulancias y residencias'),
    economia: c(8, 'Servicios a los municipios', 'Asistencia técnica y jurídica', 'Desarrollo local y turismo'),
    educacion: c(10, 'Institutos y formación', 'Institutos y formación profesional', 'Transporte escolar'),
    movilidad: c(14, 'Carreteras y transporte entre pueblos', 'Carreteras provinciales', 'Autobuses interurbanos'),
    vivienda: c(6, 'Vivienda rural', 'Rehabilitación en pueblos pequeños', 'Vivienda para nuevos pobladores'),
    energia: c(6, 'Redes comarcales', 'Redes de calor con biomasa', 'Apoyo técnico a comunidades energéticas'),
    agricultura: c(7, 'Desarrollo rural', 'Asesoría agraria', 'Regadíos y cooperativas'),
    alimentacion: c(3, 'Cadenas cortas', 'Obradores y mataderos comarcales', 'Logística del producto local'),
    cultura: c(5, 'Patrimonio y bibliotecas', 'Bibliobús', 'Museos y patrimonio comarcal'),
    deporte: c(3, 'Deporte comarcal', 'Ligas entre pueblos', 'Instalaciones compartidas'),
    defensa: c(1, 'Emergencias', 'Coordinación de protección civil'),
    seguridad: c(7, 'Bomberos y rescate', 'Parques de bomberos', 'Prevención de incendios forestales'),
    clima: c(8, 'Montes y residuos comarcales', 'Gestión forestal', 'Plantas de reciclaje y depuradoras compartidas'),
    ciencia: c(2, 'Conectividad', 'Fibra y cobertura móvil en zonas rurales'),
    gestion: c(6, 'Provincia abierta', 'Consejo de municipios', 'Equipo técnico comarcal'),
  },
  region: {
    salud: c(24, 'Hospitales y especialistas', 'Hospitales y especialidades', 'Salud mental y dependencia'),
    economia: c(7, 'Empleo regional', 'Formación para el empleo', 'Apoyo a quien emprende'),
    educacion: c(16, 'Educación y universidades', 'Profesorado', 'Universidades públicas y becas'),
    movilidad: c(12, 'Transporte regional', 'Cercanías y metro ligero', 'Carriles bici entre municipios'),
    vivienda: c(8, 'Vivienda pública', 'Parque público de alquiler', 'Ayudas a la rehabilitación'),
    energia: c(5, 'Planificación energética', 'Renovables y almacenamiento', 'Eficiencia en edificios públicos'),
    agricultura: c(4, 'Política agraria regional', 'Ayudas a jóvenes agricultores', 'Sanidad vegetal y animal'),
    alimentacion: c(2, 'Seguridad alimentaria', 'Control de calidad', 'Alimentación escolar'),
    cultura: c(4, 'Cultura regional', 'Teatros y archivos', 'Lengua y patrimonio'),
    deporte: c(2, 'Deporte regional', 'Deporte base', 'Centros de alto rendimiento'),
    defensa: c(1, 'Defensa civil y emergencias', 'Planes territoriales de emergencia'),
    seguridad: c(5, 'Emergencias y justicia cercana', 'Teléfono 112', 'Juzgados de proximidad'),
    clima: c(5, 'Naturaleza regional', 'Espacios protegidos', 'Calidad del aire y del agua'),
    ciencia: c(3, 'Investigación regional', 'Centros de investigación', 'Transferencia a empresas'),
    gestion: c(2, 'Región abierta', 'Asamblea ciudadana por sorteo', 'Comité técnico y auditoría'),
  },
  nacion: {
    salud: c(18, 'Sanidad común', 'Medicamentos y vacunas', 'Alta especialización y trasplantes'),
    economia: c(28, 'Pensiones y protección', 'Garantía de pensiones básicas', 'Desempleo y estabilidad económica'),
    educacion: c(6, 'Igualdad educativa', 'Becas', 'Títulos y evaluación'),
    movilidad: c(9, 'Grandes redes', 'Ferrocarril y carreteras estatales', 'Puertos y aeropuertos'),
    vivienda: c(3, 'Derecho a la vivienda', 'Fondo de garantía de vivienda', 'Suelo público estatal'),
    energia: c(4, 'Red energética', 'Red eléctrica e interconexiones', 'Reservas estratégicas'),
    agricultura: c(2, 'Agua y campo', 'Cuencas hidrográficas', 'Seguros agrarios'),
    alimentacion: c(1, 'Soberanía alimentaria', 'Reservas estratégicas', 'Control sanitario en fronteras'),
    cultura: c(2, 'Patrimonio común', 'Museos y archivos nacionales', 'Radio y televisión públicas'),
    deporte: c(1, 'Deporte', 'Deporte inclusivo', 'Centros nacionales'),
    defensa: c(8, 'Defensa', 'Fuerzas armadas', 'Ciberdefensa'),
    seguridad: c(9, 'Seguridad y justicia', 'Policía y Guardia Civil', 'Tribunales'),
    clima: c(3, 'Clima nacional', 'Costas y adaptación', 'Grandes incendios'),
    ciencia: c(4, 'Ciencia nacional', 'Agencias de investigación', 'Datos abiertos'),
    gestion: c(2, 'Estado abierto', 'El sistema de pago y las cuentas abiertas', 'Asamblea ciudadana'),
  },
  continente: {
    salud: c(6, 'Salud europea', 'Agencia del medicamento', 'Compra conjunta de vacunas'),
    economia: c(14, 'Cohesión y mercado común', 'Fondos de cohesión entre regiones', 'Moneda y estabilidad'),
    educacion: c(8, 'Intercambio', 'Erasmus para todas las edades', 'Reconocimiento de títulos'),
    movilidad: c(12, 'Redes transeuropeas', 'Trenes nocturnos y de alta velocidad', 'Corredores de mercancías'),
    vivienda: c(3, 'Vivienda asequible', 'Préstamos a parques públicos de vivienda'),
    energia: c(10, 'Interconexión energética', 'Redes entre países', 'Almacenamiento'),
    agricultura: c(9, 'Política agraria común', 'Renta agraria justa', 'Transición agroecológica'),
    alimentacion: c(2, 'Seguridad alimentaria', 'Control de calidad', 'Etiquetado'),
    cultura: c(3, 'Cultura y lenguas', 'Traducción', 'Programas culturales'),
    deporte: c(1, 'Deporte', 'Intercambios deportivos'),
    defensa: c(12, 'Defensa común', 'Defensa coordinada', 'Ciberseguridad y espacio'),
    seguridad: c(5, 'Fronteras y cooperación', 'Salvamento marítimo', 'Cooperación policial y judicial'),
    clima: c(7, 'Clima y biodiversidad', 'Red de espacios naturales', 'Mares europeos'),
    ciencia: c(6, 'Investigación europea', 'Grandes programas de investigación', 'Satélites'),
    gestion: c(2, 'Europa abierta', 'Asambleas ciudadanas europeas', 'Auditoría'),
  },
  planeta: {
    salud: c(12, 'Salud global', 'Prevención de pandemias', 'Agua potable y vacunas para todos'),
    economia: c(14, 'Equidad entre continentes', 'Proyectos de desarrollo', 'Fondo de equidad entre continentes'),
    educacion: c(6, 'Educación para todos', 'Escuelas donde faltan', 'Aprendizaje abierto'),
    movilidad: c(2, 'Conexiones globales', 'Rutas marítimas seguras', 'Aviación limpia'),
    vivienda: c(2, 'Refugio', 'Personas refugiadas y desplazadas'),
    energia: c(6, 'Energía limpia para todos', 'Acceso a la electricidad', 'Transferencia de tecnología'),
    agricultura: c(6, 'Suelo fértil', 'Recuperación de suelos', 'Semillas y riego eficiente'),
    alimentacion: c(8, 'Hambre cero', 'Reservas mundiales de alimentos', 'Ayuda en crisis'),
    cultura: c(2, 'Patrimonio de la humanidad', 'Protección del patrimonio', 'Diálogo entre culturas'),
    deporte: c(1, 'Deporte y paz', 'Encuentros deportivos internacionales'),
    defensa: c(6, 'Paz entre continentes', 'Mediación y mantenimiento de la paz', 'Desarme'),
    seguridad: c(6, 'Catástrofes', 'Alerta temprana de terremotos, tsunamis y huracanes', 'Vigilancia de asteroides'),
    clima: c(18, 'Clima y océanos', 'Frenar el calentamiento', 'Proteger océanos y biodiversidad'),
    ciencia: c(9, 'Conocimiento de la humanidad', 'Exploración espacial', 'Ciencia abierta y bibliotecas libres'),
    gestion: c(2, 'Asamblea planetaria', 'Delegados de los continentes', 'Consultas globales'),
  },
};

/** The areas of a scale with the biggest share, for one-line summaries. */
export function principales(escala: EscalaId, n = 3): Ambito[] {
  return [...AMBITOS]
    .filter(a => MATRIZ[escala][a.id].peso != null)
    .sort((a, b) => (MATRIZ[escala][b.id].peso ?? 0) - (MATRIZ[escala][a.id].peso ?? 0))
    .slice(0, n);
}

// ── SOURCES ─────────────────────────────────────────────────────────────────
export interface Fuente { id: string; titulo: string; url: string }

export const FUENTES: Fuente[] = [
  { id: 'ine-pib', titulo: 'INE · Contabilidad Nacional Anual: PIB de 2025 (1.690.012 M€)', url: 'https://www.ine.es/dyngs/Prensa/CNA2025.htm' },
  { id: 'ine-poblacion', titulo: 'INE · España municipal 2025: población y municipios', url: 'https://www.ine.es/infografias/infografia_censo.pdf' },
  { id: 'ine-remuneracion', titulo: 'INE · Contabilidad Regional: remuneración de asalariados 2024', url: 'https://econet.carm.es/inicio/-/crem/sicrem/pu_datosbasicos/pdf/sec40.pdf' },
  { id: 'ine-hogares', titulo: 'INE · Cuentas de los hogares 2025: consumo e inversión', url: 'https://www.infobae.com/america/agencias/2026/04/01/la-tasa-de-ahorro-de-los-hogares-baja-al-12-en-2025-tras-disparar-su-gasto-en-consumo-un-62/' },
  { id: 'ine-viviendas', titulo: 'INE · Transmisiones de derechos de la propiedad: compraventas de 2025', url: 'https://ine.es/dyngs/Prensa/ETDP1225.htm?print=1' },
  { id: 'fbbva-inversion', titulo: 'Fundación BBVA e Ivie · Inversión total y pública en 2025', url: 'https://www.fbbva.es/wp-content/uploads/2026/03/NP_InversionyStockCapital_2026_FundacionBBVA_Ivie.pdf' },
  { id: 'aeat-iva', titulo: 'Agencia Tributaria · IVA en 2025 (99.532 M€)', url: 'https://sede.agenciatributaria.gob.es/Sede/eu_es/estadisticas/recaudacion-tributaria/informe-anual/ejercicio-2025/4-impuesto-sobre-valor-anadido.html' },
  { id: 'aeat-especiales', titulo: 'Agencia Tributaria vía Europa Press · Impuestos especiales en 2025 (23.083 M€)', url: 'https://www.bolsamania.com/noticias_print/economia/economia--los-ingresos-del-impuesto-a-la-cerveza-bajan-en-2025-por-primera-vez-desde-el-covid-por-la-caida-de-consumo--22353697.html' },
  { id: 'intereses', titulo: 'Ministerio de Hacienda vía Vozpópuli · Intereses de la deuda pública en 2025', url: 'https://www.vozpopuli.com/economia/macroeconomia/el-gasto-en-intereses-de-la-deuda-rompe-en-espana-la-barrera-de-los-40000-millones-por-primera-vez.html' },
  { id: 'aeat-2025', titulo: 'Agencia Tributaria · Informe anual de recaudación 2025', url: 'https://sede.agenciatributaria.gob.es/Sede/estadisticas/recaudacion-tributaria/informe-anual/ejercicio-2025/resumen.html' },
  { id: 'reaf-2026', titulo: 'Consejo General de Economistas (REAF) · Panorama de la fiscalidad autonómica y foral 2026', url: 'https://multimedia2.coev.com/pdfs/panorama-fiscalidad2026.pdf' },
  { id: 'reaf-propios', titulo: 'REAF vía Ara · 66 impuestos autonómicos propios en 2025', url: 'https://es.ara.cat/economia/cataluna-comunidad-lidera-creacion-impuestos-propios_1_5306827.html' },
  { id: 'ss-2025', titulo: 'Seguridad Social · Cotizaciones de 2025 (176.918 M€)', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/inclusion/Paginas/2026/310326-seguridad-social-deficit-pib.aspx' },
  { id: 'ijm-2026', titulo: 'Instituto Juan de Mariana · Impuestómetro 2026 (datos de Eurostat)', url: 'https://juandemariana.org/wp-content/uploads/2026/03/IMP-2026-report.pdf' },
  { id: 'bde-ingresos', titulo: 'Banco de España vía ESdiario · Ingresos y gastos públicos de 2025', url: 'https://www.esdiario.com/economia/260618/190881/cara-gobierno-recaudado-17-000-millones-euros-deflactar-irpf.html' },
  { id: 'igae-cofog', titulo: 'IGAE · Gasto de las Administraciones públicas por funciones y subsectores 2020-2024', url: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/Funcional%202020-2024.pdf' },
  { id: 'complejidad', titulo: 'Emprendedores · Índice de complejidad fiscal y horas de cumplimiento', url: 'https://emprendedores.es/gestion/espana-suspenso-competitividad-fiscal/' },
  { id: 'aeat-coste', titulo: 'Agencia Tributaria · Coste de la organización sobre lo que recauda (2025)', url: 'https://www3.agenciatributaria.gob.es/static_files/AEAT_Intranet/Auditoria_Interna/INFORMES/INFORME_PGCT_11_2026.pdf' },
  { id: 'cafmadrid', titulo: 'Colegio de Administradores de Fincas de Madrid · Comunidades y obligaciones fiscales', url: 'https://cafmadrid.es/wp-content/uploads/2024/03/Ndp-Impuestos.pdf' },
  { id: 'comunidades-cuotas', titulo: 'Franquicias al Día · Las comunidades de propietarios mueven unos 40.000 M€ al año en cuotas', url: 'https://www.franquiciasaldia.es/noticias/2025-01-01/14-millones-de-comunidades-de-propietarios-en-espana/' },
  { id: 'roams', titulo: 'Forbes / Roams · Gasto medio de los hogares: impuestos locales y comunidad', url: 'https://forbes.es/?p=869267' },
  { id: 'ine-salarios', titulo: 'INE · Encuesta anual de estructura salarial 2024', url: 'https://ine.es/dyngs/Prensa/EAES2024.htm' },
  { id: 'irpf-madrid', titulo: 'Raisin · Tramos del IRPF 2025-2026 en la Comunidad de Madrid', url: 'https://www.raisin.com/es-es/tributacion/declaracion-de-la-renta/tramos-irpf/' },
  { id: 'minimo-madrid', titulo: 'Guía Fiscal · IRPF en Madrid 2026: mínimos estatal y autonómico', url: 'https://guiafiscal.es/cuanto-pago/irpf/40000-euros-madrid/' },
  { id: 'ue-presupuesto', titulo: 'Consejo de la UE · Presupuesto de la Unión para 2026', url: 'https://informat.ro/es/internacional/el-consejo-adopta-el-presupuesto-de-la-ue-para-2026-92944' },
  { id: 'ue-espana', titulo: 'Merca2 (estimación de la Comisión Europea) · Aportación media de España a la UE 2021-2027', url: 'https://www.merca2.es/2019/11/05/espana-ue-214211/' },
  { id: 'aod-2025', titulo: 'Ministerio de Asuntos Exteriores · Ayuda Oficial al Desarrollo de 2025', url: 'https://www.exteriores.gob.es/es/Comunicacion/NotasPrensa/Paginas/2026_NOTAS_P/La-Ayuda-Oficial-al-Desarrollo-espa%C3%B1ola-alcanza-su-mayor-cifra-de-los-ultimos-15-a%C3%B1os.aspx' },
  { id: 'cam-pueblos', titulo: 'Comunidad de Madrid · Población de los municipios pequeños y la Sierra Norte', url: 'https://www.comunidad.madrid/node/109832' },
  { id: 'madrid-poblacion', titulo: 'Ayuntamiento de Madrid · Madrid Economía 2025 (la ciudad es el 48,8 % de la región)', url: 'https://www.madrid.es/UnidadesDescentralizadas/UDCObservEconomico/006%20Madrid%20Economia/Ficheros/006%20Ficheros%20Madrid%20Econom%C3%ADa%202025/Madrid_Econom%C3%ADa_2025.pdf' },
  { id: 'cam-presupuesto', titulo: 'Comunidad de Madrid · Presupuestos 2026', url: 'https://www.comunidad.madrid/file/497589/download' },
  { id: 'apt', titulo: 'Wikipedia · Automated Payment Transaction tax (Edgar Feige)', url: 'https://en.wikipedia.org/wiki/Automated_Payment_Transaction_tax' },
  { id: 'seg-social', titulo: 'Seguridad Social · Bases y tipos de cotización', url: 'https://www.seg-social.es' },
];

export const FUENTE = Object.fromEntries(FUENTES.map(f => [f.id, f])) as Record<string, Fuente>;

// ── SPAIN IN FIGURES (millions of euros unless said otherwise) ──────────────
export const ESPANA = {
  pib: 1_690_012, // 2025, INE (ine-pib)
  poblacion: 49_128_297, // 1-1-2025, INE (ine-poblacion)
  municipios: 8_132,
  municipiosMenos1000: 4_975,
  madridRegion: 7_229_000, // the city (3.527.924) is 48,8 % of the region (madrid-poblacion)
  sierraNorte: { pueblos: 44 },
};

export interface ComponenteBase {
  id: string;
  nombre: string;
  explicacion: string;
  millones: number;
  /** Which reading counts it. */
  modos: Modo[];
  fuente: string | null;
  estimacion?: string;
}

// The «base»: every payment the 20 % applies to in a year in Spain.
const SUELDOS_2024 = 763_677; // ine-remuneracion
export const BASE: ComponenteBase[] = [
  {
    id: 'sueldos', nombre: 'Sueldos', millones: Math.round(SUELDOS_2024 * 1.072), modos: ['eslabon', 'literal'], fuente: 'ine-remuneracion',
    explicacion: 'Todo lo que las empresas y administraciones pagan por el trabajo (hoy, salario bruto más cotizaciones de la empresa).',
    estimacion: '763.677 M€ en 2024, más el 7,2 % que creció en 2025 según el INE.',
  },
  {
    id: 'compras', nombre: 'Compras de las familias', millones: 937_447, modos: ['eslabon', 'literal'], fuente: 'ine-hogares',
    explicacion: 'Lo que los hogares gastan en un año: comida, luz, ropa, alquiler, restaurantes, transporte…',
    estimacion: 'Incluye el alquiler «imputado» de quien vive en casa propia, que no es un pago, y deja fuera lo que gastan los turistas en España; los dos efectos se compensan aproximadamente.',
  },
  {
    id: 'viviendaNueva', nombre: 'Compra de vivienda nueva y reformas', millones: 79_685, modos: ['eslabon', 'literal'], fuente: 'ine-hogares',
    explicacion: 'La inversión de los hogares en vivienda.',
  },
  {
    id: 'viviendaUsada', nombre: 'Compraventa de vivienda usada', millones: Math.round(558_327 * 0.2), modos: ['eslabon', 'literal'], fuente: 'ine-viviendas',
    explicacion: 'Las 558.327 viviendas usadas vendidas en 2025. Pagan el 20 % en cada venta, aunque la casa ya lo pagó al ser nueva; hoy pagan el impuesto de transmisiones, entre el 6 % y el 10 % en la mayoría de regiones.',
    estimacion: 'Con un precio medio supuesto de 200.000 € por vivienda.',
  },
  {
    id: 'entreEmpresas', nombre: 'Compras entre empresas', millones: 1_600_000, modos: ['literal'], fuente: null,
    explicacion: 'Materias primas, piezas, servicios y suministros que unas empresas compran a otras para producir.',
    estimacion: 'Orden de magnitud: en una economía como la española los consumos intermedios son de un tamaño parecido al PIB (≈ 0,95 veces).',
  },
  {
    id: 'inversionEmpresas', nombre: 'Inversión de empresas', millones: 347_000 - 37_177 - 79_685, modos: ['literal'], fuente: 'fbbva-inversion',
    explicacion: 'Máquinas, naves, programas informáticos.',
    estimacion: 'Inversión total de 2025 (347.000 M€) menos la pública (37.177 M€) y la de los hogares.',
  },
  {
    id: 'inversionPublica', nombre: 'Inversión pública', millones: 37_177, modos: ['literal'], fuente: 'fbbva-inversion',
    explicacion: 'Carreteras, hospitales, escuelas que construyen las administraciones.',
  },
];

/** Today's system, for the comparison. */
export const HOY = {
  impuestosYCotizaciones2024: 591_679, // 37,1 % del PIB (ijm-2026, Eurostat)
  impuestosYCotizaciones2025: 638_300, // ≈ 38 % del PIB, estimación (ijm-2026)
  ingresosPublicosPct2025: 42.9, // bde-ingresos
  gastoPublicoPct2025: 45.3, // bde-ingresos
  aeat2025: 325_356, // aeat-2025
  irpf2025: 142_466, // reaf-2026
  sociedades2025: 42_266, // aeat-2025
  cotizaciones2025: 176_918, // ss-2025
  // Consolidated spending by subsector, 2024 (igae-cofog)
  gastoCentral2024: 164_156,
  gastoRegional2024: 235_185,
  gastoLocal2024: 81_390,
  gastoSeguridadSocial2024: 244_270,
  gastoTotal2024: 725_001,
  pensiones2024: 206_130,
  sanidad2024: 102_942,
  educacion2024: 65_862,
  defensa2024: 14_233,
  aportacionUE: 11_950, // media anual 2021-2027 (ue-espana)
  presupuestoUE2026: 192_800, // ue-presupuesto
  aod2025: 4_550, // aod-2025
  cuotasComunidades: 40_000, // comunidades-cuotas
  comunidades: 1_100_000, // cafmadrid
  comunidadesExpuestasSancion: 220_000, // cafmadrid
  horasEmpresas: 150, horasUE: 113, horasOCDE: 92, // complejidad
  indiceComplejidad: 114.8, // UE = 100 (complejidad)
  costeAEATpct: 0.57, // aeat-coste
  impuestosPropiosCCAA: 66, // reaf-propios
  presupuestoMadrid2026: 30_663.6, // cam-presupuesto
  iva2025: 99_532, // aeat-iva
  especiales2025: 23_083, // aeat-especiales
  intereses2025: 40_314, // intereses
};

// ── THE COUNTRY'S ACCOUNTS UNDER THE MODEL ──────────────────────────────────
/** Final demand ≈ GDP plus imports (≈ 1,33 × GDP): what the business-to-business 20 % ends up inside of. Estimate. */
const DEMANDA_FINAL = ESPANA.pib * 1.33;

export function cuentasPais(modo: Modo) {
  const componentes = BASE.filter(b => b.modos.includes(modo));
  const base = componentes.reduce((s, b) => s + b.millones, 0);
  const recaudacion = base * TIPO;
  const porEscala = recaudacion / ESCALAS.length;
  const porPersonaEscala = (porEscala * 1e6) / ESPANA.poblacion;
  const entreEmpresas = BASE.find(b => b.id === 'entreEmpresas')!.millones;
  // In the literal reading, the 20 % paid between businesses ends up inside final prices.
  const cascada = modo === 'literal' ? 1 + (entreEmpresas * TIPO) / DEMANDA_FINAL : 1;
  return {
    componentes, base, recaudacion, porEscala, porPersonaEscala, cascada,
    pctPIB: (recaudacion / ESPANA.pib) * 100,
    basePorPersona: (base * 1e6) / ESPANA.poblacion,
  };
}

// ── THE WORKED EXAMPLE: A PERSON IN A VILLAGE OF 400 IN MADRID ──────────────
// Today's system, 2026 rules, approximate on purpose (no regional deductions):
//   · employer contributions: common 23,60 + unemployment 5,50 + FOGASA 0,20 +
//     training 0,60 + MEI 0,75 + accidents ~1,50 (it varies by activity) = 32,15 %;
//   · employee: 4,70 + 1,55 + 0,10 + MEI 0,15 = 6,50 %;
//   · IRPF: state scale + Madrid scale, general allowance, 2.000 € expenses,
//     the art. 20 reduction for low wages, state minimum 5.550 € and Madrid's 5.956,65 €;
//   · VAT and excise taxes ≈ 12 % of what a household spends: VAT (99.532 M€) plus excise
//     duties (23.083 M€) over household consumption (937.447 M€) is 13,1 %, and part of it
//     is paid by administrations and VAT-exempt businesses, not by households;
//   · local taxes per household: IBI 320 €, waste 107 €, vehicle 58 € (roams);
//     community fees, if any, 1.260 € a year per home (roams).
export const SUPUESTOS = {
  cotEmpresa: 0.3215,
  cotTrabajador: 0.065,
  baseMaximaAnual: 5_101.2 * 12, // ≈ base máxima de cotización 2026
  indirectosHoy: 0.12,
  ibi: 320, basuras: 107, vehiculo: 58, cuotaComunidad: 1_260,
};

const ESCALA_ESTATAL: [number, number][] = [[12_450, 0.095], [20_200, 0.12], [35_200, 0.15], [60_000, 0.185], [300_000, 0.225], [Infinity, 0.245]];
const ESCALA_MADRID: [number, number][] = [[13_362.22, 0.085], [19_004.63, 0.107], [35_425.68, 0.128], [57_320.40, 0.174], [Infinity, 0.205]];

function aplicarEscala(base: number, escala: [number, number][]) {
  let cuota = 0, desde = 0;
  for (const [hasta, tipo] of escala) {
    if (base <= desde) break;
    cuota += (Math.min(base, hasta) - desde) * tipo;
    desde = hasta;
  }
  return cuota;
}

/** Approximate IRPF of a wage earner resident in Madrid, single return, no children. */
export function irpfMadrid(bruto: number) {
  const ss = Math.min(bruto, SUPUESTOS.baseMaximaAnual) * SUPUESTOS.cotTrabajador;
  const previo = bruto - ss;
  let reduccion = 0;
  if (previo <= 14_852) reduccion = 7_302;
  else if (previo <= 17_673.52) reduccion = 7_302 - 1.75 * (previo - 14_852);
  else if (previo <= 19_747.5) reduccion = 2_364.34 - 1.14 * (previo - 17_673.52);
  const base = Math.max(0, previo - 2_000 - reduccion);
  const estatal = Math.max(0, aplicarEscala(base, ESCALA_ESTATAL) - aplicarEscala(5_550, ESCALA_ESTATAL));
  const autonomica = Math.max(0, aplicarEscala(base, ESCALA_MADRID) - aplicarEscala(5_956.65, ESCALA_MADRID));
  return estatal + autonomica;
}

export interface Ejemplo {
  /** Gross annual salary today. */
  bruto: number;
  /** What she spends a month today (without the mortgage or rent principal). */
  gastoMes: number;
  /** Lives with a partner (two people in the household). */
  pareja: boolean;
  /** Lives in a building with a registered neighbourhood community instead of a house. */
  enComunidad: boolean;
}

export const EJEMPLO_INICIAL: Ejemplo = { bruto: 26_000, gastoMes: 1_100, pareja: true, enComunidad: false };

export function calcularEjemplo(e: Ejemplo, modo: Modo) {
  const pais = cuentasPais(modo);
  const miembros = e.pareja ? 2 : 1;
  const costeTrabajo = e.bruto + Math.min(e.bruto, SUPUESTOS.baseMaximaAnual) * SUPUESTOS.cotEmpresa;
  const gastoHoy = e.gastoMes * 12;

  // Today
  const cotEmpresa = costeTrabajo - e.bruto;
  const cotTrabajador = Math.min(e.bruto, SUPUESTOS.baseMaximaAnual) * SUPUESTOS.cotTrabajador;
  const irpf = irpfMadrid(e.bruto);
  const netoHoy = e.bruto - cotTrabajador - irpf;
  const indirectos = gastoHoy * SUPUESTOS.indirectosHoy;
  const locales = (SUPUESTOS.ibi + SUPUESTOS.basuras + SUPUESTOS.vehiculo) / miembros;
  const comunidad = e.enComunidad ? SUPUESTOS.cuotaComunidad / miembros : 0;
  const hoy = [
    { id: 'cotEmpresa', nombre: 'Cotizaciones que paga la empresa', euros: cotEmpresa },
    { id: 'cotTrabajador', nombre: 'Cotizaciones que se le descuentan', euros: cotTrabajador },
    { id: 'irpf', nombre: 'IRPF', euros: irpf },
    { id: 'indirectos', nombre: 'IVA e impuestos especiales en sus compras', euros: indirectos },
    { id: 'locales', nombre: 'IBI, basuras y vehículo (su parte)', euros: locales },
    ...(e.enComunidad ? [{ id: 'comunidad', nombre: 'Cuota de la comunidad (su parte)', euros: comunidad }] : []),
  ];
  const totalHoy = hoy.reduce((s, x) => s + x.euros, 0);

  // Model: the same employer cost and the same basket of goods.
  // Prices carry 20 % instead of today's ≈ 12 % (and, in the literal reading, the business cascade).
  const precio = ((1 - SUPUESTOS.indirectosHoy) / (1 - TIPO)) * pais.cascada;
  const gastoModelo = gastoHoy * precio;
  const sobreSueldo = costeTrabajo * TIPO;
  const netoModelo = costeTrabajo - sobreSueldo;
  const sobreCompras = gastoModelo * TIPO;
  const oculto = pais.cascada > 1 ? gastoModelo * (1 - TIPO) * (1 - 1 / pais.cascada) : 0;
  const aporta = sobreSueldo + sobreCompras + oculto;
  const dividendo = pais.porPersonaEscala;
  // The neighbourhood share goes to the household when there is no community.
  const parteFamilia = e.enComunidad ? 0 : pais.porPersonaEscala;
  const recibe = dividendo + parteFamilia;
  const modelo = [
    { id: 'sueldo', nombre: '20 % de lo que paga la empresa por su trabajo', euros: sobreSueldo },
    { id: 'compras', nombre: '20 % de lo que compra', euros: sobreCompras },
    ...(oculto > 0 ? [{ id: 'cascada', nombre: 'Lo que llega escondido en los precios (compras entre empresas)', euros: oculto }] : []),
  ];

  return {
    pais, miembros, costeTrabajo, gastoHoy, gastoModelo, precio,
    hoy, totalHoy, netoHoy,
    modelo, aporta, netoModelo, dividendo, parteFamilia, recibe,
    aportaNeto: aporta - recibe,
    pctModelo: (aporta - recibe) / costeTrabajo,
    porEscala: aporta / ESCALAS.length,
    // What is left at the end of the year after spending the same basket.
    sobraHoy: netoHoy - gastoHoy - locales - comunidad,
    pctHoy: totalHoy / costeTrabajo,
    sobraModelo: netoModelo + recibe - gastoModelo,
    // Money that passes through her hands: her work and her purchases.
    maneja: costeTrabajo + gastoModelo,
  };
}

/** What the example's place receives at each scale, per year. */
export function recibeLugar(escala: Escala, modo: Modo, ej: Ejemplo) {
  const pais = cuentasPais(modo);
  if (escala.id === 'persona') return pais.porPersonaEscala;
  if (escala.id === 'vecindad') return ej.enComunidad ? null : pais.porPersonaEscala * (ej.pareja ? 2 : 1);
  if (escala.id === 'continente' || escala.id === 'planeta') return pais.porEscala * 1e6; // what Spain sends
  return escala.habitantesEjemplo ? pais.porPersonaEscala * escala.habitantesEjemplo : null;
}

// ── TODAY'S TAXES, COUNTED ──────────────────────────────────────────────────
export interface GrupoImpuestos { id: string; nombre: string; quien: string; figuras: string[]; numero?: number; nota?: string; fuente?: string }

export const IMPUESTOS_HOY: GrupoImpuestos[] = [
  {
    id: 'estatales', nombre: 'Impuestos del Estado', quien: 'la Agencia Tributaria y las aduanas',
    figuras: [
      'IRPF', 'IVA', 'Impuesto sobre Sociedades', 'Renta de no residentes', 'Temporal de solidaridad de las grandes fortunas',
      'Hidrocarburos', 'Labores del tabaco', 'Alcohol y bebidas derivadas', 'Cerveza', 'Productos intermedios', 'Vino y bebidas fermentadas',
      'Electricidad', 'Carbón', 'Determinados medios de transporte (matriculación)', 'Líquidos para cigarrillos electrónicos',
      'Primas de seguros', 'Valor de la producción de energía eléctrica', 'Gases fluorados', 'Envases de plástico no reutilizables',
      'Depósito de residuos en vertederos e incineración', 'Combustible nuclear gastado y residuos radiactivos', 'Servicios digitales',
      'Transacciones financieras', 'Margen de intereses y comisiones de la banca', 'Actividades de juego', 'Aranceles de aduanas',
    ],
    nota: 'Más las tasas estatales: DNI y pasaporte, tráfico, justicia, puertos…',
  },
  {
    id: 'cotizaciones', nombre: 'Cotizaciones sociales', quien: 'la Seguridad Social',
    figuras: ['Contingencias comunes', 'Desempleo', 'Fondo de Garantía Salarial', 'Formación profesional', 'Mecanismo de Equidad Intergeneracional', 'Accidentes de trabajo y enfermedades profesionales', 'Cotización de solidaridad'],
  },
  {
    id: 'cedidos', nombre: 'Impuestos cedidos a las regiones', quien: 'la agencia tributaria de cada región',
    figuras: ['Patrimonio', 'Sucesiones y Donaciones', 'Transmisiones Patrimoniales y Actos Jurídicos Documentados', 'Tributos sobre el juego'],
    nota: 'Además, las regiones reciben una parte del IRPF, del IVA y de los especiales.',
  },
  {
    id: 'propios', nombre: 'Impuestos propios de las regiones', quien: 'cada comunidad autónoma',
    figuras: ['Estancias turísticas', 'Viviendas vacías', 'Bebidas azucaradas', 'Cánones del agua', 'Residuos', 'Emisiones contaminantes', 'Grandes establecimientos comerciales', '…'],
    numero: HOY.impuestosPropiosCCAA, fuente: 'reaf-propios',
  },
  {
    id: 'locales', nombre: 'Impuestos municipales', quien: 'el ayuntamiento o la diputación',
    figuras: ['IBI', 'Vehículos (IVTM)', 'Actividades Económicas (IAE)', 'Construcciones (ICIO)', 'Plusvalía municipal'],
    nota: 'Más cientos de tasas: basuras, vados, terrazas, licencias, agua, alcantarillado… y contribuciones especiales.',
  },
];

export const numeroFiguras = (g: GrupoImpuestos) => g.numero ?? g.figuras.length;
export const TOTAL_FIGURAS = IMPUESTOS_HOY.reduce((s, g) => s + numeroFiguras(g), 0);

// ── FORMATTING ──────────────────────────────────────────────────────────────
const nf = (dec = 0) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true });
/** «1.234 €», always with the thousands point (es-ES leaves it out under 10.000). */
export function euros(n: number, dec = 0) {
  const s = nf(dec).format(n);
  return `${agrupar(s)}\u00A0€`;
}
export function numero(n: number, dec = 0) { return agrupar(nf(dec).format(n)); }
// es-ES does not group four-digit numbers («1234»); Spanish style guides
// accept both, but a table that mixes «1234» and «12.345» reads as an error.
function agrupar(s: string) {
  return s.replace(/^(-?)(\d)(\d{3})(?=,|$)/, '$1$2.$3');
}
/** Millions of euros, readable: «48.686 M€» or «1,9 billones €». */
export function millones(m: number) {
  if (Math.abs(m) >= 1_000_000) return `${numero(m / 1_000_000, 2)}\u00A0billones\u00A0€`;
  return `${numero(m)}\u00A0M€`;
}
export function porcentaje(p: number, dec = 1) { return `${numero(p, dec)}\u00A0%`; }

// ── WHAT EACH AREA HAS TODAY AND WITH THE MODEL ─────────────────────────────
// Today: spending of all administrations in 2024 by COFOG division (igae-cofog).
// Model: what the five scales that serve people inside Spain (neighbourhood to
// nation) put into the matching areas of the matrix. The match is approximate:
// COFOG 04 «asuntos económicos» is transport, energy and farming here, and
// COFOG 01 «servicios públicos generales» includes the interest on the public debt.
export const ESCALAS_INTERIORES: EscalaId[] = ['vecindad', 'municipio', 'provincia', 'region', 'nacion'];
export const FUNCIONES: { id: string; nombre: string; hoy: number; ambitos: AmbitoId[]; nota?: string }[] = [
  { id: 'proteccion', nombre: 'Pensiones y protección social', hoy: 297_532, ambitos: ['economia'], nota: 'hoy incluye 206.130 M€ de pensiones' },
  { id: 'salud', nombre: 'Salud', hoy: 102_942, ambitos: ['salud'] },
  { id: 'generales', nombre: 'Administración, ciencia e intereses de la deuda', hoy: 92_551, ambitos: ['gestion', 'ciencia'] },
  { id: 'economicos', nombre: 'Transporte, energía y campo', hoy: 80_908, ambitos: ['movilidad', 'energia', 'agricultura', 'alimentacion'] },
  { id: 'educacion', nombre: 'Educación', hoy: 65_862, ambitos: ['educacion'] },
  { id: 'seguridad', nombre: 'Seguridad y justicia', hoy: 28_628, ambitos: ['seguridad'] },
  { id: 'cultura', nombre: 'Cultura y deporte', hoy: 19_193, ambitos: ['cultura', 'deporte'] },
  { id: 'clima', nombre: 'Medio ambiente', hoy: 15_539, ambitos: ['clima'] },
  { id: 'defensa', nombre: 'Defensa', hoy: 14_233, ambitos: ['defensa'] },
  { id: 'vivienda', nombre: 'Vivienda y servicios comunitarios', hoy: 7_613, ambitos: ['vivienda'] },
];

export function modeloPorFuncion(modo: Modo) {
  const pais = cuentasPais(modo);
  return FUNCIONES.map(f => ({
    ...f,
    modelo: ESCALAS_INTERIORES.reduce((s, e) => s + f.ambitos.reduce((t, a) => t + ((MATRIZ[e][a].peso ?? 0) / 100) * pais.porEscala, 0), 0),
  }));
}
