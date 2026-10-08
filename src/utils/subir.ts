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
  datoOriginal: File | Blob | ArrayBuffer,
  tipo?: string,
  /** 0–1 según avanza la subida (2026-10-01). Eugenio: con una imagen pesada
   *  «parece que no está haciendo nada» y uno cancela o sale antes de tiempo. */
  alProgreso?: (fraccion: number) => void,
  /** `maxLado`: una imagen que nunca se verá grande (un icono, un logotipo)
   *  se reduce a esto sin preguntar. */
  opciones?: { maxLado?: number },
): Promise<ResultadoSubida> {
  // LAS IMÁGENES SE PREPARAN ANTES (2026-10-02): HEIC a JPG, y si pesa mucho
  // se pregunta si comprimirla o elegir otra. Ver `prepararImagen.ts`.
  let dato: File | Blob | ArrayBuffer = datoOriginal;
  if (typeof File !== 'undefined' && datoOriginal instanceof File && !tipo) {
    const preparado = await prepararParaSubir(datoOriginal, opciones?.maxLado);
    if ('error' in preparado) return { error: preparado.error };
    dato = preparado.archivo;
  }
  const suTipo = tipo
    || (typeof File !== 'undefined' && dato instanceof File && dato.type)
    || (typeof Blob !== 'undefined' && dato instanceof Blob && dato.type)
    || 'application/octet-stream';

  // `fetch` no dice cuánto lleva enviado; `XMLHttpRequest` sí. Por eso se usa
  // éste: es lo único que permite pintar una barra de progreso de verdad.
  const enviar = () => new Promise<{ status: number; j: any }>((ok, mal) => {
    const x = new XMLHttpRequest();
    x.open('POST', `/api/uploads?type=${encodeURIComponent(suTipo)}`);
    x.withCredentials = true;
    x.setRequestHeader('Content-Type', 'application/octet-stream');
    x.upload.onprogress = e => { if (e.lengthComputable && alProgreso) alProgreso(Math.min(0.99, e.loaded / e.total)); };
    x.onload = () => {
      let j: any = {};
      try { j = JSON.parse(x.responseText); } catch { /* respuesta no JSON */ }
      ok({ status: x.status, j });
    };
    x.onerror = () => mal(new Error('red'));
    x.ontimeout = () => mal(new Error('red'));
    x.send(dato as XMLHttpRequestBodyInit);
  });

  try {
    // UN CORTE DE RED SE REINTENTA UNA VEZ (2026-10-01). A Eugenio le falló
    // una imagen con «no hay conexión» y el servidor estaba bien: fue un
    // corte de un instante. Un reintento a los dos segundos lo salva sin que
    // nadie se entere; si vuelve a fallar, entonces sí se dice.
    let r: { status: number; j: any };
    try { r = await enviar(); }
    catch { alProgreso?.(0); await new Promise(res => setTimeout(res, 2000)); r = await enviar(); }
    const j = r.j;
    if (r.status < 200 || r.status >= 300 || !j?.url) return { error: j?.error || 'No se ha podido subir el archivo.' };
    alProgreso?.(1);
    return {
      url: j.url as string,
      bytes: Number(j.bytes) || 0,
      type: String(j.type || suTipo),
      esImagen: !!j.esImagen,
      clase: String(j.clase || 'archivo'),
    };
  } catch {
    return { error: 'No se ha podido subir el archivo: se ha cortado la conexión. Tu página sigue igual; vuelve a intentarlo.' };
  }
}

/** HEIC → JPG, reducir si hace falta y, si sigue pesando mucho, preguntar. */
async function prepararParaSubir(f: File, maxLado?: number): Promise<{ archivo: File } | { error: string }> {
  const { esHeic, esImagenTratable, heicAJpg, comprimirImagen, LIMITE_IMAGEN } = await import('./prepararImagen');
  let actual = f;
  for (let vueltas = 0; vueltas < 5; vueltas++) {
    if (esHeic(actual)) {
      try { actual = await heicAJpg(actual); }
      catch { return { error: 'No he podido leer esa foto HEIC. Prueba a exportarla como JPG desde Fotos, o elige otra.' }; }
    }
    if (!esImagenTratable(actual)) return { archivo: actual };
    if (maxLado) {
      try { actual = await comprimirImagen(actual, maxLado, 0.9); } catch { /* se sube tal cual */ }
    }
    if (actual.size <= LIMITE_IMAGEN) return { archivo: actual };
    const { preguntarImagenGrande } = await import('../components/ui/DialogoImagenGrande');
    const e = await preguntarImagenGrande(actual);
    if (e.tipo === 'cancelar') return { error: 'No se ha subido: la imagen pesaba demasiado.' };
    if (e.tipo === 'otro') { actual = e.archivo; continue; }
    if (e.tipo === 'original') return { archivo: actual };
    try {
      let c = await comprimirImagen(actual, 2000, 0.82);
      if (c.size > LIMITE_IMAGEN) c = await comprimirImagen(c, 1400, 0.72);
      return { archivo: c };
    } catch { return { error: 'No he podido comprimir esa imagen. Elige otra.' }; }
  }
  return { archivo: actual };
}