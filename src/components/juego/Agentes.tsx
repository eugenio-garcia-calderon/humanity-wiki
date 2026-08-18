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
import { Halo, Interactivo, Rotulo, SenalDePortal } from './Senales';
import { PortalDeProyecto } from './EdificiosProyectos';

function Persona({ a, onHablar }: { a: Agente; onHablar: (a: Agente) => void }) {
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
      <Halo y={3.4} color={PALETA.robotLuz} radio={0.75} />
      {/* Una persona convertida en PORTAL sigue siendo un muñeco: solo lo
          delatan su nombre en verde y el aro (aclaración de Eugenio). */}
      {a.proyecto_id && <SenalDePortal y={4.3} titulo={a.nombre} />}
      <Interactivo onPulsar={() => onHablar(a)}>
        {(resaltado) => (
          <group>
            <group ref={grupo}>
              <Persona3D cuerpo={a.apariencia?.cuerpo || cuerpo} animacion="idle" aspecto={a.apariencia} />
            </group>
            {/* Cilindro transparente alrededor: acertarle a un muñeco pequeño
                con el dedo es difícil, y esto le da un blanco generoso.
                Transparente y NO `visible={false}`: lo invisible se salta el
                rayo del ratón, y entonces no habría blanco que acertar. */}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 2.2, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Rotulo y={2.8} texto={a.nombre} pie="Pulsa para hablar" color={PALETA.robotLuz} resaltado={resaltado} />
          </group>
        )}
      </Interactivo>
    </group>
  );
}

function ProyectoAgente({ a, onHablar, onAgarrar }: {
  a: Agente;
  onHablar: (a: Agente) => void;
  onAgarrar?: (a: Agente, e: any) => void;
}) {
  const pct = a.tarjetas && a.tarjetas > 0 ? (a.hechas || 0) / a.tarjetas : 0;
  return (
    <group position={[a.x, 0, a.z]}>
      <Interactivo onPulsar={() => onHablar(a)}>
        {(resaltado) => (
          <PortalDeProyecto
            titulo={a.nombre}
            tarjetas={a.tarjetas || 0}
            pct={pct}
            radio={2.2}
            resaltado={resaltado}
            fotoUrl={a.foto_url}
            onAgarrar={onAgarrar ? (e) => onAgarrar(a, e) : undefined}
          />
        )}
      </Interactivo>
    </group>
  );
}

export function Agentes({ agentes, jugadorPos, medidas, onHablar, onAgarrarProyecto }: {
  agentes: Agente[];
  jugadorPos: THREE.Vector3;
  medidas: React.MutableRefObject<Medidas>;
  /** Pulsar abre su chat sin tener que acercarse (petición de Eugenio). */
  onHablar: (a: Agente) => void;
  /** Pinchar sin soltar un PORTAL de proyecto: se arrastra y se recoloca. */
  onAgarrarProyecto?: (a: Agente, e: any) => void;
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
        ? <Persona key={a.id} a={a} onHablar={onHablar} />
        : <ProyectoAgente key={a.id} a={a} onHablar={onHablar} onAgarrar={onAgarrarProyecto} />)}
    </group>
  );
}
