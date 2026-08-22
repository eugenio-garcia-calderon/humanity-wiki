// ============================================================================
// QUIÉN PUEDE ESCRIBIR QUÉ — LA TABLA ÚNICA (fase 0, 2026-08-22)
// ============================================================================
// Eugenio: «esta herramienta la van a utilizar altos directivos y gobiernos y
// no puede ser corrompible». El plan entero está en
// `memory/09_TARGET_ARCHITECTURE/03_SECURITY_AND_CHAIN.md`.
//
// EL PROBLEMA QUE RESUELVE ESTE FICHERO, MEDIDO. La plataforma tiene 150 rutas
// que escriben. Casi todas comprueban permisos, pero cada una lo hace con su
// propio ayudante (`requireAdmin`, `requiereSesion`, `puedeConTabla`,
// `sesionDe`…), así que la pregunta «¿están todas autorizadas?» solo tiene
// respuesta si una persona lee 150 trozos de código. Una pregunta así se acaba
// respondiendo mal, y con gobiernos dentro eso no es deuda técnica: es el suelo.
//
// Aquí esa pregunta pasa a tener respuesta de máquina:
// `node scripts/auditar-permisos.mjs` compara ESTA tabla con las rutas que hay
// de verdad en el código, y falla si aparece una que nadie ha declarado.
//
// ── LAS TRES RESPUESTAS, TAMBIÉN AQUÍ ──────────────────────────────────────
// Regla de la casa: todo componente tiene que poder decir «no lo sé» de forma
// distinguible de un resultado válido. Por eso existe el guardián `revisar`:
// significa «el análisis vio esto, pero NINGUNA PERSONA lo ha confirmado».
// No es un aprobado y no se comporta como tal — `guardia.ts` no exige nada en
// esas rutas, se limita a dejarlas como están.
//
// **El número de rutas `revisar` es el trabajo pendiente de la fase 0, y tiene
// que llegar a cero.** Sale en la última línea de la auditoría.
//
// ── POR QUÉ DECLARAR Y NO DEDUCIR ──────────────────────────────────────────
// Un análisis automático puede decir qué comprueba una ruta HOY. No puede decir
// qué DEBERÍA comprobar: eso es una decisión, y una decisión no se deduce del
// código que se quiere auditar. Si se dedujera, una ruta mal protegida se
// auto-declararía correcta y la auditoría diría que todo está bien.

/** Qué hace falta para poder escribir por una ruta. */
export type Guardia =
  /** Abierta a propósito: no puede exigir sesión porque es la puerta de entrada. */
  | { tipo: 'publica'; porque: string }
  /** No hay sesión, pero sí una firma que se verifica (Stripe). */
  | { tipo: 'firma'; porque: string }
  /** Cualquiera que haya iniciado sesión. */
  | { tipo: 'sesion' }
  /** Nivel mínimo de rol: 1 usuario · 2 verificado · 3 conocimiento · 4 administrador. */
  | { tipo: 'nivel'; minimo: 1 | 2 | 3 | 4 }
  /** Ser el dueño de la cosa, o tener `minimo` (por defecto, administrador). */
  | { tipo: 'propietario'; minimo?: 1 | 2 | 3 | 4 }
  /** Sesión de persona O token de programador IA. */
  | { tipo: 'agente' }
  /** NADIE LO HA REVISADO TODAVÍA. No es un aprobado: es un «no lo sé». */
  | { tipo: 'revisar'; detectado: string };

export interface Entrada {
  m: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  ruta: string;
  guardia: Guardia;
  /** Por qué es ese nivel y no otro. Solo en las revisadas a mano. */
  nota?: string;
}

/** Las revisadas a mano el 2026-08-22, leyendo el código de cada una.
 *  El resto están más abajo, marcadas `revisar`. */
