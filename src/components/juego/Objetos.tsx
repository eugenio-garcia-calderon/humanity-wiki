// ============================================================================
// JUEGO VITAL — EL CATÁLOGO GRANDE (2026-08-19, fase 9, petición de Eugenio:
// «crea nuevos elementos de una ciudad y bosque para poder añadirlos, crea
// muchas decenas de objetos en alta calidad»).
//
// 44 objetos procedurales, todos con las texturas fotográficas de las fases
// 1-3 (madera, piedra, chapa, teja, ladrillo, follaje) y en escala real: un
// banco mide lo que mide un banco. Se plantan desde «Crear aquí», se arrastran
// y se eliminan como cualquier otra cosa del mundo.
//
// Están en un solo sitio a propósito: añadir el número 45 es escribir un
// `case` aquí y una línea en CATALOGO_PROPS. Nada más.
// ============================================================================
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mapasPBR } from './texturas';
import { MaterialAgua } from './Agua';
import { PALETA } from './paleta';
import { Aptera } from './Vehiculos';

const MADERA = (r = 1, r2 = 1) => mapasPBR('madera', r, r2);
const PIEDRA = (r = 1, r2 = 1) => mapasPBR('roca', r, r2);
const METAL = (r = 1, r2 = 1) => mapasPBR('chapa', r, r2);

/** Un poste: lo usan medio catálogo (señales, farolas, vallas…). */
function Poste({ x = 0, z = 0, alto = 2, grosor = 0.06, color }: {
  x?: number; z?: number; alto?: number; grosor?: number; color?: string;
}) {
  return (
    <mesh position={[x, alto / 2, z]} castShadow>
      <cylinderGeometry args={[grosor, grosor * 1.15, alto, 8]} />
      <meshStandardMaterial {...METAL(0.4, alto / 2)} color={color || '#4a5158'} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// CIUDAD
// ---------------------------------------------------------------------------
function Papelera() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.22, 0.84, 14, 1, true]} />
        <meshStandardMaterial {...METAL(1.5, 0.8)} color="#3f5a4a" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <torusGeometry args={[0.27, 0.03, 8, 18]} />
        <meshStandardMaterial color="#2b3a33" metalness={0.6} roughness={0.4} />
      </mesh>
      <Poste alto={0.35} grosor={0.05} />
    </group>
  );
}

function Semaforo() {
  return (
    <group>
      <Poste alto={3.2} grosor={0.075} />
      <mesh position={[0, 2.85, 0.16]} castShadow>
        <boxGeometry args={[0.28, 0.78, 0.24]} />
        <meshStandardMaterial color="#22282c" roughness={0.6} />
      </mesh>
      {[['#d94b3a', 0.24], ['#e8c34a', 0], ['#4fbf6a', -0.24]].map(([c, y]) => (
        <mesh key={String(y)} position={[0, 2.85 + Number(y), 0.29]}>
          <circleGeometry args={[0.085, 14]} />
          <meshBasicMaterial color={c as string} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Senal({ texto = 'stop' }: { texto?: string }) {
  return (
    <group>
      <Poste alto={2.2} grosor={0.045} />
      <mesh position={[0, 2.25, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.04, 8]} />
        <meshStandardMaterial color={texto === 'stop' ? '#b8302a' : '#2f5fa8'} roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.25, 0.025]}>
        <cylinderGeometry args={[0.27, 0.27, 0.01, 8]} />
        <meshBasicMaterial color="#f2f0ea" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Marquesina() {
  return (
    <group>
      {[-1.5, 1.5].map(x => <Poste key={x} x={x} z={-0.6} alto={2.5} grosor={0.06} />)}
      {[-1.5, 1.5].map(x => <Poste key={`f${x}`} x={x} z={0.6} alto={2.5} grosor={0.06} />)}
      {/* Techo */}
      <mesh position={[0, 2.56, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.12, 1.6]} />
        <meshStandardMaterial {...METAL(3, 1.4)} color="#5a6570" />
      </mesh>
      {/* Cristal del fondo */}
      <mesh position={[0, 1.35, -0.62]}>
        <boxGeometry args={[3.3, 1.9, 0.05]} />
        <meshStandardMaterial color="#9db9c8" roughness={0.08} metalness={0.4} transparent opacity={0.45} envMapIntensity={1.6} />
      </mesh>
      {/* Banco corrido */}
      <mesh position={[0, 0.48, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.1, 0.42]} />
        <meshStandardMaterial {...MADERA(3, 0.5)} />
      </mesh>
    </group>
  );
}

function Quiosco() {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 2.4, 2]} />
        <meshStandardMaterial {...MADERA(2.5, 2.5)} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[2.1, 0.75, 4]} />
        <meshStandardMaterial {...mapasPBR('teja', 2, 1)} />
      </mesh>
      {/* Mostrador abierto */}
      <mesh position={[0, 1.5, 1.02]}>
        <boxGeometry args={[1.9, 1, 0.06]} />
        <meshStandardMaterial color="#2a2f33" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.98, 1.16]} castShadow>
        <boxGeometry args={[2.1, 0.1, 0.4]} />
        <meshStandardMaterial {...MADERA(2, 0.5)} />
      </mesh>
    </group>
  );
}

