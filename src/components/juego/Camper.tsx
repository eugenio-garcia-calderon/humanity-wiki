// ============================================================================
// JUEGO VITAL — el camión camperizado (2026-08-18, petición de Eugenio, a
// partir de su foto de referencia: un 4x4 de expedición con cabina bronce,
// célula marrón, baca con travesaños lima, panel solar, cabrestante y ruedas
// de taco). Todo geometría procedural: sin descargas, carga instantánea.
// El morro mira a +z; `piezasAldea()` lo aparca con su rot y su radio.
// ============================================================================
import * as THREE from 'three';

const CABINA = '#7a6350';      // bronce de la cabina
const CELULA = '#5d4a3a';      // marrón de la célula vivienda
const NEGRO = '#1d1d1f';       // parachoques, marcos y bajos
const CRISTAL = '#242f35';     // lunas oscuras
const LIMA = '#c7e34a';        // los travesaños de la baca (como en la foto)
const PLATA = '#9aa0a4';       // defensa, llantas y detalles
const GOMA = '#161616';        // neumáticos
const SOLAR = '#1c2b4a';       // panel solar

/** Una rueda de taco: neumático, banda de letras blancas y llanta. */
function Rueda({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.55, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.4, 20]} />
        <meshStandardMaterial color={GOMA} roughness={0.95} />
      </mesh>
      {/* Tacos del neumático: un anillo dentado por fuera */}
      <mesh>
        <cylinderGeometry args={[0.57, 0.57, 0.34, 10]} />
        <meshStandardMaterial color="#0e0e0e" roughness={1} flatShading />
      </mesh>
      {/* Letras blancas del flanco (la banda clara de la foto) */}
      <mesh position={[0, 0.201, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.44, 24]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Llanta y buje */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.32, 12]} />
        <meshStandardMaterial color="#2e2e30" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 10]} />
        <meshStandardMaterial color={PLATA} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Ventana con marco negro y luna oscura, pegada a un lateral de la célula. */
function VentanaCelula({ x, z, ancho = 1.0 }: { x: number; z: number; ancho?: number }) {
  const lado = Math.sign(x);
  return (
    <group position={[x, 2.5, z]}>
      <mesh>
        <boxGeometry args={[0.06, 0.72, ancho + 0.12]} />
        <meshStandardMaterial color={NEGRO} roughness={0.6} />
      </mesh>
      <mesh position={[lado * 0.02, 0, 0]}>
        <boxGeometry args={[0.06, 0.6, ancho]} />
        <meshStandardMaterial color={CRISTAL} roughness={0.15} metalness={0.4} />
      </mesh>
    </group>
  );
}

/**
 * El camión camperizado entero. Morro a +z, apoyado en el suelo (y=0),
 * ~7,2 m de largo × 2,35 de ancho × 3,3 de alto: manda sobre los coches
 * de juguete pero no sobre las casas.
 */
