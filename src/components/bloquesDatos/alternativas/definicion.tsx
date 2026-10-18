import { lazy } from 'react';
import { Trophy } from 'lucide-react';
import { definirBloque } from '../tipos';
import '../ficha/useFicha';

export default definirBloque({
  tipo: 'alternativas',
  label: 'La mejor en cada criterio',
  icon: Trophy,
  desc: 'Qué fila gana en cada dato o valoración de su base de datos',
  claves: 'alternativas mejor ranking criterio recomendacion',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ titulo: 'La mejor en cada criterio' }),
});
