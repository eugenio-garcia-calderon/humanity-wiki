// The side panel of the consciousness map. Exploring, it explains the concept
// (or arrow) that was tapped; editing, it changes it: text, shape, icon, colour,
// size, the study it points to — and for arrows, style, direction and curve.
import { useEffect, useState, type ReactNode } from 'react';
import { X, Trash2, Copy, Link2, ArrowRight, ArrowLeft, ArrowLeftRight, Minus, BookOpen, Repeat } from 'lucide-react';
import { BotonOscuro, BotonLibre, BotonTexto } from './botones';
import { cn } from '../../utils/cn';
import {
  PALETA, FORMAS, ICONOS, ESTILOS,
  type MapaConciencia, type Nodo, type Flecha, type Direccion, type PosEtiqueta,
} from '../../data/concienciaMapa';
import { ESTUDIOS, ESTUDIOS_POR_ID } from '../../data/concienciaEstudios';
import { ICONOS_LUCIDE, type Seleccion } from './MapaSintergico';
import { colorSeguro } from './geometria';

interface Props {
  mapa: MapaConciencia;
  seleccion: NonNullable<Seleccion>;
  editando: boolean;
  onCambiarNodo(id: string, cambios: Partial<Nodo>, clave?: string): void;
  onCambiarFlecha(id: string, cambios: Partial<Flecha>, clave?: string): void;
  onBorrar(): void;
  onDuplicar(id: string): void;
  onConectarDesde(id: string): void;
  onSeleccion(s: Seleccion): void;
  onIrAEstudio(id: string): void;
  onCerrar(): void;
}

const campo = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-300/60 focus:outline-none';
const rotulo = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400';

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return <label className="block"><span className={rotulo}>{etiqueta}</span>{children}</label>;
}

/** A text box that edits on every keystroke but does not lose the cursor when the map re-renders. */
function Texto({ valor, onCambio, multilinea, placeholder }: { valor: string; onCambio(v: string): void; multilinea?: boolean; placeholder?: string }) {
  const [v, setV] = useState(valor);
  useEffect(() => { setV(valor); }, [valor]);
  return multilinea
    ? <textarea className={cn(campo, 'min-h-[110px] leading-relaxed')} value={v} placeholder={placeholder} onChange={e => { setV(e.target.value); onCambio(e.target.value); }} />
    : <input className={campo} value={v} placeholder={placeholder} onChange={e => { setV(e.target.value); onCambio(e.target.value); }} />;
}

