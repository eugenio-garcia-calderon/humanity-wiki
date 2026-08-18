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
 * cuatro rotores de despegue vertical que se despliegan al volar.
 *
 * `alturaVuelo` decide todo lo que se mueve: los rotores giran y se abren al
 * despegar, y las ruedas se recogen. Se le pasa por ref para no re-renderizar.
 */
export function Aptera({ alturaVuelo, avanzando }: {
  alturaVuelo: React.MutableRefObject<number>;
  avanzando: boolean;
}) {
  const rotores = useRef<THREE.Group>(null);
  const palas = useRef<THREE.Group[]>([]);
  const cuerpo = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const h = alturaVuelo.current;
    // 0 en el suelo, 1 en pleno vuelo: abre los rotores y los acelera.
    const vuelo = Math.min(1, h / 6);
    for (const p of palas.current) {
      if (p) p.rotation.y += dt * (6 + vuelo * 46);
    }
    if (rotores.current) rotores.current.scale.setScalar(0.35 + vuelo * 0.65);
    // Al avanzar se inclina hacia delante, como cualquier multirrotor.
    if (cuerpo.current) {
      const objetivo = avanzando && h > 0.5 ? -0.16 : 0;
      cuerpo.current.rotation.x += (objetivo - cuerpo.current.rotation.x) * Math.min(1, dt * 3);
    }
  });

  const brazos: Array<[number, number]> = [[1.15, 1.25], [-1.15, 1.25], [1.15, -1.35], [-1.15, -1.35]];

  return (
    <group ref={cuerpo} position={[0, 0, 0]}>
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

      {/* Rotores de despegue vertical: recogidos en el suelo, abiertos al volar */}
      <group ref={rotores} position={[0, 1.42, 0]}>
        {brazos.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[-x / 2, -0.06, -z / 2]} rotation={[0, Math.atan2(x, z), 0]} castShadow>
              <boxGeometry args={[0.09, 0.07, Math.hypot(x, z)]} />
              <meshStandardMaterial color={PALETA.hierro} />
            </mesh>
            <mesh castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.12, 10]} />
              <meshStandardMaterial color={PALETA.robotDetalle} />
            </mesh>
            <group ref={(g) => { if (g) palas.current[i] = g; }}>
              {[0, Math.PI / 2].map(a => (
                <mesh key={a} position={[0, 0.09, 0]} rotation={[0, a, 0]}>
                  <boxGeometry args={[1.5, 0.03, 0.11]} />
                  <meshStandardMaterial color={PALETA.robotDetalle} transparent opacity={0.65} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
      </group>
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
