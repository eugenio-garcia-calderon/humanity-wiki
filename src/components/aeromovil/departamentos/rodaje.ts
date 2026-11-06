import type { Departamento } from './tipos';

// Pendiente: el contenido lo escribe un bot (2026-11-06). Mientras, solo el nombre y qué deslizadores son suyos.
export const DEPARTAMENTO: Departamento = {
  id: 'rodaje', nombre: 'Suspensión, dirección, frenos y ruedas', lema: 'lo que toca el suelo y lo que lo gobierna',
  mision: 'Pendiente de escribir.',
  responsabilidades: [],
  parametros: ['B', 'viaF', 'viaR', 'neumF', 'neumR', 'mRueda', 'mSuspension', 'mFrenos', 'mDireccion'],
  componentes: ['ruedas', 'frenos', 'suspension', 'direccion'],
  tareas: [], decisiones: [], partners: [], mensajes: [], referencias: [],
  revisado: { fecha: '2026-11-06', por: 'nadie todavía' },
};
