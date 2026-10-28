import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { miniatura } from '../../utils/miniatura';
import { useSitio } from './ContextoSitio';
import { Arco } from './ArcoCapas';
import { PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';
import { leerSistemas, type Circulo, type Sistema } from './circulosDatos';
import NotaCirculo from './NotaCirculo';

// ============================================================================
// CÍRCULO 2.0 — TRES BLOQUES EN LA MISMA PÁGINA (2026-10-28, Eugenio)
// ============================================================================
// «El arco con las cinco categorías todavía más a la izquierda y un poco más
// pequeño; las ramas en el centro, un poco más pequeñas; y cuando pinche, por
// ejemplo, en Economía y luego en Finanzas, que en vez de abrir la página de
// Finanzas me abra sus indicadores en esta misma página, en el lateral derecho:
// tres bloques. El tercero solo se muestra al pinchar: Ser humano → Salud → sus
// bloques; y si pincho en Salud mental, debajo, en la misma página, sus proyectos,
// personas, herramientas… sin llevarme a otra página.»
// Es la vista «Círculo» (arco y panel) con dos piezas más. A la derecha, el sector
// elegido y sus objetivos, que son sus bloques. Debajo, a todo lo ancho, las
// relaciones del objetivo elegido (o del sector, si aún no se ha elegido ninguno):
// indicadores, proyectos, personas, herramientas… Las relaciones salen de la misma
// red que pinta las pestañas de cada página (`GET /api/bd/paginas/:id/red`).
// Lo elegido va en la dirección (`?sector=` y `?bloque=`) para poder compartirlo.

const PATAS = /^patas?$/i;
const DIBUJOS: Record<string, string> = {
  'ser-humano': 'personas', sociedad: 'sociedad', economia: 'economia', tecnica: 'tecnologia', naturaleza: 'ecologia', ecosistema: 'ecologia',
};
const dibujoPata = (clave: string) => (DIBUJOS[clave] ? `/circulos/${DIBUJOS[clave]}.svg` : null);

type Entrada = { fila_id: string; pagina_id: string | null; titulo: string; imagen: string | null; icono: string | null; descripcion: string | null };
type Grupo = { columna_id: string; nombre: string; entradas: Entrada[] };

// La red de una página, una vez por visita.
const redes = new Map<string, Promise<Grupo[]>>();
function leerRed(paginaId: string) {
  let p = redes.get(paginaId);
  if (!p) {
    p = fetch(`/api/bd/paginas/${encodeURIComponent(paginaId)}/red`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { grupos: [] })).then(j => (j.grupos || []) as Grupo[]).catch(() => []);
    redes.set(paginaId, p);
  }
  return p;
}
function useRed(paginaId: string | null) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  useEffect(() => {
    if (!paginaId) { setGrupos(null); return; }
    let vivo = true; setGrupos(null);
    leerRed(paginaId).then(g => { if (vivo) setGrupos(g); });
    return () => { vivo = false; };
  }, [paginaId]);
  return grupos;
}

/** La nota de cada objetivo (por su página), de la base de datos de Objetivos que enlaza la de Sistemas. */
const notasObjetivos = new Map<string, Promise<Map<string, number>>>();
function useNotasObjetivos(raizId: string) {
  const [notas, setNotas] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    let p = notasObjetivos.get(raizId);
    if (!p) {
      p = leerSistemas(raizId).then(async j => {
        const tabla = (j?.columnas || []).find((c: any) => c.tipo === 'relacion' && /^objetivos$/i.test(String(c.nombre).trim()))?.config?.tabla_destino;
        if (!tabla) return new Map();
        const o = await fetch(`/api/bd/tablas/${encodeURIComponent(tabla)}?lectura=1`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
        const col = (o?.columnas || []).find((c: any) => c.tipo === 'nota');
        const m = new Map<string, number>();
        for (const f of o?.filas || []) { const v = col ? f.celdas?.[col.id]?.valor : null; if (f.pagina_id && typeof v === 'number') m.set(f.pagina_id, v); }
        return m;
      }).catch(() => new Map());
      notasObjetivos.set(raizId, p);
    }
    let vivo = true; p.then(m => { if (vivo) setNotas(m); });
    return () => { vivo = false; };
  }, [raizId]);
  return notas;
}

