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
import { Persona3D, cuerpoDe } from './Modelos';

function Persona({ a }: { a: Agente }) {
  const grupo = useRef<THREE.Group>(null);
  const cuerpo = useMemo(() => cuerpoDe(a.nombre), [a.nombre]);
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);

  // Se giran despacio mirando alrededor; el modelo trae su propia animación
  // de reposo (respira y se balancea).
  useFrame((estado) => {
    const g = grupo.current;
    if (!g) return;
    g.rotation.y = Math.sin((estado.clock.elapsedTime + fase) * 0.3) * 0.45;
  });

  return (
    <group position={[a.x, 0, a.z]}>
      <group ref={grupo}>
        <Persona3D cuerpo={a.apariencia?.cuerpo || cuerpo} animacion="idle" aspecto={a.apariencia} />
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
