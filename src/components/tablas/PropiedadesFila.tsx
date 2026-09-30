import { useCallback, useEffect, useState } from 'react';
import CeldaTabla, { type Columna } from './Celda';

// ============================================================================
// LAS PROPIEDADES DE UN ELEMENTO, EN SU PÁGINA (2026-10-01)
// ============================================================================
// Como en Notion: al abrir la página de un elemento de una base de datos se
// ven, arriba, sus columnas —fecha, estado, «Área»…— y se editan ahí mismo.
// Es lo que permite ligar un proyecto a su área de innovación desde la
// página del proyecto, sin volver a la tabla.
//
// Son las MISMAS celdas y la misma ruta de guardado que la rejilla: una
// propiedad editada aquí es la tabla editada.

export default function PropiedadesFila({ tablaId, filaId, editable }: {
  tablaId: string; filaId: string; editable: boolean;
}) {
  const [datos, setDatos] = useState<{ columnas: Columna[]; fila: any; titulo: string | null } | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/bd/tablas/${tablaId}`, { credentials: 'include' });
    if (!r.ok) return;
    const j = await r.json();
    const fila = (j.filas || []).find((f: any) => f.id === filaId);
    if (fila) setDatos({ columnas: j.columnas || [], fila, titulo: j.columna_titulo ?? null });
  }, [tablaId, filaId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!datos) return null;
  // La columna del nombre ya es el título de la página: repetirla aquí sería
  // tener el mismo dato en dos sitios de la misma pantalla.
  const columnas = datos.columnas.filter(c => c.id !== datos.titulo);
  if (!columnas.length) return null;

  const guardar = async (columnaId: string, valor: any) => {
    const r = await fetch(`/api/bd/filas/${filaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ celdas: { [columnaId]: valor } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const suyo = (j.fallos || []).find((f: any) => f.columna === columnaId);
      return { error: suyo?.error || j.error || 'No se pudo guardar.' };
    }
    await cargar();
  };

  return (
    <div className="mb-6 divide-y divide-slate-100 border-y border-slate-100">
      {columnas.map(c => (
        <div key={c.id} className="flex items-start gap-3 py-0.5">
          <span className="w-32 sm:w-40 shrink-0 pt-2 text-xs font-bold text-slate-400 truncate">{c.nombre}</span>
          <div className="flex-1 min-w-0">
            <CeldaTabla celda={datos.fila.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
              apuntados={datos.fila.apuntados?.[c.id]} archivos={datos.fila.archivos?.[c.id]}
              editable={editable} onGuardar={v => guardar(c.id, v)} />
          </div>
        </div>
      ))}
    </div>
  );
}
