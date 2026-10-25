import { lazy } from 'react';
import { Thermometer } from 'lucide-react';
import { definirBloque } from '../tipos';

// El termómetro del 0 al 10 de un sistema en un territorio (2026-10-25,
// Eugenio). Ver `Lectura.tsx`.
export default definirBloque({
  tipo: 'termometro',
  label: 'Termómetro de nivel',
  icon: Thermometer,
  grupo: 'datos',
  desc: 'La nota del 0 al 10, sus niveles, los fallos y cómo subir de nivel',
  claves: 'termometro nivel nota evolucion fallos mejoras soluciones escala',
  color: 'bg-orange-100 text-orange-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({}),
});
