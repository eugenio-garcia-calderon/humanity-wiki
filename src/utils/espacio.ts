import { useEffect, useState } from 'react';

// ============================================================================
// FAVORITOS Y RECIENTES, DEL LADO DEL CLIENTE (2026-10-06, carril «espacio»)
// ============================================================================
// Viven en el servidor (por persona: te siguen de un dispositivo a otro) y
// aquí solo hay una COPIA compartida por todos los que la pintan —el menú, la
// estrella de la página, la paleta—, para que marcar un favorito en un sitio
// se vea en los otros al instante sin que cada uno pregunte por su cuenta.

export type TipoEspacio = 'pagina' | 'carpeta' | 'bd';
export type Elemento = { tipo: TipoEspacio; id: string; titulo: string; icono: string | null; ruta: string };
type Estado = { favoritos: Elemento[]; recientes: Elemento[]; cargado: boolean };

let estado: Estado = { favoritos: [], recientes: [], cargado: false };
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());
const poner = (e: Estado) => { estado = e; avisar(); };

let pidiendo: Promise<void> | null = null;
export function recargarEspacio(): Promise<void> {
  if (pidiendo) return pidiendo;
  pidiendo = fetch('/api/espacio/inicio', { credentials: 'include' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => { if (j) poner({ favoritos: j.favoritos || [], recientes: j.recientes || [], cargado: true }); })
    .catch(() => { /* sin red: se queda lo que había */ })
    .finally(() => { pidiendo = null; });
  return pidiendo;
}

/** Los favoritos y recientes de ahora, y se repinta cuando cambian. */
export function useEspacio() {
  const [, repintar] = useState(0);
  useEffect(() => {
    const f = () => repintar(n => n + 1);
    oyentes.add(f);
    if (!estado.cargado) void recargarEspacio();
    return () => { oyentes.delete(f); };
  }, []);
  return estado;
}

export const esFavorito = (tipo: TipoEspacio, id: string) => estado.favoritos.some(f => f.tipo === tipo && f.id === id);

/** Marca o desmarca. Devuelve un texto de error si el servidor lo rechaza. */
export async function alternarFavorito(tipo: TipoEspacio, id: string, titulo = '', icono: string | null = null, ruta = ''): Promise<string | null> {
  const quiere = !esFavorito(tipo, id);
  // Optimista: la estrella cambia ya; si el servidor dice que no, se deshace.
  const antes = estado;
  poner({
    ...estado,
    favoritos: quiere ? [...estado.favoritos, { tipo, id, titulo, icono, ruta }] : estado.favoritos.filter(f => !(f.tipo === tipo && f.id === id)),
  });
  try {
    const r = await fetch('/api/espacio/favoritos', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, id, favorito: quiere }),
    });
    if (!r.ok) { poner(antes); return (await r.json().catch(() => ({}))).error || 'No se ha podido guardar el favorito.'; }
    void recargarEspacio();
    return null;
  } catch { poner(antes); return 'Sin conexión: no se ha podido guardar el favorito.'; }
}

/** Anota que se ha abierto algo. Sin esperar y sin quejarse: un reciente que se pierde no es grave. */
export function anotarReciente(tipo: TipoEspacio, dato: { id?: string; slug?: string }) {
  fetch('/api/espacio/recientes', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, ...dato }),
  }).then(r => (r.ok ? recargarEspacio() : undefined)).catch(() => {});
}
