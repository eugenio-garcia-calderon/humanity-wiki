import { useEffect, useRef, useState } from 'react';
import {
  X, Globe, Lock, Copy, Check, Loader2, AlertTriangle, ExternalLink,
  Download, FileText, Image as ImageIcon, FileType, Search,
} from 'lucide-react';
import { cn } from '../../utils/cn';

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
  const [indexable, setIndexable] = useState(true);
  const [compruebaHandle, setCompruebaHandle] = useState<{ libre: boolean; motivo: string | null } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const temporizador = useRef<any>(null);

  // Quién soy y cómo se llama mi espacio. Sin nombre no se puede publicar: la
  // dirección entera es «<nombre>/<página>», así que falta la mitad.
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.user?.handle) { setEstado(e => ({ ...e, handle: j.user.handle })); setHandle(j.user.handle); } })
      .catch(() => {});
  }, []);

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
      body: JSON.stringify({ slug: slug || undefined, publico: true, indexable }),
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

              {/* La dirección corta que llegará con el subdominio. Se enseña
                  apagada y dicho lo que falta, en vez de esconderla: así se ve
                  hacia dónde va esto y por qué el nombre del espacio importa. */}
              <div className="p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-300">Tu dirección corta</p>
                <p className="mt-0.5 font-mono text-xs text-slate-400 break-all">{urlSubdominio}</p>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  Todavía no funciona: falta configurar el dominio. El nombre ya es tuyo,
                  así que cuando se active, este enlace apunta a esta misma página.
                </p>
              </div>

              <label className="flex items-start gap-2 pt-1">
                <input type="checkbox" checked={indexable} className="mt-0.5"
                  onChange={async e => {
                    setIndexable(e.target.checked);
                    await fetch(`/api/publicar/paginas/${paginaId}`, {
                      method: 'PUT', credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ publico: true, indexable: e.target.checked }),
                    });
                  }} />
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  <b>Que aparezca en Google.</b> Publicar y ser encontrable son cosas distintas:
                  puedes mandar el enlace a tres personas sin que la página acabe en un buscador.
                </span>
              </label>
            </div>
          )}

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
