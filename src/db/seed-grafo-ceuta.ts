import { db } from './index.ts';
import { sql } from 'drizzle-orm';

// ============================================================================
// Grafo demo: "Ceuta: la frontera amenazada" (Fase 11, 2026-08-05)
// ============================================================================
// El primer Grafo de Conocimiento de la plataforma, pedido explícitamente por
// el usuario como caso de prueba de un tema de actualidad. Criterios:
//  - Creador del grafo: Eugenio García-Calderón Huerta (usuario admin real).
//  - Contenido redactado por la IA → autor "IA de Conocimiento" y marcado
//    is_ai_generated (pendiente de revisión), igual que la política aplicada
//    a los datos de países de Europa.
//  - Contenido aportado/curado por el usuario (mapa EOM, documento del
//    Senado, vídeo, Wikipedia, mapa propio) → creador Eugenio, sin marca IA,
//    SIEMPRE con fuente citada.
//  - El tema es políticamente sensible: cada ventana cita su fuente y el
//    análisis presenta las posiciones española Y marroquí — mostrar la
//    complejidad es la misión, no el panfleto.
// Idempotente: borra y recrea el grafo completo en cada ejecución.

const EUGENIO = 'U_ADMIN_EUGENIO';
const IA_USER = 'U_IA_CONOCIMIENTO';
const GRAPH_ID = 'KG_CEUTA_FRONTERA';

async function ensureUsers() {
  // Perfil real del creador, pedido por él mismo.
  await db.execute(sql`
    UPDATE users SET
      name = 'Eugenio García-Calderón Huerta',
      display_name = 'Eugenio García-Calderón Huerta',
      bio = 'Fundador de Humanity.wiki. Impulsor de los Grafos de Conocimiento: conectar el saber para entender los problemas complejos.',
      updated_at = now()
    WHERE id = ${EUGENIO}
  `);

  // Autor-sistema para el contenido generado por la IA (sin contraseña: no
  // puede iniciar sesión; es una firma, no una cuenta).
  await db.execute(sql`
    INSERT INTO users (id, email, name, display_name, role, role_level, email_verified, bio, created_by)
    VALUES (${IA_USER}, 'ia@conocimientodelahumanidad.org', 'IA de Conocimiento', 'IA de Conocimiento',
            'user', 1, true,
            'Sistema de conocimiento asistido por IA de la plataforma. Todas sus aportaciones quedan marcadas como pendientes de revisión humana.',
            ${EUGENIO})
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, bio = EXCLUDED.bio
  `);
}

interface WindowSeed {
  id: string;
  title: string;
  kind: string;
  config: any;
  creator: string;
  isAi: boolean;
  x: number;
  y: number;
}

