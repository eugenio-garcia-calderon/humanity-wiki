# Everything is a page — the big restructure (2026-08-25, app/UX agent)

Eugenio, verbatim intent: «Me he dado cuenta de que en realidad todo son
páginas. Todo lo que construimos lo vamos a llamar a partir de ahora páginas».
A page has a name, description, cover, images, maps; it can live in a folder
(and a folder can be called a project, but it is a page container). Left rail =
**Explorar** (explore pages), right rail = **Organizar** (organise your pages).

## What he asked for, split into phases

| # | What | State |
|---|---|---|
| 1 | Renames (Buscar páginas, Explorar páginas, Mis páginas, Organizar) + green «+» create-page button in the bottom bar, context-aware | **SHIPPED this phase** |
| 2 | The bottom toolbar becomes the EDITOR toolbar: only inside a page editor it shows the add-tools (image, map, table…), recycling `HojaCrear`'s pictures | pending — touches `Documento.tsx` + `AddWindowPanel` |
| 3 | Public / private pages; **semiprivate**: named people with read-only or edit access | partly exists: `publico` flag and `colaboradores` are inherited by windows (`documentos.ts` line ~20). UI for per-person roles missing |
| 4 | Public pages under humanity.wiki AND optionally a custom domain, both URLs one page | user subdomains exist (`subdominioDeUsuario`, `ESPACIO_DE`). Custom outside domains need DNS+Caddy work on the server — **not a frontend task, needs Eugenio for DNS** |
| 5 | Every element commentable when public | no per-element comment table found — server work |
| 6 | On publish, the page indexes into a branch of the knowledge tree (temas); private pages index nowhere | `temas.ts` exists with branch tree; the publish-hook is missing |

## Decisions taken in phase 1

- The IA pill went **violet** so the green belongs to «Crear página» alone: two
  green pills would compete and he asked the create button to be THE green one.
- «Explorar páginas» and «Mis páginas» only rename the labels; routes untouched.
- The create button carries the navigation context (`?proyecto=`), so creating
  from inside a project files the page there.

## Phase 2 sketch (next)

`Documento.tsx` is the editor. Plan: hide the global RailInferior when the
route matches `/paginas/:id` (the editor publishes a flag or Layout checks the
route), and render an editor-toolbar with the same look, whose buttons open the
recycled `HojaCrear` grid (pictures from `bienvenida/previas.tsx`) filtered to
insertable things (imagen, mapa, tabla, esquema, vídeo…) that call the existing
`AddWindowPanel` machinery.
