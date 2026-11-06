import type { Departamento } from './tipos';

// Pendiente: el contenido lo escribe un bot (2026-11-06). Mientras, solo el nombre y qué deslizadores son suyos.
export const DEPARTAMENTO: Departamento = {
  id: 'interior', nombre: 'Interior y ergonomía', lema: 'el puesto de conducción y el pasajero: asientos, mandos, visibilidad',
  mision: 'Pendiente de escribir.',
  responsabilidades: [],
  parametros: ['plazas', 'xPil', 'xPas', 'recPil', 'recPas', 'altPil', 'altPas', 'volAlt', 'volDist', 'pedDist', 'pedAlt', 'mAsiento', 'mOcc'],
  componentes: ['asiento', 'equipo'],
  tareas: [], decisiones: [], partners: [], mensajes: [], referencias: [],
  revisado: { fecha: '2026-11-06', por: 'nadie todavía' },
};
