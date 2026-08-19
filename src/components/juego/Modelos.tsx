// ============================================================================
// JUEGO VITAL — modelos 3D reales (2026-08-18, decisión de Eugenio: librería
// descargada de personas y objetos).
//
// Los .glb viven en `public/modelos-juego/` y son de Kenney, CC0 (dominio
// público) — ver el LICENSE.md de esa carpeta. Se cargan bajo demanda y se
// precargan al entrar al juego, así que no bloquean el primer pintado.
//
// Lo instanciado (los ~1.100 árboles del bosque) SIGUE siendo procedural: son
// una malla instanciada de una sola llamada de dibujo, y cambiarla por 1.100
// modelos sueltos hundiría el rendimiento en el móvil. Los modelos se usan
// donde se miran de cerca: personas, casas y mobiliario del pueblo.
// ============================================================================
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import type { Aspecto } from './aspecto';

// IMPORTANTE: los .glb de Kenney NO llevan la textura dentro — apuntan a
// `Textures/colormap.png` en su misma carpeta. Por eso cada pack vive en su
// propio directorio con su textura al lado: si se mezclan, unos modelos salen
// con la paleta equivocada (y si falta, salen todos blancos).
//
// Y NO pueden vivir en `public/juego/`: esa carpeta chocaría con la ruta
// `/juego` de la página, y el servidor de estáticos respondería a `/juego` con
// un 301 a `/juego/` (pasó en producción el 2026-08-18). Las carpetas de
// `public/` no deben llamarse como una ruta de la aplicación.
const PERSONAS = '/modelos-juego/personas';
const PUEBLO = '/modelos-juego/pueblo';

/** Cuerpos disponibles para las personas del mundo. */
export const CUERPOS = [
  'character-male-a', 'character-female-a', 'character-male-b', 'character-female-b',
  'character-male-c', 'character-female-c', 'character-male-d', 'character-female-d',
  'character-male-e', 'character-female-e',
] as const;

/** Casas de la aldea: 12 tipos para que el anillo no se vea repetido. */
export const CASAS = [
  'building-type-a', 'building-type-b', 'building-type-c', 'building-type-d',
  'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h',
  'building-type-i', 'building-type-j', 'building-type-k', 'building-type-l',
] as const;

/** Elige siempre el mismo cuerpo para el mismo nombre. */
export function cuerpoDe(nombre: string): string {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return CUERPOS[h % CUERPOS.length];
}

// ---------------------------------------------------------------------------
// PERSONAS REALISTAS (2026-08-19, fase 4 del realismo, decisión de Eugenio:
// «proporciones humanas reales»). Los cuerpos son los Universal Base
// Characters de Quaternius (CC0, 1,81 m de estatura real) y las animaciones
// vienen de su Universal Animation Library (CC0, 43 pistas): ambos comparten
// esqueleto (huesos estilo Unreal), así que las pistas de la librería mueven
// directamente a los personajes.
// ---------------------------------------------------------------------------
const HUMANOS = '/modelos-juego/humanos';

/** Del nombre de animación del juego a la pista real de la librería. */
const PISTAS: Record<string, string> = {
  idle: 'Idle_Loop',
  walk: 'Walk_Loop',
  jog: 'Jog_Fwd_Loop',
  sprint: 'Sprint_Loop',
  salto: 'Jump_Loop',
  conducir: 'Driving_Loop',
  sit: 'Sitting_Idle_Loop',
  talk: 'Idle_Talking_Loop',
  dance: 'Dance_Loop',
};

/** Texturas de piel disponibles por cuerpo (el .gltf trae la oscura puesta). */
const PIEL: Record<string, { clara: string; oscura: string }> = {
  Superhero_Male_FullBody: { clara: 'T_Superhero_Male_Light.jpg', oscura: 'T_Superhero_Male_Dark.jpg' },
  Superhero_Female_FullBody: { clara: 'T_Superhero_Female_Light.jpg', oscura: 'T_Superhero_Female_Dark_BaseColor.jpg' },
};

/** Caché de texturas de piel: la misma imagen se sube a la GPU una vez. */
const cachePiel = new Map<string, THREE.Texture>();
function texturaPiel(archivo: string, referencia?: THREE.Texture | null): THREE.Texture {
  const ya = cachePiel.get(archivo);
  if (ya) return ya;
  const t = new THREE.TextureLoader().load(`${HUMANOS}/${archivo}`);
  t.flipY = referencia ? referencia.flipY : false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (referencia) { t.wrapS = referencia.wrapS; t.wrapT = referencia.wrapT; }
  cachePiel.set(archivo, t);
  return t;
}

