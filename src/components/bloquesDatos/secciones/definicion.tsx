import { lazy } from 'react';
import { LayoutGrid } from 'lucide-react';
import { definirBloque } from '../tipos';

// ============================================================================
// LAS SECCIONES DEL SITIO, COMO BLOQUE (2026-10-18, Wikiproducts W2)
// ============================================================================
// Ronda 1 del evaluador: la portada de Wikiproducts eran tres enlaces de texto
// y las cinco subcategorías no tenían enlace propio. Este bloque enseña las
// páginas del sitio que tienen un catálogo de fichas (Powerbanks, Paneles…),
// cada una con su imagen y cuántos productos tiene. Se calcula solo: una
// sección nueva sale sin tocar la portada. Ver `seccionesDe` en
// `src/server/buscadorSitio.ts`.
export default definirBloque({
  tipo: 'secciones',
  label: 'Secciones del sitio',
  icon: LayoutGrid,
  grupo: 'herramienta',
  desc: 'Las páginas del sitio con catálogo, con su imagen y cuántas fichas tienen',
  claves: 'secciones categorias subcategorias catalogo portada indice navegacion productos',
  color: 'bg-slate-100 text-slate-700',
  Lectura: lazy(() => import('./Lectura')),
  datosIniciales: () => ({ titulo: '' }),
});
