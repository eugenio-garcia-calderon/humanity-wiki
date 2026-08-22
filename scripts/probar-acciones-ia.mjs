#!/usr/bin/env node
// ============================================================================
// LAS ACCIONES DE LA IA, PROBADAS DE VERDAD (2026-08-22)
// ============================================================================
//     node scripts/probar-acciones-ia.mjs
//
// El asistente no solo contesta: CREA COSAS. Hay 19 acciones —una tarea, un
// proyecto, una publicación, una página, un evento, un reto…— y hasta hoy que
// siguieran funcionando se comprobaba probando unas cuantas a mano. Las que
// nadie probaba, nadie sabía si estaban vivas.
//
// ── LO QUE ESTA PRUEBA MIRA, Y LO QUE NO ───────────────────────────────────
// NO mira lo que la IA dice. Mira **si la fila está en la base de datos**.
//
// Esa distinción es el motivo de que esto exista. Los tres fallos que ya nos
// costaron caro fueron los tres del mismo tipo:
//   · «ya te he fijado esa tarea» — y no había ninguna tarea.
//   · «he organizado las carpetas» — sin una sola prueba de que hubiera hecho nada.
//   · una tarea guardada en el grupo equivocado, en silencio, porque el código
//     caía al primer grupo de la lista cuando no encontraba el pedido.
// Los tres los encontró una persona mirando a mano. Una prueba que se
// conformara con leer la respuesta habría dado los tres por buenos.
//
// TAMPOCO llama al modelo. Se le entrega a la plataforma la acción ya
// propuesta, exactamente como cuando alguien pulsa «aceptar», y se comprueba
// qué pasa. Pasar por el modelo costaría dinero en cada ejecución y haría que
// la prueba fallara unas veces sí y otras no según lo que contestara — una
// prueba que falla sola deja de leerse a la semana.
//
// ── SOLO EN LOCAL ──────────────────────────────────────────────────────────
// Crea un usuario y una sesión de prueba, escribe filas de verdad y las borra
// al terminar. Contra producción no se ejecuta: se planta si detecta que la
// base de datos no es la de desarrollo.
import pg from 'pg';
import crypto from 'node:crypto';

const BASE = process.env.URL_PRUEBAS || 'http://localhost:3000';
const MARCA = 'ZZZ prueba acciones';

// ── Con qué base de datos habla ────────────────────────────────────────────
const conf = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'evolucion_humanidad',
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    };
if (!/localhost|127\.0\.0\.1/.test(conf.connectionString || conf.host || '')) {
  console.error('Esto solo se ejecuta contra la base de datos LOCAL. Escribe y borra filas de verdad.');
  process.exit(1);
}
const db = new pg.Client(conf);

