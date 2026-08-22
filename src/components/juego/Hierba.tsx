// ============================================================================
// JUEGO VITAL — hierba de verdad (2026-08-19, fase 1 del realismo). Miles de
// matas de tres hojas en UNA sola malla instanciada (un draw call), mecidas
// por el viento desde el shader. La cantidad la decide el nivel de calidad.
// Las matas solo nacen donde tiene sentido: ni en la plaza empedrada, ni en
// los caminos, ni dentro del río o los lagos.
// ============================================================================
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { crearAzar, centroRio } from './paleta';
import { LAGOS, enCamino } from './mapa';

function hierbaPermitida(x: number, z: number): boolean {
  // Ni en el empedrado de la plaza, ni en las 6 sendas, ni en sus plazas.
  if (enCamino(x, z, 1.2)) return false;
  if (Math.abs(z) < 7 && x > -99 && x < 133) return false;          // camino E-O antiguo
  if (Math.abs(x - centroRio(z)) < 11) return false;                // río
  for (const l of LAGOS) {
    if (Math.hypot((x - l.x) / (l.rx + 4), (z - l.z) / (l.rz + 4)) < 1) return false;
  }
  return true;
}

/** La geometría de UNA mata: tres hojas afiladas cruzadas, con degradado de
 *  color del pie (oscuro) a la punta (claro) en los vértices. */
function geometriaMata(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const pie = new THREE.Color('#3e6626');
  const punta = new THREE.Color('#9cc45e');
  const medio = pie.clone().lerp(punta, 0.55);
  let base = 0;
  for (let h = 0; h < 3; h++) {
    const ang = (h / 3) * Math.PI + h * 0.35;
    const dx = Math.cos(ang), dz = Math.sin(ang);
    const ox = Math.cos(ang + Math.PI / 2) * 0.05 * (h - 1);
    const oz = Math.sin(ang + Math.PI / 2) * 0.05 * (h - 1);
    const alto = 0.36 + h * 0.07;
    const w = 0.05, wm = 0.03;
    pos.push(
      -dx * w + ox, 0, -dz * w + oz,
      dx * w + ox, 0, dz * w + oz,
      -dx * wm + ox * 1.6, alto * 0.55, -dz * wm + oz * 1.6,
      dx * wm + ox * 1.6, alto * 0.55, dz * wm + oz * 1.6,
      ox * 2.4, alto, oz * 2.4,
    );
    col.push(
      pie.r, pie.g, pie.b, pie.r, pie.g, pie.b,
      medio.r, medio.g, medio.b, medio.r, medio.g, medio.b,
      punta.r, punta.g, punta.b,
    );
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
    base += 5;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Hierba({ cantidad }: { cantidad: number }) {
  const malla = useMemo(() => {
    if (cantidad <= 0) return null;
    const geo = geometriaMata();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    // El viento vive en el shader: cada mata se mece con una fase sacada de
    // su propia posición (la traslación de su matriz de instancia), y el
    // balanceo crece con el cuadrado de la altura — el pie no se mueve.
    const uTiempo = { value: 0 };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTiempo = uTiempo;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTiempo;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  float faseMata = instanceMatrix[3][0] * 0.41 + instanceMatrix[3][2] * 0.53;
  float vaiven = sin(uTiempo * 1.7 + faseMata) * 0.10 + sin(uTiempo * 3.9 + faseMata * 1.7) * 0.045;
  transformed.x += vaiven * position.y * position.y * 4.0;
  transformed.z += vaiven * position.y * position.y * 1.6;
#endif`);
    };
    mat.userData.uTiempo = uTiempo;

    const m = new THREE.InstancedMesh(geo, mat, cantidad);
    const azar = crearAzar(2027);
    const M = new THREE.Matrix4();
    const P = new THREE.Vector3(), S = new THREE.Vector3();
    const Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    const tinte = new THREE.Color();
    let puestas = 0, intentos = 0;
    while (puestas < cantidad && intentos < cantidad * 30) {
      intentos++;
      // Sesgo hacia el pueblo: es donde está el jugador casi siempre.
      const ang = azar() * Math.PI * 2;
      // Radio del césped: 210 era para el mundo viejo. Con MITAD = 95, la
      // hierba que caía más allá de 90 no la pisaba nadie (2026-08-22).
      const r = 10 + Math.pow(azar(), 1.6) * 78;
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      if (!hierbaPermitida(x, z)) continue;
      const esc = 0.75 + azar() * 0.85;
      P.set(x, 0, z);
      S.set(esc, esc * (0.8 + azar() * 0.55), esc);
      Q.setFromAxisAngle(Y, azar() * Math.PI * 2);
      M.compose(P, Q, S);
      m.setMatrixAt(puestas, M);
      tinte.setHSL(0.24 + azar() * 0.06, 0.42 + azar() * 0.22, 0.42 + azar() * 0.16);
      m.setColorAt(puestas, tinte);
      puestas++;
    }
    m.count = puestas;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // Una sola malla que cubre todo el prado: recortarla por cámara la haría
    // desaparecer entera al mirar de lado.
    m.frustumCulled = false;
    m.receiveShadow = true;
    return m;
  }, [cantidad]);

  useEffect(() => () => {
    if (!malla) return;
    malla.geometry.dispose();
    (malla.material as THREE.Material).dispose();
  }, [malla]);

  useFrame(({ clock }) => {
    if (malla) (malla.material as THREE.MeshStandardMaterial).userData.uTiempo.value = clock.elapsedTime;
  });

  if (!malla) return null;
  return <primitive object={malla} />;
}
