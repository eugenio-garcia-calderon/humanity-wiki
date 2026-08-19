// ============================================================================
// JUEGO VITAL — LA ALDEA VIVA (2026-08-19, fase 8 del realismo).
//
// Tres cosas que convierten un decorado en un sitio donde pasa el tiempo:
//
//   1. CICLO DÍA/NOCHE con TU hora real. No es un reloj de juego: si en tu
//      casa son las nueve de la noche, en la aldea está anocheciendo. El sol
//      se mueve, cambia de color, la niebla y el cielo le siguen y por la
//      noche entra la luz de luna.
//   2. BICHOS: mariposas y abejas de día sobre el bosque comestible,
//      luciérnagas de noche. Instanciados, con vuelo propio.
//   3. EL NOMBRE DE LO QUE TIENES AL LADO: al acercarte a una planta del
//      bosque comestible, su nombre, su latín y qué da.
// ============================================================================
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { crearAzar } from './paleta';
import { PALETA } from './paleta';
import { siembraComestible, plantaCerca, type Planta } from './BosqueComestible';

// ---------------------------------------------------------------------------
// 1. EL CICLO DEL DÍA
// ---------------------------------------------------------------------------
export interface EstadoCielo {
  /** 0 = noche cerrada · 1 = mediodía. */
  luz: number;
  /** Altura del sol sobre el horizonte, en radianes. Negativa = bajo tierra. */
  elevacion: number;
  /** Ángulo del sol alrededor del mundo. */
  azimut: number;
  esNoche: boolean;
}

/** Dónde está el sol AHORA MISMO, según la hora del reloj del jugador. */
export function cieloDeLaHora(fecha = new Date()): EstadoCielo {
  const h = fecha.getHours() + fecha.getMinutes() / 60;
  // Amanece a las 7 y anochece a las 21: 14 horas de luz, como un día medio
  // en la península. Fuera de esa franja, es de noche.
  const t = (h - 7) / 14;                     // 0 al amanecer, 1 al anochecer
  const elevacion = Math.sin(t * Math.PI) * 1.15;   // hasta ~66°
  const esNoche = t < 0 || t > 1;
  const luz = esNoche ? 0 : Math.max(0, Math.sin(t * Math.PI));
  // El sol sale por el este (+x) y se pone por el oeste.
  const azimut = Math.PI * (0.15 + t * 0.7);
  return { luz, elevacion, azimut, esNoche };
}

const COLOR_DIA = new THREE.Color('#fff4e0');
const COLOR_TARDE = new THREE.Color('#ff9d4a');
const COLOR_NOCHE = new THREE.Color('#8fa8d9');
const CIELO_DIA = new THREE.Color(PALETA.cielo);
const CIELO_TARDE = new THREE.Color('#e08a5a');
const CIELO_NOCHE = new THREE.Color('#0e1630');

/**
 * Mueve el sol, tiñe la luz, la niebla y el fondo según la hora real. Va por
 * `useFrame` pero solo recalcula cada medio segundo: el sol no corre.
 */
export function CicloDia({ luzRef, onCambio }: {
  luzRef: React.RefObject<THREE.DirectionalLight | null>;
  /** Avisa a la escena de si es de noche (para encender farolas y bichos). */
  onCambio?: (e: EstadoCielo) => void;
}) {
  const { scene } = useThree();
  const proximo = useRef(0);
  const ultimoNoche = useRef<boolean | null>(null);
  const colorLuz = useMemo(() => new THREE.Color(), []);
  const colorCielo = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    if (clock.elapsedTime < proximo.current) return;
    proximo.current = clock.elapsedTime + 0.5;
    const e = cieloDeLaHora();

    // El color del sol: naranja bajo, blanco alto, azul de luna de noche.
    if (e.esNoche) colorLuz.copy(COLOR_NOCHE);
    else colorLuz.copy(COLOR_TARDE).lerp(COLOR_DIA, Math.min(1, e.luz * 1.6));
    if (e.esNoche) colorCielo.copy(CIELO_NOCHE);
    else colorCielo.copy(CIELO_TARDE).lerp(CIELO_DIA, Math.min(1, e.luz * 1.5));

    const luz = luzRef.current;
    if (luz) {
      // La posición la fija el Personaje cada fotograma (la sombra le sigue);
      // aquí se corrige la ALTURA y el color, que son lo que da la hora.
      luz.color.copy(colorLuz);
      // Luna generosa: con 0,22 la aldea de noche era una pared negra y no
      // se podía jugar (visto en pruebas a las 3 de la mañana).
      luz.intensity = e.esNoche ? 0.6 : 0.55 + e.luz * 1.5;
    }
    // Niebla y fondo acompañan: de noche la lejanía se cierra.
    if (scene.fog && (scene.fog as THREE.Fog).color) {
      (scene.fog as THREE.Fog).color.copy(colorCielo);
      (scene.fog as THREE.Fog).far = e.esNoche ? 420 : 780;
    }
    scene.environmentIntensity = e.esNoche ? 0.3 : 0.25 + e.luz * 0.5;

    if (ultimoNoche.current !== e.esNoche) {
      ultimoNoche.current = e.esNoche;
      onCambio?.(e);
    }
  });

  return null;
}

