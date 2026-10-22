import type { PropsEditor } from '../tipos';
import { Infografia, PASOS_INFOGRAFIA, DIBUJOS_DISPONIBLES, type PasoInfografia } from './Infografia';
import { EditorPlegable, CampoTexto, ListaItems } from '../presentacion/EditorCampos';

export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  const pasos = (Array.isArray(datos.pasos) && datos.pasos.length ? datos.pasos : PASOS_INFOGRAFIA) as PasoInfografia[];
  return (
    <div className="space-y-3">
      <EditorPlegable titulo="Editar los textos de la infografía">
        <CampoTexto etiqueta="Título" valor={String(datos.titulo || '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} />
        <CampoTexto etiqueta="Texto" largo valor={String(datos.texto || '')} editable={editable} cambiar={v => cambiarDatos({ texto: v })} />
        <ListaItems items={pasos as any[]} editable={editable} cambiar={v => cambiarDatos({ pasos: v })} nuevo="Añadir un paso"
          campos={[{ clave: 'dibujo', etiqueta: 'Dibujo', opciones: DIBUJOS_DISPONIBLES }, { clave: 'titulo', etiqueta: 'Título' }, { clave: 'texto', etiqueta: 'Texto', largo: true }]} />
      </EditorPlegable>
      <Infografia titulo={datos.titulo as string} texto={datos.texto as string} pasos={pasos} />
    </div>
  );
}
