// ============================================================================
// ¿ESTAMOS EN EL ESPACIO DE ALGUIEN? — `nombre.humanity.wiki`
// ============================================================================
// Una página compartida tiene DOS direcciones que llevan al mismo sitio:
//
//   humanity.wiki/@claude-dos/mi-pagina     ← siempre funciona
//   claude-dos.humanity.wiki/mi-pagina      ← más corta, la que se enseña
//
// Y no son la misma forma: en la primera el nombre va en el camino, en la
// segunda va en el `Host` y el camino tiene UN SOLO tramo. Por eso la ruta de
// dos tramos no sirve para la segunda, y hace falta saber, antes de enrutar,
// en cuál de las dos estamos.
//
// Devuelve el nombre, o `null` si esto no es el espacio de nadie. Nunca una
// cadena vacía: «no hay nombre» y «el nombre es ''» tienen que poder
// distinguirse, que es la regla de la casa.

const DOMINIO = 'humanity.wiki';

/** Nombres que son de la plataforma y nunca de una persona. */
const RESERVADOS = new Set(['www', 'api', 'admin', 'app', 'mail', 'ftp', 'cdn', 'static', 'assets']);

export function subdominioDeUsuario(host?: string): string | null {
  const h = (host ?? (typeof location !== 'undefined' ? location.hostname : '')).toLowerCase();
  if (!h) return null;

  // En desarrollo se prueba con `claude-dos.localhost:3001`, que sí funciona en
  // Chrome sin tocar el fichero de hosts. Sin esto, la forma de subdominio solo
  // se podría comprobar en producción, y comprobarlo solo en producción es como
  // se cuelan los fallos que nadie ve hasta que los ve un desconocido.
  const esLocal = h.endsWith('.localhost');
  if (!esLocal && !h.endsWith('.' + DOMINIO)) return null;

  const primero = h.split('.')[0];
  if (!primero || RESERVADOS.has(primero)) return null;

  // `humanity.wiki` a secas cae aquí con `primero === 'humanity'`: no es el
  // espacio de nadie, es la casa común.
  if (!esLocal && h === DOMINIO) return null;

  return primero;
}

/**
 * ¿ESTAMOS EN UN DOMINIO PROPIO? — `lamieldelasierra.com` (2026-08-22)
 *
 * Ni `humanity.wiki`, ni un subdominio suyo, ni `localhost`: cualquier otra
 * cosa por la que alguien haya llegado hasta aquí sólo puede ser un dominio
 * que su dueño apuntó a esta máquina.
 *
 * Devuelve el anfitrión tal cual, para preguntarle al servidor a qué apunta.
 * `null` cuando estamos en casa.
 *
 * ── POR QUÉ NO SE COMPRUEBA AQUÍ SI ES VÁLIDO ───────────────────────────────
 * Porque esta pantalla no puede saberlo. Quién ha reclamado qué dominio vive
 * en la base de datos, y preguntarlo es una llamada. Aquí sólo se decide si
 * hay que preguntar.
 */
export function dominioPropio(host?: string): string | null {
  const h = (host ?? (typeof location !== 'undefined' ? location.hostname : '')).toLowerCase();
  if (!h) return null;
  if (h === DOMINIO || h.endsWith('.' + DOMINIO)) return null;
  // En desarrollo todo es `localhost` o una IP, y ninguna de las dos es el
  // dominio propio de nadie.
  if (h === 'localhost' || h.endsWith('.localhost')) return null;
  if (/^[0-9.]+$/.test(h) || h.includes(':')) return null;
  return h;
}
