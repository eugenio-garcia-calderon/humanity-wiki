import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, useTablasPropias } from '../ficha/editor';
import { VistaTermometro } from './Lectura';

/** De qué base de datos salen los niveles (una fila por sistema y nivel). */
export default function Editor({ datos, editable, cambiarDatos, paginaId }: PropsEditor) {
  const tablas = useTablasPropias();
  // En el editor, si el termómetro hace de cabecera, la vista va arriba (como en la página publicada) y aquí solo sus ajustes.
  const ajustes = (
      <Ajustes>
        <Campo etiqueta="Niveles de">
          <Elegir valor={String(datos.tabla_niveles || '')} editable={editable} cambiar={v => cambiarDatos({ tabla_niveles: v })}
            opciones={[['', '—'], ...tablas.map(t => [t.id, t.titulo] as [string, string])]} />
        </Campo>
      </Ajustes>
  );
  if (datos.soloAjustes === true) return ajustes;
  return (
    <div className="space-y-2">
      <Ajustes>
        <Campo etiqueta="Niveles de">
          <Elegir valor={String(datos.tabla_niveles || '')} editable={editable} cambiar={v => cambiarDatos({ tabla_niveles: v })}
            opciones={[['', '—'], ...tablas.map(t => [t.id, t.titulo] as [string, string])]} />
        </Campo>
      </Ajustes>
      <VistaTermometro datos={datos} paginaId={paginaId} />
    </div>
  );
}
