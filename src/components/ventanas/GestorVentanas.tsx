// ============================================================================
// VENTANAS (2026-08-19, petición de Eugenio, afinada en tres pasos: «ventanas
// donde en una esté el juego…», «que esté todo en la línea superior» y «solo
// tiene que haber un menú arriba, uno solo… y en ese uno es donde deben estar
// las ventanas en forma de iconos… no están ahí por defecto, solo las que se
// abran desde el menú colapsado»).
// ============================================================================
// El escritorio ya NO tiene barra propia: la única barra es la cabecera de la
// app. Desde su menú ☰ se abren las ventanas, y en esa misma cabecera aparecen
// como iconos las que están abiertas (eso lo pinta Layout, hablando con este
// gestor por `bus.ts`). Aquí solo viven las ventanas.
//
// LA DECISIÓN QUE MANDA SOBRE TODO LO DEMÁS: cada ventana es un `<iframe>` a
// una ruta de la propia app EN MODO EMBEBIDO (`?embed=1`), NO el componente
// montado aquí dentro.
//
//   - `embed=1` renderiza la página SOLA, sin la cabecera ni el menú de la
//     app. Sin él, cada ventana cargaba la app entera dentro de sí misma:
//     cuatro barras apiladas antes de llegar al juego (captura de Eugenio).
//   - El juego 3D vive en su propio contexto: su WebGL, su bucle y su teclado
//     no se pelean con los de otra ventana.
//   - Mover una ventana NO vuelve a montar lo de dentro.
//
// Lo que cuesta: cada ventana es una carga de la app (unos 200 ms y su
// memoria). Con tres o cuatro ventanas no se nota; con veinte sí.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, AppWindow } from 'lucide-react';
import { ControlesVentana } from './controles';
import { cn } from '../../utils/cn';
import { detectorDeGesto } from '../../utils/gestoAtrasAdelante';
import { useEsMovil } from '../../hooks/useEsMovil';
import Navegador from './Navegador';
import BarraDireccion from './BarraDireccion';
import { publicarVentanas, publicarPaginaWeb, type AbrirVentana } from './bus';

export interface Ventana {
  id: string;
  titulo: string;
  /** `app` = una ruta nuestra dentro de un marco. `navegador` = la web. */
  clase: 'app' | 'navegador';
  /** La ruta (app) o la dirección de partida (navegador). */
  destino: string;
  x: number; y: number; an: number; al: number;
  z: number;
  /** Dónde está AHORA la ventana. `destino` no se toca: es de dónde nació, y
   *  es con lo que se casa al volver a abrirla desde el menú. Separarlos es lo
   *  que impide que el `src` del marco cambie y la ventana se recargue sola. */
  ruta?: string;
  /** El historial de esta ventana, como el de una pestaña de navegador, y en
   *  qué punto de él estás. Es lo que dan las flechas de atrás y adelante. */
  historia?: string[];
  pos?: number;
  minimizada?: boolean;
  maximizada?: boolean;
}

const CLAVE = 'humanity:ventanas';
const BARRA = 34;          // alto de la barra de título de una ventana
const MIN_AN = 320, MIN_AL = 220;

let contadorZ = 10;

