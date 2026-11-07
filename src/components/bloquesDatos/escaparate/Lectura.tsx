import { useEffect, useState } from 'react';
import type { PropsLectura } from '../tipos';
import { useRaizEscaparate } from '../../sitio/escaparate';
import SeccionEscaparateVista from '../../sitio/SeccionesEscaparate';
import { seccionDe, SECCIONES_ESCAPARATE, type SeccionEscaparate } from '../../sitio/reglasPaginasEscaparate';

// Una sección del escaparate al leerla (ver `definicion.tsx`). Sus datos viajan con la página
// (`datos.precargado`, los pone el servidor): se pinta a la primera, igual que en el HTML. Si no
// están (en el editor), se piden a `GET /api/sitio/escaparate/:raiz/:seccion`, una vez por visita.

const pedidos = new Map<string, Promise<any | null>>();
function pedir(raiz: string, seccion: SeccionEscaparate): Promise<any | null> {
  const clave = `${raiz}:${seccion}`;
  let p = pedidos.get(clave);
  if (!p) {
    p = fetch(`/api/sitio/escaparate/${encodeURIComponent(raiz)}/${seccion}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null);
    pedidos.set(clave, p);
    p.then(d => { if (!d) pedidos.delete(clave); });
  }
  return p;
}

const esRaiz = (v: unknown): v is string => typeof v === 'string' && /^[A-Z0-9_]{6,40}$/.test(v);

/** Los datos de la sección: los que trae la página o, si no, los del servidor. `undefined` mientras llegan. */
function useDatosSeccion(raiz: string | null, seccion: SeccionEscaparate | null, precargado: unknown) {
  const listos = precargado && typeof precargado === 'object' ? precargado : seccion === 'formas' ? {} : undefined;
  const [pedidos_, setPedidos] = useState<any | null | undefined>(undefined);
  useEffect(() => {
    if (listos || !raiz || !seccion) return;
    let vivo = true;
    pedir(raiz, seccion).then(d => { if (vivo) setPedidos(d); });
    return () => { vivo = false; };
  }, [raiz, seccion, listos]);
  return listos ?? (raiz && seccion ? pedidos_ : null);
}

export default function Lectura({ datos }: PropsLectura) {
  const seccion = seccionDe({ tipo: 'escaparate', datos });
  const delSitio = useRaizEscaparate();
  const raiz = delSitio || (esRaiz(datos.raiz) ? datos.raiz : null);
  const d = useDatosSeccion(raiz, seccion, datos.precargado);
  if (!seccion) return null;
  // Mientras llegan: su sitio, para que lo de debajo no salte.
  if (d === undefined) return <div aria-busy="true" aria-label={`Cargando: ${SECCIONES_ESCAPARATE[seccion]}`} className="h-56 animate-pulse rounded-3xl bg-slate-50" />;
  if (!d) return null;
  return <SeccionEscaparateVista seccion={seccion} datos={datos} d={d} raiz={raiz} />;
}
