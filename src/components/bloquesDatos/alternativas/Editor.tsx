import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir } from '../ficha/editor';
import { VistaAlternativas } from './Lectura';

export default function Editor(p: PropsEditor) {
  const { datos, editable, cambiarDatos } = p;
  return (
    <div>
      <Ajustes>
        <Campo etiqueta="Título">
          <Escribir valor={String(datos.titulo || '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} placeholder="Sin título" />
        </Campo>
        <Campo etiqueta="Como mucho">
          <Elegir valor={String(datos.max || 8)} editable={editable} cambiar={v => cambiarDatos({ max: Number(v) })}
            opciones={['4', '6', '8', '10', '12'].map(n => [n, `${n} criterios`] as [string, string])} />
        </Campo>
      </Ajustes>
      <VistaAlternativas {...p} enEditor />
    </div>
  );
}
