// ============================================================================
// JUEGO VITAL — LAS SEIS SENDAS (2026-08-19, petición de Eugenio: «en la plaza
// pon 6 caminos adoquinados... y en cada uno de ellos pon un cartel con el
// área al que te llevan, y que te lleven a una plaza secundaria de esa
// temática»).
//
// Aquí se dibuja lo que `mapa.ts` decide: el empedrado de cada senda, su
// cartel de madera a la salida de la plaza y la plaza secundaria del final,
// cada una con su elemento propio (pérgola, estanque, banco corrido…).
// ============================================================================
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { SENDAS, PLAZA_R, PLAZA_SEC_R, finDeSenda, type Senda } from './mapa';
import { mapasPBR } from './texturas';
import { MaterialAgua } from './Agua';

/** El empedrado de una senda: un rectángulo girado, del centro hacia fuera. */
function Empedrado({ s }: { s: Senda }) {
  const largo = s.largo - PLAZA_R + 2;
  const medio = PLAZA_R - 2 + largo / 2;
  return (
    <mesh
      position={[Math.cos(s.ang) * medio, 0.05, Math.sin(s.ang) * medio]}
      rotation={[-Math.PI / 2, 0, -s.ang]}
      receiveShadow
    >
      <planeGeometry args={[largo, s.ancho]} />
      <meshStandardMaterial {...mapasPBR('adoquin', largo / 2.4, s.ancho / 2.4)} />
    </mesh>
  );
}

/**
 * El cartel de madera de una senda: dos postes, tablón, el nombre del área a
 * la que lleva y una línea de qué encontrarás. Va a la salida de la plaza.
 */
