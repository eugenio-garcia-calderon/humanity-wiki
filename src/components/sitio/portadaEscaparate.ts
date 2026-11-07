import { useEffect, useState } from 'react';

// ============================================================================
// LOS DATOS DE LA PORTADA DEL ESCAPARATE (2026-11-07, luzhumanidad.com)
// ============================================================================
// Eugenio pidió subir el listón de la portada («con alta calidad, no quiero nada
// cutre»): una presentación con cifras, el mapa «Dónde trabajamos» y «Nuestra
// historia». Las tres leen lo mismo, una sola vez: `/api/sitio/portada/:raiz`
// (`seoEscaparate.ts`, el modelo del escaparate con dos minutos de memoria). Ninguna
// cifra está escrita a mano: los proyectos visibles, sus años, sus lugares y la
// cuenta de noticias salen de las tablas y de las páginas de cada proyecto.

/** Dónde está un proyecto (`config.lugar` de su página). */
export type LugarPortada = { nombre: string; region: string | null; pais: string; lat: number; lon: number };
export type ProyectoPortada = {
  pagina: string; titulo: string; url: string; descripcion: string; portada: string | null;
  ano: string | null; estado: string | null; color: string | null; areas: string[]; lugar: LugarPortada | null;
};
/** Un hito de «Nuestra historia» (`config.sitio.historia` de la raíz), siempre con su fuente. */
export type HitoPortada = { ano: string; texto: string; fuente: { nombre: string; url: string }; proyecto: string | null };
export type DatosPortada = { proyectos: ProyectoPortada[]; noticias: number; medios: number; historia: HitoPortada[] };

const pedidos = new Map<string, Promise<DatosPortada | null>>();
/** Una sola petición por raíz y visita, aunque la pidan tres secciones a la vez. */
export function pedirPortada(raizId: string): Promise<DatosPortada | null> {
  let p = pedidos.get(raizId);
  if (!p) {
    p = fetch(`/api/sitio/portada/${encodeURIComponent(raizId)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j && Array.isArray(j.proyectos) ? j as DatosPortada : null))
      .catch(() => null);
    pedidos.set(raizId, p);
    // Si falla, la próxima vez se vuelve a intentar.
    p.then(d => { if (!d) pedidos.delete(raizId); });
  }
  return p;
}

/** `undefined` mientras llega (o mientras no se pide: `raizId` vacío); `null` si no hay datos. */
export function useDatosPortada(raizId: string | null): DatosPortada | null | undefined {
  const [datos, setDatos] = useState<DatosPortada | null | undefined>(undefined);
  useEffect(() => {
    if (!raizId) return;
    let vivo = true;
    pedirPortada(raizId).then(d => { if (vivo) setDatos(d); });
    return () => { vivo = false; };
  }, [raizId]);
  return datos;
}

/** Los años de los proyectos, del primero al último. */
export function anosDe(proyectos: ProyectoPortada[]): number[] {
  return [...new Set(proyectos.map(p => Number(p.ano)).filter(n => n > 1900 && n < 2200))].sort((a, b) => a - b);
}

/** Los países con algún proyecto en el mapa, de más a menos proyectos. */
export function paisesDe(proyectos: ProyectoPortada[]): Array<{ pais: string; n: number }> {
  const n = new Map<string, number>();
  for (const p of proyectos) if (p.lugar) n.set(p.lugar.pais, (n.get(p.lugar.pais) || 0) + 1);
  return [...n.entries()].map(([pais, k]) => ({ pais, n: k })).sort((a, b) => b.n - a.n || a.pais.localeCompare(b.pais, 'es'));
}

/** «España, Brasil y Kenia». */
export function enumerar(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

/** Solo imágenes servidas desde casa: la portada no pide nada a terceros (el servidor ya las elige así). */
export const fotoPropia = (u: string | null | undefined): string | null => (u && /^\/uploads\//.test(u) ? u : null);

/** Un número como se escribe en España («13.500»; los de cuatro cifras, sin punto). */
export const numero = (n: number) => n.toLocaleString('es-ES');
