// ============================================================================
// Grafo: «Teoría de juegos del Estrecho de Gibraltar» (2026-08-06)
// ============================================================================
// Segunda VISTA del reto R021 (Presión sobre la frontera sur / integridad
// territorial de Ceuta), pedida por el usuario en su prompt (PDF): un ÁRBOL
// con una línea divisoria — por encima del suelo, las RAMAS: los hechos
// observables (incidentes, migración, Schengen, soberanía, militar, rutas);
// por debajo, las RAÍCES: los intereses estratégicos de cada actor (España,
// Marruecos, Reino Unido, EEUU, UE, China) con su matriz de teoría de juegos
// (estrategia → respuestas previsibles → resultado esperado).
// Hechos y hipótesis van SEPARADOS y etiquetados: las ramas citan hechos
// verificables; las raíces son interpretación estratégica marcada como tal.
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
const GRAPH_ID = 'KG_TJUEGOS_GIB';
const CHALLENGE = 'R021';   // Presión sobre la frontera sur
const T_CEUTA = 'T032';

const W = {
  // Ramas (hechos observables) — arriba
  R_INCIDENTES: 'KW_TJ_INCIDENTES',
  R_MIGRACION: 'KW_TJ_MIGRACION',
  R_SCHENGEN: 'KW_TJ_SCHENGEN',
  R_SOBERANIA: 'KW_TJ_SOBERANIA',
  R_MILITAR: 'KW_TJ_MILITAR',
  R_RUTAS: 'KW_TJ_RUTAS',
  // Raíces (intereses estratégicos) — abajo
  A_ESPANA: 'KW_TJ_ESPANA',
  A_MARRUECOS: 'KW_TJ_MARRUECOS',
  A_UK: 'KW_TJ_UK',
  A_EEUU: 'KW_TJ_EEUU',
  A_UE: 'KW_TJ_UE',
  A_CHINA: 'KW_TJ_CHINA',
  // Lectura
  M_COMO: 'KW_TJ_COMO_LEER',
  M_PREGUNTAS: 'KW_TJ_PREGUNTAS',
};

