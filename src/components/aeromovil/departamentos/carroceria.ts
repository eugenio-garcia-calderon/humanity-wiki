import type { Departamento } from './tipos';

// Pendiente: el contenido lo escribe un bot (2026-11-06). Mientras, solo el nombre y qué deslizadores son suyos.
export const DEPARTAMENTO: Departamento = {
  id: 'carroceria', nombre: 'Carrocería, cúpula y aerodinámica', lema: 'la piel: forma, cristales, paneles solares y resistencia al aire',
  mision: 'Pendiente de escribir.',
  responsabilidades: [],
  parametros: ['L', 'fMorro', 'W', 'H', 'deck', 'morroA1', 'posMorro', 'colaA1', 'nU', 'nL', 'cupX0', 'cupX1', 'cupW', 'techoW', 'parabrisas', 'techo', 'inicioSolar', 'jaguar', 'jagAlto', 'jagLargo', 'jagAncho', 'matCarenado', 'espCarenado', 'espCristal'],
  componentes: ['carroceria', 'cupula', 'solar'],
  tareas: [], decisiones: [], partners: [], mensajes: [], referencias: [],
  revisado: { fecha: '2026-11-06', por: 'nadie todavía' },
};
