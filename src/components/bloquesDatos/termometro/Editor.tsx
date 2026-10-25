import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, useTablasPropias } from '../ficha/editor';
import { VistaTermometro } from './Lectura';

/** De qué base de datos salen los niveles (una fila por sistema y nivel). */
export default function Editor({ datos, editable, cambiarDatos, paginaId }: PropsEditor) {
  const tablas = useTablasPropias();
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
