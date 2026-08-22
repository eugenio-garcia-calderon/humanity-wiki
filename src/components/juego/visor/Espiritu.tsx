// ============================================================================
// EL ESPÍRITU: QUIEN RECORRE EL VISOR (2026-08-22)
// ============================================================================
// Eugenio: «elimina los personajes y haz que sea como un espíritu azul y verde,
// un haz de luz que se mueve flotando por el mundo 3D; no puede subir ni bajar,
// solo se mueve en el plano XY».
//
// LO QUE SE VA CON ESTO, y conviene decirlo porque es mucho: el modelo humano
// de 7,6 MB con sus animaciones (andar, correr, saltar, conducir), el editor de
// aspecto —piel, pelo, ropa, fenotipo—, la bici y el planeador. En un mundo de
// líneas blancas, un humano texturizado era lo único con volumen y desentonaba
// con todo lo demás; y en un visor donde lo que importa es lo que hay en las
// pantallas, elegirse el peinado no aporta nada.
//
// SOLO EN EL PLANO, y es una decisión de diseño, no una limitación: si se
// pudiera subir, la vista cenital dejaría de tener sentido —se vería el mundo
// desde arriba de verdad, y los portales dejarían de necesitar su previa—.
// Además, sin altura no hace falta ni gravedad, ni salto, ni aterrizaje, ni
// «¿choco con esto o paso por encima?»: todo eso desaparece del código.
//
// AZUL Y VERDE A LA VEZ: dos conos entrelazados que giran despacio en sentidos
// contrarios. Es lo que hace que se lea como algo vivo y no como una baliza.
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TINTA } from './Piezas';

export function Espiritu({ moviendo = false }: { moviendo?: boolean }) {
  const azul = useRef<THREE.Group>(null);
  const verde = useRef<THREE.Group>(null);
  const nucleo = useRef<THREE.Mesh>(null);

  useFrame((estado, dt) => {
    const t = estado.clock.elapsedTime;
    // Los dos velos giran al revés. Moviéndote giran más deprisa: es la única
    // señal de velocidad que queda, ahora que no hay pasos que oír ni ver.
    const v = moviendo ? 2.6 : 1;
    if (azul.current) azul.current.rotation.y += dt * 0.8 * v;
    if (verde.current) verde.current.rotation.y -= dt * 0.55 * v;
    // El núcleo respira. Flota un poco, pero SIEMPRE por encima del mismo
    // punto del suelo: el que no puede subir es el espíritu, no su brillo.
    if (nucleo.current) {
      nucleo.current.position.y = 1.15 + Math.sin(t * 2) * 0.07;
      nucleo.current.scale.setScalar(1 + Math.sin(t * 3.1) * 0.06);
    }
  });

  return (
    <group>
      {/* Los dos velos: conos abiertos hacia arriba, sin tapa, uno azul y otro
          verde, casi transparentes. `depthWrite={false}` para que no se
          recorten entre sí ni recorten lo que hay detrás — en una sala blanca
          un recorte se ve como un agujero negro. */}
      <group ref={azul}>
        <mesh position={[0, 1.1, 0]}>
          <coneGeometry args={[0.62, 2.2, 5, 1, true]} />
          <meshBasicMaterial color={TINTA.espirituA} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <group ref={verde}>
        <mesh position={[0, 0.95, 0]} rotation={[0, 0.6, 0]}>
          <coneGeometry args={[0.44, 1.9, 5, 1, true]} />
          <meshBasicMaterial color={TINTA.espirituB} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {/* El núcleo, lo único casi sólido: es dónde estás tú exactamente. */}
      <mesh ref={nucleo} position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.34, 16, 12]} />
        <meshBasicMaterial color={TINTA.espirituB} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* La huella en el suelo. En un suelo blanco y sin sombras, es lo ÚNICO
          que dice sobre qué punto estás plantado; sin ella, moverse entre
          pantallas es calcular a ojo. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.5, 0.72, 28]} />
        <meshBasicMaterial color={TINTA.espirituA} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}
