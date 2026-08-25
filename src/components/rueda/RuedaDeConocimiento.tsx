import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

// ============================================================================
// LA RUEDA DE CONOCIMIENTO (2026-08-26)
// ============================================================================
// Eugenio: «esa tecnología del donut y la tecnología de visualizar ese
// contenido de manera ramificada en formato rueda, llamarlo rueda de
// conocimiento a partir de ahora […] haz que a nivel tecnológico tenga el mismo
// código, tanto para personalizar como para movilidad, poniendo las variables
// de tal manera que el código se recicle y no se repita, y que cuando cambiemos
// ese código cambie en todas las páginas en las que está».
//
// Esto es ese componente. Nació dentro de `Preferencias.tsx`, atado a los
// quince objetivos, y aquí está el mismo dibujo **sin saber qué está
// dibujando**: se le dan nodos con padre y él los reparte en anillos.
//
// ── QUÉ NO SABE ESTE COMPONENTE, Y ES A PROPÓSITO ──────────────────────────
// No sabe qué es un objetivo, ni un subtema, ni una rama de movilidad. No pide
// datos, no guarda nada y no navega. Recibe una lista plana y avisa de lo que
// se pulsa. Todo lo que sea «esto es un tema» o «al pulsar, ve aquí» vive en
// quien lo usa — que es lo que permite que la misma rueda sirva en Personalizar
// y en Movilidad sin un solo `if`.
//
// ── EL REPARTO ES UN ACORDEÓN, NO UNA TARTA ────────────────────────────────
// Si cada nivel se reparte el hueco de su padre a partes iguales, con 8 hijos
// por rama el espacio se divide por ocho en cada salto:
//
//     anillo 1   15 trozos ·  24°   · 142 px de arco
//     anillo 2  120 trozos ·   3°   ·  18 px
//     anillo 3  960 trozos ·   0,4° ·   2,2 px   ← ilegible
//
// Un nombre pide unos 14 px. En 2,2 px caben ocho nombres uno sobre otro: una
// mancha. La vuelta tiene 360° y no da más, así que no hay tipografía que lo
// salve.
//
// Por eso **lo que está abierto se ensancha y lo demás se comprime**. El trozo
// más pequeño pasa de 2,2 px a 43, y lo comprimido sigue ahí, con su nombre a
// media tinta, para saber dónde encaja lo que miras y poder saltar de un clic.
//
// ── Y UNA GARANTÍA QUE NO DEPENDE DE ESOS NÚMEROS ──────────────────────────
// `MINIMO_LEGIBLE`: un anillo cuyos trozos bajen de ahí **no se dibuja**. Hoy
// las cuentas salen; el árbol lo llena la gente, y el día que alguien cuelgue
// cuarenta hijos de una rama esto se queda sin pintar en vez de volver a hacer
// una mancha.

export type NodoRueda = {
  id: string;
  nombre: string;
  /** `null` para los del primer anillo. */
  padre: string | null;
  /** Hexadecimal. Si falta, hereda el de su raíz. */
  color?: string | null;
  /** Cuántas cosas hay en esa rama. Un cero no se pinta. */
  cosas?: number;
  /** Le pone su punto amarillo. */
  favorito?: boolean;
};