const hashClave = (clave) => {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(clave, sal, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${sal.toString('hex')}$${h.toString('hex')}`;
};

// ── Qué se prueba de cada acción ───────────────────────────────────────────
// `params` es lo que mandaría la IA. `nivel` es el rol con el que se ejecuta.
// Los que necesitan algo que ya exista (un reto para colgarle una causa, una
// tarea para actualizarla) se rellenan en la preparación.
const CASOS = [
  { tipo: 'CREATE_PUBLICATION', nivel: 1, params: { title: `${MARCA} publicación`, body: 'Un cuerpo cualquiera.' } },
  { tipo: 'CREATE_PROYECTO',    nivel: 1, params: { titulo: `${MARCA} proyecto`, descripcion: 'Para la prueba.' } },
  { tipo: 'CREATE_PAGINA',      nivel: 1, params: { titulo: `${MARCA} página`, contenido: 'Texto de prueba.' } },
  // `inicio` en ISO con hora, que es lo que la instrucción le pide al modelo.
  // La primera versión de esta prueba mandaba «fecha» y «hora» y fallaba: el
  // fallo era MÍO, no de la plataforma. Queda escrito porque el nombre del
  // campo es justo lo que esta prueba tiene que fijar.
  { tipo: 'CREATE_EVENTO',      nivel: 1, params: { titulo: `${MARCA} evento`, inicio: '2026-12-01T10:00:00+01:00' } },
  { tipo: 'CREATE_KNOWLEDGE_GRAPH', nivel: 1, params: { title: `${MARCA} grafo`, description: 'Prueba.' } },
  { tipo: 'CREATE_MAP',         nivel: 1, params: { title: `${MARCA} mapa`, description: 'Prueba.' } },
  { tipo: 'CREATE_TAREA',       nivel: 1, params: { titulo: `${MARCA} tarea` } },
  { tipo: 'CREATE_CHALLENGE',   nivel: 2, params: { title: `${MARCA} reto`, description: 'Prueba.' } },
  { tipo: 'CREATE_SOLUTION',    nivel: 2, params: { title: `${MARCA} solución`, description: 'Prueba.' } },
  { tipo: 'CREATE_PRODUCT',     nivel: 2, params: { name: `${MARCA} producto`, description: 'Prueba.', price_cents: 1000 } },
  { tipo: 'CREATE_DEMAND',      nivel: 2, params: { title: `${MARCA} demanda`, description: 'Prueba.' } },
  { tipo: 'CREATE_NEED',        nivel: 2, params: { title: `${MARCA} necesidad`, description: 'Prueba.' } },
];

let pasan = 0, fallan = 0;
const fallos = [];

const bien = (t, extra = '') => { pasan++; console.log(`  ✓ ${t}${extra ? '  ' + extra : ''}`); };
const mal = (t, por) => { fallan++; fallos.push(`${t}: ${por}`); console.log(`  ✗ ${t}\n      ${por}`); };

await db.connect();
let usuario = null, token = null;
try {
  // ── Preparación: un usuario y una sesión de prueba, marcados ────────────
  usuario = 'U_TEST_' + crypto.randomBytes(3).toString('hex').toUpperCase();
  token = 'devverif-acciones-' + crypto.randomBytes(4).toString('hex');
  await db.query(
    `INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, created_by)
     VALUES ($1, $2, 'Prueba Acciones', 'Prueba Acciones', $3, 4, true, $1)`,
    [usuario, `${usuario.toLowerCase()}@prueba.local`, hashClave(crypto.randomBytes(8).toString('hex'))],
  );
  await db.query(
    `INSERT INTO sessions (token, user_id, expires_at, user_agent)
     VALUES ($1, $2, now() + interval '1 hour', 'claude-dev-verificacion')`,
    [token, usuario],
  );
  console.log(`\nUsuario de prueba ${usuario} creado (se borra al terminar).\n`);

  /** Propone una acción y la acepta, como cuando alguien pulsa «aceptar». */
  const ejecutar = async (tipo, params, nivel) => {
    await db.query('UPDATE users SET role_level = $2 WHERE id = $1', [usuario, nivel]);
    const { rows } = await db.query(
      `INSERT INTO ai_proposed_actions (user_id, action_type, params, status)
       VALUES ($1, $2, $3::jsonb, 'propuesta') RETURNING id`,
      [usuario, tipo, JSON.stringify(params)],
    );
    const r = await fetch(`${BASE}/api/ai/actions/${rows[0].id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `rh_session=${token}` },
      body: JSON.stringify({ decision: 'aceptar' }),
    });
    return { estado: r.status, cuerpo: await r.json().catch(() => ({})) };
  };

  /** ¿Existe DE VERDAD la fila que dice haber creado? */
  const existe = async (tabla, id) => {
    if (!tabla || !id) return false;
    const { rows } = await db.query(`SELECT 1 FROM ${tabla} WHERE id = $1`, [id]);
    return rows.length > 0;
  };

  const TABLA = {
    CREATE_PUBLICATION: 'publications', CREATE_PROYECTO: 'proyectos',
    CREATE_PAGINA: 'knowledge_windows', CREATE_EVENTO: 'eventos',
    CREATE_KNOWLEDGE_GRAPH: 'knowledge_graphs', CREATE_MAP: 'user_maps',
    CREATE_TAREA: 'roadmap_items', CREATE_CHALLENGE: 'challenges',
    CREATE_SOLUTION: 'solutions', CREATE_PRODUCT: 'products',
    CREATE_DEMAND: 'demands', CREATE_NEED: 'needs',
  };

  console.log('── Cada acción crea lo que dice crear ──');
  for (const c of CASOS) {
    const { estado, cuerpo } = await ejecutar(c.tipo, c.params, c.nivel);
    if (estado !== 200) { mal(c.tipo, `la plataforma respondió ${estado}: ${cuerpo.error || ''}`); continue; }
    if (cuerpo.ok !== true) { mal(c.tipo, `no se ejecutó (status «${cuerpo.status}»): ${cuerpo.error || 'sin motivo'}`); continue; }
    // Y EL ESTADO TIENE QUE DECIR «ejecutada». Parece redundante con `ok` y no
    // lo es: la pantalla pinta en verde por este campo, y durante un tiempo dos
    // acciones que sí se ejecutaban lo devolvían pisado con «borrador» y
    // «publicado» y salían en gris, como si no hubiera pasado nada.
    if (cuerpo.status !== 'ejecutada') { mal(c.tipo, `se ejecutó pero el estado dice «${cuerpo.status}»: la pantalla lo pintará como si no`); continue; }
    const id = cuerpo.entityId;
    if (!id) { mal(c.tipo, 'dice que se ejecutó pero no devuelve el identificador de lo creado'); continue; }
    if (!(await existe(TABLA[c.tipo], id))) { mal(c.tipo, `dice haber creado ${id} y esa fila NO está en ${TABLA[c.tipo]}`); continue; }
    bien(c.tipo, `→ ${id}`);
  }

  // ── Y lo que tiene que FALLAR, que es la otra mitad ───────────────────
  console.log('\n── Lo que no se puede hacer, no se hace ──');

  // ══ EL FALLO DE AGOSTO, VIGILADO ═══════════════════════════════════════
  // Pedir una etiqueta que no existe hacía que la tarea cayera en la primera
  // del tablero EN SILENCIO, y una tarea de ingeniería archivada como
  // «Producto» desaparece del filtro donde la busca quien la necesita.
  //
  // Hoy la plataforma la coloca igualmente —perder la tarea sería peor— pero
  // AVISA de dónde la ha dejado. Lo que esta prueba fija no es que se niegue:
  // es que **nunca lo haga callando**. Si algún día el aviso desaparece, aquí
  // salta.
  const conProyecto = await db.query(
    `SELECT id FROM proyectos WHERE creador_user_id = $1 AND titulo LIKE $2 LIMIT 1`,
    [usuario, `${MARCA}%`],
  );
  if (conProyecto.rows.length) {
    const { cuerpo } = await ejecutar('CREATE_TAREA', {
      titulo: `${MARCA} grupo inventado`,
      proyecto: conProyecto.rows[0].id,
      grupo: 'UnGrupoQueNoExisteEnAbsoluto',
    }, 1);
    if (cuerpo.ok !== true) {
      bien('grupo inexistente', 'se niega');
    } else if (!cuerpo.aviso) {
      const id = cuerpo.entityId;
      const g = await db.query('SELECT grupo FROM roadmap_items WHERE id = $1', [id]);
      mal('grupo inexistente', `la guardó en «${g.rows[0]?.grupo}» SIN AVISAR — es el fallo de agosto otra vez`);
    } else if (!cuerpo.guardado?.grupo) {
      mal('grupo inexistente', 'avisa, pero no dice en qué etiqueta la ha dejado');
    } else {
      bien('grupo inexistente', `avisa y dice dónde la deja: «${cuerpo.guardado.grupo}»`);
    }
  }

  // Un proyecto que no es tuyo no vale como destino.
  const { cuerpo: ajeno } = await ejecutar('CREATE_TAREA', { titulo: `${MARCA} ajena`, proyecto: 'NO_EXISTE_ESTE_PROYECTO' }, 1);
  if (ajeno.ok === true) mal('proyecto inexistente', 'creó la tarea igualmente');
  else bien('proyecto inexistente', 'se niega');

  // Sin título no hay tarea.
  const { cuerpo: sinTitulo } = await ejecutar('CREATE_TAREA', { titulo: '   ' }, 1);
  if (sinTitulo.ok === true) mal('tarea sin título', 'la creó vacía');
  else bien('tarea sin título', 'se niega');

  // El permiso se comprueba AL EJECUTAR, no solo al proponer.
  const { estado: sinNivel } = await ejecutar('CREATE_CHALLENGE', { title: `${MARCA} sin permiso` }, 1);
  if (sinNivel === 403) bien('reto sin nivel suficiente', 'lo rechaza con 403');
  else mal('reto sin nivel suficiente', `respondió ${sinNivel} en vez de 403`);

} finally {
  // ── Limpieza: no se queda nada ─────────────────────────────────────────
  const borrar = [
    ['roadmap_items', 'titulo'], ['publications', 'title'], ['knowledge_windows', 'title'],
    ['knowledge_graphs', 'title'], ['user_maps', 'title'], ['challenges', 'title'],
    ['solutions', 'title'], ['products', 'name'], ['demands', 'title'], ['needs', 'title'],
    ['eventos', 'titulo'], ['proyectos', 'titulo'],
  ];
  for (const [tabla, campo] of borrar) {
    await db.query(`DELETE FROM ${tabla} WHERE ${campo} LIKE $1`, [`${MARCA}%`]).catch(() => {});
  }
  if (usuario) {
    await db.query('DELETE FROM ai_proposed_actions WHERE user_id = $1', [usuario]).catch(() => {});
    await db.query('DELETE FROM sessions WHERE user_id = $1', [usuario]).catch(() => {});
    await db.query('DELETE FROM users WHERE id = $1', [usuario]).catch(() => {});
  }
  await db.end();
}

console.log(`\n${pasan} bien · ${fallan} mal`);
if (fallan) {
  console.log('\nLo que hay que mirar:');
  for (const f of fallos) console.log('  · ' + f);
}
process.exit(fallan ? 1 : 0);
