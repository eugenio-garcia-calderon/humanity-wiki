import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, Loader2, EyeOff, Eye } from 'lucide-react';
import { OBJETIVOS, hexDelColor } from '../utils/objetivos';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

/*
 * LA RUEDA DE TEMAS (2026-08-25)
 * ============================================================================
 * Eugenio: «un botón arriba del todo que sea personalizar, preferencias, y que
 * eso te lleve a una página donde aparecen en una rueda todos los temas, donde
 * en el círculo interno están los catorce temas, pero luego en el círculo
 * externo ya se va bifurcando… a medida que haces clic en un tema se te abre el
 * siguiente nivel… Y aparte de la visión de la rueda, también habrá una tabla
 * debajo con todos los temas, estando los objetivos de izquierda a derecha y
 * los subtemas de arriba a abajo».
 *
 * ── POR QUÉ UNA RUEDA Y NO UN ÁRBOL DE TODA LA VIDA ────────────────────────
 * Un árbol con sangrías crece hacia abajo: con catorce raíces y sin límite de
 * profundidad, mirarlo entero es desplazarse tres pantallas y perder de vista
 * dónde estabas. En una rueda, **el conjunto cabe siempre**: cada anillo es un
 * nivel y el tamaño de cada trozo dice cuánto hay dentro. Se ve la forma del
 * conocimiento antes de leer una palabra.
 *
 * ── Y AUN ASÍ, DEBAJO VA LA TABLA ─────────────────────────────────────────
 * Porque una rueda enseña la forma y una lista enseña los nombres. Buscar
 * «dónde estaba aquel subtema» en un dibujo circular es peor que en una
 * columna; y entender de un vistazo que Agua tiene tres ramas y Empleo
 * ninguna, al revés. Las dos vistas no compiten: contestan preguntas
 * distintas, y por eso están las dos y no una elegida.
 *
 * ── LOS ANILLOS NO SE ABREN TODOS ─────────────────────────────────────────
 * Sólo lo que has pulsado. Con todo desplegado, el cuarto anillo son trozos de
 * medio grado que no se pueden ni señalar; y además pedir el árbol entero
 * abierto es pedir a alguien que mire catorce ramas a la vez, que es
 * exactamente lo que esta página existe para no hacer.
 */

type Sub = {
  id: string; objetivo_id: string; padre_id: string | null; nombre: string;
  cosas: number; favorito: boolean; oculto: boolean;
};
type Pref = { clave: string; favorito: boolean; oculto: boolean; orden: number | null };

/** Un trozo de anillo. El corazón del dibujo: de dos ángulos y dos radios sale
 *  el contorno de un sector. */
