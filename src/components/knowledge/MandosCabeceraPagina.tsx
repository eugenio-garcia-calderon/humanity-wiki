import { useState, type ReactNode } from 'react';
import { GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, ArrowLeftRight, Plus, Trash2, Image as ImageIcon, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { subirArchivo } from '../../utils/subir';
import { type Cabecera, MandosCabecera } from './CabeceraPagina';
import type { BotonCabecera } from './BotonesCabecera';
import {
  type Elemento, type IdElemento, type TallaElemento,
  NOMBRES_ELEMENTOS, TALLAS, ELEMENTOS_POR_DEFECTO, elementosDe, usaDisenoNuevo, cabeceraFija,
} from './DisenoCabecera';

// ============================================================================
// LA PESTAÑA «CABECERA» DEL CREADOR DEL MENÚ (2026-10-20, Eugenio)
// ============================================================================
// «Fusiónalo con el creador de menú: que al darle a modificar el menú te
// aparezcan el icono, el título y la descripción de la página —forman parte
// del menú—, los botones de la cabecera y el diseño de la cabecera.»
//
// Todo lo de arriba de la página en un sitio, con la vista previa de la web
// al lado (la de `CreadorMenu`). Los elementos se ordenan arrastrándolos
// entre las dos columnas, como las propiedades; las flechas hacen lo mismo
// sin ratón (en un teléfono no se arrastra).

export type DatosCabecera = {
  titulo: string;
  icono: string | null;
  portada: string | null;
  subtitulo?: string;
  botones: BotonCabecera[];
  cab?: Cabecera;
  /** Si la página es una entrada de base de datos (tiene propiedades). */
  esFila: boolean;
  onTitulo: (v: string) => void;
  onIcono: (v: string | null) => void;
  onSubtitulo: (v: string | undefined) => void;
  onCab: (c: Cabecera) => void;
  onBotones: (b: BotonCabecera[]) => void;
  onCrearBoton: () => void;
  onAbrirBoton: (b: BotonCabecera) => void;
};

const EMOJIS = ['🌱', '🌍', '☀️', '💡', '📘', '🏠', '🤝', '🎯', '🚀', '❤️', '🌊', '🔥', '⭐', '🧭', '🛠️', '📊'];
const NOMBRE_TALLA: Record<TallaElemento, string> = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' };

export default function MandosCabeceraPagina({ d }: { d: DatosCabecera }) {
  const c = d.cab || {};
  const v2 = usaDisenoNuevo(c);
  const pon = (x: Partial<Cabecera>) => d.onCab({ ...c, ...x });
  const hay: Record<IdElemento, boolean> = {
    icono: !!d.icono, titulo: true, descripcion: d.subtitulo !== undefined, portada: !!d.portada,
    botones: d.botones.length > 0, propiedades: d.esFila,
  };
  return (
    <>
      {/* El diseño, lo primero (bot evaluador: abajo obligaba a bajar para encontrarlo). */}
      <Grupo titulo="Diseño de la cabecera"
        ayuda={v2 ? 'Arrastra cada elemento a su columna y a su sitio. El ojo lo oculta al publicar; las letras cambian su tamaño.' : undefined}>
        {v2 ? (
          <>
            <OrdenElementos elementos={elementosDe(c)} hay={hay} onCambio={elementos => pon({ elementos, v: 2 })} />
            {d.icono && (
              <Elegir valor={c.iconoPos === 'encima' ? 'encima' : 'lado'} onCambio={v => pon({ iconoPos: v })} pequeno
                opciones={[['lado', 'Icono al lado del título'], ['encima', 'Icono encima']]} />
            )}
            <button onClick={() => pon({ elementos: ELEMENTOS_POR_DEFECTO.map(e => ({ ...e })) })}
              className="inline-flex items-center gap-1.5 h-9 px-2 text-[11px] font-bold text-slate-400 hover:text-slate-700">
              <RotateCcw className="w-3.5 h-3.5" /> Volver al orden de siempre
            </button>
          </>
        ) : (
          <>
            <MandosCabecera cabecera={c} hayImagen={!!d.portada} hayIcono={!!d.icono} hayBotones={d.botones.length > 0}
              hayDescripcion={d.subtitulo !== undefined} onCambio={d.onCab} />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
              <p className="text-[11px] leading-relaxed text-emerald-900">
                <b>Diseño por elementos:</b> ordena y cambia el tamaño del icono, el título, la descripción, la portada,
                los botones y las propiedades, en dos columnas.
              </p>
              <button onClick={() => pon({ v: 2, elementos: ELEMENTOS_POR_DEFECTO.map(e => ({ ...e })) })}
                className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">Usar el diseño por elementos</button>
            </div>
          </>
        )}
      </Grupo>

      <Grupo titulo="La página" ayuda="Lo primero que se ve: forma parte del menú de arriba.">
        <ElegirIcono valor={d.icono} onCambio={d.onIcono} />
        <input value={d.titulo} onChange={e => d.onTitulo(e.target.value)} placeholder="Título de la página" aria-label="Título de la página"
          className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-400" />
        <textarea value={d.subtitulo ?? ''} rows={2} placeholder="Descripción (opcional)" aria-label="Descripción de la página"
          onChange={e => d.onSubtitulo(e.target.value === '' ? undefined : e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 resize-none" />
      </Grupo>

      <Grupo titulo="Botones" ayuda={elementosDe(c).find(e => e.id === 'botones')?.col === 'der' && v2
        ? 'Cada botón abre su propia página en una ventana. A la derecha se leen de derecha a izquierda: el primero de la lista es el de más a la derecha.'
        : 'Cada botón abre su propia página (una subpágina) en una ventana.'}>
        <ListaBotones botones={d.botones} onCambio={d.onBotones} onAbrir={d.onAbrirBoton} />
        <button onClick={d.onCrearBoton}
          className="w-full h-11 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-700 inline-flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Añadir un botón
        </button>
        {d.botones.length > 0 && (
          <Elegir valor={c.botonesEstilo || 'relleno'} onCambio={v => pon({ botonesEstilo: v })} pequeno
            opciones={[['relleno', 'Relleno'], ['contorno', 'Contorno'], ['suave', 'Suave']]} />
        )}
      </Grupo>

      <Grupo titulo="Al bajar por la página">
        <Elegir valor={cabeceraFija(c) ? 'fija' : 'normal'} onCambio={v => pon({ fija: v === 'fija' })}
          opciones={[['fija', 'Se queda arriba, en pequeño'], ['normal', 'Se va con la página']]} />
      </Grupo>

    </>
  );
}

// ── ORDENAR LOS ELEMENTOS ──────────────────────────────────────────────────

function OrdenElementos({ elementos, hay, onCambio }: {
  elementos: Elemento[]; hay: Record<IdElemento, boolean>; onCambio: (e: Elemento[]) => void;
}) {
  const [arrastrando, setArrastrando] = useState<IdElemento | null>(null);
  const [destino, setDestino] = useState<{ col: 'izq' | 'der'; antesDe: IdElemento | null } | null>(null);
  const cambiar = (id: IdElemento, x: Partial<Elemento>) => onCambio(elementos.map(e => (e.id === id ? { ...e, ...x } : e)));
  /** Pone `id` en la columna `col`, antes de `antesDe` (o al final de la columna). */
  const mover = (id: IdElemento, col: 'izq' | 'der', antesDe: IdElemento | null) => {
    if (id === antesDe) return;
    const e = elementos.find(x => x.id === id);
    if (!e) return;
    const resto = elementos.filter(x => x.id !== id);
    let i = antesDe ? resto.findIndex(x => x.id === antesDe) : -1;
    if (i < 0) i = resto.map(x => x.col).lastIndexOf(col) + 1;
    resto.splice(i, 0, { ...e, col });
    onCambio(resto);
  };
  const subirBajar = (id: IdElemento, paso: -1 | 1) => {
    const e = elementos.find(x => x.id === id)!;
    const misma = elementos.filter(x => x.col === e.col);
    const j = misma.findIndex(x => x.id === id) + paso;
    if (j < 0 || j >= misma.length) return;
    mover(id, e.col, paso < 0 ? misma[j].id : misma[j + 1]?.id ?? null);
  };
  const soltar = () => {
    if (arrastrando && destino) mover(arrastrando, destino.col, destino.antesDe);
    setArrastrando(null); setDestino(null);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['izq', 'der'] as const).map(col => {
        const lista = elementos.filter(e => e.col === col);
        return (
          <div key={col} data-columna-cabecera={col}
            onDragOver={e => { if (!arrastrando) return; e.preventDefault(); if (destino?.col !== col) setDestino({ col, antesDe: null }); }}
            onDrop={e => { e.preventDefault(); soltar(); }}
            className={cn('min-h-[8rem] rounded-xl border-2 border-dashed p-1.5 space-y-1.5 transition-colors',
              arrastrando && destino?.col === col ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/60')}>
            <p className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{col === 'izq' ? 'Izquierda' : 'Derecha'}</p>
            {lista.map((e, i) => (
              <div key={e.id} draggable data-elemento={e.id}
                onDragStart={ev => { setArrastrando(e.id); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', e.id); }}
                onDragEnd={() => { setArrastrando(null); setDestino(null); }}
                onDragOver={ev => {
                  if (!arrastrando) return;
                  ev.preventDefault(); ev.stopPropagation();
                  const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
                  const antesDe = ev.clientY < r.top + r.height / 2 ? e.id : (lista[i + 1]?.id ?? null);
                  if (destino?.col !== col || destino.antesDe !== antesDe) setDestino({ col, antesDe });
                }}
                className={cn('rounded-lg border bg-white p-1.5 shadow-sm',
                  arrastrando === e.id ? 'opacity-40' : '',
                  arrastrando && destino?.col === col && destino.antesDe === e.id ? 'border-t-2 border-t-emerald-500 border-slate-200' : 'border-slate-200',
                  !hay[e.id] && 'opacity-60')}>
                <div className="flex items-center gap-1">
                  <GripVertical className="w-3.5 h-3.5 shrink-0 cursor-grab text-slate-300" />
                  <span className={cn('min-w-0 flex-1 truncate text-[11px] font-bold', e.oculto ? 'text-slate-400 line-through' : 'text-slate-700')}
                    title={hay[e.id] ? undefined : 'Esta página aún no tiene este elemento'}>
                    {NOMBRES_ELEMENTOS[e.id]}
                  </span>
                  <button onClick={() => cambiar(e.id, { oculto: e.oculto ? undefined : true })} aria-pressed={!e.oculto}
                    aria-label={e.oculto ? `Mostrar ${NOMBRES_ELEMENTOS[e.id]}` : `Ocultar ${NOMBRES_ELEMENTOS[e.id]}`}
                    className="w-6 h-6 grid place-items-center rounded text-slate-400 hover:text-slate-700">
                    {e.oculto ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-0.5">
                  {TALLAS.map(t => (
                    <button key={t} onClick={() => cambiar(e.id, { talla: t })} aria-pressed={(e.talla || 'm') === t}
                      aria-label={`${NOMBRES_ELEMENTOS[e.id]}: tamaño ${NOMBRE_TALLA[t]}`}
                      className={cn('h-6 min-w-0 flex-1 rounded text-[9px] font-black',
                        (e.talla || 'm') === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>{NOMBRE_TALLA[t]}</button>
                  ))}
                </div>
                <div className="mt-0.5 flex items-center justify-end">
                  <button onClick={() => subirBajar(e.id, -1)} disabled={i === 0} aria-label="Subir" title="Subir" className="w-7 h-7 grid place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => subirBajar(e.id, 1)} disabled={i === lista.length - 1} aria-label="Bajar" title="Bajar" className="w-7 h-7 grid place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-25"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => mover(e.id, col === 'izq' ? 'der' : 'izq', null)} aria-label={col === 'izq' ? 'Pasar a la derecha' : 'Pasar a la izquierda'}
                    title={col === 'izq' ? 'Pasar a la derecha' : 'Pasar a la izquierda'}
                    className="w-7 h-7 grid place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ArrowLeftRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {arrastrando && destino?.col === col && destino.antesDe === null && <div className="h-0.5 rounded bg-emerald-500" />}
          </div>
        );
      })}
    </div>
  );
}

// ── LOS BOTONES ────────────────────────────────────────────────────────────

function ListaBotones({ botones, onCambio, onAbrir }: { botones: BotonCabecera[]; onCambio: (b: BotonCabecera[]) => void; onAbrir: (b: BotonCabecera) => void }) {
  const mover = (i: number, d: number) => { const n = [...botones]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onCambio(n); };
  if (!botones.length) return null;
  return (
    <div className="space-y-1.5">
      {botones.map((b, i) => (
        <div key={b.id} className="flex items-center gap-1">
          <input defaultValue={b.pubTitulo || ''} placeholder="Sin título" aria-label="Nombre del botón"
            onBlur={e => {
              const t = e.target.value.trim();
              if (t === (b.pubTitulo || '')) return;
              onCambio(botones.map(x => (x.id === b.id ? { ...x, pubTitulo: t } : x)));
              // El nombre del botón ES el título de su página.
              fetch(`/api/windows/${encodeURIComponent(b.entityId)}`, {
                method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: t || 'Sin título' }),
              }).catch(() => {});
            }}
            className="min-w-0 flex-1 h-10 rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-emerald-400" />
          <button onClick={() => onAbrir(b)} aria-label="Abrir su página" title="Abrir su página" className="w-8 h-10 grid place-items-center text-slate-400 hover:text-emerald-700"><ExternalLink className="w-3.5 h-3.5" /></button>
          <button disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir" className="w-7 h-10 grid place-items-center text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
          <button disabled={i === botones.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar" className="w-7 h-10 grid place-items-center text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
          <button onClick={() => { if (window.confirm(`¿Quitar el botón «${b.pubTitulo || 'Sin título'}»? Su página no se borra.`)) onCambio(botones.filter(x => x.id !== b.id)); }}
            aria-label="Quitar el botón" className="w-7 h-10 grid place-items-center text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

// ── EL ICONO ───────────────────────────────────────────────────────────────

function ElegirIcono({ valor, onCambio }: { valor: string | null; onCambio: (v: string | null) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const esUrl = !!valor && /^(https?:|\/)/.test(valor);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-11 h-11 shrink-0 rounded-lg border border-slate-200 grid place-items-center bg-slate-50 overflow-hidden text-2xl">
          {valor ? (esUrl ? <img src={valor} alt="" className="w-full h-full object-cover" /> : valor) : <span className="text-[9px] text-slate-400">sin icono</span>}
        </div>
        <label className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-slate-300 cursor-pointer">
          {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />} Subir imagen
          <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            setSubiendo(true);
            const r = await subirArchivo(f, undefined, undefined, { maxLado: 512 });
            setSubiendo(false);
            if (r.url) onCambio(r.url);
          }} />
        </label>
        {valor && <button onClick={() => onCambio(null)} className="h-10 px-2 text-xs font-bold text-slate-400 hover:text-rose-600">Quitar</button>}
      </div>
      <div className="flex flex-wrap gap-0.5">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => onCambio(e)} aria-label={`Usar ${e} como icono`}
            className={cn('w-8 h-8 grid place-items-center rounded-md text-lg hover:bg-slate-100', valor === e && 'bg-emerald-50 ring-1 ring-emerald-300')}>{e}</button>
        ))}
      </div>
    </div>
  );
}

// ── PIEZAS PEQUEÑAS (las mismas formas que el resto del creador) ───────────

function Grupo({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{titulo}</p>
        {ayuda && <p className="text-[11px] text-slate-400">{ayuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Elegir<T extends string>({ valor, opciones, onCambio, pequeno }: {
  valor: T; opciones: readonly (readonly [T, string])[]; onCambio: (v: T) => void; pequeno?: boolean;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
      {opciones.map(([k, l]) => (
        <button key={k} onClick={() => onCambio(k)} aria-pressed={valor === k}
          className={cn('flex-1 rounded-lg font-bold transition-colors px-1', pequeno ? 'h-8 text-[11px]' : 'min-h-10 py-1 text-xs',
            valor === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{l}</button>
      ))}
    </div>
  );
}
