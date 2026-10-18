import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir, EditorItems } from '../ficha/editor';
import { VistaRetiradas } from './Lectura';

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
        {manual ? (
          <Campo etiqueta="Comprobado el">
            <input type="date" value={String(datos.comprobado || '')} disabled={!editable} onChange={e => cambiarDatos({ comprobado: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" />
          </Campo>
        ) : null}
      </Ajustes>
      {manual ? (
        <EditorItems items={(Array.isArray(datos.items) ? datos.items : []) as any} editable={editable} nuevo="Añadir retirada"
          cambiar={items => cambiarDatos({ items })}
          campos={[
            { clave: 'titulo', etiqueta: 'Qué se retiró', largo: true },
            { clave: 'fecha', etiqueta: 'Fecha (AAAA-MM-DD)' },
            { clave: 'pais', etiqueta: 'País' },
            { clave: 'organismo', etiqueta: 'Organismo' },
            { clave: 'referencia', etiqueta: 'Referencia' },
            { clave: 'motivo', etiqueta: 'Motivo', largo: true },
            { clave: 'enlace', etiqueta: 'Aviso oficial (dirección)', largo: true },
          ]} />
      ) : null}
      <VistaRetiradas {...p} enEditor />
    </div>
  );
}
