import { lazy } from 'react';
import { ListTree } from 'lucide-react';
import { definirBloque } from '../tipos';
// Imported here, eagerly, so the sheets the server wrote into the page are
// copied before anything paints (see `ficha/useFicha.ts`).
import '../ficha/useFicha';

export default definirBloque({
  tipo: 'propiedad',
  label: 'Propiedades de la fila',
  icon: ListTree,
  desc: 'Los datos de esta fila de la base de datos, con su fuente',
  claves: 'ficha producto datos tecnicos propiedades fila plantilla',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ estilo: 'tabla', grupo: 'tecnico' }),
});
