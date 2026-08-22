/**
 * EL TECHO DEL MUNDO 3D — una sola regla, cliente y servidor.
 *
 * Petición de Eugenio (2026-08-22): «tenemos que limitar el uso del mundo 3D
 * porque a la gente se le puede ir de las manos como a nosotros, tenemos que
 * poner un límite que hay que entender».
 *
 * El «como a nosotros» no es retórico: nosotros mismos plantamos 1.092 árboles
 * en la aldea semilla sin que nada nos avisara, y hubo que quitar el 95% a mano.
 * Nadie está sufriendo esto hoy —en producción hay 1 persona con 1 objeto—, así
 * que esto es prevención, no incendio.
 *
 * POR QUÉ SON DOS NÚMEROS Y NO UNO
 * --------------------------------
 * Porque 200 farolas y 200 cuadros no cuestan lo mismo, y un techo único
 * mentiría sobre cuál de las dos cosas te está costando el mundo:
 *
 *   - Una COSA sin foto propia (farola, banco, nota, enlace, mapa, lienzo)
 *     cuesta ~5 mallas que dibujar y 439 bytes que viajan en cada entrada al
 *     mundo. Los 439 bytes están medidos sobre una fila real de producción;
 *     las ~5 mallas salen de contar 230 mallas entre los 45 tipos de
 *     `Objetos.tsx`, que además no se instancian.
 *
 *   - Una cosa CON FOTO propia (imagen, vídeo, producto) sube además una
 *     textura a la GPU: del orden de 5,6 MB a 1024² con mipmaps. Ese es el
 *     gasto que hizo que el mundo entero pesara 690 MB antes de aligerarlo.
 *
 * De ahí que `lienzo`, `mapa`, `musica` y `enlace` NO cuenten como foto: se
 * dibujan con `TarjetaMedio`, que es color plano y texto. Lo comprobé antes de
 * escribir el número, y me habría equivocado si no.
 *
 * LO QUE NO SÉ, Y NO SE PUEDE LEER AQUÍ COMO SI LO SUPIERA
 * -------------------------------------------------------
 * En qué número exacto se atasca un móvil normal. El 200 sale del coste por
 * objeto, no de haber visto un móvil sufrir. Para saberlo haría falta medir
 * dibujos por fotograma con 50, 200 y 500 objetos en un teléfono de verdad.
 * Hasta entonces el techo está deliberadamente muy por debajo de lo único que
 * sí sabemos que duele —los 1.092 árboles—, y se puede subir con datos.
 */

/** Los tres tipos que suben una foto propia a la GPU. */
export const TIPOS_CON_FOTO = new Set(['imagen', 'video', 'producto']);

export const TECHO_COSAS = 200;
export const AVISO_COSAS = 120;
export const TECHO_FOTOS = 40;
export const AVISO_FOTOS = 25;

export type ItemContable = { tipo?: string | null };

export function contarMundo(items: readonly ItemContable[]) {
  let cosas = 0, fotos = 0;
  for (const it of items) {
    cosas++;
    if (it.tipo && TIPOS_CON_FOTO.has(it.tipo)) fotos++;
  }
  return { cosas, fotos };
}

export type NivelTecho = 'bien' | 'aviso' | 'lleno';

export type EstadoTecho = {
  cosas: number; fotos: number;
  nivel: NivelTecho;
  /** Qué frenaría lo siguiente que plantes, o null si no frena nada. */
  motivo: 'cosas' | 'fotos' | null;
  mensaje: string | null;
};

/**
 * En qué punto del techo estás. Se llama MIENTRAS construyes, no al guardar:
 * un techo que solo aparece al final borra trabajo ya hecho.
 *
 * `tipoSiguiente` es lo que estás a punto de plantar, si se sabe: sin él la
 * respuesta habla del mundo, con él habla de tu próximo clic.
 */
export function estadoDelTecho(
  items: readonly ItemContable[],
  tipoSiguiente?: string | null,
): EstadoTecho {
  const { cosas, fotos } = contarMundo(items);
  const traeFoto = !!tipoSiguiente && TIPOS_CON_FOTO.has(tipoSiguiente);

  if (cosas >= TECHO_COSAS) return {
    cosas, fotos, nivel: 'lleno', motivo: 'cosas',
    mensaje: `Tu mundo está lleno: ${cosas} cosas. Guarda algo en el almacén para hacer sitio.`,
  };
  if (traeFoto && fotos >= TECHO_FOTOS) return {
    cosas, fotos, nivel: 'lleno', motivo: 'fotos',
    mensaje: `Ya tienes ${fotos} cosas con foto, que es el máximo. Las fotos son lo que más pesa: guarda alguna para poner otra.`,
  };

  // Los avisos van al revés que los techos: primero el que esté más cerca.
  const quedanFotos = TECHO_FOTOS - fotos;
  const quedanCosas = TECHO_COSAS - cosas;
  if (fotos >= AVISO_FOTOS) return {
    cosas, fotos, nivel: 'aviso', motivo: 'fotos',
    mensaje: `${fotos} de ${TECHO_FOTOS} cosas con foto. Te quedan ${quedanFotos}; son las que más pesan.`,
  };
  if (cosas >= AVISO_COSAS) return {
    cosas, fotos, nivel: 'aviso', motivo: 'cosas',
    mensaje: `${cosas} de ${TECHO_COSAS} cosas. Te quedan ${quedanCosas} antes de que el mundo se llene.`,
  };
  return { cosas, fotos, nivel: 'bien', motivo: null, mensaje: null };
}
