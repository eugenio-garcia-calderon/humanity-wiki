import { useState, type ReactNode } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Monitor, Smartphone, Image as ImageIcon, Loader2, Smile } from 'lucide-react';
import { cn } from '../../utils/cn';
import { subirArchivo } from '../../utils/subir';
import { MarcoSitio, IconoMenu, ICONOS_MENU, TextoSencillo } from '../sitio/MenuSitio';
import {
  type Sitio, type Enlace, type Destino, type DocLegal, type Menu, type Pie,
  completarSitio, NOMBRES_LEGALES, textoLegal,
} from '../sitio/sitioWeb';

// ============================================================================
// EL CREADOR DEL MENÚ Y DEL PIE (2026-10-02)
// ============================================================================
// Eugenio: «sofisticado, con todas las cosas necesarias para un buen menú,
// pero que al mismo tiempo sea simple».
//
// Lo simple: cada decisión es un botón con sus opciones a la vista (arriba o
// lateral, tres rayas o no, tamaño...), nada de menús dentro de menús, y a la
// derecha la web tal como va a salir, en escritorio o en teléfono. Es el MISMO
// componente que pinta la página publicada (`MarcoSitio`), no un dibujo
// parecido: lo que se ve aquí es lo que se publica.
//
// Lo sofisticado: enlaces con icono, en forma de texto o de botón, que llevan
// a una sección de la página, a una subpágina, al contacto, a un texto legal
// o a cualquier dirección; colores; pie con contacto y textos legales.
//
// Se guarda al momento, como el resto de la página.

export type OpcionesDestino = {
  secciones: { id: string; titulo: string }[];
  paginas: { id: string; titulo: string }[];
};