const WINDOWS: any[] = [
  // ------------------------------------------------ RAMAS (hechos, arriba)
  {
    id: W.R_INCIDENTES, title: 'Incidentes diplomáticos', kind: 'publicacion', creator: IA, ia: true, x: -1580, y: -720,
    config: {
      body: 'HECHO OBSERVABLE — En mayo de 2021, tras acoger España al líder del Frente Polisario (caso Ghali), más de 8.000 personas entraron en Ceuta en 48 horas mientras la gendarmería marroquí relajaba la vigilancia. Marruecos retiró a su embajadora durante casi un año. En 2022 España cambió su posición histórica sobre el Sáhara Occidental y la relación se «normalizó». Las aduanas comerciales de Ceuta y Melilla, cerradas unilateralmente por Marruecos en 2018, solo reabrieron parcialmente años después.',
    },
  },
  {
    id: W.R_MIGRACION, title: 'Presión migratoria sobre Ceuta', kind: 'publicacion', creator: IA, ia: true, x: -950, y: -1050,
    config: {
      body: 'HECHO OBSERVABLE — Ceuta concentra episodios recurrentes de entradas por la valla y a nado desde Benzú y el Tarajal. La cooperación de Marruecos en el control fronterizo fluctúa y se intensifica o relaja coincidiendo con ciclos diplomáticos. La gestión de menores no acompañados tensiona los servicios de la ciudad. La UE financia a Marruecos como gendarme migratorio (más de 500 M€ desde 2007 en programas de gestión fronteriza).',
    },
  },
  {
    id: W.R_SCHENGEN, title: 'Debates sobre Schengen y fronteras', kind: 'publicacion', creator: IA, ia: true, x: -180, y: -1180,
    config: {
      body: 'HECHO OBSERVABLE — Ceuta y Melilla tienen un régimen especial: están en Schengen con controles añadidos y fuera de la unión aduanera hasta el acuerdo de integración aduanera iniciado en 2023-2025. El régimen de visado local con las provincias marroquíes vecinas (suprimido de facto al cerrar la frontera en 2020) es pieza permanente de la negociación bilateral.',
    },
  },
  {
    id: W.R_SOBERANIA, title: 'Reclamaciones de soberanía', kind: 'publicacion', creator: IA, ia: true, x: 620, y: -1050,
    config: {
      body: 'HECHO OBSERVABLE — Marruecos reclama Ceuta y Melilla desde su independencia (1956) y no reconoce las aguas españolas adyacentes; en 2020 delimitó por ley espacios marítimos que solapan con ellas. España las considera parte integral del Estado (Ceuta, española desde 1580/1668). La ONU NO las incluye en su lista de territorios no autónomos pendientes de descolonización — a diferencia de Gibraltar, que sí figura.',
    },
  },
  {
    id: W.R_MILITAR, title: 'Cooperación militar y acuerdos', kind: 'publicacion', creator: IA, ia: true, x: 1350, y: -720,
    config: {
      body: 'HECHO OBSERVABLE — Marruecos es «aliado mayor no-OTAN» de EEUU (2004) y acoge el mayor ejercicio militar de África (African Lion). España es miembro de la OTAN y cede a EEUU la base naval de Rota, llave del Estrecho — pero el Tratado de Washington no garantiza explícitamente la cobertura del artículo 5 para Ceuta y Melilla, un debate recurrente. Reino Unido mantiene su base naval en Gibraltar.',
    },
  },
  {
    id: W.R_RUTAS, title: 'Control de rutas comerciales', kind: 'publicacion', creator: IA, ia: true, x: 1850, y: -260,
    config: {
      body: 'HECHO OBSERVABLE — Por el Estrecho de Gibraltar pasa en torno al 10% del comercio marítimo mundial y buena parte del tráfico Asia-Europa vía Suez. Tanger Med es ya el primer puerto de contenedores del Mediterráneo; Algeciras, el primero de España. COSCO (China) opera terminales en Valencia y Bilbao. Quien controla los accesos al Estrecho controla un cuello de botella del comercio global.',
    },
  },

  // --------------------------------------------- RAÍCES (hipótesis, abajo)
  {
    id: W.A_ESPANA, title: 'Raíz España: soberanía y statu quo', kind: 'ficha', creator: IA, ia: true, x: -1580, y: 560,
    config: {
      facts: [
        { label: 'Objetivos', value: 'Soberanía, aguas, control del Estrecho, estabilidad' },
        { label: 'Recursos', value: 'OTAN, UE, Armada, control efectivo desde s. XVI' },
        { label: 'Líneas rojas', value: 'Cualquier cesión de soberanía' },
        { label: 'Aliados', value: 'UE (parcial), OTAN (con ambigüedad art. 5)' },
        { label: 'Dependencias', value: 'Cooperación migratoria y policial de Marruecos' },
        { label: 'Estrategia dominante', value: 'Statu quo + anclar Ceuta a la UE (aduana, fondos)' },
        { label: 'Si mueve, responden', value: 'Marruecos con presión migratoria y diplomática' },
        { label: 'Resultado esperado', value: 'Equilibrio tenso pero estable' },
        { label: 'Estatus', value: 'HIPÓTESIS ESTRATÉGICA' },
      ],
    },
  },
  {
    id: W.A_MARRUECOS, title: 'Raíz Marruecos: presión gradual', kind: 'ficha', creator: IA, ia: true, x: -950, y: 900,
    config: {
      facts: [
        { label: 'Objetivos', value: 'Reivindicación de Ceuta/Melilla, liderazgo regional' },
        { label: 'Recursos', value: 'Palanca migratoria, Tanger Med, apoyo de EEUU' },
        { label: 'Líneas rojas', value: 'Sáhara Occidental (prioridad absoluta)' },
        { label: 'Aliados', value: 'EEUU, Golfo, Israel (Acuerdos de Abraham)' },
        { label: 'Dependencias', value: 'Comercio con la UE, remesas, inversión' },
        { label: 'Estrategia dominante', value: 'Presión intermitente + precedente del Sáhara' },
        { label: 'Si mueve, responden', value: 'España/UE con concesiones económicas, no soberanía' },
        { label: 'Resultado esperado', value: 'Ganancias incrementales sin ruptura' },
        { label: 'Estatus', value: 'HIPÓTESIS ESTRATÉGICA' },
      ],
    },
  },
  {
    id: W.A_UK, title: 'Raíz Reino Unido: el espejo de Gibraltar', kind: 'ficha', creator: IA, ia: true, x: -180, y: 1060,
    config: {
      facts: [
        { label: 'Objetivos', value: 'Conservar Gibraltar, libertad de navegación' },
        { label: 'Recursos', value: 'Base naval y aérea, inteligencia (GCHQ), OTAN' },
        { label: 'Líneas rojas', value: 'Soberanía de Gibraltar' },
        { label: 'Paradoja', value: 'Apoyar reclamaciones sobre Ceuta sentaría precedente contra Gibraltar' },
        { label: 'Estrategia dominante', value: 'Statu quo en TODO el Estrecho' },
        { label: 'Si mueve, responden', value: 'España reactivaría el contencioso de Gibraltar' },
        { label: 'Resultado esperado', value: 'Silencio interesado y equilibrio' },
        { label: 'Estatus', value: 'HIPÓTESIS ESTRATÉGICA' },
      ],
    },
  },
  {
    id: W.A_EEUU, title: 'Raíz EEUU: el Estrecho ya es suyo (de facto)', kind: 'ficha', creator: IA, ia: true, x: 620, y: 900,
    config: {
      facts: [
        { label: 'Objetivos', value: 'Flanco sur OTAN estable, tránsito naval, contener a China/Rusia' },
        { label: 'Recursos', value: 'Rota (VI Flota), alianza con Marruecos Y con España' },
        { label: 'Ambigüedad', value: 'Reconoció el Sáhara marroquí (2020); neutral sobre Ceuta' },
        { label: 'Hecho clave', value: 'Ya tiene acceso al Estrecho vía Rota + aliados — no necesita Ceuta' },
        { label: 'Estrategia dominante', value: 'Doble alianza: no elegir entre Madrid y Rabat' },
        { label: 'Si mueve, responden', value: 'El perdedor se acercaría a Rusia o China' },
        { label: 'Resultado esperado', value: 'Ambigüedad permanente y rentable' },
        { label: 'Estatus', value: 'HIPÓTESIS ESTRATÉGICA' },
      ],
    },
  },
  {
    id: W.A_UE, title: 'Raíz Unión Europea: la frontera externalizada', kind: 'ficha', creator: IA, ia: true, x: 1350, y: 560,
    config: {
      facts: [
        { label: 'Objetivos', value: 'Frontera exterior segura, Schengen, menos llegadas' },
        { label: 'Recursos', value: 'Fondos, acuerdos comerciales, Frontex' },
        { label: 'Líneas rojas', value: 'Integridad territorial de un Estado miembro (art. 4 TUE)' },
        { label: 'Dependencias', value: 'Marruecos como gendarme migratorio' },
        { label: 'Estrategia dominante', value: 'Pagar la contención migratoria fuera de casa' },
        { label: 'Si mueve, responden', value: 'Marruecos regula el grifo migratorio como respuesta' },
        { label: 'Resultado esperado', value: 'Dependencia creciente del socio marroquí' },
        { label: 'Estatus', value: 'HIPÓTESIS ESTRATÉGICA' },
      ],
    },
  },
  {
    id: W.A_CHINA, title: 'Raíz China: neutralidad con puertos', kind: 'ficha', creator: IA, ia: true, x: 1850, y: 200,
    config: {
      facts: [
        { label: 'Objetivos', value: 'Rutas logísticas Asia-Europa fluidas y baratas' },
        { label: 'Recursos', value: 'COSCO (Valencia, Bilbao), inversión en Tanger Med y su zona' },
        { label: 'Líneas rojas', value: 'Interrupción del tránsito por el Estrecho' },
        { label: 'Estrategia dominante', value: 'Presencia económica sin implicación política' },
        { label: 'Si mueve, responden', value: 'EEUU vetaría más presencia china en puertos OTAN' },
        { label: 'Resultado esperado', value: 'Neutralidad interesada mientras fluya el comercio' },
        { label: 'Estatus', value: 'HIPÓTESIS ESTRATÉGICA' },
      ],
    },
  },

  // -------------------------------------------------- LECTURA (en el suelo)
  {
    id: W.M_COMO, title: 'Cómo leer este árbol', kind: 'texto', creator: EUGENIO, ia: false, x: -2200, y: -170,
    config: {
      body: 'Por ENCIMA del suelo están las RAMAS: acontecimientos observables y verificables — lo que sale en las noticias. Por DEBAJO están las RAÍCES: los intereses estratégicos de cada actor, que alimentan lo que ocurre arriba. Las ramas citan HECHOS; las raíces son HIPÓTESIS de teoría de juegos, marcadas como tales. Sigue las flechas que cruzan el suelo: cada acontecimiento visible nace de una o varias raíces.',
    },
  },
  {
    id: W.M_PREGUNTAS, title: 'Las preguntas del análisis', kind: 'texto', creator: EUGENIO, ia: false, x: 2350, y: -600,
    config: {
      body: '¿Qué incentivos tiene cada actor? · ¿Qué recursos posee? · ¿Qué perdería si cambia el statu quo? · ¿Qué alianzas condicionan sus decisiones? · ¿Qué escenarios alternativos son posibles? · ¿Qué hipótesis cuentan con mayor evidencia? — La conclusión provisional del análisis: NINGÚN actor gana cambiando el statu quo por la fuerza; todos los incentivos apuntan a la presión gradual y a las ganancias incrementales.',
    },
  },
];

