# 03_ARCHITECTURE.md

# Arquitectura de Humanity.wiki

## Objetivo

Definir la arquitectura lógica y técnica de la plataforma.

---

# Arquitectura por capas

## 1. Presentación

Frontend web responsive.

Módulos:
- Mapa
- Panel lateral
- Panel central
- Perfil
- Mercado
- Publicaciones
- Administración

---

## 2. Lógica de negocio

Servicios independientes:

- Usuarios
- Territorios
- Objetivos
- Indicadores
- Marcadores
- Retos
- Soluciones
- Productos
- Demandas
- Publicaciones
- Iniciativas
- Casos de éxito
- Stripe
- Notificaciones
- Búsqueda

---

## 3. Grafo de conocimiento

Motor encargado de mantener todas las relaciones entre entidades.

Responsabilidades:

- Crear relaciones
- Evitar duplicados
- Resolver referencias
- Recomendaciones
- Descubrimiento de conocimiento

---

## 4. Persistencia

Base de datos relacional.

Principios:

- UUID permanente
- Integridad referencial
- Versionado
- Historial
- Auditoría

---

## Arquitectura funcional

Toda interacción sigue el flujo:

Territorio

↓

Objetivo

↓

Indicador

↓

Marcador

↓

Reto

↓

Solución

↓

Necesidad

↓

Producto

↓

Transacción

↓

Iniciativa

↓

Resultados

↓

Caso de éxito

---

## Servicios externos

- Stripe Connect
- Autenticación
- Almacenamiento multimedia
- Correo electrónico
- IA

---

## Inteligencia Artificial

La IA podrá:

- Resumir contenido
- Detectar duplicados
- Relacionar entidades
- Recomendar soluciones
- Proponer indicadores
- Asistir en búsquedas

Nunca modificará contenido sin intervención humana autorizada.

---

## Escalabilidad

La arquitectura debe permitir:

- Millones de usuarios
- Millones de publicaciones
- Millones de relaciones
- Millones de productos
- Millones de iniciativas

---

## Modularidad

Cada módulo deberá ser independiente.

Los cambios en un módulo no deberán afectar al resto del sistema.

---

## API

Toda funcionalidad deberá exponerse mediante una API reutilizable.

La interfaz nunca accederá directamente a la base de datos.

---

## Seguridad

- Autenticación
- Autorización por roles
- Auditoría
- Historial permanente
- Protección frente a modificaciones no autorizadas

---

## Principio final

La arquitectura debe favorecer la evolución continua del conocimiento sin comprometer la estabilidad del sistema.
