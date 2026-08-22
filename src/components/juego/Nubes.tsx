// ============================================================================
// JUEGO VITAL — EL CIELO (2026-08-19, petición de Eugenio: «haz que el cielo
// sea azul con nubes y con un atardecer en el fondo con luz dorada»).
//
// Aquí viven las dos mitades del cielo: el FIRMAMENTO (la cúpula pintada) y
// las NUBES.
//
// Dos capas, porque un cielo de verdad tiene dos:
//
//   1. CÚMULOS ALTOS repartidos por el valle: bultos de algodón que se
//      mueven muy despacio y le dan escala al cielo. Van con `Clouds` de
//      drei, que las dibuja TODAS en una sola malla instanciada.
//   2. BANCO DEL HORIZONTE: una hilera de nubes bajas y alargadas por donde
//      se pone el sol. Es lo que hace que el atardecer «esté al fondo» y no
//      sea solo un degradado.
//
// La textura está AUTOALOJADA (`/modelos-juego/texturas/nube.png`, CC0 de
// pmndrs). Por defecto drei se la descarga de un CDN externo: eso mete una
// petición fuera de humanity.wiki en cada partida y se cae si el CDN se cae.
// ============================================================================
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Clouds, Cloud } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { crearAzar } from './paleta';

const TEXTURA_NUBE = '/modelos-juego/texturas/nube.png';

/** Un cúmulo suelto: dónde está, cómo de grande y de qué color. */
interface Cumulo {
  pos: [number, number, number];
  escala: number;
  volumen: number;
  semilla: number;
}

