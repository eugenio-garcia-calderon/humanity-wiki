import type { Departamento } from './tipos';

// Pendiente: el contenido lo escribe un bot (2026-11-06). Mientras, solo el nombre y qué deslizadores son suyos.
export const DEPARTAMENTO: Departamento = {
  id: 'propulsion', nombre: 'Motor, inversor y transmisión', lema: 'la fuerza: motor, electrónica de potencia, reductora y palieres',
  mision: 'Pendiente de escribir.',
  responsabilidades: [],
  parametros: ['kWNom', 'kWPico', 'mMotor', 'mInversor', 'mReductora'],
  componentes: ['motor', 'inversor', 'reductora'],
  tareas: [], decisiones: [], partners: [], mensajes: [], referencias: [],
  revisado: { fecha: '2026-11-06', por: 'nadie todavía' },
};
