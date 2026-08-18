// ============================================================================
// JUEGO VITAL — scene composition. Default export so the page can React.lazy
// it: this file (and everything it imports, including three.js) lives in its
// own chunk that only game visitors download.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Obstaculo } from './Personaje';
import { posicionProyecto, posicionesProyectos, RADIO_EDIFICIO, piezasAldea, radioProp, type PiezaAldea } from './mapa';
import type { Aspecto } from './aspecto';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, PerformanceMonitor } from '@react-three/drei';
import { Efectos } from './Efectos';
import { Hierba } from './Hierba';
import { detectarCalidad, bajarNivel, AJUSTES, type NivelCalidad } from './calidad';
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
import { PantallaGrande } from './Pantalla';
import { CineYouTube, CINE_LIM, CINE_SALIDA, type CategoriaCine, type VideoCine } from './Cine';
import { PortalVerde } from './PortalVerde';
import { Agentes } from './Agentes';
import { PlazaProyecto, cosasDePlaza, type DatosInterior } from './Interior';
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
      // El cine es una sala oscura: la luz del cielo HDRI casi no entra.
      scene.environmentIntensity = 0.22;
    } else {
      scene.background = null;
      scene.fog = new THREE.Fog(PALETA.cielo, 140, 780);
      scene.environmentIntensity = 0.6;
    }
  }, [interior, scene]);
  return null;
}

/** El vigilante de FPS con periodo de gracia: los primeros segundos de juego
 *  siempre van a trompicones (compilar shaders, subir texturas) y no deben
 *  costar un escalón de calidad. */
function VigilanteDeCalidad({ onBajar }: { onBajar: () => void }) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setListo(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!listo) return null;
  return <PerformanceMonitor flipflops={2} onDecline={onBajar} />;
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

