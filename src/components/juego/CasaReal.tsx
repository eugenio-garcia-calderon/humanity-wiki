// ============================================================================
// JUEGO VITAL — la casa realista (2026-08-19, fase 3 del realismo). Sustituye
// a los modelos estilizados de la librería: mismos sitios y misma huella de
// choque (radio 7 en mapa.ts), pero construida con materiales FOTOGRÁFICOS:
// zócalo de piedra, muros revocados, tejado de teja árabe con su caballete,
// chimenea de ladrillo, puerta de madera y ventanas con cristal que refleja
// el cielo. La `variante` (el `modelo` de la pieza) cambia tinte, espejo y
// chimenea para que no haya dos casas iguales.
// ============================================================================
import * as THREE from 'three';
import { useMemo } from 'react';
import { mapasPBR } from './texturas';

const TINTES_MURO = ['#ffffff', '#f3e6cf', '#e9d5b3', '#e5e8e2', '#f0dcc4', '#dde8ea'];
const TINTES_TEJA = ['#ffffff', '#e9cbb2', '#d9b69c'];

const ANCHO = 6, FONDO = 5, ALTO = 3.1;
const Y_MURO = 0.5;                      // encima del zócalo
const CUMBRE = 1.55;                     // alto del triángulo del tejado
const VUELO = 0.35;                      // alero
const PENDIENTE = Math.atan2(CUMBRE, FONDO / 2 + VUELO);
const LARGO_AGUA = Math.hypot(CUMBRE, FONDO / 2 + VUELO) + 0.15;

/** El triángulo del hastial (la pared bajo el tejado), reutilizado. */
let triangulo: THREE.Shape | null = null;
function hastial(): THREE.Shape {
  if (!triangulo) {
    triangulo = new THREE.Shape();
    triangulo.moveTo(-FONDO / 2, 0);
    triangulo.lineTo(FONDO / 2, 0);
    triangulo.lineTo(0, CUMBRE);
    triangulo.closePath();
  }
  return triangulo;
}

function Ventana({ x, y, z, rotY = 0 }: { x: number; y: number; z: number; rotY?: number }) {
  return (
    <group position={[x, y, z]} rotation-y={rotY}>
      {/* marco pintado de blanco */}
      <mesh castShadow>
        <boxGeometry args={[1.06, 1.28, 0.1]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.5} />
      </mesh>
      {/* cristal: casi espejo, refleja el cielo HDRI */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.88, 1.1, 0.04]} />
        <meshStandardMaterial color="#9db9c8" roughness={0.06} metalness={0.55} envMapIntensity={1.7} />
      </mesh>
      {/* la cruz del marco */}
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[0.06, 1.1, 0.02]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[0.88, 0.06, 0.02]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.5} />
      </mesh>
    </group>
  );
}

export function CasaReal({ variante = 0 }: { variante?: number }) {
  const tinte = TINTES_MURO[variante % TINTES_MURO.length];
  const teja = TINTES_TEJA[variante % TINTES_TEJA.length];
  const espejo = variante % 2 === 1 ? -1 : 1;
  const conChimenea = variante % 3 !== 2;
  const forma = useMemo(() => hastial(), []);

  return (
    <group>
      {/* Zócalo de piedra */}
      <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[ANCHO + 0.3, 0.5, FONDO + 0.3]} />
        <meshStandardMaterial {...mapasPBR('roca', 3, 0.5)} />
      </mesh>
      {/* Muros revocados */}
      <mesh castShadow receiveShadow position={[0, Y_MURO + ALTO / 2, 0]}>
        <boxGeometry args={[ANCHO, ALTO, FONDO]} />
        <meshStandardMaterial {...mapasPBR('revoco', 2.4, 1.3)} color={tinte} />
      </mesh>
      {/* Hastiales: los triángulos bajo el tejado, a los dos lados */}
      {[-1, 1].map(lado => (
        <mesh key={lado} castShadow position={[lado * (ANCHO / 2 - (lado > 0 ? 0.12 : 0)), Y_MURO + ALTO, 0]} rotation-y={lado * Math.PI / 2}>
          <extrudeGeometry args={[forma, { depth: 0.12, bevelEnabled: false }]} />
          <meshStandardMaterial {...mapasPBR('revoco', 1.4, 1)} color={tinte} />
        </mesh>
      ))}
      {/* Tejado a dos aguas, con TEJA fotográfica y alero */}
      {[-1, 1].map(lado => (
        <mesh
          key={lado}
          castShadow
          receiveShadow
          position={[0, Y_MURO + ALTO + CUMBRE / 2 + 0.05, lado * ((FONDO / 2 + VUELO) / 2)]}
          rotation-x={lado * PENDIENTE}
        >
          <boxGeometry args={[ANCHO + 0.7, 0.1, LARGO_AGUA]} />
          <meshStandardMaterial {...mapasPBR('teja', 3.2, 1.6)} color={teja} />
        </mesh>
      ))}
      {/* El caballete que corona el tejado */}
      <mesh castShadow position={[0, Y_MURO + ALTO + CUMBRE + 0.1, 0]}>
        <boxGeometry args={[ANCHO + 0.72, 0.13, 0.34]} />
        <meshStandardMaterial {...mapasPBR('teja', 3, 0.2)} color={teja} />
      </mesh>
      {/* Chimenea de ladrillo visto con remate de piedra */}
      {conChimenea && (
        <group position={[espejo * 1.6, 0, -1]}>
          <mesh castShadow position={[0, Y_MURO + ALTO + 1.7, 0]}>
            <boxGeometry args={[0.55, 1.7, 0.55]} />
            <meshStandardMaterial {...mapasPBR('ladrillo', 0.6, 1)} />
          </mesh>
          <mesh position={[0, Y_MURO + ALTO + 2.6, 0]}>
            <boxGeometry args={[0.72, 0.14, 0.72]} />
            <meshStandardMaterial {...mapasPBR('roca', 0.5, 0.2)} />
          </mesh>
        </group>
      )}
      {/* Puerta de madera con marco y pomo */}
      <group position={[espejo * -1.5, Y_MURO, FONDO / 2]}>
        <mesh position={[0, 1.14, 0.01]}>
          <boxGeometry args={[1.42, 2.32, 0.08]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 1.1, 0.06]}>
          <boxGeometry args={[1.2, 2.2, 0.06]} />
          <meshStandardMaterial {...mapasPBR('madera', 0.8, 1.4)} />
        </mesh>
        <mesh position={[0.42, 1.05, 0.11]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#c8a44a" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
      {/* Ventanas: dos delante, dos detrás y una en cada hastial */}
      <Ventana x={espejo * 1.4} y={Y_MURO + 1.8} z={FONDO / 2 + 0.02} />
      <Ventana x={espejo * -1.5} y={Y_MURO + 2.35} z={FONDO / 2 + 0.02} />
      <Ventana x={-1.4} y={Y_MURO + 1.7} z={-FONDO / 2 - 0.02} rotY={Math.PI} />
      <Ventana x={1.4} y={Y_MURO + 1.7} z={-FONDO / 2 - 0.02} rotY={Math.PI} />
      <Ventana x={ANCHO / 2 + 0.02} y={Y_MURO + 1.7} z={0} rotY={Math.PI / 2} />
      <Ventana x={-ANCHO / 2 - 0.02} y={Y_MURO + 1.7} z={0} rotY={-Math.PI / 2} />
    </group>
  );
}
