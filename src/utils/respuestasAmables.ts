// ============================================================================
// NADA DE «Unexpected token '<', "<!DOCTYPE"…» (2026-10-18, Eugenio)
// ============================================================================
// Ese texto rojo salía al soltar un archivo o cuando algo fallaba. Pasa cuando
// el servidor no contesta con datos (JSON) sino con una PÁGINA web: Cloudflare
// cuando un archivo pasa de su límite (413) o el servidor tarda demasiado
// (524), el proxy durante un despliegue (502/503), o Express cuando un cuerpo
// es demasiado grande. El código hacía `await r.json()`, el navegador intentaba
// leer HTML como JSON y su mensaje técnico acababa delante del usuario.
//
// Arreglarlo en cada uno de los cientos de `r.json()` sería no acabar nunca y
// olvidar alguno. Se hace UNA vez: `Response.prototype.json` lee el texto, y
// si no es JSON lanza un error que dice qué ha pasado en palabras de persona.
// Los `catch` que ya enseñaban `e.message` enseñan ahora esto.

export function mensajeAmable(estado: number): string {
  if (estado === 413) return 'El archivo es demasiado grande para subirlo. Prueba con uno más ligero (los vídeos, hasta 60 MB).';
  if (estado === 502 || estado === 503 || estado === 504 || estado === 521 || estado === 522) return 'El servidor se está actualizando o no responde ahora mismo. Vuelve a intentarlo en unos segundos.';
  if (estado === 524 || estado === 408) return 'El servidor ha tardado demasiado en contestar. Vuelve a intentarlo; si es un archivo grande, prueba con uno más ligero.';
  if (estado === 401) return 'Tu sesión ha caducado. Vuelve a entrar e inténtalo otra vez.';
  if (estado === 403) return 'No tienes permiso para hacer esto.';
  if (estado === 404) return 'Eso ya no existe o se ha movido.';
  if (estado === 429) return 'Demasiadas peticiones seguidas. Espera un momento y vuelve a intentarlo.';
  if (estado >= 500) return 'Algo ha fallado en el servidor. Vuelve a intentarlo en un momento.';
  if (estado === 0) return 'Se ha cortado la conexión. Comprueba tu internet y vuelve a intentarlo.';
  return 'No se ha podido completar. Vuelve a intentarlo.';
}

export function instalarRespuestasAmables() {
  const proto = Response.prototype as any;
  if (proto.__amable) return;
  proto.__amable = true;
  proto.json = async function json(this: Response) {
    const texto = await this.text();
    try {
      return JSON.parse(texto);
    } catch {
      const e = new Error(mensajeAmable(this.status));
      (e as any).estado = this.status;
      throw e;
    }
  };
}
