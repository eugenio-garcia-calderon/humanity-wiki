import type { Departamento } from './tipos';

// Pendiente: el contenido lo escribe un bot (2026-11-06). Mientras, solo el nombre y qué deslizadores son suyos.
export const DEPARTAMENTO: Departamento = {
  id: 'energia', nombre: 'Batería, carga y energía solar', lema: 'la energía: celdas, BMS, cargador, cableado de alta tensión y paneles',
  mision: 'Pendiente de escribir.',
  responsabilidades: [],
  parametros: ['kWh', 'whKg', 'whL', 'altBat', 'mSolarM2', 'sol'],
  componentes: ['bateria', 'cargador', 'cableadoHV', 'solar'],
  tareas: [], decisiones: [], partners: [], mensajes: [], referencias: [],
  revisado: { fecha: '2026-11-06', por: 'nadie todavía' },
};
