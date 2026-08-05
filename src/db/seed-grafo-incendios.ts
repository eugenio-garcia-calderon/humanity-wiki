// ============================================================================
// Grafo de Conocimiento: «Incendios en España» (Fase 14, 2026-08-05)
// ============================================================================
// Construido con investigación web real (agosto 2026): datos EFFIS/MITECO,
// los megaincendios de 2022 y 2025, el caso de China y su matiz científico
// (la paradoja de la supresión), vídeo de RTVE, imagen de Wikimedia Commons
// con licencia, y la nueva ventana de SOLUCIONES en tarjetas conectada a
// soluciones REALES de la plataforma (vinculadas al reto R017 Incendios).
// Todos los contenidos elaborados por IA van marcados is_ai_generated.
// Idempotente: borra y recrea el grafo y sus ventanas.

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  database: process.env.SQL_DB_NAME,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
});
const db = drizzle(pool);

const EUGENIO = 'U_ADMIN_EUGENIO';
const IA = 'U_IA_CONOCIMIENTO';
const GRAPH_ID = 'KG_INCENDIOS_ESP';
const CHALLENGE_INCENDIOS = 'R017';
const OBJ_ECOSISTEMAS = 'O006';
const T_ESPANA = 'T003';

// ----------------------------------------------------------------------------
// Soluciones REALES de la plataforma (tarjetas), vinculadas al reto Incendios
// ----------------------------------------------------------------------------
const SOLUTIONS = [
  {
    id: 'SOL_INC_PREVENCION', title: 'Gestión preventiva del combustible: quemas prescritas y desbroces',
    type: 'politica', impact: 'alto', cost: 'medio', readiness: 'desplegable',
    description: 'Reducir el combustible acumulado en el monte (quemas prescritas invernales, desbroces, aprovechamiento de biomasa). El abandono rural ha llenado el monte de combustible: los "incendios de sexta generación" se alimentan de él.',
  },
  {
    id: 'SOL_INC_GANADERIA', title: 'Mosaico agroganadero: pastoreo extensivo como cortafuegos vivo',
    type: 'economia_rural', impact: 'alto', cost: 'bajo', readiness: 'probado',
    description: 'Cabras, ovejas y vacas mantienen limpias franjas estratégicas. Programas como los "rebaños bomberos" andaluces pagan a pastores por desbrozar con sus animales — repuebla el rural y previene a la vez.',
  },
  {
    id: 'SOL_INC_VIGILANCIA', title: 'Detección temprana: satélites, cámaras e IA',
    type: 'tecnologia', impact: 'alto', cost: 'medio', readiness: 'desplegable',
    description: 'Red de vigilancia con satélites (como la red FY china o Copernicus), cámaras con IA en torres y drones: detectar en minutos, no en horas. En China la transmisión de alertas alcanza el 98-99% de fiabilidad.',
  },
  {
    id: 'SOL_INC_INVESTIGACION', title: 'Persecución eficaz del incendiario y de la negligencia',
    type: 'politica', impact: 'medio', cost: 'bajo', readiness: 'desplegable',
    description: 'Más de la mitad de los incendios en España son intencionados o por negligencia. Brigadas de investigación de causas (BIIF), trazabilidad y condenas efectivas reducen la reincidencia. En 2025 hubo 37 detenciones en un solo mes.',
  },
  {
    id: 'SOL_INC_PAISAJE', title: 'Planificación del paisaje y de la interfaz urbano-forestal',
    type: 'urbanismo', impact: 'alto', cost: 'alto', readiness: 'en_desarrollo',
    description: 'Franjas de autoprotección alrededor de pueblos, planes municipales de evacuación y un paisaje en mosaico (cultivo-pasto-bosque) que corta la continuidad del fuego a escala de comarca.',
  },
];

// ----------------------------------------------------------------------------
// Ventanas del grafo
// ----------------------------------------------------------------------------
const W = {
  CONTEXTO: 'KW_INC_CONTEXTO', TENDENCIA: 'KW_INC_TENDENCIA', MAPA: 'KW_INC_MAPA',
  CONSECUENCIAS: 'KW_INC_CONSECUENCIAS',
  CAUSAS: 'KW_INC_CAUSAS', VIDEO: 'KW_INC_VIDEO', WIKI: 'KW_INC_WIKI',
  FOTO: 'KW_INC_FOTO', CULEBRA: 'KW_INC_CULEBRA', CHINA: 'KW_INC_CHINA',
  SOLUCIONES: 'KW_INC_SOLUCIONES',
};

