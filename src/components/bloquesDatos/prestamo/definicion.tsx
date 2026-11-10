import { lazy } from 'react';
import { HandCoins } from 'lucide-react';
import { definirBloque } from '../tipos';
import { CONFIG_POR_DEFECTO } from './contrato';

// Formalizar un préstamo a una entidad: datos, condiciones y firma, transferencia (2026-11-10,
// Eugenio en solarcrowd.com). Ver `contrato.ts` (el contrato) y `server/prestamos.ts` (la firma).
export default definirBloque({
  tipo: 'prestamo',
  label: 'Formalizar préstamo',
  icon: HandCoins,
  grupo: 'datos',
  desc: 'Botón «Realizar préstamo»: datos, condiciones y firma, transferencia con justificante, copia por correo',
  claves: 'prestamo préstamo prestar crowdlending firma contrato transferencia justificante solarcrowd',
  color: 'bg-amber-100 text-amber-800',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ ...CONFIG_POR_DEFECTO }),
});
