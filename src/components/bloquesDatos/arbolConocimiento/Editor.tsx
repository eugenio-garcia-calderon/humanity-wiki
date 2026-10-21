import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir } from '../ficha/editor';
import { VistaArbol } from './Lectura';

export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  return (
    <div className="space-y-3">
      <Ajustes>
        <Campo etiqueta="Alto">
          <Elegir valor={String(datos.alto || 'pantalla')} editable={editable} cambiar={v => cambiarDatos({ alto: v === 'pantalla' ? 'pantalla' : Number(v) })}
            opciones={[['480', 'Bajo'], ['640', 'Medio'], ['900', 'Alto'], ['pantalla', 'Pantalla completa']]} />
        </Campo>
        <Campo etiqueta="Tamaño">
          <Elegir valor={String(datos.escala || 1)} editable={editable} cambiar={v => cambiarDatos({ escala: Number(v) })}
            opciones={[['1', 'Normal'], ['1.3', 'Grande'], ['1.6', 'Muy grande']]} />
        </Campo>
      </Ajustes>
      <VistaArbol datos={datos} />
    </div>
  );
}
