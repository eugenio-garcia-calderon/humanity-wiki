import { lazy } from 'react';
import { BadgeCheck } from 'lucide-react';
import { definirBloque } from '../tipos';
import '../ficha/useFicha';

export default definirBloque({
  tipo: 'afirmacion',
  label: 'Afirmaciones verificadas',
  icon: BadgeCheck,
  desc: 'Lo que dice la publicidad y si es cierto, con sus fuentes',
  claves: 'afirmacion publicidad bulo verificacion desmentido claim',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ modo: 'fila', titulo: 'Afirmaciones publicitarias' }),
});
