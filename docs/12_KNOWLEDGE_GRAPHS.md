# 12 — Grafos de Conocimiento

> Documento normativo de la Fase 11 (2026-08-05). Define la ontología de los
> Grafos de Conocimiento de **Conocimiento de la Humanidad** siguiendo los
> seis componentes canónicos de un grafo de conocimiento: entidades,
> identificadores, atributos, relaciones, ontología e inferencia.

## Qué es

Un **Grafo de Conocimiento** es un lienzo curado sobre un tema, compuesto de
**Ventanas de Conocimiento** conectadas por relaciones tipadas. No es una
respuesta improvisada de la IA: es un acto editorial con autor, valorable
(0-10), comentable, versionado y reproducible — la "memoria" de qué se
muestra y dónde vive en la base de datos. La IA es el enrutador (resolver
"Ceuta frontera amenaza" → abrir el grafo) y el proponente (crear borradores
marcados `is_ai_generated` cuando un tema no existe).

## Los seis componentes y dónde viven

| Componente | Implementación |
|---|---|
| **Entidades** | `knowledge_graphs` y `knowledge_windows` son entidades de primera clase del grafo general (`NODE_TYPES`): aparecen en la búsqueda global, se siguen, se valoran y se enlazan desde publicaciones. |
| **Identificadores** | id legible (`KG_…`, `KW_…`) + `uuid` permanente (99_CONSTITUTION.md). Un slug único por grafo para URLs estables. |
| **Atributos** | `config` jsonb por tipo de ventana + columnas de auditoría universales (autor, versión, historial en `entity_history`, archivado sin borrado). |
| **Relaciones** | `graph_edges` con vocabulario cerrado (abajo) y `graph_windows` (posición espacial por grafo — una ventana es reutilizable en varios grafos conservando su autoría). |
| **Ontología** | Vocabularios cerrados **aplicados por la base de datos** con CHECK (migración 0013): un tipo nuevo exige migración consciente, no un typo. |
| **Inferencia** | `graph_entity_links` ancla cada grafo a las entidades de la plataforma de las que trata; sobre ese anclaje se **derivan** los "grafos relacionados" (comparten entidades) sin enlace manual. |

## Ontología: vocabularios cerrados

### Tipos de ventana (`knowledge_windows.kind`)

`publicacion` · `imagen` · `video` · `wikipedia` · `enlace` · `mapa` ·
`grafica` · `ficha` · `cronologia` · `autores` · `documento` · `grafo` · `texto`

Cada tipo documenta su `config` en `src/server/knowledge.ts`. El tipo `grafo`
enlaza a otro grafo: así los grafos se componen entre sí (sub-temas, debates).

### Relaciones entre ventanas (`graph_edges.relation`)

| Relación | Semántica | Color |
|---|---|---|
| `contexto` | sitúa el tema | gris |
| `causa` | explica por qué ocurre | violeta |
| `dato` | evidencia cuantitativa | azul |
| `fuente` | documento/origen primario | gris oscuro |
| `apoya` | refuerza la tesis de la otra ventana | verde |
| `contradice` | disputa la tesis de la otra ventana | **rojo, animada** |
| `matiza` | precisa o limita | ámbar |

`apoya`/`contradice`/`matiza` son el corazón epistémico del sistema: permiten
mapear la controversia honestamente en vez de esconderla. Mostrar la
complejidad es la misión de la plataforma.

### Anclaje al grafo general (`graph_entity_links.relation`)

`trata_sobre` (el tema) · `afecta_a` (impacto) · `se_apoya_en` (datos usados).

## Reglas editoriales

1. **Toda ventana cita su fuente** (`source_name`/`source_url` o equivalente).
2. **Todo contenido generado por IA** se marca `is_ai_generated` y se muestra
   con la insignia "IA · pendiente de revisión" — misma política que los
   datos de países sembrados en la Fase 10.
3. **Personas reales**: la ventana `autores` referencia obra pública con
   enlace; **nunca** se crean cuentas de la red social a nombre de terceros
   sin su consentimiento.
4. **Temas sensibles**: presentar las posiciones enfrentadas con sus fuentes
   y conectarlas con `contradice`/`matiza`, no omitirlas.
5. **Permisos** (decisión del usuario, 2026-08-05): crear grafos/ventanas
   está abierto a cualquier usuario registrado (nivel 1); editar lo ajeno
   exige ser el creador o administrador; los borradores de la IA los publica
   un humano.

## Resolución desde el chat/buscador

1. **Fast-path sin IA**: `GET /api/graphs/resolve?q=…` puntúa la consulta
   contra `trigger_keywords` (normalizados sin tildes) y títulos. Con
   confianza suficiente, se abre el grafo directamente.
2. **IA como enrutador**: los grafos publicados van en el system prompt; el
   modelo puede emitir `OPEN_KNOWLEDGE_GRAPH {slug}`.
3. **IA como proponente**: si el tema no existe, la acción
   `CREATE_KNOWLEDGE_GRAPH` crea un borrador (grafo + hasta 12 ventanas)
   marcado `is_ai_generated`, pendiente de revisión humana.

## Grafo de referencia

`ceuta-frontera-amenazada` — "Ceuta: la frontera amenazada", creado por
Eugenio García-Calderón Huerta (`src/db/seed-grafo-ceuta.ts`): 10 ventanas de
9 tipos distintos, 12 aristas (incluida la `contradice` entre el análisis
jurídico y el informe del comité del Senado de EE. UU.), anclado a Ceuta
(T032), Convivencia (O005) y Gobernanza (O012). Sirve de patrón editorial
para todos los grafos futuros.
