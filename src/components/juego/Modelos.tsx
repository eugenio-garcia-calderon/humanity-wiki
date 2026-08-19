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
  sprint: 'Sprint_Loop',
  sit: 'Sitting_Idle_Loop',
  talk: 'Idle_Talking_Loop',
  dance: 'Dance_Loop',
};

/** Texturas de piel disponibles por cuerpo (el .gltf trae la oscura puesta). */
const PIEL: Record<string, { clara: string; oscura: string }> = {
  Superhero_Male_FullBody: { clara: 'T_Superhero_Male_Light.png', oscura: 'T_Superhero_Male_Dark.png' },
  Superhero_Female_FullBody: { clara: 'T_Superhero_Female_Light.png', oscura: 'T_Superhero_Female_Dark_BaseColor.png' },
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

function PersonaModelo({ cuerpo, animacion = 'idle', escala = 2.6, aspecto }: {
  cuerpo: string;
  animacion?: string;
  /** Se conserva la semántica antigua (2,6 = estatura normal): los que
   *  llaman no cambian. El humano ya mide 1,81 a escala 1. */
  escala?: number;
  /** Piel, pelo y ropa elegidos. Sin esto, el modelo va como viene. */
  aspecto?: Aspecto;
}) {
  // Los 10 fenotipos antiguos se reparten entre los dos cuerpos reales: los
  // nombres con «female» van al femenino. El hash de cuerpoDe no cambia.
  const humano = cuerpo.includes('female') ? 'Superhero_Female_FullBody' : 'Superhero_Male_FullBody';
  const { scene } = useGLTF(`${HUMANOS}/${humano}.gltf`);
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
    });
    return c;
  }, [scene]);
  const { actions } = useAnimations(animations, grupo);

  // --- Personalización: tono de piel (clara/oscura según el color elegido)
  // y tinte del pelo. La ropa es el traje del modelo (deuda anotada: teñirlo
  // pediría una máscara de zonas en la textura).
  const clave = aspecto && (aspecto.piel || aspecto.pelo) ? `${aspecto.piel}|${aspecto.pelo}` : '';
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
      if (nombre.startsWith('MI_Hair') && aspecto?.pelo) {
        const mat = original.clone();
        mat.color = new THREE.Color(aspecto.pelo);
        m.material = mat;
      } else if (nombre.startsWith('MI_Superhero') && aspecto?.piel) {
        const mat = original.clone();
        mat.map = texturaPiel(PIEL[humano][clara ? 'clara' : 'oscura'], original.map);
        mat.needsUpdate = true;
        m.material = mat;
      }
    });
  }, [clave, clon, aspecto, humano]);

  useEffect(() => {
    const a = actions[PISTAS[animacion] || animacion] || actions['Idle_Loop'];
    if (!a) return;
    a.reset().fadeIn(0.25).play();
    return () => { a.fadeOut(0.25); };
  }, [actions, animacion]);

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
  // Fase 4 del realismo: los cuerpos humanos y su librería de animaciones.
  useGLTF.preload(`${HUMANOS}/Superhero_Male_FullBody.gltf`);
  useGLTF.preload(`${HUMANOS}/Superhero_Female_FullBody.gltf`);
  useGLTF.preload(`${HUMANOS}/UAL1_Standard.glb`);
  for (const m of ['fence', 'fence-low', 'planter', 'tree-large', 'tree-small', 'path-stones-long']) {
    useGLTF.preload(`${PUEBLO}/${m}.glb`);
  }
}
