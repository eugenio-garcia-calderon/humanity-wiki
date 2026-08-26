import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, Loader2, EyeOff, Eye, ChevronsUpDown, ChevronsDownUp, ArrowUpRight } from 'lucide-react';
import { OBJETIVOS, hexDelColor } from '../utils/objetivos';
import RuedaDeConocimiento, { alternarRamaDeRueda, type NodoRueda } from '../components/rueda/RuedaDeConocimiento';
import ArbolDeConocimiento from '../components/arbol/ArbolDeConocimiento';
import { useAuth, ROLE } from '../contexts/AuthContext';
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

  /*
   * ── EL DIBUJO SE MUDÓ, LA REGLA DE APERTURA SE QUEDA ─────────────────────
   * Todo lo que era geometría —el acordeón, el giro a la derecha, la animación,
   * el texto radial, `MINIMO_LEGIBLE`— está en `RuedaDeConocimiento`. Aquí sólo
   * queda lo que es de esta página: qué nodos hay y qué pasa al pulsarlos.
   */
  const nodosRueda = useMemo<NodoRueda[]>(() => [
    ...OBJETIVOS.map(o => {
      const hs = subs.filter(x => (x.padre_id || x.objetivo_id) === o.id);
      return {
        id: o.id, nombre: o.titulo, padre: null, color: hexDelColor(o.color),
        // Un objetivo no tiene contenido propio: lo tiene todo colgado debajo.
        cosas: hs.reduce((n, h) => n + (h.cosas || 0), 0),
        favorito: esFav(o.id),
      } as NodoRueda;
    }),
    ...subs.map(x => ({
      id: x.id, nombre: x.nombre, padre: x.padre_id || x.objetivo_id,
      color: hexDelColor(OBJETIVOS.find(o => o.id === x.objetivo_id)?.color),
      cosas: x.cosas || 0, favorito: esFav(x.id),
    } as NodoRueda)),
  ], [subs, prefs]);

  const pulsar = (clave: string) => { setElegido(clave); abrirRama(clave); };

  /** De un tema hacia arriba: él, su padre, su abuelo… hasta el objetivo. */
  const caminoDe = (clave: string): string[] => {
    const camino: string[] = [];
    let actual: string | undefined = clave;
    // El tope es por si algún día una fila apunta a su propio antepasado: sin
    // él, un ciclo en los datos cuelga la página en vez de dibujar de menos.
    for (let i = 0; i < 12 && actual; i++) {
      camino.push(actual);
      const s = subs.find(x => x.id === actual);
      actual = s ? (s.padre_id || s.objetivo_id) : undefined;
      if (actual && OBJETIVOS.some(o => o.id === actual)) { camino.push(actual); break; }
    }
    return camino;
  };

  /*
   * ABRIR UNA RAMA ES ABRIR SU CAMINO ENTERO, y cerrar lo demás.
   *
   * Sin esto se podrían quedar dos ramas abiertas a la vez, y entonces las dos
   * querrían el trozo grande de su nivel: el acordeón dejaría de repartir y
   * volveríamos a tener trozos que no se leen. Una rama abierta cada vez es lo
   * que hace que el espacio alcance.
   */
  const abrirRama = (clave: string) => {
    // La misma regla que en la página de un tema, y por eso vive con la rueda:
    // si cada pantalla la escribiera por su lado se separarían, y dos ramas
    // abiertas a la vez rompen el reparto del acordeón.
    setAbiertos(a => alternarRamaDeRueda(nodosRueda, a, clave));
  };

  const nombreDe = (clave: string) =>
    OBJETIVOS.find(o => o.id === clave)?.titulo || subs.find(s => s.id === clave)?.nombre || '';
  const objetivoDe = (clave: string) =>
    OBJETIVOS.some(o => o.id === clave) ? clave : (subs.find(s => s.id === clave)?.objetivo_id || '');

  // ── A DÓNDE LLEVA CADA TROZO ──────────────────────────────────────────────
  // La rueda enseña el árbol; la página enseña lo que hay dentro. Hasta ahora
  // no había puerta entre las dos: se podía recorrer el mapa entero y no
  // llegar a ningún sitio, que es la manera más rápida de que un mapa deje de
  // usarse. Son dos páginas distintas porque son dos cosas distintas: un
  // objetivo es de la casa (`/objetivos/O001`, y esa página acepta el código
  // tal cual) y un subtema es del árbol (`/temas/:id`).
  const paginaDe = (clave: string) =>
    OBJETIVOS.some(o => o.id === clave) ? `/objetivos/${clave}` : `/temas/${clave}`;

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
          Los {OBJETIVOS.length} del centro son los de todos. Lo de fuera lo va añadiendo la gente: pulsa
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

      {/* ── EL ÁRBOL, ENCIMA DE LA RUEDA (2026-08-26) ────────────────────
          Eugenio: «encima de esa rueda vamos a crear un nuevo diseño
          conservando la anterior debajo, pero arriba vamos a explorar cómo
          quedaría esa rueda si fuese en forma de árbol».

          Las dos, y a la vez, porque **contestan preguntas distintas**: la
          rueda dice cuánto hay —el tamaño de cada trozo es la cantidad— y el
          árbol dice de dónde viene cada cosa. La rueda no puede enseñar que
          SALUD cuelga de dos ramas; el árbol no puede enseñar de un vistazo
          que AGUA tiene ocho veces más que EMPLEO.

          Es exploración declarada: la fase 1 existe para que se elija MIRANDO
          el reparto, no imaginándolo. Si el reparto de tres ramas no convence,
          lo que se tira es esto y la rueda se queda intacta. */}
      <div className="mb-6">
        <ArbolDeConocimiento hijosDe={hijosDe} puedeEditar={(user?.roleLevel ?? 0) >= ROLE.ADMIN} onElegir={setElegido} />
      </div>

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
          {/* ── LA RUEDA ES AHORA UN COMPONENTE COMÚN (2026-08-26) ──────────
              Eugenio: «haz que a nivel tecnológico tenga el mismo código, tanto
              para personalizar como para movilidad, poniendo las variables de
              tal manera que el código se recicle y no se repita, y que cuando
              cambiemos ese código cambie en todas las páginas en las que está».

              Todo el dibujo —el reparto en acordeón, el giro a la derecha, la
              animación, el texto radial, las franjas comprimidas— vivía aquí
              dentro y sabía qué era un objetivo. Ahora vive en
              `components/rueda/RuedaDeConocimiento.tsx` y **no sabe qué está
              dibujando**: recibe nodos con padre.

              Lo que se queda aquí es lo único que es de esta página: qué nodos
              son, y qué se hace al pulsarlos. Lo mismo hace la página de un
              tema con las ramas de MOVILIDAD. Tocar el reparto o la tipografía
              de la rueda cambia las dos a la vez, que era la petición. */}
          <RuedaDeConocimiento
            nodos={nodosRueda}
            abiertos={abiertos}
            elegido={elegido}
            etiqueta="Rueda de conocimiento de los temas"
            onPulsar={pulsar}
            centro={elegido ? (
              <>
                <p className="line-clamp-2 text-[13px] font-black leading-tight text-white">{nombreDe(elegido)}</p>
                <p className="text-[10px] text-slate-400">
                  {(hijosDe[elegido] || []).length
                    ? `${(hijosDe[elegido] || []).length} dentro`
                    : 'sin nada dentro'}
                </p>
                {/* Pulsar un trozo lo trae aquí, y desde aquí se decide
                    ensanchar su rama. Sólo cuando hay algo dentro: un botón que
                    abre una rama vacía enseña que no hay nada donde se
                    esperaba, y la siguiente vez ya no se pulsa. */}
                {(hijosDe[elegido] || []).length > 0 && (
                  <button
                    onClick={() => abrirRama(elegido)}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white transition-colors hover:bg-white/20"
                  >
                    {abiertos.has(elegido)
                      ? <><ChevronsDownUp className="h-3.5 w-3.5" /> Cerrar rama</>
                      : <><ChevronsUpDown className="h-3.5 w-3.5" /> Abrir rama</>}
                  </button>
                )}
                {/* «Abrir rama» ensancha el abanico sin salir de aquí; éste sale
                    de la rueda y entra en el tema. Uno se queda, el otro se va. */}
                <Link
                  to={paginaDe(elegido)}
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-900 transition-opacity hover:opacity-90"
                >
                  Abrir el tema <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
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
              </>
            ) : (
              <>
                <p className="text-[14px] font-black text-white">TEMAS</p>
                <p className="text-[11px] text-slate-400">{OBJETIVOS.length} + {subs.length}</p>
              </>
            )}
          />

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
