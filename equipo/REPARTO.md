# Cómo tres programadores trabajan a la vez sin borrarse el código

Escrito el 2026-08-22, después de un día en que:

- dos agentes resolvieron **las mismas nueve tareas** y uno tuvo que tirar su trabajo,
- dos tocaron `src/App.tsx` a la vez y hubo que fusionar a mano,
- tres compartían **el mismo directorio**, donde un `git checkout .` de uno borra
  lo que otro todavía no ha guardado.

Son tres problemas distintos y cada uno tiene su remedio.

---

## 1 · Cada uno en su copia de trabajo (esto es lo que evita que se borre código)

| Agente | Carpeta | Rama | Puerto |
|---|---|---|---|
| **Programador 1** | la raíz del repositorio | `prog1/…` | 3000 |
| **Programador 2** | `.claude/worktrees/prog2` | `prog2/…` | 3001 |
| **Programador 3** | `.claude/worktrees/prog3` | `prog3/…` | 3002 |

Son *worktrees* de git: carpetas separadas con ficheros separados, un solo
repositorio detrás. Lo que uno guarda sin commitear **no existe** para los demás,
así que ya no hay forma de borrárselo.

**Nadie entra en la carpeta de otro.** Ni para mirar: para ver el código de otro
está `git show`, `git diff` y las ramas.

**Una sola excepción, y con nombre: la llave que solo se imprime una vez.** Quien
crea el usuario de producción de otro agente escribe su clave y su token
directamente en el `.env` de esa copia — entra solo a eso, no lee nada más y sale.
La alternativa es mandar un secreto por un chat, que es peor. Fuera de este caso no
hay más excepciones (planteada por prog1 el 2026-08-22, y hace bien en decirla en
voz alta en vez de darla por hecha). A futuro, que `scripts/agente-ia.mjs` acepte la
ruta donde dejar la llave y la excepción desaparece.

**Quién eres lo dice dónde estás**, no un fichero: la raíz es `prog1`, y
`.claude/worktrees/progN` es `progN`. **No hay fichero `.agente` en las tres
carpetas de siempre y no debe haberlo**: en la primera hora de vida de este sistema
un agente lo escribió con su nombre en las tres, dos veces, y dos copias decían
llamarse igual. Solo hace falta en una carpeta que no sea una de las tres, y ahí
manda la carpeta si contradicen.

El gancho vive en `.githooks/`, no en `.git/hooks/`: está enganchado con
`core.hooksPath`, que es la única forma de que valga para las tres copias a la vez.
Para comprobarlo: `git config core.hooksPath`.

## 2 · Reservar antes de tocar lo compartido

Las carpetas separadas evitan el borrado, no el choque: si dos editan `App.tsx`
en sus copias, el conflicto aparece al fusionar y el trabajo ya está hecho dos veces.

Antes de tocar un fichero que no es claramente tuyo:

```
node scripts/equipo.mjs quien
node scripts/equipo.mjs reservar src/App.tsx --motivo "pestañas del menú"
…trabajas, commiteas, fusionas…
node scripts/equipo.mjs soltar src/App.tsx
```

Las reservas viven en la rama `equipo/reservas` del repositorio: se ven desde
cualquier máquina y **reservar es un `push`**, así que si dos lo piden a la vez,
git rechaza al segundo y el script se entera. Caducan solas a las 4 horas para que
un agente parado no bloquee a los demás.

El gancho `pre-commit` comprueba lo que vas a commitear y **para el commit** si
lleva un fichero reservado por otro. Si no hay red, avisa pero te deja seguir:
prefiero un choque ocasional a tres agentes bloqueados.

**Ficheros que siempre hay que reservar** (los tocan todos):
`src/App.tsx` · `src/main.tsx` · `CHANGELOG.md` · `src/components/ui/**` ·
`src/index.css` · `index.html` · `package.json` · `server.ts` · `docker-compose.prod.yml`

## 3 · Áreas propias (para no hacer dos veces lo mismo)

| | Suyo |
|---|---|
| **Programador 1** | `src/server/**`, `src/db/**`, IA y chatbot, hormiguero, Tablas |
| **Programador 2** | páginas públicas, subdominios, compartir, tiendas, **Caddy y certificados**, móvil |
| **Programador 3** | PWA (`public/sw.js`, `src/pwa.ts`), instalación en iOS, cámara, sin conexión |
| **Programador 4** | seguridad e integridad: `src/server/seguridad/**`, cifrado, registro sellado, clasificación de tablas |
| **Programador 6** | escalabilidad: copias de seguridad de la base de datos, `cluster`, límites de peticiones (`src/server/limites/**`), subida de ficheros a almacenamiento de objetos, y los servicios que añada a `docker-compose.prod.yml` |
| **Programador 7** | economía del punto: páginas informativas de tokenomics. **Nada que mueva dinero o saldos sin firma de Eugenio** |