function Hidrante() {
  return (
    <group>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.17, 0.76, 10]} />
        <meshStandardMaterial color="#c0392b" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <sphereGeometry args={[0.15, 12, 8]} />
        <meshStandardMaterial color="#c0392b" roughness={0.45} metalness={0.3} />
      </mesh>
      {[-1, 1].map(l => (
        <mesh key={l} position={[l * 0.18, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.14, 8]} />
          <meshStandardMaterial color="#a03228" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Contenedor({ color = '#3f7f4a' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.15, 1.05]} />
        <meshStandardMaterial {...METAL(1.5, 1)} color={color} />
      </mesh>
      <mesh position={[0, 1.24, 0]} castShadow>
        <boxGeometry args={[1.56, 0.12, 1.1]} />
        <meshStandardMaterial color="#2b3138" roughness={0.6} />
      </mesh>
      {[-0.6, 0.6].map(x => [-0.42, 0.42].map(z => (
        <mesh key={`${x},${z}`} position={[x, 0.08, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 10]} />
          <meshStandardMaterial color="#20252a" roughness={0.8} />
        </mesh>
      )))}
    </group>
  );
}

function Jardinera() {
  return (
    <group>
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 0.64, 0.7]} />
        <meshStandardMaterial {...PIEDRA(1.4, 0.7)} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.56]} />
        <meshStandardMaterial {...mapasPBR('tierra', 1.4, 0.7)} />
      </mesh>
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={x} position={[x, 0.88, (i % 2 - 0.5) * 0.16]} castShadow>
          <sphereGeometry args={[0.24, 10, 8]} />
          <meshStandardMaterial {...mapasPBR('follaje', 1.5, 1)} color={i === 1 ? '#7fa055' : '#6b9048'} />
        </mesh>
      ))}
    </group>
  );
}

function FuenteBeber() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.28, 1, 10]} />
        <meshStandardMaterial {...PIEDRA(1, 1)} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.24, 0.2, 0.12, 12]} />
        <meshStandardMaterial {...PIEDRA(1, 0.3)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.07, 0]}>
        <circleGeometry args={[0.18, 14]} />
        <MaterialAgua color="#5a9ec0" repetirX={1} repetirY={1} velocidad={1.4} />
      </mesh>
      <mesh position={[0, 1.22, 0.1]} rotation={[0.9, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 8]} />
        <meshStandardMaterial color="#b8912f" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Bolardo() {
  return (
    <group>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.72, 12]} />
        <meshStandardMaterial {...PIEDRA(0.6, 0.7)} />
      </mesh>
      <mesh position={[0, 0.74, 0]} castShadow>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial {...PIEDRA(0.4, 0.4)} />
      </mesh>
    </group>
  );
}

function MuroPiedra() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.1, 0.42]} />
        <meshStandardMaterial {...PIEDRA(3.2, 1.1)} />
      </mesh>
      <mesh position={[0, 1.14, 0]} castShadow>
        <boxGeometry args={[3.36, 0.1, 0.54]} />
        <meshStandardMaterial {...PIEDRA(3.4, 0.2)} />
      </mesh>
    </group>
  );
}

