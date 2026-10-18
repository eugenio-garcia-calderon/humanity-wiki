import { lazy } from 'react';
import { Star } from 'lucide-react';
import { definirBloque } from '../tipos';

// 3.3 · Valoración multicriterio (Wikiproducts W4). The community's 1-5 note
// on each criterion of the row this page belongs to, and the stars to vote.
// The criteria are the «Nota de la comunidad» columns of the row's table; the
// maths is in `src/server/bd/comunidad.ts`.
export default definirBloque({
  tipo: 'valoracion',
  label: 'Valoración de la comunidad',
  icon: Star,
  desc: 'Notas 1–5 por criterio, con votos',
  color: 'text-amber-500',
  claves: 'puntuar puntuación votar votos estrellas opiniones criterios calidad precio ética nota',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({}),
});
