// ============================================================================
// JUEGO VITAL — bici y planeador Aptera (2026-08-18, petición de Eugenio).
// ============================================================================
// Los dos van hechos con geometría, no con modelos descargados, por dos
// razones: la librería CC0 que usamos (Kenney) no trae bicicleta, y de la
// Aptera no existe —ni puede existir— un modelo libre: es el diseño de un
// coche real de una empresa real. Lo que hay aquí es una versión estilizada
// del MISMO lenguaje visual que el resto del mundo: silueta de gota, tres
// ruedas y panel solar, que es lo que la hace reconocible.
//
// La versión voladora con rotores es invención de Eugenio para el juego: la
// Aptera de verdad no vuela.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETA } from './paleta';

/** Radio de la rueda de la bici, en metros: una 700c real mide 0,35 m. */
const RUEDA = 0.35;

function Rueda({ x, y, z, r = RUEDA, ancho = 0.06, giro }: {
  x: number; y: number; z: number; r?: number; ancho?: number;
  giro?: React.MutableRefObject<number>;
}) {
  const malla = useRef<THREE.Mesh>(null);
  useFrame(() => { if (malla.current && giro) malla.current.rotation.x = giro.current; });
  return (
    <mesh ref={malla} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[r, r, ancho, 16]} />
      <meshStandardMaterial color={PALETA.hierro} roughness={0.8} />
    </mesh>
  );
}

/**
 * Bicicleta. El personaje va de pie encima (no hay animación de pedaleo en los
 * modelos de Kenney, así que sentarlo quedaría peor que dejarlo erguido).
 * Se dibuja mirando a +Z, igual que el personaje.
 */
export function Bici({ rodando }: { rodando: boolean }) {
  const giro = useRef(0);
  useFrame((_, dt) => { if (rodando) giro.current += dt * 9; });

  return (
    <group position={[0, 0, 0]}>
      <Rueda x={0} y={RUEDA} z={0.55} giro={giro} />
      <Rueda x={0} y={RUEDA} z={-0.55} giro={giro} />
      {/* Cuadro: dos tubos en diagonal y el tubo horizontal */}
      <mesh position={[0, 0.62, 0]} rotation={[0.55, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.05, 8]} />
        <meshStandardMaterial color={PALETA.robotLuz} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0.22]} rotation={[-0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.8, 8]} />
        <meshStandardMaterial color={PALETA.robotLuz} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.78, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.75, 8]} />
        <meshStandardMaterial color={PALETA.robotLuz} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Sillín y manillar */}
      <mesh position={[0, 0.95, -0.42]} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.3]} />
        <meshStandardMaterial color={PALETA.robotDetalle} />
      </mesh>
      <mesh position={[0, 1.02, 0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.5, 8]} />
        <meshStandardMaterial color={PALETA.robotDetalle} />
      </mesh>
    </group>
  );
}

/**
 * Planeador «Aptera»: tres ruedas, carrocería de gota, panel solar arriba y
 * DOS ALAS en V al estilo del V-Coptr Falcon (petición de Eugenio): al
 * despegar se despliegan dos brazos que forman una V, con UN rotor en el
 * extremo de cada uno. En el suelo van plegadas en vertical, como una libélula
 * con las alas cerradas; el despliegue es el gesto del despegue.
 *
 * `alturaVuelo` decide todo lo que se mueve: las alas se abren y los dos
 * rotores aceleran con la altura. Va por ref para no re-renderizar cada metro.
 */
