# 02_DOMAIN_MODEL.md

# Modelo de Dominio de Red Humana

## Propósito

Este documento define las entidades principales del sistema y las relaciones entre ellas.

## Entidades principales

### Territorio
Jerarquía:
- Planeta
- Continente
- País
- Región / Comunidad Autónoma
- Provincia
- Municipio
- Barrio
- Comunidad

Relaciones:
- Contiene objetivos
- Contiene indicadores
- Contiene retos
- Contiene soluciones
- Contiene productos
- Contiene demandas
- Contiene iniciativas
- Contiene casos de éxito
- Contiene publicaciones

---

### Objetivo

Agrupa un ámbito de desarrollo.

Ejemplos:
- Agua
- Alimentación
- Vivienda
- Salud
- Convivencia
- Ecosistemas
- Educación
- Movilidad
- Energía
- Tecnología
- Empleo

Relaciones:
- Tiene indicadores

---

### Indicador

Mide el estado de un objetivo.

Relaciones:
- Pertenece a un objetivo
- Tiene marcadores

---

### Marcador

Variable cuantificable de un indicador.

Relaciones:
- Pertenece a un indicador

---

### Persona

Relaciones:
- Crea publicaciones
- Crea retos
- Crea soluciones
- Crea productos
- Crea demandas
- Participa en iniciativas

---

### Organización

Puede actuar igual que una persona.

---

### Publicación

Puede asociarse a:
- Territorios
- Objetivos
- Indicadores
- Marcadores
- Retos
- Soluciones
- Productos
- Demandas
- Iniciativas

---

### Reto

Problema identificado.

Relaciones:
- Tiene soluciones
- Tiene publicaciones
- Tiene demandas
- Tiene productos
- Tiene iniciativas

---

### Solución

Conocimiento reutilizable.

Puede utilizarse en múltiples iniciativas.

---

### Necesidad

Recurso requerido para resolver un reto.

---

### Producto

Oferta comercial asociada al conocimiento.

Tipos:
- Físico
- Digital

Modalidad:
- Compra única
- Suscripción

---

### Demanda

Necesidad publicada por un usuario u organización.

---

### Transacción

Registro económico.

---

### Iniciativa

Aplicación real de una solución.

Incluye:
- Participantes
- Productos
- Demandas atendidas
- Resultados
- Indicadores antes/después

---

### Caso de Éxito

Iniciativa validada con impacto demostrado.

---

## Flujo principal

Problema
→ Conocimiento
→ Solución
→ Necesidad
→ Producto
→ Transacción
→ Iniciativa
→ Resultados
→ Caso de éxito

## Reglas

- Toda entidad tiene UUID.
- Toda entidad tiene autor.
- Toda entidad tiene historial.
- Toda entidad pertenece al menos a un territorio.
- Ninguna entidad permanece aislada del grafo de conocimiento.
