/**
 * EL CORAZÓN (2026-08-23, comercio F3): guardar un producto en favoritos.
 * Sin sesión, el botón lleva a entrar (no se guarda nada anónimo). Quien
 * lo usa puede pasarle `inicial` si ya sabe si es favorito (la lista del
 * mercado lo sabe de una sola llamada); si no, lo pregunta él.
 */
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

export default function BotonFavorito({ productoId, inicial, conSesion, onCambio, className }: {
  productoId: string; inicial?: boolean; conSesion: boolean; onCambio?: (activo: boolean) => void; className?: string;
}) {
  const [activo, setActivo] = useState<boolean>(!!inicial);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (inicial !== undefined) setActivo(!!inicial); }, [inicial, productoId]);
  useEffect(() => {
    if (inicial !== undefined || !conSesion) return;
    fetch('/api/publicar/favoritos', { credentials: 'include' }).then(r => r.json())
      .then(j => { if (Array.isArray(j?.ids)) setActivo(j.ids.includes(productoId)); }).catch(() => {});
  }, [productoId, conSesion, inicial]);
  const alternar = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!conSesion) { window.alert('Entra para guardar favoritos.'); return; }
    if (ocupado) return;
    setOcupado(true);
    const nuevo = !activo;
    setActivo(nuevo);
    try {
      const r = await fetch(`/api/publicar/favoritos/${encodeURIComponent(productoId)}`, { method: nuevo ? 'PUT' : 'DELETE', credentials: 'include' });
      if (!r.ok) setActivo(!nuevo); else onCambio?.(nuevo);
    } catch { setActivo(!nuevo); }
    finally { setOcupado(false); }
  };
  return (
    <button type="button" onClick={alternar} aria-pressed={activo} aria-label={activo ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      title={activo ? 'En tus favoritos' : 'Guardar en favoritos'}
      className={`w-9 h-9 grid place-items-center rounded-full border transition-colors ${activo ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200'} ${className || ''}`}>
      <Heart className={`w-4 h-4 ${activo ? 'fill-current' : ''}`} />
    </button>
  );
}