function CercaMadera() {
  return (
    <group>
      {[-1.5, -0.5, 0.5, 1.5].map(x => (
        <mesh key={x} position={[x, 0.6, 0]} castShadow>
          <boxGeometry args={[0.1, 1.2, 0.1]} />
          <meshStandardMaterial {...MADERA(0.3, 1.2)} />
        </mesh>
      ))}
      {[0.45, 0.9].map(y => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[3.4, 0.1, 0.06]} />
          <meshStandardMaterial {...MADERA(3.4, 0.2)} />
        </mesh>
      ))}
    </group>
  );
}

function Escalera() {
  return (
    <group>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[0, 0.11 + i * 0.22, -i * 0.42]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.22, 0.44]} />
          <meshStandardMaterial {...PIEDRA(2.4, 0.5)} />
        </mesh>
      ))}
    </group>
  );
}

function TorreAgua() {
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x * 0.9, 2.2, z * 0.9]} rotation={[z * 0.06, 0, -x * 0.06]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 4.4, 8]} />
          <meshStandardMaterial {...METAL(0.5, 4)} color="#6b7078" />
        </mesh>
      ))}
      <mesh position={[0, 5.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.35, 1.8, 16]} />
        <meshStandardMaterial {...METAL(4, 2)} color="#8a949c" />
      </mesh>
      <mesh position={[0, 6.15, 0]} castShadow>
        <coneGeometry args={[1.6, 0.6, 16]} />
        <meshStandardMaterial {...METAL(3, 1)} color="#5f6a72" />
      </mesh>
    </group>
  );
}

function PanelSolar() {
  return (
    <group>
      {[-0.7, 0.7].map(x => (
        <mesh key={x} position={[x, 0.5, 0.3]} rotation={[0.35, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.1, 8]} />
          <meshStandardMaterial color="#6b7078" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, 0]} rotation={[-0.62, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.07, 1.5]} />
        <meshStandardMaterial color="#1d2a45" metalness={0.75} roughness={0.15} envMapIntensity={1.8} />
      </mesh>
      <mesh position={[0, 0.96, 0.01]} rotation={[-0.62, 0, 0]}>
        <boxGeometry args={[2.45, 0.02, 1.55]} />
        <meshStandardMaterial color="#8f99a8" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Bicicletero() {
  return (
    <group>
      {[-0.8, -0.27, 0.27, 0.8].map(x => (
        <mesh key={x} position={[x, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.32, 0.035, 8, 14, Math.PI]} />
          <meshStandardMaterial color="#5a6570" metalness={0.65} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Buzon() {
  return (
    <group>
      <Poste alto={1.1} grosor={0.05} />
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.34]} />
        <meshStandardMaterial color="#c8a02a" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.5, 0.18]}>
        <boxGeometry args={[0.26, 0.05, 0.02]} />
        <meshStandardMaterial color="#2b2f33" />
      </mesh>
    </group>
  );
}

function RelojCalle() {
  return (
    <group>
      <Poste alto={3.4} grosor={0.08} />
      {[-1, 1].map(l => (
        <group key={l} position={[0, 3.6, l * 0.13]} rotation-y={l === 1 ? 0 : Math.PI}>
          <mesh castShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.1, 20]} />
            <meshStandardMaterial color="#2b3138" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 20]} />
            <meshBasicMaterial color="#f2ead6" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Estatua() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.7, 1.1]} />
        <meshStandardMaterial {...PIEDRA(1.2, 0.8)} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[0.85, 0.16, 0.85]} />
        <meshStandardMaterial {...PIEDRA(1, 0.3)} />
      </mesh>
      {/* Figura estilizada de bronce */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.75, 6, 12]} />
        <meshStandardMaterial color="#7a6a3a" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.19, 14, 10]} />
        <meshStandardMaterial color="#7a6a3a" metalness={0.75} roughness={0.35} />
      </mesh>
    </group>
  );
}

