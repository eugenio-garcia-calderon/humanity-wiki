import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir } from '../ficha/editor';
import { ESTILOS_PROPIEDAD, GRUPOS } from '../ficha/vistas';
import { VistaPropiedad } from './Lectura';

export default function Editor(p: PropsEditor) {
  const { datos, editable, cambiarDatos } = p;
  const estilo = String(datos.estilo || 'tabla');
  const conGrupo = estilo === 'tabla' || estilo === 'lista';
  return (
    <div>
      <Ajustes>
        <Campo etiqueta="Muestra">
          <Elegir valor={estilo} editable={editable} cambiar={v => cambiarDatos({ estilo: v })}
            opciones={Object.entries(ESTILOS_PROPIEDAD)} />
        </Campo>
        {conGrupo ? (
          <Campo etiqueta="Grupo">
            <Elegir valor={String(datos.grupo || '')} editable={editable} cambiar={v => cambiarDatos({ grupo: v || undefined })}
              opciones={[['', 'Todos menos identidad'], ...Object.entries(GRUPOS)]} />
          </Campo>
        ) : null}
        {estilo !== 'cabecera' && estilo !== 'pie' ? (
          <Campo etiqueta="Título">
            <Escribir valor={String(datos.titulo || '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} placeholder="Sin título" />
          </Campo>
        ) : null}
      </Ajustes>
      <VistaPropiedad {...p} enEditor />
    </div>
  );
}
