// ============================================================================
// UN TEXTO QUE UN ADMINISTRADOR PUEDE CAMBIAR SIN TOCAR EL CÓDIGO (2026-08-22)
// ============================================================================
// Eugenio: «permite a los ADMIN editar todos los textos de esas páginas de
// información». Se usa así, envolviendo lo que ya había:
//
//     <TextoEditable clave="servidores.intro">
//       Aquí va el texto de siempre, tal cual estaba escrito.
//     </TextoEditable>
//
// ── EL TEXTO POR DEFECTO SE QUEDA EN LA PÁGINA ─────────────────────────────
// Lo que hay entre las etiquetas es el original y NO se mueve a la base de
// datos. Así la página se ve entera el primer día, con la tabla vacía, y sigue
// viéndose entera si algún día alguien borra una fila. La base de datos guarda
// solo lo que alguien ha decidido cambiar.
//
// Es también lo que hace que «volver al original» exista sin programarlo:
// borrar el texto guardado devuelve el del código.
//
// ── SE PIDEN TODOS DE UNA VEZ, Y UNA SOLA VEZ ──────────────────────────────
// Una página de información tiene veinte párrafos. Si cada uno pidiera el suyo
// serían veinte viajes para pintar una pantalla. El proveedor pide el mapa
// entero la primera vez que aparece un `TextoEditable` y lo comparte con todos
// los demás — y si no hay ninguno en la página, no se pide nada. Es la misma
// regla que aprendimos hoy con los ocho catálogos: usar el dato es pedirlo.
//
// ── QUE EL LÁPIZ NO SALGA NO ES LA SEGURIDAD ───────────────────────────────
// Esconder el botón a quien no es administrador es comodidad. Quien decide de
// verdad es el servidor, que comprueba el nivel en cada `PUT`. Si alguna vez
// esto se pinta para alguien que no debería, lo peor que pasa es que vea un
// lápiz que no funciona.
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Check, X, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

type Estado = {
  textos: Record<string, string>;
  asegurar: () => void;
  guardar: (clave: string, valor: string) => Promise<string | null>;
  volverAlOriginal: (clave: string) => Promise<string | null>;
};

const Ctx = createContext<Estado>({
  textos: {},
  asegurar: () => {},
  guardar: async () => 'Sin proveedor de textos.',
  volverAlOriginal: async () => 'Sin proveedor de textos.',
});

export function TextosProvider({ children }: { children: React.ReactNode }) {
  const [textos, setTextos] = useState<Record<string, string>>({});
  const pedido = useRef(false);

  const asegurar = useCallback(() => {
    if (pedido.current) return;
    pedido.current = true;
    fetch('/api/textos')
      .then(r => r.json())
      .then(j => setTextos(j && typeof j === 'object' ? j : {}))
      // Si esto falla, cada texto enseña el del código: la página se ve igual
      // que si nadie hubiera editado nada. Un fallo aquí no deja huecos.
      .catch(() => {});
  }, []);

  const guardar = useCallback(async (clave: string, valor: string) => {
    try {
      const r = await fetch(`/api/textos/${encodeURIComponent(clave)}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) return j?.error || 'No se ha podido guardar.';
      setTextos(t => ({ ...t, [clave]: valor }));
      return null;
    } catch { return 'No se ha podido guardar.'; }
  }, []);

  const volverAlOriginal = useCallback(async (clave: string) => {
    try {
      const r = await fetch(`/api/textos/${encodeURIComponent(clave)}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) return 'No se ha podido deshacer.';
      setTextos(t => { const n = { ...t }; delete n[clave]; return n; });
      return null;
    } catch { return 'No se ha podido deshacer.'; }
  }, []);

  return <Ctx.Provider value={{ textos, asegurar, guardar, volverAlOriginal }}>{children}</Ctx.Provider>;
}

export default function TextoEditable({ clave, children, className, comoParrafo = true }: {
  /** `pagina.seccion`, en minúsculas. Se escribe para que la lea una persona
   *  buscando de dónde sale un párrafo: `servidores.intro`, no `texto_17`. */
  clave: string;
  /** El texto de siempre. Vive aquí, no en la base de datos. */
  children: React.ReactNode;
  className?: string;
  /** `false` para meterlo dentro de una frase sin romper la maquetación. */
  comoParrafo?: boolean;
}) {
  const { textos, asegurar, guardar, volverAlOriginal } = useContext(Ctx);
  const { user } = useAuth();
  const esAdmin = !!user?.isAdmin;

  useEffect(() => { asegurar(); }, [asegurar]);

  const original = typeof children === 'string'
    ? children
    : React.Children.toArray(children).filter(c => typeof c === 'string').join('');
  const guardado = textos[clave];
  const actual = guardado ?? original;

  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const Envoltura: any = comoParrafo ? 'div' : 'span';

  if (!esAdmin || !editando) {
    return (
      <Envoltura className={cn(esAdmin && 'group/txt relative', className)}>
        {/* Si el original tenía formato (negritas, enlaces) y nadie lo ha
            cambiado, se enseña TAL CUAL. Solo se sustituye por texto plano
            cuando de verdad hay algo guardado: editar un párrafo no debería
            poder llevarse por delante el formato del que no se ha tocado. */}
        {guardado === undefined ? children : guardado}
        {esAdmin && (
          <button
            type="button"
            title={`Editar este texto (${clave})`}
            onClick={() => { setBorrador(actual); setError(null); setEditando(true); }}
            className="ml-1.5 inline-flex items-center opacity-0 group-hover/txt:opacity-100 transition-opacity align-middle text-slate-400 hover:text-emerald-600"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </Envoltura>
    );
  }

  const cerrar = () => { setEditando(false); setError(null); };

  return (
    <Envoltura className={cn('block', className)}>
      <textarea
        value={borrador}
        onChange={e => setBorrador(e.target.value)}
        rows={Math.min(14, Math.max(3, Math.ceil(borrador.length / 70)))}
        className="w-full rounded-xl border border-emerald-300 bg-white p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        autoFocus
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button" disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            const e = await guardar(clave, borrador);
            setOcupado(false);
            if (e) setError(e); else cerrar();
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> Guardar
        </button>
        <button
          type="button" onClick={cerrar}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50"
        >
          <X className="w-3 h-3" /> Cancelar
        </button>
        {/* Solo tiene sentido si hay algo guardado: si no, ya estás viendo el
            original y el botón no haría nada. */}
        {guardado !== undefined && (
          <button
            type="button" disabled={ocupado}
            onClick={async () => {
              setOcupado(true);
              const e = await volverAlOriginal(clave);
              setOcupado(false);
              if (e) setError(e); else cerrar();
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700"
            title="Volver al texto que trae el código"
          >
            <RotateCcw className="w-3 h-3" /> Volver al original
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
      <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-300">{clave}</p>
    </Envoltura>
  );
}