function MesaPicnic() {
  return (
    <group>
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.09, 0.9]} />
        <meshStandardMaterial {...MADERA(2, 1)} />
      </mesh>
      {[-0.75, 0.75].map(x => (
        <group key={x}>
          <mesh position={[x, 0.38, 0]} rotation={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.1, 0.76, 0.1]} />
            <meshStandardMaterial {...MADERA(0.3, 0.8)} />
          </mesh>
        </group>
      ))}
      {[-0.72, 0.72].map(z => (
        <mesh key={z} position={[0, 0.45, z]} castShadow receiveShadow>
          <boxGeometry args={[2, 0.07, 0.3]} />
          <meshStandardMaterial {...MADERA(2, 0.4)} />
        </mesh>
      ))}
    </group>
  );
}

function Columpio() {
  return (
    <group>
      {[-1.2, 1.2].map(x => (
        <group key={x}>
          <mesh position={[x, 1.1, -0.5]} rotation={[0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 2.4, 8]} />
            <meshStandardMaterial {...MADERA(0.4, 2.4)} />
          </mesh>
          <mesh position={[x, 1.1, 0.5]} rotation={[-0.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 2.4, 8]} />
            <meshStandardMaterial {...MADERA(0.4, 2.4)} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 2.6, 8]} />
        <meshStandardMaterial {...MADERA(2.6, 0.4)} />
      </mesh>
      {[-0.35, 0.35].map(x => (
        <mesh key={x} position={[x, 1.55, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.2, 5]} />
          <meshStandardMaterial color="#8a9099" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.8, 0.06, 0.28]} />
        <meshStandardMaterial {...MADERA(0.8, 0.3)} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// BOSQUE Y HUERTO
// ---------------------------------------------------------------------------
function TroncoCaido() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} rotation={[0, 0.3, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.36, 3.4, 10]} />
        <meshStandardMaterial {...mapasPBR('corteza', 3, 1.2)} />
      </mesh>
      <mesh position={[1.68, 0.3, 0.5]} rotation={[0, 0.3, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 10]} />
        <meshStandardMaterial color="#c9a878" roughness={0.85} />
      </mesh>
      {/* Musgo encima */}
      <mesh position={[0.2, 0.56, 0]} scale={[1.4, 0.25, 0.5]}>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial {...mapasPBR('follaje', 2, 1)} color="#6b8f4a" />
      </mesh>
    </group>
  );
}

function Tocon() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.55, 0.6, 12]} />
        <meshStandardMaterial {...mapasPBR('corteza', 1.6, 0.6)} />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.03, 12]} />
        <meshStandardMaterial color="#c2a077" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Setas() {
  const setas = useMemo(() => [
    { x: 0, z: 0, s: 1 }, { x: 0.22, z: 0.14, s: 0.72 }, { x: -0.18, z: 0.2, s: 0.85 },
    { x: 0.1, z: -0.24, s: 0.6 },
  ], []);
  return (
    <group>
      {setas.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]} scale={m.s}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 0.24, 8]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.26, 0]} castShadow>
            <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={i % 2 ? '#b8402e' : '#9a6b3f'} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Helecho() {
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.16, 0.42, Math.sin(a) * 0.16]}
            rotation={[Math.cos(a) * 0.5, -a, Math.sin(a) * 0.5]} castShadow>
            <boxGeometry args={[0.1, 0.85, 0.02]} />
            <meshStandardMaterial {...mapasPBR('follaje', 0.4, 1.2)} color="#4f7a3f" side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function Canas() {
  return (
    <group>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + i * 0.4;
        const r = 0.1 + (i % 3) * 0.12;
        const alto = 1.5 + (i % 4) * 0.4;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, alto / 2, 0]} rotation={[Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1]} castShadow>
              <cylinderGeometry args={[0.018, 0.026, alto, 5]} />
              <meshStandardMaterial color="#8a9a5a" roughness={0.8} />
            </mesh>
            <mesh position={[Math.cos(a) * 0.1, alto + 0.14, Math.sin(a) * 0.1]} castShadow>
              <capsuleGeometry args={[0.035, 0.2, 4, 6]} />
              <meshStandardMaterial color="#a89060" roughness={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Matorral() {
  return (
    <group>
      {[[0, 0, 1], [0.4, 0.2, 0.7], [-0.35, 0.25, 0.75], [0.1, -0.35, 0.6]].map(([x, z, s], i) => (
        <mesh key={i} position={[x, 0.32 * s, z]} scale={[s, s * 0.75, s]} castShadow receiveShadow>
          <sphereGeometry args={[0.55, 9, 7]} />
          <meshStandardMaterial {...mapasPBR('follaje', 1.6, 1.1)} color={i % 2 ? '#5f7a45' : '#6f8a52'} />
        </mesh>
      ))}
    </group>
  );
}

function RocaGrande() {
  const geo = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(1, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i));
      const d = 1 + Math.sin(v.x * 3.1 + v.y * 2.7) * Math.cos(v.z * 3.3) * 0.22;
      v.normalize().multiplyScalar(d);
      p.setXYZ(i, v.x, v.y * 0.78, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, 0.95, 0]} scale={1.4} castShadow receiveShadow>
      <meshStandardMaterial {...PIEDRA(2, 2)} />
    </mesh>
  );
}

