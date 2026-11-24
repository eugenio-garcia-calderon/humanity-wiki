// ============================================================================
// AEROMÓVIL GOTA · visor 3D por capas (2026-11-05)
// ============================================================================
// Three.js a mano, sin R3F: la escena se reconstruye entera al cambiar un
// parámetro (unos 200 objetos, pocos milisegundos) y la parte móvil
// (suspensión, inclinación, ruedas, puertas) se rehace sola mientras se anima.
//
// La piel del carenado se construye sobre una rejilla (u, θ) cuyas líneas
// incluyen los bordes de cristales, paneles y puertas: así cada celda cae
// entera en una zona y las puertas se pueden abrir dejando su hueco.
//
// Los colores de los materiales viven en visor/materiales.ts y no en `src/components/ui/`
// porque son colores de material 3D (aluminio, neumático, fibra), no de
// interfaz. Anotado en 02_TECH_DEBT.md.
//
// 2026-11-16 (refactor «ordenar»): this file keeps only the React component (scene, camera, animation loop).
// Each vehicle's builder, the materials, the basic parts and the dimension lines live in ./visor/ (see CLAUDE.md).
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { DoorOpen, MoveDiagonal, PackageOpen, Trash2, X } from 'lucide-react';
import { Button, Card } from '../ui/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// Reflections of a real place (2026-11-09): «Rooitou Park» by Poly Haven (CC0, via pmndrs/drei-assets), a sunny
// sky with a tree line. Its sun is painted out (the viewer adds its own, aligned with the shadow) and the grass
// below the horizon is replaced by asphalt grey like the viewer's floor. Stored as an sRGB JPG of
// radiance / ENTORNO_ESCALA (1024×512, 35 kB instead of the 1.6 MB .hdr).
import entornoUrl from './entorno/parque.jpg';
import { type Modelo, type ModeloBala, type ModeloTriciclo } from './geometria';
import { crearMateriales as materialesBala } from './garaje/balaModelo';
import { COLOR_ACENTO, COLOR_CARROCERIA } from './coloresCarroceria';
import { GIRO_A1 } from './geometriaA1';
import type { Referencia } from './referencias';
import { vehiculoGaraje } from './garaje';
import { rayosInterior } from './garaje/balaInterior';
import { colorSuperpuesto, hacerFantasma, liberarFantasma, mostrarSiluetas, siluetas } from './garaje/superponer';
import { cartel, crearTunel, type CuerpoTunel, type SeleccionTunel, type Tunel } from './tunelViento';
import type { OpcionesTunel } from './tunel/cliente';
import { CAPAS, type CapaId } from './visor/capas';
export { CAPAS } from './visor/capas';
export type { CapaId } from './visor/capas';
import { texturaAsfalto, ENTORNO_ESCALA, CALIDAD_ALTA, materiales, type Mats, pintar } from './visor/materiales';
import { vaciar } from './visor/primitivas';
import { construirFijo } from './visor/gota';
import { construirBala, inclinarBala, construirTriciclo } from './visor/triciclo';
import { cotasGaraje, cotas } from './visor/cotas';
import { construirReferencia, type AperturaGaraje, colocarPivotesGaraje } from './visor/garaje';
import { construirMovil, construirBasculanteVisor } from './visor/construir';
import { aplicarPiezasMotor, cajaVisibleMotor, type OpcionesPiezas } from './visor/piezasMotor3d';
import { aplicarFichaSolo, cajaDeCapas } from './visor/fichaSolo';
export { construirDisenoGaraje } from './visor/construir';

export type Vista = 'iso' | 'side' | 'top' | 'front' | 'back';

export interface VisorHandle {
  /** STL binario de las capas visibles, en milímetros y con Z arriba (como el STEP). */
  exportarSTL: (capas: CapaId[]) => Blob;
  /** Captura lo que se ve ahora mismo (misma cámara, mismas capas) como JPEG; es la base del render fotorrealista. */
  capturar: () => Promise<Blob>;
}

interface Props {
  modelo: Modelo;
  visibles: Record<CapaId, boolean>;
  rayosX: boolean;
  corte: boolean;
  curva: boolean;
  cotas: boolean;
  abierta: boolean;
  /** Tapas de los maleteros abiertas (Aeromóvil 1). */
  maleteros?: boolean;
  /** Sin el pasajero ni su asiento, y con las cotas del espacio trasero que queda (Aeromóvil 1). */
  sinPasajero?: boolean;
  /** Otros vehículos aparcados alrededor (el garaje): id del catálogo, posición del eje delantero en el suelo y giro. */
  garaje?: { id: string; x: number; z: number; giro?: number; v?: string }[];
  /** Solo el garaje, sin nuestro coche (para mirar un modelo del garaje a solas). */
  soloGaraje?: boolean;
  /** Túnel de viento: flujo calculado (presión en la piel, líneas de corriente, puntos críticos, estela) alrededor de cada cuerpo de `cuerposTunel`. */
  tunel?: boolean;
  /** Los coches del garaje, en fantasma de color y con sus siluetas, encima del nuestro (las posiciones las da `garaje`). */
  superponer?: boolean;
  /** Carteles encima de cada coche ('aeromovil' o el id del garaje), líneas separadas por «\n». Con el túnel abierto van en el túnel. */
  carteles?: Record<string, string>;
  /** Los cuerpos que pasan por el túnel (nuestro diseño y los coches del garaje con silueta), con su posición. */
  cuerposTunel?: CuerpoTunel[];
  /** Resolución, líneas, qué se ve y a qué velocidad (la separación y la estela dependen de ella). */
  opcionesTunel?: OpcionesTunel;
  /** Al pinchar (o tocar) el cartel de un punto crítico del túnel: qué cuerpo y qué punto. */
  alElegirPuntoTunel?: (s: SeleccionTunel) => void;
  /** El punto del túnel cuya explicación está abierta (su cartel se ve más grande). */
  puntoTunel?: SeleccionTunel | null;
  vista: Vista;
  /** Al pinchar en una pieza: su componente (para ir a su página). */
  alPinchar?: (componente: string) => void;
  /** Al soltar un coche del garaje arrastrado en el 3D: su nueva posición (eje delantero en el suelo). Sin ella no se arrastra. */
  alMoverGaraje?: (id: string, x: number, z: number) => void;
  /** Our designs in the garage (2026-11-12): the lines of each one's card, by garage id. A car with lines can be picked. */
  fichasGaraje?: Record<string, string[]>;
  /** «Quitar del garaje» on a design's card. */
  alQuitarGaraje?: (id: string) => void;
  // ── The garage as the way to pick a design (2026-11-13) ──
  /** A click on a garage car. Returning true means the page handled it (one of our designs: it becomes the one being
   *  edited) and the viewer opens no card of its own. */
  alPincharGaraje?: (id: string) => boolean;
  /** A click on our own car (on the Aeromóvil 1, only where no part with a sheet is hit). */
  /**
   * (2026-11-15: and where it was hit, so the page can open that part's sliders: the point in the car's own axes, the
   * viewer layer it belongs to, and the names of the part and its parents, nearest first)
   */
  alPincharNuestro?: (donde?: { punto: [number, number, number]; capa: CapaId | null; nombres: string[] }) => void;
  /** More buttons for a reference car's card («Solo mostrar este»). With it every garage car can be picked. */
  extraTarjeta?: (id: string) => ReactNode;
  /** Bumped (`n`) when the design being edited changes place: the camera jumps by (dx, dz) with the cars, so the view
   *  does not change, and then eases onto the new one. */
  seguir?: { n: number; dx: number; dz: number };
  /** A one-line name over each car ('aeromovil' or the garage id) while no other label («Cd y consumo», tunnel) is on. */
  nombres?: Record<string, string>;
  /** A soft mark on the floor under our car: the design being edited, among the others in the garage. */
  resaltarNuestro?: boolean;
  /** Frame every car at once, as «Cd y consumo» does (the «Garaje» panel is open: the garage seen whole). */
  verGaraje?: boolean;
  /** Pixels covered on the right of the view by a panel: the garage view fits the cars into the rest. */
  margenDerecho?: number;
  /** 2026-11-13: the body's paint and its accent (coloresCarroceria.ts); changing them only recolours the materials. */
  colores?: { carroceria: string; acento: string };
  /** Cuadriciclo Basculante (2026-11-15): bumped (a counter) by «Bascular», which leans the car to its maximum angle each way and back. */
  bascular?: number;
  /** Otro velomóvil: oculto, comparado (fantasma junto al nuestro) o solo. */
  referencia?: Referencia | null;
  modoRef?: 'no' | 'comparar' | 'sola';
  alinear?: 'eje' | 'morro' | 'lado';
  /** 2026-11-17 (the «Masas» tab): the centre of gravity (x, y, z in the car's axes) to mark, seen through the body; null: none. */
  centroGravedad?: [number, number, number] | null;
  /** 2026-11-17 («Mostrar solo el motor», piece by piece): which parts of the «Motor» layer to keep, and their labels. */
  piezasMotor?: OpcionesPiezas | null;
  /** 2026-11-24 (components with a record, fichas/registro.ts): the layers whose parts are components. A click or a hover
   *  picks among THEM first, so an occupant in front of a seat does not hide the seat. */
  capasFicha?: CapaId[];
  /** …the component selected: only its layers (and, if given, the meshes tagged `userData.componente` with one of these)
   *  stay drawn, and the camera frames them. null: the department as it was. */
  fichaSolo?: { capas: CapaId[]; componentes?: string[] } | null;
  /** …the pointer moves over a component (`donde`) or off every one (null); x, y in px inside the viewer. Mouse and pen only. */
  alPasar?: (donde: { punto: [number, number, number]; capa: CapaId | null; nombres: string[] } | null, x: number, y: number) => void;
}

const VISTAS: Record<Vista, [number, number, number]> = {
  iso: [-3.6, 2.8, -6.6], side: [-1.5, 0.9, -7.6], top: [-1.5, 8.8, 0.01], front: [5.4, 1.1, 0], back: [-8.6, 1.2, 0.01],
};

/** Una célula monocristalina de 125 mm: azul muy oscuro, junta fina y poco más clara, esquinas achaflanadas, dos barras colectoras tenues. */
/**
 * How far back a camera must sit, looking at `centro` from the direction `haciaCamara`, for
 * every point to land inside the view. `margenH`/`margenV` keep clear of the toolbar and the
 * cards drawn over the viewer. Closed form per point: depth = D + r·fwd must satisfy
 * |r·right| ≤ tan(fovH/2)·depth and |r·up| ≤ tan(fovV/2)·depth.
 */
