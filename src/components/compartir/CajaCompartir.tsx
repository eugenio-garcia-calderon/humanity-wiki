import { useEffect, useState } from 'react';
import { Share2, Globe, Lock, Copy, Check, X, Loader2, ExternalLink, Link2, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LA CAJITA DE COMPARTIR — LA MISMA PARA TODO (2026-08-25)
// ============================================================================
// Eugenio: «crea un módulo que sea como una los dos, para que en un futuro, si
// queremos también compartir otras herramientas, no tengamos que duplicar
// código y utilicemos siempre la misma cajita de compartir, que sea como para
// todas».
//
// Se le dice QUÉ se comparte —`tipo` e `id`— y ella se encarga del resto. No
// sabe qué es una página ni qué es un proyecto, y ésa es toda la gracia: el
// servidor le dice el nombre («página», «proyecto») y ella lo escribe donde
// toca. Añadir mapas a lo compartible no la toca.
//
// ── LAS TRES DIRECCIONES, Y POR QUÉ SE ENSEÑAN LAS TRES ────────────────────
//   · la larga   `humanity.wiki/@quien/lo-que-sea`  — siempre funciona;
//   · la corta   `quien.humanity.wiki/lo-que-sea`   — la que se enseña;
//   · el dominio propio                              — si lo hay.
//
// Enseñar sólo la corta escondería que existe la larga, que es la que sigue
// funcionando el día que alguien se cambia el nombre de usuario.

type Estado = {
  tipo: string; nombre: string;
  id: string; titulo: string; slug: string | null;
  publico: boolean; handle: string | null;
  puedeCompartir: boolean;
  urls: { larga: string; corta: string } | null;
  dominios: Array<{ dominio: string; estado: string; ultimo_error: string | null }>;
};

export default function CajaCompartir({ tipo, id, onCerrar, onCambiado }: {
  tipo: string; id: string;
  onCerrar: () => void;
  /** Para que la pantalla de detrás se entere de que ya es público. */
  onCambiado?: () => void;
}) {
  const [e, setE] = useState<Estado | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [slugBorrador, setSlugBorrador] = useState('');
  const [editandoSlug, setEditandoSlug] = useState(false);
  const [dominioNuevo, setDominioNuevo] = useState('');
  const [pasos, setPasos] = useState<string[] | null>(null);

  const cargar = () =>
    fetch(`/api/compartir/${tipo}/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || 'No se ha podido abrir.');
        return j;
      })
      .then(j => { setE(j); setSlugBorrador(j.slug || ''); })
      .catch(err => setFallo(err.message));

  useEffect(() => { cargar(); }, [tipo, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (cambio: Record<string, any>) => {
    setOcupado(true); setFallo(null);
    try {
      const r = await fetch(`/api/compartir/${tipo}/${encodeURIComponent(id)}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambio),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'No se ha podido guardar.');
      await cargar();
      onCambiado?.();
    } catch (err: any) { setFallo(err.message); } finally { setOcupado(false); }
  };

  const copiar = (texto: string, cual: string) => {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(cual);
      window.setTimeout(() => setCopiado(c => (c === cual ? null : c)), 1600);
    }).catch(() => {});
  };

  const anadirDominio = async () => {
    const d = dominioNuevo.trim();
    if (!d) return;
    setOcupado(true); setFallo(null); setPasos(null);
    try {
      const r = await fetch('/api/dominios', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // `tipo` y `entidad_id` son la forma nueva. La vieja (`pagina_id`)
        // sigue viva en el servidor para lo que ya existía, pero desde aquí se
        // usa siempre la general: es la que vale para cualquier herramienta.
        body: JSON.stringify({ dominio: d, tipo, entidad_id: id }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || 'No se ha podido añadir.');
      setPasos(j.pasos ?? null);
      setDominioNuevo('');
      await cargar();
    } catch (err: any) { setFallo(err.message); } finally { setOcupado(false); }
  };

  const cuerpo = () => {
    if (fallo && !e) return <p className="text-sm font-bold text-red-600">{fallo}</p>;
    if (!e) return <div className="flex justify-center py-8 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>;

    const raiz = typeof window !== 'undefined' ? window.location.origin : '';

    return (
      <>
        {/* ── PÚBLICO O NO ─────────────────────────────────────────────────
            Lo primero, porque sin esto lo demás no sirve de nada: un dominio
            propio sobre algo privado es una dirección que no enseña nada. */}
        <button
          onClick={() => e.puedeCompartir && guardar({ publico: !e.publico })}
          disabled={!e.puedeCompartir || ocupado}
          className={cn('flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
            e.publico ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white',
            e.puedeCompartir && 'hover:border-emerald-300')}
        >
          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            e.publico ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400')}>
            {e.publico ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black text-slate-800">
              {e.publico ? `Este ${e.nombre} es público` : `Este ${e.nombre} es privado`}
            </span>
            <span className="block text-[11.5px] leading-snug text-slate-500">
              {e.publico
                ? 'Cualquiera con el enlace puede verlo, sin cuenta.'
                : e.puedeCompartir ? 'Pulsa para publicarlo y poder compartirlo.' : 'Sólo su dueño puede publicarlo.'}
            </span>
          </span>
        </button>

        {/* ── LAS DOS DIRECCIONES DE LA CASA ──────────────────────────────── */}
        {e.publico && e.urls && (
          <div className="mt-3 flex flex-col gap-1.5">
            {[
              { cual: 'larga', texto: raiz + e.urls.larga, pie: 'Siempre funciona' },
              { cual: 'corta', texto: e.urls.corta, pie: 'Más corta, la que se enseña' },
            ].map(u => (
              <div key={u.cual} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600" title={u.texto}>{u.texto}</span>
                <span className="hidden shrink-0 text-[10px] text-slate-300 sm:inline">{u.pie}</span>
                <button
                  onClick={() => copiar(u.texto, u.cual)}
                  aria-label={`Copiar la dirección ${u.cual}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  {copiado === u.cual ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={u.texto} target="_blank" rel="noopener noreferrer"
                  aria-label={`Abrir la dirección ${u.cual}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}

            {/* ── CAMBIAR LA DIRECCIÓN, CON SU AVISO ──────────────────────
                No se impide: es su dirección. Pero se dice antes lo que cuesta,
                que es lo único honesto que se puede hacer al respecto. */}
            {e.puedeCompartir && (
              editandoSlug ? (
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-2">
                  <span className="text-[11px] font-bold text-amber-800">/{e.handle}/</span>
                  <input
                    autoFocus
                    value={slugBorrador}
                    onChange={ev => setSlugBorrador(ev.target.value)}
                    onKeyDown={ev => { if (ev.key === 'Enter') { setEditandoSlug(false); guardar({ slug: slugBorrador }); } if (ev.key === 'Escape') setEditandoSlug(false); }}
                    className="min-w-0 flex-1 rounded-lg border border-amber-300 px-2 py-1 text-[12px] font-bold text-slate-700 outline-none"
                  />
                  <button onClick={() => { setEditandoSlug(false); guardar({ slug: slugBorrador }); }}
                    className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white">Cambiar</button>
                  <button onClick={() => { setEditandoSlug(false); setSlugBorrador(e.slug || ''); }}
                    className="text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
                  <p className="flex w-full items-start gap-1.5 text-[10.5px] leading-snug text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    Los enlaces que ya hayas compartido dejarán de funcionar.
                  </p>
                </div>
              ) : (
                <button onClick={() => setEditandoSlug(true)}
                  className="self-start text-[11px] font-bold text-slate-400 hover:text-slate-700">
                  Cambiar la dirección
                </button>
              )
            )}
          </div>
        )}

        {/* ── DOMINIO PROPIO ──────────────────────────────────────────────── */}
        {e.publico && e.puedeCompartir && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Tu propio dominio</p>

            {e.dominios.map(d => (
              <div key={d.dominio} className="mb-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-700">{d.dominio}</span>
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase',
                  d.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {d.estado}
                </span>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-1.5">
              <input
                value={dominioNuevo}
                onChange={ev => { setDominioNuevo(ev.target.value); setFallo(null); }}
                onKeyDown={ev => { if (ev.key === 'Enter') anadirDominio(); }}
                placeholder="midominio.com"
                className="min-w-0 flex-1 rounded-full border border-slate-200 px-3 py-1.5 text-[12px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-emerald-300"
              />
              <button
                onClick={anadirDominio}
                disabled={!dominioNuevo.trim() || ocupado}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                Apuntar aquí
              </button>
            </div>

            {/* Los pasos que devuelve el servidor, tal cual: qué registro DNS
                crear y en qué orden. Escribirlos aquí otra vez sería tener dos
                versiones de la misma instrucción. */}
            {pasos && (
              <ol className="mt-2 flex list-decimal flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-3 pl-6 text-[11.5px] leading-relaxed text-slate-600">
                {pasos.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            )}
          </div>
        )}

        {fallo && <p className="mt-2 text-[11.5px] font-bold text-red-600">{fallo}</p>}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={ev => ev.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-emerald-600" />
          <h2 className="flex-1 text-sm font-black text-slate-900">
            Compartir {e ? `este ${e.nombre}` : ''}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-slate-300 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {cuerpo()}
      </div>
    </div>
  );
}
