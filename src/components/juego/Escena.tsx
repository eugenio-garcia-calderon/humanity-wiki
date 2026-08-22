// ============================================================================
// EL VISOR 3D — la escena (2026-08-22)
// ============================================================================
// Eugenio: «vamos a hacer un cambio drástico en el Mundo 3D […] ahora no será
// un mundo hiperrealista sino un mundo muy simplificado, con un centro y
// alrededor […] es todo como la sala del arquitecto de Matrix, con pantallas
// alrededor. Elimina toda la historia de las casas, árboles, elementos de
// decoración inútiles, y dejas solo los elementos que realmente son proyectos».
//
// QUÉ ERA ESTO ANTES, para entender el tamaño del cambio: una aldea de 118
// hectáreas con casas, un bosque comestible, un río, sendas, nubes con ciclo
// día/noche, mariposas de día y luciérnagas de noche, un cielo HDRI, sombras
// en cascada, un composer de efectos, cuatro oleadas de carga y tres niveles
// de calidad que bajaban solos si caían los FPS. Todo eso existía para que
// pareciera un sitio de verdad.
//
// Y ESA ERA LA TRAMPA. Lo que se venía a mirar —los proyectos, quién anda en
// ellos, lo publicado— estaba repartido entre la decoración, y encontrar algo
// era pasear. Un visor no es un paseo: es un sitio donde lo que hay se ve de
// una vez. Un centro, un anillo, y cada cosa en su sitio.
//
// LAS TRES REGLAS DE LO QUE QUEDA:
//   1. NADA DE LUZ. Ni sombras, ni sol, ni niebla de color, ni composer. Todos
//      los materiales son básicos (ver `visor/Piezas.tsx`).
//   2. TODO EQUIDISTANTE. Nada se coloca «a mano»: la posición sale del anillo
//      (`visor/anillo.ts`), que es el mismo que usan las colisiones y el
//      minimapa. Cuando cada uno calculaba su sitio, mover algo dejaba las
//      colisiones apuntando al hueco viejo.
//   3. TODAS LAS SALAS SON IGUALES. Cambia lo que hay en el anillo, no la sala.
//
// LO QUE SE HA CONSERVADO A PROPÓSITO: el editor (crear, mover, hilos), el
// minimapa, los productos —la DJI y el camión camperizado siguen siendo
// objetos con su ficha—, los portales, el viaje rápido y el cine de YouTube.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Obstaculo } from './Personaje';
import { Personaje } from './Personaje';
import type {
  Agente, Camara, Cercania, EntradaMando, ItemMundo, Medidas, OverrideMundo,
  ProyectoJuego, SeleccionHilo, SeleccionMundo,
} from './tipos';
import { ObjetosMundo, SueloEditor, MarcadorMover, AnilloSeleccion, MovilFantasma, ItemVisual } from './Editor';
import { CineYouTube, CINE_LIM, CINE_SALIDA, type CategoriaCine, type VideoCine } from './Cine';
import type { DatosInterior } from './Interior';
import { anillo, enAnillo, miraAlCentro, radioAnillo } from './visor/anillo';
import { AnilloGuia, HazDeLuz, Pantalla, Portal, SueloBlanco, TINTA, colorDePersona } from './visor/Piezas';
import { COLOR_SECCION, PORTALES_INICIO, SALAS, type ClaveSala } from './visor/salas';

/** Radio de una cosa del anillo, para las colisiones. Todas miden lo mismo
 *  porque todas son la misma pieza: eso es lo que hace que el anillo sea
 *  equidistante de verdad y no solo en el dibujo. */
