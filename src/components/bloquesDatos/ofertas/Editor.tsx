import { useEffect, useState } from 'react';
import type { PropsEditor } from '../tipos';
import Lectura from './Lectura';

// El editor del bloque «Ofertas»: lo mismo que se publicará, y encima las dos
// cosas que se pueden elegir. Casi nunca hace falta tocarlas: en la plantilla
// de ficha, el bloque encuentra solo la base de datos de ofertas y la fila.
export default function Editor(props: PropsEditor) {
  const { datos, editable, cambiarDatos } = props;
  const [tablas, setTablas] = useState<{ id: string; titulo: string }[]>([]);
  useEffect(() => {
    if (!editable) return;
    fetch('/api/bd/tablas', { credentials: 'include' }).then(r => r.ok ? r.json() : [])
      .then(j => setTablas(Array.isArray(j) ? j.map((t: any) => ({ id: t.id, titulo: t.titulo })) : [])).catch(() => {});
  }, [editable]);
  const tabla = typeof datos.tabla_id === 'string' ? datos.tabla_id : '';
  const titulo = typeof datos.titulo === 'string' ? datos.titulo : '';
  return (
    <div>
      {editable && (
        <div className="mb-2 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs">
          <label className="flex flex-col gap-1 font-bold text-slate-600">
            Título
            <input value={titulo} placeholder="Dónde comprarlo" onChange={e => cambiarDatos({ titulo: e.target.value })}
              className="h-9 w-48 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal" />
          </label>
          <label className="flex flex-col gap-1 font-bold text-slate-600">
            Base de datos de ofertas
            <select value={tabla} onChange={e => cambiarDatos({ tabla_id: e.target.value || undefined })}
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal">
              <option value="">La que apunta a esta ficha</option>
              {tablas.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </label>
          <p className="basis-full font-normal text-slate-500">
            Enseña las filas cuya propiedad «Producto» apunta a esta ficha. Las propiedades que lee (Distribuidor, Precio, Envío,
            Comisión, Enlace a la tienda, Plazo…) se crean desde el grupo «Ofertas» al añadir una propiedad.
          </p>
        </div>
      )}
      <Lectura {...props} />
    </div>
  );
}