function Charca() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[2.4, 26]} />
        <meshStandardMaterial {...mapasPBR('tierra', 3)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <circleGeometry args={[2, 26]} />
        <MaterialAgua color="#4a7f8c" repetirX={2} repetirY={2} velocidad={0.4} />
      </mesh>
      {[0.6, 2.3, 4.1].map((a, i) => (
        <mesh key={a} position={[Math.cos(a) * 1.7, 0.12, Math.sin(a) * 1.7]} castShadow>
          <sphereGeometry args={[0.22 + i * 0.05, 8, 6]} />
          <meshStandardMaterial {...PIEDRA(0.6, 0.6)} />
        </mesh>
      ))}
    </group>
  );
}

function PuenteTabla() {
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, 0.32, -1.6 + i * 0.4]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.07, 0.34]} />
          <meshStandardMaterial {...MADERA(1.5, 0.4)} />
        </mesh>
      ))}
      {[-0.72, 0.72].map(x => (
        <mesh key={x} position={[x, 0.15, 0]} castShadow>
          <boxGeometry args={[0.12, 0.3, 3.7]} />
          <meshStandardMaterial {...MADERA(0.3, 3.7)} />
        </mesh>
      ))}
      {[-0.72, 0.72].map(x => [-1.6, 1.6].map(z => (
        <mesh key={`${x}${z}`} position={[x, 0.75, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.9, 7]} />
          <meshStandardMaterial {...MADERA(0.3, 0.9)} />
        </mesh>
      )))}
      {[-0.72, 0.72].map(x => (
        <mesh key={`b${x}`} position={[x, 1.16, 0]} castShadow>
          <boxGeometry args={[0.07, 0.07, 3.4]} />
          <meshStandardMaterial {...MADERA(0.3, 3.4)} />
        </mesh>
      ))}
    </group>
  );
}

function Hoguera() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[1.1, 20]} />
        <meshStandardMaterial {...mapasPBR('grava', 1.6)} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, 0.11, Math.sin(a) * 0.95]} castShadow>
            <sphereGeometry args={[0.17, 8, 6]} />
            <meshStandardMaterial {...PIEDRA(0.5, 0.5)} />
          </mesh>
        );
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.24, 0.34, Math.sin(a) * 0.24]}
            rotation={[Math.cos(a) * 0.55, -a, Math.sin(a) * 0.55]} castShadow>
            <cylinderGeometry args={[0.075, 0.09, 0.95, 6]} />
            <meshStandardMaterial {...mapasPBR('corteza', 0.5, 1)} />
          </mesh>
        );
      })}
      {/* Las brasas del centro, siempre encendidas */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshBasicMaterial color="#ff7a2a" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#ff8c3a" intensity={5} distance={9} />
    </group>
  );
}

