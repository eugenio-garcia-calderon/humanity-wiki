import type * as THREE from 'three';

/**
 * Un vehículo del garaje: un modelo 3D de otro coche para ponerlo al lado del
 * nuestro y compararlo (2026-11-06, Eugenio: «un garaje lleno de vehículos»).
 *
 * Convenio de ejes, el mismo que el Aeromóvil: X hacia delante (el morro en
 * x > 0), Y hacia arriba, Z lateral (+ es la derecha del coche). El eje
 * delantero está en x = 0 y el suelo en y = 0. Unidades: metros. El modelo se
 * construye con `three` y devuelve un Group con todo dentro; el visor lo
 * coloca, lo gira y lo oculta él solo.
 */
export interface VehiculoGaraje {
  id: string;
  nombre: string;
  /** Medidas reales de la ficha del fabricante (m): sirven para comprobar el modelo y para la etiqueta. */
  largo: number; ancho: number; alto: number; batalla: number;
  /** Vías delantera y trasera (m, entre centros de rueda), para las cotas. 0 = una sola rueda en ese eje. */
  viaDel?: number; viaTras?: number;
  /** De dónde salen las medidas (una URL o el nombre de la ficha). */
  fuente: string;
  /**
   * Aerodinámica, para el túnel de viento: coeficiente de arrastre, área
   * frontal (m²) y de dónde salen. Sin este dato el consumo no inventa una cifra
   * (el coche queda fuera de la comparación); el túnel sí calcula su propio Cd a
   * partir de la silueta y lo enseña como «estimado por el túnel» (2026-11-09).
   */
  aero?: {
    cd: number; area: number; fuente: string;
    /** Masa en vacío (kg) y plazas, para la rodadura del túnel; velocidad máxima (km/h), para avisar si no llega. */
    masaVacio?: number; plazas?: number; vmax?: number;
  };
  /** Silueta para el túnel: [x, y del suelo de la carrocería, y del techo, media anchura], de delante a atrás. */
  envolvente?: [number, number, number, number][];
  /** Forma de la sección para el túnel: 2 elipse, 3 casi cuadrada (por defecto 3). */
  seccion?: number;
  /** Construye el vehículo: un Group nuevo cada vez (el visor lo destruye al ocultarlo). */
  construir: () => THREE.Group;
  /**
   * Piezas que se abren (2026-11-12, Eugenio: pinchar en el Aptera y abrir sus
   * puertas y su maletero). Cada una es un objeto del grupo que devuelve
   * `construir`, con ese `nombre`, colocado en su bisagra; el visor lo gira
   * `angulo` grados sobre `eje` (en los ejes de su padre). Las de tipo
   * 'puerta' se abren con «Abrir puertas» y las de tipo 'maletero' con «Abrir
   * maletero». Un coche sin esto no enseña esos botones.
   */
  pivotes?: PivoteGaraje[];
}

export interface PivoteGaraje {
  nombre: string;
  tipo: 'puerta' | 'maletero';
  eje: [number, number, number];
  angulo: number;
  /** An object (by name) that the viewer shows only while this piece is open: the frame of its opening. */
  conHueco?: string;
}