function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  // `largo` le dice al SVG por qué lado dar la vuelta cuando el trozo pasa de
  // media circunferencia. Sin esto, un objetivo con un solo hijo —que se lleva
  // los 360º de su padre— se dibuja del revés.
  const largo = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${largo} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${largo} 0 ${x3} ${y3}Z`;
}

export default function Preferencias() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [prefs, setPrefs] = useState<Record<string, { favorito?: boolean; oculto?: boolean }>>({});
  const [cargando, setCargando] = useState(true);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [elegido, setElegido] = useState<string | null>(null);
  const [creandoEn, setCreandoEn] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = () => {
    fetch('/api/temas', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        setSubs(j.subtemas || []);
        const m: Record<string, any> = {};
        for (const p of (j.preferencias || []) as Pref[]) m[p.clave] = { favorito: p.favorito, oculto: p.oculto };
        setPrefs(m);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const esFav = (clave: string) => !!prefs[clave]?.favorito;
  const estaOculto = (clave: string) => !!prefs[clave]?.oculto;

  const marcar = (clave: string, cambio: { favorito?: boolean; oculto?: boolean }) => {
    // Se pinta ya y se guarda detrás: es tu propia preferencia, no hay nada que
    // confirmar con nadie. Ver la misma decisión en el menú lateral.
    setPrefs(p => ({ ...p, [clave]: { ...p[clave], ...cambio } }));
    fetch('/api/temas/preferencia', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ clave, ...cambio }),
    }).catch(() => {});
  };

  const crear = async (objetivo: string, padre: string | null) => {
    const nombre = nombreNuevo.trim();
    if (nombre.length < 2) return;
    setNombreNuevo(''); setCreandoEn(null);
    try {
      const r = await fetch('/api/temas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ objetivo, padre, nombre }),
      });
      const j = await r.json();
      if (!r.ok) { setAviso(j.error || 'No se ha podido crear.'); return; }
      // QUE YA EXISTIERA NO ES UN ERROR: es lo que se quería. Se dice, porque
      // si no parecería que el botón no ha hecho nada.
      if (j.yaExistia) {
        setAviso(j.porSignificado
          ? `Ya había uno que dice lo mismo: «${j.nombre}». Se usa ése.`
          : `«${j.nombre}» ya estaba.`);
      }
      cargar();
    } catch { setAviso('No se ha podido crear.'); }
  };

  /** Los hijos de algo, ya ordenados. */
  const hijosDe = useMemo(() => {
    const m: Record<string, Sub[]> = {};
    for (const s of subs) {
      const clave = s.padre_id || s.objetivo_id;
      (m[clave] ||= []).push(s);
    }
    return m;
  }, [subs]);

  // ── EL DIBUJO ─────────────────────────────────────────────────────────────
  // Se recorre el árbol repartiendo ángulos: los catorce objetivos se parten
  // la vuelta entera, y cada nodo abierto reparte SU trozo entre sus hijos.
  const trozos = useMemo(() => {
    const out: Array<{ clave: string; nombre: string; color: string; nivel: number; a0: number; a1: number; hijos: number }> = [];
    const paso = (2 * Math.PI) / OBJETIVOS.length;
    OBJETIVOS.forEach((o, i) => {
      // Se empieza arriba (-90º) para que el primero quede a las doce, que es
      // donde todo el mundo empieza a leer un círculo.
      const a0 = -Math.PI / 2 + i * paso;
      const a1 = a0 + paso;
      const color = hexDelColor(o.color);
      out.push({ clave: o.id, nombre: o.titulo, color, nivel: 1, a0, a1, hijos: (hijosDe[o.id] || []).length });
      const bajar = (padre: string, d0: number, d1: number, nivel: number) => {
        /*
         * ── QUÉ SE VE SIN PULSAR NADA, Y POR QUÉ NO ES TODO ──────────────
         * Eugenio quiere la rueda entera, con sus ocho subtemas por tema y sus
         * ocho dentro de cada uno. El segundo anillo sale SIEMPRE: son 14 × 8
         * = 112 trozos, 3,2° cada uno, que se ven y se pueden señalar.
         *
         * El tercero **no cabe**, y esto es aritmética y no una opinión: 112 ×
         * 8 = 896 trozos en una vuelta son 0,4° cada uno. En una rueda de 900
         * px de ancho eso es un trozo de **3 píxeles**: no se lee, no se
         * distingue del de al lado y no se puede pulsar con el dedo ni con el
         * ratón. Dibujarlo sería enseñar una textura, no una rueda.
         *
         * Así que el tercero aparece cuando abres una rama, y entonces ocupa
         * los 3,2° de su padre repartidos entre ocho — 0,4° cada uno pero **en
         * el anillo de fuera**, que es cuatro veces más largo. Ahí sí se ve.
         * Está todo, y está donde se puede mirar.
         */
        if (nivel <= 2) {
          const hs = hijosDe[padre] || [];
          if (hs.length) {
            const ancho = (d1 - d0) / hs.length;
            hs.forEach((h, k) => {
              const b0 = d0 + k * ancho;
              const b1 = b0 + ancho;
              out.push({ clave: h.id, nombre: h.nombre, color, nivel, a0: b0, a1: b1, hijos: (hijosDe[h.id] || []).length });
              bajar(h.id, b0, b1, nivel + 1);
            });
          }
          return;
        }
        if (!abiertos.has(padre) || nivel > 5) return;
        const hs = hijosDe[padre] || [];
        if (!hs.length) return;
        const ancho = (d1 - d0) / hs.length;
        hs.forEach((h, k) => {
          const b0 = d0 + k * ancho;
          const b1 = b0 + ancho;
          out.push({ clave: h.id, nombre: h.nombre, color, nivel, a0: b0, a1: b1, hijos: (hijosDe[h.id] || []).length });
          bajar(h.id, b0, b1, nivel + 1);
        });
      };
      bajar(o.id, a0, a1, 2);
    });
    return out;
  }, [hijosDe, abiertos]);

  /*
   * Anillos anchos y centro pequeño, y no al revés: lo que se lee aquí son los
   * nombres del segundo anillo, escritos hacia fuera, así que **el ancho del
   * anillo es el renglón**. Con 78 px cabían quince letras y salían cosas como
   * «Desperdicio de …»; con 104 caben veinte y se lee «Desperdicio de
   * alimentos». Medido en la pantalla, no calculado.
   */
  const R0 = 84, ANCHO = 104;
  /*
   * ── EL SITIO SE RESERVA, NO SE PIDE AL ABRIR ──────────────────────────────
   * La primera versión hacía el lienzo del tamaño justo de lo abierto. Visto en
   * pantalla: al abrir una rama la rueda **entera se encogía** para dejarle
   * sitio, y los catorce del centro —que no habían cambiado— pasaban a ser
   * ilegibles por culpa de una sola bifurcación. La rueda cambiaba de tamaño
   * cada vez que se pulsaba algo.
   *
   * Se reservan tres niveles siempre. Abrir el segundo y el tercero ya no
   * mueve nada; sólo un cuarto nivel, que es raro, aprieta un poco. Se paga con
   * un poco de aire alrededor cuando no hay nada abierto, y ese aire no
   * molesta: lo que molesta es que se mueva lo que estás mirando.
   */
  /*
   * ── EL ANILLO RESERVADO ES MÁS ESTRECHO QUE LOS OTROS DOS ─────────────────
   * Se sigue reservando el sitio del tercer nivel para que abrir una rama no
   * encoja la rueda —eso ya costó un arreglo—, pero reservarlo del mismo ancho
   * (104) dejaba una franja vacía de 104 px alrededor de todo. En pantalla se
   * ve como un hueco entre la cabecera y la rueda que parece un fallo de
   * maquetación.
   *
   * El tercero es además el que menos texto lleva: son ocho nombres dentro del
   * trozo de un subtema, y ahí se lee tanto con 60 como con 104. Así que se le
   * dan 60, y el aire de alrededor baja de 104 a 60.
   */
  const ANCHO_HONDO = 60;
  const radioDe = (nivel: number) => R0 + ANCHO * Math.min(nivel - 1, 2) + ANCHO_HONDO * Math.max(0, nivel - 3);
  const nivelMax = Math.max(3, ...trozos.map(t => t.nivel));
  const lado = 2 * radioDe(nivelMax + 1) + 24;
  const c = lado / 2;

  const pulsar = (clave: string) => {
    setElegido(clave);
    setAbiertos(a => {
      const n = new Set(a);
      n.has(clave) ? n.delete(clave) : n.add(clave);
      return n;
    });
  };

  const nombreDe = (clave: string) =>
    OBJETIVOS.find(o => o.id === clave)?.titulo || subs.find(s => s.id === clave)?.nombre || '';
  const objetivoDe = (clave: string) =>
    OBJETIVOS.some(o => o.id === clave) ? clave : (subs.find(s => s.id === clave)?.objetivo_id || '');

  const favoritos = [
    ...OBJETIVOS.filter(o => esFav(o.id)).map(o => ({ clave: o.id, nombre: o.titulo, color: hexDelColor(o.color) })),
    ...subs.filter(s => esFav(s.id)).map(s => ({
      clave: s.id, nombre: s.nombre,
      color: hexDelColor(OBJETIVOS.find(o => o.id === s.objetivo_id)?.color),
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-5 py-6 sm:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Tus temas</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Los catorce del centro son los de todos. Lo de fuera lo va añadiendo la gente: pulsa
          uno para abrir lo que tiene dentro, y marca con la estrella los que quieras arriba en tu menú.
        </p>
      </header>

      {!user && (
        <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          Puedes mirar la rueda sin entrar, pero para guardar favoritos hace falta tu cuenta.{' '}
          <Link to="/login" className="underline">Entrar</Link>
        </p>
      )}
      {aviso && (
        <p className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700">
          {aviso}
          <button onClick={() => setAviso(null)} className="shrink-0 text-slate-400 hover:text-slate-700">Vale</button>
        </p>
      )}

      {favoritos.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Tus favoritos</p>
          <div className="flex flex-wrap gap-1.5">
            {favoritos.map(f => (
              <button
                key={f.clave}
                onClick={() => marcar(f.clave, { favorito: false })}
                title="Quitar de favoritos"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-2 pr-2.5 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300"
              >
                <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
                {f.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <p className="flex items-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando los temas…
        </p>
      ) : (
        <>
          {/* ══ LA RUEDA ═══════════════════════════════════════════════════ */}
          {/* ── TODO DENTRO DE LA RUEDA (2026-08-25) ────────────────────────
              Eugenio: «no lo que has hecho en la parte derecha, sino que esté
              todo integrado en una rueda».

              El panel de al lado se va. Lo que hacía —decir qué has pulsado,
              la estrella, y añadir un subtema— se muda **al agujero del
              centro**, que estaba ahí sin usar y es justo donde miras después
              de pulsar un trozo. Al lado, la información aparecía a 500 px de
              donde acababa de ocurrir el gesto.

              Y la rueda pasa de 520 a 900 px: con dos anillos llenos —catorce
              fuera y ciento doce dentro— a 520 px los nombres del segundo
              anillo no caben en su trozo. El tamaño aquí no es lujo, es lo que
              decide si se puede leer. */}
          <div className="flex justify-center">
            <svg
              viewBox={`0 0 ${lado} ${lado}`}
              className="w-full max-w-[900px]"
              role="img"
              aria-label="Rueda de temas"
            >
              {trozos.map(t => {
                const r0 = radioDe(t.nivel);
                const r1 = radioDe(t.nivel + 1) - 3;
                const medio = (t.a0 + t.a1) / 2;
                /*
                 * ── EL TEXTO DE FUERA VA HACIA FUERA ──────────────────────
                 * Los catorce del primer anillo se escriben SIGUIENDO la curva:
                 * sus trozos son anchos (25,7°) y ahí una palabra cabe de sobra.
                 *
                 * Del segundo en adelante, no. Con ocho subtemas por tema, cada
                 * trozo mide 3,2°, que a esa altura son unos quince píxeles de
                 * arco: no cabe ni «Riego». Pero **a lo largo del radio hay
                 * cien**, porque el anillo es ancho.
                 *
                 * Así que el texto se gira y se lee del centro hacia fuera, que
                 * es como está escrita la rueda de permacultura que puso Eugenio
                 * de ejemplo — y no es una copia de estilo: es la única manera
                 * de que quepan ocho nombres en una vuelta.
                 */
                const radial = t.nivel > 1;
                const rTexto = radial ? r0 + 6 : (r0 + r1) / 2;
                const tx = c + rTexto * Math.cos(medio);
                const ty = c + rTexto * Math.sin(medio);
                let giro = (medio * 180) / Math.PI;
                // En la mitad izquierda se le da la vuelta: si no, la mitad de
                // los nombres se leerían boca abajo.
                const alReves = giro > 90 || giro < -90;
                if (alReves) giro += 180;
                const anclaje = radial ? (alReves ? 'end' : 'start') : 'middle';
                // Radial: lo que limita es el ANCHO DEL ANILLO. Siguiendo la
                // curva: el largo del arco.
                const cabe = radial ? (r1 - r0) > 26 : (t.a1 - t.a0) * rTexto > 30;
                return (
                  <g key={t.clave} className="cursor-pointer" onClick={() => pulsar(t.clave)}>
                    <title>{t.nombre}{t.hijos ? ` · ${t.hijos} dentro` : ''}</title>
                    <path
                      d={sector(c, c, r0, r1, t.a0, t.a1)}
                      fill={t.color}
                      // Los anillos de fuera, más claros: dice «esto es más
                      // hondo» sin necesidad de una leyenda, y evita que
                      // catorce colores fuertes repetidos cuatro veces
                      // conviertan la rueda en un ruido.
                      fillOpacity={Math.max(0.22, 1 - (t.nivel - 1) * 0.22)}
                      stroke="#fff"
                      strokeWidth={2}
                      className={cn('transition-opacity hover:opacity-80',
                        elegido === t.clave && 'opacity-100')}
                    />
                    {esFav(t.clave) && (
                      <circle cx={tx} cy={ty - (cabe ? 12 : 0)} r={3.5} fill="#fbbf24" stroke="#fff" strokeWidth={1} />
                    )}
                    {cabe && (
                      <text
                        x={tx} y={ty}
                        transform={`rotate(${giro} ${tx} ${ty})`}
                        textAnchor={anclaje} dominantBaseline="middle"
                        className="pointer-events-none select-none"
                        style={{ fontSize: t.nivel === 1 ? 15 : t.nivel === 2 ? 10 : 9, fontWeight: 800, fill: t.nivel === 1 ? '#fff' : '#0f172a' }}
                      >
                        {(() => {
                          // Cuánto texto cabe: en radial manda el ancho del
                          // anillo (~13 letras por cada 60 px); siguiendo la
                          // curva, el arco.
                          const tope = radial ? Math.floor((r1 - r0) / 4.6) : 22;
                          return t.nombre.length > tope ? t.nombre.slice(0, tope - 1) + '…' : t.nombre;
                        })()}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* EL AGUJERO DEL CENTRO ES EL PANEL. Ver la nota de arriba:
                  lo que se pulsa se cuenta donde se está mirando. */}
              <circle cx={c} cy={c} r={R0 - 8} fill="#0f172a" />
              {elegido ? (
                <foreignObject x={c - (R0 - 16)} y={c - (R0 - 16)} width={(R0 - 16) * 2} height={(R0 - 16) * 2}>
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                    <p className="line-clamp-3 text-[13px] font-black leading-tight text-white">{nombreDe(elegido)}</p>
                    <p className="text-[10px] text-slate-400">
                      {(hijosDe[elegido] || []).length
                        ? `${(hijosDe[elegido] || []).length} dentro`
                        : 'sin nada dentro'}
                    </p>
                    {user && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <button
                          onClick={() => marcar(elegido, { favorito: !esFav(elegido) })}
                          title={esFav(elegido) ? 'Quitar de favoritos' : 'Marcar como favorito'}
                          className={cn('grid h-7 w-7 place-items-center rounded-lg transition-colors',
                            esFav(elegido) ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400')}
                        >
                          <Star className="h-4 w-4" fill={esFav(elegido) ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => marcar(elegido, { oculto: !estaOculto(elegido) })}
                          title={estaOculto(elegido) ? 'Devolver al menú' : 'Quitar del menú'}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:text-white"
                        >
                          {estaOculto(elegido) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setCreandoEn(elegido); setNombreNuevo(''); }}
                          title="Añadir un subtema aquí"
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </foreignObject>
              ) : (
                <>
                  <text x={c} y={c - 6} textAnchor="middle" style={{ fontSize: 14, fontWeight: 900, fill: '#fff' }}>TEMAS</text>
                  <text x={c} y={c + 12} textAnchor="middle" style={{ fontSize: 11, fill: '#94a3b8' }}>
                    {OBJETIVOS.length} + {subs.length}
                  </text>
                </>
              )}
            </svg>

          </div>

          {/* CREAR UN SUBTEMA, DEBAJO DE LA RUEDA. Se abre desde el «+» del
              centro, y el campo sale aquí porque dentro del agujero no cabe
              un teclado: un campo de texto de 60 px de ancho no se puede
              escribir. Lo que va al centro es lo que se lee de un vistazo; lo
              que hay que teclear, fuera. */}
          {user && creandoEn && (
            <form
              onSubmit={e => { e.preventDefault(); crear(objetivoDe(creandoEn), OBJETIVOS.some(o => o.id === creandoEn) ? null : creandoEn); }}
              className="mx-auto mt-4 flex max-w-md items-center gap-2"
            >
              <span className="shrink-0 text-[11px] font-black uppercase tracking-widest text-slate-400">
                Dentro de {nombreDe(creandoEn)}
              </span>
              <input
                autoFocus
                value={nombreNuevo}
                onChange={e => setNombreNuevo(e.target.value)}
                placeholder="Nombre del subtema"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
              <button type="submit" className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">Crear</button>
              <button type="button" onClick={() => setCreandoEn(null)} className="shrink-0 text-xs font-bold text-slate-400 hover:text-slate-700">Cancelar</button>
            </form>
          )}

          {/* ══ Y LA TABLA, DEBAJO ═════════════════════════════════════════
              Eugenio: «los objetivos de izquierda a derecha, y los subtemas de
              arriba a abajo». Una columna por objetivo, y dentro su rama
              entera con sangría por nivel: aquí sí se puede leer un árbol,
              porque cada columna es corta. */}
          <div className="mt-10">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Todos los temas</p>
            <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8">
              {OBJETIVOS.map(o => (
                <div key={o.id} className="w-52 shrink-0">
                  <button
                    onClick={() => setElegido(o.id)}
                    className="flex w-full items-center gap-1.5 border-b-2 pb-1.5 text-left"
                    style={{ borderColor: hexDelColor(o.color) }}
                  >
                    {esFav(o.id) && <Star className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" />}
                    <span className="min-w-0 flex-1 truncate text-[11px] font-black text-slate-800">{o.titulo}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{(hijosDe[o.id] || []).length}</span>
                  </button>
                  <Columna claves={hijosDe} padre={o.id} nivel={0} esFav={esFav} alPulsar={setElegido} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Una rama entera, hacia abajo, con sangría por nivel. */
function Columna({ claves, padre, nivel, esFav, alPulsar }: {
  claves: Record<string, Sub[]>;
  padre: string;
  nivel: number;
  esFav: (c: string) => boolean;
  alPulsar: (c: string) => void;
}) {
  const hs = claves[padre] || [];
  if (!hs.length) {
    return nivel === 0 ? <p className="mt-2 text-[10px] text-slate-300">Sin subtemas todavía</p> : null;
  }
  return (
    <ul className={cn('mt-1.5 space-y-0.5', nivel > 0 && 'ml-2.5 border-l border-slate-100 pl-2')}>
      {hs.map(h => (
        <li key={h.id}>
          <button onClick={() => alPulsar(h.id)}
            className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] text-slate-600 hover:bg-slate-50">
            {esFav(h.id) && <Star className="h-2.5 w-2.5 shrink-0 text-amber-400" fill="currentColor" />}
            <span className="min-w-0 flex-1 truncate">{h.nombre}</span>
            {h.cosas > 0 && <span className="shrink-0 text-[9px] text-slate-300">{h.cosas}</span>}
          </button>
          <Columna claves={claves} padre={h.id} nivel={nivel + 1} esFav={esFav} alPulsar={alPulsar} />
        </li>
      ))}
    </ul>
  );
}
