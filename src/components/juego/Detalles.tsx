// ============================================================================
// JUEGO VITAL — el pueblo por dentro (2026-08-18, petición de Eugenio:
// «añade más detalles a todos los objetos y elementos»).
//
// Todo procedural y con la misma semilla que la aldea: bancos y farolas en la
// plaza, puestos de mercado con toldos, pozo, carro, vallas, setos, huertos,
// tendederos, humo saliendo de las chimeneas y ovejas pastando. Sin descargas
// ni dependencias nuevas — el estilo se mantiene coherente porque todo sale
// de la misma paleta.
// ============================================================================
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETA, crearAzar } from './paleta';
import { mapasPBR } from './texturas';

// ---------------------------------------------------------------------------
export function Banco({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[2.2, 0.12, 0.6]} />
        <meshStandardMaterial {...mapasPBR('madera', 2, 0.6)} color={PALETA.maderaBanco} />
      </mesh>
      <mesh castShadow position={[0, 0.82, -0.26]} rotation-x={-0.22}>
        <boxGeometry args={[2.2, 0.55, 0.1]} />
        <meshStandardMaterial {...mapasPBR('madera', 2, 0.5)} color={PALETA.maderaBanco} />
      </mesh>
      {[-0.9, 0.9].map((px, i) => (
        <mesh key={i} castShadow position={[px, 0.22, 0]}>
          <boxGeometry args={[0.14, 0.45, 0.55]} />
          <meshStandardMaterial color={PALETA.hierro} />
        </mesh>
      ))}
    </group>
  );
}

export function Farola({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 0.24, 8]} />
        <meshStandardMaterial {...mapasPBR('roca', 0.6, 0.3)} />
      </mesh>
      <mesh castShadow position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 3.4, 8]} />
        <meshStandardMaterial color={PALETA.hierro} />
      </mesh>
      <mesh castShadow position={[0, 3.62, 0]}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial color={PALETA.farolLuz} emissive={PALETA.farolLuz} emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 3.86, 0]}>
        <coneGeometry args={[0.34, 0.28, 8]} />
        <meshStandardMaterial color={PALETA.hierro} />
      </mesh>
      <pointLight color={PALETA.farolLuz} intensity={0.8} distance={9} position={[0, 3.5, 0]} />
    </group>
  );
}

export function PuestoMercado({ x, z, rot, color }: { x: number; z: number; rot: number; color: string }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {/* mostrador */}
      <mesh castShadow receiveShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[3, 0.14, 1.4]} />
        <meshStandardMaterial {...mapasPBR('madera', 2.4, 1.1)} />
      </mesh>
      {[[-1.35, -0.6], [1.35, -0.6], [-1.35, 0.6], [1.35, 0.6]].map(([px, pz], i) => (
        <mesh key={i} castShadow position={[px, 0.42, pz]}>
          <boxGeometry args={[0.12, 0.85, 0.12]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
      ))}
      {/* postes del toldo */}
      {[[-1.4, -0.65], [1.4, -0.65], [-1.4, 0.65], [1.4, 0.65]].map(([px, pz], i) => (
        <mesh key={i} castShadow position={[px, 1.5, pz]}>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 6]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
      ))}
      {/* toldo a dos aguas */}
      <mesh castShadow position={[0, 2.25, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[1.95, 0.6, 4]} />
        <meshStandardMaterial color={color} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* género encima */}
      {[-0.9, 0, 0.9].map((px, i) => (
        <mesh key={i} castShadow position={[px, 1.02, 0]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial color={PALETA.cultivo[i % PALETA.cultivo.length]} />
        </mesh>
      ))}
    </group>
  );
}

export function Pozo({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.05, 1.15, 1, 12]} />
        <meshStandardMaterial {...mapasPBR('roca', 2.2, 0.6)} flatShading />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.06, 12]} />
        <meshStandardMaterial color={PALETA.aguaLago} roughness={0.1} />
      </mesh>
      {[-0.95, 0.95].map((px, i) => (
        <mesh key={i} castShadow position={[px, 1.7, 0]}>
          <boxGeometry args={[0.14, 1.5, 0.14]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 2.6, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.12, 0.12, 2.1, 8]} />
        <meshStandardMaterial color={PALETA.tronco} />
      </mesh>
      <mesh castShadow position={[0, 2.95, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[1.5, 0.75, 4]} />
        <meshStandardMaterial {...mapasPBR('teja', 1.6, 0.8)} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.9, 0]}>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshStandardMaterial color={PALETA.madera} />
      </mesh>
    </group>
  );
}

