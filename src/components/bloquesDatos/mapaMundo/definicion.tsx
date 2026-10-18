import { lazy } from 'react';
import { Globe2 } from 'lucide-react';
import { definirBloque } from '../tipos';

// ============================================================================
// EL MAPA DE INDICADORES DEL MUNDO, COMO BLOQUE (2026-10-18, Eugenio)
// ============================================================================
// «El mapa del mundo con indicadores es un proyecto concreto, no la herramienta
// Mapas: llévatelo a la página Humanidad Wiki.» Es el mismo mapa de `/mapa`,
// dentro de un marco (la app, en un marco, se pinta sin menús), con el alto que
// se elija y un enlace para abrirlo a pantalla completa.
export default definirBloque({
  tipo: 'mapaMundo',
  label: 'Mapa de indicadores del mundo',
  icon: Globe2,
  grupo: 'herramienta',
  desc: 'El mapa del mundo con los indicadores de la humanidad por territorio',
  claves: 'mapa mundo indicadores territorios paises regiones humanidad',
  color: 'bg-sky-100 text-sky-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ alto: 560, territorio: '' }),
});
