// ============================================================================
// JUEGO VITAL — the personal robot companion (the "Pikachu"). Hovers behind
// the player, always faces them, and reports its distance so the page can
// offer the "talk" interaction — which focuses the REAL AI assistant bar.
// ============================================================================
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Medidas } from './tipos';
import { PALETA } from './paleta';

const tmpObjetivo = new THREE.Vector3();

export function Robot({ jugadorPos, medidas }: {
  jugadorPos: THREE.Vector3;
  medidas: React.MutableRefObject<Medidas>;
}) {
  const grupo = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_estado, dtBruto) => {
    const g = grupo.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.05);
    t.current += dt;

    // trail the player at a fixed offset, hovering
    tmpObjetivo.set(jugadorPos.x + 2.6, 0, jugadorPos.z + 2.3);
    g.position.lerp(tmpObjetivo, 1 - Math.exp(-3.2 * dt));
    g.position.y = 0.62 + Math.sin(t.current * 2.2) * 0.13;

    // always face the player
    const deseo = Math.atan2(jugadorPos.x - g.position.x, jugadorPos.z - g.position.z);
    const dif = Math.atan2(Math.sin(deseo - g.rotation.y), Math.cos(deseo - g.rotation.y));
    g.rotation.y += dif * (1 - Math.exp(-6 * dt));

    medidas.current.robot = g.position.distanceTo(jugadorPos);
  });

  return (
    <group ref={grupo} position={[3, 0.6, 21]}>
      {/* torso */}
      <mesh castShadow position={[0, 0.95, 0]}>
        <boxGeometry args={[0.64, 0.8, 0.42]} />
        <meshStandardMaterial color={PALETA.robotCuerpo} />
      </mesh>
      {/* chest light */}
      <mesh position={[0, 1.02, 0.22]}>
        <boxGeometry args={[0.2, 0.2, 0.04]} />
        <meshStandardMaterial color={PALETA.robotLuz} emissive={PALETA.robotLuz} emissiveIntensity={1.6} />
      </mesh>
      {/* arms */}
      {[-0.44, 0.44].map((ax, i) => (
        <mesh key={i} castShadow position={[ax, 0.92, 0]}>
          <capsuleGeometry args={[0.09, 0.4, 4, 8]} />
          <meshStandardMaterial color={PALETA.robotDetalle} />
        </mesh>
      ))}
      {/* head */}
      <mesh castShadow position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.3, 16, 14]} />
        <meshStandardMaterial color={PALETA.robotCuerpo} />
      </mesh>
      {/* visor eyes */}
      <mesh position={[0, 1.64, 0.24]}>
        <boxGeometry args={[0.38, 0.13, 0.08]} />
        <meshStandardMaterial color={PALETA.robotDetalle} emissive={PALETA.robotLuz} emissiveIntensity={0.9} />
      </mesh>
      {/* antenna */}
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.24, 6]} />
        <meshStandardMaterial color={PALETA.robotDetalle} />
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={PALETA.robotLuz} emissive={PALETA.robotLuz} emissiveIntensity={2} />
      </mesh>
      {/* hover glow */}
      <pointLight color={PALETA.robotLuz} intensity={1.2} distance={3.5} position={[0, 0.3, 0]} />
    </group>
  );
}
