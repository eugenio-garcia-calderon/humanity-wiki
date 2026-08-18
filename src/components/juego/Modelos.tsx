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
import { cargarPaleta, clasificarMalla, pintarTextura, type Aspecto } from './aspecto';

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

/**
 * Una persona animada. `animacion` es el nombre de la pista del propio modelo
 * (idle, walk, sprint, sit…). Cada instancia clona el esqueleto: sin esto,
 * varias personas compartirían huesos y se moverían todas a la vez.
 */
// El modelo mide 0,67 unidades: a escala 2,6 queda en ~1,75 m, la estatura
// real de un adulto en un mundo donde 1 unidad = 1 metro (medido, no estimado).
//
// La `key` de aquí abajo NO es decorativa. Cambiar de fenotipo carga OTRO
// .glb, con otro esqueleto y otras pistas, y el mezclador de animación se
// quedaba apuntando a los huesos del modelo anterior: el muñeco se quedaba
// clavado en su pose de reposo, sin andar ni respirar (fallo reportado por
// Eugenio, «he cambiado el estilo de mi avatar y ya no tiene dinamismo al
// moverse»; recargar la página lo arreglaba, que es la firma de este fallo).
// Con la key, cambiar de cuerpo monta una persona nueva y limpia.
export function Persona3D(props: Parameters<typeof PersonaModelo>[0]) {
  return <PersonaModelo key={props.cuerpo} {...props} />;
}

function PersonaModelo({ cuerpo, animacion = 'idle', escala = 2.6, aspecto }: {
  cuerpo: string;
  animacion?: string;
  escala?: number;
  /** Piel, pelo, ojos y ropa elegidos. Sin esto, el modelo va como viene. */
  aspecto?: Aspecto;
}) {
  const { scene, animations } = useGLTF(`${PERSONAS}/${cuerpo}.glb`);
  const grupo = useRef<THREE.Group>(null);
  const clon = useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      // El material tal y como viene del .glb. Se guarda porque al cambiar de
      // color hay que repintar SIEMPRE desde el original, no desde el tinte
      // anterior (si no, cada cambio se acumularía sobre el de antes).
      m.userData.matBase = m.material;
    });
    return c;
  }, [scene]);
  const { actions } = useAnimations(animations, grupo);

  // --- Aspecto: se repinta la paleta con los colores elegidos, una textura
  // por malla. El material se clona primero, porque los 10 cuerpos comparten
  // el mismo por defecto y teñir uno los teñiría todos.
  // Solo se repinta si hay algún color elegido: `cuerpo` por sí solo no cambia
  // la textura, y montar dos lienzos de 512×512 por vecino no sale gratis.
  const clave = aspecto && (aspecto.piel || aspecto.pelo || aspecto.ropa || aspecto.pantalon)
    ? JSON.stringify(aspecto)
    : '';
  useEffect(() => {
    if (!clave) return;
    let vivo = true;
    const creadas: THREE.Texture[] = [];
    cargarPaleta(`${PERSONAS}/Textures/colormap.png`).then((base) => {
      if (!vivo) return;
      clon.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const original = m.userData.matBase as THREE.MeshStandardMaterial;
        const lienzo = pintarTextura(base, clasificarMalla(m, base), aspecto!);
        const t = new THREE.CanvasTexture(lienzo);
        const fuente = original?.map;
        if (fuente) {
          // CLAVE: la paleta de Kenney son cuadraditos de UN píxel. Con el
          // filtrado suave y los mipmaps que trae `CanvasTexture` por defecto,
          // cada cuadradito se mezcla con sus vecinos y el personaje sale a
          // rayas de colores. Se copia el muestreo del .glb, que es el bueno.
          t.flipY = fuente.flipY;
          t.wrapS = fuente.wrapS; t.wrapT = fuente.wrapT;
          t.magFilter = fuente.magFilter; t.minFilter = fuente.minFilter;
          t.generateMipmaps = fuente.generateMipmaps;
          t.anisotropy = fuente.anisotropy;
          t.colorSpace = fuente.colorSpace;
        } else {
          t.flipY = false;
          t.colorSpace = THREE.SRGBColorSpace;
        }
        t.needsUpdate = true;
        const mat = original.clone();
        mat.map = t;
        mat.needsUpdate = true;
        m.material = mat;
        creadas.push(t);
      });
    }).catch(() => { /* sin paleta, el modelo se ve como viene */ });
    return () => { vivo = false; creadas.forEach(t => t.dispose()); };
  }, [clave, clon, aspecto]);

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