/** How far the visitor can zoom out by hand. Framing every car at once may go further (see `verTodos`). */
const MAX_ORBITA = 25;

function distanciaParaVer(puntos: THREE.Vector3[], centro: THREE.Vector3, haciaCamara: THREE.Vector3, cam: THREE.PerspectiveCamera, margenH = 0.9, margenV = 0.76) {
  const fwd = haciaCamara.clone().normalize().negate();
  const right = new THREE.Vector3().crossVectors(fwd, cam.up).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), th = tv * cam.aspect;
  const r = new THREE.Vector3();
  let D = 0;
  for (const p of puntos) {
    r.subVectors(p, centro);
    const f = r.dot(fwd);
    D = Math.max(D, Math.abs(r.dot(right)) / (th * margenH) - f, Math.abs(r.dot(up)) / (tv * margenV) - f);
  }
  return D;
}

export const Visor3D = forwardRef<VisorHandle, Props>(function Visor3D({ modelo, visibles, rayosX, corte, curva, cotas: verCotas, abierta, maleteros = false, sinPasajero = false, garaje = [], soloGaraje = false, tunel = false, carteles, cuerposTunel, opcionesTunel, alElegirPuntoTunel, puntoTunel = null, superponer = false, vista, referencia = null, modoRef = 'no', alinear = 'eje', alPinchar, alMoverGaraje, fichasGaraje, alQuitarGaraje, alPincharGaraje, alPincharNuestro, extraTarjeta, seguir, nombres, resaltarNuestro = false, verGaraje = false, margenDerecho = 0, colores, bascular = 0, centroGravedad = null, piezasMotor = null, capasFicha, fichaSolo = null, alPasar }, ref) {
  const pinchar = useRef(alPinchar); pinchar.current = alPinchar;
  const pincharGaraje = useRef(alPincharGaraje); pincharGaraje.current = alPincharGaraje;
  const pincharNuestro = useRef(alPincharNuestro); pincharNuestro.current = alPincharNuestro;
  const capasFichaR = useRef(capasFicha); capasFichaR.current = capasFicha;
  const pasarR = useRef(alPasar); pasarR.current = alPasar;
  const conExtra = useRef(!!extraTarjeta); conExtra.current = !!extraTarjeta;
  const fichas = useRef(fichasGaraje); fichas.current = fichasGaraje;
  const elegirPunto = useRef(alElegirPuntoTunel); elegirPunto.current = alElegirPuntoTunel;
  const moverGaraje = useRef(alMoverGaraje); moverGaraje.current = alMoverGaraje;
  const lienzo = useRef<HTMLCanvasElement>(null);
  const estado = useRef<any>(null);
  // The garage car picked with a click or a tap (only one with parts that open), and what is open on each car.
  const [selGaraje, setSelGaraje] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Record<string, { puertas: boolean; maletero: boolean; bascula?: boolean }>>({});
  const elegirGaraje = useRef(setSelGaraje); elegirGaraje.current = setSelGaraje;
  // On a phone (< 640 px) the card goes at the bottom, just above the viewer's toolbar, as one row: at the top it
  // hid the doors rising. The toolbar belongs to the page, so its top is measured from the viewer's own box.
  const [estrecho, setEstrecho] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  const [bajoCarta, setBajoCarta] = useState(8);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)'), cambio = () => setEstrecho(mq.matches);
    mq.addEventListener('change', cambio); return () => mq.removeEventListener('change', cambio);
  }, []);
  useLayoutEffect(() => {
    if (!selGaraje || !estrecho) return;
    const medir = () => {
      const caja = lienzo.current?.parentElement; if (!caja) return;
      const r = caja.getBoundingClientRect(); let arriba = r.bottom;
      for (const h of Array.from(caja.children) as HTMLElement[]) {
        if (h === lienzo.current || h.dataset.tarjetaGaraje !== undefined) continue;
        const b = h.getBoundingClientRect();
        if (b.height > 0 && b.bottom >= r.bottom - 24 && b.height < r.height * 0.6) arriba = Math.min(arriba, b.top);
      }
      setBajoCarta(Math.round(r.bottom - arriba) + 8);
    };
    medir(); window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [selGaraje, estrecho]);

  useEffect(() => {
    const cv = lienzo.current!;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    // Mapeo tonal neutro (Khronos PBR Neutral, 2026-11-09): el ACES de antes agrisaba los blancos y apagaba el azul
    // marino y el verde inglés; este deja cada pintura de su color, como en una foto de producto.
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const controls = new OrbitControls(camera, cv);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 1.5; controls.maxDistance = MAX_ORBITA;
    const target = new THREE.Vector3(-1.5, 0.55, 0);
    camera.position.set(...VISTAS.iso); controls.target.copy(target);

    // Cielo de exterior a media tarde (2026-11-06, Eugenio: «que el modelo 3D
    // tenga por defecto el aspecto realista del render»): la misma bóveda sirve
    // de fondo y de mapa de reflejos, así la pintura y el cristal reflejan un
    // cielo con sol y un suelo oscuro, no un estudio gris.
    const cielo = (conSol: boolean) => {
      const sg = new THREE.SphereGeometry(60, 48, 24), col: number[] = [], pa = sg.attributes.position;
      const cen = new THREE.Color(0x4f86c8), hor = new THREE.Color(0xf3dcc3), bajo = new THREE.Color(0x5e6166), c = new THREE.Color();
      for (let i = 0; i < pa.count; i++) {
        const y = pa.getY(i) / 60;
        if (y >= 0) c.copy(hor).lerp(cen, Math.pow(y, 0.55)); else c.copy(hor).lerp(bajo, Math.min(1, -y * 6));
        col.push(c.r, c.g, c.b);
      }
      sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const g = new THREE.Group();
      g.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
      if (conSol) {
        // El sol, en la misma dirección que la luz direccional, y un halo: es lo que dibuja el brillo alargado en la pintura.
        const dir = new THREE.Vector3(3.5, 7, 4.5).normalize();
        const sol = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(18, 16, 13), fog: false }));
        sol.position.copy(dir).multiplyScalar(50); g.add(sol);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, opacity: 0.5, fog: false }));
        halo.position.copy(dir).multiplyScalar(52); g.add(halo);
      }
      return g;
    };
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(cielo(true));
    let entornoRT = pm.fromScene(es, 0.02), vivo = true;
    scene.environment = entornoRT.texture;
    // Capa de reflejos (2026-11-09, Eugenio: «agrega capas a todos los vehículos para que sean un render más
    // fotorrealista»): la pintura, el cristal y el cromo de todos los coches reflejan un sitio real, un cielo azul
    // con una fila de árboles en el horizonte, en lugar de un degradado. El sol se añade encima para que siga
    // dibujando el brillo alargado. Mientras llega la imagen (35 kB), se queda el cielo dibujado.
    // Probado contra una plaza con edificios y cielo cubierto: agrisaba las pinturas y teñía de rojo las llantas.
    const cargarEntorno = (url: string, escala: number, intensidad: number) => new THREE.TextureLoader().load(url, tex => {
      if (!vivo) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      const ee = new THREE.Scene();
      ee.add(new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, color: new THREE.Color(escala, escala, escala), fog: false })));
      // Del cielo dibujado solo se quedan el sol y su halo (la bóveda la pone la foto).
      const [boveda, ...soles] = cielo(true).children as THREE.Mesh[];
      boveda.geometry.dispose(); (boveda.material as THREE.Material).dispose(); ee.add(...soles);
      const nuevo = pm.fromScene(ee, 0.02);
      entornoRT.dispose(); entornoRT = nuevo; scene.environment = nuevo.texture; scene.environmentIntensity = intensidad;
      ee.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); }); tex.dispose();
    });
    // A 1,5: sin su sol, el cielo de la foto es más oscuro que el dibujado; a 1 las pinturas quedaban apagadas.
    cargarEntorno(entornoUrl, ENTORNO_ESCALA, 1.5);
    const fondo = cielo(false); fondo.position.set(-1.5, 0, 0); scene.add(fondo);
    const niebla = new THREE.Fog(0xf3dcc3, 16, 60); scene.fog = niebla;

    // Luz de exterior: cielo + sol cálido con sombra suave, y un contraluz frío que dibuja el canto de la cúpula.
    scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x5a5751, 0.8));
    const sol = new THREE.DirectionalLight(0xffe9cf, 4.6); sol.position.set(3.5, 7, 4.5); sol.castShadow = true;
    // Capa de sombras: la sombra del sol cubre todo lo que hay en escena, no solo los 10 m del centro (los coches
    // del garaje a 9 y 12 m flotaban sin sombra). La caja se ajusta en `ajustarSombra`, más abajo.
    // 2048 como antes: ajustada a lo que se ve, la sombra del Aeromóvil solo sale más fina (5 m en 2048 en vez de 10)
    // y con el garaje entero (unos 26 m) queda en ~13 mm por punto, que con el borde suave no se nota.
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4, near: 1, far: 20 });
    sol.shadow.bias = -0.0003; sol.shadow.normalBias = 0.01; scene.add(sol); scene.add(sol.target);
    const contraluz = new THREE.DirectionalLight(0xc9dcff, 1.2); contraluz.position.set(-6, 3, -5); scene.add(contraluz);
    // Suelo: asfalto claro con grano, que se funde con el fondo a lo lejos, y la sombra encima.
    // (el suelo recibe la sombra del coche; se desvanece hacia el borde con un alfa radial)
    const suelo = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x6f7073, map: texturaAsfalto(), roughness: 0.9, metalness: 0.05, envMapIntensity: 0.35 }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.set(-1.5, 0, 0); suelo.receiveShadow = true; scene.add(suelo);

    const M = materiales();
    /** The editor's Bala has its own materials: «Rayos X» and «Corte» change them without touching the garage's Bala. */
    const Mb = materialesBala();
    const coche = new THREE.Group(); scene.add(coche);
    const G = {} as Record<CapaId, THREE.Group>;
    for (const c of CAPAS) { G[c.k] = new THREE.Group(); G[c.k].name = c.n; coche.add(G[c.k]); }
    const grupoCotas = new THREE.Group(); grupoCotas.visible = false; scene.add(grupoCotas);
    const grupoRef = new THREE.Group(); grupoRef.visible = false; scene.add(grupoRef);
    const grupoGaraje = new THREE.Group(); scene.add(grupoGaraje);
    const puertasG = new Map<string, THREE.Group[]>();
    // La caja de la sombra, ajustada a lo que se ve: el Aeromóvil, el otro velomóvil y los coches del garaje.
    const DIR_SOL = new THREE.Vector3(3.5, 7, 4.5).normalize(), caja = new THREE.Box3(), cajaUna = new THREE.Box3();
    const camLuz = new THREE.OrthographicCamera(), esquina = new THREE.Vector3(), centro = new THREE.Vector3(), medida = new THREE.Vector3();
    const ajustarSombra = () => {
      caja.makeEmpty();
      for (const o of [coche, grupoRef, grupoGaraje]) if (o.visible) { cajaUna.setFromObject(o); if (!cajaUna.isEmpty()) caja.union(cajaUna); }
      if (caja.isEmpty()) return;
      caja.min.y = 0;
      caja.getCenter(centro); const radio = caja.getSize(medida).length() / 2;
      sol.target.position.copy(centro); sol.position.copy(centro).addScaledVector(DIR_SOL, radio + 10);
      sol.target.updateMatrixWorld(); sol.updateMatrixWorld();
      camLuz.position.copy(sol.position); camLuz.lookAt(centro); camLuz.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        esquina.set(i & 1 ? caja.max.x : caja.min.x, i & 2 ? caja.max.y : caja.min.y, i & 4 ? caja.max.z : caja.min.z).applyMatrix4(camLuz.matrixWorldInverse);
        x0 = Math.min(x0, esquina.x); x1 = Math.max(x1, esquina.x); y0 = Math.min(y0, esquina.y); y1 = Math.max(y1, esquina.y); z0 = Math.min(z0, esquina.z); z1 = Math.max(z1, esquina.z);
      }
      const c = sol.shadow.camera;
      c.left = x0 - 0.4; c.right = x1 + 0.4; c.bottom = y0 - 0.4; c.top = y1 + 0.4; c.near = Math.max(0.1, -z1 - 1); c.far = -z0 + 1;
      c.updateProjectionMatrix();
    };
    let ultimaSombra = -1e9;

    // Posproceso: color lineal en coma flotante con 4 muestras de antialias,
    // oclusión ambiental y, al final, el mapeo tonal y el paso a sRGB.
    const objetivo = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: CALIDAD_ALTA ? 4 : 0 });
    const composer = new EffectComposer(renderer, objetivo);
    composer.addPass(new RenderPass(scene, camera));
    let aoPass: GTAOPass | null = null;
    if (CALIDAD_ALTA) {
      aoPass = new GTAOPass(scene, camera, 1, 1);
      aoPass.output = GTAOPass.OUTPUT.Default;
      aoPass.updateGtaoMaterial({ radius: 0.22, distanceExponent: 1, thickness: 1, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
      aoPass.blendIntensity = 0.9;
      composer.addPass(aoPass);
    }
    // Sin halo (bloom): probado el 2026-11-09, el reflejo del sol en la cúpula se abría en una mancha que velaba el
    // coche, y con el umbral alto no aportaba nada que se viera.
    composer.addPass(new OutputPass());
    const dibujar = () => composer.render();
    const resize = () => {
      const r = cv.getBoundingClientRect();
      // (2026-11-17) «Ocultar garaje» hides the 3D view (display: none): keep the last size instead of 0 × 0 targets
      if (r.width < 1 || r.height < 1) return;
      renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
      const pr = renderer.getPixelRatio(); composer.setSize(r.width, r.height); composer.setPixelRatio(pr); aoPass?.setSize(r.width * pr, r.height * pr);
    };
    const ro = new ResizeObserver(resize); ro.observe(cv); resize();

    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ultimo = performance.now(), tc = 0, acc = 0, raf = 0;
    const st = {
      renderer, scene, camera, controls, target, M, Mb, G, coche, grupoCotas, grupoRef, grupoGaraje, puertasG, dibujar, tween: null as any,
      /** The Bala's rebuilds: the last one's time, the pending quick one (next frame) and the full one after a pause. */
      bala: { ultima: 0, cuadro: 0, pausa: 0 as ReturnType<typeof setTimeout> | 0 },
      /** The Bala is already on screen (so a change is an edit, rebuilt quick first), not being opened. */
      balaVisto: false as false | 'bala' | 'triciclo',
      /** The component selected (fichas/): its layers and tags. Re-applied after every rebuild (`cotasYPuertas`). */
      fichaSolo: null as { capas: CapaId[]; componentes?: string[] } | null,
      /** The layers the page shows now (`visibles`), for re-applying the selection after a rebuild. */
      visibles: null as Record<CapaId, boolean> | null,
      /** Where the camera was when a component was selected, to go back to it. */
      camaraAntesFicha: null as { pos: THREE.Vector3; target: THREE.Vector3 } | null,
      curva: false, inclinacion: 0, modelo: null as Modelo | null, plano: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      /** Cuadriciclo Basculante: «Bascular» running (seconds since it was pressed), or null. */
      bascula: null as { t: number } | null,
      apertura: 0, aperturaObjetivo: 0, aperturaMal: 0, aperturaMalObjetivo: 0, colocarPuertas: (() => {}) as () => void,
      /** How open the doors and the boot of each garage car are (by id), and where they are heading. */
      garajeAbre: new Map<string, AperturaGaraje>(),
      tunel: null as Tunel | null, superponer: false, ultimoFantasma: 0,
      sombraSucia: true,
      /** Orbit limit to restore when the camera gets home from the all-cars view (0: nothing pending). */
      maxOrbitaAlVolver: 0,
      /** How far beyond MAX_ORBITA the camera is (the all-cars view); fog and ground follow it. */
      lejos: 0,
    };
    const tamano = new THREE.Vector2();
    estado.current = st;
    // (dev server only, 2026-11-13) the browser checks find the garage cars on screen through this; a build leaves it out
    if (import.meta.env.DEV) (window as any).__visorAeromovil = st;
    const colocarPuertas = () => {
      for (const lista of puertasG.values()) for (const piv of lista) {
        piv.quaternion.setFromAxisAngle(piv.userData.eje, piv.userData.angulo * (piv.userData.tipo === 'maletero' ? st.aperturaMal : st.apertura));
      }
    };
    st.colocarPuertas = colocarPuertas;
    // Clic en una pieza: si apenas se ha movido el ratón, es un clic y no un giro de cámara.
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let bajada: [number, number] | null = null;
    // (2026-11-24) the visible, solid-enough meshes of some layers, and the answer a click or a hover gives the page
    const meshesDe = (capas: CapaId[]) => {
      const out: THREE.Object3D[] = [];
      for (const k of capas) st.G[k]?.traverse((o: any) => {
        if (!o.isMesh || !o.visible || (o.material?.transparent && (o.material.opacity ?? 1) <= 0.3)) return;
        for (let p = o.parent; p && p !== coche; p = p.parent) if (!p.visible) return;
        out.push(o);
      });
      return out;
    };
    const dondeDe = (h: THREE.Intersection) => {
      const p = coche.worldToLocal(h.point.clone()), nombres: string[] = (h.object as any).userData?.componente ? [`comp:${(h.object as any).userData.componente}`] : []; let capa: CapaId | null = null;
      for (let o: THREE.Object3D | null = h.object; o && o !== coche; o = o.parent) { if (o.name) nombres.push(o.name); const c = CAPAS.find(k => k.n === o!.name && o!.parent === coche); if (c) capa = c.k; }
      return { punto: [p.x, p.y, p.z] as [number, number, number], capa, nombres };
    };
    const alBajar = (e: PointerEvent) => { bajada = [e.clientX, e.clientY]; };
    const alSoltar = (e: PointerEvent) => {
      if (!bajada || Math.hypot(e.clientX - bajada[0], e.clientY - bajada[1]) > 6) { bajada = null; return; }
      bajada = null;
      const r = cv.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      // Túnel (2026-11-09): el cartel de un punto crítico abre su explicación, y gana a la pieza que tenga detrás.
      const punto = st.tunel && elegirPunto.current ? st.tunel.elegir(ray) : null;
      if (punto) { elegirPunto.current!(punto); return; }
      // A garage car that cannot be dragged (alone with ?garaje=…, or overlaid) is picked here; a click on
      // anything else closes its card. (A car that can be dragged is picked when the drag ends without moving.)
      // a component with a record (fichas/registro.ts): picked among its own layers first, and before the garage cars (their
      // boxes can sit behind our seats: the nearest thing under the pointer wins)
      if (pincharNuestro.current && capasFichaR.current?.length && coche.visible) {
        const hf = ray.intersectObjects(meshesDe(capasFichaR.current), false)[0];
        if (hf && hf.distance <= distanciaGaraje()) { elegirCoche(null); pincharNuestro.current(dondeDe(hf)); return; }
      }
      const enGaraje = grupoGaraje.children.length ? cocheGarajeEn(true) : null;
      elegirCoche(enGaraje);
      if (enGaraje || (!pinchar.current && !pincharNuestro.current) || !coche.visible) return;
      const vis: THREE.Object3D[] = [];
      coche.traverse((o: any) => { if (o.isMesh && o.visible && (o.userData.componente || !pinchar.current)) { let p = o.parent, ok = true; while (p && p !== coche) { if (!p.visible) { ok = false; break; } p = p.parent; } if (ok) vis.push(o); } });
      const hit = ray.intersectObjects(vis, false).find(h => !(h.object as any).material?.transparent || ((h.object as any).material.opacity ?? 1) > 0.3) ?? ray.intersectObjects(vis, false)[0];
      if (hit && pinchar.current) { pinchar.current((hit.object as any).userData.componente); return; }
      // (2026-11-13) our own car, where no part with a sheet was hit: the page opens the design's card
      if (!pincharNuestro.current) return;
      const donde = dondeDe;
      if (hit) { pincharNuestro.current(donde(hit)); return; }
      const todas: THREE.Object3D[] = [];
      coche.traverse((o: any) => { if (o.isMesh && o.visible) { let p = o.parent, ok = true; while (p && p !== coche) { if (!p.visible) { ok = false; break; } p = p.parent; } if (ok) todas.push(o); } });
      const h2 = ray.intersectObjects(todas, false)[0];
      if (h2) pincharNuestro.current(donde(h2));
    };
    cv.addEventListener('pointerdown', alBajar); cv.addEventListener('pointerup', alSoltar);
    // Hover over a component (2026-11-24): mouse and pen only (a finger has no hover: a tap opens the record at once), at most
    // every 60 ms, and only while the page asked for it (`alPasar`: a department with components, nothing selected)
    let esperaHover = 0, sobreFicha = false;
    const alMoverFicha = (e: PointerEvent) => {
      const cb = pasarR.current;
      if (!cb || e.pointerType === 'touch' || e.buttons !== 0 || !coche.visible) return;
      const ahora = performance.now(); if (ahora - esperaHover < 60) return; esperaHover = ahora;
      const r = cv.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const caps = capasFichaR.current, h0 = caps?.length ? ray.intersectObjects(meshesDe(caps), false)[0] : undefined;
      const h = h0 && h0.distance <= distanciaGaraje() ? h0 : undefined; // a garage car in front hides it
      sobreFicha = !!h; cv.style.cursor = h ? 'pointer' : '';
      cb(h ? dondeDe(h) : null, e.clientX - r.left, e.clientY - r.top);
    };
    const alSalirFicha = () => { if (sobreFicha) { sobreFicha = false; cv.style.cursor = ''; } pasarR.current?.(null, 0, 0); };
    cv.addEventListener('pointermove', alMoverFicha); cv.addEventListener('pointerleave', alSalirFicha);
    // Arrastrar un coche del garaje (2026-11-07, Eugenio: «mover los vehículos pulsando sobre ellos y
    // arrastrándolos»). Se escucha en captura para quitarle el gesto a la cámara antes de que empiece a girar.
    const suelo0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pSuelo = new THREE.Vector3(), cajaTmp = new THREE.Box3();
    let arrastre: { obj: THREE.Object3D; dx: number; dz: number; id: number; x0: number; y0: number; movido: boolean } | null = null;
    const rayoDesde = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); };
    /**
     * The garage car under the ray (the ray must be set): first each car's box (cheap), then its triangles.
     * With `caja`, a ray that misses every triangle but crosses a car's own box (without its dimension lines)
     * still picks it: with the doors open a click through the opening goes out the other side.
     */
    const cajaCoche = new THREE.Box3();
    const cocheGarajeEn = (caja = false): THREE.Object3D | null => {
      if (!grupoGaraje.visible) return null; // hidden while one component of ours is shown alone (a ray ignores `visible`)
      const candidatos = grupoGaraje.children.filter(c => c.visible && ray.ray.intersectsBox(cajaTmp.setFromObject(c)));
      const hit = candidatos.length ? ray.intersectObjects(candidatos, true).find(h => (h.object as any).isMesh && h.object.visible) : undefined;
      if (hit) {
        let obj: THREE.Object3D = hit.object; while (obj.parent && obj.parent !== grupoGaraje) obj = obj.parent;
        return obj.parent === grupoGaraje ? obj : null;
      }
      if (!caja) return null;
      let mejor: THREE.Object3D | null = null, dMejor = Infinity;
      for (const c of candidatos) {
        // the car's own box, measured closed when it was built (open panels and dimension lines left out)
        if (!c.userData.cajaCerrada) continue;
        cajaCoche.copy(c.userData.cajaCerrada).applyMatrix4(c.matrixWorld);
        const p = ray.ray.intersectBox(cajaCoche, new THREE.Vector3());
        if (p) { const d = p.distanceTo(ray.ray.origin); if (d < dMejor) { dMejor = d; mejor = c; } }
      }
      return mejor;
    };
    /** How far the nearest triangle of a garage car under the ray is (Infinity: none). */
    const distanciaGaraje = (): number => {
      if (!grupoGaraje.visible) return Infinity;
      const cand = grupoGaraje.children.filter(c => c.visible && ray.ray.intersectsBox(cajaTmp.setFromObject(c)));
      const h = cand.length ? ray.intersectObjects(cand, true).find(x => (x.object as any).isMesh && x.object.visible) : undefined;
      return h ? h.distance : Infinity;
    };
    // a car with parts that open or that leans, or one of our designs (it has a card of its own)
    const abreAlgo = (obj: THREE.Object3D | null) => !!obj && (conExtra.current || !!vehiculoGaraje(obj.name)?.pivotes?.length || !!vehiculoGaraje(obj.name)?.bascula || !!fichas.current?.[obj.name]);
    /** Picks a garage car (its card opens) or, with null or a car with nothing to open, closes the card. One the page
     *  takes (one of our designs, 2026-11-13) opens no card here. */
    const elegirCoche = (obj: THREE.Object3D | null) => {
      if (obj && pincharGaraje.current?.(obj.name)) { elegirGaraje.current(null); return; }
      elegirGaraje.current(abreAlgo(obj) ? obj!.name : null);
    };
    const empezarArrastre = (e: PointerEvent) => {
      if (!moverGaraje.current || e.button !== 0 || !grupoGaraje.children.length) return;
      rayoDesde(e);
      if (st.tunel?.elegir(ray)) return; // a tunnel label in front of the car: it is a click on the label, not a drag
      const obj = cocheGarajeEn();
      if (!obj || !ray.ray.intersectPlane(suelo0, pSuelo)) return;
      // a component of ours with a record, nearer than that car (the car's shell can sit behind our seats): it is a click
      // on the component, not a grab of the car
      if (pincharNuestro.current && capasFichaR.current?.length) {
        const hf = ray.intersectObjects(meshesDe(capasFichaR.current), false)[0];
        if (hf && hf.distance <= distanciaGaraje()) return;
      }
      e.stopImmediatePropagation(); e.preventDefault();
      arrastre = { obj, dx: obj.position.x - pSuelo.x, dz: obj.position.z - pSuelo.z, id: e.pointerId, x0: e.clientX, y0: e.clientY, movido: false };
      controls.enabled = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
    };
    const moverArrastre = (e: PointerEvent) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      // the car stays put until the pointer has moved 6 px: less than that is a click (or a tap), as on our own car
      if (!arrastre.movido && Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) <= 6) return;
      arrastre.movido = true;
      rayoDesde(e);
      if (ray.ray.intersectPlane(suelo0, pSuelo)) arrastre.obj.position.set(pSuelo.x + arrastre.dx, 0, pSuelo.z + arrastre.dz);
    };
    const soltarArrastre = (e: PointerEvent) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      const { obj, movido } = arrastre; arrastre = null;
      controls.enabled = true; cv.style.cursor = ''; try { cv.releasePointerCapture(e.pointerId); } catch { /* ya suelto */ }
      if (!movido) { if (e.type === 'pointerup') elegirCoche(obj); return; }
      const r5 = (v: number) => Math.round(v * 20) / 20; // a 5 cm
      moverGaraje.current?.(obj.name, r5(obj.position.x), r5(obj.position.z));
    };
    cv.addEventListener('pointerdown', empezarArrastre, { capture: true });
    cv.addEventListener('pointermove', moverArrastre); cv.addEventListener('pointerup', soltarArrastre); cv.addEventListener('pointercancel', soltarArrastre);
    // La mano sobre lo que se puede pinchar: un cartel del túnel o un coche del garaje que se abre (este,
    // como mucho cada 120 ms: el rayo contra un coche entero cuesta unos milisegundos).
    let ultimoSobre = 0, sobreCoche = false;
    const sobreCartel = (e: PointerEvent) => {
      if (arrastre || e.buttons || e.pointerType !== 'mouse') return;
      if (!st.tunel && !grupoGaraje.children.length) return;
      rayoDesde(e);
      const encima = !!st.tunel?.elegir(ray), ahora = performance.now();
      if (ahora - ultimoSobre > 120) { ultimoSobre = ahora; sobreCoche = grupoGaraje.children.length > 0 && abreAlgo(cocheGarajeEn()); }
      if (encima || sobreCoche) cv.style.cursor = 'pointer'; else if (cv.style.cursor === 'pointer') cv.style.cursor = '';
    };
    cv.addEventListener('pointermove', sobreCartel);
    const bucle = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
      if (st.tween) {
        st.tween.t = Math.min(1, st.tween.t + dt / (reducir ? 0.01 : 0.7));
        const e = 1 - Math.pow(1 - st.tween.t, 3);
        camera.position.lerpVectors(st.tween.from, st.tween.to, e); controls.target.lerpVectors(st.tween.tf, target, e);
        if (st.tween.t >= 1) {
          st.tween = null;
          // back from the all-cars view: the orbit limit returns once the camera is home, not before (it would jump)
          if (st.maxOrbitaAlVolver) { controls.maxDistance = st.maxOrbitaAlVolver; st.maxOrbitaAlVolver = 0; }
        }
      }
      // Beyond the hand-zoom limit (only the all-cars view goes there) the fog and the ground move
      // out with the camera; otherwise the far cars sink into the haze and the ground's edge shows.
      const lejos = Math.round(Math.max(0, camera.position.distanceTo(controls.target) - MAX_ORBITA) * 10) / 10;
      if (lejos !== st.lejos) { st.lejos = lejos; niebla.near = 16 + lejos; niebla.far = 60 + 1.5 * lejos; suelo.scale.setScalar(1 + lejos / 30); }
      const paso = reducir ? 1 : dt / 1.1;
      const avanzar = (v: number, o: number) => (o > v ? Math.min(o, v + paso) : Math.max(o, v - paso));
      if (st.apertura !== st.aperturaObjetivo || st.aperturaMal !== st.aperturaMalObjetivo) {
        st.apertura = avanzar(st.apertura, st.aperturaObjetivo); st.aperturaMal = avanzar(st.aperturaMal, st.aperturaMalObjetivo);
        colocarPuertas();
      }
      // the garage cars' doors and boots, at the same pace
      for (const [id, a] of st.garajeAbre) {
        if (a.p === a.pObj && a.m === a.mObj && a.b === a.bObj) continue;
        a.p = avanzar(a.p, a.pObj); a.m = avanzar(a.m, a.mObj); a.b = avanzar(a.b, a.bObj);
        const obj = grupoGaraje.getObjectByName(id), def = vehiculoGaraje(id);
        if (obj && def) colocarPivotesGaraje(obj, def, a);
        st.sombraSucia = true;
      }
      if (st.curva && st.modelo) {
        tc += dt; acc += dt;
        // El Gota se inclina; el Aeromóvil 1 gira las ruedas delanteras.
        const maximo = st.modelo.tipo === 'a1' ? GIRO_A1 : st.modelo.tipo === 'triciclo' ? st.modelo.giro * 180 / Math.PI : st.modelo.P.tiltMax;
        if (acc > 0.045) { acc = 0; st.inclinacion = maximo * Math.sin(tc * 1.1); construirMovil(G, M, st.modelo, coche, st.inclinacion); }
        // Intermitente del lado hacia el que se inclina o gira, a 1,5 parpadeos por segundo
        const enc = Math.floor(ahora / 333) % 2 === 0;
        M.intermitenteI.emissiveIntensity = st.inclinacion > 2 && enc ? 2.2 : 0.15;
        M.intermitenteD.emissiveIntensity = st.inclinacion < -2 && enc ? 2.2 : 0.15;
      }
      // ── Cuadriciclo Basculante (2026-11-15): «Bascular» leans it to its maximum to the right, back, to the left and back
      // (one sine over 6 s), the front wheels steering into the lean and the indicator on that side blinking
      // (2026-11-15: and the «Cuadriciclo Bala clásico» whose design leans, `bascula`)
      const mb = st.modelo, maxB = mb?.tipo === 'basculante' ? mb.P.tiltMax : mb?.tipo === 'triciclo' && mb.bascula ? mb.bascula.phiMax * 180 / Math.PI : 0;
      if (st.bascula && mb && maxB > 0 && !st.curva) {
        const T = 6;
        st.bascula.t += reducir ? T : dt;
        const fin = st.bascula.t >= T, phi = fin ? 0 : maxB * Math.sin(2 * Math.PI * st.bascula.t / T);
        st.inclinacion = phi;
        if (mb.tipo === 'triciclo') inclinarBala(G, mb, coche, phi * Math.PI / 180); else construirMovil(G, M, mb, coche, phi);
        const enc = Math.floor(ahora / 333) % 2 === 0;
        M.intermitenteD.emissiveIntensity = phi > 2 && enc ? 2.2 : 0.15; M.intermitenteI.emissiveIntensity = phi < -2 && enc ? 2.2 : 0.15;
        st.sombraSucia = true;
        if (fin) st.bascula = null;
      }
      if (st.tunel) { renderer.getSize(tamano); st.tunel.actualizar(reducir ? 0 : ahora / 1000, tamano.x, tamano.y, camera); }
      // Lo que llega tarde a un coche superpuesto (la carrocería del Twizy se descarga) también pasa a fantasma.
      if (st.superponer && ahora - st.ultimoFantasma > 400) { st.ultimoFantasma = ahora; for (const o of grupoGaraje.children) hacerFantasma(o, colorSuperpuesto(o.name)); }
      if (st.sombraSucia || ahora - ultimaSombra > 1000) { st.sombraSucia = false; ultimaSombra = ahora; ajustarSombra(); }
      controls.update(); if (cv.clientWidth > 0) dibujar(); raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); st.tunel?.liberar();
      cv.removeEventListener('pointerdown', alBajar); cv.removeEventListener('pointerup', alSoltar);
      cv.removeEventListener('pointermove', alMoverFicha); cv.removeEventListener('pointerleave', alSalirFicha);
      cv.removeEventListener('pointerdown', empezarArrastre, { capture: true });
      cv.removeEventListener('pointermove', moverArrastre); cv.removeEventListener('pointerup', soltarArrastre); cv.removeEventListener('pointercancel', soltarArrastre);
      cv.removeEventListener('pointermove', sobreCartel);
      scene.traverse((o: any) => { o.geometry?.dispose?.(); });
      M.solar.map?.dispose();
      vivo = false; entornoRT.dispose();
      Object.values(M).forEach(m => m.dispose()); Object.values(Mb).forEach(m => m.dispose());
      cancelAnimationFrame(st.bala.cuadro); if (st.bala.pausa) clearTimeout(st.bala.pausa);
      pm.dispose(); composer.dispose(); renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.modelo = modelo;
    const cotasYPuertas = () => { vaciar(st.grupoCotas); cotas(st.grupoCotas, st.M, st.modelo, sinPasajero); st.colocarPuertas(); st.sombraSucia = true; if (st.visibles) aplicarFichaSolo(st.G, st.visibles, st.fichaSolo); };
    cancelAnimationFrame(st.bala.cuadro); if (st.bala.pausa) { clearTimeout(st.bala.pausa); st.bala.pausa = 0; }
    // ── Cuadriciclo Basculante (2026-11-15): rebuilt whole on every change (~60 ms), at the current lean
    if (modelo.tipo === 'basculante') {
      st.balaVisto = false;
      construirBasculanteVisor(st.G, st.puertasG, st.M, modelo, sinPasajero);
      construirMovil(st.G, st.M, modelo, st.coche, st.curva || st.bascula ? st.inclinacion : 0);
      cotasYPuertas();
      return;
    }
    if (modelo.tipo !== 'bala' && modelo.tipo !== 'triciclo') {
      st.balaVisto = false;
      construirFijo(st.G, st.puertasG, st.M, modelo, sinPasajero);
      construirMovil(st.G, st.M, modelo, st.coche, st.curva ? st.inclinacion : 0);
      cotasYPuertas();
      return;
    }
    // The Bala takes 150–450 ms to build in full. When it changes (a slider, a select), it is
    // rebuilt quick (half the rows, no small details: ~50 ms) on the next frame, at most once per
    // frame however fast the slider moves, and in full 0.3 s after the last change. Only the first
    // build (on opening, or on switching from another vehicle) is full at once.
    // The Triciclo (2026-11-10) comes from the same builder and is rebuilt the same way; switching between the two builds in full.
    const yaEraBala = st.balaVisto === modelo.tipo;
    st.balaVisto = modelo.tipo;
    const construir = (calidad: 'completa' | 'rapida') => {
      const m = st.modelo as ModeloBala | ModeloTriciclo, t0 = performance.now();
      if (m.tipo === 'triciclo') construirTriciclo(st.G, st.puertasG, st.M, st.Mb, m, calidad, sinPasajero);
      else construirBala(st.G, st.puertasG, st.M, st.Mb, m, calidad, sinPasajero);
      construirMovil(st.G, st.M, m, st.coche, st.curva && m.tipo === 'triciclo' ? st.inclinacion : 0);
      if (m.tipo === 'triciclo' && st.piezas) aplicarPiezasMotor(st.G.motor, st.piezas);
      cotasYPuertas();
      const t1 = performance.now();
      // measured where the visitor's browser can be asked (performance.getEntriesByName)
      try { performance.measure(`${m.tipo}:${calidad}`, { start: t0, end: t1 }); } catch { /* old browsers */ }
      st.bala.ultima = t1;
    };
    if (!yaEraBala) { construir('completa'); return; }
    st.bala.cuadro = requestAnimationFrame(() => construir('rapida'));
    // the full build cancels a quick one still waiting for its frame: on a slow screen (2 frames a second, measured
    // 2026-11-11 under software WebGL) the frame came after the 0.3 s and the quick build wiped the riders and details
    st.bala.pausa = setTimeout(() => { st.bala.pausa = 0; cancelAnimationFrame(st.bala.cuadro); construir('completa'); }, 300);
  }, [modelo, sinPasajero]);

  // 2026-11-24: the layers the page shows, narrowed to the selected component (visor/fichaSolo.ts); selecting one frames it,
  // and leaving it puts the camera back where it was
  const claveFicha = fichaSolo ? `${fichaSolo.capas.join(',')}|${fichaSolo.componentes?.join(',') ?? ''}` : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.visibles = visibles; st.fichaSolo = fichaSolo;
    aplicarFichaSolo(st.G, visibles, fichaSolo); st.sombraSucia = true;
    // «only that component» (Eugenio): the garage's reference cars and the name labels leave too, and come back with it
    st.grupoGaraje.visible = !fichaSolo;
    for (const n of ['nombres', 'carteles']) { const o = st.scene.getObjectByName(n); if (o) o.visible = !fichaSolo; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles, claveFicha]);
  useEffect(() => {
    const st = estado.current; if (!st) return;
    if (fichaSolo) {
      const b = cajaDeCapas(st.G, fichaSolo.capas); if (!b) return;
      if (!st.camaraAntesFicha) st.camaraAntesFicha = { pos: st.camera.position.clone(), target: st.controls.target.clone() };
      const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.12, b.getSize(new THREE.Vector3()).length() / 2);
      const dir = st.camera.position.clone().sub(st.controls.target).normalize();
      const d = Math.min(6, 1.25 * r / Math.tan(THREE.MathUtils.degToRad(st.camera.fov) / 2));
      st.target.copy(c);
      st.tween = { from: st.camera.position.clone(), to: c.clone().addScaledVector(dir, d), tf: st.controls.target.clone(), t: 0 };
    } else if (st.camaraAntesFicha) {
      const a = st.camaraAntesFicha; st.camaraAntesFicha = null;
      st.target.copy(a.target);
      st.tween = { from: st.camera.position.clone(), to: a.pos, tf: st.controls.target.clone(), t: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFicha]);
  // 2026-11-17: «Mostrar solo esta pieza» inside the «Motor» layer, and its labels (visor/piezasMotor3d.ts). Choosing a
  // part or a group frames it; leaving «Ver solo motor» returns the camera to the view it was in.
  const clavePiezas = piezasMotor ? `${piezasMotor.solo?.join(',') ?? '*'}|${piezasMotor.etiquetas}` : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const antes = st.piezas as OpcionesPiezas | null | undefined;
    st.piezas = piezasMotor;
    aplicarPiezasMotor(st.G.motor, piezasMotor);
    st.sombraSucia = true;
    // (and pressing «Ver solo motor» frames the whole engine: in the full car view it is a few centimetres on screen)
    if (piezasMotor && (piezasMotor.solo || !antes || antes.solo)) {
      const b = cajaVisibleMotor(st.G.motor); if (!b) return;
      const c = b.getCenter(new THREE.Vector3()), r = Math.max(0.12, b.getSize(new THREE.Vector3()).length() / 2);
      const dir = st.camera.position.clone().sub(st.controls.target).normalize();
      const d = Math.min(6, 1.6 * r / Math.tan(THREE.MathUtils.degToRad(st.camera.fov) / 2));
      st.target.copy(c);
      st.tween = { from: st.camera.position.clone(), to: c.clone().addScaledVector(dir, d), tf: st.controls.target.clone(), t: 0 };
    } else if (antes && !piezasMotor) {
      st.target.set(-1.5, 0.55, 0);
      st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePiezas]);
  // 2026-11-17 (masas): the centre of gravity, a ball in black and white quarters drawn over everything, with a line down
  // to the ground; it rides with the car (it leans with it) and nothing picks it up with a click
  useEffect(() => {
    const st = estado.current; if (!st) return;
    if (!st.marcaCG) {
      const g = new THREE.Group(); g.name = 'centro-de-gravedad'; g.renderOrder = 20;
      const sobre = (m: THREE.Material) => { m.depthTest = false; m.transparent = true; return m; };
      const blanco = sobre(new THREE.MeshBasicMaterial({ color: 0xffffff })), negro = sobre(new THREE.MeshBasicMaterial({ color: 0x111111 }));
      for (let i = 0; i < 8; i++) {
        // eight octants of a sphere, alternating colours: the usual centre-of-gravity symbol from any side
        const q = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 6, (i % 4) * Math.PI / 2, Math.PI / 2, i < 4 ? 0 : Math.PI / 2, Math.PI / 2), (i + (i < 4 ? 0 : 1)) % 2 ? negro : blanco);
        q.renderOrder = 21; q.raycast = () => {}; g.add(q);
      }
      const linea = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 8), sobre(new THREE.MeshBasicMaterial({ color: 0xd97706, opacity: 0.9 })));
      linea.name = 'linea'; linea.renderOrder = 20; linea.raycast = () => {}; g.add(linea);
      st.coche.add(g); st.marcaCG = g;
    }
    const g: THREE.Group = st.marcaCG;
    g.visible = !!centroGravedad;
    if (centroGravedad) {
      const [x, y, z] = centroGravedad; g.position.set(x, y, z);
      const l = g.getObjectByName('linea')!; l.scale.y = y; l.position.y = -y / 2;
    }
    st.sombraSucia = true;
  }, [centroGravedad?.[0], centroGravedad?.[1], centroGravedad?.[2]]);
  useEffect(() => { const st = estado.current; if (st) st.grupoCotas.visible = verCotas && modoRef !== 'sola'; }, [verCotas, modoRef]);

  // El otro velomóvil: se dibuja aparte (no se inclina con el nuestro) y se
  // coloca por el eje delantero, por el morro o al lado.
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const g: THREE.Group = st.grupoRef;
    // (with ?garaje=… our car stays hidden: this effect reruns when the design arrives, after the one that hides it)
    if (!referencia || modoRef === 'no') { g.visible = false; st.coche.visible = !soloGaraje; return; }
    construirReferencia(g, st.M, referencia, modoRef === 'comparar');
    const morroRef = referencia.perfil.x[0];
    g.position.set(0, 0, 0);
    if (modoRef === 'comparar' && alinear === 'morro') g.position.x = modelo.xn - morroRef;
    if (modoRef === 'comparar' && alinear === 'lado') g.position.z = -(modelo.P.W / 2 + referencia.W / 2 + 0.35);
    g.visible = true;
    st.coche.visible = modoRef !== 'sola'; st.sombraSucia = true;
  }, [referencia, modoRef, alinear, modelo, soloGaraje]);
  // El garaje: cada vehículo se construye una vez por cambio de lista (los
  // modelos son pesados) y se coloca con su eje delantero en (x, z).
  // (2026-11-13) Only the cars that came in, left, or changed version (`v`) are rebuilt: picking another design
  // swaps two cars in a garage of ten, and rebuilding all ten took the whole switch. «Superponer» rebuilds them all.
  const claveGaraje = garaje.map(v => (v.v ? `${v.id}@${v.v}` : v.id)).join('|');
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const g: THREE.Group = st.grupoGaraje;
    const todo = st.superponer !== superponer, quiero = new Map(garaje.map(v => [v.id, v.v ?? '']));
    st.superponer = superponer;
    for (const o of [...g.children]) {
      if (!todo && quiero.get(o.name) === o.userData.version) continue;
      liberarFantasma(o); g.remove(o);
      o.traverse((c: any) => { c.geometry?.dispose?.(); if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } });
    }
    for (const v of garaje) {
      if (g.children.some(o => o.name === v.id)) continue;
      const def = vehiculoGaraje(v.id); if (!def) continue;
      // Un modelo del garaje que falla no puede tumbar el visor entero: se queda fuera y lo dice la consola.
      let obj: THREE.Group;
      try { obj = def.construir(); } catch (e) { console.error(`[garaje] no se pudo construir «${def.nombre}»:`, e); continue; }
      obj.name = v.id; obj.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // its box as built (closed, before the dimension lines): a click through an open door still picks the car
      obj.updateMatrixWorld(true); obj.userData.cajaCerrada = new THREE.Box3().setFromObject(obj);
      const cg = cotasGaraje(st.M, def); cg.visible = verCotas && !superponer; obj.add(cg);
      if (superponer) { hacerFantasma(obj, colorSuperpuesto(v.id)); obj.add(siluetas(def, colorSuperpuesto(v.id))); }
      // a rebuilt car keeps its doors and boot as they were
      const a = st.garajeAbre.get(v.id); if (a) colocarPivotesGaraje(obj, def, a);
      obj.userData.version = v.v ?? '';
      g.add(obj);
    }
    // Las posiciones se ponen ya (el efecto de abajo solo corre si cambian).
    for (const v of garaje) { const obj = g.children.find(o => o.name === v.id); if (obj) { obj.position.set(v.x, 0, v.z); obj.rotation.y = v.giro ?? 0; } }
    st.sombraSucia = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveGaraje, superponer]);
  // Las cotas de los coches del garaje se ven con las del nuestro (no cuando están superpuestos: se pisarían).
  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.grupoGaraje.traverse((o: THREE.Object3D) => { if (o.name === 'cotas-garaje') o.visible = verCotas && !superponer; });
  }, [verCotas, superponer, claveGaraje]);
  // Con los coches superpuestos, cada vista enseña solo la silueta que se lee en ella.
  useEffect(() => { const st = estado.current; if (st && superponer) mostrarSiluetas(st.grupoGaraje, vista); }, [vista, superponer, claveGaraje]);
  useEffect(() => {
    const st = estado.current; if (!st) return;
    for (const v of garaje) { const obj = st.grupoGaraje.children.find((o: THREE.Object3D) => o.name === v.id); if (obj) { obj.position.set(v.x, 0, v.z); obj.rotation.y = v.giro ?? 0; } }
    st.sombraSucia = true;
  }, [garaje]);
  // Túnel de viento (2026-11-09: flujo calculado, ver tunelViento.ts): se rehace cuando cambia un cuerpo, su sitio,
  // los carteles, la resolución o el número de líneas. Lo que solo se enciende o se apaga, y la velocidad, no lo rehacen.
  const claveTunel = tunel && cuerposTunel && opcionesTunel
    ? cuerposTunel.map(c => `${c.id}@${c.x},${c.z},${c.giro}:${c.envolvente.length}:${c.envolvente.reduce((s, e) => s + e[0] * 3.1 + e[1] * 5.7 + e[2] * 7.3 + e[3] * 11.9, 0).toFixed(4)}:${c.area.toFixed(4)}`).join('|')
      + JSON.stringify(carteles ?? {}) + `|${opcionesTunel.resolucion}|${opcionesTunel.lineas}` : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    if (st.tunel) { st.scene.remove(st.tunel.grupo); st.tunel.liberar(); st.tunel = null; }
    if (!tunel || !cuerposTunel || !opcionesTunel) return;
    st.tunel = crearTunel(cuerposTunel.map(c => ({ ...c, etiqueta: carteles?.[c.id] })), opcionesTunel); st.scene.add(st.tunel.grupo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunel, claveTunel]);
  useEffect(() => { if (opcionesTunel) estado.current?.tunel?.ajustar(opcionesTunel); }, [opcionesTunel, claveTunel]);
  useEffect(() => { estado.current?.tunel?.resaltar(puntoTunel); }, [puntoTunel?.cuerpo, puntoTunel?.punto, claveTunel]);
  // «Cd y consumo»: un cartel encima de cada coche (con el túnel abierto los pone el túnel).
  const claveCarteles = !tunel && carteles ? JSON.stringify(carteles) + garaje.map(v => `${v.id}@${v.x},${v.z},${v.giro ?? 0}`).join('|') + (soloGaraje ? '|solo' : '') : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    let g = st.scene.getObjectByName('carteles') as THREE.Group | undefined;
    if (g) { g.traverse((o: any) => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } }); st.scene.remove(g); }
    if (!claveCarteles || !carteles) return;
    g = new THREE.Group(); g.name = 'carteles'; st.scene.add(g);
    const poner = (texto: string | undefined, x: number, y: number, z: number) => { if (!texto) return; const c = cartel(texto); c.position.set(x, y, z); g!.add(c); };
    if (!soloGaraje) poner(carteles.aeromovil, (modelo.xn + modelo.xt) / 2, modelo.P.H + 0.55, 0);
    for (const v of garaje) {
      const def = vehiculoGaraje(v.id); if (!def) continue;
      const xs = def.envolvente?.map(e => e[0]), xm = xs?.length ? (Math.max(...xs) + Math.min(...xs)) / 2 : -def.batalla / 2, gi = v.giro ?? 0;
      poner(carteles[v.id], v.x + xm * Math.cos(gi), def.alto + 0.55, v.z - xm * Math.sin(gi));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCarteles, modelo]);
  // (2026-11-13) Each car's name, small, while no other label is on: in a garage full of our designs they look alike.
  const claveNombres = !claveCarteles && !tunel && nombres ? JSON.stringify(nombres) + garaje.map(v => `${v.id}@${v.x},${v.z},${v.giro ?? 0}`).join('|') + (soloGaraje ? '|solo' : '') : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    let g = st.scene.getObjectByName('nombres') as THREE.Group | undefined;
    if (g) { g.traverse((o: any) => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } }); st.scene.remove(g); }
    if (!claveNombres || !nombres) return;
    g = new THREE.Group(); g.name = 'nombres'; st.scene.add(g);
    const poner = (texto: string | undefined, x: number, y: number, z: number) => { if (!texto) return; const c = cartel(texto); c.scale.multiplyScalar(0.8); c.position.set(x, y, z); c.userData.texto = texto; g!.add(c); };
    if (!soloGaraje && garaje.length) poner(nombres.aeromovil, (modelo.xn + modelo.xt) / 2, modelo.P.H + 0.35, 0);
    for (const v of garaje) {
      const def = vehiculoGaraje(v.id); if (!def) continue;
      const xs = def.envolvente?.map(e => e[0]) ?? def.morroCola, xm = xs?.length ? (Math.max(...xs) + Math.min(...xs)) / 2 : -def.batalla / 2, gi = v.giro ?? 0;
      poner(nombres[v.id], v.x + xm * Math.cos(gi), def.alto + 0.35, v.z - xm * Math.sin(gi));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveNombres, modelo.xn, modelo.xt, modelo.P.H]);
  // The floor mark under the design being edited (only when there are other cars to tell it from).
  const conResalte = resaltarNuestro && !soloGaraje && garaje.length > 0 && modoRef !== 'sola';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    let m = st.scene.getObjectByName('resalte') as THREE.Mesh | undefined;
    if (m) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); st.scene.remove(m); }
    if (!conResalte) return;
    const L = modelo.xn - modelo.xt + 0.5, W = modelo.P.W + 0.5, r = 0.35, f = new THREE.Shape();
    f.moveTo(-L / 2 + r, -W / 2); f.lineTo(L / 2 - r, -W / 2); f.quadraticCurveTo(L / 2, -W / 2, L / 2, -W / 2 + r); f.lineTo(L / 2, W / 2 - r);
    f.quadraticCurveTo(L / 2, W / 2, L / 2 - r, W / 2); f.lineTo(-L / 2 + r, W / 2); f.quadraticCurveTo(-L / 2, W / 2, -L / 2, W / 2 - r); f.lineTo(-L / 2, -W / 2 + r);
    f.quadraticCurveTo(-L / 2, -W / 2, -L / 2 + r, -W / 2);
    m = new THREE.Mesh(new THREE.ShapeGeometry(f, 6), new THREE.MeshBasicMaterial({ color: 0x0f766e, transparent: true, opacity: 0.16, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.name = 'resalte'; m.rotation.x = -Math.PI / 2; m.position.set((modelo.xn + modelo.xt) / 2, 0.004, 0); m.renderOrder = 1;
    st.scene.add(m);
  }, [conResalte, modelo.xn, modelo.xt, modelo.P.W]);
  // Al abrir el túnel con más de un coche, la cámara se aleja y se eleva para verlos a la vez
  // (con las estelas delante); al cerrarlo vuelve a la vista que estaba elegida.
  // Túnel o carteles de consumo: hay que ver todos los coches a la vez.
  const verTodos = tunel || !!carteles || verGaraje;
  const claveEncuadre = verTodos ? garaje.map(v => `${v.x},${v.z}`).join('|') : '';
  // (2026-11-13) The design being edited changed place: the camera moves with the cars (the picture does not jump)
  // and then eases onto the new one. Before the framing below, which takes over when every car must be seen.
  useEffect(() => {
    const st = estado.current; if (!st || !seguir) return;
    const d = new THREE.Vector3(seguir.dx, 0, seguir.dz);
    st.camera.position.add(d); st.controls.target.add(d);
    st.target.set(-1.5, 0.55, 0);
    st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seguir?.n]);
  // The garage on its own (no tunnel, no labels): seen from the side, a little from behind and above, as the rows run.
  const deLado = verGaraje && !tunel && !carteles;
  useEffect(() => {
    const st = estado.current; if (!st) return;
    // (our designs have no silhouette, only their nose and tail: `morroCola`, 2026-11-13)
    const extremos = (id: string) => { const d = vehiculoGaraje(id); return d?.envolvente ? d.envolvente.map(e => e[0]) : d?.morroCola; };
    const enGaraje = garaje.filter(v => extremos(v.id));
    const zs = [...(soloGaraje ? [] : [0]), ...enGaraje.map(v => v.z)];
    const xs = [...(soloGaraje ? [] : [0]), ...enGaraje.map(v => v.x)];
    if (verTodos && zs.length > 1) {
      const zc = (Math.min(...zs) + Math.max(...zs)) / 2, xc = (Math.min(...xs) + Math.max(...xs)) / 2, ancho = Math.max(...zs) - Math.min(...zs);
      // La tarjeta va debajo del visor: los coches, centrados, con las estelas detrás.
      const d = 1 + ancho / 6;
      st.target.set(xc - 2.4, 0.5, zc + 0.6);
      let destino = new THREE.Vector3(xc - 2.4 - 6.4 * d, 5.0 * d, zc + 0.6 - 6.6 * d);
      // That distance never reached the camera: OrbitControls clamps it to MAX_ORBITA (25 m), so
      // with the garage full (2026-11-09: cars from z = −12 to +12) the nearest cars fell out of
      // the frame, the Cuadriciclo Bala en rombo at −12 among them. Now every car, its label and (with the
      // tunnel on) the start of its wake are checked against the actual field of view. The camera
      // keeps the distance it really had until now, and backs off along the same line only when
      // something would not fit; the orbit limit is lifted to match while this view lasts.
      const puntos: THREE.Vector3[] = [];
      const caja = (x0: number, x1: number, z: number, medioAncho: number, alto: number, giro = 0) => {
        for (const x of [x0, x1]) for (const dz of [-medioAncho, medioAncho]) for (const y of [0, alto])
          puntos.push(new THREE.Vector3(x * Math.cos(giro) + dz * Math.sin(giro), y, z - x * Math.sin(giro) + dz * Math.cos(giro)));
      };
      const estela = tunel ? 2 : 0;
      if (!soloGaraje) caja(Math.max(modelo.xn, modelo.xt), Math.min(modelo.xn, modelo.xt) - estela, 0, modelo.P.W / 2, modelo.P.H + 0.9);
      for (const v of enGaraje) {
        const def = vehiculoGaraje(v.id)!, ex = extremos(v.id)!, gi = v.giro ?? 0;
        caja(Math.max(...ex), Math.min(...ex) - estela, 0, def.ancho / 2, def.alto + 0.9, gi);
        for (const p of puntos.slice(-8)) { p.x += v.x; p.z += v.z; }
      }
      let libre = 1;
      if (deLado) {
        // (2026-11-13) the rows run along x: centred on every car, from the side, into the width a panel leaves free
        const caja3 = new THREE.Box3().setFromPoints(puntos), c = caja3.getCenter(new THREE.Vector3());
        st.target.set(c.x, 0.6, c.z);
        destino = st.target.clone().add(new THREE.Vector3(-0.35, 0.55, -1).multiplyScalar(8));
        const ancho = st.renderer.domElement.clientWidth || 1;
        libre = Math.min(1, Math.max(0.4, 1 - margenDerecho / ancho));
      }
      const haciaCamara = destino.clone().sub(st.target);
      const hastaAhora = Math.min(haciaCamara.length(), MAX_ORBITA);
      const distancia = Math.max(hastaAhora, Math.min(75, distanciaParaVer(puntos, st.target, haciaCamara, st.camera, 0.9 * libre)));
      destino = st.target.clone().addScaledVector(haciaCamara.normalize(), distancia);
      if (libre < 1) {
        // the cars move left into the free part: target and camera shift right by the covered half
        const derecha = new THREE.Vector3().crossVectors(haciaCamara.clone().negate(), st.camera.up).normalize();
        const mitad = distancia * Math.tan(THREE.MathUtils.degToRad(st.camera.fov) / 2) * st.camera.aspect;
        const corre = derecha.multiplyScalar((1 - libre) * mitad);
        st.target.add(corre); destino.add(corre);
      }
      st.controls.maxDistance = Math.max(MAX_ORBITA, distancia + 1); st.maxOrbitaAlVolver = 0;
      st.tween = { from: st.camera.position.clone(), to: destino, tf: st.controls.target.clone(), t: 0 };
    } else if (!verTodos && (st.target.x !== -1.5 || st.target.z !== 0)) {
      st.target.set(-1.5, 0.55, 0); st.maxOrbitaAlVolver = MAX_ORBITA;
      st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verTodos, claveEncuadre, soloGaraje, tunel, deLado, margenDerecho]);
  useEffect(() => { const st = estado.current; if (!st) return; st.coche.visible = !soloGaraje && !(referencia && modoRef === 'sola'); st.grupoCotas.visible = !soloGaraje && verCotas && modoRef !== 'sola'; }, [soloGaraje, referencia, modoRef, verCotas]);
  useEffect(() => { const st = estado.current; if (st) st.aperturaObjetivo = abierta ? 1 : 0; }, [abierta]);
  // «Abrir puertas» / «Abrir maletero» of a garage car: where each one is heading (the loop animates it)
  useEffect(() => {
    const st = estado.current; if (!st) return;
    for (const [id, a] of Object.entries(abiertos)) {
      const e: AperturaGaraje = st.garajeAbre.get(id) ?? { p: 0, pObj: 0, m: 0, mObj: 0, b: 0, bObj: 0 };
      e.pObj = a.puertas ? 1 : 0; e.mObj = a.maletero ? 1 : 0; e.bObj = a.bascula ? 1 : 0; st.garajeAbre.set(id, e);
    }
  }, [abiertos]);
  // the picked car left the garage (hidden): its card goes too
  useEffect(() => { if (selGaraje && !garaje.some(v => v.id === selGaraje)) setSelGaraje(null); }, [claveGaraje, selGaraje]);
  useEffect(() => { const st = estado.current; if (st) st.aperturaMalObjetivo = maleteros ? 1 : 0; }, [maleteros]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    const { body, glass, solar, bajos } = st.M as Mats;
    for (const mt of [body, bajos]) { mt.transparent = rayosX; mt.opacity = rayosX ? 0.16 : 1; mt.depthWrite = !rayosX; }
    solar.transparent = rayosX; solar.opacity = rayosX ? 0.25 : 1; solar.depthWrite = !rayosX;
    if (CALIDAD_ALTA) { glass.transmission = rayosX ? 1 : 0.95; glass.attenuationDistance = rayosX ? 2 : 0.25; } else glass.opacity = rayosX ? 0.18 : 0.55;
    const cp = corte ? [st.plano] : [];
    for (const mt of [body, glass, solar, bajos]) { mt.clippingPlanes = cp; mt.needsUpdate = true; }
    // The editor's Bala: its paint (and everything painted on it) goes see-through, the inner skin disappears;
    // «Corte» cuts every one of its materials at the centre plane, so the cockpit shows.
    const Mb = st.Mb as ReturnType<typeof materialesBala>;
    for (const mt of [Mb.chapa, Mb.blancoInterior, Mb.marino, Mb.chapaDoble, Mb.marinoDoble, Mb.chapaCalco, Mb.marinoCalco, Mb.rojo, Mb.rojoDoble, Mb.rojoPieza, Mb.junta, Mb.negroBrillo, Mb.negroMate, Mb.grisOscuro, Mb.solar]) {
      mt.transparent = rayosX; mt.opacity = rayosX ? 0.16 : 1; mt.depthWrite = !rayosX;
    }
    Mb.forro.visible = !rayosX;
    for (const mt of Object.values(Mb)) { mt.clippingPlanes = cp; mt.needsUpdate = true; }
    // (2026-11-16) the interior finish's lining goes see-through with it, and «Corte» cuts it too
    rayosInterior(rayosX, cp);
  }, [rayosX, corte]);

  // 2026-11-13: the body's colours, on the materials only (no rebuild)
  useEffect(() => {
    const st = estado.current; if (!st) return;
    pintar(st.M, st.Mb, colores ?? { carroceria: COLOR_CARROCERIA, acento: COLOR_ACENTO }); st.sombraSucia = true;
  }, [colores?.carroceria, colores?.acento]);

  // Cuadriciclo Basculante: «Bascular» (each press starts the lean over again)
  useEffect(() => { const st = estado.current; if (st && bascular > 0) st.bascula = { t: 0 }; }, [bascular]);
  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.curva = curva;
    if (!curva && st.modelo) {
      st.inclinacion = 0; construirMovil(st.G, st.M, st.modelo, st.coche, 0);
      st.M.intermitenteI.emissiveIntensity = 0.15; st.M.intermitenteD.emissiveIntensity = 0.15;
    }
  }, [curva]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.target.set(-1.5, 0.55, 0);
    st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
  }, [vista]);

  useImperativeHandle(ref, () => ({
    exportarSTL: (capas: CapaId[]) => {
      const st = estado.current;
      const grupo = new THREE.Group();
      // Del visor (m, Y arriba) al CAD (mm, Z arriba): girar +90° en X y escalar ×1000
      grupo.rotation.x = Math.PI / 2; grupo.scale.setScalar(1000);
      st.coche.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(st.coche.matrixWorld).invert();
      for (const k of capas) {
        st.G[k].traverse((o: any) => {
          if (o.isMesh) {
            const c = new THREE.Mesh(o.geometry, o.material);
            // Sin la inclinación de la carrocería: se exporta en reposo
            c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
            grupo.add(c);
          }
        });
      }
      grupo.updateMatrixWorld(true);
      const datos = new STLExporter().parse(grupo, { binary: true }) as DataView;
      return new Blob([datos.buffer as ArrayBuffer], { type: 'model/stl' });
    },
    capturar: () => new Promise<Blob>((resolver, fallar) => {
      const st = estado.current; if (!st) return fallar(new Error('El visor no está listo.'));
      // Un fotograma recién pintado, por si el bucle aún no ha dibujado este estado
      // Sin cotas: en una fotografía no hay líneas de acotación, y la IA tiende a dibujarlas si las ve
      const cotas = st.grupoCotas.visible; st.grupoCotas.visible = false;
      st.dibujar();
      st.grupoCotas.visible = cotas;
      const cv = st.renderer.domElement as HTMLCanvasElement;
      // El lienzo es transparente; el JPEG no admite transparencia y lo pondría negro: se compone sobre el fondo claro de la página
      const copia = document.createElement('canvas'); copia.width = cv.width; copia.height = cv.height;
      const ctx = copia.getContext('2d'); if (!ctx) return fallar(new Error('No se ha podido capturar el visor.'));
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, copia.width, copia.height); ctx.drawImage(cv, 0, 0);
      copia.toBlob(b => b ? resolver(b) : fallar(new Error('No se ha podido capturar el visor.')), 'image/jpeg', 0.92);
    }),
  }), []);

  const defSel = selGaraje ? vehiculoGaraje(selGaraje) : undefined;
  const fichaSel = selGaraje ? fichasGaraje?.[selGaraje] : undefined;
  const tiposSel = new Set(defSel?.pivotes?.map(p => p.tipo));
  const estSel = (selGaraje && abiertos[selGaraje]) || { puertas: false, maletero: false, bascula: false };
  const alternar = (k: 'puertas' | 'maletero' | 'bascula') => { if (selGaraje) setAbiertos(a => ({ ...a, [selGaraje]: { ...estSel, [k]: !estSel[k] } })); };
  const botonCarta = estrecho ? 'h-10 shrink-0 px-2 text-[11px] normal-case tracking-normal' : 'gap-1.5 px-2.5 py-1.5 text-[11px] normal-case tracking-normal';
  const botones = (
    <>
      {tiposSel.has('puerta') && (
        <Button variant="outline" aria-pressed={estSel.puertas} onClick={() => alternar('puertas')} className={botonCarta}>
          {!estrecho && <DoorOpen className="h-3.5 w-3.5" />}{estSel.puertas ? 'Cerrar puertas' : 'Abrir puertas'}
        </Button>
      )}
      {tiposSel.has('maletero') && (
        <Button variant="outline" aria-pressed={estSel.maletero} onClick={() => alternar('maletero')} className={botonCarta}>
          {!estrecho && <PackageOpen className="h-3.5 w-3.5" />}{estSel.maletero ? 'Cerrar maletero' : 'Abrir maletero'}
        </Button>
      )}
      {/* «Bascular» (2026-11-15): a tilting car leans to its maximum angle, wheels and all, and back */}
      {defSel?.bascula && (
        <Button variant="outline" aria-pressed={!!estSel.bascula} onClick={() => alternar('bascula')} className={botonCarta}
          title={estSel.bascula ? 'Volver a ponerlo derecho' : `Inclinarlo ${defSel.bascula.angulo}°, como en una curva`}>
          {!estrecho && <MoveDiagonal className="h-3.5 w-3.5" />}{estSel.bascula ? 'Enderezar' : 'Bascular'}
        </Button>
      )}
    </>
  );
  return (
    <>
      <canvas ref={lienzo} className="absolute inset-0 h-full w-full touch-none" aria-label={modelo.tipo === 'basculante' ? 'Modelo 3D del Cuadriciclo Basculante' : modelo.tipo === 'a1' ? 'Modelo 3D del Aeromóvil 1' : modelo.tipo === 'bala' ? 'Modelo 3D del Cuadriciclo Bala en rombo' : modelo.tipo === 'triciclo' ? (modelo.traseras ? 'Modelo 3D del Cuadriciclo Bala clásico' : 'Modelo 3D del Triciclo Bala') : 'Modelo 3D del Aeromóvil Gota'} />
      {/* The card of a garage car picked with a click or a tap: its doors and its boot (2026-11-12). */}
      {/* One of our designs in the garage (2026-11-12): its figures, its doors and «Quitar del garaje». On a phone at the bottom, above the toolbar. */}
      {defSel && fichaSel && (
        <Card role="group" data-tarjeta-garaje="" aria-label={`${defSel.nombre}: diseño en el garaje`} style={estrecho ? { bottom: bajoCarta } : undefined}
          className={estrecho ? 'absolute inset-x-3 z-[16] p-2.5 shadow-lg' : 'absolute left-3 top-12 z-[16] w-[min(300px,calc(100%-24px))] p-3 shadow-lg'}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{defSel.nombre}</p>
              {fichaSel.map((l, i) => <p key={i} className="text-[11px] leading-snug text-slate-600">{l}</p>)}
            </div>
            <Button variant="ghost" onClick={() => setSelGaraje(null)} aria-label="Cerrar" title="Cerrar" className="-mr-1.5 -mt-1.5 h-10 w-10 shrink-0 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {botones}
            {alQuitarGaraje && (
              <Button variant="outline" onClick={() => { const id = selGaraje!; setSelGaraje(null); alQuitarGaraje(id); }} className={botonCarta}>
                {!estrecho && <Trash2 className="h-3.5 w-3.5" />}Quitar del garaje
              </Button>
            )}
          </div>
        </Card>
      )}
      {defSel && !fichaSel && estrecho && (
        <Card role="group" data-tarjeta-garaje="" aria-label={`${defSel.nombre}: puertas y maletero`} style={{ bottom: bajoCarta }}
          className="absolute inset-x-3 z-[16] flex items-center gap-1 p-1.5 shadow-lg">
          <span className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold text-slate-900">{defSel.nombre}</span>
          {botones}
          {extraTarjeta?.(selGaraje!)}
          <Button variant="ghost" onClick={() => setSelGaraje(null)} aria-label="Cerrar" title="Cerrar" className="h-10 w-10 shrink-0 p-0">
            <X className="h-5 w-5" />
          </Button>
        </Card>
      )}
      {defSel && !fichaSel && !estrecho && (
        <Card role="group" data-tarjeta-garaje="" aria-label={`${defSel.nombre}: puertas y maletero`} className="absolute left-3 top-12 z-[16] w-[min(280px,calc(100%-24px))] p-3 shadow-lg">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{defSel.nombre}</p>
              {(tiposSel.size > 0 || defSel.bascula || alMoverGaraje) && <p className="text-[11px] leading-snug text-slate-500">
                {tiposSel.size > 0 ? `Abre ${[tiposSel.has('puerta') && 'sus puertas', tiposSel.has('maletero') && 'su maletero'].filter(Boolean).join(' y ')} para ver cómo se ${tiposSel.has('puerta') ? 'abren' : 'abre'}. ` : ''}{defSel.bascula ? `«Bascular» lo inclina ${defSel.bascula.angulo}° con las cuatro ruedas, como en una curva.` : ''}{alMoverGaraje ? ' Para moverlo, púlsalo y arrástralo.' : ''}
              </p>}
            </div>
            <Button variant="ghost" onClick={() => setSelGaraje(null)} aria-label="Cerrar" title="Cerrar" className="-mr-1.5 -mt-1.5 h-10 w-10 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{botones}{extraTarjeta?.(selGaraje!)}</div>
        </Card>
      )}
    </>
  );
});