export default function GestorVentanas({ onPaginaNavegador, compacto = false }: {
  /** Modo compacto: sin barra de dirección, solo el contenido. Se manda desde
   *  la cabecera, que es donde está el botón. */
  compacto?: boolean;
  /** Se avisa a la página de cuál es la web abierta: es lo que deja a la IA
   *  del chat SABER dónde estás mirando. */
  onPaginaNavegador?: (url: string | null) => void;
}) {
  // ══ EN UN TELÉFONO NO HAY VENTANAS ═══════════════════════════════════════
  // El escritorio de ventanas no se traduce a 390 px: SE SUSTITUYE. Cada
  // ventana es un `<iframe>` que carga la aplicación ENTERA otra vez, así que
  // tres ventanas abiertas son tres aplicaciones React vivas en la misma
  // pestaña. Medido en este mismo teléfono antes de escribir esto: cinco
  // iframes a la vez, uno de ellos de una ventana restaurada de otro día.
  // Safari de iOS mata la pestaña sin avisar al pasarse de memoria, y lo que
  // ve el usuario es la página recargándose sola.
  //
  // En móvil, abrir algo es IR a ello: una pantalla completa, una sola
  // instancia de la aplicación, cero iframes.
  const esMovil = useEsMovil();
  const navigate = useNavigate();

  const [ventanas, setVentanas] = useState<Ventana[]>(() => {
    // EL MÓVIL NO RESTAURA EL ESCRITORIO. Restaurarlo sería revivir aquí
    // mismo el problema que acabamos de describir: ventanas que nadie ha
    // abierto en esta visita, vivas y pidiendo datos.
    if (typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(max-width: 767px)').matches) return [];
    try {
      const g = localStorage.getItem(CLAVE);
      if (g) {
        const v = JSON.parse(g) as Ventana[];
        if (Array.isArray(v) && v.length) {
          contadorZ = Math.max(10, ...v.map(x => x.z || 10)) + 1;
          // SI VIENES POR UN ENLACE, EL ENLACE MANDA (2026-08-20). Las ventanas
          // guardadas se restauraban siempre y se abrían ENCIMA de la página a
          // la que acababas de entrar: abrir humanity.wiki/proyectos/aptera
          // enseñaba el escritorio de la sesión anterior, no Aptera. Con eso,
          // ningún enlace de la plataforma se podía compartir.
          //
          // Una dirección con dos tramos o más («/proyectos/aptera») es un
          // enlace a algo concreto; «/» o «/tareas» es volver a tu escritorio.
          // En el primer caso las ventanas vuelven MINIMIZADAS: siguen en la
          // barra de arriba, a un clic, pero no tapan lo que venías a ver.
          const tramos = window.location.pathname.split('/').filter(Boolean);
          if (tramos.length >= 2) return v.map(x => ({ ...x, minimizada: true }));
          return v;
        }
      }
    } catch { /* escritorio nuevo */ }
    // SIN ventanas por defecto (petición de Eugenio): el escritorio nace
    // vacío y solo aparece lo que abras desde el menú ☰.
    return [];
  });

  // Se guarda con retraso: arrastrar dispara decenas de cambios por segundo y
  // escribir en localStorage en cada uno cuesta fotogramas.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    // EL MÓVIL LEE PERO NO ESCRIBE. Ésta es la regla que no se relaja: en
    // móvil `ventanas` es siempre `[]`, así que sin esta salida, mirar la
    // plataforma desde el teléfono GUARDARÍA una lista vacía y te borraría el
    // escritorio al volver al ordenador. El daño no se lo habría atribuido
    // nadie nunca al móvil.
    if (esMovil) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(CLAVE, JSON.stringify(ventanas)); } catch { /* lleno */ }
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [ventanas, esMovil]);

  // La cabecera pinta un icono por ventana: se le publica el estado cada vez
  // que cambia (ver bus.ts — el estado vive aquí, allí solo viajan avisos).
  useEffect(() => {
    const publicar = () => {
      const vivas = ventanas.filter(v => !v.minimizada);
      const zMax = vivas.length ? Math.max(...vivas.map(v => v.z)) : -1;
      publicarVentanas(ventanas.map(v => ({
        id: v.id, titulo: v.titulo, clase: v.clase, destino: v.destino, ruta: v.ruta,
        minimizada: !!v.minimizada, delante: !v.minimizada && v.z === zMax,
      })));
    };
    publicar();
    // La cabecera pide el estado al montarse (ver bus.ts): se le contesta con
    // la foto actual, que este efecto refresca en cada cambio.
    window.addEventListener('humanity:pedir-ventanas', publicar);
    return () => window.removeEventListener('humanity:pedir-ventanas', publicar);
  }, [ventanas]);

  const alFrente = useCallback((id: string) => {
    setVentanas(vs => vs.map(v => (v.id === id ? { ...v, z: ++contadorZ, minimizada: false } : v)));
  }, []);

  const cambiar = useCallback((id: string, patch: Partial<Ventana>) => {
    setVentanas(vs => vs.map(v => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  /** Los marcos vivos, para saber de QUÉ ventana viene cada aviso de ruta y
   *  para poder mandarle atrás/adelante. */
  const marcos = useRef<Record<string, HTMLIFrameElement | null>>({});
  /** La dirección con la que ARRANCA cada marco. Se calcula una vez y no se
   *  vuelve a tocar: si el `src` cambiara al navegar por dentro, React
   *  recargaría el marco entero en cada paso — y el Mundo 3D empezaría de cero. */
  const srcInicial = useRef<Record<string, string>>({});
  const srcDe = (v: Ventana) => {
    if (!srcInicial.current[v.id]) {
      srcInicial.current[v.id] = `${v.destino}${v.destino.includes('?') ? '&' : '?'}embed=1`;
    }
    return srcInicial.current[v.id];
  };
  /** Cuando somos NOSOTROS quienes movemos el historial, el aviso de ruta que
   *  llega después no es una página nueva: es el salto que acabamos de pedir.
   *  Sin esta marca, ir atrás añadiría una entrada más en vez de retroceder. */
  const saltando = useRef<Record<string, 'atras' | 'adelante' | undefined>>({});

  // La ruta que publica cada ventana desde dentro (ver el puente en Layout).
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const aviso = (e.data || {}).humanity;
      if (aviso !== 'humanity:ruta' && aviso !== 'humanity:gesto-navegacion') return;
      // ¿De qué ventana? La que tenga ese `contentWindow`.
      const id = Object.keys(marcos.current)
        .find(k => marcos.current[k]?.contentWindow === e.source);
      if (!id) return;

      // DOS DEDOS EN EL TRACKPAD dentro de una página embebida. Llega ya
      // resuelto en «atrás» o «adelante» (el gesto se detecta dentro, que es
      // donde ocurre) y se atiende con el mismo historial que las flechas.
      if (aviso === 'humanity:gesto-navegacion') {
        const sentido = (e.data || {}).detalle === 'adelante' ? 'adelante' : 'atras';
        // Deslizar sobre una ventana de atrás la trae al frente, igual que
        // pincharla. Si no, quedaba raro: la de atrás cambiaba de página sin
        // dejar de estar detrás.
        saltarPorGesto(id, sentido);
        return;
      }

      const ruta = String((e.data || {}).detalle || '');
      if (!ruta) return;

      setVentanas(vs => vs.map(v => {
        if (v.id !== id) return v;
        const historia = v.historia?.length ? v.historia : [v.destino];
        const pos = typeof v.pos === 'number' ? v.pos : historia.length - 1;
        const salto = saltando.current[id];
        if (salto) {
          saltando.current[id] = undefined;
          return { ...v, ruta, pos: salto === 'atras' ? Math.max(0, pos - 1) : Math.min(historia.length - 1, pos + 1) };
        }
        if (historia[pos] === ruta) return { ...v, ruta };
        // Página nueva: se corta lo que hubiera «hacia delante», como en
        // cualquier navegador.
        const nueva = [...historia.slice(0, pos + 1), ruta];
        return { ...v, ruta, historia: nueva, pos: nueva.length - 1 };
      }));
    };
    // La sesión cambió fuera: que cada ventana vuelva a preguntar quién eres.
    // Sin esto, entrar desde el Mundo 3D dejaba al resto de ventanas creyendo
    // que seguías sin sesión hasta recargarlas a mano.
    const alSesionFuera = () => {
      for (const marco of Object.values(marcos.current)) {
        try {
          marco?.contentWindow?.postMessage(
            { humanity: 'humanity:refresca-sesion' }, window.location.origin);
        } catch { /* marco muerto */ }
      }
    };
    window.addEventListener('message', alMensaje);
    window.addEventListener('humanity:sesion-fuera', alSesionFuera);
    return () => {
      window.removeEventListener('message', alMensaje);
      window.removeEventListener('humanity:sesion-fuera', alSesionFuera);
    };
  }, []);

  /** Atrás y adelante de una ventana. Se usa el historial DEL MARCO (no se
   *  recarga el `src`): recargar volvería a montar lo de dentro y el Mundo 3D
   *  empezaría de cero en cada paso. */
  const irEnHistoria = useCallback((id: string, sentido: 'atras' | 'adelante') => {
    const marco = marcos.current[id];
    if (!marco?.contentWindow) return;
    saltando.current[id] = sentido;
    try {
      if (sentido === 'atras') marco.contentWindow.history.back();
      else marco.contentWindow.history.forward();
    } catch { saltando.current[id] = undefined; }
  }, []);

  /** UN DESLIZAMIENTO, UN SALTO. El aviso del gesto puede llegar por dos vías
   *  —el puente de la página de dentro y la rueda de la propia ventana— y una
   *  página que se ha recargado en caliente puede acabar con dos oyentes. Si
   *  no se cierra la puerta un instante, un solo gesto retrocedería dos
   *  páginas (visto en pruebas, 2026-08-20).
   *
   *  El cierre es SOLO del gesto: las flechas de la barra siguen sueltas,
   *  porque pulsarlas tres veces seguidas para retroceder tres páginas es algo
   *  que se hace a propósito. */
  const ultimoGesto = useRef<Record<string, number>>({});
  const saltarPorGesto = useCallback((id: string, sentido: 'atras' | 'adelante') => {
    const ahora = Date.now();
    if (ahora - (ultimoGesto.current[id] || 0) < 500) return;
    ultimoGesto.current[id] = ahora;
    alFrente(id);
    irEnHistoria(id, sentido);
  }, [alFrente, irEnHistoria]);

  /** El mismo gesto, pero cuando el deslizamiento cae FUERA del marco: sobre
   *  la barra de dirección o los bordes de la ventana. Se guarda uno por
   *  ventana porque el detector lleva cuenta del gesto en curso y compartirlo
   *  mezclaría deslizamientos de ventanas distintas. */
  const detectores = useRef<Record<string, (e: WheelEvent) => void>>({});
  const gestoDe = (id: string) => {
    if (!detectores.current[id]) {
      detectores.current[id] = detectorDeGesto(sentido => saltarPorGesto(id, sentido));
    }
    return detectores.current[id];
  };

  /** Minimizar, maximizar y cerrar. Es lo único que sobrevive de la barra de
   *  título: el nombre estaba duplicado con la pestaña de arriba. */
  /** LOS MISMOS BOTONES QUE EL PANEL LATERAL (2026-08-22, Eugenio: «haz esto
   *  de la expansión para todas las ventanas que veas programadas»). Eran un
   *  cuadrado y un cuadrado doble dibujados aquí a mano; ahora son las flechas
   *  diagonales de `controles.tsx`, iguales en las tres clases de ventana que
   *  tiene la plataforma. */
  const controlesDe = (v: Ventana) => (
    <ControlesVentana
      expandida={!!v.maximizada}
      onMinimizar={() => cambiar(v.id, { minimizada: true })}
      onExpandir={() => cambiar(v.id, { maximizada: !v.maximizada })}
      onCerrar={() => cerrar(v.id)}
    />
  );

  /** ══ CERRAR LA ÚLTIMA TE DEJA EN INICIO ═══════════════════════════════
   *  (2026-08-22, Eugenio: «si hay ventanas abiertas y se cierran todas pues
   *  te lleva a inicio directamente»).
   *
   *  Va aquí y no en quien pulsa la ✕ porque hay cuatro sitios que cierran
   *  ventanas —la ✕ de la pestaña, la de la barra, «cerrar todas» y el teclado—
   *  y esto tiene que pasar en los cuatro. Puesto en cada uno, sería la cuarta
   *  copia de la misma regla y el día que se añada un quinto se olvidará.
   *
   *  SOLO SI SE QUEDA VACÍO Y HABÍA ALGO. Navegar cuando aún quedan ventanas
   *  te sacaría de lo que estás mirando. */
  /** ══ CERRAR LA ÚLTIMA TE DEJA EN INICIO ═══════════════════════════════
   *  (2026-08-22, Eugenio: «si hay ventanas abiertas y se cierran todas pues
   *  te lleva a inicio directamente»).
   *
   *  Mirando el RESULTADO, no metido en cada sitio que cierra. Hay cuatro que
   *  cierran ventanas —la ✕ de la pestaña, la de la barra, «cerrar todas» y el
   *  atajo de teclado—; escrito en los cuatro serían cuatro copias de la misma
   *  regla y el quinto que se añada se olvidaría. Y navegar dentro de un
   *  `setVentanas` sería un efecto escondido en un cálculo.
   *
   *  SOLO CUANDO SE QUEDA VACÍO HABIENDO TENIDO ALGO: al arrancar sin ventanas
   *  no pasa nada, y con ventanas aún abiertas tampoco — sacarte de lo que
   *  estás mirando no es cerrar una ventana. */
  const habiaVentanas = useRef(false);
  useEffect(() => {
    if (habiaVentanas.current && ventanas.length === 0 && window.location.pathname !== '/') {
      navigate('/');
    }
    habiaVentanas.current = ventanas.length > 0;
  }, [ventanas.length, navigate]);

  const cerrar = useCallback((id: string) => {
    setVentanas(vs => {
      const i = vs.findIndex(v => v.id === id);
      const quedan = vs.filter(v => v.id !== id);
      // AL CERRAR, SE PASA A LA DE LA IZQUIERDA (2026-08-22, Eugenio: «cuando
      // se cierra una página, haz que se muestre la página inmediatamente a su
      // izquierda»). Antes cerrabas y no venía ninguna al frente: te quedabas
      // mirando lo que hubiera detrás, que casi siempre no era nada.
      //
      // La de la izquierda y no la última usada: en una fila de pestañas, lo
      // que el ojo espera al cerrar una es que se acerque su vecina. Si cierras
      // la primera, la de su derecha pasa a ser la primera y esa es la que
      // toca.
      if (i === -1 || !quedan.length) return quedan;
      const vecina = quedan[Math.max(0, i - 1)];
      return quedan.map(v => (v.id === vecina.id
        ? { ...v, minimizada: false, z: ++contadorZ }
        : v));
    });
  }, []);

  /** Cerrar TODAS de golpe (2026-08-22). Con ocho pestañas abiertas, cerrarlas
   *  una a una son ocho gestos para llegar a una mesa limpia. */
  const cerrarTodas = useCallback(() => setVentanas([]), []);

  /**
   * Abrir una sección desde el menú ☰. Nace A PANTALLA COMPLETA (el modelo de
   * macOS: cada cosa ocupa su pantalla y el gesto salta entre pantallas). Si ya
   * está abierta, se trae al frente en vez de duplicarla; el navegador casa por
   * CLASE y no por dirección, porque su destino cambia con cada página que
   * visitas y, si no, cada pulsación abriría un navegador nuevo.
   */
  const abrir = useCallback((a: AbrirVentana) => {
    // EN MÓVIL, ABRIR ES IR. No nace ninguna ventana: se navega, como en
    // cualquier aplicación de teléfono. El menú, el bus de eventos y todo lo
    // que llama a `abrirVentana` siguen igual — el corte se hace aquí, en un
    // sitio, y no en los diez que abren cosas.
    if (esMovil) {
      // El «Navegador» es un navegador DENTRO de un navegador: en un teléfono
      // que ya tiene el suyo no significa nada. Si aun así llega una dirección
      // de verdad, se abre en una pestaña del navegador del teléfono; la
      // página de inicio del navegador interno no tiene a dónde ir.
      if (a.clase === 'navegador') {
        if (/^https?:\/\//i.test(a.destino)) window.open(a.destino, '_blank', 'noopener');
        return;
      }
      navigate(a.destino);
      return;
    }
    setVentanas(vs => {
      const ya = a.clase === 'navegador'
        ? vs.filter(v => v.clase === 'navegador').reduce<Ventana | null>((m, v) => (!m || v.z > m.z ? v : m), null)
        : vs.find(v => v.clase === 'app' && v.destino === a.destino);
      if (ya) return vs.map(v => (v.id === ya.id ? { ...v, z: ++contadorZ, minimizada: false } : v));
      const n = vs.length;
      return [...vs, {
        id: `v${Date.now().toString(36)}`,
        titulo: a.titulo, clase: a.clase, destino: a.destino,
        x: 40 + (n % 6) * 34, y: 16 + (n % 6) * 30,
        an: 780, al: 540, z: ++contadorZ,
        maximizada: true,
      }];
    });
  }, [esMovil, navigate]);

  // Los avisos del menú y de los iconos de la cabecera.
  useEffect(() => {
    const alAbrir = (e: Event) => abrir((e as CustomEvent).detail as AbrirVentana);
    const alPulsar = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      setVentanas(vs => {
        const v = vs.find(x => x.id === id);
        if (!v) return vs;
        const vivas = vs.filter(x => !x.minimizada);
        const delante = !v.minimizada && vivas.length > 0 && v.z === Math.max(...vivas.map(x => x.z));
        // El icono es un conmutador: traer al frente, y si ya está delante,
        // minimizar — como la barra de tareas de toda la vida.
        return delante
          ? vs.map(x => (x.id === id ? { ...x, minimizada: true } : x))
          : vs.map(x => (x.id === id ? { ...x, z: ++contadorZ, minimizada: false } : x));
      });
    };
    // La ✕ de una pestaña de arriba.
    const alCerrar = (e: Event) => cerrar((e as CustomEvent).detail as string);
    // Doble clic en una pestaña: a pantalla completa y al frente. Se
    // desminimiza a la vez, porque agrandar algo que no se ve no sirve de nada.
    const alMaximizar = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      setVentanas(vs => vs.map(v => (v.id === id
        ? { ...v, maximizada: !v.maximizada, minimizada: false, z: ++contadorZ }
        : v)));
    };
    // Recolocar las pestañas arrastrando: llega el orden entero de ids. Se
    // reordena el ARRAY (que es lo que se publica a la barra); las z quedan
    // como estaban, porque cambiar de sitio una pestaña no cambia cuál miras.
    const alOrdenar = (e: Event) => {
      const ids = (e as CustomEvent).detail as string[];
      setVentanas(vs => {
        const porId = new Map(vs.map(v => [v.id, v]));
        const puestas = ids.map(id => porId.get(id)).filter(Boolean) as Ventana[];
        // Lo que no venga en la lista se conserva al final: nunca se pierde una
        // ventana por una carrera entre abrir y arrastrar.
        const restantes = vs.filter(v => !ids.includes(v.id));
        return puestas.length ? [...puestas, ...restantes] : vs;
      });
    };
    window.addEventListener('humanity:abrir-ventana', alAbrir);
    window.addEventListener('humanity:pulsar-ventana', alPulsar);
    const alCerrarTodas = () => cerrarTodas();
    window.addEventListener('humanity:cerrar-ventana', alCerrar);
    window.addEventListener('humanity:cerrar-todas', alCerrarTodas);
    window.addEventListener('humanity:maximizar-ventana', alMaximizar);
    window.addEventListener('humanity:ordenar-ventanas', alOrdenar);
    // El menú ☰ de CUALQUIER página puede dejar una apertura apuntada
    // («Navegador» desde fuera del Escritorio, 2026-08-20): se recoge aquí,
    // ya con el gestor montado.
    const crudo = localStorage.getItem('humanity:abrir-al-llegar');
    if (crudo) {
      localStorage.removeItem('humanity:abrir-al-llegar');
      try { abrir(JSON.parse(crudo) as AbrirVentana); } catch { /* orden rota: se ignora */ }
    }
    return () => {
      window.removeEventListener('humanity:abrir-ventana', alAbrir);
      window.removeEventListener('humanity:pulsar-ventana', alPulsar);
      window.removeEventListener('humanity:cerrar-ventana', alCerrar);
      window.removeEventListener('humanity:cerrar-todas', alCerrarTodas);
      window.removeEventListener('humanity:maximizar-ventana', alMaximizar);
      window.removeEventListener('humanity:ordenar-ventanas', alOrdenar);
    };
  }, [abrir, cerrar]);

  /**
   * PASAR DE UNA VENTANA A OTRA CON EL TRACKPAD (petición de Eugenio: «con los
   * 4 dedos del pad del Mac»). Una web NO ve cuántos dedos hay: macOS se queda
   * los gestos de tres y cuatro dedos para sí (Mission Control) y nunca llegan
   * a la página; solo una app nativa podría. El equivalente que SÍ llega es el
   * deslizamiento HORIZONTAL de dos dedos (una rueda con desplazamiento en X).
   * Se exige que sea claramente horizontal y se deja un respiro entre cambios:
   * un solo gesto manda decenas de eventos y saltarías cinco ventanas de una.
   */
  const ultimoCambio = useRef(0);
  const irA = useCallback((paso: number) => {
    setVentanas(vs => {
      const abiertas = vs.filter(v => !v.minimizada);
      if (abiertas.length < 2) return vs;
      const orden = [...abiertas].sort((a, b) => a.id.localeCompare(b.id));
      const delante = abiertas.reduce((m, v) => (v.z > m.z ? v : m), abiertas[0]);
      const i = orden.findIndex(v => v.id === delante.id);
      const siguiente = orden[(i + paso + orden.length) % orden.length];
      return vs.map(v => (v.id === siguiente.id ? { ...v, z: ++contadorZ } : v));
    });
  }, []);

  useEffect(() => {
    const alRodar = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 40 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.6) return;
      const ahora = Date.now();
      if (ahora - ultimoCambio.current < 700) return;
      ultimoCambio.current = ahora;
      irA(e.deltaX > 0 ? 1 : -1);
    };
    const alTeclado = (e: KeyboardEvent) => {
      // Ctrl/⌘ + flechas: el mismo salto, sin trackpad.
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); irA(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); irA(-1); }
    };
    window.addEventListener('wheel', alRodar, { passive: true });
    window.addEventListener('keydown', alTeclado);
    return () => {
      window.removeEventListener('wheel', alRodar);
      window.removeEventListener('keydown', alTeclado);
    };
  }, [irA]);

  /**
   * Mover y redimensionar. `setPointerCapture` para que salirse de la ventana
   * con el ratón no cancele el arrastre a mitad.
   */
  const empezarGesto = (e: React.PointerEvent, v: Ventana, modo: 'mover' | 'tamano') => {
    // Los botones de la barra (minimizar, maximizar, CERRAR) viven dentro de
    // la zona de arrastre. Sin esta salida, al pulsarlos se capturaba el
    // puntero para la barra y el navegador entregaba el clic a la BARRA, no al
    // botón: cerrar la ventana fallaba — y solo cuando no estaba maximizada,
    // porque maximizada esta función ya salía antes (de ahí el «a veces»,
    // Eugenio 2026-08-20).
    if ((e.target as HTMLElement).closest('button')) return;
    if (v.maximizada && modo === 'mover') return;
    e.preventDefault();
    alFrente(v.id);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX, y0 = e.clientY;
    const { x, y, an, al } = v;
    const mover = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (modo === 'mover') {
        cambiar(v.id, { x: Math.max(0, x + dx), y: Math.max(0, y + dy) });
      } else {
        cambiar(v.id, { an: Math.max(MIN_AN, an + dx), al: Math.max(MIN_AL, al + dy) });
      }
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
  };


  // El gestor ya NO es una página: es una CAPA sobre toda la app (petición de
  // Eugenio, 2026-08-20: «elimina lo de escritorio, siempre esa funcionalidad
  // tiene que estar»). Sin fondo y sin capturar clics: cuando no hay ventanas,
  // la página de debajo se usa como si esta capa no existiera.
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">

      {/* Se pintan TODAS, y la minimizada solo se OCULTA: quitarla del árbol
          desmontaría su marco y el juego se reiniciaría de cero cada vez que
          lo minimizas (fallo visto en pruebas, 2026-08-19). */}
      {ventanas.map(v => (
        <div
          key={v.id}
          onPointerDown={() => alFrente(v.id)}
          // Dos dedos en el trackpad = atrás y adelante. Aquí se recogen los
          // deslizamientos que caen sobre la ventana pero fuera del marco (la
          // barra de dirección, los bordes); los de dentro llegan por el puente.
          onWheel={e => gestoDe(v.id)(e.nativeEvent)}
          className="absolute pointer-events-auto flex flex-col rounded-xl overflow-hidden bg-white border border-slate-300 shadow-2xl"
          style={{
            ...(v.maximizada
              ? { left: 0, top: 0, width: '100%', height: '100%' }
              : { left: v.x, top: v.y, width: v.an, height: v.al }),
            zIndex: v.z,
            ...(v.minimizada ? { display: 'none' } : {}),
          }}
        >
          {/* SIN BARRA DE TÍTULO (Eugenio, 2026-08-20: «sobra la línea de
              Retos de la Humanidad, actualmente hay 3 líneas de datos, esto no
              puede ser»). Tenía razón: el nombre ya estaba en la pestaña de
              arriba, así que era la misma información dos veces. Sus botones
              —minimizar, maximizar, cerrar— se han ido a la barra de
              dirección, que ahora es también de donde se tira para mover. */}
          {/* El contenido. `inert` en las ventanas de ATRÁS: el juego embebido
              coge el foco del teclado para sus controles y, si está de fondo,
              SE LO ROBA a la ventana de delante — escribías en el navegador y
              las teclas se las comía el juego (visto en pruebas, 2026-08-20).
              Con inert sigue dibujándose y corriendo, pero no puede capturar
              ni foco ni teclas hasta que lo traigas al frente. */}
          {/* OJO con el valor: `inert=""` React lo trata como FALSO y avisa por
              consola («Received an empty string for a boolean attribute»). Es
              decir, el arreglo del teclado no estaba haciendo nada hasta que se
              vio ese aviso (2026-08-20). Tiene que ser `true` o no estar. */}
          <div
            className="flex-1 min-h-0 flex flex-col bg-white"
            inert={v.z === Math.max(...ventanas.filter(x => !x.minimizada).map(x => x.z)) ? undefined : true}
          >
            {/* LOS BOTONES DE LA VENTANA, que antes vivían en la barra de
                título. Van al final de la única barra que queda. */}
            {v.clase === 'app' && (
              <BarraDireccion
                compacto={compacto}
                onMover={e => empezarGesto(e, v, 'mover')}
                onDobleClic={() => cambiar(v.id, { maximizada: !v.maximizada })}
                arrastrable={!v.maximizada}
                controles={controlesDe(v)}
                ruta={v.ruta || v.destino}
                onNombre={n => { if (n && n !== v.titulo) cambiar(v.id, { titulo: n }); }}
                puedeAtras={(v.pos ?? 0) > 0}
                puedeAdelante={(v.pos ?? 0) < ((v.historia?.length ?? 1) - 1)}
                onAtras={() => irEnHistoria(v.id, 'atras')}
                onAdelante={() => irEnHistoria(v.id, 'adelante')}
                onRecargar={() => { const m = marcos.current[v.id]; try { m?.contentWindow?.location.reload(); } catch { /* ya está */ } }}
                onIr={destino => {
                  // Ir a un trozo del camino navega DENTRO del marco: así no se
                  // recarga la app entera ni se pierde lo que haya abierto.
                  const m = marcos.current[v.id];
                  try { m?.contentWindow?.location.assign(`${destino}${destino.includes('?') ? '&' : '?'}embed=1`); }
                  catch { /* de otro origen: no debería pasar */ }
                }}
              />
            )}
          <div className="flex-1 min-h-0 relative bg-white">
            {v.clase === 'navegador'
              ? <Navegador inicial={v.destino}
                  controles={controlesDe(v)}
                  onMover={e => empezarGesto(e, v, 'mover')}
                  arrastrable={!v.maximizada}
                  onTitulo={t => cambiar(v.id, { titulo: t })}
                  onUrl={u => { cambiar(v.id, { destino: u }); onPaginaNavegador?.(u); publicarPaginaWeb(u); }} />
              : (
                <iframe
                  // `embed=1`: la página SOLA, sin la cabecera de la app dentro
                  // de la ventana (el fallo de la captura de Eugenio).
                  src={srcDe(v)}
                  title={v.titulo}
                  className="w-full h-full border-0"
                  ref={el => { marcos.current[v.id] = el; }}
                  allow="autoplay; fullscreen; xr-spatial-tracking; clipboard-write"
                />
              )}
            </div>
          </div>

          {/* Esquina de tamaño */}
          {!v.maximizada && (
            <div
              onPointerDown={e => empezarGesto(e, v, 'tamano')}
              title="Arrastra para cambiar el tamaño"
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none"
              style={{ background: 'linear-gradient(135deg, transparent 50%, #94a3b8 50%)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
