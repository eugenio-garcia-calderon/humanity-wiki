// ============================================================================
// CAMBIAR EL NOMBRE Y EL ICONO (2026-08-20, petición de Eugenio: «al hacer
// hover en un elemento debe aparecer 3 puntitos […] y permitir mediante una
// ventanita pop up cambiar el nombre e icono»).
// ============================================================================
// Una ventanita, no una página: renombrar algo es un gesto de dos segundos y
// mandarte a otro sitio para eso te saca de lo que estabas haciendo.
//
// ICONOS DE TRAZO, NO EMOJIS (D90, 2026-08-21, Eugenio: «haz que los iconos
// sean siempre en blanco y negro […] que no sean letras»). Los emojis los
// pinta el sistema operativo a todo color y cada uno el suyo: no se pueden
// teñir, no combinan entre sí y se ven distintos en cada máquina. Un icono de
// trazo hereda el color del texto y queda igual en todas partes.
//
// Y AL QUITARLOS DE AQUÍ dejan de poder elegirse, que es lo que permite que la
// pantalla no enseñe nunca uno: si se pudieran elegir y luego no se pintaran,
// la interfaz estaría mintiendo sobre lo que acabas de guardar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { subirArchivo } from '../../../utils/subir';
import { X, Loader2, Check, ImagePlus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import Icono, { esImagen } from '../../ui/Icono';
import { ICONOS } from '../../ui/iconosDeTrazo';
import { PREFIJO, iconoDeProyecto } from '../../../utils/iconoDeNombre';

/** Los que se pueden elegir a mano. Son los mismos que el diccionario puede
 *  poner solo, así que lo automático y lo elegido salen del mismo juego. */
const ELEGIBLES = Object.keys(ICONOS).map(n => PREFIJO + n);

/** «WateringCan» → «watering can», para poder buscarlo escribiendo normal.
 *  Sin esto habría que acertar la palabra pegada y en inglés con mayúsculas. */
const buscable = (v: string) =>
  v.slice(PREFIJO.length).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

/** El índice se calcula UNA vez para los 988, no en cada tecla. */
const INDICE = ELEGIBLES.map(v => ({ v, texto: buscable(v) }));

export default function PopupRenombrar({ tipo, id, nombre, icono, onHecho, onCerrar }: {
  tipo: string;
  id: string;
  nombre: string;
  icono?: string | null;
  /** Se avisa con lo que quedó, para repintar sin recargar. */
  onHecho: (nombre: string, icono: string | null) => void;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState(nombre);
  /** Lo que se ha escrito para buscar un icono. */
  const [filtroIcono, setFiltroIcono] = useState('');
  const visibles = useMemo(() => {
    const q = filtroIcono.trim().toLowerCase();
    if (!q) return ELEGIBLES;
    // Los que EMPIEZAN por lo escrito, primero: buscando «tree» interesa más
    // «Trees» que «PalmTree».
    const empiezan = INDICE.filter(x => x.texto.startsWith(q));
    const contienen = INDICE.filter(x => !x.texto.startsWith(q) && x.texto.includes(q));
    return [...empiezan, ...contienen].map(x => x.v);
  }, [filtroIcono]);
  // LO QUE SE ENSEÑA AQUÍ TIENE QUE SER LO QUE SE VE FUERA. Un proyecto con un
  // emoji antiguo guardado se pinta con su icono de trazo en el menú y en su
  // página (D90); si el popup siguiera enseñando el emoji, la misma cosa
  // tendría dos caras según por dónde la mires — y elegir «guardar» sin tocar
  // nada dejaría escrito algo distinto de lo que se ve.
  const [elegido, setElegido] = useState<string | null>(
    tipo === 'proyecto' ? iconoDeProyecto(icono, nombre) : (icono || null),
  );
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  /** Subir una imagen como icono. Va por la misma ruta de siempre, así que no
   *  hay un sitio nuevo donde guardar ficheros ni límites que repetir. */
  const subirImagen = async (f?: File) => {
    if (!f) return;
    setSubiendo(true);
    setError(null);
    try {
      const sub = await subirArchivo(f);
      if (sub.error) { setError(sub.error); return; }
      setElegido(sub.url);
    } catch {
      setError('No se ha podido subir la imagen.');
    } finally { setSubiendo(false); }
  };

  // Escape cierra, como cualquier ventanita.
  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [onCerrar]);

  const guardar = async () => {
    const n = texto.trim();
    if (!n) { setError('El nombre no puede quedar vacío.'); return; }
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch(`/api/elemento/${tipo}/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: n, icono: elegido }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d?.error || 'No se ha podido guardar.'); return; }
      onHecho(n, elegido);
      onCerrar();
    } catch {
      setError('No se ha podido guardar.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/30 backdrop-blur-[1px] grid place-items-center p-4"
      onClick={onCerrar}>
      <div ref={cajaRef} className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-black text-slate-900">Nombre e icono</h2>
          <button onClick={onCerrar} disabled={guardando}
            className="ml-auto p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); guardar(); }}>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-slate-100 overflow-hidden">
              {elegido ? <Icono valor={elegido} tamano={esImagen(elegido) ? 36 : 22} /> : <span className="text-lg text-slate-300">·</span>}
            </span>
            <input
              autoFocus
              value={texto}
              onChange={e => setTexto(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
            />
          </div>

          <div className="mt-3 mb-1.5 flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Icono</p>
            {/* UNA IMAGEN TUYA como icono, no solo emojis. Se guarda en la
                misma columna: un icono que empieza por «/» es una dirección y
                cualquier otra cosa es un emoji. */}
            <input ref={fotoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { subirImagen(e.target.files?.[0]); e.target.value = ''; }} />
            <button type="button" onClick={() => fotoRef.current?.click()} disabled={subiendo}
              className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 transition-colors">
              {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {subiendo ? 'Subiendo…' : 'Subir imagen'}
            </button>
          </div>
          {/* ══ BUSCAR ENTRE LOS ICONOS (2026-08-22, hormiguero #9) ═════════
              Con 53 se elegía mirando; con 988 hay que poder pedirlos por su
              nombre. Sin este campo, ampliar la lista la habría empeorado: más
              cosas que mirar y ninguna forma de llegar a la que quieres.

              SE BUSCA EN INGLÉS porque los iconos se llaman así, y se dice en
              el marcador de posición para que nadie escriba «barco» y crea que
              no hay ninguno. */}
          <input
            value={filtroIcono}
            onChange={e => setFiltroIcono(e.target.value)}
            placeholder="Buscar icono (en inglés: boat, tree, heart…)"
            className="w-full mb-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-emerald-300"
          />
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto pr-0.5">
            {/* «Ninguno» va el primero: quitar el icono tiene que ser tan fácil
                como ponerlo. */}
            <button type="button" onClick={() => setElegido(null)} title="Sin icono"
              className={cn('h-8 rounded-lg text-[10px] font-bold transition-colors',
                elegido === null ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100')}>
              —
            </button>
            {visibles.map(v => (
              <button key={v} type="button" onClick={() => setElegido(v)} title={v.slice(PREFIJO.length)}
                className={cn('h-8 grid place-items-center rounded-lg text-slate-600 transition-colors',
                  elegido === v ? 'bg-emerald-100 ring-2 ring-emerald-400 text-emerald-700' : 'hover:bg-slate-100')}>
                <Icono valor={v} tamano={17} />
              </button>
            ))}
            {/* NO HAY NINGUNO CON ESE NOMBRE, y se dice. Una rejilla que se
                queda vacía sin explicación se lee como que la pantalla se ha
                roto. */}
            {filtroIcono && visibles.length === 0 && (
              <p className="col-span-8 py-3 text-center text-[11px] text-slate-400">
                Ninguno se llama así. Prueba en inglés: «boat», «leaf», «tool»…
              </p>
            )}
          </div>

          {error && (
            <p className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{error}</p>
          )}

          <button type="submit" disabled={guardando || !texto.trim()}
            className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
