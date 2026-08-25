import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Pencil, Check, GitBranch, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// EL ÁRBOL DE RAMAS DE UN PROYECTO (2026-08-25)
// ============================================================================
// Eugenio: «que esas ramas a nivel visual se bifurquen como un árbol — sólo que
// invertido, de arriba hacia abajo— y esas ramas pueden tener subramas. Haz
// todo el concepto elegante, simétrico, visual».
//
// ── POR QUÉ NO ES UNA LISTA CON SANGRÍA ────────────────────────────────────
// Una lista sangrada dice quién cuelga de quién y **no dice nada de la forma**:
// no se ve si el proyecto se abre en tres frentes o en uno con mucho fondo, ni
// dónde está el peso. Un árbol dibujado sí, y sin leer una palabra. Eso es lo
// que pidió y es lo que justifica el trabajo extra de colocarlo.
//
// ── LA SIMETRÍA NO ES DECORACIÓN, ES EL ALGORITMO ──────────────────────────
// Cada rama se dibuja **centrada exactamente sobre el bloque que ocupan sus
// hijas**. Eso es lo que hace que un árbol parezca ordenado, y no se consigue
// repartiendo a ojo: hay que medir primero cuánto ocupa cada subárbol —de abajo
// arriba— y sólo después colocar. Es la idea de Reingold–Tilford en su forma
// más simple, que aquí basta:
//
//   1. una pasada de abajo arriba mide el ANCHO de cada subárbol;
//   2. una pasada de arriba abajo reparte el sitio y centra cada madre.
//
// Hacerlo al revés —colocar y después ajustar— es de donde salen los árboles
// que se cruzan solos.
//
// ── EL DIBUJO ES SVG Y LAS TARJETAS SON HTML ───────────────────────────────
// Las líneas en SVG, encima el HTML. Se probó todo en SVG y el texto de una
// rama deja de poder seleccionarse, envolverse o llevar un botón dentro; y
// todo en HTML obliga a dibujar las curvas con bordes, que en las diagonales se
// ven como escaleras. Cada cosa hace lo que sabe hacer.

type Rama = {
  id: string; padre_id: string | null; nombre: string;
  nota: string | null; color: string | null; orden: number;
};

/* Medidas del dibujo, en un solo sitio. Cambiar el aire entre ramas es cambiar
   un número y no perseguirlo por seis fórmulas. */
const ANCHO = 168;   // lo que ocupa una rama
const HUECO = 22;    // aire entre dos hermanas
const ALTO = 104;    // lo que baja de un nivel al siguiente
const TARJETA = 52;  // alto de la tarjeta

/** Los colores que puede tener una rama. Se hereda de la madre si no elige. */
const COLORES: Record<string, { linea: string; borde: string; punto: string; texto: string }> = {
  esmeralda: { linea: '#10b981', borde: 'border-emerald-200', punto: 'bg-emerald-500', texto: 'text-emerald-700' },
  cielo:     { linea: '#0ea5e9', borde: 'border-sky-200',     punto: 'bg-sky-500',     texto: 'text-sky-700' },
  ambar:     { linea: '#f59e0b', borde: 'border-amber-200',   punto: 'bg-amber-500',   texto: 'text-amber-700' },
  violeta:   { linea: '#8b5cf6', borde: 'border-violet-200',  punto: 'bg-violet-500',  texto: 'text-violet-700' },
  rosa:      { linea: '#ec4899', borde: 'border-pink-200',    punto: 'bg-pink-500',    texto: 'text-pink-700' },
  pizarra:   { linea: '#64748b', borde: 'border-slate-200',   punto: 'bg-slate-400',   texto: 'text-slate-600' },
};
const ORDEN_COLORES = Object.keys(COLORES);

type Puesta = { rama: Rama; x: number; y: number; nivel: number; color: string; hijas: Puesta[] };

