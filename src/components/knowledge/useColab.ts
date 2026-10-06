import { useEffect, useRef, useState } from 'react';
import type { Colab, InfoColab, CallbacksColab } from '../../utils/colabCliente';
import type { Plano } from '../../utils/colabTexto';

// ============================================================================
// ABRIR LA EDICIÓN SIMULTÁNEA DE UNA PÁGINA (2026-10-06, carril colab)
// ============================================================================
// El editor llama a este gancho con la página abierta. Lo único que hace es
// CARGAR Yjs cuando hace falta (`import()`: sólo quien abre una página para
// editar descarga ese JS; ver la cabecera de `utils/colabCliente.ts`), crear la
// conexión y cerrarla al salir. Todo lo demás —qué hacer con lo que llega— lo
// decide el editor, por los `callbacks`.
//
// Los `callbacks` se pasan por un ref que el editor renueva en cada render, de
// modo que la conexión no se rehace cuando cambia una función.
// ============================================================================

export type CallbacksEditor = Omit<CallbacksColab, 'alInfo'> & { alInfo?: (i: InfoColab) => void };

export function useColab(opciones: {
  paginaId: string | null;
  /** Hay página abierta, cargada, y se puede (o se pretende) sincronizar. */
  activo: boolean;
  /** Cómo estaba la página en el servidor al cargarla (la BASE de lo que el
   *  editor lleve sin enviar). */
  base: () => Plano;
  callbacks: React.MutableRefObject<CallbacksEditor>;
}) {
  const { paginaId, activo } = opciones;
  const colabRef = useRef<Colab | null>(null);
  const [info, setInfo] = useState<InfoColab | null>(null);
  const baseRef = useRef(opciones.base);
  baseRef.current = opciones.base;

  useEffect(() => {
    if (!paginaId || !activo || typeof WebSocket === 'undefined') return;
    let vivo = true;
    let colab: Colab | null = null;
    import('../../utils/colabCliente').then(({ Colab }) => {
      if (!vivo) return;
      const c = opciones.callbacks;
      colab = new Colab(paginaId, baseRef.current(), {
        leerEditor: () => c.current.leerEditor(),
        alRemoto: (p, cambios, origen) => c.current.alRemoto(p, cambios, origen),
        alInfo: i => { if (vivo) { setInfo(i); c.current.alInfo?.(i); } },
        alAviso: t => c.current.alAviso?.(t),
        alPresencia: p => c.current.alPresencia?.(p),
      });
      colabRef.current = colab;
      colab.conectar();
    }).catch(e => console.error('[colab] no se ha podido cargar:', e));
    return () => { vivo = false; colabRef.current = null; colab?.destruir(); setInfo(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaId, activo]);

  return { colabRef, info };
}