export default function CreadorMenu({ sitio: guardado, titulo, icono, opciones, onCambio, onCerrar }: {
  sitio: any;
  /** El título y el icono de la página: lo que sale si no se pone otro. */
  titulo: string;
  icono: string | null;
  opciones: OpcionesDestino;
  onCambio: (s: Sitio) => void;
  onCerrar: () => void;
}) {
  const [s, setS] = useState<Sitio>(() => completarSitio(guardado));
  const [pestana, setPestana] = useState<'menu' | 'pie' | 'legal'>('menu');
  const [pantalla, setPantalla] = useState<'escritorio' | 'telefono'>('escritorio');
  const poner = (n: Sitio) => { setS(n); onCambio(n); };
  const menu = (p: Partial<Menu>) => poner({ ...s, menu: { ...s.menu, ...p } });
  const pie = (p: Partial<Pie>) => poner({ ...s, pie: { ...s.pie, ...p } });

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/40 flex" onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Menú y pie de página"
        className="m-auto w-full h-full sm:h-[94vh] sm:w-[96vw] max-w-[1500px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-black text-slate-800">Menú y pie de página</h2>
          <p className="hidden md:block text-[11px] text-slate-400">Se ven igual en esta página y en todas las que cuelgan de ella.</p>
          <button onClick={onCerrar} aria-label="Cerrar" className="ml-auto w-11 h-11 grid place-items-center text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Los mandos */}
          <div className="lg:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col min-h-0 max-h-[55vh] lg:max-h-none">
            <div className="flex gap-1 p-2 border-b border-slate-100 shrink-0" role="tablist">
              {([['menu', 'Menú'], ['pie', 'Pie de página'], ['legal', 'Datos legales']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                  className={cn('flex-1 h-10 rounded-lg text-xs font-bold transition-colors',
                    pestana === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50')}>{l}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {pestana === 'menu' && <MandosMenu s={s} menu={menu} poner={poner} titulo={titulo} opciones={opciones} />}
              {pestana === 'pie' && <MandosPie s={s} pie={pie} poner={poner} titulo={titulo} opciones={opciones} />}
              {pestana === 'legal' && <MandosLegal s={s} poner={poner} titulo={titulo} />}
            </div>
          </div>

          {/* La web, tal como sale */}
          <div className="flex-1 min-h-0 flex flex-col bg-slate-100">
            <div className="flex items-center justify-center gap-1 p-2 shrink-0">
              {([['escritorio', 'Escritorio', Monitor], ['telefono', 'Teléfono', Smartphone]] as const).map(([k, l, I]) => (
                <button key={k} onClick={() => setPantalla(k)}
                  className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold',
                    pantalla === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  <I className="w-3.5 h-3.5" /> {l}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
              <div
                // En la vista previa los enlaces no llevan a ninguna parte:
                // salir del editor por pinchar un «Inicio» de mentira sería un susto.
                onClickCapture={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}
                className={cn('mx-auto bg-white shadow-lg rounded-xl overflow-hidden transition-all',
                  pantalla === 'telefono' ? 'w-[375px]' : 'w-full')}>
                <MarcoSitio sitio={s} rutas={{ enlacePagina: id => `#${id}`, raizId: null }} logo={icono} nombre={titulo}>
                  <div className="mx-auto max-w-6xl px-5 py-10 space-y-4">
                    <p className="text-3xl font-black text-slate-900">{titulo || 'Sin título'}</p>
                    {[92, 80, 86, 60].map((w, i) => <div key={i} className="h-3 rounded bg-slate-100" style={{ width: `${w}%` }} />)}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="aspect-video rounded-xl bg-slate-100" /><div className="aspect-video rounded-xl bg-slate-100" />
                    </div>
                  </div>
                </MarcoSitio>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LOS MANDOS DEL MENÚ ────────────────────────────────────────────────────

function MandosMenu({ s, menu, poner, titulo, opciones }: {
  s: Sitio; menu: (p: Partial<Menu>) => void; poner: (n: Sitio) => void; titulo: string; opciones: OpcionesDestino;
}) {
  const m = s.menu;
  return (
    <>
      <Interruptor etiqueta="Mostrar el menú" valor={m.activo} onCambio={v => menu({ activo: v })} />
      {m.activo && (
        <>
          <Grupo titulo="Dónde va">
            <Elegir valor={m.posicion} onCambio={v => menu({ posicion: v })}
              opciones={[['arriba', 'Barra de arriba'], ['lateral', 'En un lateral']]} />
          </Grupo>
          <Grupo titulo="Las tres rayas" ayuda="Los enlaces recogidos en un botón ☰.">
            <Elegir valor={m.plegado} onCambio={v => menu({ plegado: v })}
              opciones={[['nunca', 'Nunca'], ['movil', 'En el teléfono'], ['siempre', 'Siempre']]} />
          </Grupo>
          {m.posicion === 'arriba' && (
            <Grupo titulo="Enlaces a la">
              <Elegir valor={m.alineacion} onCambio={v => menu({ alineacion: v })}
                opciones={[['izquierda', 'Izquierda'], ['centro', 'Centro'], ['derecha', 'Derecha']]} />
            </Grupo>
          )}
          <Grupo titulo="Tamaño">
            <Elegir valor={m.tamano} onCambio={v => menu({ tamano: v })}
              opciones={[['pequeno', 'Pequeño'], ['mediano', 'Mediano'], ['grande', 'Grande']]} />
          </Grupo>
          <div className="space-y-1">
            <Interruptor etiqueta="Fijo al bajar la página" valor={m.fijo} onCambio={v => menu({ fijo: v })} />
            <Interruptor etiqueta="Raya de separación" valor={m.borde} onCambio={v => menu({ borde: v })} />
          </div>

          <Grupo titulo="Logotipo y nombre">
            <Interruptor etiqueta="Mostrar el logotipo" valor={m.mostrarLogo} onCambio={v => menu({ mostrarLogo: v })} />
            {m.mostrarLogo && <ElegirLogo valor={m.logo} onCambio={v => menu({ logo: v })} />}
            <Interruptor etiqueta="Mostrar el nombre" valor={m.mostrarNombre} onCambio={v => menu({ mostrarNombre: v })} />
            {m.mostrarNombre && <Campo valor={m.nombre || ''} placeholder={titulo || 'El nombre de tu web'} onCambio={v => menu({ nombre: v || undefined })} />}
          </Grupo>

          <Grupo titulo="Colores">
            <div className="grid grid-cols-3 gap-2">
              <Color etiqueta="Fondo" valor={m.fondo} onCambio={v => menu({ fondo: v })} />
              <Color etiqueta="Texto" valor={m.texto} onCambio={v => menu({ texto: v })} />
              <Color etiqueta="Botones" valor={m.acento} onCambio={v => menu({ acento: v })} />
            </div>
            <Paletas onElegir={(fondo, texto, acento) => menu({ fondo, texto, acento })} />
          </Grupo>

          <Grupo titulo="Enlaces">
            <ListaEnlaces enlaces={m.enlaces} conEstilo opciones={opciones}
              onCambio={enlaces => poner({ ...s, menu: { ...m, enlaces } })} />
          </Grupo>
        </>
      )}
    </>
  );
}

// ── LOS MANDOS DEL PIE ─────────────────────────────────────────────────────

function MandosPie({ s, pie, poner, titulo, opciones }: {
  s: Sitio; pie: (p: Partial<Pie>) => void; poner: (n: Sitio) => void; titulo: string; opciones: OpcionesDestino;
}) {
  const p = s.pie;
  const c = p.contacto;
  return (
    <>
      <Interruptor etiqueta="Mostrar el pie de página" valor={p.activo} onCambio={v => pie({ activo: v })} />
      {p.activo && (
        <>
          <Grupo titulo="Logotipo y nombre">
            <Interruptor etiqueta="Mostrar el logotipo" valor={p.mostrarLogo} onCambio={v => pie({ mostrarLogo: v })} />
            {p.mostrarLogo && <ElegirLogo valor={p.logo} onCambio={v => pie({ logo: v })} ayuda="Vacío: el mismo del menú." />}
            <Campo valor={p.nombre || ''} placeholder={s.menu.nombre || titulo || 'El nombre de tu web'} onCambio={v => pie({ nombre: v || undefined })} />
            <Campo valor={p.descripcion || ''} placeholder="Una frase sobre quién eres o qué haces" multilinea
              onCambio={v => pie({ descripcion: v || undefined })} />
          </Grupo>

          <Grupo titulo="Contacto">
            <Campo valor={c.email || ''} placeholder="Correo electrónico" tipo="email" onCambio={v => pie({ contacto: { ...c, email: v || undefined } })} />
            <Campo valor={c.telefono || ''} placeholder="Teléfono" tipo="tel" onCambio={v => pie({ contacto: { ...c, telefono: v || undefined } })} />
            <Campo valor={c.direccion || ''} placeholder="Dirección" multilinea onCambio={v => pie({ contacto: { ...c, direccion: v || undefined } })} />
          </Grupo>

          <Grupo titulo="Textos legales" ayuda="Los que pide la Unión Europea. Rellena tus datos en «Datos legales».">
            {(Object.keys(NOMBRES_LEGALES) as DocLegal[]).map(d => (
              <Interruptor key={d} etiqueta={NOMBRES_LEGALES[d]} valor={p.legales[d]}
                onCambio={v => pie({ legales: { ...p.legales, [d]: v } })} />
            ))}
            <Interruptor etiqueta="Línea © con el año y el nombre" valor={p.copyright} onCambio={v => pie({ copyright: v })} />
          </Grupo>

          <Grupo titulo="Colores">
            <div className="grid grid-cols-2 gap-2">
              <Color etiqueta="Fondo" valor={p.fondo} onCambio={v => pie({ fondo: v })} />
              <Color etiqueta="Texto" valor={p.texto} onCambio={v => pie({ texto: v })} />
            </div>
            <Paletas onElegir={(fondo, texto) => pie({ fondo, texto })} />
          </Grupo>

          <Grupo titulo="Enlaces del pie" ayuda="Redes sociales, páginas importantes...">
            <ListaEnlaces enlaces={p.enlaces} opciones={opciones}
              onCambio={enlaces => poner({ ...s, pie: { ...p, enlaces } })} />
          </Grupo>
        </>
      )}
    </>
  );
}

// ── LOS DATOS LEGALES ──────────────────────────────────────────────────────

function MandosLegal({ s, poner, titulo }: { s: Sitio; poner: (n: Sitio) => void; titulo: string }) {
  const t = s.titular;
  const titular = (p: Partial<typeof t>) => poner({ ...s, titular: { ...t, ...p } });
  const [viendo, setViendo] = useState<DocLegal | null>(null);
  return (
    <>
      <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
        Con estos datos se rellenan el aviso legal, la política de privacidad y la de cookies. Son
        <b> plantillas orientativas</b> que cubren lo básico de la LSSI y el RGPD: revísalas, sobre todo si vendes o
        recoges datos de forma distinta. Lo que falte saldrá entre corchetes.
      </p>
      <Grupo titulo="Quién es el titular de la web">
        <Campo valor={t.nombre || ''} placeholder="Nombre o razón social" onCambio={v => titular({ nombre: v || undefined })} />
        <Campo valor={t.nif || ''} placeholder="NIF o CIF" onCambio={v => titular({ nif: v || undefined })} />
        <Campo valor={t.domicilio || ''} placeholder="Domicilio" multilinea onCambio={v => titular({ domicilio: v || undefined })} />
        <Campo valor={t.email || ''} placeholder="Correo (si no, el del contacto)" tipo="email" onCambio={v => titular({ email: v || undefined })} />
        <Campo valor={t.telefono || ''} placeholder="Teléfono (opcional)" tipo="tel" onCambio={v => titular({ telefono: v || undefined })} />
        <Campo valor={t.registro || ''} placeholder="Datos del Registro Mercantil (si es una sociedad)" onCambio={v => titular({ registro: v || undefined })} />
      </Grupo>
      <Grupo titulo="Los textos">
        {(Object.keys(NOMBRES_LEGALES) as DocLegal[]).map(d => {
          const propio = s.textos[d] !== undefined;
          return (
            <div key={d} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex-1">{NOMBRES_LEGALES[d]}</span>
                <button onClick={() => setViendo(viendo === d ? null : d)} className="h-9 px-2 text-[11px] font-bold text-slate-500 hover:text-slate-800">
                  {viendo === d ? 'Ocultar' : 'Ver'}
                </button>
                <button onClick={() => poner({ ...s, textos: { ...s.textos, [d]: propio ? undefined : textoLegal(d, { ...s, textos: {} }, titulo) } })}
                  className="h-9 px-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900">
                  {propio ? 'Volver a la plantilla' : 'Escribir el mío'}
                </button>
              </div>
              {propio && (
                <textarea value={s.textos[d] || ''} rows={10}
                  onChange={e => poner({ ...s, textos: { ...s.textos, [d]: e.target.value } })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 font-mono" />
              )}
              {viendo === d && !propio && (
                <div className="max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3"><TextoSencillo texto={textoLegal(d, s, titulo)} /></div>
              )}
            </div>
          );
        })}
      </Grupo>
    </>
  );
}

// ── LOS ENLACES ────────────────────────────────────────────────────────────

const nuevoId = () => 'e' + Math.random().toString(36).slice(2, 9);

function ListaEnlaces({ enlaces, onCambio, conEstilo, opciones }: {
  enlaces: Enlace[]; onCambio: (e: Enlace[]) => void; conEstilo?: boolean; opciones: OpcionesDestino;
}) {
  const cambiar = (i: number, p: Partial<Enlace>) => onCambio(enlaces.map((e, j) => j === i ? { ...e, ...p } : e));
  const mover = (i: number, d: number) => {
    const n = [...enlaces]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onCambio(n);
  };
  return (
    <div className="space-y-2">
      {enlaces.map((e, i) => (
        <div key={e.id} className="rounded-xl border border-slate-200 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <ElegirIcono valor={e.icono} onCambio={v => cambiar(i, { icono: v })} />
            <input value={e.texto} onChange={ev => cambiar(i, { texto: ev.target.value })} placeholder="Texto del enlace"
              className="min-w-0 flex-1 h-10 rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-emerald-400" />
            <button disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir" className="w-8 h-10 grid place-items-center text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button disabled={i === enlaces.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar" className="w-8 h-10 grid place-items-center text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
            <button onClick={() => onCambio(enlaces.filter((_, j) => j !== i))} aria-label="Quitar" className="w-8 h-10 grid place-items-center text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <ElegirDestino valor={e.destino} opciones={opciones} onCambio={d => cambiar(i, { destino: d })} />
          {conEstilo && (
            <Elegir valor={e.estilo || 'texto'} onCambio={v => cambiar(i, { estilo: v })} pequeno
              opciones={[['texto', 'Como texto'], ['boton', 'Como botón']]} />
          )}
        </div>
      ))}
      <button onClick={() => onCambio([...enlaces, { id: nuevoId(), texto: 'Nuevo enlace', destino: { tipo: 'inicio' } }])}
        className="w-full h-11 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-700 inline-flex items-center justify-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Añadir un enlace
      </button>
    </div>
  );
}

/** El destino se elige de una lista, y sólo «Dirección web» pide escribir. */
function ElegirDestino({ valor, opciones, onCambio }: { valor: Destino; opciones: OpcionesDestino; onCambio: (d: Destino) => void }) {
  const clave = valor.tipo === 'pagina' ? `pagina:${valor.id}`
    : valor.tipo === 'seccion' ? `seccion:${valor.bloque}`
    : valor.tipo === 'legal' ? `legal:${valor.doc}` : valor.tipo;
  const elegir = (k: string) => {
    const [tipo, x] = k.split(':');
    if (tipo === 'pagina') onCambio({ tipo: 'pagina', id: x, titulo: opciones.paginas.find(p => p.id === x)?.titulo });
    else if (tipo === 'seccion') onCambio({ tipo: 'seccion', bloque: x, titulo: opciones.secciones.find(p => p.id === x)?.titulo });
    else if (tipo === 'legal') onCambio({ tipo: 'legal', doc: x as DocLegal });
    else if (tipo === 'url') onCambio({ tipo: 'url', url: '' });
    else onCambio({ tipo: tipo as 'inicio' | 'contacto' });
  };
  // Una página o sección que ya no está en la lista (se borró) se sigue
  // enseñando con su nombre: si no, el desplegable diría otra cosa.
  const huerfana = (valor.tipo === 'pagina' && !opciones.paginas.some(p => p.id === valor.id))
    || (valor.tipo === 'seccion' && !opciones.secciones.some(p => p.id === valor.bloque));
  return (
    <div className="space-y-2">
      <select value={clave} onChange={e => elegir(e.target.value)} aria-label="Adónde lleva"
        className="w-full h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 outline-none focus:border-emerald-400">
        <option value="inicio">Lleva a: Inicio</option>
        <option value="contacto">Lleva a: Contacto (el pie)</option>
        <option value="url">Lleva a: una dirección web, correo o teléfono</option>
        {huerfana && <option value={clave}>Lleva a: {(valor as any).titulo || 'algo que ya no está'}</option>}
        {opciones.secciones.length > 0 && (
          <optgroup label="Una sección de esta página">
            {opciones.secciones.map(x => <option key={x.id} value={`seccion:${x.id}`}>{x.titulo}</option>)}
          </optgroup>
        )}
        {opciones.paginas.length > 0 && (
          <optgroup label="Una página de tu web">
            {opciones.paginas.map(x => <option key={x.id} value={`pagina:${x.id}`}>{x.titulo}</option>)}
          </optgroup>
        )}
        <optgroup label="Un texto legal">
          {(Object.keys(NOMBRES_LEGALES) as DocLegal[]).map(d => <option key={d} value={`legal:${d}`}>{NOMBRES_LEGALES[d]}</option>)}
        </optgroup>
      </select>
      {valor.tipo === 'url' && (
        <input value={valor.url} onChange={e => onCambio({ tipo: 'url', url: e.target.value })}
          placeholder="https://…, mailto:hola@… o tel:+34…" inputMode="url"
          className="w-full h-10 rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-emerald-400" />
      )}
    </div>
  );
}

function ElegirIcono({ valor, onCambio }: { valor?: string; onCambio: (v?: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [emoji, setEmoji] = useState('');
  return (
    <div className="relative shrink-0">
      <button onClick={() => setAbierto(a => !a)} aria-label="Icono"
        className="w-10 h-10 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300">
        {valor ? <IconoMenu valor={valor} tamano={16} /> : <Smile className="w-4 h-4 text-slate-300" />}
      </button>
      {abierto && (
        <div className="absolute left-0 top-full mt-1 z-20 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-2">
          <div className="grid grid-cols-8 gap-1">
            {Object.keys(ICONOS_MENU).map(n => (
              <button key={n} title={n} onClick={() => { onCambio(`lucide:${n}`); setAbierto(false); }}
                className={cn('w-8 h-8 grid place-items-center rounded-md text-slate-600 hover:bg-slate-100', valor === `lucide:${n}` && 'bg-emerald-50 text-emerald-700')}>
                <IconoMenu valor={`lucide:${n}`} tamano={16} />
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="o un emoji 🐝" maxLength={8}
              className="min-w-0 flex-1 h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-emerald-400" />
            <button onClick={() => { if (emoji.trim()) { onCambio(emoji.trim()); setAbierto(false); } }}
              className="h-9 px-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold">Poner</button>
            <button onClick={() => { onCambio(undefined); setAbierto(false); }} className="h-9 px-2 text-[11px] font-bold text-slate-400 hover:text-rose-600">Sin icono</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ElegirLogo({ valor, onCambio, ayuda }: { valor?: string; onCambio: (v?: string) => void; ayuda?: string }) {
  const [subiendo, setSubiendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="w-11 h-11 rounded-lg border border-slate-200 grid place-items-center bg-slate-50 overflow-hidden">
          {valor ? <IconoMenu valor={valor} tamano={32} /> : <span className="text-[9px] text-slate-400 text-center leading-tight">el de la página</span>}
        </div>
        <label className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-slate-300 cursor-pointer">
          {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {valor ? 'Cambiar' : 'Subir logotipo'}
          <input type="file" accept="image/*" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            setSubiendo(true); setFallo(null);
            const r = await subirArchivo(f);
            setSubiendo(false);
            if (r.error) setFallo(r.error); else onCambio(r.url);
          }} />
        </label>
        {valor && <button onClick={() => onCambio(undefined)} className="h-11 px-2 text-xs font-bold text-slate-400 hover:text-rose-600">Quitar</button>}
      </div>
      {ayuda && !valor && <p className="mt-1 text-[11px] text-slate-400">{ayuda}</p>}
      {fallo && <p className="mt-1 text-xs font-bold text-rose-600">{fallo}</p>}
    </div>
  );
}

// ── PIEZAS PEQUEÑAS ────────────────────────────────────────────────────────

/** Combinaciones que quedan bien, para no tener que pensar en colores. */
const PALETAS: [string, string, string][] = [
  ['#ffffff', '#0f172a', '#0f172a'], ['#0f172a', '#f8fafc', '#facc15'], ['#f8f5ef', '#3f3a33', '#b45309'],
  ['#ecfdf5', '#064e3b', '#059669'], ['#eff6ff', '#1e3a8a', '#2563eb'], ['#2b2258', '#f5f3ff', '#fbbf24'],
];

function Paletas({ onElegir }: { onElegir: (fondo: string, texto: string, acento: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {PALETAS.map(([f, t, a]) => (
        <button key={f + a} onClick={() => onElegir(f, t, a)} title="Usar estos colores"
          className="h-8 w-12 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center gap-1" style={{ background: f }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: t }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: a }} />
        </button>
      ))}
    </div>
  );
}

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
          className={cn('flex-1 rounded-lg font-bold transition-colors', pequeno ? 'h-8 text-[11px]' : 'h-10 text-xs',
            valor === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{l}</button>
      ))}
    </div>
  );
}

function Interruptor({ etiqueta, valor, onCambio }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={valor} onClick={() => onCambio(!valor)} className="w-full flex items-center gap-3 py-1.5 text-left">
      <span className="flex-1 text-xs font-bold text-slate-700">{etiqueta}</span>
      <span className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', valor ? 'bg-emerald-500' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', valor ? 'left-[1.125rem]' : 'left-0.5')} />
      </span>
    </button>
  );
}

function Campo({ valor, placeholder, onCambio, multilinea, tipo = 'text' }: {
  valor: string; placeholder: string; onCambio: (v: string) => void; multilinea?: boolean; tipo?: string;
}) {
  const clase = 'w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-emerald-400';
  return multilinea
    ? <textarea value={valor} placeholder={placeholder} rows={2} onChange={e => onCambio(e.target.value)} className={cn(clase, 'py-2 resize-none')} />
    : <input type={tipo} value={valor} placeholder={placeholder} onChange={e => onCambio(e.target.value)} className={cn(clase, 'h-11')} />;
}

function Color({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 h-11 px-2 rounded-lg border border-slate-200 cursor-pointer">
      <input type="color" value={valor} onChange={e => onCambio(e.target.value)} className="w-7 h-7 rounded border-0 p-0 bg-transparent cursor-pointer" />
      <span className="text-[11px] font-bold text-slate-600 truncate">{etiqueta}</span>
    </label>
  );
}