export function Camper() {
  return (
    <group>
      {/* ---------- bastidor y bajos ---------- */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[1.9, 0.3, 6.6]} />
        <meshStandardMaterial color={NEGRO} roughness={0.8} />
      </mesh>
      {/* depósitos y cofres plateados entre ejes */}
      <mesh position={[1.02, 0.78, 0.4]}>
        <boxGeometry args={[0.18, 0.36, 1.1]} />
        <meshStandardMaterial color={PLATA} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[-1.02, 0.78, 0.4]}>
        <boxGeometry args={[0.18, 0.36, 1.1]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.7} />
      </mesh>

      <Rueda x={1.0} z={2.35} />
      <Rueda x={-1.0} z={2.35} />
      <Rueda x={1.0} z={-1.8} />
      <Rueda x={-1.0} z={-1.8} />

      {/* ---------- cabina ---------- */}
      {/* capó con caída y su lámina negra central (como la foto) */}
      <mesh castShadow position={[0, 1.62, 2.95]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[2.05, 0.42, 1.15]} />
        <meshStandardMaterial color={CABINA} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.86, 2.9]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[1.15, 0.02, 0.85]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      {/* cuerpo de la cabina */}
      <mesh castShadow position={[0, 2.2, 2.0]}>
        <boxGeometry args={[2.15, 1.3, 1.7]} />
        <meshStandardMaterial color={CABINA} metalness={0.35} roughness={0.45} />
      </mesh>
      {/* parabrisas inclinado */}
      <mesh position={[0, 2.5, 2.88]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[1.8, 0.8, 0.05]} />
        <meshStandardMaterial color={CRISTAL} roughness={0.1} metalness={0.5} />
      </mesh>
      {/* lunas laterales y tiradores */}
      {[1, -1].map(l => (
        <group key={l}>
          <mesh position={[l * 1.09, 2.52, 2.05]}>
            <boxGeometry args={[0.04, 0.55, 0.95]} />
            <meshStandardMaterial color={CRISTAL} roughness={0.15} metalness={0.4} />
          </mesh>
          <mesh position={[l * 1.09, 2.0, 1.75]}>
            <boxGeometry args={[0.05, 0.06, 0.24]} />
            <meshStandardMaterial color={NEGRO} />
          </mesh>
          {/* retrovisor en brazo */}
          <mesh position={[l * 1.22, 2.62, 2.75]}>
            <boxGeometry args={[0.22, 0.04, 0.04]} />
            <meshStandardMaterial color={NEGRO} />
          </mesh>
          <mesh position={[l * 1.34, 2.5, 2.75]}>
            <boxGeometry args={[0.06, 0.3, 0.18]} />
            <meshStandardMaterial color={NEGRO} roughness={0.5} />
          </mesh>
          {/* estribo bajo la puerta */}
          <mesh position={[l * 1.02, 0.62, 2.0]}>
            <boxGeometry args={[0.3, 0.06, 0.8]} />
            <meshStandardMaterial color={NEGRO} roughness={0.8} />
          </mesh>
          {/* guardabarros delantero */}
          <mesh position={[l * 1.06, 1.16, 2.35]}>
            <boxGeometry args={[0.16, 0.1, 1.3]} />
            <meshStandardMaterial color="#232325" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ---------- frontal ---------- */}
      {/* calandra negra con lamas */}
      <mesh position={[0, 1.32, 3.56]}>
        <boxGeometry args={[1.6, 0.5, 0.08]} />
        <meshStandardMaterial color="#181818" roughness={0.6} />
      </mesh>
      {[0.12, 0, -0.12].map(dy => (
        <mesh key={dy} position={[0, 1.32 + dy, 3.61]}>
          <boxGeometry args={[1.4, 0.05, 0.02]} />
          <meshStandardMaterial color="#3c3c3e" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* faros */}
      {[1, -1].map(l => (
        <mesh key={l} position={[l * 0.86, 1.45, 3.6]}>
          <boxGeometry args={[0.34, 0.18, 0.06]} />
          <meshBasicMaterial color="#f2f4ec" />
        </mesh>
      ))}
      {/* parachoques con cabrestante, gancho y quitamiedos */}
      <mesh castShadow position={[0, 0.85, 3.62]}>
        <boxGeometry args={[2.1, 0.5, 0.4]} />
        <meshStandardMaterial color={NEGRO} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.0, 3.78]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.5, 10]} />
        <meshStandardMaterial color={PLATA} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.78, 3.84]}>
        <boxGeometry args={[0.1, 0.16, 0.06]} />
        <meshStandardMaterial color="#c04a2a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.55, 3.62]}>
        <boxGeometry args={[0.9, 0.18, 0.3]} />
        <meshStandardMaterial color={PLATA} metalness={0.55} roughness={0.4} />
      </mesh>
      {/* matrícula */}
      <mesh position={[0.55, 1.02, 3.83]}>
        <boxGeometry args={[0.5, 0.13, 0.02]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.6} />
      </mesh>

      {/* ---------- baca de cabina con barra de luces ---------- */}
      {[1, -1].map(l => (
        <mesh key={l} position={[l * 0.95, 3.0, 2.05]}>
          <boxGeometry args={[0.07, 0.16, 1.5]} />
          <meshStandardMaterial color={NEGRO} roughness={0.6} />
        </mesh>
      ))}
      {[1.45, 2.65].map(z => (
        <mesh key={z} position={[0, 3.06, z]}>
          <boxGeometry args={[2.0, 0.07, 0.07]} />
          <meshStandardMaterial color={LIMA} roughness={0.5} />
        </mesh>
      ))}
      {/* barra LED mirando al frente */}
      <mesh position={[0, 3.0, 2.75]}>
        <boxGeometry args={[1.5, 0.13, 0.13]} />
        <meshStandardMaterial color="#101010" roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.0, 2.82]}>
        <boxGeometry args={[1.4, 0.06, 0.01]} />
        <meshBasicMaterial color="#f8fadf" />
      </mesh>
      {/* antena */}
      <mesh position={[0.6, 3.3, 2.4]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
        <meshStandardMaterial color={NEGRO} />
      </mesh>

      {/* ---------- célula vivienda ---------- */}
      <mesh castShadow position={[0, 2.25, -1.3]}>
        <boxGeometry args={[2.35, 2.1, 4.5]} />
        <meshStandardMaterial color={CELULA} roughness={0.6} />
      </mesh>
      {/* fuelle oscuro entre cabina y célula */}
      <mesh position={[0, 2.2, 1.0]}>
        <boxGeometry args={[2.2, 1.9, 0.35]} />
        <meshStandardMaterial color="#26262a" roughness={0.9} />
      </mesh>
      {/* franjas negras: esquinas y línea del techo (los cantos de la foto) */}
      {[1, -1].map(l => (
        <mesh key={l} position={[l * 1.16, 2.25, -3.5]}>
          <boxGeometry args={[0.1, 2.1, 0.12]} />
          <meshStandardMaterial color={NEGRO} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 3.28, -1.3]}>
        <boxGeometry args={[2.37, 0.14, 4.52]} />
        <meshStandardMaterial color={NEGRO} roughness={0.6} />
      </mesh>
      {/* ventanas: dos por lado, y la trasera pequeña */}
      <VentanaCelula x={1.18} z={-0.35} />
      <VentanaCelula x={1.18} z={-2.0} />
      <VentanaCelula x={-1.18} z={-0.35} />
      <VentanaCelula x={-1.18} z={-2.0} />
      {/* portón lateral de cofre (la trampilla de la foto) */}
      <mesh position={[1.18, 1.55, -2.7]}>
        <boxGeometry args={[0.05, 0.62, 0.7]} />
        <meshStandardMaterial color="#4e3d2f" roughness={0.65} />
      </mesh>
      {/* puerta trasera con marco y tirador */}
      <mesh position={[0.45, 1.95, -3.57]}>
        <boxGeometry args={[0.85, 1.7, 0.06]} />
        <meshStandardMaterial color="#52402f" roughness={0.65} />
      </mesh>
      <mesh position={[0.12, 1.95, -3.61]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color={NEGRO} />
      </mesh>
      {/* escalera trasera */}
      {[1, -1].map(l => (
        <mesh key={l} position={[-0.75 + l * 0.18, 2.0, -3.58]}>
          <boxGeometry args={[0.05, 2.4, 0.05]} />
          <meshStandardMaterial color={NEGRO} roughness={0.6} />
        </mesh>
      ))}
      {[1.0, 1.5, 2.0, 2.5, 3.0].map(y => (
        <mesh key={y} position={[-0.75, y, -3.58]}>
          <boxGeometry args={[0.4, 0.05, 0.05]} />
          <meshStandardMaterial color={NEGRO} roughness={0.6} />
        </mesh>
      ))}
      {/* pilotos traseros */}
      {[1, -1].map(l => (
        <mesh key={l} position={[l * 0.98, 1.15, -3.57]}>
          <boxGeometry args={[0.16, 0.3, 0.04]} />
          <meshBasicMaterial color="#a3242a" />
        </mesh>
      ))}
      {/* faldones negros con cofres bajo la célula */}
      {[1, -1].map(l => (
        <mesh key={l} position={[l * 1.1, 0.95, -0.6]}>
          <boxGeometry args={[0.14, 0.55, 1.6]} />
          <meshStandardMaterial color="#232325" roughness={0.8} />
        </mesh>
      ))}

      {/* ---------- techo de la célula ---------- */}
      {/* panel solar sobre soportes */}
      <mesh position={[0, 3.44, -1.6]}>
        <boxGeometry args={[1.6, 0.05, 2.3]} />
        <meshStandardMaterial color={SOLAR} metalness={0.6} roughness={0.25} />
      </mesh>
      {[[-0.6, -0.7], [0.6, -0.7], [-0.6, -2.5], [0.6, -2.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 3.38, z]}>
          <boxGeometry args={[0.06, 0.08, 0.06]} />
          <meshStandardMaterial color={PLATA} />
        </mesh>
      ))}
      {/* claraboya y baca trasera con travesaño lima (como la foto) */}
      <mesh position={[0, 3.4, 0.35]}>
        <boxGeometry args={[0.7, 0.12, 0.7]} />
        <meshStandardMaterial color="#d9dadc" roughness={0.5} />
      </mesh>
      {[1, -1].map(l => (
        <mesh key={l} position={[l * 1.05, 3.42, -3.1]}>
          <boxGeometry args={[0.07, 0.14, 0.8]} />
          <meshStandardMaterial color={NEGRO} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 3.48, -3.1]}>
        <boxGeometry args={[2.2, 0.07, 0.07]} />
        <meshStandardMaterial color={LIMA} roughness={0.5} />
      </mesh>
    </group>
  );
}