const REVISADAS: Entrada[] = [
  // ── La puerta de entrada ──────────────────────────────────────────────
  { m: 'POST', ruta: '/api/auth/login', guardia: { tipo: 'publica', porque: 'es el propio inicio de sesión' } },
  { m: 'POST', ruta: '/api/auth/register', guardia: { tipo: 'publica', porque: 'alta de cuenta nueva' } },
  { m: 'POST', ruta: '/api/auth/google', guardia: { tipo: 'publica', porque: 'inicio de sesión con Google' } },
  { m: 'POST', ruta: '/api/auth/password/forgot', guardia: { tipo: 'publica', porque: 'quien la ha olvidado no puede tener sesión' } },
  { m: 'POST', ruta: '/api/auth/password/reset', guardia: { tipo: 'publica', porque: 'lleva su propio testigo de un solo uso, con caducidad' },
    nota: 'auth.ts:532 — el permiso es el token del correo, no la sesión' },
  { m: 'POST', ruta: '/api/auth/logout', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/auth/password/change', guardia: { tipo: 'sesion' }, nota: 'exige además la contraseña actual' },
  { m: 'PUT', ruta: '/api/auth/me', guardia: { tipo: 'sesion' } },
  { m: 'PUT', ruta: '/api/auth/ui-settings', guardia: { tipo: 'sesion' } },

  // ── Administración de personas: lo más sensible que hay ────────────────
  { m: 'POST', ruta: '/api/admin/users', guardia: { tipo: 'nivel', minimo: 4 } },
  { m: 'PUT', ruta: '/api/admin/users/:id/role', guardia: { tipo: 'nivel', minimo: 4 },
    nota: 'auth.ts:624 — cambiar el rol de alguien es cambiar quién manda' },
  { m: 'POST', ruta: '/api/admin/users/:id/archivar', guardia: { tipo: 'nivel', minimo: 4 } },
  { m: 'POST', ruta: '/api/admin/users/:id/restaurar', guardia: { tipo: 'nivel', minimo: 4 } },
  { m: 'POST', ruta: '/api/admin/users/:id/reset-link', guardia: { tipo: 'nivel', minimo: 4 },
    nota: 'genera un enlace que abre la cuenta de otro: nivel 4 y registrado' },

  // ── Dinero y puntos ───────────────────────────────────────────────────
  { m: 'POST', ruta: '/api/admin/users/:id/puntos', guardia: { tipo: 'nivel', minimo: 4 },
    nota: 'puntos.ts:70 — HOY CREA PUNTOS DE LA NADA, sin tope ni contrapartida. La fase 1 le pone doble partida; el nivel 4 no es suficiente por sí solo' },
  { m: 'POST', ruta: '/api/stripe/checkout/puntos', guardia: { tipo: 'sesion' }, nota: 'stripe.ts:265 — requireAuth; el saldo solo se acredita en el webhook' },
  { m: 'POST', ruta: '/api/stripe/checkout/product', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/stripe/checkout/support', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/stripe/refunds', guardia: { tipo: 'propietario', minimo: 4 },
    nota: 'stripe.ts:299 — solo quien cobró, o un administrador' },
  { m: 'POST', ruta: '/api/stripe/connect/onboard', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/stripe/connect/dashboard-link', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/stripe/connect/disconnect', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/stripe/webhook', guardia: { tipo: 'firma', porque: 'lo llama Stripe, no una persona; se verifica la firma del evento' } },
  { m: 'POST', ruta: '/api/stripe/create-checkout-session', guardia: { tipo: 'revisar', detectado: 'nada' },
    nota: 'en server.ts, que está congelado. Revisar con el Programador 1 antes de tocarla' },

  // ── El núcleo de datos: territorios, indicadores, retos ────────────────
  { m: 'POST', ruta: '/api/data/:entity', guardia: { tipo: 'nivel', minimo: 4 }, nota: 'server.ts:1088 requireAdmin. Estuvo abierta (PR #23)' },
  { m: 'PUT', ruta: '/api/data/:entity/:id', guardia: { tipo: 'nivel', minimo: 4 } },
  { m: 'DELETE', ruta: '/api/data/:entity/:id', guardia: { tipo: 'nivel', minimo: 4 } },
  { m: 'POST', ruta: '/api/data/:entity/:id/restore', guardia: { tipo: 'nivel', minimo: 4 } },
  { m: 'POST', ruta: '/api/map/territories', guardia: { tipo: 'nivel', minimo: 4 } },

  // ── El hormiguero: personas con sesión y programadores IA ──────────────
  { m: 'POST', ruta: '/api/incidencias', guardia: { tipo: 'agente' },
    nota: 'de un admin o de un agente entra en «esperando»; de cualquier otro, en «propuesta»' },
  { m: 'PUT', ruta: '/api/incidencias/:id', guardia: { tipo: 'agente' } },
  { m: 'DELETE', ruta: '/api/incidencias/:id', guardia: { tipo: 'agente' }, nota: 'solo la propia, o admin' },

  // ── El navegador remoto: cada sesión es un Chromium de verdad ──────────
  { m: 'POST', ruta: '/api/navegador/remoto', guardia: { tipo: 'sesion' } },
  { m: 'POST', ruta: '/api/navegador/remoto/:id/entrada', guardia: { tipo: 'propietario' },
    nota: 'navegadorRemoto.ts:305 — comprueba que la sesión es TUYA. Sin eso, un usuario movería el ratón de otro' },
  { m: 'POST', ruta: '/api/navegador/remoto/:id/transcripcion', guardia: { tipo: 'propietario' } },
  { m: 'DELETE', ruta: '/api/navegador/remoto/:id', guardia: { tipo: 'propietario' } },

  // ── Las finanzas del Juego Vital: son de cada jugador ──────────────────
  { m: 'PUT', ruta: '/api/finanzas', guardia: { tipo: 'sesion' }, nota: 'finanzas.ts:73 — escribe SIEMPRE sobre la fila del usuario de la sesión' },
  { m: 'POST', ruta: '/api/finanzas/objetivos', guardia: { tipo: 'sesion' } },
  { m: 'PUT', ruta: '/api/finanzas/objetivos/:id', guardia: { tipo: 'propietario' } },
  { m: 'DELETE', ruta: '/api/finanzas/objetivos/:id', guardia: { tipo: 'propietario' } },
  { m: 'POST', ruta: '/api/juego/mundo', guardia: { tipo: 'sesion' }, nota: 'juego.ts:497 requiereUsuario' },
];

/** Generadas del análisis del código, SIN revisar por una persona.
 *  Bajar este número a cero es el trabajo pendiente de la fase 0. */
const SIN_REVISAR: Entrada[] = [
  { m: 'DELETE', ruta: '/api/ai/conversations/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/ai/chat', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/ai/generar-imagen', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'POST', ruta: '/api/ai/actions/:id/decide', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'POST', ruta: '/api/ai/admin/reindex', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'POST', ruta: '/api/archivo', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'DELETE', ruta: '/api/archivo/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/bd/tablas', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/bd/tablas/:id/columnas', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'PUT', ruta: '/api/bd/columnas/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'DELETE', ruta: '/api/bd/columnas/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/bd/tablas/:id/vistas', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/bd/tablas/:id/filas', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'PUT', ruta: '/api/bd/filas/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'DELETE', ruta: '/api/bd/filas/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/eventos', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'PUT', ruta: '/api/eventos/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/eventos/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'PUT', ruta: '/api/tareas/:id/vence', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/ai/documento', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/documentos', guardia: { tipo: 'revisar', detectado: 'admin+propietario' } },
  { m: 'PUT', ruta: '/api/paginas/:id/proyecto', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'POST', ruta: '/api/presentaciones', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/ai/presentacion', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/ventanas', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/ai/documento-bloque', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/finanzas/presupuestos', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'DELETE', ruta: '/api/finanzas/presupuestos/:id', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/guardar-web', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/juego/agentes', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/juego/agentes/importar', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/juego/agentes/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/agentes/:id/memoria', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/agentes/:id/archivos', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/juego/agentes/:id/archivos', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/juego/agentes/:id/conversacion', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/agentes/:id/archivar', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/agentes/:id/proyectos', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/juego/mundo/semilla', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/juego/mundo/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/mundo/:id/archivar', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'POST', ruta: '/api/juego/agentes/:id/convertir-en-portal', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/mundo/semilla/convertir-en-portal', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/juego/mundo/:id/convertir-en-portal', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/maps', guardia: { tipo: 'nivel', minimo: 1 } },
  { m: 'POST', ruta: '/api/graphs', guardia: { tipo: 'nivel', minimo: 1 } },
  { m: 'PUT', ruta: '/api/graphs/:id', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'PUT', ruta: '/api/graphs/:id/layout', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'DELETE', ruta: '/api/graphs/:id/windows/:windowId', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/windows/:id/papelera', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/windows/:id/restaurar', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/knowledge/personal', guardia: { tipo: 'nivel', minimo: 1 } },
  { m: 'PATCH', ruta: '/api/publicaciones/:tipo/:id', guardia: { tipo: 'propietario', minimo: 4 },
    nota: 'knowledge.ts:1059 accesoPublicacion — autor o colaborador; cambiar la visibilidad, solo el autor' },
  { m: 'DELETE', ruta: '/api/publicaciones/:tipo/:id', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/publicaciones/:tipo/:id/restaurar', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'PUT', ruta: '/api/publicaciones/:tipo/:id/colaboradores', guardia: { tipo: 'propietario', minimo: 4 },
    nota: 'decidir quién más puede escribir: solo el autor, nunca un colaborador' },
  { m: 'POST', ruta: '/api/carpetas', guardia: { tipo: 'nivel', minimo: 1 } },
  { m: 'PUT', ruta: '/api/carpetas/:id', guardia: { tipo: 'propietario', minimo: 4 },
    nota: 'knowledge.ts:1457 propiaCarpeta — del dueño y de nadie más, ni siquiera de un administrador' },
  { m: 'DELETE', ruta: '/api/carpetas/:id', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'PUT', ruta: '/api/publicaciones/:tipo/:id/carpetas', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/carpetas/auto-organizar', guardia: { tipo: 'nivel', minimo: 1 } },
  { m: 'POST', ruta: '/api/graphs/:id/windows', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'PUT', ruta: '/api/windows/:id', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/windows/:id/view', guardia: { tipo: 'nivel', minimo: 1 },
    nota: 'HOY NO EXIGE NADA Y REGALA PUNTOS: knowledge.ts:1707 suma 0,01 puntos al autor por cada llamada, sin sesion. Los puntos se compran a 100 = 100 EUR, asi que es fabricar dinero desde fuera. Declarada como nivel 1 a proposito: al pasar el guardian a exigir, se cierra. Ver nota del hormiguero.' },
  { m: 'PUT', ruta: '/api/graphs/:id/entity-links', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/graphs/:id/edges', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'PUT', ruta: '/api/graphs/:id/edges/:edgeId', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/graphs/:id/edges/:edgeId/invertir', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'DELETE', ruta: '/api/graphs/:id/edges/:edgeId', guardia: { tipo: 'propietario', minimo: 4 } },
  { m: 'POST', ruta: '/api/rate', guardia: { tipo: 'nivel', minimo: 1 },
    nota: 'una valoración por persona y cosa; el voto es de quien lo emite' },
  { m: 'POST', ruta: '/api/comments', guardia: { tipo: 'nivel', minimo: 1 },
    nota: 'habla con su nombre delante: nivel 1 y autoría registrada' },
  { m: 'POST', ruta: '/api/mensajes', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/elemento/:tipo/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/elemento/:tipo/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/personas', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/personas/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/personas/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/grupos-personas', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/grupos-personas/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/grupos-personas/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/personas/:id/seguimiento', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'PUT', ruta: '/api/publicar/handle', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'PUT', ruta: '/api/publicar/paginas/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/publicar/paginas/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/proyectos', guardia: { tipo: 'revisar', detectado: 'propietario' } },
  { m: 'PUT', ruta: '/api/proyectos/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'DELETE', ruta: '/api/proyectos/:id', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/proyectos/:id/herramienta', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/roadmap', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'PUT', ruta: '/api/roadmap/:id', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'DELETE', ruta: '/api/roadmap/:id', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'PUT', ruta: '/api/textos/:pagina/:clave', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'POST', ruta: '/api/publications', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'PUT', ruta: '/api/publications/:id', guardia: { tipo: 'revisar', detectado: 'admin+nivel' } },
  { m: 'POST', ruta: '/api/publications/:id/comments', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/react', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/save', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/follow', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'PUT', ruta: '/api/comments/:id', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'DELETE', ruta: '/api/comments/:id', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'POST', ruta: '/api/notifications/read', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/report', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/products', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'PUT', ruta: '/api/products/:id/pizarra', guardia: { tipo: 'revisar', detectado: 'admin' } },
  { m: 'PUT', ruta: '/api/products/:id/proyecto', guardia: { tipo: 'revisar', detectado: 'admin+propietario' } },
  { m: 'POST', ruta: '/api/demands', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/needs', guardia: { tipo: 'revisar', detectado: 'nivel' } },
  { m: 'POST', ruta: '/api/spotify/desconectar', guardia: { tipo: 'revisar', detectado: 'sesion' } },
  { m: 'POST', ruta: '/api/youtube/desconectar', guardia: { tipo: 'revisar', detectado: 'sesion' } },
];

export const POLITICA: Entrada[] = [...REVISADAS, ...SIN_REVISAR];

/** `/api/juego/agentes/:id/memoria` → expresión que casa con la ruta real. */
const aRegExp = (ruta: string) =>
  new RegExp('^' + ruta.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[^/]+/g, '[^/]+') + '/?$');

const compilada = POLITICA.map((e) => ({ ...e, re: aRegExp(e.ruta) }));

/** Qué dice la tabla de esta petición. `undefined` = no está declarada, que
 *  para la auditoría es un fallo y para el guardián es un «no lo sé». */
export function politicaDe(metodo: string, ruta: string): Entrada | undefined {
  const m = metodo.toUpperCase();
  // Primero la coincidencia exacta: `/api/admin/users` no debe caer en
  // `/api/admin/users/:id/…`, y el orden del array no debería decidir eso.
  return (
    compilada.find((e) => e.m === m && e.ruta === ruta) ||
    compilada.find((e) => e.m === m && e.re.test(ruta))
  );
}

/** Cuántas hay sin revisar. Es la cifra que la fase 0 tiene que llevar a cero. */
export const cuentaSinRevisar = () => POLITICA.filter((e) => e.guardia.tipo === 'revisar').length;
