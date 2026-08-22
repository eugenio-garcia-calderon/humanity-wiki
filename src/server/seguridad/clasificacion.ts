// ============================================================================
// CUÁNTO IMPORTA CADA DATO, Y QUÉ PROTECCIÓN LE TOCA (2026-08-22)
// ============================================================================
// Eugenio: «vamos a generar capas de seguridad en base al nivel de relevancia
// de un dato o contenido para que no pueda ser corrompido».
//
// Proteger las 129 tablas al máximo no es más seguro: es más lento, más caro y,
// sobre todo, hace que nadie mire las alarmas. Proteger «lo importante» sin
// escribir qué es lo importante tampoco vale, porque cada persona entiende una
// cosa distinta y el día que hay que decidir deprisa se decide mal.
//
// Esta tabla es esa decisión, escrita.
//
// ── CUATRO PREGUNTAS DISTINTAS, NO UNA ─────────────────────────────────────
// Un solo número («este dato es crítico») junta cosas que no se protegen igual.
// Se separa en las dimensiones del ESQUEMA NACIONAL DE SEGURIDAD (RD 311/2022,
// Anexo I), que es además el marco que va a pedir cualquier administración
// española que use esto:
//
//   INTEGRIDAD        qué pasa si alguien lo CAMBIA
//   CONFIDENCIALIDAD  qué pasa si alguien lo LEE
//   TRAZABILIDAD      cuánto importa saber QUIÉN lo hizo y CUÁNDO
//   AUTENTICIDAD      cuánto importa que sea de QUIEN DICE SER, y de su fuente
//
// Que sean cuatro es lo que permite decir algo que un número solo no puede: los
// indicadores del bien común son **públicos** (confidencialidad BAJA) y a la vez
// lo más grave que se puede corromper de esta plataforma (integridad ALTA). Con
// una sola etiqueta, o se cifran sin motivo o se dejan sin proteger.
//
// No se incluye DISPONIBILIDAD, la quinta del ENS: va de que el servicio esté
// en pie, y esto va de que el dato no se pueda corromper. Son dos trabajos
// distintos y mezclarlos hace que no se haga ninguno.
//
// ── DE LA CLASIFICACIÓN SALE LA CAPA, NO AL REVÉS ──────────────────────────
// La capa (0 a 3) se CALCULA de las dimensiones. Nadie escribe «esto es capa 3»
// a mano: se dice cuánto importa y la capa sale sola. Así, subir la protección
// de algo obliga a justificar por qué importa más, que es la conversación buena.

export type Grado = 'BAJA' | 'MEDIA' | 'ALTA';

export interface Clase {
  tabla: string;
  integridad: Grado;
  confidencialidad: Grado;
  trazabilidad: Grado;
  autenticidad: Grado;
  /** En una frase: qué pasa si esto se corrompe. */
  porque: string;
  /** Se puede volver a calcular desde otra fuente. Perderlo cuesta tiempo, no
   *  verdad — y protegerlo como si fuera verdad es gastar en el sitio malo. */
  derivado?: boolean;
}

const c = (
  tabla: string, integridad: Grado, confidencialidad: Grado,
  trazabilidad: Grado, autenticidad: Grado, porque: string, derivado = false,
): Clase => ({ tabla, integridad, confidencialidad, trazabilidad, autenticidad, porque, derivado });

