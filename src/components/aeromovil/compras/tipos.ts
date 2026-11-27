/**
 * «Compras» (2026-11-27, Eugenio: «Realiza el departamento de compras dentro de la herramienta de aeromóvil. Y clasifica
 * todas las opciones que tenemos para poder comprar a un proveedor un chasis con carrocería parecida a la del vehículo de
 * producción… Es nuestro cuello de botella principal… necesitamos un carenado»).
 *
 * One record per buying option for the body shell. Written from web research (six research agents, then checked):
 * nothing invented. A price is copied as the page shows it; when the page gives none, `estimacion` says so and why.
 * `verificado` records whether the page was actually opened, and when.
 */
export type CategoriaCompra =
  | 'velomovil' | 'microcoche' | 'replica-burbuja' | 'aviacion-velero' | 'aviacion-ultraligero' | 'evtol' | 'autogiro'
  | 'competicion-eficiencia' | 'coche-solar' | 'fabricante-fibra-china' | 'taller-composite-europa' | 'fabricacion-propia'
  | 'kart-buggy' | 'piezas-sueltas' | 'otros';

/** How the option gets us a shell: bought as it is, bought and adapted, made to our design, or only a reference. */
export type Via = 'comprar' | 'adaptar' | 'a-medida' | 'referencia';

export interface OpcionCompra {
  id: string;
  nombre: string;
  proveedor: string;
  pais: string;
  url: string;
  categoria: CategoriaCompra;
  via: Via;
  queSeCompra: string;          // shell only / kit / rolling chassis / complete vehicle / mould / service
  precio: string;               // exactly as the page shows it, or «a consultar»
  precioEur: number | null;     // approximate, for sorting; null when unknown
  estimacion?: string;          // only when the page shows no price: the estimate and why
  medidas?: string;
  plazas?: string;
  parecido: 1 | 2 | 3 | 4 | 5;  // 5 = narrow teardrop tandem cabin with outboard wheels, like the render
  porQueParecido: string;
  ruedasFuera?: boolean | null;
  material?: string;
  pros: string[];
  contras: string[];
  plazo?: string;
  estado: 'disponible' | 'segunda-mano' | 'descatalogado' | 'prototipo' | 'no-se-vende' | 'bajo-pedido';
  verificado: string;           // «sí, abierta el 2026-11-27» or «no: …»
  notas?: string;
}
