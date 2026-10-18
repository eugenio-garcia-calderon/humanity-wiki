import { lazy } from 'react';
import { Columns3 } from 'lucide-react';
import { definirBloque } from '../tipos';
import '../ficha/useFicha';

export default definirBloque({
  tipo: 'comparador',
  label: 'Comparador',
  icon: Columns3,
  desc: 'De 2 a 4 filas lado a lado, con la mejor de cada dato resaltada',
  claves: 'comparar comparativa versus vs productos tabla lado a lado',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ modo: 'fila', titulo: 'Comparar con otros' }),
});
