import { lazy } from 'react';
import { GitBranch } from 'lucide-react';
import { definirBloque } from '../tipos';

// ============================================================================
// EL ÁRBOL DEL CONOCIMIENTO, COMO BLOQUE (2026-10-21, Eugenio)
// ============================================================================
// «Recupera aquel formato para conectar las temáticas de forma ramificada, como
// un árbol del conocimiento de izquierda a derecha, que al pinchar te va
// ampliando; a pantalla completa.» Es el mismo árbol de Preferencias
// (`ArbolDeConocimiento`): la red de conocimiento a la izquierda, las tres
// ramas, los quince objetivos y sus subtemas, que se abren al pulsar. Sólo
// para mirar: moverlo sigue siendo cosa de Preferencias.
export default definirBloque({
  tipo: 'arbolConocimiento',
  label: 'Árbol del conocimiento',
  icon: GitBranch,
  grupo: 'herramienta',
  desc: 'Las temáticas ramificadas de izquierda a derecha: se abren al pulsar',
  claves: 'arbol conocimiento esquema ramas temas objetivos subtemas red',
  color: 'bg-emerald-100 text-emerald-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ alto: 'pantalla', escala: 1.3 }),
});
