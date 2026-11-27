// Placeholder until the research lands (2026-11-27): replaced by the full catalogue.
import type { CategoriaCompra, OpcionCompra, Via } from './tipos';
export const FECHA_BUSQUEDA = '27 de noviembre de 2026';
export const VIAS: Record<Via, string> = { comprar: 'Comprar la carrocería', adaptar: 'Comprar y adaptar', 'a-medida': 'Fabricar a medida', referencia: 'Solo referencia' };
export const CATEGORIAS: Record<CategoriaCompra, string> = {
  velomovil: 'Velomóvil', microcoche: 'Microcoche', 'replica-burbuja': 'Réplica de coche burbuja', 'aviacion-velero': 'Velero (avión)', 'aviacion-ultraligero': 'Ultraligero',
  evtol: 'eVTOL', autogiro: 'Autogiro', 'competicion-eficiencia': 'Competición de eficiencia', 'coche-solar': 'Coche solar', 'fabricante-fibra-china': 'Fábrica de fibra (Asia)',
  'taller-composite-europa': 'Taller de composite (Europa)', 'fabricacion-propia': 'Fabricación propia', 'kart-buggy': 'Kart o buggy', 'piezas-sueltas': 'Piezas sueltas', otros: 'Otros',
};
export const RECOMENDACION: string[] = [];
export const OPCIONES_CARENADO: OpcionCompra[] = [];
