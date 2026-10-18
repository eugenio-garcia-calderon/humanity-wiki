import { lazy } from 'react';
import { GraduationCap } from 'lucide-react';
import { definirBloque } from '../tipos';

// 3.12 del plan de Wikiproducts: reservar y pagar una consulta con un
// experto. El servidor es `src/server/expertos.ts`.
export default definirBloque({
  tipo: 'experto',
  label: 'Reservar experto',
  icon: GraduationCap,
  desc: 'Expertos con agenda: se elige hora, se paga y se abre un chat',
  color: 'text-sky-600',
  claves: 'consulta asesor especialista cita agenda reserva pago consultoría',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  // `expertos`: ids para enseñar sólo algunos (vacío = todos los del sitio).
  datosIniciales: () => ({ titulo: 'Pide consejo a un experto', intro: '', expertos: [] }),
});
