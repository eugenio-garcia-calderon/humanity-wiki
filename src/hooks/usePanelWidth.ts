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
  // EVENTOS DE PUNTERO, NO DE RATÓN (2026-08-20). Esto escuchaba `mousemove`
  // y `mouseup`, que un dedo no dispara: en una pantalla táctil arrastrar el
  // borde del panel no hacía absolutamente nada. Los eventos de puntero valen
  // para ratón, dedo y lápiz a la vez, así que no hay que duplicar nada — es
  // el mismo cambio que ya llevan las asas de las ventanas.
  // EL ASA SE QUEDA EL PUNTERO MIENTRAS DURA EL GESTO (2026-08-21, Eugenio:
  // «no funciona bien el pinchar y arrastrar… cuando dejas de pinchar sigue en
  // esa modalidad y es terrible»).
  //
  // POR QUÉ SE QUEDABA PEGADO: los avisos de movimiento y de soltar se
  // escuchaban en `window`, y esta plataforma está llena de `<iframe>` — cada
  // ventana del escritorio es uno, y cada tarjeta con mapa otro. Un `<iframe>`
  // es un documento aparte: en cuanto el puntero pasa por encima, los eventos
  // se los queda ÉL y la página de fuera deja de enterarse. Si sueltas el
  // ratón ahí, el `pointerup` nunca llega, nadie apaga el gesto y el panel se
  // queda siguiendo al ratón para siempre. Por eso fallaba justo al arrastrar
  // hacia el centro, que es donde están las ventanas.
  //
  // `setPointerCapture` es la respuesta: mientras dura el gesto, TODOS los
  // avisos de ese puntero van al asa, esté encima de lo que esté. Es
  // exactamente lo que ya hacen las asas de las ventanas
  // (`GestorVentanas.tsx`), y por eso aquéllas nunca se han quedado pegadas y
  // ésta sí.
  const startResize = (edge: 'left' | 'right') => (e: React.PointerEvent) => {
    e.preventDefault();
    const asa = e.currentTarget as HTMLElement;
    const idPuntero = e.pointerId;
    // Si falla (un ratón sintético de una prueba, un navegador viejo), se
    // sigue adelante: quedan los escuchadores de `window` de más abajo.
    try { asa.setPointerCapture(idPuntero); } catch { /* sin captura */ }

    setDragging(true);
    const startX = e.clientX;
    const startWidth = latestWidth.current;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== idPuntero) return;
      const deltaPx = edge === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const deltaPercent = (deltaPx / window.innerWidth) * 100;
      const next = clamp(startWidth + deltaPercent);
      // Se actualiza también de forma síncrona (no solo vía el useEffect que
      // observa `width`): si el soltar llega justo después del último
      // movimiento, ese efecto podría no haberse ejecutado todavía y
      // `commit()` grabaría un ancho desfasado.
      latestWidth.current = next;
      setWidthState(next);
    };

    let terminado = false;
    const onUp = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== idPuntero) return;
      if (terminado) return;         // el asa y `window` pueden avisar los dos
      terminado = true;
      try { asa.releasePointerCapture(idPuntero); } catch { /* ya soltado */ }
      asa.removeEventListener('lostpointercapture', onUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragging(false);
      commit(latestWidth.current);
    };

    // LOS ESCUCHADORES VAN EN `window`, NO EN EL ASA, aunque la captura sea lo
    // que arregla el fallo. Es a propósito y me lo enseñó probarlo: con la
    // captura concedida los avisos se reencaminan al asa PERO SIGUEN SUBIENDO
    // hasta `window`, así que aquí llegan igual; y si la captura NO se
    // concede, `window` es el único sitio donde llegan. Ponerlos solo en el
    // asa dejaba el gesto encendido sin seguir al ratón en cuanto la captura
    // fallaba — peor que el fallo original.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // Un dedo que se sale de la pantalla, o una llamada entrante, cancelan el
    // gesto sin soltar: sin esto el panel se quedaría pegado al dedo.
    window.addEventListener('pointercancel', onUp);
    // Y si el navegador nos quita la captura por su cuenta, el gesto se acaba
    // ahí: es el aviso que impide que se quede colgado pase lo que pase.
    asa.addEventListener('lostpointercapture', onUp);
  };

  return { width, setWidth, startResize, dragging, min, max };
}
