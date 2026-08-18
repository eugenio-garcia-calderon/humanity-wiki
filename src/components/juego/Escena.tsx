// ============================================================================
// JUEGO VITAL — scene composition. Default export so the page can React.lazy
// it: this file (and everything it imports, including three.js) lives in its
// own chunk that only game visitors download.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Obstaculo } from './Personaje';
import { posicionProyecto, RADIO_EDIFICIO, piezasAldea, radioProp, type PiezaAldea } from './mapa';
import type { Aspecto } from './aspecto';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import type {
  Agente, Camara, Cercania, EntradaMando, ItemMundo, Medidas, OverrideMundo,
  ProyectoJuego, SeleccionHilo, SeleccionMundo, Vehiculo,
} from './tipos';
import { ObjetosMundo, SueloEditor, MarcadorMover, AnilloSeleccion, MovilFantasma, ItemVisual } from './Editor';
import { PiezaVisual } from './Aldea';
import { PALETA } from './paleta';
import { Aldea } from './Aldea';
import { Personaje } from './Personaje';
import { Robot } from './Robot';
import { EdificiosProyectos } from './EdificiosProyectos';
import { PantallaGrande, PANTALLA } from './Pantalla';
import { Agentes } from './Agentes';
import { PlazaProyecto, type DatosInterior } from './Interior';
import {
  PLAZA_LIM, PLAZA_SALIDA, RADIO_HABITANTE, habitantesDeSala,
} from './planta';

/**
 * Fondo y niebla. Fuera es el cielo de siempre; dentro de un proyecto, un
 * fondo oscuro con niebla corta, que es lo que hace que la sala se sienta
 * cerrada y que la luz de las puertas destaque.
 */
function Ambiente({ interior }: { interior: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    if (interior) {
      scene.background = new THREE.Color('#0d1117');
      // Niebla MUY larga: la sala mide 48 m de lado a lado y con una niebla
      // corta se tragaba las puertas y el núcleo — se veía todo negro.
      scene.fog = new THREE.Fog('#0d1117', 70, 210);
    } else {
      scene.background = null;
      scene.fog = new THREE.Fog(PALETA.cielo, 140, 780);
    }
  }, [interior, scene]);
  return null;
}

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