/**
 * Una persona animada con proporciones humanas REALES. `animacion` es el
 * nombre del juego (idle, walk, sprint…), traducido a la pista de la
 * librería. Cada instancia clona el esqueleto: sin esto, varias personas
 * compartirían huesos y se moverían todas a la vez.
 *
 * La `key` de aquí abajo NO es decorativa. Cambiar de cuerpo carga OTRO
 * modelo con otro esqueleto, y el mezclador de animación se quedaba
 * apuntando a los huesos del anterior (fallo reportado por Eugenio en la
 * era Kenney). Con la key, cambiar de cuerpo monta una persona nueva.
 */
export function Persona3D(props: Parameters<typeof PersonaModelo>[0]) {
  return <PersonaModelo key={props.cuerpo} {...props} />;
}

/** Traje: siempre el de aldeano. El de explorador (Ranger) se probó y va con
 *  el torso al aire — parecía otra vez el problema del desnudo, así que sus
 *  ficheros se BORRARON el 2026-08-19: pesaban 4,3 MB y se descargaban en
 *  cada visita sin llegar a dibujarse nunca. El tipo ya no admite 'Ranger',
 *  para que nadie pueda pedir un fichero que no existe. */
function trajeDe(_cuerpo: string): 'Peasant' {
  return 'Peasant';
}

/**
 * El cuerpo base es la variante «Superhero» (musculosa) y los trajes están
 * cortados para la variante «Regular»: puestos tal cual, la piel ATRAVIESA
 * la tela (parecían desnudos con correas, fallo visto en pruebas). Arreglo
 * de raíz: al cuerpo se le RECORTAN los triángulos por debajo del cuello —
 * queda cabeza y cuello — y el traje pone todo lo demás (incluye manos con
 * guantes y antebrazos remangados). El recorte se hace UNA vez por modelo y
 * la geometría recortada se comparte entre todos los clones.
 */
const cacheCabezas = new Map<string, THREE.BufferGeometry>();
function soloCabeza(nombreModelo: string, geo: THREE.BufferGeometry, cuello: number): THREE.BufferGeometry {
  const ya = cacheCabezas.get(nombreModelo);
  if (ya) return ya;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const idx = geo.index!;
  const nuevo: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    // El triángulo vive si ALGÚN vértice queda por encima del cuello: la
    // fila de la costura se conserva y el cuello no muestra un hueco.
    if (pos.getY(a) > cuello || pos.getY(b) > cuello || pos.getY(c) > cuello) nuevo.push(a, b, c);
  }
  const g = geo.clone();
  g.setIndex(nuevo);
  cacheCabezas.set(nombreModelo, g);
  return g;
}

/**
 * PEINADOS (pulido de caras, 2026-08-19): los cuerpos base van calvos — solo
 * cejas — y eso era media cara. Cada persona recibe un peinado del pack
 * (enganchado al hueso de la cabeza, mismo esqueleto) elegido por su hash;
 * algunos hombres llevan además barba. El color de pelo del creador los tiñe.
 */
const PEINADOS_EL = [['Hair_Buzzed'], ['Hair_SimpleParted'], ['Hair_Buzzed', 'Hair_Beard'], ['Hair_SimpleParted', 'Hair_Beard']];
const PEINADOS_ELLA = [['Hair_Long'], ['Hair_Buns'], ['Hair_BuzzedFemale'], ['Hair_Long']];
function peinadosDe(cuerpo: string, genero: string): string[] {
  let h = 0;
  for (let i = 0; i < cuerpo.length; i++) h = (h * 37 + cuerpo.charCodeAt(i)) >>> 0;
  const lista = genero === 'Female' ? PEINADOS_ELLA : PEINADOS_EL;
  return lista[h % lista.length];
}
const TODOS_PEINADOS = ['Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Beard', 'Hair_Long', 'Hair_Buns', 'Hair_BuzzedFemale'];

/** La tela de cada persona se tiñe con una paleta FIJA de colores de ropa:
 *  da variedad y evita que el lino crudo del traje parezca piel a lo lejos. */
const PALETA_ROPA = ['#8fa3c0', '#a8b28a', '#c9977b', '#a486a0', '#b0a284', '#96b3ab', '#c0a3a3', '#93a6b8'];
function tinteRopaDe(cuerpo: string): THREE.Color {
  let h = 0;
  for (let i = 0; i < cuerpo.length; i++) h = (h * 131 + cuerpo.charCodeAt(i)) >>> 0;
  return new THREE.Color(PALETA_ROPA[h % PALETA_ROPA.length]).lerp(new THREE.Color('#ffffff'), 0.2);
}

