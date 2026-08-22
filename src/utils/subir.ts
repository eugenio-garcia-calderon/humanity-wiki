// ============================================================================
// SUBIR UN ARCHIVO, UNA SOLA VEZ (2026-08-22)
// ============================================================================
// Encontrado en la evaluación del código que pidió Eugenio: la MISMA petición
// a `/api/uploads` estaba escrita a mano en 15 sitios —el editor de páginas,
// el kanban, el perfil, el lienzo, la presentación, el visor 3D, los adjuntos,
// el creador de publicaciones, el editor de imagen, el menú lateral…— y no
// eran quince copias idénticas: unas mandaban el `File`, otras su
// `arrayBuffer()`, unas ponían el tipo por defecto y otras no, y cada una
// contaba el fallo a su manera.
//
// Eso es lo que hace caro cambiar nada: el día que la subida necesite un
// encabezado más, o un límite de tamaño, o reintentar, hay que acordarse de
// quince sitios. Y el que se olvide funcionará hasta que alguien suba el
// archivo que lo rompe.
//
// DEVUELVE UN RESULTADO, NO LANZA. `{ url }` o `{ error }`, y quien llama
// decide qué enseñar. Lanzar obligaba a cada sitio a envolverlo en un
// `try/catch`, y el que se olvidaba dejaba la pantalla a medias sin decir por
// qué — que es exactamente la regla de la casa: todo tiene que poder decir
// «no he podido» de una forma que se distinga de haberlo hecho.
/**
 * Lo que contesta el servidor cuando ha guardado el archivo. Se devuelve
 * ENTERO y no solo la dirección: `esImagen` lo decide él mirando el fichero, y
 * `clase`, `type` y `bytes` son los que luego se guardan en la ficha del
 * adjunto. Recalcular cualquiera de ellos aquí sería una segunda opinión que
 * un día contradice a la primera.
 */
export interface ArchivoSubido {
  url: string;
  bytes: number;
  type: string;
  esImagen: boolean;
  clase: string;
}

export type ResultadoSubida =
  | (ArchivoSubido & { error?: undefined })
  | { url?: undefined; bytes?: undefined; type?: undefined; esImagen?: undefined; clase?: undefined; error: string };

/**
 * Sube un fichero y devuelve su dirección.
 *
 * Acepta un `File` (lo normal), un `Blob` (una imagen recién generada en un
 * canvas) o los bytes ya leídos. El tipo se saca del propio archivo; si no lo
 * trae —pasa con algunos ficheros arrastrados desde el escritorio— se declara
 * `application/octet-stream`, que es la forma honesta de decir «no sé qué es»
 * en vez de inventarse un `image/png`.
 */
export async function subirArchivo(
  dato: File | Blob | ArrayBuffer,
  tipo?: string,
): Promise<ResultadoSubida> {
  const suTipo = tipo
    || (typeof File !== 'undefined' && dato instanceof File && dato.type)
    || (typeof Blob !== 'undefined' && dato instanceof Blob && dato.type)
    || 'application/octet-stream';
  try {
    const r = await fetch(`/api/uploads?type=${encodeURIComponent(suTipo)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: dato as BodyInit,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.url) return { error: j?.error || 'No se ha podido subir el archivo.' };
    return {
      url: j.url as string,
      bytes: Number(j.bytes) || 0,
      type: String(j.type || suTipo),
      esImagen: !!j.esImagen,
      clase: String(j.clase || 'archivo'),
    };
  } catch {
    // Sin red. Se distingue de un rechazo del servidor porque el mensaje lo
    // dice: quien lo lea sabrá si volver a intentarlo o mirar el archivo.
    return { error: 'No hay conexión: el archivo no se ha subido.' };
  }
}
