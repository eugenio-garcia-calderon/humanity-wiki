import { useEffect, useState } from 'react';
import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, useTablasPropias } from '../ficha/editor';
import { SelectorTerritorio } from './Lectura';

/** Qué base de datos filtra, por qué relación y con qué territorio de entrada. */
export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  const tablas = useTablasPropias();
  const [columnas, setColumnas] = useState<Array<{ id: string; nombre: string; destino: string }>>([]);
  const [filas, setFilas] = useState<Array<{ id: string; nombre: string }>>([]);
  const tablaId = String(datos.tabla_id || ''), columnaId = String(datos.columna_id || '');
  useEffect(() => {
    if (!tablaId) { setColumnas([]); return; }
    fetch(`/api/bd/tablas/${tablaId}`, { credentials: 'include' }).then(r => r.json()).then(j => {
      setColumnas((j.columnas || []).filter((c: any) => c.tipo === 'relacion' && c.config?.tabla_destino && !c.config?.rol).map((c: any) => ({ id: c.id, nombre: c.nombre, destino: c.config.tabla_destino })));
      const vistos = new Map<string, string>();
      for (const f of j.filas || []) for (const cid of Object.keys(f.apuntados || {})) if (cid === columnaId) for (const a of f.apuntados[cid]) vistos.set(a.id, a.etiqueta);
      setFilas([...vistos].map(([id, nombre]) => ({ id, nombre })));
    }).catch(() => {});
  }, [tablaId, columnaId]);
  return (
    <div className="space-y-2">
      <Ajustes>
        <Campo etiqueta="Base de datos">
          <Elegir valor={tablaId} editable={editable} cambiar={v => cambiarDatos({ tabla_id: v, columna_id: '', defecto: '' })}
            opciones={[['', '—'], ...tablas.map(t => [t.id, t.titulo] as [string, string])]} />
        </Campo>
        <Campo etiqueta="Relación con territorios">
          <Elegir valor={columnaId} editable={editable} cambiar={v => cambiarDatos({ columna_id: v, defecto: '' })}
            opciones={[['', '—'], ...columnas.map(c => [c.id, c.nombre] as [string, string])]} />
        </Campo>
        <Campo etiqueta="Por defecto">
          <Elegir valor={String(datos.defecto || '')} editable={editable} cambiar={v => cambiarDatos({ defecto: v })}
            opciones={[['', '—'], ...filas.map(f => [f.id, f.nombre] as [string, string])]} />
        </Campo>
      </Ajustes>
      <SelectorTerritorio datos={datos} />
    </div>
  );
}