// Aristas del centro (el árbol) — ramas como DATO (azul), raíces como CAUSA (amarillo).
const CENTER_EDGES: any[] = [
  { to: W.R_INCIDENTES, relation: 'dato', label: 'incidentes' },
  { to: W.R_MIGRACION, relation: 'dato', label: 'migración' },
  { to: W.R_SCHENGEN, relation: 'dato', label: 'Schengen' },
  { to: W.R_SOBERANIA, relation: 'dato', label: 'soberanía' },
  { to: W.R_MILITAR, relation: 'dato', label: 'militar' },
  { to: W.R_RUTAS, relation: 'dato', label: 'rutas' },
  { to: W.A_ESPANA, relation: 'causa', label: 'España' },
  { to: W.A_MARRUECOS, relation: 'causa', label: 'Marruecos' },
  { to: W.A_UK, relation: 'causa', label: 'Reino Unido' },
  { to: W.A_EEUU, relation: 'causa', label: 'EEUU' },
  { to: W.A_UE, relation: 'causa', label: 'UE' },
  { to: W.A_CHINA, relation: 'causa', label: 'China' },
  { to: W.M_COMO, relation: 'contexto', label: 'cómo leer' },
  { to: W.M_PREGUNTAS, relation: 'contexto', label: 'preguntas' },
];