export function Cartel({ s, texto }: { s: Senda; texto?: string }) {
  // El título es el que le haya puesto el jugador; si no, el de fábrica.
  const titulo = (texto || '').trim() || s.tema;
  return (
    <group>
      {/* Los dos postes */}
      {[-0.95, 0.95].map(x => (
        <mesh key={x} position={[x, 1.05, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.09, 2.1, 7]} />
          <meshStandardMaterial {...mapasPBR('madera', 0.4, 1.6)} />
        </mesh>
      ))}
      {/* El tablón */}
      <mesh position={[0, 1.92, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.86, 0.09]} />
        <meshStandardMaterial {...mapasPBR('madera', 2, 0.8)} />
      </mesh>
      {/* Un filete del color del tema, para reconocerla de lejos */}
      <mesh position={[0, 1.48, 0.05]}>
        <boxGeometry args={[2.5, 0.1, 0.02]} />
        <meshBasicMaterial color={s.color} toneMapped={false} />
      </mesh>
      {/* El texto, en las DOS caras: se lee vengas por donde vengas */}
      {[0.055, -0.055].map((z, i) => (
        <group key={z} position={[0, 0, z]} rotation-y={i === 0 ? 0 : Math.PI}>
          <Text position={[0, 2.06, 0]} fontSize={0.235} maxWidth={2.3} color="#fdf6e6"
            anchorX="center" anchorY="middle" textAlign="center"
            outlineWidth={0.012} outlineColor="#3a2a18">
            {titulo}
          </Text>
          <Text position={[0, 1.72, 0]} fontSize={0.145} maxWidth={2.3} color="#d9c9a8"
            anchorX="center" anchorY="middle" textAlign="center">
            {s.pie}
          </Text>
        </group>
      ))}
      {/* La flecha que apunta al camino */}
      <mesh position={[0, 1.92, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.13, 0.3, 3]} />
        <meshBasicMaterial color={s.color} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** El elemento propio de cada plaza secundaria: lo que la hace ser ella. */
function CorazonDePlaza({ s }: { s: Senda }) {
  switch (s.id) {
    // Huerto: una pérgola de madera con la parra encima.
    case 'huerto':
      return (
        <group>
          {[[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].map(([x, z]) => (
            <mesh key={`${x},${z}`} position={[x, 1.25, z]} castShadow>
              <boxGeometry args={[0.18, 2.5, 0.18]} />
              <meshStandardMaterial {...mapasPBR('madera', 0.3, 1.6)} />
            </mesh>
          ))}
          {[-2.2, 0, 2.2].map(z => (
            <mesh key={z} position={[0, 2.52, z]} castShadow>
              <boxGeometry args={[4.9, 0.12, 0.16]} />
              <meshStandardMaterial {...mapasPBR('madera', 3, 0.3)} />
            </mesh>
          ))}
          {/* La parra por encima */}
          <mesh position={[0, 2.75, 0]} scale={[2.6, 0.5, 2.6]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial {...mapasPBR('follaje', 3, 2)} color="#6f9a48" />
          </mesh>
        </group>
      );
    // Agua: un estanque redondo (la fuente vieja se muda aquí, en mapa.ts).
    case 'agua':
      return (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[4.4, 5.6, 40]} />
            <meshStandardMaterial {...mapasPBR('roca', 8, 1)} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
            <circleGeometry args={[4.5, 36]} />
            <MaterialAgua color="#4a86a6" repetirX={4} repetirY={4} velocidad={0.6} />
          </mesh>
        </group>
      );
    // Talleres: un yunque sobre su cepo y un banco de trabajo.
    case 'talleres':
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.5, 0.8, 10]} />
            <meshStandardMaterial {...mapasPBR('madera', 0.6, 0.5)} />
          </mesh>
          <mesh position={[0, 0.98, 0]} castShadow>
            <boxGeometry args={[1.05, 0.36, 0.42]} />
            <meshStandardMaterial color="#3a3f45" roughness={0.45} metalness={0.75} />
          </mesh>
          <mesh position={[0.72, 1.06, 0]} rotation={[0, 0, 0.35]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.34, 8]} />
            <meshStandardMaterial color="#3a3f45" roughness={0.45} metalness={0.75} />
          </mesh>
        </group>
      );
    // Encuentro: un corro de bancos de piedra alrededor de una hoguera.
    case 'encuentro':
      return (
        <group>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 3.4, 0.28, Math.sin(a) * 3.4]} rotation-y={-a} castShadow receiveShadow>
                <boxGeometry args={[0.7, 0.56, 2.1]} />
                <meshStandardMaterial {...mapasPBR('roca', 1, 2)} />
              </mesh>
            );
          })}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
            <circleGeometry args={[1.5, 24]} />
            <meshStandardMaterial {...mapasPBR('grava', 2)} />
          </mesh>
          {/* Los leños de la hoguera */}
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3]}
                rotation={[Math.cos(a) * 0.5, -a, Math.sin(a) * 0.5]} castShadow>
                <cylinderGeometry args={[0.09, 0.11, 1.1, 6]} />
                <meshStandardMaterial {...mapasPBR('corteza', 0.5, 1)} />
              </mesh>
            );
          })}
        </group>
      );
    // Saber: un atril de lectura bajo un arco de piedra.
    case 'saber':
      return (
        <group>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.24, 2.2, 8]} />
            <meshStandardMaterial {...mapasPBR('roca', 0.8, 1.4)} />
          </mesh>
          <mesh position={[0, 2.28, 0]} rotation={[-0.5, 0, 0]} castShadow>
            <boxGeometry args={[1.35, 0.09, 0.95]} />
            <meshStandardMaterial {...mapasPBR('madera', 1, 0.8)} />
          </mesh>
          {/* El libro abierto encima del atril */}
          <mesh position={[0, 2.37, 0.03]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[1.05, 0.06, 0.72]} />
            <meshStandardMaterial color="#f2ead6" roughness={0.85} />
          </mesh>
        </group>
      );
    // Proyectos: un hito de piedra que marca la entrada al distrito.
    default:
      return (
        <group>
          <mesh position={[0, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.75, 2.7, 6]} />
            <meshStandardMaterial {...mapasPBR('roca', 1.4, 2)} />
          </mesh>
          <mesh position={[0, 2.85, 0]} castShadow>
            <sphereGeometry args={[0.42, 14, 10]} />
            <meshStandardMaterial color={s.color} roughness={0.25} metalness={0.35} envMapIntensity={1.5} />
          </mesh>
        </group>
      );
  }
}

/** La plaza secundaria del final de una senda. */
function PlazaSecundaria({ s }: { s: Senda }) {
  const f = finDeSenda(s);
  return (
    <group position={[f.x, 0, f.z]}>
      {/* El empedrado */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[PLAZA_SEC_R, 40]} />
        <meshStandardMaterial {...mapasPBR('adoquin', (PLAZA_SEC_R * 2) / 2.4)} />
      </mesh>
      {/* El aro del color del tema */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[PLAZA_SEC_R - 0.55, PLAZA_SEC_R - 0.2, 44]} />
        <meshBasicMaterial color={s.color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <CorazonDePlaza s={s} />
      {/* El nombre del área, flotando sobre la plaza */}
      <Billboard position={[0, 4.6, 0]}>
        <Text fontSize={0.62} maxWidth={13} color="#ffffff" anchorX="center" anchorY="middle"
          textAlign="center" outlineWidth={0.028} outlineColor="#1d3a24">
          {s.tema}
        </Text>
      </Billboard>
    </group>
  );
}

/** Todo lo de las seis sendas, junto. */
export function Sendas() {
  return (
    <group>
      {SENDAS.map(s => (
        <group key={s.id}>
          <Empedrado s={s} />
          {/* El CARTEL ya no se dibuja aquí: desde 2026-08-19 es una pieza del
              pueblo (`cartel:<senda>`), para que se pueda mover, quitar y
              renombrar como cualquier otra cosa. Lo pinta `Aldea.tsx`. */}
          <PlazaSecundaria s={s} />
        </group>
      ))}
    </group>
  );
}
