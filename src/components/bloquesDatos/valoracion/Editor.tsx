import { Star } from 'lucide-react';
import type { PropsEditor } from '../tipos';
import { usarValoraciones, Valoraciones, OpinionesFuera } from './Lectura';

// In the editor the block says why it shows nothing, instead of an empty gap:
// it only has something to show on the page of a database row whose table has
// «Nota de la comunidad» columns.
export default function Editor({ datos, paginaId }: PropsEditor) {
  const clave = (typeof datos.fila_id === 'string' && datos.fila_id) || paginaId;
  const { datos: r, fallo, cargar } = usarValoraciones(clave);
  const nota = (texto: string) => (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
      <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <span><b className="text-slate-700">Valoración de la comunidad.</b> {texto}</span>
    </p>
  );
  if (fallo?.codigo === 404) return nota('Va en la página de una fila de una base de datos (la ficha de un producto, de un distribuidor…). Aquí no hay ninguna fila que puntuar.');
  if (fallo) return nota(fallo.texto);
  if (!r) return nota('Cargando…');
  const fuera = r.terceros?.length ? <OpinionesFuera lista={r.terceros} /> : null;
  if (!r.criterios.length) return <>{nota('Añade a su base de datos una o varias propiedades del grupo «Comunidad» (Calidad, Precio, Ética…): cada una es un criterio que la gente puntúa aquí.')}{fuera}</>;
  return <><Valoraciones datos={r} recargar={cargar} />{fuera}</>;
}
