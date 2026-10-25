import { lazy } from 'react';
import { MapPin } from 'lucide-react';
import { definirBloque } from '../tipos';

// Elegir un territorio y que las bases de datos de la página enseñen solo lo de
// ese territorio (2026-10-25, Eugenio: «un filtro de territorio, y por defecto
// España»). Ver `Lectura.tsx`.
export default definirBloque({
  tipo: 'filtroTerritorio',
  label: 'Filtro de territorio',
  icon: MapPin,
  grupo: 'datos',
  desc: 'Elige un territorio y la base de datos enseña solo lo suyo',
  claves: 'filtro territorio pais region municipio espana selector',
  color: 'bg-emerald-100 text-emerald-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({}),
});