// ---------------------------------------------------------------------------
// 2. LOS BICHOS
// ---------------------------------------------------------------------------
/**
 * Mariposas y abejas de día, luciérnagas de noche. Vuelan sobre el bosque
 * comestible (donde está la comida, están los bichos) en una sola malla
 * instanciada que se mueve entera en el shader del CPU: 200 bichos, un draw.
 */
export function Bichos({ cantidad = 150, esNoche = false }: { cantidad?: number; esNoche?: boolean }) {
  const malla = useRef<THREE.InstancedMesh>(null);
  const datos = useMemo(() => {
    const azar = crearAzar(777001);
    const plantas = siembraComestible();
    if (!plantas.length) return [];
    return Array.from({ length: cantidad }, () => {
      // Cada bicho ronda UNA planta: es su parcela.
      const p = plantas[Math.floor(azar() * plantas.length)];
      return {
        cx: p.x, cz: p.z,
        alto: 0.9 + azar() * (p.especie.alto * 0.55),
        radio: 0.8 + azar() * 2.4,
        fase: azar() * Math.PI * 2,
        vel: 0.35 + azar() * 0.7,
        sube: 0.25 + azar() * 0.5,
      };
    });
  }, [cantidad]);

  const M = useMemo(() => new THREE.Matrix4(), []);
  const P = useMemo(() => new THREE.Vector3(), []);
  const Q = useMemo(() => new THREE.Quaternion(), []);
  const S = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const m = malla.current;
    if (!m || !datos.length) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i];
      const a = d.fase + t * d.vel;
      P.set(
        d.cx + Math.cos(a) * d.radio,
        d.alto + Math.sin(t * d.sube + d.fase) * 0.45,
        d.cz + Math.sin(a * 1.3) * d.radio,
      );
      // Las luciérnagas laten; las mariposas no.
      const s = esNoche ? 0.09 + Math.abs(Math.sin(t * 3 + d.fase)) * 0.07 : 0.11;
      S.set(s, s, s);
      M.compose(P, Q, S);
      m.setMatrixAt(i, M);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  if (!datos.length) return null;
  return (
    <instancedMesh ref={malla} args={[undefined, undefined, datos.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 5]} />
      {/* De noche brillan (el bloom de la fase 0 las hace resplandecer);
          de día son mariposas y abejas de color cálido. */}
      <meshBasicMaterial
        color={esNoche ? '#eaff8a' : '#f5d76e'}
        toneMapped={!esNoche}
        transparent
        opacity={esNoche ? 0.95 : 0.85}
      />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// 3. EL NOMBRE DE LA PLANTA QUE TIENES AL LADO
// ---------------------------------------------------------------------------
/**
 * Al acercarte a menos de 3,5 m de una planta del bosque comestible, aparece
 * su nombre, su latín y qué da. Un bosque comestible que no te dice qué es
 * cada cosa no enseña nada.
 */
export function RotuloComestible({ jugadorPos }: { jugadorPos: THREE.Vector3 }) {
  const [cerca, setCerca] = useState<Planta | null>(null);
  const proximo = useRef(0);
  const ultimo = useRef<string>('');

  useFrame(({ clock }) => {
    if (clock.elapsedTime < proximo.current) return;
    proximo.current = clock.elapsedTime + 0.25;
    const p = plantaCerca(jugadorPos.x, jugadorPos.z, 3.6);
    const clave = p ? `${p.especie.id}|${p.x.toFixed(1)}` : '';
    if (clave !== ultimo.current) {
      ultimo.current = clave;
      setCerca(p);
    }
  });

  if (!cerca) return null;
  const alto = cerca.especie.alto * cerca.escala;
  return (
    <Billboard position={[cerca.x, Math.min(alto + 0.9, 6.5), cerca.z]}>
      <mesh position={[0, -0.02, -0.01]}>
        <planeGeometry args={[3.5, 1.15]} />
        <meshBasicMaterial color="#12200f" transparent opacity={0.62} toneMapped={false} />
      </mesh>
      <Text position={[0, 0.3, 0]} fontSize={0.29} color="#eaffd0" anchorX="center" anchorY="middle"
        outlineWidth={0.012} outlineColor="#12200f">
        {cerca.especie.nombre}
      </Text>
      <Text position={[0, 0.02, 0]} fontSize={0.155} color="#a8c48a" anchorX="center" anchorY="middle">
        {cerca.especie.latin}
      </Text>
      <Text position={[0, -0.28, 0]} fontSize={0.175} maxWidth={3.2} color="#f5d76e"
        anchorX="center" anchorY="middle" textAlign="center">
        {cerca.especie.da}
      </Text>
    </Billboard>
  );
}
