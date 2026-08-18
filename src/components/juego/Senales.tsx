// ============================================================================
// JUEGO VITAL — señales de «aquí se puede hacer algo» (2026-08-18, petición de
// Eugenio: «un halo superior con animación que se vea de lejos lo que son» y
// «al pasar el ratón que se amplíe el cartel y den ganas de hacer click»).
// ============================================================================
// Dos piezas que comparten los edificios de proyecto y las personas:
//
//   <Halo>      un anillo que gira y late sobre la cosa, más un haz de luz.
//               Se ve desde lejos y dice «esto tiene algo dentro».
//   <Interactivo> envuelve lo que sea y lo hace pulsable: crece al pasar por
//               encima, cambia el cursor y avisa al hacer clic.
//
// El clic NO se dispara si has arrastrado: en este juego arrastrar es girar la
// cámara, y sin esa comprobación cada vez que giraras mirando a un edificio
// acabarías entrando en él.
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

/** Píxeles de arrastre a partir de los cuales el gesto es «mirar», no «pulsar». */
const UMBRAL_ARRASTRE = 6;

/** Cuánto aguanta el resaltado tras salir el ratón, en ms. */
const ESPERA_SALIDA = 450;

/** Malla que el rayo del ratón atraviesa como si no estuviera. */
const NO_RAYO = () => null;

/** Tamaño del nombre en reposo, en metros. */
const LETRA = 0.36;
/** Al resaltar, qué parte del ALTO DE LA PANTALLA ocupa el nombre.
 *  Empezó en 0,075 y Eugenio lo bajó al 40 % de aquello: ocupaba demasiado. */
const FRACCION_PANTALLA = 0.03;

const tmpMundo = new THREE.Vector3();

/**
 * Nombre flotante que, al resaltarse, pasa a medirse en PANTALLA y no en el
 * mundo (petición de Eugenio: «que ocupe una parte relevante de la pantalla
 * para que se pueda leer aunque esté lejos»).
 *
 * La cuenta: a distancia `d`, con un campo de visión `fov`, la altura visible
 * del mundo es `2·d·tan(fov/2)`. Escalando el texto a esa altura por la
 * fracción que queremos, el nombre ocupa siempre lo mismo en pantalla, esté a
 * 5 m o a 300. Sin esto, un nombre «más grande» seguiría siendo ilegible de
 * lejos, que es justo el problema.
 */
export function Rotulo({ y, texto, pie, color, resaltado, ancho = 9 }: {
  y: number; texto: string; pie?: string; color: string; resaltado: boolean; ancho?: number;
}) {
  const g = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    const grupo = g.current;
    if (!grupo) return;
    let objetivo = 1;
    if (resaltado) {
      grupo.getWorldPosition(tmpMundo);
      const d = camera.position.distanceTo(tmpMundo);
      const fov = ((camera as THREE.PerspectiveCamera).fov ?? 48) * Math.PI / 180;
      const altoVisible = 2 * d * Math.tan(fov / 2);
      objetivo = (FRACCION_PANTALLA * altoVisible) / LETRA;
    }
    const s = grupo.scale.x;
    grupo.scale.setScalar(s + (objetivo - s) * 0.25);
  });

  return (
    <Billboard position={[0, y, 0]}>
      <group ref={g}>
        <Text
          fontSize={LETRA}
          maxWidth={ancho}
          textAlign="center"
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={LETRA * 0.14}
          outlineColor="#1e2733"
          // Resaltado va SIEMPRE por delante: si no, el propio edificio taparía
          // su nombre justo cuando lo has hecho grande para leerlo.
          renderOrder={resaltado ? 20 : 0}
          frustumCulled={false}
          material-depthTest={!resaltado}
        >
          {texto}
        </Text>
        {resaltado && pie && (
          <Text
            position={[0, -LETRA * 1.25, 0]}
            fontSize={LETRA * 0.62}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={LETRA * 0.1}
            outlineColor="#1e2733"
            renderOrder={20}
            material-depthTest={false}
            frustumCulled={false}
          >
            {pie}
          </Text>
        )}
      </group>
    </Billboard>
  );
}

/**
 * Halo flotante. `y` es la altura a la que va (encima del tejado o de la
 * cabeza). Gira despacio, late, y deja caer un haz suave hasta el suelo.
 */
