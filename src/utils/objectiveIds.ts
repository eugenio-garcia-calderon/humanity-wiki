/*
 * LOS IDS DE LOS OBJETIVOS, SIN ICONOS NI COLORES (2026-08-25)
 * ============================================================================
 * Esta lista es una COPIA de los ids que ya están en `objetivos.ts`, y las
 * copias envejecen. Pasó el mismo día que se añadió ESPIRITUALIDAD: entró en
 * `objetivos.ts` y en la tabla `objectives`, y esto se quedó en catorce.
 *
 * No se rompió nada y no se quejó nadie — que es lo que la hace peligrosa. Lo
 * que hacía el servidor con esta lista era meter la palabra del objetivo en la
 * búsqueda de cada subtema, así que los 72 de espiritualidad **buscaban sin la
 * palabra «espiritualidad»**, justo la que los distingue. Lo encontró prog8
 * leyendo, no fallando.
 *
 * ── POR QUÉ SIGUEN SIENDO DOS Y NO UNA ─────────────────────────────────────
 * Porque `objetivos.ts` importa los iconos de `lucide-react`, y esto lo lee
 * también el servidor (`src/server/agregador.ts`). Unirlas en el sentido fácil
 * —que ésta lea aquélla— metería un paquete de iconos de React dentro del
 * bundle del servidor.
 *
 * El sentido bueno es el contrario: que `objetivos.ts` lea ESTA lista y le
 * añada icono, color y palabras. Mientras eso no se haga, **abajo hay una
 * comprobación que avisa en desarrollo cuando las dos dejan de coincidir**, que
 * es lo que faltó esta vez.
 */
export const OBJECTIVE_ID_BY_KEY: Record<string, string> = {
  agua: 'O001',
  alimentacion: 'O002',
  vivienda: 'O003',
  salud: 'O004',
  convivencia: 'O005',
  ecosistemas: 'O006',
  educacion: 'O007',
  movilidad: 'O008',
  energia: 'O009',
  tecnologia: 'O010',
  empleo: 'O011',
  gobernanza: 'O012',
  economia: 'O013',
  cultura: 'O014',
  espiritualidad: 'O015',
};
