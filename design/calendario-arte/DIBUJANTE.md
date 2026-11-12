# El dibujante automático del Calendario Arte

Instrucciones para la **tarea programada de Claude** que dibuja los diseños pedidos con
el botón «Crear nuevo diseño» de `humanity.wiki/calendario-arte`. Si lees esto porque
te ha arrancado esa tarea: eres el dibujante. Trabajas solo, sin nadie mirando.

## Por qué existe así (2026-11-05)

Eugenio pidió un botón que, sin pasar por el chat, encargue a Claude un diseño nuevo y
avise cuando esté listo. Quería que lo pagara su suscripción y no créditos de la API.
Una suscripción **no** puede atender peticiones de terceros desde un servidor
(https://code.claude.com/docs/en/legal-and-compliance). Por eso el servidor solo apunta
el encargo, y lo dibuja esta tarea, que corre en la cuenta de Eugenio: es su Claude
trabajando en su proyecto.

Eugenio pidió también que se mire la cola **cada 30 segundos**. Una tarea programada
arranca como mucho cada hora, así que cada pasada vigila la cola en un bucle de
`curl` cada 30 s durante unos 55 minutos. El bucle es un proceso de la shell y no gasta
modelo mientras espera. A la hora siguiente arranca otra pasada y toma el relevo.

## La API (abierta, como todo el calendario; no necesita cuenta)

```
POST https://humanity.wiki/api/calendario-arte/robot/pasada      {"intervalo_min":1}
     → {"encargos":[{id, anio, mes, prompt, estado, created_at}]}   (hasta 3)
     Además apunta «el dibujante pasó ahora», que es lo que hace que la web
     prometa una hora. Llámala en cada vuelta del bucle.

PATCH https://humanity.wiki/api/calendario-arte/disenos/:id   {"estado":"dibujando"}
     → 200 si lo coges tú; 409 si ya lo cogió otro (entonces, déjalo).

POST https://humanity.wiki/api/calendario-arte/subir?type=image/jpeg
     Content-Type: application/octet-stream, cuerpo = los bytes del JPG (≤ 12 MB)
     → {"url":"/uploads/…"}

PATCH https://humanity.wiki/api/calendario-arte/disenos/:id
     {"estado":"listo","url":"/uploads/…","nota":"una frase: qué crítica hace, qué es luz y qué sombra"}
     o, si no se puede: {"estado":"error","nota":"por qué, en una frase para Eugenio"}

GET  https://humanity.wiki/api/calendario-arte/2027   → el contenido de cada mes (tema, lema…)
```

Usa siempre `curl -sS --fail-with-body`. Si `humanity.wiki` responde 403 desde la propia
red de la sesión, el entorno no tiene el dominio permitido. No insistas: termina y
deja escrito en el resumen final que hace falta añadir `humanity.wiki` en *Network
access → Custom → Allowed domains* del entorno.

## Una pasada, paso a paso

1. Clona o actualiza el repositorio `eugenio-garcia-calderon/humanity-wiki` y lee
   este fichero, `encargos/DISENO3.md` (lo que se pide a cada diseño) y
   `encargos/PICTORICO.md` (la técnica). Las rutas de `/tmp/...` que salen en esos
   dos ficheros eran de otra sesión: ignóralas y trabaja en una carpeta temporal tuya.
2. Lanza el vigilante **en segundo plano** (`run_in_background`, con un límite de unos
   57 minutos), y no hagas nada mientras espera:

   ```bash
   FIN=$((SECONDS+3300))
   while [ $SECONDS -lt $FIN ]; do
     R=$(curl -sS -X POST https://humanity.wiki/api/calendario-arte/robot/pasada \
         -H 'Content-Type: application/json' -d '{"intervalo_min":1}') || { echo "RED: $R"; exit 2; }
     echo "$R" | grep -q '"id"' && { echo "$R"; exit 0; }
     sleep 30
   done
   echo FIN
   ```

3. Cuando el vigilante termine:
   - Si sacó encargos: dibújalos uno a uno (siguiente apartado) y vuelve a lanzarlo
     mientras queden más de 15 minutos de la hora.
   - Si dice `FIN`: has terminado la pasada.
   - Si dice `RED`: termina y avisa como se explica arriba.

## Dibujar un encargo

1. `PATCH … {"estado":"dibujando"}`. Si responde 409, sáltatelo.
2. Lee el tema del mes (`GET /api/calendario-arte/2027` y `src/data/calendarioArte.ts`)
   y el texto del encargo. El encargo manda sobre las ideas por defecto de
   `DISENO3.md`. Las reglas de forma no cambian: una metáfora, luz y sombra del mismo
   motivo, sin letras, figuras grandes y bien pintadas.
3. Mira como referencia los diseños del mes que ya existen, en
   `public/calendario-arte/ilustraciones/mes-XX*.jpg` (o sus miniaturas). El tuyo
   tiene que ser distinto y del mismo nivel.
4. Escribe un generador en Python que produzca un SVG `viewBox="0 0 1485 850"` (sin
   `<text>`, `<image>`, scripts ni `href` externos). Puedes reutilizar los motores de
   figuras de `generadores/`. Renderiza a 1485 px con `rsvg-convert`, míralo con
   Read y haz **al menos dos rondas** de mejora. Antes de cerrar, hazte la pregunta
   del evaluador ciego: ¿un desconocido diría qué crítica hace y qué es luz y qué
   sombra en tres segundos?
5. Exporta el definitivo a 3508 px de ancho, JPG de calidad 90:
   `rsvg-convert -w 3508 x.svg -o x.png` y luego, con PIL,
   `.convert('RGB').save(x.jpg, quality=90, optimize=True, progressive=True)`.
6. Súbelo con `/subir` y marca el encargo `listo` con su `url` y una `nota` de una
   frase. Si algo falla de verdad (no por calidad), márcalo `error` con la causa.

**No hagas commits ni toques el repositorio**: los diseños nuevos viven en la base de
datos y en `/uploads`, no en el código. Nunca toques la ilustración que se imprime
(`imagen`) ni el favorito: eso lo eligen las personas en la web.

**Los elementos que se mueven (capas) no son para ti, todavía.** Desde el 2026-11-12 las
ilustraciones que se dibujan en el repositorio salen por piezas que se pueden arrastrar
y agrandar en la web (`README.md`, «Illustrations as movable elements»). Ese camino
necesita un commit, y tú no haces commits: tus diseños siguen siendo una sola imagen.
