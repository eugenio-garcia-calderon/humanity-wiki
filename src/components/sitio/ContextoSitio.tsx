import { createContext, useContext, type ReactNode } from 'react';

// ============================================================================
// EN QUÉ SITIO ESTAMOS (2026-09-30)
// ============================================================================
// Una página publicada se lee por tres puertas —dominio propio, subdominio y
// `humanity.wiki/@quien/pagina`— y cada una arma sus direcciones a su manera.
// Lo que va DENTRO de la página (la galería de una base de datos, el botón
// «Abrir» de una fila) no tiene por qué saber por cuál ha entrado el lector:
// pregunta aquí y recibe una dirección que no le saca del sitio.
//
// Sin sitio (dentro de la plataforma, en el editor) esto no existe y los
// enlaces van a `/paginas/:id`, que es donde se edita.

export type Sitio = {
  /** La dirección de una subpágina (un elemento de una base de datos). */
  enlacePagina: (id: string) => string;
  /** La dirección de una página publicada por su nombre corto. */
  enlaceSlug: (slug: string, handle: string) => string;
  /** El id de la página que abre el sitio, si se sabe: volver a ella es
   *  volver a la raíz, no a `/p/:id`. */
  raizId?: string | null;
};

const Contexto = createContext<Sitio | null>(null);

export function ProveedorSitio({ sitio, children }: { sitio: Sitio; children: ReactNode }) {
  return <Contexto.Provider value={sitio}>{children}</Contexto.Provider>;
}

export const useSitio = () => useContext(Contexto);

/** Dominio propio y subdominio: todo cuelga de la raíz del anfitrión. */
export const sitioConAnfitrion = (raizId?: string | null): Sitio => ({
  enlacePagina: id => (raizId && id === raizId ? '/' : `/p/${id}`),
  enlaceSlug: slug => `/${slug}`,
  raizId,
});

/** `humanity.wiki/@quien/…`: todo cuelga del arroba. */
export const sitioEnCasa = (handle: string): Sitio => ({
  enlacePagina: id => `/@${handle}/p/${id}`,
  enlaceSlug: (slug, h) => `/@${h || handle}/${slug}`,
});
