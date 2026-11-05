// ============================================================================
// AEROMÓVIL GOTA · plan de desarrollo (2026-11-05)
// ============================================================================
// Las etapas del proyecto, de la idea a la homologación. Vive en el código
// (no en la base de datos) porque cambia poco y así viaja con cada versión;
// si Eugenio quiere editarlo desde la página, pasa a una tabla como las tareas.
//
// Los presupuestos son ESTIMACIONES de orden de magnitud, en euros, pensando
// en piezas de bicicleta y trabajo propio. El objetivo que Eugenio se puso
// para el carenado y el chasis aerodinámico es no pasar de 10.000 €.

export type EstadoEtapa = 'hecha' | 'en_curso' | 'pendiente';

export interface Etapa {
  n: number;
  nombre: string;
  objetivo: string;
  entregables: string[];
  semanas: [number, number];
  presupuesto: [number, number];
  estado: EstadoEtapa;
}

export const OBJETIVO_PRESUPUESTO = 10_000;

export const PLAN: Etapa[] = [
  {
    n: 0, nombre: 'Concepto y modelo CAD', estado: 'en_curso', semanas: [1, 2], presupuesto: [0, 0],
    objetivo: 'Definir la arquitectura: tándem 1+2, rombo con laterales basculantes, carenado en gota y transmisión sin cadena.',
    entregables: ['Modelo paramétrico por capas (esta página)', 'STEP y STL para cualquier programa de CAD', 'Primera lista de tareas de mejora'],
  },
  {
    n: 1, nombre: 'Validación aerodinámica', estado: 'pendiente', semanas: [2, 4], presupuesto: [0, 600],
    objetivo: 'Comprobar con simulación que la forma da un Cd cercano a 0,15 y que no hay desprendimientos en la cola ni en los huecos de rueda.',
    entregables: ['Simulación CFD (OpenFOAM o SimScale) a 25 y 45 km/h', 'Forma final del carenado congelada', 'Maqueta impresa en 3D a 1:10 para el túnel de humo'],
  },
  {
    n: 2, nombre: 'Chasis rodante', estado: 'pendiente', semanas: [4, 10], presupuesto: [1_800, 3_000],
    objetivo: 'Construir el chasis de aluminio con las cuatro ruedas, la horquilla y el basculante, sin carenado, y rodar con una persona.',
    entregables: ['Plantilla de soldadura cortada desde el DXF del chasis', 'Viga, travesaños y basculante soldados y tratados', 'Prueba de carga estática con 3 × 80 kg'],
  },
  {
    n: 3, nombre: 'Mecanismo basculante y suspensión', estado: 'pendiente', semanas: [8, 14], presupuesto: [900, 1_800],
    objetivo: 'Paralelogramo de las laterales, amortiguador y bloqueo de inclinación funcionando en curva y parado.',
    entregables: ['Paralelogramo con rótulas y casquillos', 'Bloqueo de inclinación para parado', 'Pruebas en curva a 15-25 km/h con datos de inclinación'],
  },
  {
    n: 4, nombre: 'Transmisión eléctrica sin cadena', estado: 'pendiente', semanas: [10, 16], presupuesto: [1_200, 2_200],
    objetivo: 'Generador en el pedalier, controlador, motor de buje de 250 W y baterías, con sensación de pedaleo natural.',
    entregables: ['Generador y controlador chainless integrados', '4 baterías de 36 V con su gestor (BMS)', 'Medición de consumo real en Wh/km'],
  },
  {
    n: 5, nombre: 'Molde y carenado', estado: 'pendiente', semanas: [14, 24], presupuesto: [2_500, 4_500],
    objetivo: 'Fabricar el molde macho con las cuadernas, sacar el molde hembra y laminar el carenado y la cúpula.',
    entregables: ['Cuadernas cortadas desde el DXF 1:1', 'Modelo macho de espuma, enmasillado y lijado', 'Carenado de 1 mm carbono-lino y cúpula de policarbonato termoformado'],
  },
  {
    n: 6, nombre: 'Integración y pruebas', estado: 'pendiente', semanas: [24, 30], presupuesto: [600, 1_200],
    objetivo: 'Montar todo, ajustar puertas, ventilación, luces y frenos, y probar en circuito cerrado.',
    entregables: ['Prototipo completo', 'Informe de pruebas: frenada, estabilidad, autonomía', 'Lista de mejoras para la versión 2'],
  },
  {
    n: 7, nombre: 'Homologación', estado: 'pendiente', semanas: [30, 40], presupuesto: [800, 3_000],
    objetivo: 'Decidir la categoría (bici de pedaleo asistido o vehículo ligero) y preparar la documentación.',
    entregables: ['Consulta a la DGT o a un laboratorio de homologación', 'Expediente técnico', 'Ficha de características'],
  },
];
