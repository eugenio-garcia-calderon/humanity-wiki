import { lazy } from 'react';
import { Heart } from 'lucide-react';
import { definirBloque } from '../tipos';

// Donar con tarjeta, sin cuenta (2026-10-26, Eugenio: «un botón de donar que lleve a la
// página de donar; si no existe, algo sencillo con Stripe»). Ver `Lectura.tsx`.
export default definirBloque({
  tipo: 'donacion',
  label: 'Donación',
  icon: Heart,
  grupo: 'datos',
  desc: 'Importes para elegir y pago con tarjeta por Stripe, sin cuenta',
  claves: 'donar donacion donativo apoyo stripe pago tarjeta',
  color: 'bg-rose-100 text-rose-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ importes: [10, 25, 50, 100, 250], importesMes: [5, 10, 20, 50, 100] }),
});