export function Halo({ y, color, radio = 1.15, resaltado = false }: {
  y: number; color: string; radio?: number; resaltado?: boolean;
}) {
  const anillo = useRef<THREE.Group>(null);
  const haz = useRef<THREE.Mesh>(null);
  const fase = useRef(Math.random() * 6.28);

  useFrame((estado) => {
    const t = estado.clock.elapsedTime + fase.current;
    if (anillo.current) {
      anillo.current.rotation.y = t * 0.8;
      anillo.current.position.y = y + Math.sin(t * 1.5) * 0.22;
      const s = (resaltado ? 1.35 : 1) * (1 + Math.sin(t * 2.2) * 0.06);
      anillo.current.scale.setScalar(s);
    }
    if (haz.current) {
      const m = haz.current.material as THREE.MeshBasicMaterial;
      m.opacity = (resaltado ? 0.3 : 0.14) + Math.sin(t * 1.8) * 0.05;
    }
  });

  return (
    // OJO: `raycast` hay que anularlo MALLA A MALLA. Ponerlo en el grupo no
    // sirve — el rayo recorre los hijos igual — y el haz de luz, que envuelve
    // al edificio, se comería los clics de lo que hay debajo.
    <group>
      <group ref={anillo} position={[0, y, 0]}>
        {/* Anillo tumbado: se lee como un halo desde cualquier ángulo */}
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NO_RAYO}>
          <torusGeometry args={[radio, radio * 0.11, 8, 28]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.95} />
        </mesh>
        {/* Tres chispas girando con él: el movimiento es lo que llama la vista */}
        {[0, 2.09, 4.19].map(a => (
          <mesh key={a} position={[Math.cos(a) * radio, 0, Math.sin(a) * radio]} raycast={NO_RAYO}>
            <sphereGeometry args={[radio * 0.13, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Haz hasta el suelo: de lejos es lo primero que se ve */}
      <mesh ref={haz} position={[0, y / 2, 0]} raycast={NO_RAYO}>
        <cylinderGeometry args={[radio * 0.85, radio * 0.2, y, 12, 1, true]} />
        <meshBasicMaterial
          color={color} transparent opacity={0.14} side={THREE.DoubleSide}
          depthWrite={false} toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Hace pulsable lo que envuelve. Da `resaltado` a sus hijos por función para
 * que cada uno decida cómo crecer, en vez de imponer una escala global.
 */
export function Interactivo({ onPulsar, children }: {
  onPulsar: () => void;
  children: (resaltado: boolean) => React.ReactNode;
}) {
  const [resaltado, setResaltado] = useState(false);
  const salida = useRef<number | null>(null);

  // Salir NO es inmediato: se espera un momento y se cancela si el ratón
  // vuelve a entrar. Un muñeco son varias mallas con huecos entre medias, y
  // sin esta espera el nombre parpadeaba —desaparecía y volvía— con solo
  // mover un poco el ratón por encima (reportado por Eugenio). Ahora hay que
  // irse de verdad para que se apague.
  const cancelarSalida = () => {
    if (salida.current !== null) { clearTimeout(salida.current); salida.current = null; }
  };
  useEffect(() => cancelarSalida, []);

  const entrar = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    cancelarSalida();
    setResaltado(true);
    document.body.style.cursor = 'pointer';
  };
  const salir = () => {
    cancelarSalida();
    salida.current = window.setTimeout(() => {
      salida.current = null;
      setResaltado(false);
      document.body.style.cursor = '';
    }, ESPERA_SALIDA);
  };
  /** Al pulsar sí se apaga en el acto: ya has hecho lo que venías a hacer. */
  const apagarYa = () => {
    cancelarSalida();
    setResaltado(false);
    document.body.style.cursor = '';
  };
  const pulsar = (e: ThreeEvent<MouseEvent>) => {
    // `delta` son los píxeles recorridos desde que se pulsó: si has arrastrado,
    // estabas girando la cámara y esto no es un clic.
    if (e.delta > UMBRAL_ARRASTRE) return;
    e.stopPropagation();
    apagarYa();
    onPulsar();
  };

  return (
    <group onPointerOver={entrar} onPointerOut={salir} onClick={pulsar}>
      {children(resaltado)}
    </group>
  );
}

// ---------------------------------------------------------------------------
// La SEÑAL DE PORTAL (2026-08-18, aclaración de Eugenio): cualquier cosa
// —un objeto, el camión, una persona— puede SER un portal sin perder su
// forma. Esta señal es lo único que lo delata: su nombre flotando en verde
// y un aro de luz girando despacio en el suelo.
// ---------------------------------------------------------------------------
export function SenalDePortal({ y, titulo }: { y: number; titulo: string }) {
  const aro = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (aro.current) aro.current.rotation.z += dt * 0.6;
  });
  return (
    <group>
      <Billboard position={[0, y, 0]}>
        <Text fontSize={0.62} maxWidth={8} color="#c9ffb7" anchorX="center" anchorY="middle" textAlign="center"
          outlineWidth={0.045} outlineColor="#0f3d16">
          {titulo}
        </Text>
        <Text position={[0, -0.55, 0]} fontSize={0.26} color="#8dff6e" anchorX="center" anchorY="middle">
          ◈ portal ◈
        </Text>
      </Billboard>
      {/* El aro en el suelo: gira despacio, como una puerta esperando */}
      <mesh ref={aro} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.15, 1.45, 40, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color="#4be04b" transparent opacity={0.55} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#4be04b" transparent opacity={0.14} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
