# 05_KNOWLEDGE_GRAPH.md

# Grafo de Conocimiento de Humanity.wiki

## Objetivo

Definir el modelo semántico que conecta todas las entidades de la plataforma.

---

# Principio fundamental

Nada existe de forma aislada.

Toda entidad debe estar relacionada con una o más entidades del sistema.

---

# Entidades del grafo

- Territorio
- Objetivo
- Indicador
- Marcador
- Persona
- Organización
- Publicación
- Reto
- Solución
- Necesidad
- Producto
- Demanda
- Iniciativa
- Caso de éxito

---

# Relaciones principales

Territorio
→ contiene → Objetivos

Objetivo
→ contiene → Indicadores

Indicador
→ contiene → Marcadores

Marcador
→ mide → Indicadores

Reto
→ pertenece a → Territorio

Reto
→ afecta a → Indicador

Reto
→ tiene → Soluciones

Solución
→ requiere → Necesidades

Necesidad
→ puede resolverse con → Productos

Producto
→ satisface → Demandas

Producto
→ participa en → Iniciativas

Iniciativa
→ aplica → Solución

Iniciativa
→ mejora → Indicadores

Iniciativa
→ genera → Caso de éxito

Publicación
→ referencia → cualquier entidad

Persona
→ crea → cualquier entidad

Organización
→ crea → cualquier entidad

---

# Reglas

- Todas las entidades tienen UUID.
- Todas las relaciones son explícitas.
- Una entidad puede tener múltiples relaciones.
- No se duplican entidades existentes.
- Las publicaciones enriquecen el grafo, no almacenan conocimiento aislado.

---

# Descubrimiento

Desde cualquier entidad debe poder navegarse hacia todas las relacionadas.

Ejemplo:

Municipio
→ Retos
→ Soluciones
→ Productos
→ Demandas
→ Iniciativas
→ Casos de éxito
→ Personas
→ Organizaciones
→ Publicaciones

---

# Inteligencia Artificial

La IA utilizará el grafo para:

- Recomendar soluciones.
- Detectar duplicados.
- Encontrar expertos.
- Relacionar publicaciones.
- Descubrir productos relevantes.
- Identificar iniciativas similares.

---

# Objetivo final

Convertir el conocimiento distribuido en una red navegable, reutilizable y evolutiva.
