// ============================================================================
// JUEGO VITAL — modelos 3D reales (2026-08-18, decisión de Eugenio: librería
// descargada de personas y objetos).
//
// Los .glb viven en `public/juego/modelos/` y son de Kenney, CC0 (dominio
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

// IMPORTANTE: los .glb de Kenney NO llevan la textura dentro — apuntan a
// `Textures/colormap.png` en su misma carpeta. Por eso cada pack vive en su
// propio directorio con su textura al lado: si se mezclan, unos modelos salen
// con la paleta equivocada (y si falta, salen todos blancos).
const PERSONAS = '/juego/modelos/personas';
const PUEBLO = '/juego/modelos/pueblo';

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

/**
 * Una persona animada. `animacion` es el nombre de la pista del propio modelo
 * (idle, walk, sprint, sit…). Cada instancia clona el esqueleto: sin esto,
 * varias personas compartirían huesos y se moverían todas a la vez.
 */
// El modelo mide 0,67 unidades: a escala 2,6 queda en ~1,75 m, la estatura
// real de un adulto en un mundo donde 1 unidad = 1 metro (medido, no estimado).
export function Persona3D({ cuerpo, animacion = 'idle', escala = 2.6 }: {
  cuerpo: string;
  animacion?: string;
  escala?: number;
}) {
  const { scene, animations } = useGLTF(`${PERSONAS}/${cuerpo}.glb`);
  const grupo = useRef<THREE.Group>(null);
  const clon = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    return c;
  }, [scene]);
  const { actions } = useAnimations(animations, grupo);

  useEffect(() => {
    const a = actions[animacion];
    if (!a) return;
    a.reset().fadeIn(0.25).play();
    return () => { a.fadeOut(0.25); };
  }, [actions, animacion]);

  return (
    <group ref={grupo} scale={escala}>
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
  for (const c of CUERPOS) useGLTF.preload(`${PERSONAS}/${c}.glb`);
  for (const c of CASAS) useGLTF.preload(`${PUEBLO}/${c}.glb`);
  for (const m of ['fence', 'fence-low', 'planter', 'tree-large', 'tree-small', 'path-stones-long']) {
    useGLTF.preload(`${PUEBLO}/${m}.glb`);
  }
}