const RADIO_PIEZA = 3;
/** Dónde está el portal de vuelta en cada sala: al sur, junto al centro.
 *
 *  DENTRO DEL ANILLO Y NO EN ÉL (2026-08-22, visto en pruebas): a 15 m caía
 *  casi encima de los portales de un anillo de diez proyectos y se leían dos
 *  nombres superpuestos. A 8 está claramente en el corro interior, que además
 *  es lo que dice lo que es: la salida no es una cosa más de las que has
 *  venido a ver.
 *
 *  Y SIEMPRE EN EL MISMO SITIO en todas las salas — buscar la salida en un
 *  lugar distinto en cada una es cómo uno se queda encerrado. */
const VUELTA = { x: 0, z: 8 };

/** El fondo: blanco, y sin niebla. Es lo primero que hay que quitar del mundo
 *  viejo — una niebla de color tiñe el blanco a los veinte metros. */
function Ambiente({ dentroDelCine }: { dentroDelCine: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    if (dentroDelCine) {
      // El cine sigue siendo una sala a oscuras: es lo único que se salva del
      // mundo anterior, y para ver una pantalla hace falta que esté oscuro.
      scene.background = new THREE.Color('#0d1117');
      scene.fog = new THREE.Fog('#0d1117', 70, 210);
      scene.environmentIntensity = 0.22;
    } else {
      scene.background = new THREE.Color(TINTA.suelo);
      scene.fog = null;
      scene.environmentIntensity = 1;
    }
  }, [dentroDelCine, scene]);
  return null;
}

/** Arbitra a qué te has acercado y solo avisa cuando la respuesta CAMBIA,
 *  nunca una vez por fotograma. */
function Coordinador({ medidas, onCercania }: {
  medidas: React.MutableRefObject<Medidas>;
  onCercania: (c: Cercania) => void;
}) {
  const ultima = useRef('');
  useFrame(() => {
    const m = medidas.current;
    let c: Cercania = null;
    if (m.agente && m.agente.d < 5) c = { tipo: 'agente', agente: m.agente.a };
    const firma = c ? `${c.tipo}:${'agente' in c ? c.agente.id : ''}` : '';
    if (firma !== ultima.current) {
      ultima.current = firma;
      onCercania(c);
    }
  });
  return null;
}

/** El rótulo del centro de la sala: dónde estás y qué hay aquí.
 *
 *  EN EL CENTRO Y NO EN UNA ESQUINA DE LA PANTALLA: en un espacio blanco todas
 *  las direcciones se parecen, y este cartel es la referencia que dice dónde
 *  está el medio. Además es lo primero que se ve al entrar por un portal. */
function Centro({ nombre, descripcion }: { nombre: string; descripcion: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[2.4, 2.5, 48]} />
        <meshBasicMaterial color={TINTA.lineaFuerte} />
      </mesh>
      <Billboard position={[0, 3.4, 0]}>
        <Text fontSize={1.05} color={TINTA.texto} anchorX="center" anchorY="middle" maxWidth={16}>
          {nombre}
        </Text>
        <Text position={[0, -0.95, 0]} fontSize={0.44} color={TINTA.contorno} anchorX="center" anchorY="middle" maxWidth={18}>
          {descripcion}
        </Text>
      </Billboard>
    </group>
  );
}

