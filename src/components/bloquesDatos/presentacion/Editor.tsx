import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import type { PropsEditor } from '../tipos';
import { VistaPresentacion, ICONOS, type Seccion } from './Vista';
import { EditorPlegable, CampoTexto, ListaItems, type CampoItem } from './EditorCampos';
import { DIBUJOS_DISPONIBLES } from '../infografiaRed/Infografia';

const TIPOS: Array<[Seccion['tipo'], string]> = [
  ['portada', 'Portada'], ['texto', 'Texto'], ['linea', 'Línea del tiempo'], ['tarjetas', 'Tarjetas'], ['captura', 'Captura con texto'],
  ['infografia', 'Infografía'], ['cifras', 'Cifras'], ['llamada', 'Llamada a participar'],
];
const ICONOS_OPC: Array<[string, string]> = [['', '—'], ...Object.keys(ICONOS).map(k => [k, k] as [string, string])];

/** Qué campos lleva cada elemento según la forma de la sección. */
function camposDe(tipo: Seccion['tipo']): CampoItem[] {
  if (tipo === 'linea') return [{ clave: 'fecha', etiqueta: 'Fecha' }, { clave: 'titulo', etiqueta: 'Título' }, { clave: 'texto', etiqueta: 'Texto', largo: true }];
  if (tipo === 'cifras') return [{ clave: 'valor', etiqueta: 'Cifra' }, { clave: 'titulo', etiqueta: 'Qué es' }, { clave: 'texto', etiqueta: 'Detalle', largo: true }];
  if (tipo === 'infografia') return [{ clave: 'dibujo', etiqueta: 'Dibujo', opciones: DIBUJOS_DISPONIBLES }, { clave: 'titulo', etiqueta: 'Título' }, { clave: 'texto', etiqueta: 'Texto', largo: true }];
  if (tipo === 'captura') return [{ clave: 'titulo', etiqueta: 'Punto' }, { clave: 'texto', etiqueta: 'Texto', largo: true }];
  return [{ clave: 'icono', etiqueta: 'Icono', opciones: ICONOS_OPC }, { clave: 'titulo', etiqueta: 'Título' }, { clave: 'texto', etiqueta: 'Texto', largo: true }];
}

export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  const secciones = (Array.isArray(datos.secciones) ? datos.secciones : []) as Seccion[];
  const poner = (i: number, cambios: Partial<Seccion>) => cambiarDatos({ secciones: secciones.map((s, j) => (j === i ? { ...s, ...cambios } : s)) });
  const mover = (i: number, d: number) => { const n = [...secciones]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); cambiarDatos({ secciones: n }); };
  return (
    <div className="space-y-3">
      <EditorPlegable titulo={`Editar la presentación (${secciones.length} secciones)`}>
        {secciones.map((s, i) => (
          <EditorPlegable key={s.id || i} titulo={`${i + 1}. ${TIPOS.find(t => t[0] === s.tipo)?.[1] || s.tipo} · ${(s.titulo || '').replace(/\*\*/g, '').slice(0, 60) || 'Sin título'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <select value={s.tipo} disabled={!editable} onChange={e => poner(i, { tipo: e.target.value as Seccion['tipo'] })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm">
                {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button type="button" disabled={!editable || i === 0} onClick={() => mover(i, -1)} aria-label="Subir la sección" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={!editable || i === secciones.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar la sección" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" disabled={!editable} onClick={() => cambiarDatos({ secciones: secciones.filter((_, j) => j !== i) })} aria-label="Quitar la sección" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </div>
            <CampoTexto etiqueta="Antetítulo" valor={s.antetitulo || ''} editable={editable} cambiar={v => poner(i, { antetitulo: v })} />
            <CampoTexto etiqueta="Título (lo que va entre **asteriscos** sale resaltado)" valor={s.titulo || ''} editable={editable} cambiar={v => poner(i, { titulo: v })} />
            <CampoTexto etiqueta="Texto (una línea en blanco separa párrafos)" largo valor={s.texto || ''} editable={editable} cambiar={v => poner(i, { texto: v })} />
            {(s.tipo === 'portada' || s.tipo === 'captura') && (<>
              <CampoTexto etiqueta="Imagen (dirección)" valor={s.imagen || ''} editable={editable} cambiar={v => poner(i, { imagen: v })} />
              <CampoTexto etiqueta="Dirección que se ve en la ventana" valor={s.direccion || ''} editable={editable} cambiar={v => poner(i, { direccion: v })} />
              <CampoTexto etiqueta="Pie de la imagen" valor={s.pie || ''} editable={editable} cambiar={v => poner(i, { pie: v })} />
            </>)}
            {s.tipo === 'captura' && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={s.lado === 'izquierda'} disabled={!editable} onChange={e => poner(i, { lado: e.target.checked ? 'izquierda' : 'derecha' })} /> Imagen a la izquierda
              </label>
            )}
            {s.tipo !== 'portada' && s.tipo !== 'texto' && (
              <ListaItems items={(s.items || []) as any[]} campos={camposDe(s.tipo)} editable={editable} nuevo="Añadir un elemento" cambiar={v => poner(i, { items: v })} />
            )}
            {(s.tipo === 'portada' || s.tipo === 'llamada') && (
              <ListaItems items={(s.botones || []) as any[]} campos={[{ clave: 'texto', etiqueta: 'Botón' }, { clave: 'url', etiqueta: 'Enlace (o #id de una sección)' }]} editable={editable} nuevo="Añadir un botón" cambiar={v => poner(i, { botones: v })} />
            )}
            <CampoTexto etiqueta="Ancla (#…) de la sección" valor={s.id || ''} editable={editable} cambiar={v => poner(i, { id: v.replace(/[^a-z0-9-]/gi, '').toLowerCase() })} />
          </EditorPlegable>
        ))}
        <button type="button" disabled={!editable} onClick={() => cambiarDatos({ secciones: [...secciones, { id: `seccion-${secciones.length + 1}`, tipo: 'tarjetas', titulo: 'Nueva sección', items: [] }] })}
          className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-bold text-slate-500 hover:border-sky-300 hover:text-sky-700">+ Añadir una sección</button>
      </EditorPlegable>
      <VistaPresentacion secciones={secciones} />
    </div>
  );
}
