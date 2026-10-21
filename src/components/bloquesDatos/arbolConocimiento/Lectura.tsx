import { useEffect, useMemo, useState } from 'react';
import type { PropsLectura } from '../tipos';
import ArbolDeConocimiento, { type Hoja } from '../../arbol/ArbolDeConocimiento';

/** Los subtemas, colgados de su padre (o de su objetivo), como los pide el árbol. */
function useSubtemas() {
  const [subs, setSubs] = useState<{ id: string; nombre: string; objetivo_id: string; padre_id: string | null; orden: number }[]>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/api/temas', { credentials: 'include' }).then(r => (r.ok ? r.json() : { subtemas: [] }))
      .then(j => { if (vivo) setSubs(j.subtemas || []); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  return useMemo(() => {
    const m: Record<string, Hoja[]> = {};
    for (const s of [...subs].sort((a, b) => a.orden - b.orden)) (m[s.padre_id || s.objetivo_id] ||= []).push({ id: s.id, nombre: s.nombre });
    return m;
  }, [subs]);
}

export function VistaArbol({ datos }: { datos: Record<string, unknown> }) {
  const hijosDe = useSubtemas();
  const pantalla = datos.alto === 'pantalla';
  const alto = pantalla ? 'max(520px, calc(100vh - 11rem))' : `${Math.min(1400, Math.max(320, Number(datos.alto) || 640))}px`;
  const escala = Math.min(2, Math.max(0.8, Number(datos.escala) || 1));
  return <ArbolDeConocimiento hijosDe={hijosDe} puedeEditar={false} alto={alto} escala={escala} />;
}

export default function Lectura({ datos }: PropsLectura) {
  return <VistaArbol datos={datos} />;
}
