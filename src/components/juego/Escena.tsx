// ============================================================================
// JUEGO VITAL — scene composition. Default export so the page can React.lazy
// it: this file (and everything it imports, including three.js) lives in its
// own chunk that only game visitors download.
// ============================================================================
import { useMemo, useRef } from 'react';
import type { Obstaculo } from './Personaje';
import { posicionProyecto, RADIO_EDIFICIO } from './mapa';
import type { Aspecto } from './aspecto';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import type { Agente, Cercania, EntradaMando, Medidas, ProyectoJuego } from './tipos';
import { PALETA } from './paleta';
import { Aldea } from './Aldea';
import { Personaje } from './Personaje';
import { Robot } from './Robot';
import { EdificiosProyectos } from './EdificiosProyectos';
import { Agentes } from './Agentes';

/** Arbitrates what the player is close to (robot beats buildings) and only
 *  notifies the page when the answer CHANGES — never once per frame. */
function Coordinador({ medidas, onCercania }: {
  medidas: React.MutableRefObject<Medidas>;
  onCercania: (c: Cercania) => void;
}) {
  const ultima = useRef('');
  useFrame(() => {
    const m = medidas.current;
    let c: Cercania = null;
    // Un habitante creado por el jugador gana al robot: si te has acercado a
    // alguien, es con él con quien quieres hablar.
    if (m.agente && m.agente.d < 5) c = { tipo: 'agente', agente: m.agente.a };
    else if (m.robot < 4.5) c = { tipo: 'robot' };
    else if (m.proyecto && m.proyecto.d < 8) c = { tipo: 'proyecto', proyecto: m.proyecto.p };
    const clave = c === null ? ''
      : c.tipo === 'robot' ? 'robot'
        : c.tipo === 'agente' ? `a:${c.agente.id}`
          : `p:${c.proyecto.id}`;
    if (clave !== ultima.current) {
      ultima.current = clave;
      onCercania(c);
    }
    // NOTE: never pass a render priority here — any useFrame priority > 0
    // tells react-three-fiber "I'll render myself" and silently disables the
    // automatic render loop (0 draw calls, blank canvas). Mount order already
    // guarantees this runs after Robot/EdificiosProyectos wrote `medidas`.
  });
  return null;
}

export default function Escena({ entrada, proyectos, agentes, jugadorPos, onCercania, onChoque, destino, zoom, aspectoJugador }: {
  entrada: React.MutableRefObject<EntradaMando>;
  proyectos: ProyectoJuego[];
  agentes: Agente[];
  /** Compartida con la página: es donde se plantan las cosas al construir. */
  jugadorPos: THREE.Vector3;
  onCercania: (c: Cercania) => void;
  onChoque: (id: string) => void;
  destino: React.MutableRefObject<{ x: number; z: number } | null>;
  zoom: React.MutableRefObject<number>;
  aspectoJugador?: Aspecto;
}) {
  const luzRef = useRef<THREE.DirectionalLight>(null);
  const medidas = useRef<Medidas>({ robot: Infinity, proyecto: null, agente: null });

  // Lo sólido del mundo. En una ref para que el personaje lo lea cada
  // fotograma sin volver a montarse cuando cambian los agentes.
  const obstaculos = useRef<Obstaculo[]>([]);
  obstaculos.current = useMemo(() => [
    ...agentes.map(a => ({
      id: a.id,
      x: a.x,
      z: a.z,
      radio: a.tipo === 'proyecto' ? RADIO_EDIFICIO : 1.1,
    })),
    // Los edificios de los proyectos de la Fase 1 también son sólidos: antes
    // se atravesaban y chocar con ellos no hacía nada (fallo reportado por
    // Eugenio). El prefijo distingue quién es quién al avisar del choque.
    ...proyectos.slice(0, 12).map((p, i) => ({
      id: `proy:${p.id}`,
      ...posicionProyecto(i),
      radio: RADIO_EDIFICIO,
    })),
  ], [agentes, proyectos]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 48, near: 0.5, far: 1400, position: [0, 11, 32] }}
      onCreated={(estado) => {
        estado.scene.fog = new THREE.Fog(PALETA.cielo, 140, 780);
        // Dev-only handle for in-browser scene inspection (used to debug the
        // blank-canvas bug of 2026-08-18; harmless and useful, so it stays).
        if ((import.meta as any).env?.DEV) (window as any).__JV = estado;
      }}
    >
      <Sky sunPosition={[120, 45, -70]} turbidity={6} rayleigh={2.2} />
      <ambientLight intensity={0.55} color={PALETA.luzAmbiente} />
      <hemisphereLight intensity={0.5} color={PALETA.luzCielo} groundColor={PALETA.luzSuelo} />
      <directionalLight
        ref={luzRef}
        castShadow
        position={[60, 95, -45]}
        intensity={1.7}
        color={PALETA.luzSol}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={5}
        shadow-camera-far={400}
        shadow-bias={-0.0004}
      />

      <Aldea />
      <EdificiosProyectos proyectos={proyectos} jugadorPos={jugadorPos} medidas={medidas} />
      <Agentes agentes={agentes} jugadorPos={jugadorPos} medidas={medidas} />
      <Robot jugadorPos={jugadorPos} medidas={medidas} />
      <Personaje
        entrada={entrada}
        jugadorPos={jugadorPos}
        luzRef={luzRef}
        obstaculos={obstaculos}
        onChoque={onChoque}
        destino={destino}
        zoom={zoom}
        aspecto={aspectoJugador}
      />
      <Coordinador medidas={medidas} onCercania={onCercania} />
    </Canvas>
  );
}