const esObjetivos = (g: Grupo) => /^objetivos?$/i.test(g.nombre.trim());
const SIN_INTERES = /^(sistema|territorio|tema superior)$/i; // lo que ya se sabe por el contexto

/** El tercer bloque: el sector elegido y sus objetivos, que se eligen aquí mismo. */
function BloqueSector({ s, c, grupos, notas, bloque, alElegir }: {
  s: Sistema; c: Circulo; grupos: Grupo[] | null; notas: Map<string, number>; bloque: string | null; alElegir: (e: Entrada) => void;
}) {
  const objetivos = grupos?.find(esObjetivos)?.entradas || [];
  return (
    <section data-bloque-sector className="min-w-0">
      <div className="mb-3 flex items-center gap-3">
        <span className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50">
          {s.imagen && <img src={miniatura(s.imagen, 160)} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{c.nombre}</div>
          <h3 className="text-2xl font-black leading-tight tracking-tight text-slate-900">{s.titulo}</h3>
        </div>
        {s.nota != null && <NotaCirculo nota={s.nota} tam="pequena" titulo={s.titulo} />}
      </div>
      {s.descripcion && <p className="mb-3 text-sm leading-snug text-slate-600">{s.descripcion}</p>}
      {!grupos ? <p className="py-6 text-sm text-slate-400">Cargando…</p>
        : objetivos.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{s.titulo} todavía no tiene objetivos. Debajo, lo que ya tiene enlazado.</p>
        : (
          <>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Objetivos · {objetivos.length}</div>
            <ul className="grid grid-cols-2 gap-2" data-objetivos-sector>
              {objetivos.map(o => {
                const on = bloque === o.pagina_id, nota = o.pagina_id ? notas.get(o.pagina_id) : undefined;
                return (
                  <li key={o.fila_id}>
                    <button type="button" onClick={() => alElegir(o)} aria-pressed={on} data-objetivo-sector={o.titulo}
                      className={`flex h-full w-full items-center gap-2 rounded-xl border bg-white p-2 text-left transition hover:shadow-md ${on ? 'border-[#3b82c4] ring-2 ring-[#3b82c4]' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="relative block h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                        {o.imagen ? <img src={miniatura(o.imagen, 120)} alt="" className="absolute inset-0 h-full w-full object-contain p-0.5" /> : o.icono ? <span className="grid h-full place-items-center text-xl">{o.icono}</span> : null}
                      </span>
                      <span lang="es" className="min-w-0 flex-1 hyphens-auto text-[13px] font-bold leading-tight text-slate-900">{o.titulo}</span>
                      {nota != null && <NotaCirculo nota={nota} tam="barra" titulo={o.titulo} className="scale-[0.8]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
    </section>
  );
}

/** Debajo, a todo lo ancho: las relaciones de lo elegido (indicadores, proyectos, personas, herramientas…). */
function Detalle({ paginaId, titulo, descripcion, grupos, quitarObjetivos }: {
  paginaId: string; titulo: string; descripcion?: string | null; grupos: Grupo[] | null; quitarObjetivos: boolean;
}) {
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const lista = (grupos || []).filter(g => !SIN_INTERES.test(g.nombre.trim()) && !(quitarObjetivos && esObjetivos(g)) && g.entradas.length);
  return (
    <section data-detalle-circulo2 className="mt-8 border-t border-slate-200 pt-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-black tracking-tight text-slate-900">{titulo}</h3>
          {descripcion && <p className="mt-0.5 max-w-3xl text-sm text-slate-600">{descripcion}</p>}
        </div>
        <Link to={enlace(paginaId)} onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-1 text-sm font-bold text-slate-700 hover:text-slate-900">Abrir su página <ArrowRight className="h-4 w-4" /></Link>
      </div>
      {!grupos ? <p className="py-6 text-sm text-slate-400">Cargando…</p>
        : !lista.length ? <p className="text-sm text-slate-500">Todavía no tiene proyectos, personas, herramientas ni indicadores enlazados.</p>
        : lista.map(g => (
          <div key={g.columna_id} className="mb-6" data-grupo-detalle={g.nombre}>
            <div className="mb-2 text-sm font-black text-slate-900">{g.nombre} <span className="font-bold text-slate-400">{g.entradas.length}</span></div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {g.entradas.map(x => (
                <li key={x.fila_id}>
                  {x.pagina_id ? (
                    <Link to={enlace(x.pagina_id)} onClick={() => window.scrollTo(0, 0)}
                      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="relative block aspect-[16/10] w-full bg-slate-50">
                        {x.imagen ? <img src={miniatura(x.imagen, 240)} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5" /> : x.icono ? <span className="grid h-full place-items-center text-3xl">{x.icono}</span> : null}
                      </span>
                      <span lang="es" className="hyphens-auto px-2.5 py-2 text-[13px] font-bold leading-tight text-slate-900">{x.titulo}</span>
                    </Link>
                  ) : <span className="block rounded-xl border border-slate-200 px-2.5 py-2 text-[13px] font-bold text-slate-900">{x.titulo}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}

export default function VistaCirculo2Sitio({ raizId }: { raizId: string }) {
  const t = useCirculosTerritorio(raizId, PATAS);
  const { circulos } = t;
  const { elegido, ver, elegir } = useCirculoElegido(circulos, 'data-circulo-elegido-c2');
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const q = new URLSearchParams(search);
  const sectorId = q.get('sector'), bloqueId = q.get('bloque');
  const poner = (cambios: Record<string, string | null>) => {
    const n = new URLSearchParams(search);
    for (const [k, v] of Object.entries(cambios)) { if (v) n.set(k, v); else n.delete(k); }
    ir(`${pathname}?${n.toString()}${hash}`, { replace: true });
  };
  const notas = useNotasObjetivos(raizId);
  const c = circulos?.length ? circulos[Math.min(elegido, circulos.length - 1)] : null;
  // El sector elegido, esté en la rama que se ve o no (se puede haber pasado el ratón por otra).
  const sector = useMemo(() => {
    for (const x of circulos || []) { const s = x.sistemas.find(y => y.id === sectorId); if (s) return { s, c: x }; }
    return null;
  }, [circulos, sectorId]);
  const gruposSector = useRed(sector?.s.id || null);
  const objetivo = useMemo(() => gruposSector?.find(esObjetivos)?.entradas.find(e => e.pagina_id === bloqueId) || null, [gruposSector, bloqueId]);
  const gruposObjetivo = useRed(objetivo?.pagina_id || null);

  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  if (!circulos.length || !c) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen rama: añade a su base de datos una columna de selección «Pata».</div>;
  return (
    // A todo lo ancho de la ventana (como el mapa): el arco pegado a la izquierda y sitio para los tres bloques.
    <div className="px-4 pt-1 sm:px-8" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }} data-vista-circulo2>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)_minmax(0,7fr)] lg:gap-8">
        <div className="mx-auto w-full max-w-[420px] lg:sticky lg:top-24 lg:mx-0">
          <Arco circulos={circulos} elegido={elegido} elegir={i => { elegir(i); }} ver={ver} dibujoDe={dibujoPata} />
        </div>
        <PanelCirculo c={c} t={t} compacto estrecho ancla="data-circulo-elegido-c2" elegidoId={sector?.s.id || null}
          alElegir={s => {
            poner({ sector: s.id, bloque: null, circulo: c.clave });
            if (window.innerWidth < 1024) setTimeout(() => document.querySelector('[data-bloque-sector]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
          }} />
        <div className="min-w-0">
          {sector && <BloqueSector s={sector.s} c={sector.c} grupos={gruposSector} notas={notas} bloque={bloqueId}
            alElegir={o => {
              poner({ bloque: o.pagina_id === bloqueId ? null : o.pagina_id });
              setTimeout(() => document.querySelector('[data-detalle-circulo2]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
            }} />}
        </div>
      </div>
      {sector && (objetivo
        ? <Detalle paginaId={objetivo.pagina_id!} titulo={objetivo.titulo} descripcion={objetivo.descripcion} grupos={gruposObjetivo} quitarObjetivos={false} />
        : <Detalle paginaId={sector.s.id} titulo={sector.s.titulo} descripcion={null} grupos={gruposSector} quitarObjetivos />)}
    </div>
  );
}