**El reparto de infraestructura, decidido el 2026-08-22** porque prog6 lo preguntó
en vez de tocarlo: **prog2 se queda con Caddy, certificados, subdominios y el
propio despliegue**; **prog6 se lleva la infraestructura de escalabilidad** —
copias de seguridad, almacenamiento de objetos y los servicios nuevos del
`docker-compose.prod.yml`. Las tres tareas de escalabilidad son una sola
conversación y repartidas entre dos se cuentan mal. Cuando los dos tengan que
tocar `docker-compose.prod.yml`, manda la reserva y se avisan.

**Los límites de peticiones van en un módulo nuevo** (`src/server/limites/`), no
dentro de `server.ts`, que sigue congelado. Registrarlo es **una línea**, y esa
línea se pide a prog1, que es su área — igual que hizo prog4 con su guardián.

Si tu tarea cae en el área de otro, **no la hagas**: dísela. Y antes de empezar
cualquier cosa, `git fetch` y mira el registro de las últimas horas — puede que ya
esté hecha.

## 4 · Prohibido, y por qué

| Nunca | Porque |
|---|---|
| `git reset --hard`, `git checkout .`, `git stash`, `git clean` en una carpeta que no es la tuya | es exactamente cómo se borra el trabajo no guardado de otro |
| `pkill -f node` o matar procesos por nombre | tumbas los servidores de los otros dos |
| Tocar ficheros del área de otro sin reservarlos | dos soluciones al mismo problema, y una se tira |
| Fusionar a `main` sin avisar | `main` despliega, y el despliegue hace `git reset --hard origin/main` en el servidor |
| `git add -A` o `git add .` sin mirar antes qué entra | Así se versionó `.agente` el 2026-08-22: un fichero de identidad local acabó en el repositorio y **git lo reponía en la copia de todos** en cada checkout. Dos agentes decían llamarse igual y nadie lo había escrito. `git status` primero, y añadir por nombre |

## 5 · El navegador: se cierra en cuanto dejas de mirarlo

Norma de Eugenio (2026-08-22), y no se negocia: **cada uno navega cuando lo
necesita, y cierra la pestaña en cuanto termina de mirarla.**

| | |
|---|---|
| Cuándo se cierra | En el mismo turno en que dejas de usarla. No «al final de la tarea» |
| Cómo | `tabs_close` con su `tabId`. Si no te queda ninguna, el panel se cierra solo |
| Nunca | Dejar una pestaña abierta «por si acaso», ni un servidor de vista previa que ya no miras (`preview_stop`) |
| Antes de entregar | Cero pestañas tuyas abiertas |
| Por qué | Medido el 2026-08-22 en el Mac de Eugenio: **cada navegador ~0,5 GB, 42 procesos y 1,68 GB entre tres agentes**, con 0,30 GB libres en la máquina. El navegador olvidado, no el agente, es lo que cierra la aplicación y os tumba a todos a la vez |
| Y `/explorar` | No la abras si no es tu tarea: son 12 copias de la plataforma dentro de sí misma |

## 6 · Una PR por programador, y el despliegue por turnos

Norma de Eugenio (2026-08-22): **cada programador abre su propia PR, y no se
despliega fusionando el código de varios a la vez.**

| | |
|---|---|
| De dónde sale la PR | de **tu** rama `progN/…`, nunca de `develop` con lo de todos dentro |
| Adónde va | a `main`, que es lo que despliega |
| Quién la abre y la fusiona | **tú**, la tuya, y solo la tuya |
| Antes de fusionar | lo dices y **esperas** a que te den el turno. Avisar no es pedir |
| Cuántas a la vez | una. Si otro está desplegando, esperas a que termine |

**El turno dice que nadie más está desplegando. No dice que puedas desplegar.**
Distinción de prog4, el 2026-08-22: si Eugenio ha parado tu rama, el Dashboard no
te la levanta dándote turno — coordinar que no os piséis y autorizar que algo salga
a producción son dos cosas distintas, y la segunda es solo suya. Devolver un turno
concedido porque el freno sigue puesto es la respuesta correcta.

Por qué: el 2026-08-22 la PR #200 salió a producción con trabajo de los tres
mezclado. Cuando algo se rompe así, no se sabe de quién es ni se puede volver
atrás sin llevarse por delante el trabajo de los otros dos.

`develop` sirve para integrar y para probar. **No es lo que se despliega.**

## 7 · Cuando dos han hecho lo mismo

Ya pasó y se resolvió bien: se comparan las dos soluciones **con datos**, sobrevive
la mejor y el otro retira su commit. No gana quien llegó antes ni quien tiene más
líneas. Lo que no vale es fusionar las dos «para no tirar trabajo».
