import { lazy } from 'react';
import { Store } from 'lucide-react';
import { definirBloque } from '../tipos';

// EL BLOQUE «OFERTAS» (2026-10-18, Wikiproducts W5, pieza 3.6 del plan).
// «Dónde comprarlo» en la ficha de un producto: cada tienda que lo vende, con
// su precio puesto en casa, su plazo, lo que nos paga por enseñarlo y el botón
// de la cesta. Las ofertas son filas de una base de datos cuya propiedad
// «Producto» apunta a esta ficha (ver el grupo «Ofertas» de propiedades).
//
// `datos`: { tabla_id?: string, fila_id?: string, titulo?: string }
//   · sin `fila_id`, son las ofertas de la ficha en la que está el bloque;
//     con él, las de ese producto (para una página editorial).
//   · sin `tabla_id`, se usa la base de datos de ofertas que apunta a la de
//     la ficha.
export default definirBloque({
  tipo: 'ofertas',
  label: 'Ofertas',
  icon: Store,
  grupo: 'tienda',
  desc: 'Dónde comprarlo: tiendas, precio con envío y comisión',
  claves: 'tiendas precio comprar cesta distribuidores comision donde comprarlo',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({}),
});