function Tienda() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.15, 2.4, 3, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#3f6b52" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2, 2.4]} />
        <meshStandardMaterial color="#2b4a3a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Colmena() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.16, 0.5]} />
        <meshStandardMaterial {...MADERA(0.6, 0.3)} />
      </mesh>
      {[0.32, 0.62, 0.92].map(y => (
        <mesh key={y} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.28, 0.44]} />
          <meshStandardMaterial {...MADERA(0.6, 0.35)} color="#e8d9b0" />
        </mesh>
      ))}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.64, 0.08, 0.52]} />
        <meshStandardMaterial {...MADERA(0.7, 0.2)} color="#c9b78a" />
      </mesh>
      <mesh position={[0, 0.22, 0.26]}>
        <boxGeometry args={[0.3, 0.04, 0.02]} />
        <meshStandardMaterial color="#3a2f22" />
      </mesh>
    </group>
  );
}

function Lena() {
  return (
    <group>
      {Array.from({ length: 12 }, (_, i) => {
        const fila = Math.floor(i / 4);
        const col = i % 4;
        return (
          <mesh key={i} position={[-0.45 + col * 0.3, 0.16 + fila * 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.15, 1.1, 8]} />
            <meshStandardMaterial {...mapasPBR('corteza', 1, 0.5)} />
          </mesh>
        );
      })}
    </group>
  );
}

function Espantapajaros() {
  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 1.9, 7]} />
        <meshStandardMaterial {...MADERA(0.3, 1.9)} />
      </mesh>
      <mesh position={[0, 1.45, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.5, 7]} />
        <meshStandardMaterial {...MADERA(1.5, 0.2)} />
      </mesh>
      {/* Ropa vieja */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[0.62, 0.72, 0.3]} />
        <meshStandardMaterial color="#8a6b3f" roughness={0.9} />
      </mesh>
      {/* Cabeza de saco con sombrero */}
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#d9c48a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.98, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.03, 14]} />
        <meshStandardMaterial color="#7a5f34" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.08, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.19, 0.2, 12]} />
        <meshStandardMaterial color="#7a5f34" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Bancal() {
  return (
    <group>
      {/* Cajón de madera */}
      {[[0, 1.1, 0, 2.2], [0, -1.1, 0, 2.2], [1.05, 0, Math.PI / 2, 2.2], [-1.05, 0, Math.PI / 2, 2.2]].map(([x, z, r, l], i) => (
        <mesh key={i} position={[x, 0.22, z]} rotation-y={r} castShadow receiveShadow>
          <boxGeometry args={[l, 0.44, 0.08]} />
          <meshStandardMaterial {...MADERA(2, 0.5)} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]} receiveShadow>
        <planeGeometry args={[2.1, 2.1]} />
        <meshStandardMaterial {...mapasPBR('tierra', 2.5, 2.5)} />
      </mesh>
      {/* Las hileras de hortaliza */}
      {[-0.65, 0, 0.65].map(z => (
        <mesh key={z} position={[0, 0.56, z]} castShadow>
          <boxGeometry args={[1.9, 0.24, 0.34]} />
          <meshStandardMaterial {...mapasPBR('follaje', 2, 0.6)} color="#5f8a45" />
        </mesh>
      ))}
    </group>
  );
}

function Compost() {
  return (
    <group>
      {[[0, 0.6, 0], [0, -0.6, 0], [0.6, 0, Math.PI / 2], [-0.6, 0, Math.PI / 2]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.42, z]} rotation-y={r} castShadow receiveShadow>
          <boxGeometry args={[1.25, 0.84, 0.07]} />
          <meshStandardMaterial {...MADERA(1.2, 0.9)} />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 0]} scale={[0.55, 0.2, 0.55]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial {...mapasPBR('tierra', 1.5, 1)} />
      </mesh>
    </group>
  );
}

