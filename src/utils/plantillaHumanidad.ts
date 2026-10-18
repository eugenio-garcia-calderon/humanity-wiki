import { temasDeLaHumanidad } from '../components/bloquesDatos/menuTemas/temas';

// ============================================================================
// LA PLANTILLA «HUMANIDAD WIKI» (2026-10-18, Humanidad Wiki, fase 2)
// ============================================================================
// Eugenio: Humanidad Wiki no es código de Wiki Creator, es una página hecha
// CON Wiki Creator, que cualquiera puede construir o replicar. Esta función la
// monta con la sesión de quien la pide y con las mismas llamadas que usa el
// editor: una página por tema con su bloque «Contenido de un tema», y una
// principal con el «Menú de temas» apuntando a ellas. Las subpáginas cuelgan de
// la principal por sus bloques «Página», que es como Wiki Creator anida (y como
// heredan si se ven o no al publicar). Nace privada: publicarla es decisión de
// quien la crea.

const H = { 'Content-Type': 'application/json' };
let n = 0;
const idBloque = () => `B${Date.now().toString(36)}${(n++).toString(36)}`;

async function crearPagina(titulo: string): Promise<string> {
  const r = await fetch('/api/documentos', { method: 'POST', credentials: 'include', headers: H, body: JSON.stringify({ titulo }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id) throw new Error(j.error || 'No se pudo crear una página.');
  return j.id;
}

async function guardarPagina(id: string, titulo: string, config: Record<string, unknown>) {
  const r = await fetch(`/api/windows/${id}`, { method: 'PUT', credentials: 'include', headers: H, body: JSON.stringify({ title: titulo, config }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo guardar una página.');
}

/** Crea Humanidad Wiki en el perfil de quien la pide. Devuelve el id de la página principal. */
export async function crearHumanidadWiki(alAvanzar?: (hechas: number, total: number) => void): Promise<string> {
  const temas = temasDeLaHumanidad();
  const total = temas.length + 1;
  const subpaginas: Array<{ tema: (typeof temas)[number]; id: string }> = [];
  for (const tema of temas) {
    const id = await crearPagina(tema.nombre);
    await guardarPagina(id, tema.nombre, {
      subtitulo: `Lo que la humanidad sabe, hace y propone sobre ${tema.nombre.toLocaleLowerCase('es')}.`,
      bloques: [{ id: idBloque(), tipo: 'contenidoTema', datos: { tema: tema.id, porSeccion: 6 } }],
    });
    subpaginas.push({ tema, id });
    alAvanzar?.(subpaginas.length, total);
  }
  const principal = await crearPagina('Humanidad Wiki');
  await guardarPagina(principal, 'Humanidad Wiki', {
    subtitulo: 'El conocimiento, la sabiduría y las soluciones de toda la humanidad, ordenados por temas.',
    bloques: [
      { id: idBloque(), tipo: 'menuTemas', datos: { titulo: 'Temas', forma: 'rejilla', temas: subpaginas.map(({ tema, id }) => ({ ...tema, enlace: `/paginas/${id}` })) } },
      { id: idBloque(), tipo: 'titulo2', texto: 'Todos los temas' },
      ...subpaginas.map(({ tema, id }) => ({ id: idBloque(), tipo: 'subpagina', entityId: id, pubTitulo: tema.nombre })),
    ],
  });
  alAvanzar?.(total, total);
  return principal;
}
