import { useMemo, useRef, useState } from 'react';
import { Loader2, ImagePlus } from 'lucide-react';
import { cn } from '../../utils/cn';
import Icono from './Icono';
import { ICONOS } from './iconosDeTrazo';
import { PREFIJO } from '../../utils/iconoDeNombre';
import { subirArchivo } from '../../utils/subir';

// ============================================================================
// ELEGIR UN ICONO (2026-08-26)
// ============================================================================
// Sacado de `PopupRenombrar`, donde vivía, el día que hizo falta el mismo
// selector en la ventanita de editar una tarjeta de proyecto. Son 988 iconos
// con su buscador, su subida de imagen y su «ninguno»: copiarlo habría dejado
// dos rejillas que el día que cambie una se quedan distintas — y la que se
// quede vieja seguirá pareciendo correcta.
//
// ICONOS DE TRAZO, NO EMOJIS (D90, 2026-08-21, Eugenio: «que los iconos sean
// siempre en blanco y negro […] que no sean letras»). Un emoji lo pinta el
// sistema operativo a todo color y cada uno el suyo: no se tiñe, no combina y
// se ve distinto en cada máquina. Y al no poder elegirse aquí, la pantalla no
// puede enseñar nunca uno — que es lo que impide que la interfaz mienta sobre
// lo que acabas de guardar.

/** Los que se pueden elegir a mano. Son los mismos que el diccionario puede
 *  poner solo, así que lo automático y lo elegido salen del mismo juego. */
const ELEGIBLES = Object.keys(ICONOS).map(n => PREFIJO + n);

/** «WateringCan» → «watering can», para poder buscarlo escribiendo normal.
 *  Sin esto habría que acertar la palabra pegada y en inglés con mayúsculas. */
const buscable = (v: string) =>
  v.slice(PREFIJO.length).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

/** El índice se calcula UNA vez para los 988, no en cada tecla. */
const INDICE = ELEGIBLES.map(v => ({ v, texto: buscable(v) }));

export default function SelectorDeIcono({ valor, onElegir, alto = 'max-h-40' }: {
  valor: string | null;
  onElegir: (v: string | null) => void;
  /** Cuánto ocupa la rejilla. La ventanita de renombrar tiene menos sitio que
   *  la de editar un proyecto entero, y forzarlas a la misma altura sería
   *  hacerle a una lo que le conviene a la otra. */
  alto?: string;
}) {
  const [filtro, setFiltro] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return ELEGIBLES;
    // Los que EMPIEZAN por lo escrito, primero: buscando «tree» interesa más
    // «Trees» que «PalmTree».
    const empiezan = INDICE.filter(x => x.texto.startsWith(q));
    const contienen = INDICE.filter(x => !x.texto.startsWith(q) && x.texto.includes(q));
    return [...empiezan, ...contienen].map(x => x.v);
  }, [filtro]);

  /** Subir una imagen como icono. Va por la ruta de subida de siempre, así que
   *  no hay un sitio nuevo donde guardar ficheros ni límites que repetir. */
  const subirImagen = async (f?: File) => {
    if (!f) return;
    setSubiendo(true); setError(null);
    try {
      const sub = await subirArchivo(f);
      if (sub.error) { setError(sub.error); return; }
      onElegir(sub.url);
    } catch {
      setError('No se ha podido subir la imagen.');
    } finally { setSubiendo(false); }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Icono</p>
        {/* UNA IMAGEN TUYA como icono, no solo iconos de trazo. Se guarda en la
            misma columna: un icono que empieza por «/» es una dirección y
            cualquier otra cosa es un nombre de icono. */}
        <input ref={fotoRef} type="file" accept="image/*" className="hidden"
          onChange={e => { subirImagen(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" onClick={() => fotoRef.current?.click()} disabled={subiendo}
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40 transition-colors">
          {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          {subiendo ? 'Subiendo…' : 'Subir imagen'}
        </button>
      </div>

      {/* ══ BUSCAR ENTRE LOS ICONOS (2026-08-22, hormiguero #9) ═════════════
          Con 53 se elegía mirando; con 988 hay que poder pedirlos por su
          nombre. SE BUSCA EN INGLÉS porque los iconos se llaman así, y se dice
          aquí para que nadie escriba «barco» y crea que no hay ninguno. */}
      <input
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        placeholder="Buscar icono (en inglés: boat, tree, heart…)"
        className="w-full mb-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-emerald-300"
      />

      <div className={cn('grid grid-cols-8 gap-1 overflow-y-auto pr-0.5', alto)}>
        {/* «Ninguno» va el primero: quitar el icono tiene que ser tan fácil
            como ponerlo. */}
        <button type="button" onClick={() => onElegir(null)} title="Sin icono"
          className={cn('h-8 rounded-lg text-[10px] font-bold transition-colors',
            valor === null ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100')}>
          —
        </button>
        {visibles.map(v => (
          <button key={v} type="button" onClick={() => onElegir(v)} title={v.slice(PREFIJO.length)}
            className={cn('h-8 grid place-items-center rounded-lg text-slate-600 transition-colors',
              valor === v ? 'bg-emerald-100 ring-2 ring-emerald-400 text-emerald-700' : 'hover:bg-slate-100')}>
            <Icono valor={v} tamano={17} />
          </button>
        ))}
        {/* NO HAY NINGUNO CON ESE NOMBRE, y se dice. Una rejilla que se queda
            vacía sin explicación se lee como que la pantalla se ha roto. */}
        {filtro && visibles.length === 0 && (
          <p className="col-span-8 py-3 text-center text-[11px] text-slate-400">
            Ninguno se llama así. Prueba en inglés: «boat», «leaf», «tool»…
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{error}</p>
      )}
    </div>
  );
}
