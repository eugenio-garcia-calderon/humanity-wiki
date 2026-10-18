import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir, useTablasPropias } from '../ficha/editor';
import { useTablaFicha } from '../ficha/useFicha';
import { MAX_COMPARAR } from '../ficha/vistas';
import { VistaComparador } from './Lectura';

const MODOS: Array<[string, string]> = [
  ['fila', 'Esta fila y otras de su base de datos'],
  ['fijo', 'Filas elegidas de una base de datos'],
  ['url', 'Las filas que diga la dirección (?comparar=)'],
];

export default function Editor(p: PropsEditor) {
  const { datos, editable, cambiarDatos } = p;
  const modo = String(datos.modo || 'fila');
  const tablas = useTablasPropias();
  const { tabla } = useTablaFicha(modo === 'fijo' ? (datos.tabla_id as string | undefined) : undefined);
  const filas = (Array.isArray(datos.filas) ? datos.filas : []).map(String);
  return (
    <div>
      <Ajustes>
        <Campo etiqueta="Compara">
          <Elegir valor={modo} editable={editable} cambiar={v => cambiarDatos({ modo: v })} opciones={MODOS} />
        </Campo>
        {modo !== 'fila' ? (
          <Campo etiqueta="Base de datos">
            <Elegir valor={String(datos.tabla_id || '')} editable={editable} cambiar={v => cambiarDatos({ tabla_id: v || undefined, filas: [] })}
              opciones={[['', 'Elige una…'], ...tablas.map(t => [t.id, t.titulo] as [string, string])]} />
          </Campo>
        ) : null}
        {modo === 'fijo' && tabla ? (
          Array.from({ length: Math.min(MAX_COMPARAR, filas.length + 1) }, (_, i) => (
            <Elegir key={i} valor={filas[i] || ''} editable={editable}
              cambiar={v => cambiarDatos({ filas: [...filas.slice(0, i), ...(v ? [v] : []), ...filas.slice(i + 1)].filter(Boolean) })}
              opciones={[['', i < filas.length ? 'Quitar' : 'Añadir fila…'], ...tabla.filas.map(x => [x.id, x.titulo] as [string, string])]} />
          ))
        ) : null}
        <Campo etiqueta="Título">
          <Escribir valor={String(datos.titulo || '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} placeholder="Sin título" />
        </Campo>
      </Ajustes>
      <VistaComparador {...p} enEditor />
    </div>
  );
}