export function Nubes({ esNoche = false, calidad = 'alta' }: {
  /** De noche las nubes se apagan y se vuelven azules de luna. */
  esNoche?: boolean;
  calidad?: 'alta' | 'media' | 'baja';
}) {
  const grupo = useRef<THREE.Group>(null);

  // Cuántas nubes según la máquina. En una tarjeta floja las nubes son lo
  // primero que se puede recortar sin que el sitio deje de ser el sitio.
  // Menos nubes (2026-08-22): con el mundo en 95 de medio lado y la niebla a
  // 200, las de fuera no se veían — se dibujaban igual.
  const cuantas = calidad === 'alta' ? 7 : calidad === 'media' ? 5 : 3;
  const cuantasBajas = calidad === 'alta' ? 7 : calidad === 'media' ? 5 : 3;

  const { altas, bajas } = useMemo(() => {
    const azar = crearAzar(60607);
    const altas: Cumulo[] = [];
    for (let i = 0; i < cuantas; i++) {
      // Repartidas en corona alrededor de la aldea, entre 120 y 340 m, para
      // que siempre haya cielo con algo mires donde mires.
      const a = (i / cuantas) * Math.PI * 2 + azar() * 0.7;
      const r = 70 + azar() * 90;
      altas.push({
        // Altura 38-72 m, no 62-108. La cámara del juego mira casi
        // horizontal: con las nubes más arriba quedaban FUERA de encuadre y
        // solo se veían desde el planeador (comprobado en pruebas).
        pos: [Math.cos(a) * r, 38 + azar() * 34, Math.sin(a) * r],
        escala: 16 + azar() * 20,
        volumen: 7 + azar() * 6,
        semilla: Math.floor(azar() * 1000),
      });
    }

    // El banco del horizonte: sobre el poniente (el sol se pone hacia el
    // oeste, que en este mundo es la -x), aplastadas y en fila.
    const bajas: Cumulo[] = [];
    for (let i = 0; i < cuantasBajas; i++) {
      const t = (i / (cuantasBajas - 1 || 1)) - 0.5;   // -0,5 … 0,5
      bajas.push({
        pos: [-330 + azar() * 55, 17 + azar() * 13, t * 430 + (azar() - 0.5) * 55],
        escala: 30 + azar() * 26,
        volumen: 4 + azar() * 3,
        semilla: 500 + Math.floor(azar() * 1000),
      });
    }
    return { altas, bajas };
  }, [cuantas, cuantasBajas]);

  // Las nubes se mueven, pero MUY despacio: a 0,45 m/s tardan diez minutos en
  // cruzar el valle. Si van rápido parecen humo y rompen la calma.
  useFrame((_, dt) => {
    const g = grupo.current;
    if (!g) return;
    g.position.x += dt * 0.45;
    if (g.position.x > 260) g.position.x = -260;
  });

  // Color: de día blancas con el vientre gris; en la hora dorada, doradas por
  // arriba; de noche, azul de luna.
  const blanco = esNoche ? '#8fa4c9' : '#ffffff';
  const vientre = esNoche ? '#2c3a5c' : '#c9d2e0';
  const dorado = esNoche ? '#7d8fb5' : '#ffd9a3';

  return (
    <group ref={grupo}>
      <Clouds material={THREE.MeshLambertMaterial} texture={TEXTURA_NUBE} limit={420}>
        {altas.map((c, i) => (
          <Cloud
            key={`alta-${i}`}
            seed={c.semilla}
            position={c.pos}
            bounds={[c.escala, c.volumen, c.escala]}
            segments={calidad === 'alta' ? 14 : 8}
            volume={c.volumen}
            opacity={esNoche ? 0.42 : 0.72}
            color={blanco}
            fade={340}
            growth={3}
            speed={0.06}
          />
        ))}
        {/* El vientre gris: las mismas nubes, más bajas y oscuras. Es lo que
            las hace parecer gordas en vez de manchas planas. */}
        {altas.map((c, i) => (
          <Cloud
            key={`vientre-${i}`}
            seed={c.semilla + 7}
            position={[c.pos[0], c.pos[1] - c.volumen * 0.55, c.pos[2]]}
            bounds={[c.escala * 0.86, c.volumen * 0.5, c.escala * 0.86]}
            segments={calidad === 'alta' ? 8 : 5}
            volume={c.volumen * 0.7}
            opacity={esNoche ? 0.3 : 0.5}
            color={vientre}
            fade={340}
            growth={2}
            speed={0.05}
          />
        ))}
        {/* El banco del atardecer, teñido de oro por el sol bajo */}
        {bajas.map((c, i) => (
          <Cloud
            key={`baja-${i}`}
            seed={c.semilla}
            position={c.pos}
            bounds={[c.escala, c.volumen, c.escala * 0.5]}
            segments={calidad === 'alta' ? 12 : 7}
            volume={c.volumen}
            opacity={esNoche ? 0.35 : 0.66}
            color={dorado}
            fade={620}
            growth={4}
            speed={0.04}
          />
        ))}
      </Clouds>
    </group>
  );
}

