// ============================================================================
// EL ICONO DE UNA COSA (2026-08-20, petición de Eugenio: «añade la opción de
// añadir una imagen como icono de las páginas del menú»).
// ============================================================================
// Un icono puede ser TRES COSAS y se guardan en el mismo sitio:
//
//   · un EMOJI  — «🚐», dos caracteres, sin subir nada.
//   · una IMAGEN — «/uploads/2026/08/…png», una foto tuya.
//   · uno DE TRAZO — «lucide:Truck» (D90, 2026-08-21). Monocromo, hereda el
//     color del texto, y es el que se elige solo a partir del nombre.
//
// SE DISTINGUEN MIRANDO EL VALOR, no con una columna «tipo» al lado. Empieza
// por «/» o «http» → es una dirección; empieza por «lucide:» → es de trazo;
// cualquier otra cosa es un emoji. Una columna aparte para decir cuál de los
// tres es sería un dato que puede contradecir al otro — y el día que se
// contradigan, se pinta mal.
//
// Por eso ni las imágenes ni los de trazo han costado una migración de
// estructura: la columna `icono` que ya existía vale para los tres.

import { esDeTrazo } from '../../utils/iconoDeNombre';
import { componenteDeTrazo } from './iconosDeTrazo';

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
  // EL DE TRAZO NO LLEVA COLOR PROPIO (D90, Eugenio: «que los iconos sean
  // siempre en blanco y negro»). Se pinta con `currentColor`, así que toma el
  // color del texto de donde esté: un solo icono vale para fondo claro y para
  // fondo oscuro, y no hay dos versiones que mantener.
  if (esDeTrazo(valor)) {
    const Trazo = componenteDeTrazo(valor);
    return <Trazo style={{ width: tamano, height: tamano }} strokeWidth={1.75} className={`shrink-0 ${className}`} />;
  }
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