export const CLASIFICACION: Clase[] = [
  // ── QUIÉN ES QUIÉN, Y QUIÉN MANDA ─────────────────────────────────────────
  // Lo más grave que hay. Corromper esto no corrompe un dato: corrompe a la
  // persona que puede corromper todos los demás.
  c('users', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'un nivel de rol cambiado a mano convierte a cualquiera en administrador'),
  c('sessions', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'una fila insertada aquí ES entrar como esa persona, sin su contraseña'),
  c('password_resets', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'un testigo válido abre la cuenta de otro'),
  c('agentes_ia', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'las llaves de los programadores IA'),
  c('handles_reservados', 'ALTA', 'BAJA', 'MEDIA', 'ALTA', 'el nombre público con el que se conoce a alguien: cambiarlo es suplantarlo'),
  c('memberships', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'da acceso pagado; cambiarla es regalar o quitar lo que alguien compró'),

  // ── DINERO ────────────────────────────────────────────────────────────────
  c('transactions', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'movimientos de dinero real'),
  c('transaction_links', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'a qué corresponde cada cobro'),
  c('refunds', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'devoluciones de dinero real'),
  c('stripe_accounts', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'a qué cuenta bancaria va el dinero de un vendedor'),
  c('stripe_events', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'lo que Stripe dice que pasó; es la prueba de un cobro'),
  c('movimientos_puntos', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'el libro de los puntos, que se compran con dinero real'),
  c('supports', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'aportaciones económicas a un contenido o persona'),
  c('pedidos', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'lo que alguien ha comprado y a quién'),
  c('pedido_lineas', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'el detalle y el precio de cada compra'),
  c('reservas_stock', 'ALTA', 'BAJA', 'ALTA', 'MEDIA', 'compromete existencias que otro no podrá comprar'),
  c('presupuestos_proyecto', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'las cifras económicas de un proyecto real'),
  c('ai_usage_charges', 'ALTA', 'MEDIA', 'ALTA', 'MEDIA', 'el coste facturable del asistente; es una cuenta que alguien paga'),

  // ── EL RASTRO, Y EL REGISTRO DEL RASTRO ───────────────────────────────────
  // Si el rastro se puede editar, no es un rastro: es una redacción.
  c('entity_history', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'lo que había antes de cada cambio; quien altera un dato querrá alterar esto'),
  c('registro_sellado', 'ALTA', 'MEDIA', 'ALTA', 'ALTA', 'el registro sellado; su integridad es lo único que hace verificable todo lo demás'),
  c('registro_anclajes', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'los resúmenes diarios publicados fuera: la prueba que enseñaríamos a un auditor'),
  // ── LO QUE NACIÓ EL 2026-08-22 POR LA TARDE ───────────────────────────────
  c('intentos_fallidos', 'ALTA', 'ALTA', 'ALTA', 'ALTA', 'el rastro de quién ha probado a entrar y desde dónde: es la prueba de un ataque y a la vez dice dónde vive la gente'),
  c('llamadas', 'MEDIA', 'ALTA', 'ALTA', 'MEDIA', 'quién ha llamado a quién y cuándo: cambia poco si se toca, dice muchísimo si se lee'),
  c('textos_editables', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'los textos de las páginas públicas: es lo que la plataforma dice de sí misma'),
  c('tokenomics_precios', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'a qué precio se venden los puntos; cambiarlo cambia lo que vale el dinero de dentro'),
  c('schema_migrations', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'qué forma tiene la base de datos; mentir aquí hace que una migración se salte'),

  // ── EL BIEN COMÚN MEDIDO ──────────────────────────────────────────────────
  // Públicos y críticos a la vez, que es justo lo que una etiqueta sola no sabe
  // decir. Un gobierno que decide con un indicador corrompido decide mal, y no
  // hay forma de que se entere.
  c('territories', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'la geografía sobre la que se cuelga todo lo demás'),
  c('indicators', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'la definición de lo que se mide, y su metodología'),
  c('indicator_observations', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'los datos medidos, con su fuente: lo más grave que se puede corromper aquí'),
  c('metrics', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'las métricas y su unidad'),
  c('metric_observations', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'medidas reales de estaciones reales'),
  c('markers', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'los marcadores del mapa'),
  c('marker_observations', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'sus observaciones'),
  c('measurement_stations', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'de dónde sale cada medida'),
  c('objectives', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'los objetivos del bien común: la estructura del producto entero'),
  c('veracidad_fuentes', 'ALTA', 'BAJA', 'ALTA', 'ALTA', 'de dónde sale cada afirmación; corromper la fuente corrompe todo lo que cuelga'),

  // ── CONOCIMIENTO COLABORATIVO ─────────────────────────────────────────────
  // Lo escribe gente, se revisa entre gente y se puede discutir. Corromperlo es
  // grave; no lo es tanto como corromper una medición con fuente.
  c('challenges', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'los retos del bien común: de aquí cuelgan causas, soluciones e iniciativas'),
  c('causes', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las causas de un reto'),
  c('solutions', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las soluciones propuestas'),
  c('needs', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las necesidades'),
  c('demands', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las demandas'),
  c('products', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'los productos del mercado'),
  c('organizations', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las organizaciones'),
  c('initiatives', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las iniciativas'),
  c('initiative_results', 'MEDIA', 'BAJA', 'ALTA', 'ALTA', 'los resultados que dice haber conseguido una iniciativa'),
  c('initiative_participants', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'quién participa en qué'),
  c('projects', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'proyectos (modelo antiguo)'),
  c('proyectos', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'los proyectos de la gente y su contenido'),
  c('success_cases', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'casos de éxito'),
  c('knowledge_graphs', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'los grafos de conocimiento'),
  c('knowledge_windows', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'sus ventanas y su contenido'),
  c('graph_windows', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'ventanas del grafo'),
  c('graph_edges', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'las aristas: cambiar una cambia lo que el grafo AFIRMA'),
  c('graph_entity_links', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'qué ventana apunta a qué entidad'),
  c('publications', 'MEDIA', 'MEDIA', 'ALTA', 'ALTA', 'lo que alguien publica con su nombre delante'),
  c('publication_links', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'a qué enlaza una publicación'),
  c('publicacion_meta', 'BAJA', 'BAJA', 'BAJA', 'BAJA', 'contadores y metadatos de una publicación'),
  c('content', 'MEDIA', 'MEDIA', 'MEDIA', 'MEDIA', 'contenido genérico'),
  c('argumentos', 'MEDIA', 'BAJA', 'ALTA', 'ALTA', 'los argumentos de un debate, con su autor'),
  c('debates', 'MEDIA', 'BAJA', 'ALTA', 'MEDIA', 'los debates'),
  c('page_texts', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'los textos de las páginas públicas: es la voz de la plataforma'),
  c('roadmap_items', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'el plan de trabajo publicado'),
  c('incidencias', 'MEDIA', 'MEDIA', 'ALTA', 'ALTA', 'el hormiguero: quién pidió qué y quién lo contestó'),
  c('ai_proposed_actions', 'MEDIA', 'MEDIA', 'ALTA', 'ALTA', 'lo que la IA propone hacer y quién lo aprobó'),

  // ── LAS UNIONES ───────────────────────────────────────────────────────────
  // Una tabla de unión parece poca cosa y es donde vive el SIGNIFICADO: cambiar
  // una fila mueve un reto de un territorio a otro sin tocar ninguno de los dos.
  c('challenge_causes', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'qué causa pertenece a qué reto'),
  c('challenge_indicators', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'qué indicador mide qué reto'),
  c('challenge_markers', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión reto-marcador'),
  c('challenge_metrics', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión reto-métrica'),
  c('challenge_objectives', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'a qué objetivo sirve un reto'),
  c('challenge_solutions', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'qué solución responde a qué reto'),
  c('challenge_territories', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'dónde ocurre un reto'),
  c('solution_causes', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'qué causa ataca una solución'),
  c('solution_needs', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'qué necesita una solución'),
  c('need_territories', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'dónde hace falta algo'),
  c('demand_challenges', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión demanda-reto'),
  c('demand_indicators', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión demanda-indicador'),
  c('demand_needs', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión demanda-necesidad'),
  c('demand_products', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión demanda-producto'),
  c('demand_territories', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión demanda-territorio'),
  c('product_challenges', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión producto-reto'),
  c('product_indicators', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión producto-indicador'),
  c('product_needs', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión producto-necesidad'),
  c('product_objectives', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión producto-objetivo'),
  c('product_solutions', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión producto-solución'),
  c('product_territories', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión producto-territorio'),
  c('organization_objectives', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión organización-objetivo'),
  c('organization_solutions', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión organización-solución'),
  c('project_challenges', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión proyecto-reto'),
  c('project_objectives', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión proyecto-objetivo'),
  c('project_organizations', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión proyecto-organización'),
  c('project_solutions', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión proyecto-solución'),
  c('initiative_challenges', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-reto'),
  c('initiative_demands', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-demanda'),
  c('initiative_objectives', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-objetivo'),
  c('initiative_organizations', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-organización'),
  c('initiative_products', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-producto'),
  c('initiative_solutions', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-solución'),
  c('initiative_territories', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión iniciativa-territorio'),
  c('success_case_initiatives', 'MEDIA', 'BAJA', 'MEDIA', 'MEDIA', 'unión caso de éxito-iniciativa'),
  c('carpeta_publicaciones', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'qué publicación está en qué carpeta'),

  // ── LO DE CADA PERSONA ────────────────────────────────────────────────────
  // Poca gravedad si cambia, mucha si se lee: aquí manda la confidencialidad.
  c('mensajes', 'MEDIA', 'ALTA', 'ALTA', 'ALTA', 'conversaciones privadas entre personas'),
  c('notifications', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'avisos de cada persona'),
  c('ai_conversations', 'BAJA', 'ALTA', 'MEDIA', 'BAJA', 'lo que cada persona le cuenta al asistente'),
  c('ai_messages', 'BAJA', 'ALTA', 'MEDIA', 'BAJA', 'los mensajes de esas conversaciones'),
  c('archivos', 'MEDIA', 'ALTA', 'ALTA', 'MEDIA', 'ficheros subidos: pueden ser documentos reservados'),
  c('carpetas', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'cómo organiza sus cosas cada persona'),
  c('content_reports', 'MEDIA', 'ALTA', 'ALTA', 'ALTA', 'quién ha denunciado a quién'),
  c('spotify_accounts', 'MEDIA', 'ALTA', 'MEDIA', 'MEDIA', 'llaves de una cuenta de otro servicio'),
  c('youtube_accounts', 'MEDIA', 'ALTA', 'MEDIA', 'MEDIA', 'llaves de una cuenta de otro servicio'),
  c('game_finanzas', 'MEDIA', 'ALTA', 'MEDIA', 'MEDIA', 'las finanzas personales que alguien anota en el Juego Vital'),
  c('objetivos_financieros', 'MEDIA', 'ALTA', 'MEDIA', 'MEDIA', 'sus objetivos de ahorro'),
  c('user_maps', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'los mapas que se guarda cada persona'),
  c('user_indicators', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'sus indicadores seguidos'),
  c('user_objectives', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'sus objetivos seguidos'),
  c('user_territories', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'sus territorios seguidos'),
  c('grupos_personas', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'cómo agrupa a su gente'),
  c('eventos', 'MEDIA', 'MEDIA', 'MEDIA', 'MEDIA', 'sus eventos de calendario'),
  c('saves', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'lo que alguien ha guardado'),
  c('follows', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'a quién sigue quién'),

  // ── LAS TABLAS DE DATOS DE LA GENTE (el módulo «Tablas») ──────────────────
  c('bd_tablas', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'las tablas que crea cada persona'),
  c('bd_columnas', 'MEDIA', 'MEDIA', 'ALTA', 'MEDIA', 'su estructura; cambiar el tipo de una columna reinterpreta todo lo guardado'),
  c('bd_filas', 'MEDIA', 'ALTA', 'ALTA', 'MEDIA', 'sus datos, que pueden ser cualquier cosa'),
  c('bd_vistas', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'cómo se miran esas tablas'),
  c('bd_enlaces', 'MEDIA', 'MEDIA', 'MEDIA', 'MEDIA', 'relaciones entre tablas de la gente'),

  // ── OPINIÓN Y REACCIÓN ────────────────────────────────────────────────────
  // Corromperlo es hacer trampa en un recuento, no falsear un hecho.
  c('comments', 'MEDIA', 'MEDIA', 'ALTA', 'ALTA', 'lo que alguien dijo, con su nombre'),
  c('ratings', 'BAJA', 'BAJA', 'MEDIA', 'MEDIA', 'valoraciones'),
  c('reactions', 'BAJA', 'BAJA', 'BAJA', 'BAJA', 'reacciones a un contenido: corromperlas es hacer trampa en un recuento'),

  // ── EL JUEGO VITAL ────────────────────────────────────────────────────────
  c('game_agents', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'los agentes del juego de cada persona'),
  c('game_world_items', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'los objetos de su aldea'),
  c('game_world_overrides', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'cómo ha movido las cosas de su aldea'),

  // ── LO QUE SE PUEDE VOLVER A CALCULAR ─────────────────────────────────────
  // Perder esto cuesta tiempo de máquina, no verdad. Protegerlo como si fuera
  // verdad es gastar el esfuerzo donde no hace falta.
  c('ai_knowledge_chunks', 'BAJA', 'MEDIA', 'BAJA', 'BAJA', 'trozos indexados del contenido, reconstruibles', true),
  c('ai_knowledge_gaps', 'BAJA', 'BAJA', 'BAJA', 'BAJA', 'huecos detectados por la IA, recalculables', true),
  c('spatial_ref_sys', 'BAJA', 'BAJA', 'BAJA', 'BAJA', 'catálogo de sistemas de coordenadas de PostGIS', true),
];

// ── DE LA CLASIFICACIÓN A LA CAPA ───────────────────────────────────────────

export type Capa = 0 | 1 | 2 | 3;

const PESO: Record<Grado, number> = { BAJA: 1, MEDIA: 2, ALTA: 3 };

/**
 * La capa sale de **integridad y autenticidad**, que son las dos preguntas
 * sobre corromper. La confidencialidad no sube de capa: manda otra cosa
 * distinta —si hay que cifrar— y mezclarlas llevaría a firmar y anclar
 * conversaciones privadas, que no hace falta, mientras se dejan sin firmar los
 * indicadores públicos, que sí.
 */
export function capaDe(clase: Clase): Capa {
  if (clase.derivado) return 0;
  const p = Math.max(PESO[clase.integridad], PESO[clase.autenticidad]);
  return (p === 3 ? 3 : p === 2 ? 2 : 1) as Capa;
}

/** ¿Hay que cifrar el contenido de esta tabla? Lo decide la confidencialidad,
 *  ella sola. */
export const exigeCifrado = (clase: Clase) => clase.confidencialidad === 'ALTA';

/**
 * Los controles de cada capa. **Son acumulativos**: la capa 3 lleva todo lo de
 * la 2, que lleva todo lo de la 1. Escritos aquí y no repartidos por el código
 * para que se pueda contestar «¿qué protege exactamente a un indicador?» sin
 * leer el producto entero.
 */
export const CONTROLES: Record<Capa, string[]> = {
  0: [
    'Copia de seguridad y restauración probada',
    'Se puede reconstruir desde su fuente',
  ],
  1: [
    'Todo lo de la capa 0',
    'Escritura sólo por ruta autorizada (la tabla de permisos)',
    'Se archiva, nunca se borra (archived_at)',
    'Historial de cambios (entity_history)',
  ],
  2: [
    'Todo lo de la capa 1',
    'Cada escritura se anota en el registro sellado, encadenada',
    'La raíz del día se ancla fuera de nuestro control',
    'Verificación periódica con tres respuestas: VERIFICADA / ALTERADA / NO SÉ',
  ],
  3: [
    'Todo lo de la capa 2',
    'Cada anotación va firmada, con la llave dentro de la caja fuerte',
    'Cifrado sobre si la confidencialidad es ALTA',
    'Regla de dos personas para los cambios estructurales',
    'Alarma inmediata al detectar una alteración, no en el repaso del día',
  ],
};

const porTabla = new Map(CLASIFICACION.map((k) => [k.tabla, k]));

/** `undefined` = esa tabla no está clasificada. Es un «no lo sé», y la
 *  auditoría lo trata como fallo: una tabla sin clasificar es una tabla que
 *  nadie ha decidido cómo proteger. */
export const claseDe = (tabla: string) => porTabla.get(tabla);

export const capaDeTabla = (tabla: string): Capa | undefined => {
  const k = porTabla.get(tabla);
  return k ? capaDe(k) : undefined;
};

/** Cuántas tablas hay en cada capa. Para el panel y para la auditoría. */
export function reparto() {
  const r: Record<Capa, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const k of CLASIFICACION) r[capaDe(k)]++;
  return r;
}