export default function Escena({ entrada, camara, proyectos, agentes, jugadorPos, onCercania, onChoque, destino, zoom, aspectoJugador, vehiculo, alturaVuelo, interior, onEntrarProyecto, onHablarAgente, mundo, editor, onPulsarMundo, onAgarrarMundo, onPulsarHilo, onSuelo, onSoltar, onAbrirItem, onPantalla, movilRef }: {
  entrada: React.MutableRefObject<EntradaMando>;
  camara: React.MutableRefObject<Camara>;
  proyectos: ProyectoJuego[];
  agentes: Agente[];
  /** Compartida con la página: es donde se plantan las cosas al construir. */
  jugadorPos: THREE.Vector3;
  onCercania: (c: Cercania) => void;
  onChoque: (id: string) => void;
  destino: React.MutableRefObject<{ x: number; z: number } | null>;
  zoom: React.MutableRefObject<number>;
  aspectoJugador?: Aspecto;
  vehiculo: Vehiculo;
  alturaVuelo: React.MutableRefObject<number>;
  /** Si está puesto, se juega DENTRO de un proyecto y la aldea no se dibuja. */
  interior: DatosInterior | null;
  /** Clic o toque sobre un edificio de proyecto: se entra sin caminar. */
  onEntrarProyecto: (p: ProyectoJuego) => void;
  /** Clic o toque sobre alguien de tu mundo: se abre su chat sin acercarse. */
  onHablarAgente: (a: Agente) => void;
  /** El mundo editable: objetos del jugador + retoques del pueblo semilla. */
  mundo: { items: ItemMundo[]; overrides: OverrideMundo[] };
  /** Estado del editor directo (lo lleva la página; aquí solo se dibuja).
   *  `activo` = hay usuario: sin sesión no se edita nada. */
  editor: { activo: boolean; moviendo: boolean; sel: SeleccionMundo | null };
  onPulsarMundo: (sel: SeleccionMundo) => void;
  /** Pinchar sin soltar un objeto: si arrastras, se mueve con el ratón. */
  onAgarrarMundo: (sel: SeleccionMundo, punto: { x: number; y: number }) => void;
  /** Pulsar un hilo dorado: se abre su editor (relación, texto, eliminar). */
  onPulsarHilo: (sel: SeleccionHilo) => void;
  /** Clic en suelo vacío en modo edición: abrir el panel de crear ahí. */
  onSuelo: (p: { x: number; z: number }) => void;
  /** Soltar el objeto que se estaba moviendo. */
  onSoltar: (p: { x: number; z: number }) => void;
  /** Fuera del modo edición: leer una nota, ver una imagen, abrir un documento. */
  onAbrirItem: (item: ItemMundo) => void;
  /** Pulsar la gran pantalla del cine: abre el panel de YouTube. */
  onPantalla: () => void;
  /** Última posición del ratón sobre el suelo mientras se mueve algo. */
  movilRef: React.MutableRefObject<{ x: number; z: number } | null>;
}) {
  const luzRef = useRef<THREE.DirectionalLight>(null);
  const medidas = useRef<Medidas>({ robot: Infinity, proyecto: null, agente: null });

  // El pueblo con los retoques del jugador aplicados: piezas movidas, con otro
  // diseño o eliminadas. UNA lista que comparten el dibujo, el rebote y el
  // editor — si cada uno la calculara, chocarías con una casa ya borrada.
  const piezas = useMemo<PiezaAldea[]>(() => {
    const ov = new Map(mundo.overrides.map(o => [o.seed_id, o]));
    const lista: PiezaAldea[] = [];
    for (const p of piezasAldea()) {
      const o = ov.get(p.seed_id);
      if (!o) { lista.push(p); continue; }
      if (o.eliminado) continue;
      lista.push({
        ...p,
        x: o.x ?? p.x,
        z: o.z ?? p.z,
        rot: o.rot ?? p.rot,
        modelo: o.modelo != null && o.modelo !== '' ? Number(o.modelo) : p.modelo,
      });
    }
    return lista;
  }, [mundo.overrides]);

  // Para los hilos de conocimiento: dónde está cada cosa a la que se apunta.
  const resolverDestino = useCallback((ref: string) => {
    if (ref.startsWith('item:')) {
      const it = mundo.items.find(x => x.id === ref.slice(5));
      return it ? { x: it.x, y: 1.8, z: it.z } : null;
    }
    if (ref.startsWith('agente:')) {
      const a = agentes.find(x => x.id === ref.slice(7));
      if (!a) return null;
      if (a.tipo === 'proyecto') return { x: a.x, y: 3.5, z: a.z };
      return { x: a.x, y: 1.8, z: a.z };
    }
    if (ref.startsWith('proy:')) {
      const i = proyectos.findIndex(x => x.id === ref.slice(5));
      if (i < 0) return null;
      const p = posicionProyecto(i);
      return { x: p.x, y: 4, z: p.z };
    }
    return null;
  }, [mundo.items, agentes, proyectos]);

  // Lo sólido del mundo. En una ref para que el personaje lo lea cada
  // fotograma sin volver a montarse cuando cambian los agentes.
  //
  // Dentro de un proyecto lo sólido es otra cosa: las puertas de sus grupos y
  // el portal de salida. Sale de `planta.ts`, el mismo sitio del que la
  // escena saca dónde dibujarlas — si no, entrarías por una puerta que ya no
  // está ahí.
  const obstaculos = useRef<Obstaculo[]>([]);
  obstaculos.current = useMemo(() => {
    if (interior) {
      // La plaza del proyecto: el portal de salida y la gente son sólidos
      // (chocar = salir / hablar). Los props plantados dentro también.
      const gente = habitantesDeSala(interior.items, 'personas', interior.agentes, interior.proyecto.id);
      return [
        { id: 'interior:salir', ...PLAZA_SALIDA, radio: 2 },
        ...gente.map((a, i) => {
          const ang = (i / Math.max(gente.length, 1)) * Math.PI * 2 - Math.PI / 2;
          return {
            id: `interior:persona:${a.id}`,
            x: Math.cos(ang) * 6.5, z: Math.sin(ang) * 6.5,
            radio: RADIO_HABITANTE,
          };
        }),
        ...mundo.items.filter(it => it.tipo === 'prop' && it.proyecto_id === interior.proyecto.id).map(it => ({
          id: `deco:item:${it.id}`, x: it.x, z: it.z, radio: radioProp(it.modelo),
        })),
      ];
    }
    return [
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
      // La gran pantalla del cine también es sólida: rebota, no abre ficha
      // (se abre pulsándola con el ratón).
      { id: 'deco:pantalla', x: PANTALLA.x, z: PANTALLA.z, radio: PANTALLA.radio },
      // Todo el mobiliario del pueblo es sólido y hace REBOTAR (petición de
      // Eugenio): farolas, bancos, árboles, casas… El prefijo `deco:` es lo
      // que le dice al personaje «rebota y no abras ninguna ficha».
      ...piezas.filter(p => p.radio > 0).map(p => ({
        id: `deco:semilla:${p.seed_id}`,
        x: p.x,
        z: p.z,
        radio: p.radio,
      })),
      // Los props que plantó el jugador también; sus notas y documentos no
      // (se atraviesan: son conocimiento flotando, no muros). Los objetos
      // anclados a un proyecto viven en SU plaza, no en la aldea.
      ...mundo.items.filter(it => it.tipo === 'prop' && !it.proyecto_id).map(it => ({
        id: `deco:item:${it.id}`,
        x: it.x,
        z: it.z,
        radio: radioProp(it.modelo),
      })),
    ];
  }, [agentes, proyectos, interior, piezas, mundo.items]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 48, near: 0.5, far: 1400, position: [0, 11, 32] }}
      onCreated={(estado) => {
        estado.scene.fog = new THREE.Fog(PALETA.cielo, 140, 780);
        estado.scene.background = null;
        // Dev-only handle for in-browser scene inspection (used to debug the
        // blank-canvas bug of 2026-08-18; harmless and useful, so it stays).
        if ((import.meta as any).env?.DEV) (window as any).__JV = estado;
      }}
    >
      {/* La plaza del proyecto es EXTERIOR (petición de Eugenio): siempre
          cielo de día, ya no existe la sala oscura. */}
      <Ambiente interior={false} />
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

      {interior ? (
        <>
          <PlazaProyecto datos={interior} onHablar={onHablarAgente} />
          {/* Lo plantado DENTRO de este proyecto, con el mismo editor de la
              aldea: pulsar, arrastrar, hilos y crear en el suelo. */}
          <ObjetosMundo
            items={mundo.items.filter(it => it.proyecto_id === interior.proyecto.id)}
            onPulsar={onPulsarMundo}
            onAgarrar={onAgarrarMundo}
            onPulsarHilo={onPulsarHilo}
            ocultar={editor.moviendo && editor.sel?.clase === 'item' ? editor.sel.id : undefined}
            resolverDestino={resolverDestino}
          />
          {editor.activo && (
            <>
              <SueloEditor moviendo={editor.moviendo} movil={movilRef} onSuelo={onSuelo} onSoltar={onSoltar} />
              {editor.moviendo && <MarcadorMover movil={movilRef} />}
              {editor.moviendo && editor.sel && editor.sel.clase === 'item' && (
                <MovilFantasma movil={movilRef} rot={editor.sel.rot}>
                  {(() => { const it = mundo.items.find(x => x.id === editor.sel!.id); return it ? <ItemVisual item={it} /> : null; })()}
                </MovilFantasma>
              )}
              {editor.sel && !editor.moviendo && editor.sel.clase === 'item' && <AnilloSeleccion x={editor.sel.x} z={editor.sel.z} />}
            </>
          )}
        </>
      ) : (
        <>
          <Aldea
            piezas={piezas}
            onPulsar={onPulsarMundo}
            onAgarrar={onAgarrarMundo}
            ocultar={editor.moviendo && editor.sel?.clase === 'semilla' ? editor.sel.id : undefined}
          />
          <ObjetosMundo
            items={mundo.items.filter(it => !it.proyecto_id)}
            onPulsar={onPulsarMundo}
            onAgarrar={onAgarrarMundo}
            onPulsarHilo={onPulsarHilo}
            ocultar={editor.moviendo && editor.sel?.clase === 'item' ? editor.sel.id : undefined}
            resolverDestino={resolverDestino}
          />
          <EdificiosProyectos proyectos={proyectos} jugadorPos={jugadorPos} medidas={medidas} onEntrar={onEntrarProyecto} />
          <PantallaGrande onAbrir={onPantalla} />
          <Agentes agentes={agentes} jugadorPos={jugadorPos} medidas={medidas} onHablar={onHablarAgente} />
          <Robot jugadorPos={jugadorPos} medidas={medidas} />
          {editor.activo && (
            <>
              <SueloEditor moviendo={editor.moviendo} movil={movilRef} onSuelo={onSuelo} onSoltar={onSoltar} />
              {editor.moviendo && <MarcadorMover movil={movilRef} />}
              {/* El objeto agarrado viaja con el ratón como un fantasma */}
              {editor.moviendo && editor.sel && (
                <MovilFantasma movil={movilRef} rot={editor.sel.rot}>
                  {editor.sel.clase === 'item'
                    ? (() => { const it = mundo.items.find(x => x.id === editor.sel!.id); return it ? <ItemVisual item={it} /> : null; })()
                    : (() => { const pz = piezas.find(x => x.seed_id === editor.sel!.id); return pz ? <PiezaVisual pieza={pz} /> : null; })()}
                </MovilFantasma>
              )}
              {editor.sel && !editor.moviendo && <AnilloSeleccion x={editor.sel.x} z={editor.sel.z} />}
            </>
          )}
        </>
      )}
      <Personaje
        entrada={entrada}
        camara={camara}
        jugadorPos={jugadorPos}
        luzRef={luzRef}
        obstaculos={obstaculos}
        onChoque={onChoque}
        destino={destino}
        zoom={zoom}
        limite={interior ? PLAZA_LIM : undefined}
        aspecto={aspectoJugador}
        vehiculo={vehiculo}
        alturaVuelo={alturaVuelo}
      />
      {/* Dentro de un proyecto no hay robot ni vecinos: el arbitraje de
          cercanía se apaga para que no arrastre la última medida de la aldea. */}
      {!interior && <Coordinador medidas={medidas} onCercania={onCercania} />}
    </Canvas>
  );
}
