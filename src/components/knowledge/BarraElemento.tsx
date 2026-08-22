import { useEffect, useRef, useState } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { useCerrarAlPulsarFuera } from '../../hooks/useCerrarAlPulsarFuera';
import {
  ArrowLeftRight, Download, Crop, MessageSquare, Lock, Unlock, Sparkles,
  MoreVertical, Copy, ArrowUp, ArrowDown, Trash2, Type, Plus, Check, X,
  Maximize2, RefreshCw, FileText, Table2, Image as ImageIcon, PlayCircle, StickyNote,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// BARRA DEL ELEMENTO SELECCIONADO — estilo Miro (2026-08-08, petición)
// ============================================================================
// Flota encima del elemento que tienes marcado y reúne todo lo que se puede
// hacer con él sin abrir su ficha: renombrar, convertirlo en otro tipo,
// reemplazar su archivo, descargarlo, ponerle texto alternativo, recortarlo,
// comentar, bloquearlo, preguntarle a la IA, y el menú de duplicar / capas /
// quitar / papelera.
//
// Se dibuja con `NodeToolbar` de React Flow: se coloca sola sobre el nodo y no
// se deforma con el zoom del lienzo.

/** Conversiones que tienen sentido sin perder nada por el camino. */
export const CONVERSIONES: Record<string, string[]> = {
  texto: ['tarea', 'proyecto', 'documento'],
  tarea: ['texto', 'proyecto'],
  proyecto: ['texto', 'tarea'],
  documento: ['texto'],
  enlace: ['texto'],
  publicacion: ['texto'],
};

const NUEVOS = [
  { kind: 'documento', label: 'Documento', icon: FileText },
  { kind: 'tabla', label: 'Tabla', icon: Table2 },
  { kind: 'texto', label: 'Texto', icon: StickyNote },
  { kind: 'imagen', label: 'Imagen', icon: ImageIcon },
  { kind: 'video', label: 'Vídeo', icon: PlayCircle },
] as const;

export interface AccionesElemento {
  renombrar: (titulo: string) => void;
  convertir: (kind: string) => void;
  reemplazarArchivo: (f: File) => void;
  descargar: () => void;
  ponerAlt: (alt: string) => void;
  recortar: () => void;
  comentar: () => void;
  bloquear: (v: boolean) => void;
  preguntarIA: () => void;
  duplicar: () => void;
  capa: (dir: 1 | -1) => void;
  quitarDelLienzo: () => void;
  aPapelera: () => void;
  crearConectado: (kind: string) => void;
  abrir: () => void;
}

export default function BarraElemento({ win, acciones }: { win: any; acciones: AccionesElemento }) {
  const [menu, setMenu] = useState<null | 'convertir' | 'mas' | 'crear' | 'alt' | 'titulo'>(null);
  const [titulo, setTitulo] = useState(win.title || '');
  const [alt, setAlt] = useState(win.config?.alt || '');
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitulo(win.title || ''); setAlt(win.config?.alt || ''); }, [win.id, win.title, win.config?.alt]);

  const esImagen = win.kind === 'imagen';
  const tieneArchivo = !!(win.config?.image_url || win.config?.url?.startsWith('/uploads/'));
  const conversiones = CONVERSIONES[win.kind] || [];
  const bloqueado = !!win.locked;

  const btn = 'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0';
  const sep = <span className="w-px h-5 bg-slate-200 shrink-0" />;

  /** Cierra cualquier desplegable al pulsar fuera de la barra. */
  const caja = useRef<HTMLDivElement>(null);
  useCerrarAlPulsarFuera(caja, !!menu, () => setMenu(null));

  return (
    <NodeToolbar isVisible position={Position.Top} offset={16}>
      <div ref={caja} className="relative">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl px-1.5 py-1.5 flex items-center gap-0.5 nodrag nopan">
          {/* Título editable */}
          {menu === 'titulo' ? (
            <form
              onSubmit={e => { e.preventDefault(); acciones.renombrar(titulo.trim() || win.title); setMenu(null); }}
              className="flex items-center gap-1"
            >
              <input
                autoFocus value={titulo} onChange={e => setTitulo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setTitulo(win.title); setMenu(null); } }}
                className="w-52 px-2 py-1 text-xs font-bold border border-emerald-300 rounded-lg focus:outline-none"
              />
              <button type="submit" className={btn} title="Guardar"><Check className="w-4 h-4 text-emerald-600" /></button>
            </form>
          ) : (
            <button
              onClick={() => setMenu('titulo')}
              title="Renombrar"
              className="max-w-[170px] truncate px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            >
              {win.title || 'Sin título'}
            </button>
          )}
          {sep}

          {/* Convertir en otro tipo */}
          {conversiones.length > 0 && (
            <button onClick={() => setMenu(m => (m === 'convertir' ? null : 'convertir'))}
              className="px-2.5 h-8 rounded-lg flex items-center gap-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              title="Convertir en otro tipo">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Convertir
            </button>
          )}

          {/* Crear algo nuevo conectado */}
          <button onClick={() => setMenu(m => (m === 'crear' ? null : 'crear'))} className={btn} title="Crear algo nuevo conectado a este">
            <Plus className="w-4 h-4" />
          </button>
          {sep}

          {tieneArchivo && (
            <>
              <input ref={archivo} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) acciones.reemplazarArchivo(f); e.target.value = ''; }} />
              <button onClick={() => archivo.current?.click()} className={btn} title="Reemplazar el archivo">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={acciones.descargar} className={btn} title="Descargar">
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          {esImagen && (
            <>
              <button onClick={() => setMenu(m => (m === 'alt' ? null : 'alt'))}
                className={cn(btn, 'text-[10px] font-black tracking-wider', win.config?.alt && 'text-emerald-600')}
                title="Texto alternativo (accesibilidad)">
                ALT
              </button>
              <button onClick={acciones.recortar} className={btn} title="Recortar">
                <Crop className="w-4 h-4" />
              </button>
            </>
          )}
          {sep}

          <button onClick={acciones.abrir} className={btn} title="Abrir la ficha completa">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={acciones.comentar} className={btn} title="Comentar">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={() => acciones.bloquear(!bloqueado)} className={cn(btn, bloqueado && 'text-amber-600')}
            title={bloqueado ? 'Desbloquear' : 'Bloquear para que no se mueva'}>
            {bloqueado ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <button onClick={acciones.preguntarIA}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:scale-105 transition-transform shrink-0"
            title="Preguntar a la IA sobre este elemento">
            <Sparkles className="w-4 h-4" />
          </button>
          <button onClick={() => setMenu(m => (m === 'mas' ? null : 'mas'))} className={btn} title="Más acciones">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* --- desplegables --- */}
        {menu === 'convertir' && (
          <Panel>
            <Cabecera>Convertir en</Cabecera>
            {conversiones.map(k => (
              <Fila key={k} onClick={() => { acciones.convertir(k); setMenu(null); }} icon={Type}>{k}</Fila>
            ))}
          </Panel>
        )}

        {menu === 'crear' && (
          <Panel>
            <Cabecera>Crear conectado</Cabecera>
            {NUEVOS.map(n => (
              <Fila key={n.kind} onClick={() => { acciones.crearConectado(n.kind); setMenu(null); }} icon={n.icon}>
                {n.label}
              </Fila>
            ))}
          </Panel>
        )}

        {menu === 'alt' && (
          <Panel ancho="w-72">
            <Cabecera>Texto alternativo</Cabecera>
            <div className="p-2.5">
              <p className="text-[10px] text-slate-400 leading-relaxed mb-1.5">
                Lo que oye quien no puede ver la imagen. Descríbela en una frase.
              </p>
              <textarea value={alt} onChange={e => setAlt(e.target.value)} rows={3}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs resize-none focus:outline-none focus:border-emerald-300" />
              <button onClick={() => { acciones.ponerAlt(alt.trim()); setMenu(null); }}
                className="mt-1.5 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors">
                Guardar
              </button>
            </div>
          </Panel>
        )}

        {menu === 'mas' && (
          <Panel>
            <Fila onClick={() => { acciones.duplicar(); setMenu(null); }} icon={Copy}>Duplicar</Fila>
            <Fila onClick={() => { acciones.capa(1); setMenu(null); }} icon={ArrowUp}>Traer al frente</Fila>
            <Fila onClick={() => { acciones.capa(-1); setMenu(null); }} icon={ArrowDown}>Enviar atrás</Fila>
            <div className="h-px bg-slate-100 my-1" />
            <Fila onClick={() => { acciones.quitarDelLienzo(); setMenu(null); }} icon={X}>
              Quitar de este lienzo
            </Fila>
            <p className="px-3 pb-1 text-[9px] text-slate-400 leading-snug">
              Sigue existiendo y en los demás lienzos donde esté.
            </p>
            <Fila onClick={() => { acciones.aPapelera(); setMenu(null); }} icon={Trash2} peligro>
              Borrar
            </Fila>
            <p className="px-3 pb-2 text-[9px] text-slate-400 leading-snug">
              Va a la papelera. Se borra del todo en 15 días.
            </p>
          </Panel>
        )}
      </div>
    </NodeToolbar>
  );
}

function Panel({ children, ancho = 'w-52' }: { children: React.ReactNode; ancho?: string }) {
  return (
    <div className={cn('absolute top-full mt-1.5 left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl py-1.5 nodrag nopan z-50', ancho)}>
      {children}
    </div>
  );
}

function Cabecera({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{children}</p>;
}

function Fila({ children, onClick, icon: Icon, peligro }: {
  children: React.ReactNode; onClick: () => void; icon: any; peligro?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn('w-full px-3 py-1.5 flex items-center gap-2 text-xs font-bold transition-colors capitalize',
        peligro ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50')}>
      <Icon className="w-3.5 h-3.5 shrink-0" /> {children}
    </button>
  );
}