// ---------------------------------------------------------------------------
// EL FIRMAMENTO
// ---------------------------------------------------------------------------
// Por qué esto y no el cielo de drei: `<Sky>` implementa el modelo atmosférico
// de Preetham, que es físicamente correcto pero devuelve luminancias enormes.
// Al pasar por la curva de cine (ACES) del composer, ese rango se aplasta y el
// cielo sale BLANCO a cualquier hora — daba igual la turbidez, el rayleigh o
// la exposición, probado uno a uno. Y un blanco lechoso no es «azul con un
// atardecer dorado al fondo».
//
// Así que el cielo se pinta a mano: una cúpula con tres colores (cenit,
// horizonte y el oro del poniente) y `toneMapped={false}`, que es lo que hace
// que el color que se elige sea EXACTAMENTE el que se ve. El bloom sigue
// poniendo el halo alrededor del sol, que es lo único que se quería de él.
// ---------------------------------------------------------------------------
const VERTEX_CIELO = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_CIELO = /* glsl */`
  uniform vec3 uCenit;
  uniform vec3 uHorizonte;
  uniform vec3 uOro;
  uniform vec3 uSol;
  uniform float uFuerzaSol;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);

    // 1. El degradado de siempre: azul arriba, más claro abajo. La potencia
    //    0,42 aprieta el azul hacia el cenit, como en el cielo de verdad.
    float alto = clamp(d.y, 0.0, 1.0);
    vec3 color = mix(uHorizonte, uCenit, pow(alto, 0.42));

    // 2. EL ATARDECER DEL FONDO: un resplandor dorado alrededor del sol que
    //    se derrama por el horizonte. Dos términos: uno ancho y bajito que
    //    tiñe medio horizonte, y otro estrecho que es el foco.
    vec3 sol = normalize(uSol);
    float haciaElSol = max(dot(d, sol), 0.0);
    float derrame = pow(haciaElSol, 3.0) * (1.0 - alto * 0.72);
    float foco = pow(haciaElSol, 26.0);
    color = mix(color, uOro, clamp((derrame * 0.85 + foco * 1.2) * uFuerzaSol, 0.0, 1.0));

    // 3. El disco del sol. Pequeño y muy vivo: el bloom se encarga del halo.
    float disco = smoothstep(0.9975, 0.9992, haciaElSol);
    color += uOro * disco * 2.2 * uFuerzaSol;

    // 4. Bajo el horizonte no hay cielo: se funde con el color de la niebla
    //    para que la unión con el suelo no se note.
    color = mix(uHorizonte, color, smoothstep(-0.12, 0.02, d.y));

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Los tres colores del cielo en cada momento del día. */
function paletaDeCielo(luz: number, esNoche: boolean) {
  if (esNoche) return { cenit: '#0a1130', horizonte: '#1d2a4d', oro: '#4a5f96', fuerza: 0.25 };
  // `luz` va de 0 (sol en el horizonte) a 1 (mediodía). Al mediodía el cenit
  // es azul fuerte y el oro casi no se ve; a la hora dorada el cenit sigue
  // AZUL —eso es lo que pidió Eugenio— y el oro manda abajo.
  const t = Math.min(1, luz * 1.5);
  return {
    cenit: t > 0.6 ? '#2f6fc4' : '#3877c9',
    horizonte: t > 0.6 ? '#bcd9f2' : '#e9d2b4',
    oro: '#ffb45e',
    fuerza: 1 - t * 0.55,     // el oro se apaga según sube el sol
  };
}

export function Firmamento({ solPos, luz, esNoche }: {
  /** Dónde está el sol, en coordenadas del mundo. */
  solPos: [number, number, number];
  /** 0 = sol en el horizonte · 1 = mediodía. */
  luz: number;
  esNoche: boolean;
}) {
  const p = useMemo(() => paletaDeCielo(luz, esNoche), [luz, esNoche]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERTEX_CIELO,
    fragmentShader: FRAGMENT_CIELO,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,     // el color elegido es el color que se ve
    uniforms: {
      uCenit: { value: new THREE.Color(p.cenit) },
      uHorizonte: { value: new THREE.Color(p.horizonte) },
      uOro: { value: new THREE.Color(p.oro) },
      uSol: { value: new THREE.Vector3(...solPos) },
      uFuerzaSol: { value: p.fuerza },
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Los colores se actualizan sin rehacer el material (recompilarlo cada vez
  // que se mueve el sol daría un tirón).
  material.uniforms.uCenit.value.set(p.cenit);
  material.uniforms.uHorizonte.value.set(p.horizonte);
  material.uniforms.uOro.value.set(p.oro);
  material.uniforms.uFuerzaSol.value = p.fuerza;
  material.uniforms.uSol.value.set(...solPos);

  return (
    // 900 m de radio: dentro del alcance de la cámara (1.400) y por fuera de
    // todo lo demás. La cúpula de drei venía a 450.000 y quedaba recortada.
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[900, 32, 20]} />
    </mesh>
  );
}
