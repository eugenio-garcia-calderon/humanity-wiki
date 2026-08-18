// ============================================================================
// JUEGO VITAL — los habitantes que el jugador ha creado (Los Sims): personas
// reales de su vida y proyectos, plantados donde él estaba al crearlos.
// Cada uno lleva su nombre flotando encima y reporta su distancia para que la
// página ofrezca «Hablar con…».
// ============================================================================
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Billboard } from '@react-three/drei';
import type { Agente, Medidas } from './tipos';
import { PALETA } from './paleta';

/** Colores estables a partir del nombre: el mismo agente se ve siempre igual. */
function coloresDe(a: Agente): { ropa: string; pelo: string } {
  const paletaRopa = ['#3e8f6f', '#4a6fa5', '#a5644a', '#7a4aa5', '#a5984a', '#a54a72'];
  const paletaPelo = ['#4a3527', '#2b2320', '#6b4f2a', '#8a8a8a'];
  let h = 0;
  for (let i = 0; i < a.nombre.length; i++) h = (h * 31 + a.nombre.charCodeAt(i)) >>> 0;
  return {
    ropa: a.apariencia?.ropa || paletaRopa[h % paletaRopa.length],
    pelo: a.apariencia?.pelo || paletaPelo[(h >> 3) % paletaPelo.length],
  };
}

function Persona({ a }: { a: Agente }) {
  const grupo = useRef<THREE.Group>(null);
  const { ropa, pelo } = useMemo(() => coloresDe(a), [a]);
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);

  // Respiración/balanceo suave: sin animación esquelética todavía (F2),
  // pero basta para que no parezcan estatuas.
  useFrame((estado) => {
    const g = grupo.current;
    if (!g) return;
    const t = estado.clock.elapsedTime + fase;
    g.position.y = Math.sin(t * 1.4) * 0.04;
    g.rotation.y = Math.sin(t * 0.35) * 0.25;
  });

  return (
    <group position={[a.x, 0, a.z]}>
      <group ref={grupo}>
        {[-0.14, 0.14].map((lx, i) => (
          <mesh key={i} castShadow position={[lx, 0.3, 0]}>
            <boxGeometry args={[0.2, 0.6, 0.24]} />
            <meshStandardMaterial color={PALETA.pantalon} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 1.02, 0]}>
          <capsuleGeometry args={[0.4, 0.66, 6, 14]} />
          <meshStandardMaterial color={ropa} />
        </mesh>
        {[-0.52, 0.52].map((ax, i) => (
          <mesh key={i} castShadow position={[ax, 1.02, 0]} rotation-z={ax > 0 ? -0.14 : 0.14}>
            <capsuleGeometry args={[0.12, 0.52, 4, 8]} />
            <meshStandardMaterial color={ropa} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 1.92, 0]}>
          <sphereGeometry args={[0.33, 16, 14]} />
          <meshStandardMaterial color={PALETA.piel} />
        </mesh>
        <mesh position={[0, 2.07, -0.05]} scale={[1, 0.72, 1]}>
          <sphereGeometry args={[0.34, 16, 14]} />
          <meshStandardMaterial color={pelo} />
        </mesh>
      </group>
      <Billboard position={[0, 2.75, 0]}>
        <Text fontSize={0.34} color={PALETA.robotDetalle} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#ffffff">
          {a.nombre}
        </Text>
      </Billboard>
    </group>
  );
}

function ProyectoAgente({ a }: { a: Agente }) {
  const pct = a.tarjetas && a.tarjetas > 0 ? (a.hechas || 0) / a.tarjetas : 0;
  const alto = 3 + pct * 2.4;
  const color = a.apariencia?.color
    || PALETA.edificiosProyecto[a.nombre.length % PALETA.edificiosProyecto.length];
  return (
    <group position={[a.x, 0, a.z]}>
      <mesh castShadow receiveShadow position={[0, alto / 2, 0]}>
        <boxGeometry args={[7, alto, 5.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, alto + 0.2, 0]}>
        <boxGeometry args={[7.6, 0.4, 6.1]} />
        <meshStandardMaterial color={PALETA.tejadoPlano} />
      </mesh>
      <mesh position={[0, 1.1, 2.77]}>
        <planeGeometry args={[1.3, 2.2]} />
        <meshStandardMaterial color={PALETA.puerta} />
      </mesh>
      {[-2.1, 2.1].map((wx, i) => (
        <mesh key={i} position={[wx, 2, 2.77]}>
          <planeGeometry args={[1.3, 1]} />
          <meshStandardMaterial color={PALETA.ventanaLuz} emissive={PALETA.ventanaLuz} emissiveIntensity={0.25} />
        </mesh>
      ))}
      <Billboard position={[0, alto + 1.3, 0]}>
        <Text fontSize={0.42} maxWidth={7} color={PALETA.robotDetalle} anchorX="center" anchorY="middle" textAlign="center" outlineWidth={0.035} outlineColor="#ffffff">
          {a.nombre}
        </Text>
      </Billboard>
    </group>
  );
}

export function Agentes({ agentes, jugadorPos, medidas }: {
  agentes: Agente[];
  jugadorPos: THREE.Vector3;
  medidas: React.MutableRefObject<Medidas>;
}) {
  useFrame(() => {
    let mejor: Medidas['agente'] = null;
    for (const a of agentes) {
      const d = Math.hypot(jugadorPos.x - a.x, jugadorPos.z - (a.z + (a.tipo === 'proyecto' ? 3 : 0)));
      if (d < (a.tipo === 'proyecto' ? 8 : 5) && (!mejor || d < mejor.d)) mejor = { a, d };
    }
    medidas.current.agente = mejor;
  });

  return (
    <group>
      {agentes.map(a => a.tipo === 'persona'
        ? <Persona key={a.id} a={a} />
        : <ProyectoAgente key={a.id} a={a} />)}
    </group>
  );
}
