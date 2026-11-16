// Viewer layers: which groups a car is drawn into, and the point type.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.


/** Las capas. `solo` limita una capa a un vehículo: la dirección y la transmisión son del Aeromóvil 1. */
export const CAPAS = [
  { k: 'carenado', n: 'Carrocería', color: 'bg-zinc-300' },
  { k: 'cristales', n: 'Cristales', color: 'bg-sky-900' },
  { k: 'solar', n: 'Paneles solares', color: 'bg-indigo-900' },
  { k: 'chasis', n: 'Chasis', color: 'bg-zinc-400' },
  { k: 'suspension', n: 'Suspensión', color: 'bg-amber-500' },
  { k: 'direccion', n: 'Dirección', color: 'bg-stone-500', solo: 'a1' },
  { k: 'ruedas', n: 'Ruedas y frenos', color: 'bg-neutral-900' },
  { k: 'asientos', n: 'Asientos', color: 'bg-zinc-700' },
  { k: 'ocupantes', n: 'Ocupantes', color: 'bg-orange-300' },
  { k: 'motor', n: 'Motor', color: 'bg-red-700' },
  { k: 'transmision', n: 'Transmisión', color: 'bg-rose-900', solo: 'a1' },
  { k: 'baterias', n: 'Baterías', color: 'bg-blue-600' },
] as const;
export type CapaId = typeof CAPAS[number]['k'];
export type V3 = [number, number, number];