/** Un trozo de anillo: de dos ángulos y dos radios sale el contorno de un sector. */
function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  // `largo` le dice al SVG por qué lado dar la vuelta cuando el trozo pasa de
  // media circunferencia. Sin esto, una rama con un solo hijo —que se lleva los
  // 360º de su padre— se dibuja del revés.
  const largo = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${largo} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${largo} 0 ${x3} ${y3}Z`;
}

export default function RuedaDeConocimiento({
  nodos, abiertos, elegido, onPulsar, etiqueta, centro, className,
}: {
  nodos: NodoRueda[];
  /** Qué ramas están desplegadas. Quien la usa decide la regla de apertura. */
  abiertos: Set<string>;
  elegido?: string | null;
  onPulsar: (id: string) => void;
  /** Para quien no ve la pantalla. */
  etiqueta: string;
  /** Lo que va en el agujero: es de quien la usa, porque es lo único que
   *  depende de qué se está mirando. */
  centro?: React.ReactNode;
  className?: string;
}) {
  const hijosDe = useMemo(() => {
    const m: Record<string, NodoRueda[]> = {};
    for (const n of nodos) (m[n.padre ?? '@raiz'] ||= []).push(n);
    return m;
  }, [nodos]);

  const raices = hijosDe['@raiz'] || [];

  const PARTE_DEL_ABIERTO_ARRIBA = 1 / 3;   // 120° de la vuelta para el abierto
  const PARTE_DEL_ABIERTO_DENTRO = 1 / 2;   // la mitad del hueco de su padre
  const MINIMO_LEGIBLE = 3.2;               // grados; por debajo, ese anillo no se pinta

  const trozos = useMemo(() => {
    const out: Array<{
      clave: string; nombre: string; color: string; nivel: number;
      a0: number; a1: number; hijos: number; cosas: number; fino: boolean; favorito: boolean;
    }> = [];
    if (!raices.length) return out;

    /** Reparte un hueco entre hermanos dándole más al que está abierto. */
    const repartir = (d0: number, d1: number, claves: string[], parteAbierto: number): Array<[number, number]> => {
      const abierto = claves.findIndex(k => abiertos.has(k));
      const total = d1 - d0;
      if (abierto < 0 || claves.length < 2) {
        const w = total / claves.length;
        return claves.map((_, k) => [d0 + k * w, d0 + (k + 1) * w] as [number, number]);
      }
      const suyo = total * parteAbierto;
      const resto = (total - suyo) / (claves.length - 1);
      let x = d0;
      return claves.map((_, k) => {
        const w = k === abierto ? suyo : resto;
        const par: [number, number] = [x, x + w];
        x += w;
        return par;
      });
    };

    const grados = (a0: number, a1: number) => ((a1 - a0) * 180) / Math.PI;

    // Se empieza arriba (-90°) para que el primero quede a las doce, que es
    // donde todo el mundo empieza a leer un círculo.
    const nivel1 = repartir(-Math.PI / 2, -Math.PI / 2 + 2 * Math.PI, raices.map(r => r.id), PARTE_DEL_ABIERTO_ARRIBA);

    raices.forEach((raiz, i) => {
      const [a0, a1] = nivel1[i];
      const color = raiz.color || '#64748b';
      const hs = hijosDe[raiz.id] || [];
      // Una raíz sin cuenta propia vale lo que suman sus ramas: en Personalizar
      // un objetivo no tiene contenido, lo tiene todo colgado por debajo.
      const suyas = raiz.cosas ?? hs.reduce((n, h) => n + (h.cosas || 0), 0);
      // FINO = comprimido y sin espacio para texto largo. Es el aro de
      // contexto: sigues viendo dónde encaja lo que miras, y de un clic te vas.
      const fino = abiertos.size > 0 && !abiertos.has(raiz.id);
      out.push({
        clave: raiz.id, nombre: raiz.nombre, color, nivel: 1, a0, a1,
        hijos: hs.length, cosas: suyas, fino, favorito: !!raiz.favorito,
      });

      const bajar = (padre: string, d0: number, d1: number, nivel: number) => {
        if (!abiertos.has(padre) || nivel > 4) return;
        const hijos = hijosDe[padre] || [];
        if (!hijos.length) return;
        const trozosHijos = repartir(d0, d1, hijos.map(h => h.id), PARTE_DEL_ABIERTO_DENTRO);
        const masEstrecho = Math.min(...trozosHijos.map(([x, y]) => grados(x, y)));
        if (masEstrecho < MINIMO_LEGIBLE) return;
        hijos.forEach((h, k) => {
          const [b0, b1] = trozosHijos[k];
          out.push({
            clave: h.id, nombre: h.nombre, color: h.color || color, nivel, a0: b0, a1: b1,
            hijos: (hijosDe[h.id] || []).length, cosas: h.cosas || 0,
            fino: abiertos.size > 0 && !abiertos.has(h.id) && hijos.some(x => abiertos.has(x.id)),
            favorito: !!h.favorito,
          });
          bajar(h.id, b0, b1, nivel + 1);
        });
      };
      bajar(raiz.id, a0, a1, 2);
    });

    /*
     * ── EL ABANICO SE ABRE HACIA LA DERECHA ───────────────────────────────
     * Eugenio: «el abanico siempre a abrirse el detalle a la derecha, y el
     * origen se queda a la izquierda». No es gusto: **se lee en el mismo
     * sentido que se escribe**. Hacia arriba hay que girar la cabeza para saber
     * por dónde empieza la rama.
     */
    const abierto = out.find(x => abiertos.has(x.clave) && x.nivel === 1);
    if (abierto) {
      const giro = 0 - (abierto.a0 + abierto.a1) / 2;   // 0 rad es el este en SVG
      for (const x of out) { x.a0 += giro; x.a1 += giro; }
    }
    return out;
  }, [hijosDe, abiertos, raices]);

  /*
   * ══ QUE EL DIBUJO SE MUEVA, NO QUE CAMBIE ═════════════════════════════════
   * Un acordeón recoloca la rueda entera al abrir una rama. Sin animar, cada
   * clic sustituye un dibujo por otro y hay que volver a buscarlo todo. Animando
   * los ángulos, el ojo **sigue** cada trozo hasta donde va.
   *
   * A mano y no con CSS porque lo que cambia es el atributo `d` de un `path`,
   * que CSS no sabe interpolar.
   */
  const [avance, setAvance] = useState(1);
  const anteriores = useRef<Map<string, [number, number]>>(new Map());
  const destino = useRef<Map<string, [number, number]>>(new Map());
  const firma = [...abiertos].sort().join('|');

  useEffect(() => {
    anteriores.current = new Map(destino.current);
    setAvance(0);
    let vivo = true;
    const t0 = performance.now();
    const paso = (ahora: number) => {
      if (!vivo) return;
      const x = Math.min(1, (ahora - t0) / 320);
      // Arranca y frena despacio: a velocidad constante se lee como una
      // máquina, no como algo que se aparta.
      setAvance(x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      if (x < 1) requestAnimationFrame(paso);
    };
    const id = requestAnimationFrame(paso);
    return () => { vivo = false; cancelAnimationFrame(id); };
  }, [firma]);

  /*
   * Anillos anchos y centro pequeño, y no al revés: lo que se lee son los
   * nombres escritos hacia fuera, así que **el ancho del anillo es el renglón**.
   * Con 78 px cabían quince letras y salía «Desperdicio de …»; con 104 caben
   * veinte y se lee entero. Medido en pantalla, no calculado.
   *
   * Se reservan tres niveles siempre: si el lienzo fuera del tamaño justo de lo
   * abierto, la rueda **entera se encogería** al abrir una rama y lo que no ha
   * cambiado se volvería ilegible por culpa de una bifurcación.
   */
  const R0 = 84, ANCHO = 104, ANCHO_HONDO = 84;
  const radioDe = (nivel: number) => R0 + ANCHO * Math.min(nivel - 1, 2) + ANCHO_HONDO * Math.max(0, nivel - 3);
  const nivelMax = Math.max(3, ...trozos.map(t => t.nivel));
  const lado = 2 * radioDe(nivelMax + 1) + 24;
  const c = lado / 2;

  if (!raices.length) return null;

  return (
    <div className={cn('flex justify-center', className)}>
      <svg viewBox={`0 0 ${lado} ${lado}`} className="w-full max-w-[900px]" role="img" aria-label={etiqueta}>
        {trozos.map(tr => {
          // De dónde venía cada trozo. Si es nuevo sale de donde estaba su
          // padre, así aparece creciendo desde dentro en vez de materializarse.
          const antes = anteriores.current.get(tr.clave);
          const t = antes && avance < 1
            ? { ...tr, a0: antes[0] + (tr.a0 - antes[0]) * avance, a1: antes[1] + (tr.a1 - antes[1]) * avance }
            : tr;
          destino.current.set(tr.clave, [tr.a0, tr.a1]);
          const r0 = radioDe(t.nivel);
          const r1 = radioDe(t.nivel + 1) - 3;
          const medio = (t.a0 + t.a1) / 2;

          /*
           * ── EL TEXTO DE FUERA VA HACIA FUERA ────────────────────────────
           * El primer anillo se escribe siguiendo la curva: sus trozos son
           * anchos y ahí cabe una palabra. Del segundo en adelante no —con ocho
           * hijos, quince píxeles de arco— pero **a lo largo del radio hay
           * cien**. Girar el texto es la única manera de que quepan ocho
           * nombres en una vuelta.
           */
          const radial = t.nivel > 1 || t.fino;
          const rTexto = radial ? r0 + 6 : (r0 + r1) / 2;
          const tx = c + rTexto * Math.cos(medio);
          const ty = c + rTexto * Math.sin(medio);
          let giro = (medio * 180) / Math.PI;
          // En la mitad izquierda se le da la vuelta o la mitad de los nombres
          // se leerían boca abajo.
          const alReves = giro > 90 || giro < -90;
          if (alReves) giro += 180;
          const anclaje = radial ? (alReves ? 'end' : 'start') : 'middle';
          const cabe = radial ? (r1 - r0) > 26 : (t.a1 - t.a0) * rTexto > 30;

          return (
            <g key={t.clave} className="cursor-pointer" onClick={() => onPulsar(t.clave)}>
              <title>{t.nombre}{t.hijos ? ` · ${t.hijos} dentro` : ''}</title>
              <path
                d={sector(c, c, r0, r1, t.a0, t.a1)}
                fill={t.color}
                // Los anillos de fuera, más claros: dice «esto es más hondo»
                // sin leyenda, y evita que los mismos colores repetidos cuatro
                // veces conviertan la rueda en ruido.
                fillOpacity={Math.max(0.22, 1 - (t.nivel - 1) * 0.22)}
                stroke="#fff" strokeWidth={2}
                className={cn('transition-opacity hover:opacity-80', elegido === t.clave && 'opacity-100')}
              />
              {t.favorito && (
                <circle cx={tx} cy={ty - (cabe ? 12 : 0)} r={3.5} fill="#fbbf24" stroke="#fff" strokeWidth={1} />
              )}
              {/* Un cero no se pinta: un número gris al lado de un nombre se lee
                  como «esto está vacío», y hay ramas que sólo tienen cosas en
                  sus hijas. Uno visible es una invitación a llenarla. */}
              {t.cosas > 0 && cabe && (
                <text
                  x={c + (rTexto + (radial ? 0 : 13)) * Math.cos(medio)}
                  y={ty + (radial ? 11 : 13)}
                  transform={`rotate(${giro} ${tx} ${ty})`}
                  textAnchor={anclaje} dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  style={{ fontSize: 8, fontWeight: 700, fill: t.nivel === 1 ? 'rgba(255,255,255,.75)' : '#64748b' }}
                >
                  {t.cosas}
                </text>
              )}
              {cabe && (
                <text
                  x={tx} y={ty}
                  transform={`rotate(${giro} ${tx} ${ty})`}
                  textAnchor={anclaje} dominantBaseline="middle"
                  className="pointer-events-none select-none"
                  // Lo comprimido se ve, pero apagado: dice «aquí hay algo» y
                  // «no es lo que miras» a la vez. Un trozo de color sin nombre
                  // no es contexto, es un hueco — y nadie lo pulsa.
                  opacity={t.fino ? 0.45 : 1}
                  style={{
                    fontSize: t.fino ? 8 : t.nivel === 1 ? 15 : t.nivel === 2 ? 10 : 9,
                    fontWeight: t.fino ? 700 : 800,
                    fill: t.nivel === 1 && !t.fino ? '#fff' : '#0f172a',
                  }}
                >
                  {(() => {
                    // Comprimido: un renglón corto. Es una etiqueta para
                    // reconocerlo y pulsarlo, no para leerlo entero.
                    if (t.fino) {
                      const corto = Math.floor((r1 - r0) / 4.2);
                      return t.nombre.length > corto ? t.nombre.slice(0, corto - 1) + '…' : t.nombre;
                    }
                    const tope = radial ? Math.floor((r1 - r0) / 4.6) : 22;
                    if (t.nombre.length <= tope) return t.nombre;
                    if (!radial) return t.nombre.slice(0, tope - 1) + '…';
                    // Dos renglones antes que cortar: se parte por un espacio,
                    // nunca a mitad de palabra, y sólo si hace falta.
                    const corte = t.nombre.lastIndexOf(' ', tope);
                    if (corte < 4) return t.nombre.slice(0, tope - 1) + '…';
                    const segunda = t.nombre.slice(corte + 1);
                    return (
                      <>
                        <tspan x={tx} dy="-0.55em">{t.nombre.slice(0, corte)}</tspan>
                        <tspan x={tx} dy="1.1em">
                          {segunda.length > tope ? segunda.slice(0, tope - 1) + '…' : segunda}
                        </tspan>
                      </>
                    );
                  })()}
                </text>
              )}
            </g>
          );
        })}

        {/* EL AGUJERO DEL CENTRO ES EL PANEL: lo que se pulsa se cuenta donde
            se está mirando, no a 500 px de donde ocurrió el gesto. Lo que va
            dentro lo pone quien usa la rueda. */}
        <circle cx={c} cy={c} r={R0 - 8} fill="#0f172a" />
        {centro && (
          <foreignObject x={c - (R0 - 16)} y={c - (R0 - 16)} width={(R0 - 16) * 2} height={(R0 - 16) * 2}>
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
              {centro}
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}

/**
 * ABRIR UNA RAMA ES ABRIR SU CAMINO ENTERO, Y CERRAR LO DEMÁS.
 *
 * Se exporta porque las dos pantallas necesitan exactamente la misma regla, y
 * si cada una la escribiera por su lado se separarían: sin esto se podrían
 * quedar dos ramas abiertas a la vez, las dos querrían el trozo grande de su
 * nivel, y el acordeón dejaría de repartir. **Una rama abierta cada vez es lo
 * que hace que el espacio alcance.**
 */
export function alternarRamaDeRueda(nodos: NodoRueda[], abiertos: Set<string>, id: string): Set<string> {
  const camino: string[] = [];
  let actual: string | null | undefined = id;
  // El tope es por si algún día una fila apunta a su propio antepasado: sin él,
  // un ciclo en los datos cuelga la página en vez de dibujar de menos.
  for (let i = 0; i < 12 && actual; i++) {
    camino.push(actual);
    actual = nodos.find(n => n.id === actual)?.padre ?? null;
  }
  return abiertos.has(id) ? new Set(camino.slice(1)) : new Set(camino);
}
