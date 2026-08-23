-- ============================================================================
-- EL CABLE CRUZA PROCESOS (2026-08-23)
-- ============================================================================
-- Hoy la plataforma corre en UN proceso y todo esto sobra. Mañana correrá en
-- ocho —siete núcleos de esa máquina están pagados y parados— y sin esto se
-- rompe de la peor forma posible: **en silencio**.
--
-- El registro de quién está conectado vive en la memoria del proceso
-- (`porUsuario` en `telecomHub.ts`). Con ocho procesos, cada uno conoce solo
-- sus propios cables. Ana tiene el suyo abierto en el proceso 3; Bea le manda
-- un mensaje y su petición cae en el 6; el 6 no ha oído hablar de Ana. No hay
-- error, no hay línea en el registro: el mensaje simplemente no llega, el
-- teléfono no suena. **Siete de cada ocho veces.**
--
-- ── DOS PROBLEMAS DISTINTOS, Y SOLO UNO SE ARREGLA CON AVISOS ───────────────
-- Lo primero que se piensa es `LISTEN`/`NOTIFY`, y es correcto para ENTREGAR:
-- el proceso que recibe la petición grita «esto es para Ana» y el que tiene su
-- cable se lo entrega. Pero no contesta la otra pregunta, que se hace ANTES:
--
--   «¿Está Ana conectada?»
--
-- Esa se pregunta de forma síncrona y se contesta antes de decidir si una
-- llamada llega a sonar. Un aviso es asíncrono: se manda y no se sabe si había
-- alguien escuchando. Por eso hace falta un sitio donde mirar, y es esta tabla.
--
-- ── POR QUÉ UNA TABLA Y NO GOSSIP ENTRE PROCESOS ────────────────────────────
-- Se puede hacer que los procesos se cuenten entre ellos quién tiene cada uno,
-- y se descartó: un proceso que arranca no sabría nada del mundo hasta que los
-- demás hablaran, y durante esos segundos diría «Ana no está» de una persona
-- que sí está. Con una tabla, un proceso recién nacido hace una consulta y ya
-- sabe. Postgres ya está ahí y esto son unas pocas filas.
--
-- ── LA FILA HUÉRFANA, QUE ES EL FALLO OBVIO DE ESTE DISEÑO ──────────────────
-- Si un proceso se muere de golpe, sus filas se quedan. A partir de ahí la
-- plataforma creería que hay gente conectada por un cable que ya no existe:
-- las llamadas «sonarían» en la nada.
--
-- Por eso `visto_at` y por eso NO se lee nunca esta tabla entera: se lee
-- siempre filtrando por las vistas hace poco. Cada proceso refresca las suyas
-- con el mismo latido que ya manda a los navegadores cada 25 segundos, así que
-- una fila que lleva más de 70 sin refrescarse es de un proceso muerto y no
-- cuenta. El barrido que las borra es solo limpieza; la corrección la da el
-- filtro, no el barrido.
CREATE TABLE IF NOT EXISTS conexiones_vivas (
  -- El aparato, no la persona: el móvil, el portátil y la pestaña del trabajo
  -- son tres filas y pueden estar en tres procesos distintos.
  dispositivo text PRIMARY KEY,
  user_id     text NOT NULL,
  -- Quién tiene el cable. Es a este proceso al que hay que gritarle.
  proceso     text NOT NULL,
  abierta_at  timestamptz NOT NULL DEFAULT now(),
  visto_at    timestamptz NOT NULL DEFAULT now()
);

-- La pregunta de cada mensaje y de cada llamada: «¿está esta persona, y dónde?».
-- Con `visto_at` dentro del índice, la consulta con su filtro no toca la tabla.
CREATE INDEX IF NOT EXISTS conexiones_vivas_persona_idx
  ON conexiones_vivas (user_id, visto_at DESC);

-- Para el latido y para la limpieza de un proceso al arrancar: lo primero que
-- hace un proceso es borrar lo que dejó su encarnación anterior.
CREATE INDEX IF NOT EXISTS conexiones_vivas_proceso_idx
  ON conexiones_vivas (proceso);

-- ── LOS EVENTOS QUE NO CABEN EN UN AVISO ────────────────────────────────────
-- El payload de `NOTIFY` tiene un tope duro de 8000 bytes, y pasarse no
-- devuelve un aviso truncado: revienta. Casi todo cabe de sobra —un mensaje de
-- chat, un «está escribiendo»— pero **una oferta de WebRTC con candidatas de
-- TURN se acerca peligrosamente**, y justo esa es la que no puede perderse: sin
-- ella no hay llamada.
--
-- Los grandes se dejan aquí y por el aviso viaja solo el número de fila. Es un
-- viaje más a la base de datos, y por eso NO se usa para todo: el camino
-- rápido es el aviso directo, y esto es la salida de emergencia.
--
-- Se borra al consumirlo. `creado_at` es para barrer lo que nadie recogió
-- porque el proceso destinatario murió entre el aviso y la lectura.
CREATE TABLE IF NOT EXISTS eventos_grandes (
  id         bigserial PRIMARY KEY,
  para       text NOT NULL,
  evento     jsonb NOT NULL,
  creado_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_grandes_viejos_idx ON eventos_grandes (creado_at);