const WINDOWS: Array<{ id: string; title: string; kind: string; config: any; creator: string; ia: boolean; x: number; y: number }> = [
  {
    id: W.CONTEXTO, title: '2025: el año que ardió España', kind: 'publicacion', creator: IA, ia: true, x: -820, y: -240,
    config: {
      author_name: 'IA de Conocimiento',
      excerpt: '403.000 hectáreas quemadas en 2025: el peor año desde que existen registros europeos (EFFIS, 2006). Zamora, Ourense y León concentraron el 75% de la superficie.',
      body: 'En 2025 ardieron en España unas 403.000 hectáreas según EFFIS (Copernicus): el peor registro del siglo y la oleada más grave desde 1994 (437.602 ha). En solo dos semanas de agosto se declararon una veintena de grandes incendios que arrasaron más de 300.000 ha, concentradas en Zamora, Ourense y León (≈75% del total). Los dos megaincendios — A Rúa (Ourense, ~44.400 ha) y Uña de Quintana/Molezuelas (Zamora, ~40.800 ha) — superan cada uno al histórico de Losacio de 2022. No es solo meteorología: décadas de abandono rural han cargado el monte de combustible, y más de la mitad de las igniciones siguen siendo humanas. La pregunta de este grafo: ¿cómo se soluciona esto como país?',
    },
  },
  {
    id: W.TENDENCIA, title: 'Hectáreas quemadas por año (2015-2025)', kind: 'grafica', creator: IA, ia: true, x: -100, y: -560,
    config: {
      chart: {
        type: 'line', unit: ' ha',
        data: [
          { name: '2015', value: 103200 }, { name: '2016', value: 65800 },
          { name: '2017', value: 178400 }, { name: '2018', value: 25200 },
          { name: '2019', value: 83900 }, { name: '2020', value: 65900 },
          { name: '2021', value: 84600 }, { name: '2022', value: 306000 },
          { name: '2023', value: 89000 }, { name: '2024', value: 48000 },
          { name: '2025', value: 403000 },
        ],
      },
      source_note: 'Serie aproximada elaborada por IA a partir de EFFIS (Copernicus) y avances MITECO. Los años extremos (2022, 2025) destacan sobre una media de ~90.000 ha: la tendencia no es lineal, es de picos catastróficos cada vez mayores.',
    },
  },
  {
    id: W.MAPA, title: 'El mapa de las cicatrices: superficie quemada', kind: 'mapa', creator: EUGENIO, ia: false, x: 620, y: -420,
    config: {
      map_url: '/incendios-espana-mapa?embed=1',
      description: 'Los 8 grandes incendios de 2022-2025 como polígonos sobre el mapa. Clic en cada zona quemada para ver año, hectáreas, causa y fuente. Perímetros aproximados (IA) a partir de la superficie oficial.',
    },
  },
  {
    id: W.CAUSAS, title: '¿Por qué arde? Causalidad de los incendios', kind: 'grafica', creator: IA, ia: true, x: 900, y: 40,
    config: {
      chart: {
        type: 'donut', unit: '%',
        data: [
          { name: 'Intencionados', value: 54 }, { name: 'Negligencias y accidentes', value: 24 },
          { name: 'Causa desconocida', value: 12 }, { name: 'Rayo', value: 5 },
          { name: 'Reproducciones y otras', value: 5 },
        ],
      },
      source_note: 'Distribución decenal aproximada (MITECO, estadística general de incendios forestales). Casi 8 de cada 10 incendios tienen origen humano — coherente con las causas del reto Incendios de esta plataforma.',
    },
  },
  {
    id: W.CONSECUENCIAS, title: 'La rueda de las consecuencias: qué se pierde cuando arde', kind: 'grafica', creator: IA, ia: true, x: 1180, y: -180,
    config: {
      chart: {
        type: 'donut', unit: '%',
        data: [
          { name: 'Masa forestal y hábitats', value: 35 },
          { name: 'Suelo fértil y erosión posterior', value: 20 },
          { name: 'Emisiones de CO2 y humos', value: 15 },
          { name: 'Economía rural (pastos, apicultura, castañares)', value: 15 },
          { name: 'Agua: calidad de cuencas y embalses', value: 8 },
          { name: 'Viviendas, infraestructuras y vidas', value: 7 },
        ],
      },
      source_note: 'Distribución ORIENTATIVA del impacto elaborada por IA (pendiente de revisión con datos oficiales). Las consecuencias no terminan al apagarse el fuego: la erosión del suelo y la contaminación de las cuencas llegan con las primeras lluvias, y la recuperación del arbolado tarda décadas.',
    },
  },
  {
    id: W.VIDEO, title: 'Anatomía de un incendio (En Portada, RTVE)', kind: 'video', creator: EUGENIO, ia: false, x: 620, y: 460,
    config: { youtube_id: '_TAnegZCZzU', channel: 'RTVE Noticias — En Portada' },
  },
  {
    id: W.WIKI, title: 'Incendios forestales de España de 2025', kind: 'wikipedia', creator: EUGENIO, ia: false, x: -100, y: 640,
    config: { wiki_lang: 'es', wiki_page: 'Incendios forestales de España de 2025' },
  },
  {
    id: W.FOTO, title: 'La Culebra en llamas', kind: 'imagen', creator: EUGENIO, ia: false, x: -820, y: 460,
    config: {
      image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Medios_de_extinci%C3%B3n_actuando_en_el_incendio_de_la_Sierra_de_la_Culebra.jpg',
      caption: 'Medios de extinción actuando en el incendio de la Sierra de la Culebra (Zamora, junio de 2022).',
      source_name: 'Wikimedia Commons (CC BY-SA)',
      source_url: 'https://commons.wikimedia.org/wiki/File:Medios_de_extinci%C3%B3n_actuando_en_el_incendio_de_la_Sierra_de_la_Culebra.jpg',
    },
  },
  {
    id: W.CULEBRA, title: 'Sierra de la Culebra, 2022: la herida que lo anunció', kind: 'ficha', creator: IA, ia: true, x: -1080, y: 120,
    config: {
      facts: [
        { label: 'Ferreras de Arriba (15 jun 2022)', value: '29.670 ha' },
        { label: 'Losacio (17 jul 2022)', value: '35.960 ha — el mayor de la historia de Castilla y León' },
        { label: 'Provincia de Zamora en 2022', value: '≈64.000 ha quemadas' },
        { label: 'Causa de ambos', value: 'Rayos en tormentas secas + monte cargado de combustible' },
        { label: 'Víctimas de Losacio', value: 'Un bombero y un ganadero fallecidos' },
        { label: 'Lección', value: 'Tres años después, 2025 demostró que no se aprendió a escala' },
      ],
      source_note: 'Wikipedia — Incendios de la sierra de la Culebra de 2022.',
    },
  },
  {
    id: W.CHINA, title: 'Caso de éxito: cómo China redujo sus incendios', kind: 'publicacion', creator: IA, ia: true, x: 100, y: -60,
    config: {
      author_name: 'IA de Conocimiento',
      excerpt: 'Tras el gran incendio de Daxing\'anling (1987), China construyó el mayor sistema de prevención del mundo: satélites, torres, brigadas y responsabilidad territorial. La superficie quemada cayó drásticamente — con un matiz que importa.',
      body: 'El incendio de Daxing\'anling (1987, >1 millón de hectáreas, 200 muertos) obligó a China a reinventar su política forestal. Construyó una red nacional de vigilancia con satélites geoestacionarios (FY-2C/D) y detección casi en tiempo real, torres de observación, cortafuegos masivos, brigadas profesionales permanentes y responsabilidad administrativa por territorio: si tu comarca arde, respondes. Los sistemas de alerta temprana en campo alcanzan una fiabilidad de transmisión del 98-99%. Resultado: la superficie quemada media anual se redujo en más de un orden de magnitud respecto a los años 80.\n\nEL MATIZ (Human Ecology, Springer): la supresión total genera la "paradoja del incendio" — el combustible se acumula durante décadas y, cuando algo falla, el fuego es más grande e inextinguible. La lección completa para España no es solo apagar más rápido: es detectar antes (China) Y gestionar el combustible (quemas prescritas, mosaico, ganadería) para que el monte no sea una bomba.',
    },
  },
  {
    id: W.SOLUCIONES, title: 'Cómo lo solucionamos como país: 5 soluciones', kind: 'soluciones', creator: EUGENIO, ia: false, x: 1150, y: 520,
    config: {
      items: SOLUTIONS.map(s => ({
        solution_id: s.id, title: s.title, type: s.type, impact: s.impact,
        cost: s.cost, readiness: s.readiness, description: s.description,
      })),
      source_note: 'Soluciones reales de la plataforma, vinculadas al reto Incendios (R017). Valóralas y coméntalas: la mejor subirá.',
    },
  },
];

