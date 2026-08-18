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
import { Interactivo } from './Senales';
import { PortalVerde, LuzDePortal, VERDE_PORTAL } from './PortalVerde';

interface Parcela {
  p: ProyectoJuego;
  x: number;
  z: number;
  color: string;
  portada?: string | null;
  /** El jugador quitó este portal del mapa: no se dibuja ni se mide. */
  eliminado?: boolean;
}

function EdificioProyecto({ p, x, z, portada, onEntrar, onAgarrar }: Parcela & {
  onEntrar: (p: ProyectoJuego) => void;
  onAgarrar?: (p: ProyectoJuego, pos: { x: number; z: number }, e: any) => void;
}) {
  const pct = p.tarjetas > 0 ? p.hechas / p.tarjetas : 0;
  return (
    <group position={[x, 0, z]}>
      <Interactivo onPulsar={() => onEntrar(p)}>
        {(resaltado) => (
          <PortalDeProyecto
            titulo={p.titulo} tarjetas={p.tarjetas} pct={pct} resaltado={resaltado}
            fotoUrl={portada}
            onAgarrar={onAgarrar ? (e) => onAgarrar(p, { x, z }, e) : undefined}
          />
        )}
      </Interactivo>
    </group>
  );
}

/**
 * El portal de un proyecto: la espiral verde y UN SOLO texto encima — el
 * título, bien grande, que crece un poco más con el ratón encima (petición
 * de Eugenio: antes se apilaban el rótulo del hover y el título fijo). Lo
 * comparten el distrito y los proyectos construidos desde el juego, y se
 * puede AGARRAR para arrastrarlo como cualquier otro objeto.
 */
export function PortalDeProyecto({ titulo, tarjetas, pct, radio = 2.6, resaltado, onAgarrar, fotoUrl }: {
  titulo: string; tarjetas: number; pct: number; radio?: number; resaltado: boolean;
  onAgarrar?: (e: any) => void;
  /** La portada del portal: foto en círculo con borde blanco, en el centro. */
  fotoUrl?: string | null;
}) {
  return (
    <group onPointerDown={onAgarrar}>
      <PortalVerde radio={radio} resaltado={resaltado} fotoUrl={fotoUrl} />
      <LuzDePortal radio={radio} />
      {/* Blanco generoso para el clic y el dedo: el aro fino era difícil de acertar */}
      <mesh position={[0, radio, 0]}>
        <cylinderGeometry args={[radio * 1.05, radio * 1.05, radio * 2.2, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* UN solo texto: el título, grande, con su barra de progreso debajo */}
      <Billboard position={[0, radio * 2 + 1.4, 0]}>
        <Text fontSize={resaltado ? 1.16 : 0.95} maxWidth={9} color="#ffffff" anchorX="center" anchorY="middle" textAlign="center"
          outlineWidth={0.06} outlineColor="#0f3d16">
          {titulo}
        </Text>
        {tarjetas > 0 && (
          <group position={[0, -1.05, 0]}>
            <mesh>
              <planeGeometry args={[4.6, 0.22]} />
              <meshBasicMaterial color={PALETA.barraFondo} toneMapped={false} />
            </mesh>
            {pct > 0 && (
              <mesh position={[-(4.6 * (1 - pct)) / 2, 0, 0.01]}>
                <planeGeometry args={[4.6 * pct, 0.22]} />
                <meshBasicMaterial color={VERDE_PORTAL} toneMapped={false} />
              </mesh>
            )}
          </group>
        )}
      </Billboard>
    </group>
  );
}

export function EdificiosProyectos({ proyectos, posiciones, jugadorPos, medidas, onEntrar, onAgarrar }: {
  proyectos: ProyectoJuego[];
  /** De posicionesProyectos(): las del distrito con los arrastres aplicados,
   *  la portada de cada portal (la foto del centro) y si está quitado. */
  posiciones: Array<{ x: number; z: number; portada?: string | null; eliminado?: boolean }>;
  jugadorPos: THREE.Vector3;
  medidas: React.MutableRefObject<Medidas>;
  /** Pulsar el edificio entra en él sin tener que caminar hasta allí. */
  onEntrar: (p: ProyectoJuego) => void;
  /** Pinchar sin soltar: el portal se arrastra como cualquier objeto. */
  onAgarrar?: (p: ProyectoJuego, pos: { x: number; z: number }, e: any) => void;
}) {
  const parcelas = useMemo<Parcela[]>(() =>
    proyectos.slice(0, 12).map((p, i) => ({
      p,
      ...(posiciones[i] || posicionProyecto(i)),
      color: PALETA.edificiosProyecto[i % PALETA.edificiosProyecto.length],
    })), [proyectos, posiciones]);

  useFrame(() => {
    let mejor: Medidas['proyecto'] = null;
    for (const b of parcelas) {
      if (b.eliminado) continue;
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
      {parcelas.filter(b => !b.eliminado).map(b => <EdificioProyecto key={b.p.id} {...b} onEntrar={onEntrar} onAgarrar={onAgarrar} />)}
    </group>
  );
}
