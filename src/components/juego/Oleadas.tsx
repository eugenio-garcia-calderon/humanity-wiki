// ============================================================================
// JUEGO VITAL — CARGA POR OLEADAS (2026-08-19, petición de Eugenio: «haz más
// ligero el juego para que no tarde tanto en cargar, con la técnica de los
// juegos grandes para no cargar todo si no hace falta»).
//
// EL PROBLEMA. Hasta hoy la aldea entera se construía de golpe antes de
// enseñar nada: el suelo, las catorce casas, los seiscientos árboles del
// bosque comestible, los cuarenta y cinco objetos, las seis plazas, la gente
// con sus 7,6 MB de animaciones… y hasta que no estaba TODO, pantalla de
// carga. Da igual que el 90% de eso esté a doscientos metros y de espaldas.
//
// CÓMO LO HACEN LOS JUEGOS GRANDES. Dos ideas, y las dos están aquí:
//
//   1. «PLAYABLE FIRST» — se monta primero lo mínimo para que puedas moverte
//      (suelo, plaza, luz, cámara y tu personaje), se pinta, y a partir de
//      ahí el mundo va entrando en oleadas mientras tú ya estás jugando.
//      Cada oleada espera a que el navegador haya PINTADO la anterior y esté
//      ocioso, así que ninguna te congela la imagen.
//   2. «STREAMING POR DISTANCIA» — lo que está lejos no existe todavía. El
//      bosque comestible se siembra por anillos alrededor de ti; según
//      caminas, entra el anillo siguiente y se suelta el que dejas atrás.
//
// El resultado: se juega en cuanto se ve el suelo, no cuando ha llegado el
// último arbusto.
// ============================================================================
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Sube de oleada cuando el navegador ha pintado la anterior y tiene un hueco
 * libre. Devuelve la última oleada montada: 0 al entrar, `total` al final.
 *
 * El `timeout` del `requestIdleCallback` es el seguro: si la máquina no está
 * ociosa nunca (móvil flojo), la oleada entra igualmente al cabo de un
 * segundo en vez de no llegar jamás.
 */
export function useOleadas(total: number): number {
  const [oleada, setOleada] = useState(0);

  useEffect(() => {
    if (oleada >= total) return;
    let vivo = true;
    let raf = 0;
    let temporizador = 0;
    const siguiente = () => { if (vivo) setOleada(o => o + 1); };

    // Dos rAF seguidos = «lo que acabo de montar ya está pintado en pantalla».
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const ocioso = (window as unknown as {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        }).requestIdleCallback;
        if (ocioso) ocioso(siguiente, { timeout: 1000 });
        else temporizador = window.setTimeout(siguiente, 150);   // Safari viejo
      });
    });

    return () => { vivo = false; cancelAnimationFrame(raf); clearTimeout(temporizador); };
  }, [oleada, total]);

  return oleada;
}

/**
 * Envuelve un trozo del mundo: no se monta hasta que llega su oleada, y
 * cuando se monta, si tiene que descargar algo, lo hace SIN tapar lo que ya
 * se ve (`fallback={null}`).
 *
 * Esto último es lo que evita el desastre clásico: sin un Suspense propio,
 * un modelo que llega tarde hace que React tire abajo la escena entera y
 * vuelva a la pantalla de carga con el jugador dentro.
 */
export function Oleada({ n, actual, children }: {
  /** En qué oleada entra este trozo (1, 2, 3…). */
  n: number;
  /** La oleada en curso, de `useOleadas`. */
  actual: number;
  children: ReactNode;
}) {
  if (actual < n) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

// ---------------------------------------------------------------------------
// EL CUERPO PROVISIONAL
// ---------------------------------------------------------------------------
/**
 * Mientras bajan los 7,6 MB de animaciones y el modelo de la persona, en su
 * sitio va esta silueta: una cápsula del color de la ropa. Se ve un segundo
 * y ya puedes andar con ella. Es el «proxy mesh» de toda la vida.
 */
export function CuerpoProvisional({ color = '#6b8f5e' }: { color?: string }) {
  return (
    <group position={[0, 0.9, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.26, 0.78, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.21, 12, 10]} />
        <meshStandardMaterial color="#c9a184" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// STREAMING POR DISTANCIA
// ---------------------------------------------------------------------------
/**
 * Dice en qué CASILLA del mundo estás, redondeando a `paso` metros. Sirve
 * para recalcular lo que hay alrededor solo cuando de verdad te has movido:
 * andar tres metros no debe reconstruir un bosque.
 *
 * Devuelve un número que solo cambia al cruzar de casilla, así que se puede
 * meter tal cual en las dependencias de un `useMemo`.
 */
export function useCasilla(jugadorPos: THREE.Vector3, paso = 40): number {
  const [casilla, setCasilla] = useState(0);
  const ultima = useRef(-1);
  const proximo = useRef(0);

  useFrame(({ clock }) => {
    // Cuatro veces por segundo basta y sobra: nadie cruza 40 m en 250 ms.
    if (clock.elapsedTime < proximo.current) return;
    proximo.current = clock.elapsedTime + 0.25;
    const cx = Math.round(jugadorPos.x / paso);
    const cz = Math.round(jugadorPos.z / paso);
    const id = cx * 10000 + cz;
    if (id !== ultima.current) {
      ultima.current = id;
      setCasilla(id);
    }
  });

  return casilla;
}