const EDGES: Array<{ from: string | null; to: string; relation: string; label?: string; description?: string }> = [
  { from: null, to: W.CONTEXTO, relation: 'contexto', label: 'qué está pasando',
    description: 'La foto de 2025: el peor año registrado. Sin esta base, el resto del grafo no se entiende.' },
  { from: null, to: W.TENDENCIA, relation: 'dato', label: 'la tendencia',
    description: 'Once años de datos EFFIS/MITECO: la media engaña — lo que crece es el tamaño de los picos catastróficos.' },
  { from: null, to: W.MAPA, relation: 'dato', label: 'dónde ha ardido',
    description: 'La geografía del fuego: los grandes incendios de 2022-2025 dibujados sobre España, clicables uno a uno.' },
  { from: null, to: W.CAUSAS, relation: 'causa', label: 'por qué arde',
    description: 'Casi 8 de cada 10 incendios tienen origen humano. La causalidad es la palanca de las soluciones.' },
  { from: null, to: W.VIDEO, relation: 'contexto', label: 'en profundidad',
    description: 'El reportaje de En Portada (RTVE) disecciona cómo se comporta un gran incendio moderno y por qué desborda los medios de extinción.' },
  { from: null, to: W.WIKI, relation: 'fuente', label: 'la enciclopedia',
    description: 'La crónica enciclopédica y referenciada de la temporada 2025, incendio a incendio.' },
  { from: null, to: W.FOTO, relation: 'contexto', label: 'en imágenes',
    description: 'Una imagen con licencia libre de la Culebra ardiendo: la magnitud que las cifras no transmiten.' },
  { from: null, to: W.CONSECUENCIAS, relation: 'dato', label: 'las consecuencias',
    description: 'La rueda de lo que se pierde: bosque, suelo, agua, economía rural, salud. El coste real de cada hectárea quemada, más allá del titular.' },
  { from: null, to: W.SOLUCIONES, relation: 'dato', label: 'cómo lo resolvemos',
    description: 'Las cinco palancas, como tarjetas de solución reales de la plataforma: prevención del combustible, mosaico ganadero, detección temprana, persecución del incendiario y planificación del paisaje.' },
  { from: W.CULEBRA, to: W.CONTEXTO, relation: 'contexto', label: 'el precedente',
    description: 'La Culebra (2022) fue el aviso: los mismos ingredientes — combustible acumulado, rayos, medios desbordados — que 2025 repitió a escala nacional.' },
  { from: W.TENDENCIA, to: W.CONTEXTO, relation: 'apoya', label: 'los datos lo confirman',
    description: 'La serie 2015-2025 sostiene la tesis del contexto: picos catastróficos cada vez mayores, no un aumento gradual.' },
  { from: W.CHINA, to: W.SOLUCIONES, relation: 'apoya', label: 'caso de éxito',
    description: 'La experiencia china demuestra que la detección temprana y la responsabilidad territorial reducen drásticamente la superficie quemada.' },
  { from: W.CHINA, to: W.SOLUCIONES, relation: 'matiza', label: 'la paradoja de la supresión',
    description: 'El matiz científico (Human Ecology, Springer): apagar TODO acumula combustible y prepara incendios peores. Por eso las soluciones combinan detección temprana CON gestión del combustible — no basta con más hidroaviones.' },
  { from: W.CONSECUENCIAS, to: W.SOLUCIONES, relation: 'apoya', label: 'por qué urge actuar',
    description: 'La magnitud de las consecuencias — décadas de recuperación, cuencas contaminadas, comarcas despobladas — es el argumento de urgencia de las cinco soluciones.' },
  { from: W.CAUSAS, to: W.SOLUCIONES, relation: 'causa', label: 'de la causa a la solución',
    description: 'Si el origen es mayoritariamente humano, las soluciones también: prevención, investigación y economía rural pesan más que cualquier tecnología.' },
];

