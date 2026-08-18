// ============================================================================
// JUEGO VITAL — the project district: the player's REAL projects (from
// GET /api/proyectos) standing as buildings. The building literally grows
// with real kanban progress, and the sign shows the real title and a real
// progress bar. Walking up to one opens the project panel on the page.
// ============================================================================
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { Medidas, ProyectoJuego } from './tipos';
import { PALETA } from './paleta';
import { posicionProyecto } from './mapa';
import { Halo, Interactivo, Rotulo } from './Senales';

interface Parcela {
  p: ProyectoJuego;
  x: number;
  z: number;
  color: string;
}

function EdificioProyecto({ p, x, z, color, onEntrar }: Parcela & { onEntrar: (p: ProyectoJuego) => void }) {
  const pct = p.tarjetas > 0 ? p.hechas / p.tarjetas : 0;
  const alto = 3 + pct * 2.4; // real progress → taller building
  return (
    <group position={[x, 0, z]}>
      {/* Halo: dice de lejos que aquí se entra (petición de Eugenio) */}
      <Halo y={alto + 2.6} color={color} radio={1.5} />
      <Interactivo onPulsar={() => onEntrar(p)}>
        {(resaltado) => (
          <EdificioPulsable p={p} alto={alto} pct={pct} color={color} resaltado={resaltado} />
        )}
      </Interactivo>
    </group>
  );
}

/** El edificio en sí. `resaltado` es «tienes el ratón encima». */
function EdificioPulsable({ p, alto, pct, color, resaltado }: {
  p: ProyectoJuego; alto: number; pct: number; color: string; resaltado: boolean;
}) {
  return (
    <group>
      {/* El nombre grande al pasar por encima: se mide en pantalla, así que
          se lee igual de cerca que desde el otro lado del valle. */}
      <Rotulo y={alto + 4.6} texto={p.titulo} pie="Pulsa para entrar" color={color} resaltado={resaltado} />
      <mesh castShadow receiveShadow position={[0, alto / 2, 0]}>
        <boxGeometry args={[8, alto, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow position={[0, alto + 0.2, 0]}>
        <boxGeometry args={[8.6, 0.4, 6.6]} />
        <meshStandardMaterial color={PALETA.tejadoPlano} />
      </mesh>
      <mesh position={[0, 1.1, 3.02]}>
        <planeGeometry args={[1.3, 2.2]} />
        <meshStandardMaterial color={PALETA.puerta} />
      </mesh>
      {[-2.4, 2.4].map((wx, i) => (
        <mesh key={i} position={[wx, 2, 3.02]}>
          <planeGeometry args={[1.4, 1.1]} />
          <meshStandardMaterial color={PALETA.ventanaLuz} emissive={PALETA.ventanaLuz} emissiveIntensity={0.25} />
        </mesh>
      ))}

      {/* sign with the real title and progress */}
      <mesh castShadow position={[0, 1.3, 4.6]}>
        <cylinderGeometry args={[0.09, 0.09, 2.6, 8]} />
        <meshStandardMaterial color={PALETA.poste} />
      </mesh>
      <group position={[0, 2.75, 4.6]}>
        <mesh castShadow>
          <boxGeometry args={[5.6, 1.7, 0.16]} />
          <meshStandardMaterial
            color={PALETA.cartel}
            emissive={color}
            emissiveIntensity={resaltado ? 0.45 : 0}
          />
        </mesh>
        <Text
          position={[0, 0.25, 0.1]}
          fontSize={0.42}
          maxWidth={5.1}
          color={PALETA.robotDetalle}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
        >
          {p.titulo}
        </Text>
        {p.tarjetas > 0 && (
          <group position={[0, -0.5, 0.1]}>
            <mesh>
              <boxGeometry args={[4.6, 0.22, 0.05]} />
              <meshStandardMaterial color={PALETA.barraFondo} />
            </mesh>
            {pct > 0 && (
              <mesh position={[-(4.6 * (1 - pct)) / 2, 0, 0.02]}>
                <boxGeometry args={[4.6 * pct, 0.22, 0.05]} />
                <meshStandardMaterial color={PALETA.robotLuz} emissive={PALETA.robotLuz} emissiveIntensity={0.5} />
              </mesh>
            )}
          </group>
        )}
      </group>
    </group>
  );
}

export function EdificiosProyectos({ proyectos, jugadorPos, medidas, onEntrar }: {
  proyectos: ProyectoJuego[];
  jugadorPos: THREE.Vector3;
  medidas: React.MutableRefObject<Medidas>;
  /** Pulsar el edificio entra en él sin tener que caminar hasta allí. */
  onEntrar: (p: ProyectoJuego) => void;
}) {
  const parcelas = useMemo<Parcela[]>(() =>
    proyectos.slice(0, 12).map((p, i) => ({
      p,
      ...posicionProyecto(i),
      color: PALETA.edificiosProyecto[i % PALETA.edificiosProyecto.length],
    })), [proyectos]);

  useFrame(() => {
    let mejor: Medidas['proyecto'] = null;
    for (const b of parcelas) {
      // the door/sign face is on +z: measure from a bit in front of the building
      const d = Math.hypot(jugadorPos.x - b.x, jugadorPos.z - (b.z + 3));
      if (d < 8 && (!mejor || d < mejor.d)) mejor = { p: b.p, d };
    }
    medidas.current.proyecto = mejor;
  });

  return (
    <group>
      {/* district gate sign */}
      <group position={[26, 0, -8]} rotation-y={0.5}>
        <mesh castShadow position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
          <meshStandardMaterial color={PALETA.poste} />
        </mesh>
        <mesh castShadow position={[0, 3.1, 0]}>
          <boxGeometry args={[6.4, 1.2, 0.16]} />
          <meshStandardMaterial color={PALETA.cartel} />
        </mesh>
        <Text position={[0, 3.1, 0.1]} fontSize={0.5} maxWidth={6} color={PALETA.robotDetalle} anchorX="center" anchorY="middle" textAlign="center">
          {proyectos.length > 0 ? 'Distrito de Proyectos' : 'Distrito de Proyectos — aún vacío'}
        </Text>
      </group>
      {parcelas.map(b => <EdificioProyecto key={b.p.id} {...b} onEntrar={onEntrar} />)}
    </group>
  );
}
