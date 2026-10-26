import { useEffect, useRef, useState } from 'react';
import { Check, Facebook, Link2, Linkedin, Mail, MessageCircle, Share2, Twitter } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// COMPARTIR, COMO EN LAS REDES (2026-10-26, Eugenio)
// ============================================================================
// «Que el botón de compartir no ponga “Compartir”: un botón típico de compartir
// en redes sociales.» Un icono redondo; al pulsarlo, en el móvil la hoja de
// compartir del teléfono, y en el ordenador una lista con WhatsApp, X,
// LinkedIn, Facebook, correo y copiar el enlace.

export default function CompartirRedes({ titulo, className }: { titulo?: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const texto = titulo || (typeof document !== 'undefined' ? document.title : '');
  const pulsar = async () => {
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) { await navigator.share({ url, title: texto }); return; }
    } catch { return; }
    setAbierto(a => !a);
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin portapapeles */ }
  };
  const u = encodeURIComponent(url), t = encodeURIComponent(texto);
  const redes = [
    { nombre: 'WhatsApp', icono: MessageCircle, href: `https://wa.me/?text=${t}%20${u}` },
    { nombre: 'X', icono: Twitter, href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { nombre: 'LinkedIn', icono: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { nombre: 'Facebook', icono: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { nombre: 'Correo', icono: Mail, href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <div ref={caja} data-compartir className={cn('relative', className)}>
      <button type="button" onClick={pulsar} aria-haspopup="menu" aria-expanded={abierto} aria-label="Compartir" title="Compartir"
        className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950">
        <Share2 className="h-4 w-4" />
      </button>
      {abierto && (
        <div role="menu" className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {redes.map(r => (
            <a key={r.nombre} role="menuitem" href={r.href} target={r.nombre === 'Correo' ? undefined : '_blank'} rel="noopener noreferrer" data-externo onClick={() => setAbierto(false)}
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <r.icono className="h-4 w-4 text-slate-500" /> {r.nombre}
            </a>
          ))}
          <button type="button" role="menuitem" onClick={copiar} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4 text-slate-500" />} {copiado ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
        </div>
      )}
    </div>
  );
}
