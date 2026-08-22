import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Interactivo, Rotulo } from './Senales';
import { PALETA } from './paleta';

// ============================================================================
// LA GRAN PANTALLA (2026-08-18, petición de Eugenio): un cine al aire libre
// entre la plaza y el distrito. Al pulsarla ENTRAS EN EL CINE (la sala 3D
// del agente de YouTube, Cine.tsx). Desde 2026-08-19 es una PIEZA del pueblo
// («pantalla:0» en piezasAldea): se arrastra y su posición se guarda como la
// de cualquier casa o farola.
// ============================================================================

/** Posición de fábrica y radio de choque (los usa piezasAldea). */
export const PANTALLA = { x: 27, z: -18, rot: -0.98, radio: 4.2 };

const ROJO = '#ff0033';

/** SOLO el mueble, sin posición ni clics: lo comparten la escena y el
 *  FANTASMA que sigue al ratón mientras la arrastras. */
export function PantallaVisual({ resaltado = false }: { resaltado?: boolean }) {
  const boton = useRef<THREE.MeshBasicMaterial>(null);

  // El play late despacio, como un cartel de neón: se ve de lejos que ahí
  // hay algo vivo sin llegar a ser un anuncio parpadeante.
  useFrame(({ clock }) => {
    if (boton.current) boton.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 1.6) * 0.25;
  });

  return (
    <group>
      {/* Tarima */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[9.4, 0.28, 2.6]} />
        <meshStandardMaterial color={PALETA.poste} roughness={0.8} />
      </mesh>
      {/* Postes */}
      {[-3.9, 3.9].map(x => (
        <mesh key={x} position={[x, 2.6, 0]} castShadow>
          <boxGeometry args={[0.34, 5.2, 0.34]} />
          <meshStandardMaterial color={PALETA.poste} roughness={0.7} />
        </mesh>
      ))}
      {/* Cuerpo de la pantalla */}
      <mesh position={[0, 4.3, 0]} castShadow>
        <boxGeometry args={[8.6, 4.6, 0.3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>
      {/* La «tela» oscura donde se proyecta */}
      <mesh position={[0, 4.3, 0.17]}>
        <planeGeometry args={[8, 4]} />
        <meshBasicMaterial color="#0b1220" toneMapped={false} />
      </mesh>
      {/* El play de YouTube: pastilla roja + triángulo (un círculo de 3 lados) */}
      <mesh position={[0, 4.3, 0.19]}>
        <planeGeometry args={[2.3, 1.6]} />
        <meshBasicMaterial ref={boton} color={ROJO} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.3, 0.21]} >
        <circleGeometry args={[0.55, 3]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Marquesina */}
      <Text position={[0, 6.95, 0.2]} fontSize={0.52} color="#ffffff" anchorX="center" anchorY="middle"
        outlineWidth={0.025} outlineColor="#0f172a">
        GRAN PANTALLA
      </Text>
      {/* Un poco de luz roja al suelo, para encontrarla de noche */}
      <pointLight position={[0, 4.3, 1.6]} color={ROJO} intensity={resaltado ? 26 : 10} distance={16} />
    </group>
  );
}

export function PantallaGrande({ x, z, rot, onAbrir, onAgarrar }: {
  x: number; z: number; rot: number;
  onAbrir: () => void;
  /** Pinchar sin soltar: se arrastra y recoloca como cualquier pieza. */
  onAgarrar?: (e: any) => void;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rot} onPointerDown={onAgarrar}>
      <Interactivo onPulsar={onAbrir}>
        {(resaltado) => (
          <>
            <PantallaVisual resaltado={resaltado} />
            <Rotulo
              y={8.2}
              texto="Gran pantalla"
              pie="Entra al cine del agente de YouTube · pulsa para entrar · arrastra para mover"
              color={ROJO}
              resaltado={resaltado}
            />
          </>
        )}
      </Interactivo>
    </group>
  );
}
