import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir } from '../ficha/editor';
import { VistaMapaMundo } from './Lectura';

export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  return (
    <div className="space-y-3">
      <Ajustes>
        <Campo etiqueta="Alto">
          <Elegir valor={String(datos.alto || 560)} editable={editable} cambiar={v => cambiarDatos({ alto: v === 'pantalla' ? 'pantalla' : Number(v) })}
            opciones={[['400', 'Bajo'], ['560', 'Medio'], ['720', 'Alto'], ['900', 'Muy alto'], ['pantalla', 'Pantalla completa']]} />
        </Campo>
        <Campo etiqueta="Objetivos">
          <Elegir valor={datos.filtros === true ? 'si' : 'no'} editable={editable} cambiar={v => cambiarDatos({ filtros: v === 'si' })}
            opciones={[['no', 'Solo el mapa'], ['si', 'Con el menú de objetivos a la izquierda']]} />
        </Campo>
        <Campo etiqueta="Empieza en">
          <Escribir valor={String(datos.territorio ?? '')} editable={editable} cambiar={v => cambiarDatos({ territorio: v })} placeholder="El mundo (o «espana», «ceuta»…)" />
        </Campo>
      </Ajustes>
      <VistaMapaMundo datos={datos} />
    </div>
  );
}