export default function ArbolDeRamas({ proyectoId, titulo }: { proyectoId: string; titulo: string }) {
  const [ramas, setRamas] = useState<Rama[] | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [creandoEn, setCreandoEn] = useState<string | null | undefined>(undefined);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  const cargar = () =>
    fetch(`/api/proyectos/${proyectoId}/ramas`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { setRamas(j.ramas ?? []); setPuedeEditar(!!j.puedeEditar); })
      .catch(() => setRamas([]));

  useEffect(() => { cargar(); }, [proyectoId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── LAS DOS PASADAS ──────────────────────────────────────────────────── */
  const arbol = useMemo(() => {
    if (!ramas) return null;
    const hijasDe = (id: string | null) =>
      ramas.filter(r => (r.padre_id ?? null) === id).sort((a, b) => a.orden - b.orden);

    // 1. De abajo arriba: cuánto ocupa cada subárbol.
    const ancho = (r: Rama): number => {
      const h = hijasDe(r.id);
      if (!h.length) return ANCHO;
      return h.reduce((a, x) => a + ancho(x), 0) + HUECO * (h.length - 1);
    };

    // 2. De arriba abajo: repartir el sitio y centrar cada madre sobre el suyo.
    const colocar = (r: Rama, izq: number, nivel: number, colorMadre: string): Puesta => {
      const h = hijasDe(r.id);
      const color = r.color && COLORES[r.color] ? r.color : colorMadre;
      let cursor = izq;
      const hijas = h.map(x => {
        const p = colocar(x, cursor, nivel + 1, color);
        cursor += ancho(x) + HUECO;
        return p;
      });
      const mio = ancho(r);
      return { rama: r, x: izq + mio / 2, y: nivel * ALTO, nivel, color, hijas };
    };

    const raices = hijasDe(null);
    let cursor = 0;
    const puestas = raices.map((r, i) => {
      // Cada raíz estrena color si no eligió uno: así el árbol se lee por
      // frentes de un vistazo, que es de lo que va tenerlo dibujado.
      const p = colocar(r, cursor, 0, ORDEN_COLORES[i % ORDEN_COLORES.length]);
      cursor += ancho(r) + HUECO * 2;
      return p;
    });
    const total = Math.max(cursor - HUECO * 2, ANCHO);
    const hondo = (function fondo(ps: Puesta[]): number {
      return ps.reduce((m, p) => Math.max(m, p.y + TARJETA, fondo(p.hijas)), 0);
    })(puestas);
    return { puestas, total, hondo };
  }, [ramas]);

  const planas = useMemo(() => {
    const fuera: Puesta[] = [];
    const meter = (ps: Puesta[]) => ps.forEach(p => { fuera.push(p); meter(p.hijas); });
    if (arbol) meter(arbol.puestas);
    return fuera;
  }, [arbol]);

  const crear = async () => {
    const nombre = nombreNuevo.trim();
    if (!nombre || ocupado) return;
    setOcupado(true); setFallo(null);
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/ramas`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, padre: creandoEn ?? null }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'No se ha podido crear.');
      setNombreNuevo(''); setCreandoEn(undefined);
      await cargar();
    } catch (e: any) { setFallo(e.message); } finally { setOcupado(false); }
  };

  const renombrar = async (id: string) => {
    const nombre = borrador.trim();
    setEditando(null);
    if (!nombre) return;
    await fetch(`/api/proyectos/${proyectoId}/ramas/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    }).catch(() => {});
    cargar();
  };

  const archivar = async (p: Puesta) => {
    const cuantas = (function contar(x: Puesta): number {
      return 1 + x.hijas.reduce((a, h) => a + contar(h), 0);
    })(p);
    // Se dice CUÁNTAS se van antes de preguntar. «¿Seguro?» a secas no informa
    // de nada: lo que hay que saber es que borrar una rama con seis dentro se
    // lleva las seis.
    const aviso = cuantas > 1
      ? `«${p.rama.nombre}» tiene ${cuantas - 1} ${cuantas - 1 === 1 ? 'rama' : 'ramas'} dentro. Se archivan las ${cuantas}.`
      : `Archivar «${p.rama.nombre}».`;
    if (!window.confirm(aviso)) return;
    await fetch(`/api/proyectos/${proyectoId}/ramas/${p.rama.id}`, {
      method: 'DELETE', credentials: 'include',
    }).catch(() => {});
    cargar();
  };

  if (ramas === null) {
    return <div className="flex justify-center py-10 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const vacio = ramas.length === 0;

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ramas del proyecto</p>
        {puedeEditar && creandoEn === undefined && (
          <button
            onClick={() => { setCreandoEn(null); setNombreNuevo(''); }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:border-emerald-300 hover:text-emerald-700"
          >
            <Plus className="h-3 w-3" /> Nueva rama
          </button>
        )}
      </div>

      {/* El formulario, uno solo, que sirve para la raíz y para cualquier rama:
          `creandoEn` dice de quién cuelga. Un formulario por rama serían
          veinte formularios en la pantalla esperando a que alguien los use. */}
      {puedeEditar && creandoEn !== undefined && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400">
            {creandoEn ? `Dentro de «${ramas.find(r => r.id === creandoEn)?.nombre ?? '…'}»` : 'Rama principal'}
          </span>
          <input
            autoFocus
            value={nombreNuevo}
            onChange={e => { setNombreNuevo(e.target.value); setFallo(null); }}
            onKeyDown={e => { if (e.key === 'Enter') crear(); if (e.key === 'Escape') setCreandoEn(undefined); }}
            placeholder="Nombre de la rama"
            className="min-w-0 flex-1 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-300 focus:border-emerald-300"
          />
          <button
            onClick={crear}
            disabled={!nombreNuevo.trim() || ocupado}
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {ocupado ? 'Creando…' : 'Crear'}
          </button>
          <button onClick={() => setCreandoEn(undefined)} className="text-slate-300 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
          {fallo && <p className="w-full text-[11px] font-bold text-red-600">{fallo}</p>}
        </div>
      )}

      {vacio ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 py-14 text-center">
          <GitBranch className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">Este proyecto no tiene ramas todavía.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Una rama es un frente del proyecto. Se abren hacia abajo y cada una puede abrir las suyas.
          </p>
        </div>
      ) : (
        <div ref={caja} className="overflow-x-auto rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-6">
          <div className="relative mx-auto" style={{ width: arbol!.total, height: arbol!.hondo + 8 }}>
            {/* LAS LÍNEAS. Curvas de Bézier con los tiradores en vertical: una
                línea recta en diagonal se lee como una flecha y una curva se
                lee como una rama que se abre. Salen del pie de la madre y
                entran por la cabeza de la hija. */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {planas.flatMap(p => p.hijas.map(h => {
                const x1 = p.x, y1 = p.y + TARJETA;
                const x2 = h.x, y2 = h.y;
                const m = (y1 + y2) / 2;
                return (
                  <path
                    key={`${p.rama.id}-${h.rama.id}`}
                    d={`M ${x1} ${y1} C ${x1} ${m}, ${x2} ${m}, ${x2} ${y2}`}
                    fill="none"
                    stroke={COLORES[h.color]?.linea ?? '#94a3b8'}
                    strokeWidth={2}
                    strokeOpacity={0.45}
                    strokeLinecap="round"
                  />
                );
              }))}
            </svg>

            {planas.map(p => {
              const c = COLORES[p.color] ?? COLORES.pizarra;
              return (
                <div
                  key={p.rama.id}
                  className="group/rama absolute"
                  style={{ left: p.x - ANCHO / 2, top: p.y, width: ANCHO, height: TARJETA }}
                >
                  <div className={cn('flex h-full flex-col justify-center rounded-2xl border bg-white px-3 shadow-sm transition-shadow hover:shadow-md', c.borde)}>
                    {editando === p.rama.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={borrador}
                          onChange={e => setBorrador(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renombrar(p.rama.id); if (e.key === 'Escape') setEditando(null); }}
                          onBlur={() => renombrar(p.rama.id)}
                          className="min-w-0 flex-1 border-b border-emerald-400 text-[12.5px] font-bold text-slate-800 outline-none"
                        />
                        <button onClick={() => renombrar(p.rama.id)} className="text-emerald-600"><Check className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', c.punto)} />
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-slate-800" title={p.rama.nombre}>
                            {p.rama.nombre}
                          </span>
                        </div>
                        {p.rama.nota && (
                          <span className="mt-0.5 truncate pl-3.5 text-[10.5px] text-slate-400">{p.rama.nota}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Los mandos salen al pasar por encima. En reposo esto es un
                      dibujo del proyecto, no un panel con tres botones por
                      rama: con quince ramas serían cuarenta y cinco botones
                      compitiendo con lo que hay que leer. */}
                  {puedeEditar && editando !== p.rama.id && (
                    <div className="absolute -top-2.5 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover/rama:opacity-100">
                      <button
                        onClick={() => { setCreandoEn(p.rama.id); setNombreNuevo(''); }}
                        title={`Abrir una rama dentro de ${p.rama.nombre}`}
                        aria-label={`Abrir una rama dentro de ${p.rama.nombre}`}
                        className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-emerald-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => { setEditando(p.rama.id); setBorrador(p.rama.nombre); }}
                        title={`Cambiar el nombre de ${p.rama.nombre}`}
                        aria-label={`Cambiar el nombre de ${p.rama.nombre}`}
                        className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-slate-800"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => archivar(p)}
                        title={`Archivar ${p.rama.nombre}`}
                        aria-label={`Archivar ${p.rama.nombre}`}
                        className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm hover:text-red-600"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!vacio && (
        <p className="mt-2 text-[11px] text-slate-400">
          {ramas.length} {ramas.length === 1 ? 'rama' : 'ramas'} en {titulo}. Cada una se centra sobre lo que
          cuelga de ella: si el dibujo se ve torcido, es que el proyecto lo está.
        </p>
      )}
    </div>
  );
}
