// ============================================================================
// CIFRADO DE LO SENSIBLE, DATO A DATO (fase 0, 2026-08-22)
// ============================================================================
// Hoy no hay NADA cifrado en la plataforma: lo único que hay son contraseñas
// (scrypt, `auth.ts`) y la huella de las llaves de agente. Quien tenga el disco
// —el proveedor, una copia de seguridad perdida, una orden judicial— lo lee
// todo. Con gobiernos dentro eso no se sostiene.
//
// ── SOBRE CIFRADO: UNA LLAVE POR DATO, NO UNA PARA TODO ────────────────────
// Cada registro se cifra con SU PROPIA llave (AES-256-GCM), y esa llave se
// guarda cifrada con la llave maestra. Se llama cifrado sobre (envelope).
// Cuesta lo mismo y da dos cosas que una llave única no puede dar:
//
//   1. BORRAR DE VERDAD SIN BORRAR. Destruyes la llave de ese registro y el
//      dato queda ilegible para siempre, esté donde esté — incluidas las copias
//      de seguridad que ya se hicieron. Es la respuesta al derecho de supresión
//      del RGPD, y la única que funciona cuando el dato ya se ha copiado.
//   2. CAMBIAR LA LLAVE MAESTRA SIN RECIFRAR LA BASE DE DATOS. Se vuelven a
//      envolver las llaves pequeñas, que son 44 bytes cada una, en vez de
//      recifrar gigabytes.
//
// **Dónde vive la llave de cada dato importa.** Guardada en la misma fila que
// el dato, una copia de seguridad se lleva las dos y destruir la llave no
// alcanza a esa copia. Por eso `envolver()` devuelve la llave envuelta APARTE:
// va en su propia tabla, que es la que se purga al borrar. Ver la fase 0 de
// `memory/09_TARGET_ARCHITECTURE/03_SECURITY_AND_CHAIN.md`.
//
// ── LA LLAVE MAESTRA, DE MOMENTO, EN EL ENTORNO ────────────────────────────
// `CLAVE_MAESTRA` (32 bytes en base64). Es un paso intermedio declarado, no el
// destino: la llave sigue siendo legible para quien tenga una consola en el
// servidor. El destino es una caja fuerte (OpenBao) donde se firma y se
// desenvuelve DENTRO, y la llave no sale nunca. `proveedorDeClave()` es el
// único sitio que hay que cambiar el día que se monte.
//
// ── Y SI NO HAY LLAVE, LO DICE ─────────────────────────────────────────────
// Sin `CLAVE_MAESTRA` esto no cifra en silencio ni guarda en claro «para no
// romper»: falla y lo dice. Un cifrado que se apaga solo es peor que no
// tenerlo, porque además tranquiliza.
import crypto from 'node:crypto';

const ALGORITMO = 'aes-256-gcm';
const VERSION = 'hw1';

/** El formato empieza por su versión a propósito: el día que haya que pasar a
 *  otro algoritmo (fase 5, post-cuántico), lo viejo se sigue leyendo y lo nuevo
 *  nace con otra etiqueta. Migrar es añadir, no reescribir. */
export type Paquete = string; // hw1$<iv>$<tag>$<cifrado>, todo en base64url

export class SinClaveMaestra extends Error {
  constructor() {
    super('No hay CLAVE_MAESTRA configurada: no se puede cifrar ni descifrar.');
    this.name = 'SinClaveMaestra';
  }
}
export class DatoAlterado extends Error {
  constructor() {
    super('El dato no se puede descifrar: o la llave no es la suya, o lo han tocado.');
    this.name = 'DatoAlterado';
  }
}

/** Lee la llave maestra en el momento de usarla, nunca al cargar el módulo:
 *  es la regla de la casa para los secretos (`src/server/CLAUDE.md`). */
