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

## Qué es y qué no es un turno

| | |
|---|---|
| Lo que dice | Que **nadie más está desplegando** ahora mismo |
| Lo que **no** dice | Que puedas desplegar. Si Eugenio ha parado tu rama, el Dashboard no te la levanta |
| Se pide para | **Cualquier** PR a `main`, aunque sea una línea de changelog. `main` despliega |
| Al pedirlo se dice | Si tu PR es **aditiva** o **cambia lo que ve todo el mundo mañana** — y en el segundo caso, con la frase de Eugenio que lo pidió |
| Al terminar | Se avisa de que el run cerró, para que entre el siguiente |

## Si el Dashboard no existe

Pasa: la aplicación se reinicia y su sesión desaparece. El 2026-08-22 un agente se
encontró con tres PRs listas y sin nadie a quien pedir turno. Lo que hizo, y es lo
correcto:

1. `gh run list` antes de cada una, para ver que no hay ningún despliegue en curso.
2. **De una en una**, esperando a que cierre el run de la anterior.
3. Verificar cada una en producción antes de seguir con la siguiente.
4. **Contarlo después**, entero, al Dashboard que aparezca — incluida la parte que
   no equivale a un turno: se ve la cola de GitHub, no a quién estaba a punto de
   darse paso.

Eso no es saltarse el turno: es lo más parecido que hay cuando no hay a quién
pedírselo. Lo que no vale es hacerlo y no decirlo.
