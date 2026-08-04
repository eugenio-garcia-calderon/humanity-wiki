import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Ancho configurable y persistente de un panel lateral (Fase 10)
// ============================================================================
// El usuario pidió que TODOS los paneles laterales (asistente IA, filtros del
// mapa, panel de territorio...) se puedan redimensionar arrastrando su borde,
// y que el ancho elegido quede grabado en su cuenta (no solo en el navegador,
// para que le siga entre dispositivos). Se guarda en dos sitios a la vez:
//  - localStorage: instantáneo, funciona sin sesión iniciada.
//  - users.ui_settings (servidor), vía AuthContext.updateUiSettings: solo si
//    hay sesión, con un debounce para no golpear la base de datos en cada
//    pixel arrastrado.

const STORAGE_PREFIX = 'evo_panel_width_';
const PERSIST_DEBOUNCE_MS = 600;

interface Options {
  min?: number;
  max?: number;
}

export function usePanelWidth(key: string, defaultPercent: number, opts: Options = {}) {
  const { min = 14, max = 45 } = opts;
  const { user, updateUiSettings } = useAuth();
  const savedFromUser = user?.uiSettings?.panelWidths?.[key];

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const [width, setWidthState] = useState<number>(() => {
    if (typeof savedFromUser === 'number') return clamp(savedFromUser);
    try {
      const local = localStorage.getItem(STORAGE_PREFIX + key);
      if (local) return clamp(Number(local));
    } catch { /* localStorage puede no estar disponible (modo privado, SSR) */ }
    return clamp(defaultPercent);
  });

  const latestWidth = useRef(width);
  useEffect(() => { latestWidth.current = width; }, [width]);

  // Si llega un valor grabado en el servidor (p.ej. justo tras iniciar
  // sesión) y aún no lo hemos aplicado, adóptalo una vez.
  const appliedServerValue = useRef(false);
  useEffect(() => {
    if (!appliedServerValue.current && typeof savedFromUser === 'number') {
      appliedServerValue.current = true;
      setWidthState(clamp(savedFromUser));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedFromUser]);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = (value: number) => {
    try { localStorage.setItem(STORAGE_PREFIX + key, String(value)); } catch { /* ignorado */ }
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      updateUiSettings({
        panelWidths: { ...(user?.uiSettings?.panelWidths || {}), [key]: value },
      });
    }, PERSIST_DEBOUNCE_MS);
  };

  const setWidth = (value: number) => {
    const c = clamp(value);
    setWidthState(c);
    commit(c);
  };

  const [dragging, setDragging] = useState(false);

  /**
   * Handler de `onMouseDown` para el asa de redimensionado.
   * `edge` es el borde físico del panel donde vive el asa:
   *  - 'right': panel anclado a la izquierda (ej. Filtros) — arrastrar a la
   *    derecha lo ensancha.
   *  - 'left': panel anclado a la derecha (ej. Asistente IA) — arrastrar a la
   *    izquierda lo ensancha.
   */
  const startResize = (edge: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startWidth = latestWidth.current;

    const onMove = (ev: MouseEvent) => {
      const deltaPx = edge === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const deltaPercent = (deltaPx / window.innerWidth) * 100;
      const next = clamp(startWidth + deltaPercent);
      // Se actualiza también de forma síncrona (no solo vía el useEffect que
      // observa `width`): si el mouseup llega justo después del último
      // mousemove, ese efecto podría no haberse ejecutado todavía y
      // `commit()` grabaría un ancho desfasado.
      latestWidth.current = next;
      setWidthState(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragging(false);
      commit(latestWidth.current);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return { width, setWidth, startResize, dragging, min, max };
}
