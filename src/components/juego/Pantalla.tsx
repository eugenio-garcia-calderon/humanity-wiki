import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Interactivo, Rotulo } from './Senales';
import { PALETA } from './paleta';

// ============================================================================
// LA GRAN PANTALLA (2026-08-18, petición de Eugenio): un cine al aire libre
// entre la plaza y el distrito de proyectos. Al pulsarla se abre el panel de
// YouTube: conectar la cuenta y ver vídeos de tus suscripciones relacionados
// con tus proyectos. El panel es HTML de la página (JuegoVital); aquí solo
// vive el mueble y su clic.
// ============================================================================

/** Dónde está y cuánto ocupa (lo leen la escena y los obstáculos de rebote). */
export const PANTALLA = { x: 27, z: -18, rot: -0.98, radio: 4.2 };

const ROJO = '#ff0033';

export function PantallaGrande({ onAbrir }: { onAbrir: () => void }) {
  const boton = useRef<THREE.MeshBasicMaterial>(null);

  // El play late despacio, como un cartel de neón: se ve de lejos que ahí
  // hay algo vivo sin llegar a ser un anuncio parpadeante.
  useFrame(({ clock }) => {
    if (boton.current) boton.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 1.6) * 0.25;
  });

  return (
    <group position={[PANTALLA.x, 0, PANTALLA.z]} rotation-y={PANTALLA.rot}>
      <Interactivo onPulsar={onAbrir}>
        {(resaltado) => (
          <>
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
            <Rotulo
              y={8.2}
              texto="Gran pantalla"
              pie="Vídeos de tus suscripciones para tus proyectos · pulsa para abrir"
              color={ROJO}
              resaltado={resaltado}
            />
          </>
        )}
      </Interactivo>
    </group>
  );
}
