-- ============================================================================
-- VERACIDAD · EL TABLERO DE LAS DIEZ FASES (2026-08-22)
-- ============================================================================
-- Eugenio: «genera una página en el menú superior derecho, donde pone "i"
-- información, y ahí añade el Veracidad, como página donde pongamos los
-- principios y tecnologías que usamos para esto; haz un kanban con todas las
-- tareas que tenemos hacia adelante, copia el modelo de Hormiguero para esto».
--
-- ── POR QUÉ ESTO NO ESTRENA TABLA ──────────────────────────────────────────
-- La plataforma ya tiene un tablero de trabajo: `roadmap_items`, el que pinta
-- la página «Visión y hoja de ruta». Crear una tabla de tareas propia para
-- Veracidad sería tener dos listas de lo que hay que hacer, y dos listas de lo
-- mismo siempre acaban diciendo cosas distintas — la regla 7 de la Constitución
-- («evitar duplicados») está escrita para esto exactamente.
--
-- Lo único nuevo es un GRUPO, `veracidad`, junto a los nueve que ya existen. Y
-- como es el mismo tablero, estas 30 tarjetas aparecen a la vez en la página
-- nueva y en la hoja de ruta general, sin sincronizar nada.
--
-- ── LAS TARJETAS SE MARCAN UNA A UNA, POR ID ───────────────────────────────
-- Igual que en la migración 0061: nada de un UPDATE por estado, que pondría en
-- verde también lo que alguien escriba mientras tanto.

-- ── EL GRUPO DÉCIMO ─────────────────────────────────────────────────────────
-- La restricción de `grupo` enumera los nueve grupos del tablero. Se rehace con
-- el décimo dentro: dejarla como estaba y meter las tarjetas por la puerta de
-- atrás (`proyecto_id`, que la salta) las escondería de la hoja de ruta, que es
-- justo donde tienen que verse.
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_grupo_check;
ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_grupo_check CHECK (
  proyecto_id IS NOT NULL OR grupo IN (
    'canvas', 'mapas', 'datos', 'social', 'mercado',
    'diseno', 'ia', 'infra', 'gobernanza', 'veracidad'
  )
);