export function Aptera({ alturaVuelo, avanzando }: {
  alturaVuelo: React.MutableRefObject<number>;
  avanzando: boolean;
}) {
  const alaIzq = useRef<THREE.Group>(null);
  const alaDer = useRef<THREE.Group>(null);
  const palas = useRef<THREE.Group[]>([]);
  const cuerpo = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const h = alturaVuelo.current;
    // 0 en el suelo, 1 en pleno vuelo: abre las alas y acelera los rotores.
    const vuelo = Math.min(1, h / 6);
    // Plegadas casi en vertical (1,35 rad) → V abierta (0,52 rad ≈ 30°).
    const ang = 1.35 - vuelo * 0.83;
    if (alaIzq.current) alaIzq.current.rotation.z += (ang - alaIzq.current.rotation.z) * Math.min(1, dt * 4);
    if (alaDer.current) alaDer.current.rotation.z += (-ang - alaDer.current.rotation.z) * Math.min(1, dt * 4);
    for (const p of palas.current) {
      if (p) p.rotation.y += dt * (5 + vuelo * 48);
    }
    // Al avanzar se inclina hacia delante, como cualquier multirrotor.
    if (cuerpo.current) {
      const objetivo = avanzando && h > 0.5 ? -0.16 : 0;
      cuerpo.current.rotation.x += (objetivo - cuerpo.current.rotation.x) * Math.min(1, dt * 3);
    }
  });

  /** Un ala en V con su rotor en la punta. `lado` 1 = izquierda, -1 = derecha. */
  const Ala = ({ lado, refAla, iPala }: {
    lado: 1 | -1; refAla: React.RefObject<THREE.Group | null>; iPala: number;
  }) => (
    <group ref={refAla} position={[lado * 0.5, 1.38, -0.55]} rotation={[0, 0, lado * 1.35]}>
      {/* El brazo del ala: ancho en la raíz, fino en la punta */}
      <mesh position={[lado * 1.15, 0, 0]} castShadow>
        <boxGeometry args={[2.3, 0.09, 0.42]} />
        <meshStandardMaterial color={PALETA.lienzoBlanco} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[lado * 1.15, 0.02, -0.14]} castShadow>
        <boxGeometry args={[2.1, 0.05, 0.14]} />
        <meshStandardMaterial color={PALETA.robotDetalle} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Góndola del rotor, en el EXTREMO del ala */}
      <group position={[lado * 2.3, 0.05, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.3, 10]} />
          <meshStandardMaterial color={PALETA.robotDetalle} />
        </mesh>
        <group ref={(g) => { if (g) palas.current[iPala] = g; }} position={[0, 0.18, 0]}>
          {[0, Math.PI / 2].map(a => (
            <mesh key={a} rotation={[0, a, 0]}>
              <boxGeometry args={[1.7, 0.03, 0.13]} />
              <meshStandardMaterial color={PALETA.robotDetalle} transparent opacity={0.65} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );

  return (
    <group ref={cuerpo} position={[0, 0, 0]}>
      <Ala lado={1} refAla={alaIzq} iPala={0} />
      <Ala lado={-1} refAla={alaDer} iPala={1} />
      {/* Carrocería: gota alargada. Una esfera escalada da el morro redondo y
          el cono de detrás, la cola afilada que define la silueta. */}
      <mesh position={[0, 0.85, 0.35]} scale={[1.05, 0.62, 1.5]} castShadow receiveShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={PALETA.lienzoBlanco} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.85, -1.5]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.62, 1.5, 16]} />
        <meshStandardMaterial color={PALETA.lienzoBlanco} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* Burbuja de la cabina */}
      <mesh position={[0, 1.18, 0.62]} scale={[0.72, 0.42, 0.95]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color={PALETA.ventana} roughness={0.1} metalness={0.1} transparent opacity={0.72} />
      </mesh>
      {/* Panel solar del techo */}
      <mesh position={[0, 1.32, -0.35]} rotation={[0.06, 0, 0]} receiveShadow>
        <boxGeometry args={[1.15, 0.05, 1.5]} />
        <meshStandardMaterial color={PALETA.robotDetalle} roughness={0.25} metalness={0.5} />
      </mesh>
      {/* Carenados de las dos ruedas delanteras + la rueda trasera central */}
      {[-1.02, 1.02].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.72, 0.75]} scale={[0.3, 0.42, 0.72]} castShadow>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={PALETA.lienzoBlanco} roughness={0.4} />
          </mesh>
          <Rueda x={x} y={0.38} z={0.75} r={0.38} ancho={0.16} />
        </group>
      ))}
      <Rueda x={0} y={0.34} z={-1.35} r={0.34} ancho={0.16} />
    </group>
  );
}

/** Sombra falsa en el suelo cuando vuelas: sin ella no se sabe a qué altura vas. */
export function SombraVuelo({ alturaVuelo }: { alturaVuelo: React.MutableRefObject<number> }) {
  const malla = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = malla.current;
    if (!m) return;
    const h = alturaVuelo.current;
    m.visible = h > 0.4;
    m.position.y = -h + 0.06;
    const e = 1 + h * 0.05;
    m.scale.set(e, e, 1);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, 0.32 - h * 0.004);
  });
  return (
    <mesh ref={malla} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <circleGeometry args={[1.6, 24]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}