function PersonaModelo({ cuerpo, animacion = 'idle', escala = 2.6, aspecto, ritmo }: {
  cuerpo: string;
  animacion?: string;
  /** Se conserva la semántica antigua (2,6 = estatura normal): los que
   *  llaman no cambian. El humano ya mide 1,81 a escala 1. */
  escala?: number;
  /** Piel, pelo y ropa elegidos. Sin esto, el modelo va como viene. */
  aspecto?: Aspecto;
  /** Cadencia de la animación: 1 = la del clip. Va por ref y se aplica cada
   *  fotograma — así el paso se acompasa a la velocidad REAL sin re-render. */
  ritmo?: React.MutableRefObject<number>;
}) {
  // Los 10 fenotipos antiguos se reparten entre los dos cuerpos reales: los
  // nombres con «female» van al femenino. El hash de cuerpoDe no cambia.
  const genero = cuerpo.includes('female') ? 'Female' : 'Male';
  const humano = `Superhero_${genero}_FullBody`;
  const traje = trajeDe(cuerpo);
  const { scene } = useGLTF(`${HUMANOS}/${humano}.gltf`);
  const ropaGltf = useGLTF(`${HUMANOS}/${genero}_${traje}.gltf`);
  // Los 6 peinados se cargan de una vez (drei los cachea globalmente): el
  // número de hooks no puede depender de qué peinado toque a este cuerpo.
  const peinadosGltf = useGLTF(TODOS_PEINADOS.map(n => `${HUMANOS}/${n}.gltf`)) as unknown as { scene: THREE.Group }[];
  // Las ANIMACIONES viven en su propio .glb (el maniquí de la librería) y se
  // aplican al clon por nombre de hueso: mismo esqueleto, mismas pistas.
  const { animations } = useGLTF(`${HUMANOS}/UAL1_Standard.glb`);
  const grupo = useRef<THREE.Group>(null);
  const clon = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      // El material tal y como viene del .gltf: al personalizar se clona
      // SIEMPRE desde el original (los clones comparten materiales).
      m.userData.matBase = m.material;
      // El CUERPO pierde todo lo que el traje va a cubrir (ver soloCabeza).
      if (m.name.toLowerCase().includes('superhero')) {
        m.geometry = soloCabeza(humano, m.geometry, genero === 'Female' ? 1.4 : 1.45);
      }
    });
    // --- VESTIR al personaje (los cuerpos base van en ropa interior, fallo
    // reportado por Eugenio con captura). El traje viene aparte, montado
    // sobre el MISMO esqueleto universal: se clonan sus prendas y se re-atan
    // hueso a hueso al esqueleto del cuerpo — misma pose, misma animación.
    const huesos = new Map<string, THREE.Bone>();
    c.traverse((o) => { if ((o as THREE.Bone).isBone) huesos.set(o.name, o as THREE.Bone); });
    const ropa = SkeletonUtils.clone(ropaGltf.scene);
    const prendas: THREE.SkinnedMesh[] = [];
    ropa.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) prendas.push(o as THREE.SkinnedMesh); });
    const tinte = tinteRopaDe(cuerpo);
    let matTela: THREE.MeshStandardMaterial | null = null;
    for (const p of prendas) {
      const nuevos = p.skeleton.bones.map(b => huesos.get(b.name));
      // Un hueso que no case = el traje no es de este esqueleto: mejor en
      // ropa interior que con la prenda rota por el suelo.
      if (nuevos.some(b => !b)) continue;
      p.skeleton = new THREE.Skeleton(nuevos as THREE.Bone[], p.skeleton.boneInverses);
      p.castShadow = true; p.receiveShadow = true;
      p.userData.esRopa = true;
      // La TELA (material del traje) se tiñe con el color de esta persona;
      // los antebrazos remangados (material Regular) son piel y no se tocan.
      const mat = p.material as THREE.MeshStandardMaterial;
      if (mat?.name?.includes('Peasant') || mat?.name?.includes('Ranger')) {
        if (!matTela) {
          matTela = mat.clone();
          matTela.color = tinte;
        }
        p.material = matTela;
      }
      p.userData.matBase = p.material;
      c.add(p);
    }

    // --- PEINADO (pulido de caras): las mallas del pelo van montadas sobre
    // el mismo esqueleto, así que se re-atan igual que la ropa. Sin esto los
    // personajes iban calvos y la cara se quedaba a medias.
    for (const nombre of peinadosDe(cuerpo, genero)) {
      const fuente = peinadosGltf[TODOS_PEINADOS.indexOf(nombre)]?.scene;
      if (!fuente) continue;
      const pelo = SkeletonUtils.clone(fuente);
      // Se recolectan ANTES de mover: añadir al cuerpo dentro del traverse
      // saca la malla del árbol que se está recorriendo (mismo cuidado que
      // con las prendas, arriba).
      const mechas: THREE.SkinnedMesh[] = [];
      pelo.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) mechas.push(o as THREE.SkinnedMesh); });
      for (const sm of mechas) {
        const nuevos = sm.skeleton.bones.map(b => huesos.get(b.name));
        if (nuevos.some(b => !b)) continue;
        sm.skeleton = new THREE.Skeleton(nuevos as THREE.Bone[], sm.skeleton.boneInverses);
        sm.castShadow = true;
        sm.userData.esPelo = true;
        sm.userData.matBase = sm.material;
        c.add(sm);
      }
    }
    return c;
  }, [scene, ropaGltf.scene, peinadosGltf, cuerpo, genero]);
  const { actions } = useAnimations(animations, grupo);

  // --- Personalización: tono de piel (clara/oscura según el color elegido),
  // tinte del pelo y tinte del TRAJE con el color de ropa del creador.
  const clave = aspecto && (aspecto.piel || aspecto.pelo || aspecto.ropa)
    ? `${aspecto.piel}|${aspecto.pelo}|${aspecto.ropa}`
    : '';
  useEffect(() => {
    if (!clave) return;
    const piel = aspecto?.piel ? new THREE.Color(aspecto.piel) : null;
    const clara = piel ? (0.299 * piel.r + 0.587 * piel.g + 0.114 * piel.b) > 0.42 : true;
    clon.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const original = m.userData.matBase as THREE.MeshStandardMaterial;
      if (!original) return;
      const nombre = original.name || '';
      if (m.userData.esRopa) {
        // El traje conserva su TELA tal cual. Se probó teñirlo con el color
        // de ropa del creador y los tonos carne/pastel de la era Kenney
        // dejaban la prenda color piel — parecían desnudos otra vez. Deuda:
        // un selector de traje real en el builder.
        return;
      }
      if (nombre.startsWith('MI_Eyes')) {
        // Ojos con brillo: sin esto son dos discos mates y la mirada se
        // apaga (pulido de caras).
        const mat = original.clone();
        mat.roughness = 0.12;
        mat.metalness = 0.05;
        mat.envMapIntensity = 1.6;
        m.material = mat;
      } else if ((nombre.startsWith('MI_Hair') || m.userData.esPelo) && aspecto?.pelo) {
        const mat = original.clone();
        mat.color = new THREE.Color(aspecto.pelo);
        mat.roughness = 0.62;
        m.material = mat;
      } else if (nombre.startsWith('MI_Superhero') && aspecto?.piel) {
        const mat = original.clone();
        mat.map = texturaPiel(PIEL[humano][clara ? 'clara' : 'oscura'], original.map);
        mat.needsUpdate = true;
        m.material = mat;
      }
    });
  }, [clave, clon, aspecto, humano]);

  const accionViva = useRef<THREE.AnimationAction | null>(null);
  useEffect(() => {
    const a = actions[PISTAS[animacion] || animacion] || actions['Idle_Loop'];
    if (!a) return;
    accionViva.current = a;
    a.reset().fadeIn(0.25).play();
    return () => { a.fadeOut(0.25); };
  }, [actions, animacion]);

  // La cadencia se acompasa cada fotograma a lo que pida el ritmo (el paso
  // del que anda despacio es más lento que el del que esprinta de verdad).
  useFrame(() => {
    if (ritmo && accionViva.current) accionViva.current.timeScale = ritmo.current;
  });

  return (
    <group ref={grupo} scale={escala / 2.6}>
      <primitive object={clon} />
    </group>
  );
}