export function Carro({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[2.6, 0.5, 1.3]} />
        <meshStandardMaterial {...mapasPBR('madera', 2.2, 1.1)} />
      </mesh>
      {[-0.55, 0.55].map((pz, i) => (
        <mesh key={i} castShadow position={[0.7, 0.5, pz]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.5, 0.09, 6, 14]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
      ))}
      <mesh castShadow position={[-1.6, 0.62, 0]} rotation-z={0.18}>
        <boxGeometry args={[1.4, 0.1, 0.12]} />
        <meshStandardMaterial color={PALETA.tronco} />
      </mesh>
      {/* heno */}
      <mesh castShadow position={[0.1, 1.15, 0]}>
        <boxGeometry args={[2, 0.4, 1] } />
        <meshStandardMaterial color={PALETA.cultivo[1]} flatShading />
      </mesh>
    </group>
  );
}

function Tendedero({ x, z, rot, azar }: { x: number; z: number; rot: number; azar: () => number }) {
  const prendas = useMemo(() => Array.from({ length: 4 }, (_, i) => ({
    px: -1.5 + i * 1,
    color: PALETA.tela[Math.floor(azar() * PALETA.tela.length)],
    alto: 0.5 + azar() * 0.35,
  })), [azar]);
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {[-2, 2].map((px, i) => (
        <mesh key={i} castShadow position={[px, 1.1, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
      ))}
      <mesh position={[0, 2.05, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 4, 5]} />
        <meshStandardMaterial color={PALETA.piedra} />
      </mesh>
      {prendas.map((p, i) => (
        <mesh key={i} position={[p.px, 2.05 - p.alto / 2, 0]}>
          <planeGeometry args={[0.7, p.alto]} />
          <meshStandardMaterial color={p.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Humo que sube y se desvanece: da vida a las casas sin coste real. */
function Humo({ x, z }: { x: number; z: number }) {
  const grupo = useRef<THREE.Group>(null);
  const fase = useMemo(() => Math.random() * 10, []);
  useFrame((estado) => {
    const g = grupo.current;
    if (!g) return;
    const t = estado.clock.elapsedTime + fase;
    g.children.forEach((hijo, i) => {
      const p = ((t * 0.35 + i * 0.33) % 1);
      hijo.position.y = p * 3.2;
      hijo.position.x = Math.sin(p * 4 + i) * 0.35;
      const s = 0.18 + p * 0.5;
      hijo.scale.setScalar(s);
      (hijo as THREE.Mesh & { material: THREE.MeshStandardMaterial }).material.opacity = 0.42 * (1 - p);
    });
  });
  return (
    <group ref={grupo} position={[x, 0, z]}>
      {[0, 1, 2].map(i => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={PALETA.humo} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Ovejas que pastan y se mueven un poco por el prado del oeste. */
function Ovejas({ azar }: { azar: () => number }) {
  const rebano = useMemo(() => Array.from({ length: 7 }, () => ({
    x: -150 + azar() * 60,
    z: -40 + azar() * 80,
    fase: azar() * Math.PI * 2,
    rot: azar() * Math.PI * 2,
  })), [azar]);
  const grupo = useRef<THREE.Group>(null);
  useFrame((estado) => {
    const g = grupo.current;
    if (!g) return;
    const t = estado.clock.elapsedTime;
    g.children.forEach((oveja, i) => {
      // pasito lento de un lado a otro, y la cabeza bajando a pastar
      oveja.position.x = rebano[i].x + Math.sin(t * 0.16 + rebano[i].fase) * 2.2;
      oveja.rotation.y = rebano[i].rot + Math.sin(t * 0.16 + rebano[i].fase) * 0.5;
    });
  });
  return (
    <group ref={grupo}>
      {rebano.map((o, i) => (
        <group key={i} position={[o.x, 0, o.z]} rotation-y={o.rot}>
          <mesh castShadow position={[0, 0.62, 0]}>
            <sphereGeometry args={[0.45, 10, 8]} />
            <meshStandardMaterial color={PALETA.ovejaLana} flatShading />
          </mesh>
          <mesh castShadow position={[0, 0.6, 0.45]}>
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshStandardMaterial color={PALETA.ovejaCara} />
          </mesh>
          {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([px, pz], j) => (
            <mesh key={j} position={[px, 0.16, pz]}>
              <cylinderGeometry args={[0.055, 0.055, 0.34, 5]} />
              <meshStandardMaterial color={PALETA.ovejaCara} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Vallas de madera alrededor de los huertos. */
function Valla({ x, z, largo, rot }: { x: number; z: number; largo: number; rot: number }) {
  const postes = Math.max(2, Math.round(largo / 1.6));
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {Array.from({ length: postes + 1 }, (_, i) => (
        <mesh key={i} castShadow position={[-largo / 2 + (i * largo) / postes, 0.5, 0]}>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial color={PALETA.madera} />
        </mesh>
      ))}
      {[0.35, 0.72].map((y, i) => (
        <mesh key={i} castShadow position={[0, y, 0]}>
          <boxGeometry args={[largo, 0.08, 0.06]} />
          <meshStandardMaterial color={PALETA.madera} />
        </mesh>
      ))}
    </group>
  );
}

/** Huertos con surcos de cultivo. */
function Huerto({ x, z, azar }: { x: number; z: number; azar: () => number }) {
  const surcos = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    pz: -2 + i,
    color: PALETA.cultivo[Math.floor(azar() * PALETA.cultivo.length)],
  })), [azar]);
  return (
    <group position={[x, 0, z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial {...mapasPBR('tierra', 2.4, 2)} />
      </mesh>
      {surcos.map((s, i) => (
        <mesh key={i} position={[0, 0.16, s.pz]} castShadow>
          <boxGeometry args={[6.2, 0.26, 0.5]} />
          <meshStandardMaterial color={s.color} flatShading />
        </mesh>
      ))}
      <Valla x={0} z={-3.2} largo={7} rot={0} />
      <Valla x={0} z={3.2} largo={7} rot={0} />
    </group>
  );
}

// ---------------------------------------------------------------------------
export function Detalles() {
  const azar = useMemo(() => crearAzar(3141592), []);

  // Bancos, farolas, puestos, pozo y carro se colocan ahora desde Aldea con
  // las posiciones de mapa.ts: son editables (mover, eliminar) y esa lista es
  // la misma que usan el rebote y el minimapa.

  // Humo en algunas casas del anillo (mismas posiciones que Casas: r 27-40).
  const humos = useMemo(() => {
    const a = crearAzar(20260818);
    const lista: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < 14; i++) {
      const ang = 0.45 + (i / 14) * (Math.PI * 2 - 0.9);
      const r = (i % 2 === 0 ? 27 : 36) + a() * 4;
      const ancho = 5 + a() * 2, fondo = 4.5 + a() * 1.5, alto = 2.9 + a() * 0.6;
      const chimenea = a() > 0.55;
      if (!chimenea) continue;
      // la chimenea va en (ancho/3, -fondo/5) del sistema local de la casa
      const rotY = -ang - Math.PI / 2;
      const lx = ancho / 3, lz = -fondo / 5;
      lista.push({
        x: Math.cos(ang) * r + (lx * Math.cos(rotY) + lz * Math.sin(rotY)),
        z: Math.sin(ang) * r + (-lx * Math.sin(rotY) + lz * Math.cos(rotY)),
      });
      void alto;
    }
    return lista;
  }, []);

  return (
    <group>
      <Tendedero x={-24} z={20} rot={0.3} azar={azar} />
      <Tendedero x={26} z={22} rot={-0.5} azar={azar} />
      <Huerto x={-34} z={-24} azar={azar} />
      <Huerto x={34} z={-30} azar={azar} />
      <Ovejas azar={azar} />
      {humos.map((h, i) => (
        <group key={i} position={[h.x, 4.6, h.z]}>
          <Humo x={0} z={0} />
        </group>
      ))}
    </group>
  );
}