const WINDOWS: WindowSeed[] = [
  {
    id: 'KW_CEUTA_CONTEXTO',
    title: 'Qué está pasando: la crisis de 2026',
    kind: 'publicacion',
    creator: IA_USER,
    isAi: true,
    x: -540, y: -380,
    config: {
      publication_id: 'PUB_CEUTA_CONTEXTO',
      author_name: 'IA de Conocimiento',
      excerpt: 'Desde comienzos de 2026, en torno a 30.000 personas habrían entrado de forma irregular en Ceuta desde Marruecos, la mayor presión migratoria registrada sobre la frontera sur europea.',
      body: 'Desde comienzos de 2026, en torno a 30.000 personas habrían entrado de forma irregular en Ceuta desde Marruecos, según las cifras difundidas — la mayor presión migratoria registrada sobre esta frontera, muy por encima de la crisis de mayo de 2021 (~10.000 entradas en 48 horas).\n\nCeuta (unos 19 km², ~83.000 habitantes) es, junto a Melilla, la única frontera terrestre de la Unión Europea con África. Eso convierte cada crisis local en un asunto europeo: control fronterizo, acuerdos con Marruecos, derecho de asilo y convivencia en una ciudad pequeña y densa se tensan a la vez.\n\nEste grafo conecta las piezas necesarias para entender el problema completo: la geografía que explica por qué ocurre aquí, la historia que explica la disputa de soberanía, los documentos que la reavivan, y los datos de la propia ciudad.',
    },
  },
  {
    id: 'KW_CEUTA_MAPA_EOM',
    title: 'El mapa clave: geografía, flujos y conflictos del Estrecho',
    kind: 'imagen',
    creator: EUGENIO,
    isAi: false,
    x: 420, y: -440,
    config: {
      image_url: '/knowledge/eom-estrecho-gibraltar.png',
      caption: 'El estrecho de Gibraltar concentra en 14 km: ruta de circunnavegación global, presión migratoria, rutas de la droga, disputas marítimas (Gibraltar), plazas de soberanía reclamadas por Marruecos y bases militares de cuatro países.',
      source_name: 'Abel Gil Lobo — El Orden Mundial (EOM), 2021',
      source_url: 'https://elordenmundial.com/mapas-y-graficos/geopolitica-estrecho-gibraltar/',
    },
  },
  {
    id: 'KW_CEUTA_DOC_EEUU',
    title: 'El documento de EE. UU. que reabrió la disputa',
    kind: 'documento',
    creator: EUGENIO,
    isAi: false,
    x: 720, y: -60,
    config: {
      quote: "The Committee notes that the Spanish-administered cities of Ceuta and Melilla are located in Moroccan territory and remain the subject of Morocco's longstanding claim. The Committee supports efforts by the Secretary of State to encourage diplomatic engagement between Morocco and Spain on the future status of Ceuta and Melilla.",
      quote_translation: 'El Comité observa que las ciudades administradas por España de Ceuta y Melilla están situadas en territorio marroquí y siguen siendo objeto de la histórica reclamación de Marruecos. El Comité apoya los esfuerzos del secretario de Estado por fomentar el diálogo diplomático entre Marruecos y España sobre el futuro estatus de Ceuta y Melilla.',
      context: 'Precisión importante: es lenguaje de un informe del Comité de Apropiaciones del Senado de EE. UU. que acompaña a la ley de gastos — no un acto formal de reconocimiento del Gobierno estadounidense. Aun así, que un documento oficial del Congreso asuma la tesis marroquí supuso un giro con consecuencias diplomáticas. Léase junto al análisis conectado (flecha roja): la presencia española en ambas ciudades es anterior a la existencia del Estado marroquí y la ONU no las considera territorios pendientes de descolonización.',
      source_name: 'Comité de Apropiaciones, Senado de EE. UU. (informe de acompañamiento, sección Morocco)',
      source_url: 'https://www.appropriations.senate.gov/',
    },
  },
  {
    id: 'KW_CEUTA_ANALISIS',
    title: '¿Son Ceuta y Melilla colonias? El análisis jurídico',
    kind: 'publicacion',
    creator: IA_USER,
    isAi: true,
    x: 620, y: 320,
    config: {
      publication_id: 'PUB_CEUTA_ANALISIS',
      author_name: 'IA de Conocimiento',
      excerpt: 'La presencia española en Ceuta es anterior en casi cinco siglos al Estado marroquí moderno, y la ONU no incluye ninguna de las dos ciudades en su lista de territorios no autónomos.',
      body: 'Los hechos, por orden:\n\n1. Ceuta está bajo soberanía europea desde 1415 (conquista portuguesa) y bajo la Corona española desde 1580, confirmada por el Tratado de Lisboa de 1668. Melilla es española desde 1497. El Estado marroquí moderno se independiza en 1956: la presencia española es anterior en casi cinco siglos.\n\n2. La ONU no incluye Ceuta ni Melilla en su lista de territorios no autónomos pendientes de descolonización (Gibraltar, en cambio, sí figura). Según la definición internacional, no son colonias.\n\n3. La posición marroquí: Rabat las reclama desde 1956, las considera "presidios ocupados" y las compara con la reivindicación española de Gibraltar. España rechaza la comparación precisamente por el punto 2, y las dos ciudades son ciudades autónomas españolas desde 1995 y territorio de la Unión Europea.\n\n4. La complejidad real: que la reclamación no tenga encaje en la doctrina de descolonización de la ONU no la hace desaparecer. Condiciona la relación bilateral entera — cooperación fronteriza, aduanas comerciales, y el uso de la presión migratoria como herramienta política, como se vio en 2021 y se repite en la crisis actual.',
    },
  },
  {
    id: 'KW_CEUTA_VIDEO',
    title: 'La historia de Ceuta y Melilla, contada en vídeo',
    kind: 'video',
    creator: EUGENIO,
    isAi: false,
    x: -700, y: 160,
    config: {
      youtube_id: '9-z6yZVrwJQ',
      channel: 'La Mecedora (Ignacio Sarmiento)',
    },
  },
  {
    id: 'KW_CEUTA_WIKI',
    title: 'Ceuta, la ficha completa',
    kind: 'wikipedia',
    creator: EUGENIO,
    isAi: false,
    x: -720, y: -140,
    config: { wiki_lang: 'es', wiki_page: 'Ceuta' },
  },
  {
    id: 'KW_CEUTA_MAPA_IND',
    title: 'Ceuta en nuestro mapa de indicadores',
    kind: 'mapa',
    creator: EUGENIO,
    isAi: false,
    x: 40, y: 430,
    config: { map_url: '/mapa?embed=1&territorio=ceuta' },
  },
  {
    id: 'KW_CEUTA_CRONO',
    title: 'Seis siglos en diez hitos',
    kind: 'cronologia',
    creator: IA_USER,
    isAi: true,
    x: -320, y: 430,
    config: {
      events: [
        { year: 1415, text: 'Portugal conquista Ceuta; primera plaza europea en el norte de África.' },
        { year: 1497, text: 'Melilla pasa a la Corona de Castilla.' },
        { year: 1668, text: 'El Tratado de Lisboa confirma Ceuta como española.' },
        { year: 1912, text: 'Comienza el Protectorado español en el norte de Marruecos.' },
        { year: 1956, text: 'Independencia de Marruecos, que desde entonces reclama ambas ciudades.' },
        { year: 1995, text: 'Estatutos de Autonomía: Ceuta y Melilla, ciudades autónomas españolas.' },
        { year: 2002, text: 'Crisis del islote Perejil entre España y Marruecos.' },
        { year: 2021, text: 'Crisis de mayo: ~10.000 entradas en 48 horas tras la retirada del control marroquí.' },
        { year: 2025, text: 'Informe del comité del Senado de EE. UU. que asume la tesis marroquí.' },
        { year: 2026, text: 'Crisis actual: ~30.000 entradas irregulares desde enero (dato en revisión).' },
      ],
    },
  },
  {
    id: 'KW_CEUTA_ENCUESTA',
    title: 'Qué preocupa a los ceutíes',
    kind: 'grafica',
    creator: IA_USER,
    isAi: true,
    x: 40, y: -580,
    config: {
      chart: {
        type: 'donut',
        unit: '%',
        data: [
          { name: 'Seguridad', value: 42 },
          { name: 'Migración y frontera', value: 27 },
          { name: 'Economía y empleo', value: 15 },
          { name: 'Convivencia', value: 9 },
          { name: 'Otros', value: 7 },
        ],
      },
      source_note: 'Distribución orientativa elaborada por la IA a partir de barómetros públicos; pendiente de sustituir por una encuesta real con ficha técnica. Por eso esta ventana lleva la marca "IA · pendiente de revisión".',
    },
  },
  {
    id: 'KW_CEUTA_AUTORES',
    title: 'Quién sabe de esto: autores y fuentes',
    kind: 'autores',
    creator: EUGENIO,
    isAi: false,
    x: -660, y: 470,
    config: {
      authors: [
        { name: 'Abel Gil Lobo', affiliation: 'Cartógrafo — El Orden Mundial', url: 'https://elordenmundial.com/author/abel-gil/' },
        { name: 'El Orden Mundial (EOM)', affiliation: 'Análisis internacional en español', url: 'https://elordenmundial.com' },
        { name: 'La Mecedora (Ignacio Sarmiento)', affiliation: 'Divulgación histórica en YouTube', url: 'https://youtu.be/9-z6yZVrwJQ' },
        { name: 'Instituto de Estudios Ceutíes', affiliation: 'Investigación y cultura sobre Ceuta', url: 'https://www.ieceuties.org' },
        { name: 'Real Instituto Elcano', affiliation: 'Think tank — relaciones España-Marruecos', url: 'https://www.realinstitutoelcano.org' },
      ],
    },
  },
];