function Gallinero() {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 1.1, 1.3]} />
        <meshStandardMaterial {...MADERA(2, 1.3)} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.9, 0.1, 1.5]} />
        <meshStandardMaterial {...mapasPBR('teja', 2, 1.5)} />
      </mesh>
      {/* Rampa y puerta */}
      <mesh position={[0, 0.28, 0.95]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.9]} />
        <meshStandardMaterial {...MADERA(0.5, 0.9)} />
      </mesh>
      <mesh position={[0, 0.55, 0.66]}>
        <boxGeometry args={[0.42, 0.5, 0.03]} />
        <meshStandardMaterial color="#2b2118" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Invernadero() {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[2.6, 2.2, 3.4]} />
        <meshStandardMaterial color="#c8e0e8" roughness={0.06} metalness={0.15} transparent opacity={0.32} envMapIntensity={1.7} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation-y={Math.PI / 2} castShadow>
        <cylinderGeometry args={[1.45, 1.45, 2.6, 3, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#c8e0e8" roughness={0.06} metalness={0.15} transparent opacity={0.32} side={THREE.DoubleSide} />
      </mesh>
      {/* Estructura */}
      {[-1.3, 1.3].map(x => [-1.7, 1.7].map(z => (
        <mesh key={`${x}${z}`} position={[x, 1.1, z]} castShadow>
          <boxGeometry args={[0.08, 2.2, 0.08]} />
          <meshStandardMaterial color="#e8e4d8" roughness={0.5} />
        </mesh>
      )))}
      {/* Bancadas de dentro */}
      {[-0.8, 0.8].map(x => (
        <mesh key={x} position={[x, 0.6, 0]} castShadow>
          <boxGeometry args={[0.7, 0.07, 3]} />
          <meshStandardMaterial {...MADERA(0.7, 3)} />
        </mesh>
      ))}
    </group>
  );
}

function MolinoViento() {
  return (
    <group>
      <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.55, 3.8, 10]} />
        <meshStandardMaterial {...METAL(1, 3.8)} color="#8a949c" />
      </mesh>
      <mesh position={[0, 3.9, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.3, 10]} />
        <meshStandardMaterial color="#5a6570" metalness={0.6} roughness={0.4} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 3.9 + Math.sin(a) * 0.55, 0.2]} rotation={[0, 0, a]} castShadow>
            <boxGeometry args={[0.9, 0.16, 0.03]} />
            <meshStandardMaterial color="#d9d4c4" roughness={0.55} metalness={0.2} />
          </mesh>
        );
      })}
      {/* La veleta de cola */}
      <mesh position={[0, 3.9, -0.6]} castShadow>
        <boxGeometry args={[0.03, 0.5, 0.7]} />
        <meshStandardMaterial color="#d9d4c4" roughness={0.55} />
      </mesh>
    </group>
  );
}

function Deposito() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 0.9, 1.8, 18]} />
        <meshStandardMaterial {...METAL(3, 1.8)} color="#5f7a6b" />
      </mesh>
      <mesh position={[0, 1.86, 0]} castShadow>
        <cylinderGeometry args={[0.94, 0.9, 0.14, 18]} />
        <meshStandardMaterial color="#3f5a4d" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.9, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 8]} />
        <meshStandardMaterial color="#8a9099" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Comedero() {
  return (
    <group>
      <Poste alto={1.6} grosor={0.05} color="#7a5f34" />
      <mesh position={[0, 1.68, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.07, 0.5]} />
        <meshStandardMaterial {...MADERA(0.5, 0.5)} />
      </mesh>
      <mesh position={[0, 1.95, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[0.45, 0.35, 4]} />
        <meshStandardMaterial {...mapasPBR('teja', 0.6, 0.4)} />
      </mesh>
    </group>
  );
}

function Pasarela() {
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, i * 0.4]} position={[(i % 2 - 0.5) * 0.24, 0.055, -1.5 + i * 0.6]} receiveShadow>
          <circleGeometry args={[0.36, 8]} />
          <meshStandardMaterial {...PIEDRA(0.6, 0.6)} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * TU APTERA, APARCADA (2026-08-19, petición de Eugenio: «hazme una réplica de
 * mi vehículo volador y déjalo aparcado como el camión como un objeto que no
 * se mueve»). Es exactamente la misma nave que pilotas —el mismo componente,
 * no una copia que se quedaría desfasada al retocar el vehículo—, pero con las
 * alas plegadas y los rotores quietos.
 */
function ApteraAparcada() {
  // La altura de vuelo va por ref porque el vehículo la anima cada fotograma;
  // aquí es una constante a 0 que nadie toca.
  const suelo = useRef(0);
  return (
    <group scale={0.9}>
      <Aptera alturaVuelo={suelo} avanzando={false} aparcada />
    </group>
  );
}

