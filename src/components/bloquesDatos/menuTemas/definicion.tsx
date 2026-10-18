import { lazy } from 'react';
import { LayoutList } from 'lucide-react';
import { definirBloque } from '../tipos';
import { temasDeLaHumanidad } from './temas';

// ============================================================================
// EL MENÚ DE TEMAS, COMO BLOQUE (2026-10-18, Humanidad Wiki, fase 1)
// ============================================================================
// Eugenio: el menú de temas de Explorar «mola mucho», pero era código de la
// aplicación. Como bloque, cualquiera lo pone en su página y lo replica: los
// temas (nombre, icono, color, adónde llevan y sus subtemas) se editan en el
// propio bloque. Nace con los temas de la humanidad (los mismos quince del menú).
export default definirBloque({
  tipo: 'menuTemas',
  label: 'Menú de temas',
  icon: LayoutList,
  grupo: 'herramienta',
  desc: 'Temas con icono y color que llevan a sus páginas, como el menú de Explorar',
  claves: 'temas menu explorar categorias objetivos indice navegacion',
  color: 'bg-emerald-100 text-emerald-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ titulo: 'Temas', forma: 'lista', temas: temasDeLaHumanidad() }),
});