// Aristas: el centro conecta con todo; las relaciones tipadas cuentan la
// historia (la roja "contradice" entre el análisis y el documento de EE. UU.
// es el corazón didáctico del grafo).
const EDGES: Array<{ from: string | null; to: string; relation: string; label?: string; description?: string }> = [
  { from: null, to: 'KW_CEUTA_CONTEXTO', relation: 'contexto', label: 'qué está pasando',
    description: 'La puerta de entrada al grafo: los hechos de la crisis actual, sin los cuales el resto de piezas no se entienden.' },
  { from: null, to: 'KW_CEUTA_MAPA_EOM', relation: 'dato', label: 'enclave geoestratégico',
    description: 'El mapa condensa la evidencia geográfica: 14 km de mar por los que pasa el tráfico global, la migración y las disputas de soberanía a la vez.' },
  { from: null, to: 'KW_CEUTA_DOC_EEUU', relation: 'fuente', label: 'documento oficial',
    description: 'Fuente primaria en su literalidad: el texto exacto del informe del comité del Senado de EE. UU. que reabrió la disputa, sin interpretaciones intermedias.' },
  { from: null, to: 'KW_CEUTA_VIDEO', relation: 'contexto', label: 'la historia',
    description: 'Seis siglos en vídeo: sin la historia de las dos ciudades no se puede juzgar la reclamación actual.' },
  { from: null, to: 'KW_CEUTA_WIKI', relation: 'fuente',
    description: 'La ficha enciclopédica de referencia, con los datos básicos verificables del territorio.' },
  { from: null, to: 'KW_CEUTA_MAPA_IND', relation: 'dato', label: 'indicadores del territorio',
    description: 'Los 14 objetivos de la plataforma medidos sobre Ceuta: el estado real del territorio más allá del titular.' },
  { from: null, to: 'KW_CEUTA_CRONO', relation: 'contexto', label: 'línea de tiempo',
    description: 'Los diez hitos que ordenan cronológicamente todo lo que muestran las demás ventanas.' },
  { from: null, to: 'KW_CEUTA_ENCUESTA', relation: 'dato', label: 'percepción ciudadana',
    description: 'Qué preocupa a quienes viven allí — la dimensión humana que suele faltar en el debate geopolítico. Datos orientativos de IA, pendientes de encuesta real.' },
  { from: null, to: 'KW_CEUTA_AUTORES', relation: 'fuente', label: 'para profundizar',
    description: 'Autores y fuentes de referencia para seguir tirando del hilo con rigor.' },
  { from: 'KW_CEUTA_ANALISIS', to: 'KW_CEUTA_DOC_EEUU', relation: 'contradice', label: 'réplica jurídica',
    description: 'El corazón del grafo: el análisis jurídico-histórico disputa la premisa del informe estadounidense (la presencia española es anterior al Estado marroquí y la ONU no considera a Ceuta territorio pendiente de descolonización). Dos piezas enfrentadas, las dos con fuente — así se muestra una controversia honestamente.' },
  { from: 'KW_CEUTA_CRONO', to: 'KW_CEUTA_ANALISIS', relation: 'apoya', label: 'los hechos históricos',
    description: 'Las fechas de la cronología (1415, 1497, 1668, 1956…) son la base factual sobre la que se sostiene el argumento jurídico.' },
  { from: 'KW_CEUTA_MAPA_EOM', to: 'KW_CEUTA_CONTEXTO', relation: 'causa', label: 'la geografía lo explica',
    description: 'La crisis migratoria no es casualidad: ocurre exactamente donde la geografía comprime todos los flujos — el mapa explica el porqué del suceso.' },
];