/** Un modelo estático cualquiera del catálogo (casas, vallas, jardineras…). */
export function Modelo({ nombre, escala = 1, rotY = 0 }: {
  nombre: string;
  escala?: number;
  rotY?: number;
}) {
  const { scene } = useGLTF(`${PUEBLO}/${nombre}.glb`);
  const clon = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    return c;
  }, [scene]);
  return <primitive object={clon} scale={escala} rotation-y={rotY} />;
}

/** Se llama al montar la escena: descarga los modelos en segundo plano. */
export function precargarModelos() {
  // Fase 4 del realismo: los cuerpos humanos, sus trajes y las animaciones.
  useGLTF.preload(`${HUMANOS}/Superhero_Male_FullBody.gltf`);
  useGLTF.preload(`${HUMANOS}/Superhero_Female_FullBody.gltf`);
  // Solo el traje de aldeano. El de explorador (Ranger) se seguía PRECARGANDO
  // aunque `trajeDe()` no lo devuelve nunca: 4,3 MB que se descargaban en
  // cada visita para no usarse jamás (2026-08-19).
  for (const t of ['Male_Peasant', 'Female_Peasant']) {
    useGLTF.preload(`${HUMANOS}/${t}.gltf`);
  }
  for (const p of TODOS_PEINADOS) useGLTF.preload(`${HUMANOS}/${p}.gltf`);
  useGLTF.preload(`${HUMANOS}/UAL1_Standard.glb`);
  for (const m of ['fence', 'fence-low', 'planter', 'tree-large', 'tree-small', 'path-stones-long']) {
    useGLTF.preload(`${PUEBLO}/${m}.glb`);
  }
}