export default function Escena({ entrada, camara, proyectos, agentes, jugadorPos, onCercania, onChoque, destino, zoom, aspectoJugador, vehiculo, alturaVuelo, interior, onEntrarProyecto, onSalirProyecto, onHablarAgente, mundo, editor, onPulsarMundo, onAgarrarMundo, onPulsarHilo, onSuelo, onSoltar, onAbrirItem, onPantalla, cine, onVerVideo, onSalirCine, onActualizarCine, onAbrirTarjeta, movilRef }: {
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
  /** Clic o toque sobre el portal «Salir a la aldea» de una plaza. */
  onSalirProyecto?: () => void;
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
  /** Pulsar la gran pantalla del cine: entrar en la sala 3D. */
  onPantalla: () => void;
  /** Si está puesto, se está DENTRO del cine del agente de YouTube. */
  cine: { estado: string; categorias: CategoriaCine[] } | null;
  onVerVideo?: (v: VideoCine) => void;
  onSalirCine?: () => void;
  onActualizarCine?: () => void;
  /** Pulsar (o chocar con) una tarjeta del corro de la plaza: su ficha. */
  onAbrirTarjeta?: (item: import('./tipos').ItemProyecto) => void;
  /** Última posición del ratón sobre el suelo mientras se mueve algo. */
  movilRef: React.MutableRefObject<{ x: number; z: number } | null>;
}) {
  const luzRef = useRef<THREE.DirectionalLight>(null);
  const medidas = useRef<Medidas>({ robot: Infinity, proyecto: null, agente: null });

  // El pueblo con los retoques del jugador aplicados: piezas movidas, con otro
  // diseño o eliminadas. UNA lista que comparten el dibujo, el rebote y el
  // editor — si cada uno la calculara, chocarías con una casa ya borrada.
  // Título de cada proyecto, para los rótulos de los portales con forma.
  const titulosProy = useMemo(() => new Map(proyectos.map(p => [p.id, p.titulo])), [proyectos]);

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
        portalProyectoId: o.portal_proyecto_id || null,
        portalTitulo: o.portal_proyecto_id ? titulosProy.get(o.portal_proyecto_id) : undefined,
      });
    }
    return lista;
  }, [mundo.overrides, titulosProy]);

  // Los portales del distrito, con los ARRASTRES del jugador aplicados.
  // `representados` = proyectos que YA tienen su portal con forma propia en
  // el mundo (un objeto, una pieza o un agente): su espiral del distrito se
  // oculta para no tener dos puertas al mismo mapa.
  const representados = useMemo(() => {
    const s = new Set<string>();
    for (const a of agentes) if (a.proyecto_id) s.add(a.proyecto_id);
    for (const it of mundo.items) if (it.portal_proyecto_id) s.add(it.portal_proyecto_id);
    for (const o of mundo.overrides) if (o.portal_proyecto_id) s.add(o.portal_proyecto_id);
    return s;
  }, [agentes, mundo.items, mundo.overrides]);
  const posProyectos = useMemo(
    () => posicionesProyectos(proyectos, mundo.overrides, representados),
    [proyectos, mundo.overrides, representados],
  );

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
      if (i < 0 || !posProyectos[i]) return null;
      return { x: posProyectos[i].x, y: 4, z: posProyectos[i].z };
    }
    return null;
  }, [mundo.items, agentes, proyectos, posProyectos]);

  // Lo sólido del mundo. En una ref para que el personaje lo lea cada
  // fotograma sin volver a montarse cuando cambian los agentes.
  //
  // Dentro de un proyecto lo sólido es otra cosa: las puertas de sus grupos y
  // el portal de salida. Sale de `planta.ts`, el mismo sitio del que la
  // escena saca dónde dibujarlas — si no, entrarías por una puerta que ya no
  // está ahí.
  const obstaculos = useRef<Obstaculo[]>([]);
  obstaculos.current = useMemo(() => {
    if (cine) {
      return [{ id: 'cine:salir', ...CINE_SALIDA, radio: 2 }];
    }
    if (interior) {
      // La plaza del proyecto: el portal de salida y la gente son sólidos
      // (chocar = salir / hablar). Los props plantados dentro también.
      const gente = habitantesDeSala(interior.items, 'personas', interior.agentes, interior.proyecto.id);
      return [
        { id: 'interior:salir', ...PLAZA_SALIDA, radio: 2 },
        // Las TARJETAS del corro: chocar con una la abre (id sin `deco:`
        // para que Personaje avise del golpe).
        ...cosasDePlaza(interior.items, interior.agentes)
          .filter(c => c.tipo === 'tarjeta' && c.item)
          .map(c => ({ id: `tarjeta:${c.item!.id}`, x: c.x, z: c.z, radio: 1.4 })),
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
        ...(posProyectos[i] || posicionProyecto(i)),
        radio: RADIO_EDIFICIO,
        // Un portal quitado del mapa tampoco choca (radio 0 = se ignora).
      })).filter((_, i) => !posProyectos[i]?.eliminado),
      // Todo el mobiliario del pueblo es sólido y hace REBOTAR (petición de
      // Eugenio): farolas, bancos, árboles, casas… El prefijo `deco:` es lo
      // que le dice al personaje «rebota y no abras ninguna ficha».
      // Una pieza convertida en PORTAL avisa del choque (entrar); las demás
      // solo rebotan (el prefijo `deco:` silencia el aviso en Personaje).
      ...piezas.filter(p => p.radio > 0).map(p => ({
        id: p.portalProyectoId ? `portalpieza:${p.seed_id}` : `deco:semilla:${p.seed_id}`,
        x: p.x,
        z: p.z,
        radio: p.radio,
      })),
      // Los props que plantó el jugador también; sus notas y documentos no
      // (se atraviesan: son conocimiento flotando, no muros). Los objetos
      // anclados a un proyecto viven en SU plaza, no en la aldea. Un objeto
      // convertido en PORTAL sí es sólido y avisa: chocar es entrar.
      ...mundo.items.filter(it => !it.proyecto_id && (it.tipo === 'prop' || it.portal_proyecto_id)).map(it => ({
        id: it.portal_proyecto_id ? `portalitem:${it.id}` : `deco:item:${it.id}`,
        x: it.x,
        z: it.z,
        radio: it.tipo === 'prop' ? radioProp(it.modelo) : 1.5,
      })),
    ];
  }, [agentes, proyectos, posProyectos, interior, piezas, mundo.items, cine]);

  // Nivel de calidad: se detecta una vez al montar y solo puede BAJAR (si los
  // FPS caen de forma sostenida, PerformanceMonitor avisa). Nunca sube solo:
  // subir y bajar en bucle se nota más que quedarse en el escalón estable.
  const [nivel, setNivel] = useState<NivelCalidad>(() => detectarCalidad());
  const ajustes = AJUSTES[nivel];

  return (
    <Canvas
      // «percentage» = PCF a secas: en este three el PCFSoft clásico está
      // retirado (el renderer lo degrada solo, avisando por consola). El
      // borde suave lo pone el radio de penumbra de la luz, más abajo.
      shadows="percentage"
      dpr={ajustes.dpr}
      // Con el composer de efectos el antialias del navegador no pinta nada
      // (lo hace SMAA); en calidad baja no hay composer y sí se necesita.
      gl={{ antialias: !ajustes.efectos, powerPreference: 'high-performance' }}
      camera={{ fov: 48, near: 0.5, far: 1400, position: [0, 11, 32] }}
      onCreated={(estado) => {
        // Color «de cine»: curva ACES con algo más de exposición. Con el
        // composer activo esto lo pisa el efecto ToneMapping (Efectos.tsx);
        // aquí queda para la calidad baja, que va sin composer.
        estado.gl.toneMapping = THREE.ACESFilmicToneMapping;
        estado.gl.toneMappingExposure = 1.12;
        estado.scene.fog = new THREE.Fog(PALETA.cielo, 140, 780);
        estado.scene.background = null;
        // Dev-only handle for in-browser scene inspection (used to debug the
        // blank-canvas bug of 2026-08-18; harmless and useful, so it stays).
        if ((import.meta as any).env?.DEV) (window as any).__JV = estado;
      }}
    >
      {/* Baja un escalón de calidad si los FPS caen de verdad (dos rachas).
          Espera unos segundos antes de vigilar: la carga inicial (compilar
          materiales, cargar el cielo) siempre da un bajón que no cuenta. */}
      {nivel !== 'baja' && (
        <VigilanteDeCalidad onBajar={() => setNivel(bajarNivel)} />
      )}
      {/* La plaza del proyecto es EXTERIOR (petición de Eugenio): siempre
          cielo de día, ya no existe la sala oscura. */}
      <Ambiente interior={!!cine} />
      <Sky sunPosition={[120, 45, -70]} turbidity={6} rayleigh={2.2} />
      {/* La luz ambiental REAL: un cielo fotográfico (CC0, autoalojado) que
          baña la escena — es lo que da reflejos y rebotes creíbles a los
          materiales. Las luces planas de antes bajan para dejarle sitio. */}
      <Environment files="/modelos-juego/cielo/dia_despejado_1k.hdr" />
      <ambientLight intensity={0.18} color={PALETA.luzAmbiente} />
      <hemisphereLight intensity={0.25} color={PALETA.luzCielo} groundColor={PALETA.luzSuelo} />
      <directionalLight
        // Al cambiar el lado del mapa de sombras three no lo reconstruye
        // solo: la key fuerza una luz nueva cuando cambia el nivel.
        key={`sol-${nivel}`}
        ref={luzRef}
        castShadow
        position={[60, 95, -45]}
        intensity={1.9}
        color={PALETA.luzSol}
        shadow-mapSize-width={ajustes.sombras}
        shadow-mapSize-height={ajustes.sombras}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-camera-near={5}
        shadow-camera-far={400}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
        shadow-radius={4}
      />

      {cine ? (
        <CineYouTube
          categorias={cine.categorias}
          estado={cine.estado}
          onVer={(v) => onVerVideo?.(v)}
          onActualizar={() => onActualizarCine?.()}
          onSalir={() => onSalirCine?.()}
        />
      ) : interior ? (
        <>
          <PlazaProyecto datos={interior} onHablar={onHablarAgente} onSalir={onSalirProyecto} onAbrirTarjeta={onAbrirTarjeta} />
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
          {/* La hierba de la fase 1: cuántas matas, lo dice la calidad. */}
          <Hierba cantidad={ajustes.hierba} />
          <ObjetosMundo
            items={mundo.items.filter(it => !it.proyecto_id)}
            onPulsar={onPulsarMundo}
            onAgarrar={onAgarrarMundo}
            onPulsarHilo={onPulsarHilo}
            ocultar={editor.moviendo && editor.sel?.clase === 'item' ? editor.sel.id : undefined}
            resolverDestino={resolverDestino}
          />
          <EdificiosProyectos
            proyectos={proyectos}
            posiciones={posProyectos}
            jugadorPos={jugadorPos}
            medidas={medidas}
            onEntrar={onEntrarProyecto}
            onAgarrar={(p, pos, e) => {
              if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
              onAgarrarMundo(
                { clase: 'semilla', id: `proy:${p.id}`, tipo: 'portal', etiqueta: p.titulo, x: pos.x, z: pos.z, rot: 0 },
                { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
              );
            }}
          />
          {/* La gran pantalla vive como pieza (pantalla:0): posición con los
              arrastres aplicados; ocultada si va agarrada (la lleva el
              fantasma). El clic entra al cine; pinchar sin soltar la mueve. */}
          {(() => {
            const pz = piezas.find(p => p.seed_id === 'pantalla:0');
            if (!pz || (editor.moviendo && editor.sel?.clase === 'semilla' && editor.sel.id === 'pantalla:0')) return null;
            return (
              <PantallaGrande
                x={pz.x} z={pz.z} rot={pz.rot}
                onAbrir={onPantalla}
                onAgarrar={(e) => {
                  if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
                  onAgarrarMundo(
                    { clase: 'semilla', id: 'pantalla:0', tipo: 'pantalla', etiqueta: 'Gran pantalla', x: pz.x, z: pz.z, rot: pz.rot },
                    { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
                  );
                }}
              />
            );
          })()}
          <Agentes
            agentes={agentes}
            jugadorPos={jugadorPos}
            medidas={medidas}
            onHablar={onHablarAgente}
            onAgarrarProyecto={(a, e) => {
              if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
              onAgarrarMundo(
                { clase: 'semilla', id: `agente:${a.id}`, tipo: 'portal', etiqueta: a.nombre, x: a.x, z: a.z, rot: 0 },
                { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
              );
            }}
          />
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
                    : editor.sel.tipo === 'portal'
                      ? <PortalVerde radio={2.4} />
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
        limite={cine ? CINE_LIM : interior ? PLAZA_LIM : undefined}
        aspecto={aspectoJugador}
        vehiculo={vehiculo}
        alturaVuelo={alturaVuelo}
      />
      {/* Dentro de un proyecto no hay robot ni vecinos: el arbitraje de
          cercanía se apaga para que no arrastre la última medida de la aldea. */}
      {!interior && <Coordinador medidas={medidas} onCercania={onCercania} />}
      <Efectos nivel={nivel} />
    </Canvas>
  );
}
