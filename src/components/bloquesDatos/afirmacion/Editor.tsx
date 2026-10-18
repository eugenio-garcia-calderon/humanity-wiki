import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir, EditorItems } from '../ficha/editor';
import { ETIQUETA_VEREDICTO } from '../ficha/vistas';
import { VistaAfirmaciones } from './Lectura';

export default function Editor(p: PropsEditor) {
  const { datos, editable, cambiarDatos } = p;
  const manual = datos.modo === 'manual';
  return (
    <div>
      <Ajustes>
        <Campo etiqueta="De dónde">
          <Elegir valor={manual ? 'manual' : 'fila'} editable={editable} cambiar={v => cambiarDatos({ modo: v })}
            opciones={[['fila', 'Las enlazadas a esta fila'], ['manual', 'Escritas aquí']]} />
        </Campo>
        <Campo etiqueta="Título">
          <Escribir valor={String(datos.titulo || '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} placeholder="Sin título" />
        </Campo>
      </Ajustes>
      {manual ? (
        <EditorItems items={(Array.isArray(datos.items) ? datos.items : []) as any} editable={editable} nuevo="Añadir afirmación"
          cambiar={items => cambiarDatos({ items })}
          campos={[
            { clave: 'afirmacion', etiqueta: 'Lo que dice la publicidad', largo: true },
            { clave: 'veredicto', etiqueta: 'Veredicto', opciones: Object.values(ETIQUETA_VEREDICTO).slice(0, 4) },
            { clave: 'donde', etiqueta: 'Dónde se dice (dirección)' },
            { clave: 'explicacion', etiqueta: 'Por qué', largo: true },
            { clave: 'fuentes', etiqueta: 'Fuentes', largo: true },
          ]} />
      ) : null}
      <VistaAfirmaciones {...p} enEditor />
    </div>
  );
}
