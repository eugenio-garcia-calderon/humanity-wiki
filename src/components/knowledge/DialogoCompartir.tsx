import { useEffect, useRef, useState } from 'react';
import DominioPropio from './DominioPropio';
import {
  X, Globe, Lock, Copy, Check, Loader2, AlertTriangle, ExternalLink,
  Download, FileText, Image as ImageIcon, FileType, Search,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { OBJETIVOS, hablaDe } from '../../utils/objetivos';

// ============================================================================
// COMPARTIR UNA PÁGINA (2026-08-22)
// ============================================================================
// Faltaba el diálogo entero: había un icono de descarga con cuatro formatos y
// ningún sitio donde compartir. Las dos cosas que pidió Eugenio —una dirección
// corta y limpia como la de Notion, y poder exportar a PDF o PNG desde el botón
// de compartir— resultaron ser la misma pieza que faltaba, así que van juntas.
//
// ── LA DIRECCIÓN SE RESERVA HOY Y SE SIRVE MAÑANA ───────────────────────────
// El subdominio (`tunombre.humanity.wiki/tu-pagina`) necesita un DNS comodín y
// un certificado, y ninguna de las dos cosas está en este repositorio. Por eso
// el servidor devuelve LAS DOS direcciones y esta pantalla enseña la que
// funciona hoy, con la otra ya escrita debajo. El día que exista el comodín,
// aquí solo cambia cuál se copia: ni un dato se migra y ningún enlace ya
// compartido se rompe.
//
// ── EXPORTAR NO ES COMPARTIR, PERO SE PIDE EN EL MISMO MOMENTO ──────────────
// PDF, PNG, Word y Markdown ya existían y estaban escondidos tras un icono de
// descarga que nadie relaciona con «mandarle esto a alguien». Aquí están donde
// se buscan.

type Estado = { publico: boolean; slug: string | null; handle: string | null };

export default function DialogoCompartir({ paginaId, titulo, publicoInicial, onCerrar, onCambio }: {
  paginaId: string;
  titulo: string;
  publicoInicial: boolean;
  onCerrar: () => void;
  /** Para que la cabecera del editor repinte su «Pública / Privada». */
  onCambio?: (publico: boolean) => void;
}) {
  const [estado, setEstado] = useState<Estado>({ publico: publicoInicial, slug: null, handle: null });
  const [handle, setHandle] = useState('');
  const [slug, setSlug] = useState('');
  // `null` = TODAVÍA NO SE HA PREGUNTADO, y no es lo mismo que «no». Empezaba
  // en `true`, o sea que publicar mandaba la página a Google sin que nadie lo
  // decidiera — justo lo contrario de preguntar.
  const [indexable, setIndexable] = useState<boolean | null>(null);
  const [compruebaHandle, setCompruebaHandle] = useState<{ libre: boolean; motivo: string | null } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  /*
   * ══ PERSONAS CONCRETAS (2026-08-25, fase 3 de «todo son páginas») ═════════
   * Eugenio: «existe la opción de que la página sea semiprivada, donde das
   * acceso a personas concretas, de solo lectura o también de edición».
   *
   * Vive en ESTE diálogo y no en otro: compartir con el mundo (publicar) y
   * compartir con alguien (acceso) son la misma pregunta —¿quién ve esto?— y
   * dos ventanas para una pregunta es cómo se contesta mal en una de las dos.
   */
  /*
   * ══ LAS RAMAS DEL CONOCIMIENTO (2026-08-25, fase 6) ═══════════════════════
   * Eugenio: «cada página se indexa dentro del conocimiento al publicarse». Las
   * ramas se PROPONEN por las palabras del título (`hablaDe`, el mismo criterio
   * del muro) y se editan aquí — propuesto y editable, no una cosa o la otra:
   * sólo automático clasifica mal en silencio, y sólo manual acaba con todo sin
   * clasificar (aviso de prog2, que tiene el árbol). Se preseleccionan las
   * ramas cuyo nombre comparte alguna palabra con el título; el resto quedan a
   * un toque.
   */
  const [temas, setTemas] = useState<any[]>([]);
  const [ramasSel, setRamasSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('/api/temas', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => {
        const lista = Array.isArray(j) ? j : (j?.subtemas ?? j?.temas ?? []);
        setTemas(Array.isArray(lista) ? lista : []);
        const objetivosDelTitulo = new Set(OBJETIVOS.filter(o => hablaDe(titulo || '', o)).map(o => o.id));
        const palabras = (titulo || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const pre = new Set<string>();
        for (const t of (Array.isArray(lista) ? lista : [])) {
          if (t.padre_id) continue;
          if (!objetivosDelTitulo.has(t.objetivo_id)) continue;
          const nombre = String(t.nombre || '').toLowerCase();
          if (palabras.some(w => nombre.includes(w))) pre.add(t.id);
        }
        setRamasSel(pre);
      })
      .catch(() => {});
  }, [titulo]);
  const ramasPropuestas = (() => {
    const objetivosDelTitulo = new Set(OBJETIVOS.filter(o => hablaDe(titulo || '', o)).map(o => o.id));
    return temas.filter(t => !t.padre_id && objetivosDelTitulo.has(t.objetivo_id));
  })();
  const alternarRama = (id: string) => setRamasSel(sel => {
    const s2 = new Set(sel); s2.has(id) ? s2.delete(id) : s2.add(id); return s2;
  });

  const [accesos, setAccesos] = useState<any[] | null>(null);
  const [buscaPersona, setBuscaPersona] = useState('');
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const relojPersona = useRef<any>(null);

  const cargarAccesos = () => {
    fetch(`/api/accesos/pagina/${paginaId}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => setAccesos(Array.isArray(j.accesos) ? j.accesos : []))
      // Un 403 aquí significa «no eres el autor»: la sección entera se esconde,
      // porque enseñar una lista que no puedes tocar sólo confunde.
      .catch(() => setAccesos(null));
  };
  useEffect(cargarAccesos, [paginaId]);

  const buscarPersonas = (v: string) => {
    setBuscaPersona(v);
    clearTimeout(relojPersona.current);
    if (v.trim().length < 2) { setCandidatos([]); return; }
    relojPersona.current = setTimeout(async () => {
      const r = await fetch(`/api/accesos/buscar-personas?q=${encodeURIComponent(v.trim())}`, { credentials: 'include' });
      const j = await r.json().catch(() => ({}));
      setCandidatos(Array.isArray(j.personas) ? j.personas : []);
    }, 300);
  };

  const darAcceso = async (userId: string, rol: 'lectura' | 'edicion') => {
    await fetch(`/api/accesos/pagina/${paginaId}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, rol }),
    });
    setBuscaPersona(''); setCandidatos([]);
    cargarAccesos();
  };

  const quitarAcceso = async (userId: string) => {
    await fetch(`/api/accesos/pagina/${paginaId}/${userId}`, { method: 'DELETE', credentials: 'include' });
    cargarAccesos();
  };
  const temporizador = useRef<any>(null);

  // Quién soy y cómo se llama mi espacio. Sin nombre no se puede publicar: la
  // dirección entera es «<nombre>/<página>», así que falta la mitad.
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.user?.handle) { setEstado(e => ({ ...e, handle: j.user.handle })); setHandle(j.user.handle); } })
      .catch(() => {});

    // Y CÓMO ESTÁ COMPARTIDA DE VERDAD. Antes esta pantalla no lo leía: daba
    // por hecho que sí a los buscadores, así que quien había dicho que no
    // reabría el diálogo y se veía marcado el «sí».
    fetch(`/api/publicar/estado/${paginaId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j) return;
        // EL NOMBRE DEL ESPACIO SALE DE AQUÍ, y es la causa de un fallo que
        // Eugenio vio el 2026-08-23: `/api/auth/me` NO devuelve `handle`, así
        // que esta pantalla creía que nadie lo tenía nunca. Resultado: te pedía
        // reservar un nombre que ya era tuyo, y como el resto del diálogo
        // colgaba de esa condición, escondía las direcciones, los buscadores y
        // el dominio propio a quien ya lo tenía todo.
        setEstado(e => ({
          ...e,
          publico: j.publico,
          slug: j.slug ?? e.slug,
          handle: j.handle ?? e.handle,
        }));
        if (j.handle) setHandle(j.handle);
        setIndexable(j.indexable);
        if (j.slug) setSlug(j.slug);
      })
      .catch(() => {});
  }, [paginaId]);

  /** Comprueba el nombre MIENTRAS se escribe. Sin esto, la única forma de saber
   *  si está libre es intentar guardarlo y que falle, que es la peor. */
  const mirarHandle = (v: string) => {
    setHandle(v);
    setCompruebaHandle(null);
    clearTimeout(temporizador.current);
    if (!v.trim()) return;
    temporizador.current = setTimeout(async () => {
      const r = await fetch(`/api/publicar/handle-libre?handle=${encodeURIComponent(v)}`, { credentials: 'include' });
      const j = await r.json();
      setCompruebaHandle({ libre: !!j.libre, motivo: j.motivo || null });
      if (j.handle && j.handle !== v) setHandle(j.handle);
    }, 350);
  };

  const guardarHandle = async () => {
    setOcupado(true); setFallo(null);
    const r = await fetch('/api/publicar/handle', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle }),
    });
    const j = await r.json();
    setOcupado(false);
    if (!r.ok) { setFallo(j.error); return; }
    setEstado(e => ({ ...e, handle: j.handle }));
  };

  const publicar = async () => {
    setOcupado(true); setFallo(null);
    const r = await fetch(`/api/publicar/paginas/${paginaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      // Si todavía no ha contestado, se publica SIN indexar. La asimetría lo
      // decide: estar en Google se tarda días en deshacer, y no estarlo se
      // arregla con un clic. Ante la duda, la opción reversible.
      body: JSON.stringify({ slug: slug || undefined, publico: true, indexable: indexable === true, ramas: [...ramasSel] }),
    });
    const j = await r.json();
    setOcupado(false);
    // Si falta el nombre del espacio, el servidor lo dice con `falta: 'handle'`
    // en vez de un error genérico, y aquí se puede señalar qué hacer.
    if (!r.ok) { setFallo(j.error); return; }
    setEstado({ publico: true, slug: j.slug, handle: j.handle });
    setSlug(j.slug);
    onCambio?.(true);
  };

  const despublicar = async () => {
    setOcupado(true);
    await fetch(`/api/publicar/paginas/${paginaId}`, { method: 'DELETE', credentials: 'include' });
    setOcupado(false);
    setEstado(e => ({ ...e, publico: false }));
    onCambio?.(false);
  };

  const copiar = async (texto: string, cual: string) => {
    try { await navigator.clipboard.writeText(texto); } catch { /* sin permiso */ }
    setCopiado(cual);
    setTimeout(() => setCopiado(null), 1600);
  };

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const urlRuta = estado.handle && estado.slug ? `${base}/@${estado.handle}/${estado.slug}` : null;
  const urlSubdominio = estado.handle && estado.slug ? `https://${estado.handle}.humanity.wiki/${estado.slug}` : null;

  return (
    <div className="fixed inset-0 z-[9994] flex items-start justify-center p-4 sm:p-10 bg-slate-900/40 overflow-y-auto"
      onClick={onCerrar}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-800">Compartir</h2>
            <p className="text-[11px] text-slate-400 truncate">{titulo || 'Sin título'}</p>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="w-11 h-11 shrink-0 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* ── PUBLICAR O NO ─────────────────────────────────────────────── */}
          <div className={cn('flex items-start gap-3 p-3 rounded-xl border',
            estado.publico ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
            <span className={cn('w-9 h-9 shrink-0 grid place-items-center rounded-lg',
              estado.publico ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400')}>
              {estado.publico ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">
                {estado.publico ? 'Publicada en la web' : 'Privada'}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {estado.publico
                  ? 'Cualquiera con el enlace puede verla, sin necesidad de cuenta.'
                  : 'Solo tú la ves. Publícala para poder compartir un enlace.'}
              </p>
            </div>
            <button
              onClick={estado.publico ? despublicar : publicar}
              disabled={ocupado}
              className={cn('h-11 px-3 shrink-0 rounded-xl text-xs font-bold transition-colors disabled:opacity-50',
                estado.publico ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                               : 'bg-slate-900 text-white hover:bg-slate-800')}>
              {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : estado.publico ? 'Dejar de publicar' : 'Publicar'}
            </button>
          </div>

          {/* ── LAS RAMAS DONDE SE INDEXA (fase 6) ───────────────────────
              Sólo tiene sentido de cara a publicar; con la página privada no se
              indexa nada y la sección lo dice en vez de esconderse. */}
          {ramasPropuestas.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-black text-slate-700">Ramas del conocimiento</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                {estado.publico
                  ? 'Al estar pública, la página se indexa en las ramas que elijas.'
                  : 'Al publicarla, la página se indexará en las ramas que elijas.'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ramasPropuestas.map(t => (
                  <button
                    key={t.id}
                    onClick={() => alternarRama(t.id)}
                    aria-pressed={ramasSel.has(t.id)}
                    className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
                      ramasSel.has(t.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PERSONAS CONCRETAS: SEMIPRIVADA ──────────────────────────
              Sólo la ve el autor (el servidor contesta 403 a los demás y la
              sección no se pinta). El rol se elige al dar el acceso; repetir a
              alguien con el otro rol se lo cambia. */}
          {accesos !== null && (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-black text-slate-700">Personas con acceso</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                Aunque la página esté privada, estas personas la ven. Con edición, también la editan.
              </p>
              <div className="relative">
                <input
                  value={buscaPersona}
                  onChange={e => buscarPersonas(e.target.value)}
                  placeholder="Buscar a alguien por su nombre…"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-300"
                />
                {candidatos.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {candidatos.map(cand => (
                      <div key={cand.id} className="flex items-center gap-2 px-2.5 py-1.5">
                        {cand.avatar_url
                          ? <img src={cand.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                          : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-500">{(cand.nombre || '?').charAt(0).toUpperCase()}</span>}
                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{cand.nombre}</span>
                        <button onClick={() => darAcceso(cand.id, 'lectura')}
                          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
                          Lectura
                        </button>
                        <button onClick={() => darAcceso(cand.id, 'edicion')}
                          className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white hover:bg-slate-800">
                          Edición
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {accesos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {accesos.map(a => (
                    <div key={a.user_id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                      {a.avatar_url
                        ? <img src={a.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                        : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-black text-slate-500">{(a.nombre || '?').charAt(0).toUpperCase()}</span>}
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{a.nombre}</span>
                      <button
                        onClick={() => darAcceso(a.user_id, a.rol === 'edicion' ? 'lectura' : 'edicion')}
                        title="Cambiar el rol"
                        className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black',
                          a.rol === 'edicion' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600')}
                      >
                        {a.rol === 'edicion' ? 'Edición' : 'Lectura'}
                      </button>
                      <button onClick={() => quitarAcceso(a.user_id)} title="Quitar el acceso" aria-label={`Quitar el acceso a ${a.nombre}`}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EL NOMBRE DEL ESPACIO ─────────────────────────────────────── */}
          {!estado.handle && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-xs font-bold text-amber-900">Antes, elige el nombre de tu espacio</p>
              <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                Es la primera mitad de todas tus direcciones, y va a ser tu subdominio.
                Se elige una vez.
              </p>
              <div className="mt-2 flex items-center gap-1">
                <input value={handle} onChange={e => mirarHandle(e.target.value)}
                  placeholder="luz-y-humanidad"
                  className="flex-1 min-w-0 h-11 px-3 border border-amber-200 rounded-xl bg-white text-base sm:text-sm outline-none focus:border-amber-400" />
                <button onClick={guardarHandle} disabled={ocupado || !compruebaHandle?.libre}
                  className="h-11 px-3 shrink-0 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40">
                  Reservar
                </button>
              </div>
              {compruebaHandle && (
                <p className={cn('mt-1 text-[11px] font-bold', compruebaHandle.libre ? 'text-emerald-700' : 'text-rose-600')}>
                  {compruebaHandle.libre ? `«${handle}» está libre` : compruebaHandle.motivo}
                </p>
              )}
            </div>
          )}

          {/* ── LAS DIRECCIONES ───────────────────────────────────────────── */}
          {estado.publico && urlRuta && (
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Enlace para compartir</p>
                <div className="mt-1 flex items-center gap-1">
                  <input readOnly value={urlRuta}
                    onFocus={e => e.currentTarget.select()}
                    className="flex-1 min-w-0 h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs outline-none" />
                  <button onClick={() => copiar(urlRuta, 'ruta')} title="Copiar"
                    className="w-11 h-11 shrink-0 grid place-items-center rounded-xl bg-slate-900 text-white">
                    {copiado === 'ruta' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a href={urlRuta} target="_blank" rel="noreferrer" title="Abrir"
                    className="w-11 h-11 shrink-0 grid place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* LA DIRECCIÓN CORTA YA FUNCIONA (2026-08-22). Este bloque
                  decía «todavía no funciona» desde que se escribió por la
                  mañana, y el subdominio se activó esa misma tarde. Un texto
                  que envejece mal es peor que ninguno: quien lo lee deja de
                  usar algo que sí puede usar. */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Tu dirección corta</p>
                <div className="mt-1 flex items-center gap-2">
                  <a href={urlSubdominio} target="_blank" rel="noreferrer"
                     className="font-mono text-xs text-slate-700 break-all hover:underline flex-1 min-w-0">
                    {urlSubdominio}
                  </a>
                  <button onClick={() => navigator.clipboard?.writeText(urlSubdominio)}
                    aria-label="Copiar la dirección corta"
                    className="w-11 h-11 shrink-0 grid place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── LOS BUSCADORES, PREGUNTADO Y NO SUPUESTO ───────────────────────
              Eugenio, 2026-08-23: «configura el tema de indexación en buscadores
              como google, preguntando al usuario si quiere».

              Antes era una casilla marcada de antemano, escondida al final y
              DENTRO del bloque que exige haber reservado el nombre del espacio.
              O sea: quien publicaba sin reservar nombre acababa en Google sin
              que nadie se lo preguntara, y sin ver siquiera la casilla.

              Ahora son dos botones y hay que elegir. Publicar y ser encontrable
              son decisiones distintas: se le puede mandar un enlace a tres
              personas sin que la página acabe en un buscador. */}
          {estado.publico && (
            <div className="p-3 rounded-xl border border-slate-200 bg-white">
              <p className="text-xs font-black text-slate-800">¿Quieres que aparezca en Google?</p>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                Publicar y ser encontrable son cosas distintas. Puedes mandar el enlace
                a quien quieras sin que la página acabe en un buscador.
                {indexable === null && <><br /><b className="text-slate-600">De momento no aparece.</b> Elige.</>}
              </p>
              <div className="mt-2 flex gap-2">
                {([[true, 'Sí, que la encuentren'], [false, 'No, solo con el enlace']] as const).map(([v, t]) => (
                  <button key={String(v)} type="button"
                    onClick={async () => {
                      setIndexable(v);
                      await fetch(`/api/publicar/paginas/${paginaId}`, {
                        method: 'PUT', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ publico: true, indexable: v }),
                      });
                    }}
                    className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-colors ${
                      indexable === v
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {/* Google tarda en soltar lo que ya indexó, y decirlo evita el
                  «lo he puesto en no y sigue saliendo» de dentro de dos días. */}
              {indexable === false && (
                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  Si ya estaba indexada, Google puede tardar días en quitarla.
                </p>
              )}
            </div>
          )}

          {/* ── TU PROPIO DOMINIO ──────────────────────────────────────────────
              Fuera del bloque de arriba a propósito. Estaba dentro, y ese bloque
              exige haber reservado el nombre del espacio — así que quien no lo
              había reservado NO VEÍA esta opción y no había forma de saber que
              existía.
              Y no hace falta: un dominio propio apuntando a una página no usa
              el nombre del espacio para nada. Son dos direcciones distintas
              para lo mismo, no una encima de la otra. */}
          {estado.publico && <DominioPropio paginaId={paginaId} />}

          {fallo && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-bold">{fallo}</p>
            </div>
          )}

          {/* ── EXPORTAR ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">…o llévatela en un archivo</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {[
                { id: 'pdf', label: 'PDF', icon: FileType, accion: () => window.open(`/api/documentos/${paginaId}/pdf`, '_blank') },
                { id: 'png', label: 'Imagen (PNG)', icon: ImageIcon, accion: () => window.dispatchEvent(new CustomEvent('documento:png')) },
                { id: 'docx', label: 'Word', icon: FileText, accion: () => window.open(`/api/documentos/${paginaId}/docx`, '_blank') },
                { id: 'md', label: 'Markdown', icon: FileText, accion: () => window.dispatchEvent(new CustomEvent('documento:markdown')) },
              ].map(o => (
                <button key={o.id} onClick={o.accion}
                  className="flex items-center gap-2 h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
                  <o.icon className="w-4 h-4 text-slate-400" /> {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