// Las raíces alimentan las ramas: flechas que CRUZAN el suelo.
const CROSS_EDGES: any[] = [
  { from: W.A_MARRUECOS, to: W.R_MIGRACION, relation: 'causa', label: 'la palanca', description: 'La presión migratoria sobre Ceuta funciona como palanca negociadora: se intensifica o relaja al ritmo de la agenda diplomática. Mayo de 2021 es el caso de estudio.' },
  { from: W.A_MARRUECOS, to: W.R_SOBERANIA, relation: 'causa', label: 'la reivindicación', description: 'La reclamación formal de soberanía es la raíz de los contenciosos sobre aguas y espacios marítimos delimitados en 2020.' },
  { from: W.A_ESPANA, to: W.R_SCHENGEN, relation: 'causa', label: 'anclar a Europa', description: 'La integración aduanera y el estatus europeo de Ceuta son la estrategia española de blindaje: cuanto más UE es Ceuta, más cara es cualquier alternativa.' },
  { from: W.A_EEUU, to: W.R_MILITAR, relation: 'causa', label: 'la doble alianza', description: 'La arquitectura militar del Estrecho (Rota + African Lion + estatus de aliado mayor no-OTAN de Marruecos) es la expresión visible de la estrategia estadounidense de no elegir bando.' },
  { from: W.A_CHINA, to: W.R_RUTAS, relation: 'causa', label: 'el comercio', description: 'La inversión china en puertos del Estrecho (terminales COSCO, zona de Tanger Med) persigue asegurar la ruta, no controlarla políticamente.' },
  { from: W.A_UE, to: W.R_MIGRACION, relation: 'matiza', label: 'el gendarme pagado', description: 'La financiación europea del control fronterizo marroquí matiza la lectura bilateral España-Marruecos: la palanca migratoria también presiona (y financia) a Bruselas.' },
  { from: W.A_UK, to: W.R_SOBERANIA, relation: 'matiza', label: 'el espejo', description: 'Gibraltar matiza todo el tablero: la ONU lo lista como territorio a descolonizar (a Ceuta no), y cualquier precedente sobre una plaza repercute en la otra orilla.' },
];

