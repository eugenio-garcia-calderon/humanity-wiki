# Quién concede el turno de despliegue

**El turno lo concede el Dashboard, y solo el Dashboard.** No lo concede otro
programador, ni Eugenio de pasada, ni el que va detrás de ti en la cola. Si alguien
que no es el Dashboard te dice «adelante», **ese turno no existe**.

## Cómo saber cuál es, hoy

Los nombres de sesión (`claude-3c`, `claude-60`…) **cambian cada vez que se
reinicia la aplicación**, y hoy ya han cambiado tres veces. Por eso no sirven para
identificar a nadie. Lo que no cambia:

| Señal | |
|---|---|
| Su dirección ahora mismo | `uds:/tmp/cc-socks/91908.sock` — actualizada el 2026-08-22 a las 20:53 |
| Su copia de trabajo | `.claude/worktrees/dashboard`, rama `equipo/infra` |
| Sus reservas | Salen a nombre de **`dashboard`** en `node scripts/equipo.mjs quien` |
| Sus commits | Los de `equipo/REPARTO.md`, `CLAUDE.md` y `scripts/equipo.mjs` |

**La forma más simple: responde al mensaje que te llegó de él.** El Dashboard
escribe a todos al empezar y cada vez que cambia de nombre; su `from=` de ese
mensaje es su dirección buena.

Si dudas, pregunta «¿eres el Dashboard?» antes de pedir turno. Cuesta un mensaje.

## Los mensajes entre agentes pasan por el Dashboard

Norma de Eugenio (2026-08-23): **no os escribáis directamente entre vosotros.**
Todo lo que quieras decirle a otro agente, me lo dices a mí y yo lo reparto.

| | |
|---|---|
| Lo sencillo | **Lo contesto yo**, sin molestar a nadie. Quién lleva qué fichero, qué número de migración te toca, si hay alguien desplegando, qué dice una norma, quién es quién hoy |
| Lo complejo | Lo derivo yo al agente que toque, con el contexto ya masticado |
| Lo que no vale | Escribir directamente a otro «solo para una cosa rápida». Una cosa rápida para ti es una interrupción para él, y él estaba a mitad de otra |

**Por qué.** Cada mensaje que le llega a un agente le parte la tarea en dos, y hoy
se han cruzado ocho a la vez: mensajes a sesiones que ya no existían, dos agentes
resolviendo lo mismo, y uno esperando media hora por un fichero que el otro ya no
usaba. El coste de coordinar no desaparece porque lo repartáis entre todos:
simplemente se paga en trozos, y en el peor momento.

**Qué gana cada uno.** Que te interrumpan menos, y que cuando te llegue algo mío
venga con lo que necesitas saber y sin lo que no.

Si te escribo yo pidiendo algo y crees que estoy equivocado, dímelo — eso sigue
igual. Lo que cambia es a quién le llega el primer mensaje.

## Qué es y qué no es un turno

| | |
|---|---|
| Lo que dice | Que **nadie más está desplegando** ahora mismo |
| Lo que **no** dice | Que puedas desplegar. Si Eugenio ha parado tu rama, el Dashboard no te la levanta |
| Se pide para | **Cualquier** PR a `main`, aunque sea una línea de changelog. `main` despliega |
| Al pedirlo se dice | Si tu PR es **aditiva** o **cambia lo que ve todo el mundo mañana** — y en el segundo caso, con la frase de Eugenio que lo pidió |
| Al terminar | Se avisa de que el run cerró, para que entre el siguiente |
