// ============================================================================
// EL TABLERO DE UN PROYECTO, COMO UN BLOQUE DE PÁGINA (2026-09-30)
// ============================================================================
// Eugenio: «fusiona el creador de páginas y el creador de proyectos […] mantén
// solo una herramienta, la del creador de páginas con el estilo de Notion».
//
// Es el mismo `TableroKanban` que tenía la pantalla del proyecto, con el mismo
// formulario de tarjeta nueva, cargado desde las mismas rutas. Lo único que
// cambia es dónde vive: entre el texto de una página, donde se puede escribir
// encima y debajo, compartir, y ponerle un dominio. La pantalla /proyectos/:slug
// sigue existiendo para lo que aún no tiene página; la que la tiene manda aquí.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, SquareKanban, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import TableroKanban, { type ItemTablero, type Grupo, idDeEtiqueta } from '../tablero/TableroKanban';
import { ModalNuevaTarjeta } from '../../pages/Proyectos';

export default function BloqueTablero({ proyectoId, editable }: { proyectoId: string; editable: boolean }) {
  const { user } = useAuth();
  const [proyecto, setProyecto] = useState<any>(null);
  const [items, setItems] = useState<ItemTablero[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState<{ grupo: string; estado: string } | null>(null);

  const cargarItems = useCallback(() =>
    fetch(`/api/roadmap?proyecto=${proyectoId}`, { credentials: 'include' })
      .then(r => r.json()).then(j => setItems(Array.isArray(j) ? j : [])).catch(() => setItems([])), [proyectoId]);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/proyectos/${proyectoId}`, { credentials: 'include' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'No se ha podido abrir el tablero.'); return j; })
      .then(p => { if (!vivo) return; setProyecto(p); cargarItems(); })
      .catch(e => vivo && setError(e.message));
    return () => { vivo = false; };
  }, [proyectoId, cargarItems]);

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">
        <SquareKanban className="mb-1 h-4 w-4" /> {error}
      </div>
    );
  }
  if (!proyecto) return <div className="flex justify-center py-6 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const grupos: Grupo[] = Array.isArray(proyecto.grupos) ? proyecto.grupos : [];
  // Quien edita la página edita el tablero; y quien es dueño del proyecto,
  // también aunque la página se la haya dejado a otro para leer.
  const puedeEditar = editable || (!!user && (user.id === proyecto.creador_user_id || !!user.isAdmin));

  const guardar = (cambio: Record<string, any>) => {
    setProyecto((p: any) => (p ? { ...p, ...cambio } : p));
    fetch(`/api/proyectos/${proyecto.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(cambio),
    }).catch(() => {});
  };
  const crearEtiqueta = (nombre: string): string => {
    const id = idDeEtiqueta(nombre);
    const ya = grupos.find(g => g.id === id || g.label.toLowerCase() === nombre.trim().toLowerCase());
    if (ya) return ya.id;
    const paleta = ['#7c3aed', '#db2777', '#0284c7', '#16a34a', '#d97706', '#475569', '#dc2626', '#0891b2'];
    guardar({ grupos: [...grupos, { id, label: nombre.trim().slice(0, 40), color: paleta[grupos.length % paleta.length] }] });
    return id;
  };

  const hechas = items.filter(i => i.estado === 'hecho').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SquareKanban className="h-4 w-4 text-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Tablero</span>
        <span className="text-[11px] text-slate-400">{hechas} de {items.length} hechas</span>
        <span className="flex-1" />
        {puedeEditar && (
          <button
            onClick={() => setNueva({ grupo: grupos[0]?.id, estado: 'por_hacer' })}
            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" /> Tarjeta
          </button>
        )}
        {/* La pantalla antigua del proyecto, mientras siga teniendo cosas que
            la página aún no enseña (ramas, galería, personas). Se quita el
            día que todo eso sean bloques. */}
        <Link to={`/proyectos/${proyecto.slug}?vista=clasica`} className="text-[11px] font-bold text-slate-400 hover:text-slate-700">
          Más del proyecto →
        </Link>
      </div>
      <TableroKanban
        items={items} grupos={grupos} puedeEditar={puedeEditar}
        onRecargar={cargarItems}
        onCrear={(g, estado) => setNueva({ grupo: g || grupos[0]?.id, estado })}
        columnas={proyecto.columnas || null}
        onColumnas={puedeEditar ? (n => guardar({ columnas: n })) : undefined}
        onGrupos={puedeEditar ? (g => guardar({ grupos: g })) : undefined}
      />
      {nueva && (
        <ModalNuevaTarjeta
          proyectoId={proyecto.id} grupos={grupos}
          grupoInicial={nueva.grupo} estadoInicial={nueva.estado}
          onCrearEtiqueta={puedeEditar ? crearEtiqueta : undefined}
          onCerrar={() => setNueva(null)}
          onCreada={() => { setNueva(null); cargarItems(); }}
        />
      )}
    </div>
  );
}