async function main() {
  console.log('Sembrando grafo «Teoría de juegos del Estrecho de Gibraltar»…');

  // Borrado idempotente
  await db.execute(sql`DELETE FROM graph_edges WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM graph_entity_links WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM graph_windows WHERE graph_id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM knowledge_graphs WHERE id = ${GRAPH_ID}`);
  await db.execute(sql`DELETE FROM knowledge_windows WHERE id LIKE 'KW_TJ_%'`);

  await db.execute(sql`
    INSERT INTO knowledge_graphs (id, title, slug, description, center, creator_user_id, trigger_keywords, status, is_ai_generated, created_by, updated_by)
    VALUES (${GRAPH_ID}, 'Teoría de juegos del Estrecho de Gibraltar', 'teoria-juegos-gibraltar',
            'El conflicto de Ceuta como un árbol: por encima del suelo, los acontecimientos visibles; por debajo, las raíces — los intereses estratégicos de España, Marruecos, Reino Unido, EEUU, la UE y China, con la estrategia dominante y el resultado esperado de cada actor.',
            ${JSON.stringify({
              category: { label: 'El Estrecho', sublabel: 'Teoría de juegos', color: '#7c3aed' },
              variable: { label: 'Ceuta', sublabel: 'Territorio en juego' },
              vista: 'Teoría de juegos',
              ground: { above: 'ACONTECIMIENTOS — lo que se ve', below: 'INTERESES ESTRATÉGICOS — las raíces' },
            })}::jsonb,
            ${EUGENIO},
            ${JSON.stringify(['teoria de juegos', 'estrecho de gibraltar', 'geopolitica ceuta', 'marruecos estrategia', 'estrecho', 'actores ceuta', 'intereses estrategicos'])}::jsonb,
            'publicado', false, ${EUGENIO}, ${EUGENIO})
  `);

  for (const w of WINDOWS) {
    await db.execute(sql`
      INSERT INTO knowledge_windows (id, title, kind, config, creator_user_id, is_ai_generated, created_by, updated_by)
      VALUES (${w.id}, ${w.title}, ${w.kind}, ${JSON.stringify(w.config)}::jsonb, ${w.creator}, ${w.ia}, ${w.creator}, ${w.creator})
    `);
    await db.execute(sql`
      INSERT INTO graph_windows (graph_id, window_id, x, y) VALUES (${GRAPH_ID}, ${w.id}, ${w.x}, ${w.y})
    `);
  }

  for (const e of CENTER_EDGES) {
    await db.execute(sql`
      INSERT INTO graph_edges (graph_id, from_window_id, to_window_id, relation, label, created_by)
      VALUES (${GRAPH_ID}, NULL, ${e.to}, ${e.relation}, ${e.label}, ${EUGENIO})
    `);
  }
  for (const e of CROSS_EDGES) {
    await db.execute(sql`
      INSERT INTO graph_edges (graph_id, from_window_id, to_window_id, relation, label, description, created_by)
      VALUES (${GRAPH_ID}, ${e.from}, ${e.to}, ${e.relation}, ${e.label}, ${e.description}, ${EUGENIO})
    `);
  }

  await db.execute(sql`
    INSERT INTO graph_entity_links (graph_id, entity_type, entity_id, relation)
    VALUES (${GRAPH_ID}, 'challenges', ${CHALLENGE}, 'trata_sobre'),
           (${GRAPH_ID}, 'territories', ${T_CEUTA}, 'afecta_a')
    ON CONFLICT DO NOTHING
  `);

  // La vista del grafo original de Ceuta, etiquetada (mismo reto, dos vistas).
  await db.execute(sql`
    UPDATE knowledge_graphs
    SET center = jsonb_set(coalesce(center, '{}'::jsonb), '{vista}', '"Cadena causal"')
    WHERE slug = 'ceuta-frontera-amenazada'
  `);

  console.log('Grafo de teoría de juegos sembrado: /grafos/teoria-juegos-gibraltar');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
