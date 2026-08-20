// ============================================================================
// EL ICONO DE UNA COSA (2026-08-20, petición de Eugenio: «añade la opción de
// añadir una imagen como icono de las páginas del menú»).
// ============================================================================
// Un icono puede ser DOS COSAS y se guardan en el mismo sitio:
//
//   · un EMOJI  — «🚐», dos caracteres, sin subir nada.
//   · una IMAGEN — «/uploads/2026/08/…png», una foto tuya.
//
// SE DISTINGUEN MIRANDO EL VALOR, no con una columna «tipo» al lado. Un icono
// que empieza por «/» o por «http» es una dirección; cualquier otra cosa es un
// emoji. Una columna aparte para decir cuál de los dos es sería un dato que
// puede contradecir al otro — y el día que se contradigan, se pinta mal.
//
// Por eso añadir imágenes no ha costado ninguna migración: la columna `icono`
// que ya existía vale para las dos.

/** ¿Ese icono es una imagen? */
export const esImagen = (icono?: string | null) =>
  !!icono && (icono.startsWith('/') || icono.startsWith('http'));

export default function Icono({ valor, tamano = 20, className = '' }: {
  valor?: string | null;
  /** Lado en píxeles. La imagen se recorta en cuadrado y el emoji se ajusta. */
  tamano?: number;
  className?: string;
}) {
  if (!valor) return null;
  if (esImagen(valor)) {
    return (
      <img
        src={valor}
        alt=""
        loading="lazy"
        style={{ width: tamano, height: tamano }}
        className={`rounded object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <span
      // El emoji se pinta un pelín más pequeño que el hueco: a igual altura,
      // un emoji ocupa más que un icono de trazo y descuadra la fila.
      style={{ fontSize: Math.round(tamano * 0.85), lineHeight: 1, width: tamano }}
      className={`text-center shrink-0 ${className}`}
    >
      {valor}
    </span>
  );
}