function proveedorDeClave(): Buffer {
  const b64 = process.env.CLAVE_MAESTRA;
  if (!b64) throw new SinClaveMaestra();
  const clave = Buffer.from(b64, 'base64');
  if (clave.length !== 32) {
    throw new Error('CLAVE_MAESTRA debe ser de 32 bytes en base64. Genera una con: openssl rand -base64 32');
  }
  return clave;
}

/** ¿Está configurado el cifrado? Para poder responder «no lo sé» en vez de
 *  reventar en mitad de una petición. */
export const hayClaveMaestra = () => {
  try { proveedorDeClave(); return true; } catch { return false; }
};

/** Una llave nueva, para un dato nuevo. */
export const nuevaLlave = () => crypto.randomBytes(32);

function cifrarCon(llave: Buffer, texto: string): Paquete {
  const iv = crypto.randomBytes(12); // 96 bits, lo que GCM espera
  const c = crypto.createCipheriv(ALGORITMO, llave, iv);
  const cifrado = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), cifrado.toString('base64url')].join('$');
}

function descifrarCon(llave: Buffer, paquete: Paquete): string {
  const [version, iv, tag, cifrado] = paquete.split('$');
  if (version !== VERSION) throw new Error(`Formato de cifrado desconocido: ${version}`);
  try {
    const d = crypto.createDecipheriv(ALGORITMO, llave, Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(cifrado, 'base64url')), d.final()]).toString('utf8');
  } catch {
    // GCM comprueba la integridad al hacer `final()`. Que falle significa que
    // el dato NO es el que se guardó — o la llave no es la suya. Las dos cosas
    // son «no te lo puedo dar», y ninguna es «aquí tienes, más o menos».
    throw new DatoAlterado();
  }
}

/** Envuelve la llave de un dato con la maestra, para poder guardarla. */
export const envolver = (llave: Buffer): Paquete => cifrarCon(proveedorDeClave(), llave.toString('base64url'));

/** La abre. Lanza `DatoAlterado` si la envoltura no cuadra. */
export const abrir = (envuelta: Paquete): Buffer =>
  Buffer.from(descifrarCon(proveedorDeClave(), envuelta), 'base64url');

/**
 * Cifra un dato. Devuelve DOS cosas que van a sitios distintos:
 *   `paquete`      → junto al registro
 *   `llaveEnvuelta`→ a la tabla de llaves, que es la que se purga al borrar
 *
 * Separarlas es lo que hace que destruir la llave borre el dato de verdad.
 */
export function cifrar(texto: string): { paquete: Paquete; llaveEnvuelta: Paquete } {
  const llave = nuevaLlave();
  const paquete = cifrarCon(llave, texto);
  const llaveEnvuelta = envolver(llave);
  llave.fill(0); // no dejarla dando vueltas en memoria más de lo necesario
  return { paquete, llaveEnvuelta };
}

export function descifrar(paquete: Paquete, llaveEnvuelta: Paquete): string {
  const llave = abrir(llaveEnvuelta);
  try { return descifrarCon(llave, paquete); } finally { llave.fill(0); }
}

/** Las tres respuestas, para poder enseñar el estado de un dato sin descifrarlo
 *  delante de nadie. `BORRADO` es un caso legítimo, no un error: es lo que
 *  queda cuando alguien ejerció su derecho a que le borren. */
export type EstadoDato = 'LEGIBLE' | 'ALTERADO' | 'BORRADO' | 'NO_SE';

export function estadoDe(paquete: Paquete | null, llaveEnvuelta: Paquete | null): EstadoDato {
  if (!paquete) return 'NO_SE';
  if (!llaveEnvuelta) return 'BORRADO'; // se destruyó la llave: ilegible para siempre, a propósito
  if (!hayClaveMaestra()) return 'NO_SE';
  try { descifrar(paquete, llaveEnvuelta); return 'LEGIBLE'; }
  catch (e) { return e instanceof DatoAlterado ? 'ALTERADO' : 'NO_SE'; }
}
