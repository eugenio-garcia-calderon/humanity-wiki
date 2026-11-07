import { lazy } from 'react';
import { Sparkles } from 'lucide-react';
import { definirBloque } from '../tipos';

// ============================================================================
// UNA SECCIÓN CALCULADA DE LAS PÁGINAS PROPIAS DE UN ESCAPARATE (2026-11-07)
// ============================================================================
// Las páginas «Colabora», «Sala de prensa» y «Quiénes somos» de luzhumanidad.com se
// escriben en el editor como cualquier otra; lo que se calcula solo (las formas de
// colaborar con el formulario, las cifras, las notas de prensa, lo publicado en los
// medios, el kit de prensa, el equipo, las áreas, la transparencia) es este bloque,
// con `datos.seccion` diciendo cuál (`sitio/reglasPaginasEscaparate.ts`). Quien edita lo
// mueve, lo quita o escribe alrededor; el contenido se pone al día solo.
//
// FUERA DEL MENÚ «+» (`enMenu: false`): cada sección necesita saber de qué sitio es
// (`datos.raiz`) y solo tiene sentido en un escaparate. Las crea quien prepara esas
// páginas; en el editor se ven con su nombre y lo que enseñarán.
export default definirBloque({
  tipo: 'escaparate',
  label: 'Sección del escaparate',
  icon: Sparkles,
  grupo: 'datos',
  desc: 'Una parte que se rellena sola con los datos del sitio: formulario, cifras, prensa, equipo…',
  claves: 'colabora prensa quienes somos equipo cifras transparencia escaparate',
  color: 'bg-amber-100 text-amber-800',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  enMenu: false,
});
