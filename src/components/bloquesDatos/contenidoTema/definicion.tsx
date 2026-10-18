import { lazy } from 'react';
import { Compass } from 'lucide-react';
import { definirBloque } from '../tipos';

// ============================================================================
// EL CONTENIDO DE UN TEMA, COMO BLOQUE (2026-10-18, Humanidad Wiki, fase 1)
// ============================================================================
// Lo que enseña hoy `/temas/:id/contenido` (páginas, bases de datos,
// publicaciones, carpetas, lienzos, personas y contenido de fuera sobre un
// tema), dentro de cualquier página. Lee lo mismo: `/api/feed-tema/:id`, lo
// público. Con esto, la página de cada tema de Humanidad Wiki es una página
// normal hecha con Wiki Creator.
export default definirBloque({
  tipo: 'contenidoTema',
  label: 'Contenido de un tema',
  icon: Compass,
  grupo: 'herramienta',
  desc: 'Todo lo publicado sobre un tema: páginas, bases de datos, publicaciones…',
  claves: 'tema contenido feed explorar objetivo publicaciones categoria',
  color: 'bg-sky-100 text-sky-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ tema: 'O001', porSeccion: 6 }),
});
