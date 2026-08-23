# Quién concede el turno de despliegue

> **2026-08-23, noche — EL DASHBOARD YA NO EXISTE.** Comprobado en `ListAgents`:
> ni la sesión `94086` ni la anterior están vivas. Lo que sigue estaba escrito
> dando por hecho que sí, y **mandaba esperar un permiso que nadie podía dar**.
> Corregido por prog3 (APP/UX) al encontrarse a dos agentes bloqueados por ello.

## El turno es un HECHO, no un permiso

Este mismo fichero dice, más abajo, qué es un turno: **«que nadie más está
desplegando ahora mismo»**. Eso no es una autorización que alguien conceda: es un
dato, y se consulta.

```bash
gh run list --limit 1 --workflow "Deploy humanity.wiki"
```

| Lo que sale | Qué haces |
|---|---|
| `in_progress` | **Espera.** `gh run watch <id> --exit-status` y fusiona al acabar |
| `completed` | **Vía libre.** Fusiona, y vuelve a mirar justo antes: comprobar un minuto antes es comprobar otra cosa |

Y **avisa después**, a quien tenga algo listo. Eso es lo único que el
coordinador hacía que un comando no hace: saber quién está esperando.

## Por qué había un coordinador, y qué se pierde sin él

No era por el dato —el dato siempre estuvo en `gh run list`—, era por las
**colisiones**: dos agentes miran a la vez, los dos ven «libre», los dos
fusionan, y el segundo despliegue tira el suelo de debajo del primero mientras
lo verifica.

Eso **sigue pudiendo pasar** y ahora no lo evita nadie. Lo que lo reduce, sin
coordinador:

1. **Mira justo antes de fusionar**, no cuando terminas de programar.
2. **Di en voz alta que vas a fusionar** antes de hacerlo, y **di que has
   terminado** después. Un mensaje de dos líneas a quien sepas que está
   esperando.
3. **Verifica contra producción después de tu despliegue**, no antes. Si alguien
   se te coló, lo ves ahí.

## Los mensajes entre agentes

Eugenio pidió el 2026-08-23 que **no os escribierais directamente**: todo pasaba
por el Dashboard, que contestaba lo sencillo y derivaba lo complejo. La razón era
buena y sigue siéndolo: cada mensaje parte la tarea de otro en dos.

**Sin Dashboard esa norma no se puede cumplir**, porque no hay a quién
escribirle. Mientras no exista otro:

- **Escribíos directamente, y decid quién sois en la primera línea.** Los nombres
  de sesión (`claude-ad`, `claude-60`…) no dicen quién es quién, y esta noche dos
  agentes se han confundido de destinatario por eso.
- **Antes de preguntar, mira si es un comando.** «¿Quién tiene este fichero?» es
  `node scripts/equipo.mjs quien`. Preguntárselo a otro le cuesta a él una
  interrupción y a ti una espera. Hacer de relé de un `grep` es reconstruir el
  cuello de botella que acaba de morir.
- **Comprueba lo que te cuentan antes de repetirlo.** Esta noche circuló como
  pendiente un fallo del chat que llevaba horas arreglado y desplegado, y en otro
  caso dos agentes afirmaron por separado de quién era un contenido —los dos con
  seguridad, los dos equivocados— y sobre eso se dio una instrucción de tocar
  producción. Lo caro no fue equivocarse: fue repetirlo sin mirar.

**Levantar otro Dashboard es decisión de Eugenio**, no nuestra. Esto es lo que
hacemos mientras tanto.

## El script identifica por CARPETA, no por persona

Encontrado el 2026-08-23: `equipo.mjs` etiqueta las reservas con el nombre de la
**carpeta de trabajo**. Un agente que se muda de worktree cambia de nombre, y
quien ocupe su carpeta después reserva con el suyo.

Consecuencia concreta de esa noche: un agente esperaba a «prog8» a que soltara
dos ficheros, y el que él creía prog8 se había mudado a `prog8-turn` — las
reservas eran de **quien fuera que estuviera en `.claude/worktrees/prog8`**, otra
persona.

**Un nombre en `quien` es una carpeta, no un interlocutor.** Si vas a esperar a
alguien, pregunta a la carpeta.

## Qué es y qué no es un turno

| | |
|---|---|
| Lo que dice | Que **nadie más está desplegando** ahora mismo |
| Lo que **no** dice | Que puedas desplegar. Si Eugenio ha parado tu rama, el Dashboard no te la levanta |
| Se pide para | **Cualquier** PR a `main`, aunque sea una línea de changelog. `main` despliega |
| Al pedirlo se dice | Si tu PR es **aditiva** o **cambia lo que ve todo el mundo mañana** — y en el segundo caso, con la frase de Eugenio que lo pidió |
| Al terminar | Se avisa de que el run cerró, para que entre el siguiente |
