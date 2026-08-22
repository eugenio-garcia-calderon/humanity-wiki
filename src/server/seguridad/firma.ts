// ============================================================================
// FIRMAR LO QUE SE ANOTA (capa 3, 2026-08-22)
// ============================================================================
// La cadena de huellas del registro sellado demuestra que **nada ha cambiado
// desde que se escribió**. No demuestra quién lo escribió: cualquiera que pueda
// escribir en la tabla puede fabricar una cadena entera, coherente y falsa,
// desde cero.
//
// La firma cierra eso. Cada anotación va firmada con una llave que **no está en
// la base de datos**, así que quien se lleve la base no puede fabricar
// anotaciones nuevas que pasen la verificación. Es la diferencia entre «esto no
// se ha tocado» y «esto lo escribimos nosotros y no se ha tocado».
//
// ── ED25519, Y POR QUÉ ESE ────────────────────────────────────────────────
// Firmas pequeñas (64 bytes), rápidas, sin parámetros que elegir mal, y sin las
// trampas de temporización que tiene ECDSA. Es lo que hoy se recomienda para
// firmar cosas nuevas, y lo que usa medio internet moderno (SSH, Signal,
// certificados de transparencia).
//
// ── LA ROTACIÓN VA DESDE EL PRIMER DÍA ────────────────────────────────────
// Cada firma lleva el `clave_id` de la llave que la hizo: la huella corta de su
// parte pública. Sin eso, cambiar de llave —porque se filtró, porque toca, o
// porque se pasa a la caja fuerte— dejaría todo lo firmado antes como
// «inválido», que es indistinguible de «manipulado». Con el `clave_id`, el
// verificador sabe qué llave pedir para cada tramo, y puede decir «esta la
// firmó una llave que no conozco» en vez de acusar.
//
// ── Y LA LLAVE PRIVADA, DE MOMENTO, EN EL ENTORNO ─────────────────────────
// `CLAVE_FIRMA_REGISTRO`, en base64 (PKCS8). Igual que en `cifrado.ts`: es un
// paso intermedio declarado, no el destino. En la caja fuerte (OpenBao) la
// firma se hace DENTRO y la llave no sale nunca — que es cuando una firma pasa
// a significar algo también frente a quien administra el servidor. Este fichero
// es el único sitio que habrá que cambiar.
import crypto from 'node:crypto';

export interface Firmante {
  claveId: string;
  firmar(mensaje: string): string;
  publicaBase64: string;
}

/** La huella corta de una llave pública. Corta a propósito: va en cada fila y
 *  sólo tiene que distinguir entre las pocas llaves que existirán. */
export const idDeClave = (publicaDer: Buffer) =>
  crypto.createHash('sha256').update(publicaDer).digest('hex').slice(0, 16);

/** Una pareja de llaves nueva, en base64. Para las pruebas y para el día que
 *  haya que crear la primera de verdad. */
export function generarPareja() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const priv = privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer;
  const pub = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return { privadaBase64: priv.toString('base64'), publicaBase64: pub.toString('base64'), claveId: idDeClave(pub) };
}

/**
 * El firmante configurado, o `null` si no hay llave.
 *
 * `null` no es un error: es «este sitio todavía no firma», y quien llame tiene
 * que poder distinguirlo de «la firma no vale». Devolver una firma vacía o
 * lanzar una excepción confundiría las dos cosas.
 */
export function firmante(): Firmante | null {
  const b64 = process.env.CLAVE_FIRMA_REGISTRO;
  if (!b64) return null;
  const privada = crypto.createPrivateKey({ key: Buffer.from(b64, 'base64'), format: 'der', type: 'pkcs8' });
  const publica = crypto.createPublicKey(privada).export({ type: 'spki', format: 'der' }) as Buffer;
  return {
    claveId: idDeClave(publica),
    publicaBase64: publica.toString('base64'),
    // Ed25519 firma el mensaje entero: no se le pasa un resumen aparte, por eso
    // el algoritmo va a `null`.
    firmar: (mensaje: string) => crypto.sign(null, Buffer.from(mensaje, 'utf8'), privada).toString('base64'),
  };
}

export type ResultadoFirma = 'VALIDA' | 'INVALIDA' | 'NO_SE';

/**
 * Comprueba una firma contra la llave pública que dice haberla hecho.
 *
 * Tres respuestas, y la tercera es la que evita el error caro: si no tenemos la
 * pública de ese `clave_id`, la respuesta es NO SÉ. Decir «inválida» ahí sería
 * acusar de manipulación a una anotación perfectamente buena firmada con una
 * llave anterior.
 */
export function comprobarFirma(
  mensaje: string, firma: string | null, claveId: string | null,
  publicas: Record<string, string>,
): ResultadoFirma {
  if (!firma || !claveId) return 'NO_SE';
  const pub = publicas[claveId];
  if (!pub) return 'NO_SE';
  try {
    const clave = crypto.createPublicKey({ key: Buffer.from(pub, 'base64'), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(mensaje, 'utf8'), clave, Buffer.from(firma, 'base64'))
      ? 'VALIDA' : 'INVALIDA';
  } catch {
    return 'INVALIDA';
  }
}
