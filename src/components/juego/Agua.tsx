// ============================================================================
// JUEGO VITAL — agua viva (2026-08-19, fase 1 del realismo). Un material de
// agua para río, lagos y fuente: olas reales (mapa de normales del proyecto
// three.js, MIT) que se desplazan con el tiempo, casi sin rugosidad para que
// el cielo HDRI de la fase 0 se refleje de verdad.
// ============================================================================
import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { normalesDeAgua } from './texturas';

export function MaterialAgua({ color, opacidad = 0.92, repetirX = 4, repetirY = 4, velocidad = 1 }: {
  color: string;
  opacidad?: number;
  repetirX?: number;
  repetirY?: number;
  /** 1 = lago tranquilo; el río va más deprisa. */
  velocidad?: number;
}) {
  const olas = useMemo(() => normalesDeAgua(repetirX, repetirY), [repetirX, repetirY]);
  const escalaNormal = useMemo(() => new THREE.Vector2(0.55, 0.55), []);
  // El desplazamiento se calcula del reloj absoluto: si dos superficies
  // comparten textura (misma repetición), escribir dos veces el mismo valor
  // no hace daño.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.028 * velocidad;
    olas.offset.set(t % 1, (t * 0.62) % 1);
  });
  return (
    <meshStandardMaterial
      color={color}
      normalMap={olas}
      normalScale={escalaNormal}
      roughness={0.07}
      metalness={0.12}
      transparent
      opacity={opacidad}
      envMapIntensity={1.35}
      side={THREE.DoubleSide}
    />
  );
}