/** Todos los objetos del catálogo, por nombre. */
export function ObjetoNuevo({ modelo }: { modelo: string }) {
  switch (modelo) {
    case 'aptera': return <ApteraAparcada />;
    // Ciudad
    case 'papelera': return <Papelera />;
    case 'semaforo': return <Semaforo />;
    case 'senal': return <Senal />;
    case 'senalazul': return <Senal texto="info" />;
    case 'marquesina': return <Marquesina />;
    case 'quiosco': return <Quiosco />;
    case 'hidrante': return <Hidrante />;
    case 'contenedor': return <Contenedor />;
    case 'contenedorazul': return <Contenedor color="#2f5fa8" />;
    case 'contenedoramarillo': return <Contenedor color="#c9a02a" />;
    case 'jardinera': return <Jardinera />;
    case 'fuentebeber': return <FuenteBeber />;
    case 'bolardo': return <Bolardo />;
    case 'muro': return <MuroPiedra />;
    case 'cerca': return <CercaMadera />;
    case 'escalera': return <Escalera />;
    case 'torreagua': return <TorreAgua />;
    case 'panelsolar': return <PanelSolar />;
    case 'bicicletero': return <Bicicletero />;
    case 'buzon': return <Buzon />;
    case 'reloj': return <RelojCalle />;
    case 'estatua': return <Estatua />;
    case 'mesa': return <MesaPicnic />;
    case 'columpio': return <Columpio />;
    // Bosque y huerto
    case 'tronco': return <TroncoCaido />;
    case 'tocon': return <Tocon />;
    case 'setas': return <Setas />;
    case 'helecho': return <Helecho />;
    case 'canas': return <Canas />;
    case 'matorral': return <Matorral />;
    case 'rocagrande': return <RocaGrande />;
    case 'charca': return <Charca />;
    case 'puentetabla': return <PuenteTabla />;
    case 'hoguera': return <Hoguera />;
    case 'tienda': return <Tienda />;
    case 'colmena': return <Colmena />;
    case 'lena': return <Lena />;
    case 'espantapajaros': return <Espantapajaros />;
    case 'bancal': return <Bancal />;
    case 'compost': return <Compost />;
    case 'gallinero': return <Gallinero />;
    case 'invernadero': return <Invernadero />;
    case 'molino': return <MolinoViento />;
    case 'deposito': return <Deposito />;
    case 'comedero': return <Comedero />;
    case 'pasarela': return <Pasarela />;
    default: return null;
  }
}

/** ¿Este modelo es uno de los nuevos? Lo pregunta el editor. */
export function esObjetoNuevo(modelo: string | null | undefined): boolean {
  return !!modelo && RADIOS_OBJETO[modelo] !== undefined;
}

/** Radio de choque de cada uno, en metros. 0 = se puede atravesar. */
export const RADIOS_OBJETO: Record<string, number> = {
  papelera: 0.4, semaforo: 0.3, senal: 0.25, senalazul: 0.25, marquesina: 2, quiosco: 1.7,
  hidrante: 0.3, contenedor: 1, contenedorazul: 1, contenedoramarillo: 1, jardinera: 0.9,
  fuentebeber: 0.4, bolardo: 0.2, muro: 1.7, cerca: 1.7, escalera: 1.4, torreagua: 1.6,
  panelsolar: 1.3, bicicletero: 1, buzon: 0.35, reloj: 0.3, estatua: 0.8, mesa: 1.2,
  columpio: 1.5,
  tronco: 1.7, tocon: 0.6, setas: 0, helecho: 0, canas: 0.5, matorral: 0.9,
  rocagrande: 1.5, charca: 2.2, puentetabla: 1, hoguera: 1.1, tienda: 1.3, colmena: 0.4,
  lena: 0.7, espantapajaros: 0.35, bancal: 1.2, compost: 0.75, gallinero: 1.1,
  invernadero: 1.9, molino: 0.7, deposito: 1, comedero: 0.3, pasarela: 0,
};

void PALETA;
