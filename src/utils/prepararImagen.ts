// ============================================================================
// ANTES DE SUBIR UNA IMAGEN (2026-10-02)
// ============================================================================
// Eugenio: «estoy añadiendo un icono con imagen propia y, al ser el formato de
// iPhone, que es .heic, no le está gustando. Arréglalo para que se pueda subir
// cualquier tipo de archivo. Pon un límite de tamaño para que no cargue lento
// la página, pero si el archivo es muy grande dale la opción de escoger otro o
// de comprimir la imagen».
//
// Lo que pasaba: el servidor no admite HEIC —y hace bien: Chrome, Firefox y
// Android no saben enseñarlo, así que una imagen guardada así saldría rota a
// casi todos—, y el icono del editor tiraba el error sin decir nada.
//
// Lo que se hace ahora, en el navegador y antes de subir:
//   1. HEIC/HEIF se convierte a JPG. La librería (`heic-to`, ~3 MB) se baja
//      SÓLO cuando alguien elige un HEIC: a nadie más le cuesta nada.
//   2. Si la imagen pasa de `LIMITE_IMAGEN`, se pregunta: comprimirla o elegir
//      otra (`DialogoImagenGrande`).
//   3. Comprimir = reducir a un lado máximo y volver a guardar en JPG (o WebP
//      si tiene transparencia), con calidad alta. Una foto de móvil de 4 MB
//      queda en unos 400-700 KB y no se nota en pantalla.
//
// Los GIF y los SVG no se tocan: comprimir un GIF le quita la animación, y un
// SVG es texto, no píxeles.

/** A partir de aquí se pregunta. 3 MB es una foto de móvil normal; una página
 *  con diez así ya tarda en un teléfono. */
export const LIMITE_IMAGEN = 3 * 1024 * 1024;

/** Lo máximo que acepta el servidor para una imagen (uploads.ts, MAX_BYTES). */
export const MAXIMO_SERVIDOR = 10 * 1024 * 1024;

export const esHeic = (f: File) =>
  /^image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

/** ¿Es una imagen que se puede convertir o comprimir aquí? */
export const esImagenTratable = (f: File) =>
  esHeic(f) || (/^image\//.test(f.type) && !/gif|svg/.test(f.type));

const otroNombre = (nombre: string, ext: string) => nombre.replace(/\.[^.]+$/, '') + '.' + ext;

/** HEIC → JPG. Lanza si el archivo no se puede leer. */
export async function heicAJpg(f: File): Promise<File> {
  const { heicTo } = await import('heic-to');
  const blob = await heicTo({ blob: f, type: 'image/jpeg', quality: 0.9 });
  return new File([blob], otroNombre(f.name || 'foto.heic', 'jpg'), { type: 'image/jpeg' });
}

/** ¿Tiene algún píxel transparente? Si lo tiene, JPG lo pintaría de negro. */
function tieneTransparencia(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true;
  return false;
}

/**
 * Reduce una imagen a `maxLado` píxeles por el lado largo y la vuelve a
 * guardar. Si sale MÁS grande que la original (una imagen pequeña ya muy
 * comprimida), se queda la original.
 */
export async function comprimirImagen(f: File, maxLado = 2000, calidad = 0.82): Promise<File> {
  const bmp = await createImageBitmap(f);
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const transparente = /png|webp|avif/.test(f.type) && tieneTransparencia(ctx, w, h);
  const tipo = transparente ? 'image/webp' : 'image/jpeg';
  const blob: Blob | null = await new Promise(ok => canvas.toBlob(ok, tipo, calidad));
  // Un navegador que no sabe escribir WebP devuelve PNG: vale igual.
  if (!blob || blob.size >= f.size) return f;
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  return new File([blob], otroNombre(f.name || 'imagen', ext), { type: blob.type });
}

export const tamanoLegible = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