INSERT INTO roadmap_items (id, grupo, titulo, resumen, estado, prioridad, orden, autor_user_id, created_by, updated_by)
SELECT v.id, 'veracidad', v.titulo, v.resumen, v.estado, v.prioridad, v.orden, a.id, a.id, a.id
FROM (SELECT id FROM users WHERE role_level >= 4 ORDER BY created_at LIMIT 1) a,
(VALUES
  -- ── FASE 1 · LOS CIMIENTOS ────────────────────────────────────────────────
  ('RM_VER_F1_TABLAS', 'F1 · Las tres tablas: debates, argumentos y fuentes',
   'Un debate es un árbol: cada argumento responde a UNA afirmación. Sin eso, una discusión larga deja de decir de qué se está hablando.',
   'hecho', 'alta', 1),
  ('RM_VER_F1_MODULO', 'F1 · Abrir un debate, argumentar, citar y retirar',
   'Las rutas del servidor, con el nivel que hace falta para cada cosa: nivel 1 para abrir y argumentar, nivel 3 para cerrar.',
   'hecho', 'alta', 2),
  ('RM_VER_F1_REGISTRO', 'F1 · Enchufar el módulo al servidor',
   'Dos líneas en server.ts, que es un fichero congelado y compartido: hay que pedir el turno.',
   'en_curso', 'alta', 3),

  -- ── FASE 2 · LA AFIRMACIÓN Y SU FUENTE ────────────────────────────────────
  ('RM_VER_F2_ESCALERA', 'F2 · La escalera de veracidad, con quién la movió',
   'Sin fuente → con fuente → verificada → disputada → refutada. Lo automático es solo el primer escalón; el resto lo decide una persona y queda su nombre.',
   'por_hacer', 'alta', 4),
  ('RM_VER_F2_SELLO', 'F2 · El sello de veracidad, visible desde cualquier pantalla',
   'Un mismo distintivo en el debate, en una publicación y en un indicador. Lo que no tiene fuente lo DICE, no se calla.',
   'por_hacer', 'alta', 5),
  ('RM_VER_F2_CITA', 'F2 · Una fuente es una cita exacta, no un enlace suelto',
   'Enlazar un PDF de 200 páginas no es citar: es dejarle la tarea al lector. Se guarda la frase que sostiene la afirmación.',
   'por_hacer', 'alta', 6),

  -- ── FASE 3 · EL ÁRBOL ─────────────────────────────────────────────────────
  ('RM_VER_F3_CONTADORES', 'F3 · Cuánto cuelga de cada rama',
   'Ver de un vistazo qué parte del debate está viva sin abrirla entera.',
   'por_hacer', 'media', 7),
  ('RM_VER_F3_PLEGADO', 'F3 · Plegar y cargar por tramos los hilos largos',
   'Un debate de 300 argumentos no se puede traer entero de una vez sin que la pantalla se pare.',
   'por_hacer', 'media', 8),
  ('RM_VER_F3_MOVER', 'F3 · Mover un argumento de rama sin perder su historia',
   'A veces se responde en el sitio equivocado. Cambiarlo de sitio no puede borrar lo que ya le respondieron.',
   'por_hacer', 'baja', 9),

  -- ── FASE 4 · LA PANTALLA ──────────────────────────────────────────────────
  ('RM_VER_F4_PAGINA', 'F4 · La pantalla del debate',
   'La tesis arriba, a favor y en contra debajo, y el hilo que se abre y se cierra. Es la pantalla que hace que esto exista para la gente.',
   'por_hacer', 'alta', 10),
  ('RM_VER_F4_ESCRIBIR', 'F4 · Argumentar sin salir de la pantalla',
   'Responder donde estás leyendo. Si hay que ir a otro sitio a escribir, no se escribe.',
   'por_hacer', 'alta', 11),
  ('RM_VER_F4_ENLACE', 'F4 · Enlace permanente a un argumento concreto',
   'Para poder mandar «mira esto» y que el otro caiga exactamente ahí, con su rama abierta.',
   'por_hacer', 'media', 12),

  -- ── FASE 5 · EL VOTO DE IMPACTO ───────────────────────────────────────────
  ('RM_VER_F5_VOTO', 'F5 · Votar cuánto te mueve un argumento',
   'Del 1 al 5, reutilizando la tabla de puntuaciones que ya existe. No es «me gusta»: es cuánto te cambia la postura.',
   'por_hacer', 'alta', 13),
  ('RM_VER_F5_ORDEN', 'F5 · Cada rama ordenada por impacto, no por hora',
   'Que lo primero que se lea sea lo que más mueve, y no lo que llegó antes.',
   'por_hacer', 'alta', 14),
  ('RM_VER_F5_TUYO', 'F5 · Ver tu voto y poder cambiarlo',
   'Cambiar de opinión al leer es exactamente lo que se quiere que pase.',
   'por_hacer', 'media', 15),

  -- ── FASE 6 · EL ESPECTRO DE VISIONES ──────────────────────────────────────
  ('RM_VER_F6_POSTURA', 'F6 · Calcular dónde está cada persona',
   'La postura sale de lo que cada uno apoya, no de una casilla que rellena. Se puede estar a favor por razones opuestas.',
   'por_hacer', 'alta', 16),
  ('RM_VER_F6_ESPECTRO', 'F6 · Dibujar el espectro de visiones',
   'Lo que Eugenio pidió por su nombre: no un veredicto, sino el reparto de posturas con sus razones a la vista.',
   'por_hacer', 'alta', 17),
  ('RM_VER_F6_VISIONES', 'F6 · Las tres o cinco visiones, cada una con su mejor argumento',
   'Una tarjeta por visión. Quien llega nuevo entiende el desacuerdo en un minuto.',
   'por_hacer', 'alta', 18),

  -- ── FASE 7 · EL DEBATE VISUAL ─────────────────────────────────────────────
  ('RM_VER_F7_LIENZO', 'F7 · El debate dibujado sobre el lienzo',
   'El mismo grafo que ya usa la plataforma, con los colores que ya significan apoya, contradice y matiza.',
   'por_hacer', 'alta', 19),
  ('RM_VER_F7_COLGAR', 'F7 · Colgar un debate de un indicador, un reto o una publicación',
   'Que la discusión viva pegada al dato del que se discute, y no en una isla.',
   'por_hacer', 'alta', 20),
  ('RM_VER_F7_DESDE', 'F7 · Desde un indicador, ver de qué se discute',
   'El camino de vuelta: quien mira un número ve si alguien lo está discutiendo.',
   'por_hacer', 'media', 21),

  -- ── FASE 8 · COHERENCIA ───────────────────────────────────────────────────
  ('RM_VER_F8_DETECTAR', 'F8 · Detectar lo que contradice a lo ya publicado',
   'El encargo de Eugenio: que lo que se publique sea coherente con lo que ya hay. Se busca la contradicción, no se supone.',
   'por_hacer', 'alta', 22),
  ('RM_VER_F8_AVISAR', 'F8 · Avisar ANTES de publicar, no después',
   'Un aviso posterior es una discusión; uno anterior es una oportunidad de citar la fuente.',
   'por_hacer', 'alta', 23),
  ('RM_VER_F8_REGISTRAR', 'F8 · Dejar la contradicción registrada en el grafo',
   'Que quede como relación «contradice» y no como un aviso que se cierra y desaparece.',
   'por_hacer', 'media', 24),

  -- ── FASE 9 · REVISIÓN, MODERACIÓN E HISTORIAL ─────────────────────────────
  ('RM_VER_F9_REVISION', 'F9 · Revisión por pares de nivel Conocimiento',
   'Que alguien valide una afirmación antes de que pese en el común. Ya estaba en la hoja de ruta de gobernanza.',
   'por_hacer', 'alta', 25),
  ('RM_VER_F9_DENUNCIA', 'F9 · Denunciar, y qué pasa después',
   'Qué se hace con lo falso, lo ofensivo o lo ilegal, y quién decide. Escrito antes de que haga falta.',
   'por_hacer', 'alta', 26),
  ('RM_VER_F9_HISTORIAL', 'F9 · Historial público de una afirmación',
   'Quién cambió qué y cuándo, y poder volver atrás. Como el historial de Wikipedia.',
   'por_hacer', 'media', 27),

  -- ── FASE 10 · A LA VISTA DE TODOS ─────────────────────────────────────────
  ('RM_VER_F10_PORTADA', 'F10 · Los debates más relevantes, en la portada',
   'Un debate que nadie encuentra no existe.',
   'por_hacer', 'media', 28),
  ('RM_VER_F10_BUSCADOR', 'F10 · En el buscador y en los avisos',
   'Que te llegue cuando alguien responde a lo que escribiste.',
   'por_hacer', 'media', 29),
  ('RM_VER_F10_IA', 'F10 · Que el asistente abra debates y responda con fuentes',
   'La IA puede proponer la contradicción y citar; decidir, no.',
   'por_hacer', 'media', 30)
) AS v(id, titulo, resumen, estado, prioridad, orden)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  resumen = EXCLUDED.resumen,
  grupo = EXCLUDED.grupo,
  orden = EXCLUDED.orden,
  updated_at = now();
