// ============================================================================
// JUEGO VITAL — third-person character. Reads the shared input ref (keyboard
// or touch joystick), moves with smoothed acceleration, faces its heading,
// and drags the follow camera and the shadow-casting light along with it.
// ============================================================================
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EntradaMando } from './tipos';
import { PALETA } from './paleta';

const VEL_MAX = 8;           // m/s — brisk walk, the map is 1 km across
const LIMITE = 530;          // keep the player inside the 118 ha

const tmpObjetivo = new THREE.Vector3();
const tmpCam = new THREE.Vector3();
const tmpMira = new THREE.Vector3();

/** Algo sólido del mundo: no se atraviesa, y chocar con ello «llama». */
export interface Obstaculo { id: string; x: number; z: number; radio: number }

export function Personaje({ entrada, jugadorPos, luzRef, obstaculos, onChoque }: {
  entrada: React.MutableRefObject<EntradaMando>;
  jugadorPos: THREE.Vector3;
  luzRef: React.RefObject<THREE.DirectionalLight | null>;
  obstaculos: React.MutableRefObject<Obstaculo[]>;
  onChoque: (id: string) => void;
}) {
  const grupo = useRef<THREE.Group>(null);
  const vel = useRef(new THREE.Vector3());
  const rumbo = useRef(0);
  const t = useRef(0);
  // Con quién estás chocando AHORA: el aviso salta una vez por encontronazo,
  // no cada fotograma mientras sigas pegado a él.
  const tocando = useRef<string | null>(null);

  useFrame((estado, dtBruto) => {
    const g = grupo.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.05); // tab-switch spikes must not teleport
    t.current += dt;

    // --- movement (world axes: fixed-angle camera makes screen == world)
    tmpObjetivo.set(entrada.current.x, 0, entrada.current.z);
    if (tmpObjetivo.lengthSq() > 1) tmpObjetivo.normalize();
    tmpObjetivo.multiplyScalar(VEL_MAX);
    vel.current.lerp(tmpObjetivo, 1 - Math.exp(-10 * dt));
    g.position.addScaledVector(vel.current, dt);
    g.position.x = THREE.MathUtils.clamp(g.position.x, -LIMITE, LIMITE);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -LIMITE, LIMITE);

    // --- Colisión: a la gente y a los edificios no se les atraviesa.
    // Al tocarlos te quedas fuera de su radio y se avisa a la página, que
    // abre su chat: chocarte con un amigo es empezar a hablar con él.
    let choque: string | null = null;
    for (const o of obstaculos.current) {
      const dx = g.position.x - o.x;
      const dz = g.position.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d >= o.radio) continue;
      // Empujón hacia fuera justo al borde (si cayó en el centro exacto, se
      // sale hacia atrás para no dividir por cero).
      const nx = d > 0.001 ? dx / d : 0;
      const nz = d > 0.001 ? dz / d : 1;
      g.position.x = o.x + nx * o.radio;
      g.position.z = o.z + nz * o.radio;
      vel.current.multiplyScalar(0.2);
      choque = o.id;
    }
    if (choque !== tocando.current) {
      tocando.current = choque;
      if (choque) onChoque(choque);
    }

    const moviendo = vel.current.lengthSq() > 0.4;
    if (moviendo) {
      const deseo = Math.atan2(vel.current.x, vel.current.z);
      const dif = Math.atan2(Math.sin(deseo - rumbo.current), Math.cos(deseo - rumbo.current));
      rumbo.current += dif * (1 - Math.exp(-12 * dt));
      g.rotation.y = rumbo.current;
    }
    g.position.y = moviendo ? Math.abs(Math.sin(t.current * 9)) * 0.12 : 0;
    jugadorPos.copy(g.position);

    // --- follow camera (fixed offset, smoothed)
    const cam = estado.camera;
    tmpCam.set(g.position.x, g.position.y + 11, g.position.z + 15);
    cam.position.lerp(tmpCam, 1 - Math.exp(-4 * dt));
    tmpMira.set(g.position.x, g.position.y + 1.6, g.position.z);
    cam.lookAt(tmpMira);

    // --- the shadow camera is small (sharp shadows): it must travel with us
    const luz = luzRef.current;
    if (luz) {
      luz.position.set(g.position.x + 60, 95, g.position.z - 45);
      luz.target.position.copy(g.position);
      luz.target.updateMatrixWorld();
    }
  });

  return (
    // Spawn on the south path at the plaza edge: open view over the fountain,
    // no house blocking the camera.
    <group ref={grupo} position={[0, 0, 17]}>
      {/* legs */}
      {[-0.15, 0.15].map((lx, i) => (
        <mesh key={i} castShadow position={[lx, 0.3, 0]}>
          <boxGeometry args={[0.22, 0.6, 0.26]} />
          <meshStandardMaterial color={PALETA.pantalon} />
        </mesh>
      ))}
      {/* torso */}
      <mesh castShadow position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.42, 0.7, 6, 14]} />
        <meshStandardMaterial color={PALETA.ropa} />
      </mesh>
      {/* arms */}
      {[-0.55, 0.55].map((ax, i) => (
        <mesh key={i} castShadow position={[ax, 1.05, 0]} rotation-z={ax > 0 ? -0.15 : 0.15}>
          <capsuleGeometry args={[0.13, 0.55, 4, 8]} />
          <meshStandardMaterial color={PALETA.ropa} />
        </mesh>
      ))}
      {/* head + hair */}
      <mesh castShadow position={[0, 1.98, 0]}>
        <sphereGeometry args={[0.35, 16, 14]} />
        <meshStandardMaterial color={PALETA.piel} />
      </mesh>
      <mesh position={[0, 2.14, -0.06]} scale={[1, 0.72, 1]}>
        <sphereGeometry args={[0.36, 16, 14]} />
        <meshStandardMaterial color={PALETA.pelo} />
      </mesh>
    </group>
  );
}
