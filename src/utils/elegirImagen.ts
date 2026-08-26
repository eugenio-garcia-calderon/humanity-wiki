import { subirArchivo } from './subir';

// ============================================================================
// ELEGIR UNA IMAGEN Y SUBIRLA (2026-08-26)
// ============================================================================
// Tres sitios nuevos piden lo mismo el mismo día —la portada de una rama, la
// portada de un proyecto y la galería—: abrir el selector de archivos, aceptar
// sólo imágenes y subirlas. Escrito tres veces serían tres formas distintas de
// contar el mismo fallo, que es exactamente lo que le pasó a `/api/uploads`
// antes de que existiera `subirArchivo` (quince copias, ninguna igual).
//
// NO LANZA: devuelve `{ urls }` o `{ error }`, igual que `subirArchivo`. Quien
// llama decide qué enseñar, y nadie se queda con la pantalla a medias por
// olvidar un `try`.

/** Abre el selector del sistema y resuelve con lo que se haya elegido. */
export function pedirImagenes(varias = false): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = varias;
    // Fuera de la pantalla y no `display:none`: en algunos navegadores un
    // input oculto del todo no abre el diálogo.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);

    let resuelto = false;
    const acabar = (fs: File[]) => {
      if (resuelto) return;
      resuelto = true;
      input.remove();
      resolve(fs);
    };
    input.onchange = () => acabar(Array.from(input.files || []));
    // CANCELAR TAMBIÉN TIENE QUE RESOLVER. Sin esto, quien abre el diálogo y
    // le da a «Cancelar» deja una promesa colgada para siempre — y con ella el
    // «Subiendo…» de la pantalla, que es la forma más clara de parecer roto.
    // `cancel` no lo emiten todos los navegadores; el `focus` de vuelta a la
    // ventana sí ocurre siempre, y para entonces `files` ya está puesto.
    input.oncancel = () => acabar([]);
    window.addEventListener('focus', () => {
      setTimeout(() => acabar(Array.from(input.files || [])), 400);
    }, { once: true });

    input.click();
  });
}

export type Subidas = { urls: string[]; error?: undefined } | { urls?: undefined; error: string };

/** Sube una lista de imágenes, en orden, y devuelve sus direcciones. */
export async function subirImagenes(archivos: File[]): Promise<Subidas> {
  const urls: string[] = [];
  for (const f of archivos) {
    // Se comprueba aquí y no sólo con el `accept` del diálogo: `accept` es una
    // sugerencia —se puede elegir «todos los archivos»— y esto también lo usa
    // el pegado, donde no hay diálogo ninguno.
    if (!f.type.startsWith('image/')) {
      return { error: `«${f.name || 'ese archivo'}» no es una imagen.` };
    }
    const u = await subirArchivo(f);
    if (u.error) return { error: u.error };
    urls.push(u.url);
  }
  return { urls };
}

/** El caso corriente: pedir imágenes y subirlas de una vez. */
export async function elegirYSubirImagenes(varias = false): Promise<Subidas> {
  const fs = await pedirImagenes(varias);
  if (!fs.length) return { urls: [] };
  return subirImagenes(fs);
}