function Paleta({ valor, onCambio }: { valor: string; onCambio(c: string): void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETA.map(p => (
        <BotonLibre
          key={p.color} title={p.nombre} aria-label={p.nombre}
          onClick={() => onCambio(p.color)}
          className={cn('h-7 w-7 rounded-full border-2 transition-transform hover:scale-110', valor === p.color ? 'border-white' : 'border-transparent')}
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

function nombreDe(mapa: MapaConciencia, id: string) {
  return mapa.nodos.find(n => n.id === id)?.titulo || 'concepto';
}

export function PanelConcepto(p: Props) {
  const { mapa, seleccion, editando } = p;
  const nodo = seleccion.tipo === 'nodo' ? mapa.nodos.find(n => n.id === seleccion.id) : undefined;
  const flecha = seleccion.tipo === 'flecha' ? mapa.flechas.find(f => f.id === seleccion.id) : undefined;
  if (!nodo && !flecha) return null;

  return (
    <aside
      className="absolute inset-x-2 bottom-2 z-20 max-h-[62%] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/90 p-4 text-slate-100 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-3 md:top-16 md:max-h-[calc(100%-5rem)] md:w-[360px]"
      onPointerDown={e => e.stopPropagation()}
      aria-label={nodo ? `Concepto: ${nodo.titulo}` : 'Flecha'}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorSeguro(nodo?.color ?? flecha?.color) }} />
          <h3 className="truncate font-semibold">
            {nodo ? (nodo.titulo || 'Concepto sin nombre') : `${nombreDe(mapa, flecha!.de)} → ${nombreDe(mapa, flecha!.a)}`}
          </h3>
        </div>
        <BotonOscuro onClick={p.onCerrar} aria-label="Cerrar"><X className="h-4 w-4" /></BotonOscuro>
      </div>
      {nodo && (editando ? <EditarNodo {...p} nodo={nodo} /> : <VerNodo {...p} nodo={nodo} />)}
      {flecha && (editando ? <EditarFlecha {...p} flecha={flecha} /> : <VerFlecha {...p} flecha={flecha} />)}
    </aside>
  );
}

// ── Exploring ────────────────────────────────────────────────────────────────

function VerNodo({ mapa, nodo, onSeleccion, onIrAEstudio }: Props & { nodo: Nodo }) {
  const estudio = nodo.estudio ? ESTUDIOS_POR_ID[nodo.estudio] : undefined;
  const conexiones = mapa.flechas.filter(f => f.de === nodo.id || f.a === nodo.id);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {nodo.subtitulo && <p className="italic text-slate-300">{nodo.subtitulo}</p>}
      {nodo.explicacion && <p className="text-slate-200">{nodo.explicacion}</p>}
      {!!nodo.etiquetas?.length && (
        <div className="flex flex-wrap gap-1.5">
          {nodo.etiquetas.map(e => <span key={e} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs">{e}</span>)}
        </div>
      )}
      {estudio && (
        <BotonLibre onClick={() => onIrAEstudio(estudio.id)} className="flex w-full items-start justify-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm font-normal text-slate-100 hover:bg-white/10">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
          <span>
            <span className="block text-xs text-slate-400">Estudio relacionado · {estudio.anio}</span>
            <span className="block font-medium">{estudio.titulo}</span>
            <span className="mt-1 block text-xs text-amber-200">Ver el estudio ↓</span>
          </span>
        </BotonLibre>
      )}
      {!!conexiones.length && (
        <div>
          <span className={rotulo}>Se conecta con</span>
          <ul className="space-y-1">
            {conexiones.map(f => {
              const otro = f.de === nodo.id ? f.a : f.de;
              return (
                <li key={f.id}>
                  <BotonTexto className="text-slate-200" onClick={() => onSeleccion({ tipo: 'nodo', id: otro })}>
                    {nombreDe(mapa, otro)}
                  </BotonTexto>
                  {f.etiqueta && <span className="text-slate-400"> · {f.etiqueta}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="border-t border-white/10 pt-3 text-xs text-slate-400">Para cambiar este concepto o moverlo, pulsa <b>Editar mapa</b>.</p>
    </div>
  );
}

function VerFlecha({ mapa, flecha, onSeleccion }: Props & { flecha: Flecha }) {
  return (
    <div className="space-y-3 text-sm">
      {flecha.etiqueta && <p className="italic text-slate-200">«{flecha.etiqueta}»</p>}
      <p className="text-slate-300">
        Une{' '}
        <BotonTexto onClick={() => onSeleccion({ tipo: 'nodo', id: flecha.de })}>{nombreDe(mapa, flecha.de)}</BotonTexto>
        {' '}con{' '}
        <BotonTexto onClick={() => onSeleccion({ tipo: 'nodo', id: flecha.a })}>{nombreDe(mapa, flecha.a)}</BotonTexto>.
      </p>
      <p className="border-t border-white/10 pt-3 text-xs text-slate-400">Para cambiarla, pulsa <b>Editar mapa</b>.</p>
    </div>
  );
}

// ── Editing ─────────────────────────────────────────────────────────────────

function EditarNodo({ nodo, onCambiarNodo, onBorrar, onDuplicar, onConectarDesde }: Props & { nodo: Nodo }) {
  const c = (cambios: Partial<Nodo>, clave?: string) => onCambiarNodo(nodo.id, cambios, clave);
  return (
    <div className="space-y-3">
      <Fila etiqueta="Nombre"><Texto valor={nodo.titulo} onCambio={v => c({ titulo: v }, `t-${nodo.id}`)} /></Fila>
      {nodo.forma !== 'titulo' && nodo.forma !== 'nota' && (
        <Fila etiqueta="Debajo del nombre"><Texto valor={nodo.subtitulo ?? ''} placeholder="(opcional)" onCambio={v => c({ subtitulo: v || undefined }, `s-${nodo.id}`)} /></Fila>
      )}
      <Fila etiqueta={nodo.forma === 'nota' ? 'Texto de la nota' : 'Explicación (se lee al pinchar)'}>
        <Texto multilinea valor={nodo.explicacion ?? ''} onCambio={v => c({ explicacion: v || undefined }, `e-${nodo.id}`)} />
      </Fila>
      {(nodo.forma === 'canal' || nodo.etiquetas?.length) && (
        <Fila etiqueta="Píldoras (separadas por comas)">
          <Texto
            valor={(nodo.etiquetas ?? []).join(', ')}
            placeholder="voz, oído, vista…"
            onCambio={v => c({ etiquetas: v.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12) }, `p-${nodo.id}`)}
          />
        </Fila>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Fila etiqueta="Forma">
          <select className={campo} value={nodo.forma} onChange={e => c({ forma: e.target.value as Nodo['forma'] })}>
            {FORMAS.map(f => <option key={f.forma} value={f.forma} className="bg-slate-900">{f.nombre}</option>)}
          </select>
        </Fila>
        <Fila etiqueta={`Tamaño · ${Math.round((nodo.tam ?? 1) * 100)} %`}>
          <input type="range" min={0.6} max={1.8} step={0.05} value={nodo.tam ?? 1} onChange={e => c({ tam: Number(e.target.value) }, `z-${nodo.id}`)} className="mt-2 w-full accent-violet-300" />
        </Fila>
      </div>

      {nodo.forma === 'campo' && (
        <div className="grid grid-cols-2 gap-2">
          <Fila etiqueta="Nombre a la">
            <select className={campo} value={nodo.etiquetaPos ?? 'abajo'} onChange={e => c({ etiquetaPos: e.target.value as PosEtiqueta })}>
              <option value="abajo" className="bg-slate-900">Abajo</option>
              <option value="arriba" className="bg-slate-900">Arriba</option>
              <option value="derecha" className="bg-slate-900">Derecha</option>
              <option value="izquierda" className="bg-slate-900">Izquierda</option>
            </select>
          </Fila>
          <Fila etiqueta="Mira hacia">
            <select className={campo} value={nodo.espejo ? 'izq' : 'der'} onChange={e => c({ espejo: e.target.value === 'izq' })}>
              <option value="der" className="bg-slate-900">La derecha</option>
              <option value="izq" className="bg-slate-900">La izquierda</option>
            </select>
          </Fila>
        </div>
      )}

      <Fila etiqueta="Color"><Paleta valor={nodo.color} onCambio={color => c({ color })} /></Fila>

      {nodo.forma !== 'titulo' && nodo.forma !== 'nota' && nodo.forma !== 'campo' && nodo.forma !== 'matriz' && (
        <div>
          <span className={rotulo}>Icono</span>
          <div className="grid grid-cols-8 gap-1">
            {ICONOS.map(i => {
              const I = ICONOS_LUCIDE[i.icono];
              const activo = (nodo.icono ?? 'ninguno') === i.icono;
              return (
                <BotonLibre
                  key={i.icono} title={i.nombre} aria-label={i.nombre} onClick={() => c({ icono: i.icono })}
                  className={cn('flex h-8 items-center justify-center rounded-md border text-slate-200 hover:bg-white/10', activo ? 'border-white/70 bg-white/15' : 'border-white/10')}
                >
                  {I ? <I className="h-4 w-4" /> : <Minus className="h-3 w-3 opacity-50" />}
                </BotonLibre>
              );
            })}
          </div>
        </div>
      )}

      <Fila etiqueta="Estudio científico relacionado">
        <select className={campo} value={nodo.estudio ?? ''} onChange={e => c({ estudio: e.target.value || undefined })}>
          <option value="" className="bg-slate-900">Ninguno</option>
          {ESTUDIOS.map(e => <option key={e.id} value={e.id} className="bg-slate-900">{e.anio} · {e.autores.split(',')[0]} — {e.titulo.slice(0, 48)}{e.titulo.length > 48 ? '…' : ''}</option>)}
        </select>
      </Fila>

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <BotonOscuro onClick={() => onConectarDesde(nodo.id)}><Link2 className="h-3.5 w-3.5" /> Conectar con…</BotonOscuro>
        <BotonOscuro onClick={() => onDuplicar(nodo.id)}><Copy className="h-3.5 w-3.5" /> Duplicar</BotonOscuro>
        <BotonOscuro onClick={onBorrar} className="text-rose-200 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /> Borrar</BotonOscuro>
      </div>
      <p className="text-[11px] leading-snug text-slate-400">
        Arrastra el concepto para moverlo. Para crear una flecha, arrastra el círculo <b>+</b> hasta otro concepto (o usa «Conectar con…» y toca el destino).
      </p>
    </div>
  );
}

const DIRECCIONES: { d: Direccion; nombre: string; I: typeof ArrowRight }[] = [
  { d: 'ida', nombre: 'Hacia el destino', I: ArrowRight },
  { d: 'vuelta', nombre: 'Hacia el origen', I: ArrowLeft },
  { d: 'doble', nombre: 'En los dos sentidos', I: ArrowLeftRight },
  { d: 'ninguna', nombre: 'Sin punta', I: Minus },
];

function EditarFlecha({ flecha, onCambiarFlecha, onBorrar }: Props & { flecha: Flecha }) {
  const c = (cambios: Partial<Flecha>, clave?: string) => onCambiarFlecha(flecha.id, cambios, clave);
  return (
    <div className="space-y-3">
      <Fila etiqueta="Texto sobre la flecha"><Texto valor={flecha.etiqueta ?? ''} placeholder="(opcional)" onCambio={v => c({ etiqueta: v || undefined }, `fe-${flecha.id}`)} /></Fila>
      <div>
        <span className={rotulo}>Estilo</span>
        <div className="flex flex-wrap gap-1">
          {ESTILOS.map(e => <BotonOscuro key={e.estilo} activo={flecha.estilo === e.estilo} onClick={() => c({ estilo: e.estilo })}>{e.nombre}</BotonOscuro>)}
        </div>
      </div>
      <div>
        <span className={rotulo}>Dirección</span>
        <div className="flex flex-wrap gap-1">
          {DIRECCIONES.map(({ d, nombre, I }) => (
            <BotonOscuro key={d} activo={flecha.direccion === d} onClick={() => c({ direccion: d })} title={nombre} aria-label={nombre}><I className="h-4 w-4" /></BotonOscuro>
          ))}
          <BotonOscuro onClick={() => c({ de: flecha.a, a: flecha.de })} title="Cambiar el origen por el destino"><Repeat className="h-3.5 w-3.5" /> Invertir</BotonOscuro>
        </div>
      </div>
      <Fila etiqueta="Color"><Paleta valor={flecha.color} onCambio={color => c({ color })} /></Fila>
      <div className="grid grid-cols-2 gap-2">
        <Fila etiqueta="Curva">
          <input type="range" min={-0.6} max={0.6} step={0.02} value={flecha.curva ?? 0} onChange={e => c({ curva: Number(e.target.value) }, `fc-${flecha.id}`)} className="mt-2 w-full accent-violet-300" />
        </Fila>
        <Fila etiqueta="Grosor">
          <input type="range" min={1} max={6} step={0.5} value={flecha.grosor ?? 2} onChange={e => c({ grosor: Number(e.target.value) }, `fg-${flecha.id}`)} className="mt-2 w-full accent-violet-300" />
        </Fila>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <BotonOscuro onClick={onBorrar} className="text-rose-200 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /> Borrar flecha</BotonOscuro>
      </div>
    </div>
  );
}