async function main() {
  await ensureUsers();

  // Limpieza idempotente del grafo demo.
  await db.execute(sql`DELETE FROM graph_entity_links WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM graph_edges WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM graph_windows WHERE graph_id = ${GRAPH_ID}`);
  const windowIds = WINDOWS.map(w => w.id);
  await db.execute(sql`DELETE FROM ratings WHERE entity_type = 'knowledge_windows' AND entity_id IN ${windowIds}`);
  await db.execute(sql`DELETE FROM ratings WHERE entity_type = 'knowledge_graphs' AND entity_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM comments WHERE entity_type = 'knowledge_windows' AND entity_id IN ${windowIds}`);
  await db.execute(sql`DELETE FROM knowledge_windows WHERE id IN ${windowIds}`);
  await db.execute(sql`DELETE FROM knowledge_graphs WHERE id = ${GRAPH_ID}`);

  // Las dos publicaciones (aparecen también en el Muro, firmadas por la IA).
  for (const w of WINDOWS.filter(w => w.kind === 'publicacion')) {
    const pubId = w.config.publication_id;
    await db.execute(sql`
      INSERT INTO publications (id, author_user_id, title, body, created_by, updated_by)
      VALUES (${pubId}, ${IA_USER}, ${w.title}, ${w.config.body}, ${IA_USER}, ${IA_USER})
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = now()
    `);
    await db.execute(sql`
      INSERT INTO publication_links (publication_id, entity_type, entity_id)
      VALUES (${pubId}, 'knowledge_graphs', ${GRAPH_ID}), (${pubId}, 'territories', 'T032')
      ON CONFLICT DO NOTHING
    `);
  }

  // El grafo.
  await db.execute(sql`
    INSERT INTO knowledge_graphs (id, title, slug, description, center, creator_user_id, trigger_keywords, status, is_ai_generated, created_by, updated_by)
    VALUES (${GRAPH_ID}, 'Ceuta: la frontera amenazada', 'ceuta-frontera-amenazada',
            'Por qué 14 kilómetros de mar concentran historia, geopolítica, migración y convivencia. El conocimiento conectado para entender un problema complejo — no un titular.',
            ${JSON.stringify({ left: { label: 'Ceuta', sublabel: 'Territorio' }, right: { label: 'Amenaza', sublabel: 'Concepto' } })}::jsonb,
            ${EUGENIO},
            ${JSON.stringify(['ceuta', 'frontera', 'amenaza', 'ceuta frontera', 'frontera sur', 'melilla', 'marruecos', 'inmigracion', 'migracion', 'crisis migratoria', 'estrecho de gibraltar'])}::jsonb,
            'publicado', false, ${EUGENIO}, ${EUGENIO})
  `);

  // Las ventanas, sus posiciones y las aristas.
  for (const w of WINDOWS) {
    await db.execute(sql`
      INSERT INTO knowledge_windows (id, title, kind, config, creator_user_id, is_ai_generated, created_by, updated_by)
      VALUES (${w.id}, ${w.title}, ${w.kind}, ${JSON.stringify(w.config)}::jsonb, ${w.creator}, ${w.isAi}, ${w.creator}, ${w.creator})
    `);
    await db.execute(sql`
      INSERT INTO graph_windows (graph_id, window_id, x, y) VALUES (${GRAPH_ID}, ${w.id}, ${w.x}, ${w.y})
    `);
  }
  for (const e of EDGES) {
    await db.execute(sql`
      INSERT INTO graph_edges (graph_id, from_window_id, to_window_id, relation, label, description, created_by, updated_by)
      VALUES (${GRAPH_ID}, ${e.from}, ${e.to}, ${e.relation}, ${e.label || null},
              ${e.description || null}, ${EUGENIO}, ${EUGENIO})
    `);
  }

  // Anclaje al grafo general de la plataforma (ontología, Fase 11b): este
  // grafo TRATA SOBRE el territorio Ceuta (T032, que ya existía como región)
  // y AFECTA A los objetivos Convivencia y Gobernanza — la conexión
  // "Ceuta + Convivencia" del boceto original del usuario. Sobre estos
  // enlaces se infieren los "grafos relacionados".
  await db.execute(sql`
    INSERT INTO graph_entity_links (graph_id, entity_type, entity_id, relation) VALUES
      (${GRAPH_ID}, 'territories', 'T032', 'trata_sobre'),
      (${GRAPH_ID}, 'objectives', 'O005', 'afecta_a'),
      (${GRAPH_ID}, 'objectives', 'O012', 'afecta_a')
    ON CONFLICT DO NOTHING
  `);

  // Valoraciones y un comentario de los usuarios demo, para que las medias
  // 0-10 se vean pobladas desde el primer día.
  const demoRatings: Array<[string, string, string, number]> = [
    ['U_DEMO_LUCIA', 'knowledge_graphs', GRAPH_ID, 9],
    ['U_DEMO_MARC', 'knowledge_graphs', GRAPH_ID, 8],
    ['U_DEMO_AINHOA', 'knowledge_graphs', GRAPH_ID, 9],
    ['U_DEMO_SAMUEL', 'knowledge_graphs', GRAPH_ID, 8],
    ['U_DEMO_LUCIA', 'knowledge_windows', 'KW_CEUTA_MAPA_EOM', 10],
    ['U_DEMO_MARC', 'knowledge_windows', 'KW_CEUTA_MAPA_EOM', 9],
    ['U_DEMO_NEREA', 'knowledge_windows', 'KW_CEUTA_MAPA_EOM', 9],
    ['U_DEMO_AINHOA', 'knowledge_windows', 'KW_CEUTA_VIDEO', 9],
    ['U_DEMO_SAMUEL', 'knowledge_windows', 'KW_CEUTA_VIDEO', 8],
    ['U_DEMO_LUCIA', 'knowledge_windows', 'KW_CEUTA_ANALISIS', 8],
    ['U_DEMO_NEREA', 'knowledge_windows', 'KW_CEUTA_DOC_EEUU', 9],
    ['U_DEMO_MARC', 'knowledge_windows', 'KW_CEUTA_CRONO', 8],
  ];
  for (const [uid, etype, eid, score] of demoRatings) {
    await db.execute(sql`
      INSERT INTO ratings (user_id, entity_type, entity_id, score) VALUES (${uid}, ${etype}, ${eid}, ${score})
      ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET score = EXCLUDED.score
    `);
  }
  await db.execute(sql`
    INSERT INTO comments (id, entity_type, entity_id, author_user_id, body, created_by, updated_by)
    VALUES ('CMT_CEUTA_EOM_1', 'knowledge_windows', 'KW_CEUTA_MAPA_EOM', 'U_DEMO_LUCIA',
            'El mapa deja clarísimo por qué el Estrecho es un tapón geoestratégico: todo pasa por 14 kilómetros.',
            'U_DEMO_LUCIA', 'U_DEMO_LUCIA')
    ON CONFLICT (id) DO NOTHING
  `);

  const count = (await db.execute(sql`SELECT count(*)::int AS n FROM graph_windows WHERE graph_id = ${GRAPH_ID}`)).rows[0] as any;
  console.log(`Grafo "${GRAPH_ID}" sembrado con ${count.n} ventanas, ${EDGES.length} aristas, ${demoRatings.length} valoraciones.`);
  console.log('Creador: Eugenio García-Calderón Huerta. Contenido IA marcado como pendiente de revisión.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
