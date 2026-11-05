// Subir una imagen al calendario SIN cuenta (2026-11-05). `/api/uploads`, el
// general, pide sesión; el calendario tiene su propia puerta, solo para
// imágenes y con freno por IP (`src/server/calendarioArte.ts`).
//
// · `original: true` — la ilustración que va a imprenta: se sube tal cual
//   (solo se convierte si es una foto HEIC del iPhone, que el servidor no admite).
// · sin `original` — una foto de referencia: se comprime por debajo de ~1 MB,
//   que para inspirarse sobra y no llena el disco.
import { mensajeAmable } from '../../utils/respuestasAmables';

export async function subirImagenCalendario(f: File, opciones?: { original?: boolean }): Promise<{ url: string } | { error: string }> {
  const { esHeic, heicAJpg, comprimirHasta } = await import('../../utils/prepararImagen');
  let archivo: File = f;
  try {
    if (esHeic(archivo)) archivo = await heicAJpg(archivo);
    if (!opciones?.original) archivo = await comprimirHasta(archivo);
  } catch {
    if (esHeic(f)) return { error: 'No he podido leer esa foto HEIC. Expórtala como JPG y vuelve a probar.' };
  }
  const tipo = archivo.type || 'image/jpeg';
  try {
    const r = await fetch(`/api/calendario-arte/subir?type=${encodeURIComponent(tipo)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: archivo,
    });
    let j: any = {};
    try { j = await r.json(); } catch { /* respuesta no JSON (proxy) */ }
    if (!r.ok || !j?.url) return { error: j?.error || mensajeAmable(r.status) };
    return { url: j.url as string };
  } catch {
    return { error: 'No hay conexión. Vuelve a probar en un momento.' };
  }
}
