// ============================================================================
// JUEGO VITAL — the project district: the player's REAL projects (from
// GET /api/proyectos) standing as buildings. The building literally grows
// with real kanban progress, and the sign shows the real title and a real
// progress bar. Walking up to one opens the project panel on the page.
// ============================================================================
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import type { Medidas, ProyectoJuego } from './tipos';
import { PALETA } from './paleta';
import { posicionProyecto } from './mapa';
import { Interactivo, Rotulo } from './Senales';
import { PortalVerde, LuzDePortal, VERDE_PORTAL } from './PortalVerde';

interface Parcela {
  p: ProyectoJuego;
  x: number;
  z: number;
  color: string;
}

function EdificioProyecto({ p, x, z, onEntrar }: Parcela & { onEntrar: (p: ProyectoJuego) => void }) {
  const pct = p.tarjetas > 0 ? p.hechas / p.tarjetas : 0;
  return (
    <group position={[x, 0, z]}>
      <Interactivo onPulsar={() => onEntrar(p)}>
        {(resaltado) => <PortalDeProyecto titulo={p.titulo} tarjetas={p.tarjetas} pct={pct} resaltado={resaltado} />}
      </Interactivo>
    </group>
  );
}

/**
 * El portal de un proyecto: la espiral verde, el TÍTULO flotando encima y la
 * barra de progreso real del tablero. `resaltado` es «tienes el ratón encima»
 * — mismo hover que tenían los edificios. Lo comparten el distrito y los
 * proyectos construidos desde el juego (Agentes.tsx).
 */
export function PortalDeProyecto({ titulo, tarjetas, pct, radio = 2.6, pie = 'Pulsa para entrar', resaltado }: {
  titulo: string; tarjetas: number; pct: number; radio?: number; pie?: string; resaltado: boolean;
}) {
  return (
    <group>
      {/* El nombre grande al pasar por encima: se mide en pantalla, así que
          se lee igual de cerca que desde el otro lado del valle. */}
      <Rotulo y={radio * 2 + 2.6} texto={titulo} pie={pie} color={VERDE_PORTAL} resaltado={resaltado} />
      <PortalVerde radio={radio} resaltado={resaltado} />
      <LuzDePortal radio={radio} />
      {/* Blanco generoso para el clic y el dedo: el aro fino era difícil de acertar */}
      <mesh position={[0, radio, 0]}>
        <cylinderGeometry args={[radio * 1.05, radio * 1.05, radio * 2.2, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Título y progreso reales, flotando bajo el portal */}
      <Billboard position={[0, radio * 2 + 1, 0]}>
        <Text fontSize={0.46} maxWidth={5.4} color="#ffffff" anchorX="center" anchorY="middle" textAlign="center"
          outlineWidth={0.03} outlineColor="#0f3d16">
          {titulo}
        </Text>
        {tarjetas > 0 && (
          <group position={[0, -0.62, 0]}>
            <mesh>
              <planeGeometry args={[3.8, 0.18]} />
              <meshBasicMaterial color={PALETA.barraFondo} toneMapped={false} />
            </mesh>
            {pct > 0 && (
              <mesh position={[-(3.8 * (1 - pct)) / 2, 0, 0.01]}>
                <planeGeometry args={[3.8 * pct, 0.18]} />
                <meshBasicMaterial color={VERDE_PORTAL} toneMapped={false} />
              </mesh>
            )}
          </group>
        )}
      </Billboard>
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
