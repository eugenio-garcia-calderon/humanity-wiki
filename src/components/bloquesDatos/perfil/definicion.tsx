import { lazy } from 'react';
import { UserRound } from 'lucide-react';
import { definirBloque } from '../tipos';

// La cabecera del perfil de una persona (2026-10-26, Eugenio). Va la primera en
// la página de una fila de «Personas» y hace de cabecera. Ver `Lectura.tsx`.
export default definirBloque({
  tipo: 'perfil',
  label: 'Perfil de persona',
  icon: UserRound,
  grupo: 'datos',
  desc: 'Foto, nombre y apellidos, áreas, alcance, seguir, conectar y editar su perfil',
  claves: 'perfil persona autor equipo areas conectar seguir',
  color: 'bg-sky-100 text-sky-700',
  Lectura: lazy(() => import('./Lectura')),
  datosIniciales: () => ({}),
});
