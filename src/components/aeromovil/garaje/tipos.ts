import type * as THREE from 'three';

/**
 * Un vehículo del garaje: un modelo 3D de otro coche para ponerlo al lado del
 * nuestro y compararlo (2026-11-06, Eugenio: «un garaje lleno de vehículos»).
 *
 * Convenio de ejes, el mismo que el Aeromóvil: X hacia delante (el morro en
 * x > 0), Y hacia arriba, Z lateral (+ es la izquierda del coche). El eje
 * delantero está en x = 0 y el suelo en y = 0. Unidades: metros. El modelo se
 * construye con `three` y devuelve un Group con todo dentro; el visor lo
 * coloca, lo gira y lo oculta él solo.
 */
export interface VehiculoGaraje {
  id: string;
  nombre: string;
  /** Medidas reales de la ficha del fabricante (m): sirven para comprobar el modelo y para la etiqueta. */
  largo: number; ancho: number; alto: number; batalla: number;
  /** De dónde salen las medidas (una URL o el nombre de la ficha). */
  fuente: string;
  /**
   * Aerodinámica, para el túnel de viento: coeficiente de arrastre, área
   * frontal (m²) y de dónde salen. Sin este dato el túnel no inventa una cifra:
   * dibuja el humo y dice que no lo sabe.
   */
  aero?: { cd: number; area: number; fuente: string };
  /** Silueta para el túnel: [x, y del suelo de la carrocería, y del techo, media anchura], de delante a atrás. */
  envolvente?: [number, number, number, number][];
  /** Construye el vehículo: un Group nuevo cada vez (el visor lo destruye al ocultarlo). */
  construir: () => THREE.Group;
}
