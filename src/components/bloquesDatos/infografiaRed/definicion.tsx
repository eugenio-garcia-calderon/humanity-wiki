import { lazy } from 'react';
import { Network } from 'lucide-react';
import { definirBloque } from '../tipos';
import { PASOS_INFOGRAFIA } from './Infografia';

// La infografía de cómo se conecta el conocimiento (2026-10-22, Eugenio). Ver
// `Infografia.tsx`. También va dentro del bloque «Presentación».
export default definirBloque({
  tipo: 'infografiaRed',
  label: 'Infografía: cómo funciona la red',
  icon: Network,
  grupo: 'herramienta',
  desc: 'Seis dibujos que explican fácil cómo se conectan las bases de datos',
  claves: 'infografia red grafo conexiones bases datos explicar como funciona esquema',
  color: 'bg-amber-100 text-amber-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ titulo: 'Cómo funciona, explicado fácil', texto: 'La idea matemática que hay detrás —una red ordenada por un árbol de temas— en seis dibujos.', pasos: PASOS_INFOGRAFIA }),
});
