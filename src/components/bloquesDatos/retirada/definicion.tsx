import { lazy } from 'react';
import { ShieldAlert } from 'lucide-react';
import { definirBloque } from '../tipos';
import '../ficha/useFicha';

export default definirBloque({
  tipo: 'retirada',
  label: 'Retiradas y alertas',
  icon: ShieldAlert,
  desc: 'Retiradas del mercado y alertas de seguridad, de cualquier país',
  claves: 'retirada recall alerta seguridad safety gate rapex',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ modo: 'fila', titulo: 'Retiradas y alertas de seguridad' }),
});