export default function Escena({
  entrada, camara, proyectos, agentes, jugadorPos, onCercania, onChoque, destino, zoom,
  interior, onEntrarProyecto, onSalirProyecto, onHablarAgente, mundo, editor,
  onPulsarMundo, onAgarrarMundo, onPulsarHilo, onSuelo, onSoltar, onAbrirItem,
  onPantalla, cine, onVerVideo, onSalirCine, onActualizarCine, movilRef,
  onAbrirTarjeta, onCrearTarea,
}: {
  entrada: React.MutableRefObject<EntradaMando>;
  camara: React.MutableRefObject<Camara>;
  proyectos: ProyectoJuego[];
  agentes: Agente[];
  jugadorPos: THREE.Vector3;
  onCercania: (c: Cercania) => void;
  onChoque: (id: string) => void;
  destino: React.MutableRefObject<{ x: number; z: number } | null>;
  zoom: React.MutableRefObject<number>;
  /** Si está puesto, se está DENTRO de un proyecto concreto: su sala. */
  interior: DatosInterior | null;
  onEntrarProyecto: (p: ProyectoJuego) => void;
  onSalirProyecto?: () => void;
  onHablarAgente: (a: Agente) => void;
  mundo: { items: ItemMundo[]; overrides: OverrideMundo[] };
  editor: { activo: boolean; moviendo: boolean; sel: SeleccionMundo | null };
  onPulsarMundo: (sel: SeleccionMundo) => void;
  onAgarrarMundo: (sel: SeleccionMundo, punto: { x: number; y: number }) => void;
  onPulsarHilo: (sel: SeleccionHilo) => void;
  onSuelo: (p: { x: number; z: number }) => void;
  onSoltar: (p: { x: number; z: number }) => void;
  onAbrirItem: (item: ItemMundo) => void;
  onPantalla: () => void;
  cine: { estado: string; categorias: CategoriaCine[] } | null;
  onVerVideo?: (v: VideoCine) => void;
  onSalirCine?: () => void;
  onActualizarCine?: () => void;
  movilRef: React.MutableRefObject<{ x: number; z: number } | null>;
  /** Pulsar una tarjeta del proyecto: su ficha. */
  onAbrirTarjeta?: (item: import('./tipos').ItemProyecto) => void;
  /** Crear una tarea dentro de la sala del proyecto. */
  onCrearTarea?: () => void;
}) {
  const medidas = useRef<Medidas>({ robot: Infinity, proyecto: null, agente: null });

  // ══ EN QUÉ SALA ESTÁS ═════════════════════════════════════════════════════
  // Vive AQUÍ y no en la página a propósito: entrar en «Proyectos» no cambia
  // de dirección ni pide nada al servidor, son los mismos datos ya cargados
  // puestos en otro anillo. Solo entrar en un proyecto concreto sube a la
  // página (`onEntrarProyecto`), porque eso sí trae sus tarjetas y su gente.
  const [sala, setSala] = useState<ClaveSala>('inicio');
  // Al entrar en un proyecto, la sala de sección se olvida: al salir vuelves a
  // «Proyectos», que es de donde entraste, y no al inicio.
  const salaDeVuelta = useRef<ClaveSala>('proyectos');

  const personas = useMemo(() => agentes.filter(a => a.tipo === 'persona'), [agentes]);
  const publicaciones = useMemo(
    () => mundo.items.filter(it => !it.proyecto_id && ['nota', 'documento', 'imagen', 'enlace', 'lienzo', 'mapa'].includes(it.tipo)),
    [mundo.items],
  );
  const herramientas = useMemo(
    () => mundo.items.filter(it => !it.proyecto_id && ['prop', 'producto', 'video', 'musica'].includes(it.tipo)),
    [mundo.items],
  );

  /** Qué hay al otro lado de cada portal, en colores, para su previa cenital.
   *  Sale de los MISMOS datos que la sala de destino: si aquí se ven tres
   *  puntos, allí hay tres cosas. No puede desincronizarse. */
  const previaDe = useCallback((clave: ClaveSala): string[] => {
    const color = COLOR_SECCION[clave];
    const n = clave === 'proyectos' ? proyectos.length
      : clave === 'personas' ? personas.length
        : clave === 'publicaciones' ? publicaciones.length
          : clave === 'herramientas' ? herramientas.length : 0;
    if (clave === 'personas') return personas.slice(0, 12).map(p => colorDePersona(p.id));
    return Array.from({ length: Math.min(n, 12) }, () => color);
  }, [proyectos.length, personas, publicaciones.length, herramientas.length]);

  // ══ LO QUE HAY EN EL ANILLO DE ESTA SALA ══════════════════════════════════
  // Una sola lista, y de ella salen el dibujo, las colisiones y el minimapa.
  interface Pieza {
    clase: 'portal-seccion' | 'proyecto' | 'persona' | 'cosa' | 'tarjeta';
    id: string;
    nombre: string;
    subtitulo?: string;
    color: string;
    portada?: string | null;
    previa?: string[];
    x: number; z: number; rot: number;
    datos?: any;
  }

  const piezas = useMemo<Pieza[]>(() => {
    // Dentro de un proyecto: su gente y sus cosas (la página ya las trae).
    if (interior) {
      // SU GENTE Y SUS TARJETAS, EN EL MISMO ANILLO (Eugenio: «en una sala de
      // proyecto, si hay personas asociadas estarán en esa sala»). Las
      // personas primero: son lo que se ha pedido que se vea, y así caen
      // enfrente de quien entra.
      const gente = interior.agentes.filter(a => a.tipo === 'persona');
      const pendientes = interior.items.filter(it => it.estado !== 'hecho');
      const total = gente.length + pendientes.length;
      const dePersonas: Pieza[] = gente.map((a, i) => {
        const p = enAnillo(i, Math.max(total, 1));
        return {
          clase: 'persona' as const, id: a.id, nombre: a.nombre,
          subtitulo: a.rol || undefined, color: colorDePersona(a.id),
          x: p.x, z: p.z, rot: miraAlCentro(p), datos: a,
        };
      });
      const deTarjetas: Pieza[] = pendientes.map((it, j) => {
        const p = enAnillo(gente.length + j, Math.max(total, 1));
        return {
          clase: 'tarjeta' as const, id: it.id, nombre: it.titulo,
          subtitulo: it.resumen || undefined, color: interior.color || COLOR_SECCION.proyectos,
          x: p.x, z: p.z, rot: miraAlCentro(p), datos: it,
        };
      });
      return [...dePersonas, ...deTarjetas];
    }
    if (sala === 'inicio') {
      const n = PORTALES_INICIO.length;
      return PORTALES_INICIO.map((clave, i) => {
        const p = enAnillo(i, n);
        return {
          clase: 'portal-seccion' as const, id: clave, nombre: SALAS[clave].nombre,
          color: COLOR_SECCION[clave], previa: previaDe(clave),
          x: p.x, z: p.z, rot: miraAlCentro(p),
        };
      });
    }
    if (sala === 'proyectos') {
      const n = proyectos.length;
      return proyectos.map((pr, i) => {
        const p = enAnillo(i, Math.max(n, 1));
        // La previa de un proyecto: su gente. Es lo que se pidió que hubiera
        // dentro de su sala, así que es lo que tiene que asomar por su puerta.
        const suGente = agentes.filter(a => a.tipo === 'persona' && (a.proyecto_ids || []).includes(pr.id));
        return {
          clase: 'proyecto' as const, id: pr.id, nombre: pr.titulo,
          subtitulo: `${pr.tarjetas - pr.hechas} por hacer`,
          color: COLOR_SECCION.proyectos,
          previa: suGente.slice(0, 12).map(a => colorDePersona(a.id)),
          x: p.x, z: p.z, rot: miraAlCentro(p), datos: pr,
        };
      });
    }
    if (sala === 'personas') {
      const n = personas.length;
      return personas.map((a, i) => {
        const p = enAnillo(i, Math.max(n, 1));
        return {
          clase: 'persona' as const, id: a.id, nombre: a.nombre,
          subtitulo: a.rol || undefined, color: colorDePersona(a.id),
          x: p.x, z: p.z, rot: miraAlCentro(p), datos: a,
        };
      });
    }
    const cosas = sala === 'publicaciones' ? publicaciones : herramientas;
    const n = cosas.length;
    return cosas.map((it, i) => {
      const p = enAnillo(i, Math.max(n, 1));
      return {
        clase: 'cosa' as const, id: it.id, nombre: it.nombre || it.texto?.slice(0, 40) || 'Sin nombre',
        subtitulo: it.tipo, color: COLOR_SECCION[sala],
        portada: it.tipo === 'imagen' ? it.url : null,
        x: p.x, z: p.z, rot: miraAlCentro(p), datos: it,
      };
    });
  }, [sala, interior, proyectos, personas, publicaciones, herramientas, agentes, previaDe]);

  const radio = useMemo(() => radioAnillo(Math.max(piezas.length, 1)), [piezas.length]);

  // ══ LO SÓLIDO ════════════════════════════════════════════════════════════
  // De la MISMA lista que se dibuja. Es la regla 2 de arriba, y es lo que
  // impide chocar con lo que ya no está.
  const obstaculos = useRef<Obstaculo[]>([]);
  obstaculos.current = useMemo(() => {
    if (cine) return [{ id: 'cine:salir', ...CINE_SALIDA, radio: 2 }];
    const lista: Obstaculo[] = piezas.map(p => ({
      id: p.clase === 'proyecto' ? `proy:${p.id}`
        : p.clase === 'portal-seccion' ? `sala:${p.id}`
          : p.clase === 'persona' ? p.id
            : p.clase === 'tarjeta' ? `tarjeta:${p.id}`
              : `deco:item:${p.id}`,
      x: p.x, z: p.z, radio: RADIO_PIEZA,
    }));
    // El portal de vuelta, en todas las salas menos en el inicio (de allí no
    // se vuelve a ningún sitio: es el suelo del recorrido).
    if (sala !== 'inicio' || interior) lista.push({ id: 'visor:volver', ...VUELTA, radio: 2 });
    return lista;
  }, [piezas, sala, interior, cine]);

  /** Para los hilos de conocimiento: dónde está cada cosa a la que se apunta. */
  const resolverDestino = useCallback((ref: string) => {
    const busca = (id: string) => piezas.find(p => p.id === id);
    if (ref.startsWith('item:')) {
      const it = mundo.items.find(x => x.id === ref.slice(5));
      return it ? { x: it.x, y: 1.8, z: it.z } : null;
    }
    if (ref.startsWith('agente:')) {
      const p = busca(ref.slice(7));
      return p ? { x: p.x, y: 2.2, z: p.z } : null;
    }
    if (ref.startsWith('proy:')) {
      const p = busca(ref.slice(5));
      return p ? { x: p.x, y: 3.4, z: p.z } : null;
    }
    return null;
  }, [piezas, mundo.items]);

  // ══ ENTRAR Y SALIR ═══════════════════════════════════════════════════════
  const entrarEn = useCallback((clave: ClaveSala) => {
    setSala(clave);
    salaDeVuelta.current = clave;
    // Apareces al sur del centro, mirando al anillo: la misma llegada en todas
    // las salas. Sin esto entrarías donde estabas en la sala anterior, que
    // puede ser el borde del mundo.
    destino.current = { x: 0, z: 4 };
  }, [destino]);

  const volver = useCallback(() => {
    if (interior) { onSalirProyecto?.(); return; }
    setSala('inicio');
    destino.current = { x: 0, z: 4 };
  }, [interior, onSalirProyecto, destino]);

  /** El choque avisa a la página, salvo cuando es cosa de la escena (entrar en
   *  una sala o volver): eso se resuelve aquí y no sube. */
  const alChocar = useCallback((id: string) => {
    if (id === 'visor:volver') { volver(); return; }
    if (id.startsWith('sala:')) { entrarEn(id.slice(5) as ClaveSala); return; }
    onChoque(id);
  }, [volver, entrarEn, onChoque]);

  // AL SALIR DE UN PROYECTO SE VUELVE A «PROYECTOS», no al inicio: es de donde
  // se entró. Y esto tiene que mirar el paso de «estaba dentro» a «ya no»,
  // no el valor de `interior` a secas — al montar la escena `interior` ya es
  // null, y sin la comparación el visor arrancaba directamente en la sala de
  // proyectos en vez de en la de inicio (visto en pruebas, 2026-08-22).
  const estabaDentro = useRef(false);
  useEffect(() => {
    if (interior) { estabaDentro.current = true; salaDeVuelta.current = 'proyectos'; return; }
    if (estabaDentro.current) {
      estabaDentro.current = false;
      setSala(salaDeVuelta.current);
      destino.current = { x: 0, z: 4 };
    }
  }, [interior, destino]);

  const def = interior
    ? { nombre: interior.proyecto.titulo, descripcion: `${piezas.length} ${piezas.length === 1 ? 'persona' : 'personas'} en este proyecto` }
    : SALAS[sala];

  return (
    <Canvas
      // SIN SOMBRAS. No es un ajuste de calidad: es que no hay ninguna luz que
      // las proyecte, y dejarlo activado reservaría un mapa de sombras que
      // nadie usa.
      shadows={false}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      // MÁS CENITAL (Eugenio: «quiero que la vista sea algo más cenital»): la
      // cámara arranca más alta y más atrás que en la aldea (11 y 32). Desde
      // aquí se ve el anillo entero de una vez, que es la gracia de que las
      // cosas estén repartidas en círculo.
      camera={{ fov: 46, near: 0.5, far: 600, position: [0, 26, 34] }}
      onCreated={(estado) => {
        // Sin curva de cine: aquí no hay rango dinámico que comprimir, y la
        // ACES apagaba el blanco a un gris perla.
        estado.gl.toneMapping = THREE.NoToneMapping;
        estado.scene.background = new THREE.Color(TINTA.suelo);
        estado.scene.fog = null;
        if ((import.meta as any).env?.DEV) (window as any).__JV = estado;
      }}
    >
      <Ambiente dentroDelCine={!!cine} />
      {/* Una ambiental y nada más. Los materiales del visor son básicos y ni
          la miran; está para los objetos del editor y los productos, que sí
          son modelos de verdad y sin luz saldrían negros. */}
      <ambientLight intensity={1.15} />

      {cine ? (
        <CineYouTube
          categorias={cine.categorias}
          estado={cine.estado}
          onVer={(v) => onVerVideo?.(v)}
          onActualizar={() => onActualizarCine?.()}
          onSalir={() => onSalirCine?.()}
        />
      ) : (
        <>
          <SueloBlanco />
          <AnilloGuia radio={radio} />
          <Centro nombre={def.nombre} descripcion={def.descripcion} />

          {piezas.map(p => {
            if (p.clase === 'portal-seccion') {
              return (
                <Portal
                  key={p.id} x={p.x} z={p.z} rot={p.rot}
                  nombre={p.nombre} contenido={p.previa || []} color={p.color}
                  onEntrar={() => entrarEn(p.id as ClaveSala)}
                />
              );
            }
            if (p.clase === 'proyecto') {
              return (
                <Portal
                  key={p.id} x={p.x} z={p.z} rot={p.rot}
                  nombre={p.nombre} contenido={p.previa || []} color={p.color}
                  onEntrar={() => onEntrarProyecto(p.datos as ProyectoJuego)}
                  onAgarrar={(e: any) => {
                    if (e.nativeEvent?.button) return;
                    onAgarrarMundo(
                      { clase: 'semilla', id: `proy:${p.id}`, tipo: 'portal', etiqueta: p.nombre, x: p.x, z: p.z, rot: 0 },
                      { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
                    );
                  }}
                />
              );
            }
            if (p.clase === 'persona') {
              return (
                <HazDeLuz
                  key={p.id} x={p.x} z={p.z} color={p.color}
                  nombre={p.nombre}
                  onPulsar={() => onHablarAgente(p.datos as Agente)}
                />
              );
            }
            return (
              <Pantalla
                key={p.id} x={p.x} z={p.z} rot={p.rot}
                titulo={p.nombre} subtitulo={p.subtitulo} portada={p.portada}
                color={p.color}
                onPulsar={() => (p.clase === 'tarjeta'
                  ? onAbrirTarjeta?.(p.datos)
                  : onAbrirItem(p.datos as ItemMundo))}
              />
            );
          })}

          {/* EL PORTAL DE VUELTA. En todas las salas menos en el inicio, y
              siempre en el mismo sitio: al sur, justo detrás de donde
              apareces. */}
          {(sala !== 'inicio' || interior) && (
            <Portal
              x={VUELTA.x} z={VUELTA.z} rot={Math.PI}
              nombre="Volver"
              contenido={interior ? previaDe('proyectos') : PORTALES_INICIO.map(c => COLOR_SECCION[c])}
              onEntrar={volver}
            />
          )}

          {/* CREAR UNA TAREA, en el centro de la sala del proyecto: donde
              siempre estuvo el pedestal «+» de la plaza. Es la única cosa que
              se crea desde dentro del 3D sin pasar por el editor. */}
          {interior && onCrearTarea && (
            <group position={[0, 0, -4]} onClick={(e) => { e.stopPropagation(); onCrearTarea(); }}>
              <mesh position={[0, 1.1, 0]}>
                <boxGeometry args={[1.5, 0.16, 0.16]} />
                <meshBasicMaterial color={COLOR_SECCION.proyectos} />
              </mesh>
              <mesh position={[0, 1.1, 0]}>
                <boxGeometry args={[0.16, 1.5, 0.16]} />
                <meshBasicMaterial color={COLOR_SECCION.proyectos} />
              </mesh>
              <Billboard position={[0, 2.3, 0]}>
                <Text fontSize={0.38} color={TINTA.contorno} anchorX="center" anchorY="middle">Nueva tarea</Text>
              </Billboard>
            </group>
          )}

          {/* SI LA SALA ESTÁ VACÍA, SE DICE. Un anillo sin nada es
              indistinguible de una carga a medias, y quien entra no sabe si
              esperar o si es que no tiene nada todavía. */}
          {piezas.length === 0 && (
            <Billboard position={[0, 1.6, -6]}>
              <Text fontSize={0.5} color={TINTA.contorno} anchorX="center" anchorY="middle" maxWidth={20}>
                Aquí todavía no hay nada tuyo.
              </Text>
            </Billboard>
          )}

          {/* LO QUE HAYAS PLANTADO TÚ sigue exactamente donde lo dejaste: los
              objetos del editor no se recolocan en el anillo. El anillo es
              para lo que la plataforma ordena sola; lo que tú pusiste a mano
              en un sitio, en ese sitio se queda. */}
          <ObjetosMundo
            items={mundo.items.filter(it => (interior ? it.proyecto_id === interior.proyecto.id : !it.proyecto_id))}
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
              {editor.sel && !editor.moviendo && <AnilloSeleccion x={editor.sel.x} z={editor.sel.z} />}
            </>
          )}
        </>
      )}

      <Personaje
        entrada={entrada}
        camara={camara}
        jugadorPos={jugadorPos}
        obstaculos={obstaculos}
        onChoque={alChocar}
        destino={destino}
        zoom={zoom}
        limite={cine ? CINE_LIM : radio + 26}
      />
      {!interior && <Coordinador medidas={medidas} onCercania={onCercania} />}
      {/* La gran pantalla del cine, en el centro de «Herramientas»: es una
          herramienta más y ahí es donde se busca. */}
      {!cine && !interior && sala === 'herramientas' && (
        <group position={[0, 0, -radio * 0.45]} onClick={(e) => { e.stopPropagation(); onPantalla(); }}>
          <mesh position={[0, 3, 0]}>
            <planeGeometry args={[9, 5]} />
            <meshBasicMaterial color={TINTA.texto} />
          </mesh>
          <Billboard position={[0, 6.4, 0]}>
            <Text fontSize={0.5} color={TINTA.texto} anchorX="center" anchorY="middle">Cine</Text>
          </Billboard>
        </group>
      )}
    </Canvas>
  );
}