async function main() {
  // Limpieza idempotente
  await db.execute(sql`DELETE FROM graph_edges WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM graph_windows WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM graph_entity_links WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM knowledge_windows WHERE id LIKE 'KW_INC_%'`);
  await db.execute(sql`DELETE FROM knowledge_graphs WHERE id = ${GRAPH_ID}`);

  // Soluciones reales vinculadas al reto Incendios
  for (const s of SOLUTIONS) {
    await db.execute(sql`
      INSERT INTO solutions (id, title, type, description, impact, cost, readiness, created_by, updated_by)
      VALUES (${s.id}, ${s.title}, ${s.type}, ${s.description}, ${s.impact}, ${s.cost}, ${s.readiness}, ${EUGENIO}, ${EUGENIO})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
        impact = EXCLUDED.impact, cost = EXCLUDED.cost, readiness = EXCLUDED.readiness
    `);
    await db.execute(sql`
      INSERT INTO challenge_solutions (challenge_id, solution_id)
      VALUES (${CHALLENGE_INCENDIOS}, ${s.id}) ON CONFLICT DO NOTHING
    `);
  }

  // Grafo
  await db.execute(sql`
    INSERT INTO knowledge_graphs (id, title, slug, description, center, creator_user_id, trigger_keywords, status, is_ai_generated, created_by, updated_by)
    VALUES (${GRAPH_ID}, 'Incendios en España: del récord de 2025 a las soluciones', 'incendios-espana',
            'El peor año de incendios desde que hay registros (403.000 ha en 2025), explicado con datos, mapas, causas y cinco soluciones reales — incluido el caso de éxito de China y su matiz científico.',
            ${JSON.stringify({ left: { label: 'España', sublabel: 'Territorio' }, right: { label: 'Incendios', sublabel: 'Crisis' } })}::jsonb,
            ${EUGENIO},
            ${JSON.stringify(['incendios', 'incendio forestal', 'fuego', 'hectareas quemadas', 'sierra de la culebra', 'ourense', 'zamora', 'incendios espana', 'ola de incendios', 'megaincendios', 'effis'])}::jsonb,
            'publicado', false, ${EUGENIO}, ${EUGENIO})
  `);

  // Ventanas + posiciones
  for (const w of WINDOWS) {
    await db.execute(sql`
      INSERT INTO knowledge_windows (id, title, kind, config, creator_user_id, is_ai_generated, created_by, updated_by)
      VALUES (${w.id}, ${w.title}, ${w.kind}, ${JSON.stringify(w.config)}::jsonb, ${w.creator}, ${w.ia}, ${w.creator}, ${w.creator})
    `);
    await db.execute(sql`
      INSERT INTO graph_windows (graph_id, window_id, x, y) VALUES (${GRAPH_ID}, ${w.id}, ${w.x}, ${w.y})
    `);
  }

  // Conexiones con descripción
  for (const e of EDGES) {
    await db.execute(sql`
      INSERT INTO graph_edges (graph_id, from_window_id, to_window_id, relation, label, description, created_by, updated_by)
      VALUES (${GRAPH_ID}, ${e.from}, ${e.to}, ${e.relation}, ${e.label || null}, ${e.description || null}, ${EUGENIO}, ${EUGENIO})
    `);
  }

  // Anclaje ontológico: de qué trata y a qué afecta
  for (const [etype, eid, rel] of [
    ['challenges', CHALLENGE_INCENDIOS, 'trata_sobre'],
    ['territories', T_ESPANA, 'afecta_a'],
    ['objectives', OBJ_ECOSISTEMAS, 'afecta_a'],
  ] as const) {
    await db.execute(sql`
      INSERT INTO graph_entity_links (graph_id, entity_type, entity_id, relation)
      VALUES (${GRAPH_ID}, ${etype}, ${eid}, ${rel}) ON CONFLICT DO NOTHING
    `);
  }

  console.log(`Grafo "${GRAPH_ID}" sembrado: ${WINDOWS.length} ventanas, ${EDGES.length} conexiones, ${SOLUTIONS.length} soluciones reales vinculadas al reto Incendios.`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
