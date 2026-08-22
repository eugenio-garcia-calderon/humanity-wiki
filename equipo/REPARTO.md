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

| | Programador 1 | Programador 2 | Programador 3 |
|---|---|---|---|
| **Suyo** | `src/server/**`, `src/db/**`, IA y chatbot, hormiguero, Tablas | páginas públicas, subdominios, compartir, despliegue e infraestructura (`deploy/**`, Caddy, certificados), móvil | PWA (`public/sw.js`, `src/pwa.ts`), instalación en iOS, cámara, sin conexión |

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

## 5 · Una PR por programador, y el despliegue por turnos

Norma de Eugenio (2026-08-22): **cada programador abre su propia PR, y no se
despliega fusionando el código de varios a la vez.**

| | |
|---|---|
| De dónde sale la PR | de **tu** rama `progN/…`, nunca de `develop` con lo de todos dentro |
| Adónde va | a `main`, que es lo que despliega |
| Quién la abre y la fusiona | **tú**, la tuya, y solo la tuya |
| Antes de fusionar | lo dices y **esperas** a que te den el turno. Avisar no es pedir |
| Cuántas a la vez | una. Si otro está desplegando, esperas a que termine |

Por qué: el 2026-08-22 la PR #200 salió a producción con trabajo de los tres
mezclado. Cuando algo se rompe así, no se sabe de quién es ni se puede volver
atrás sin llevarse por delante el trabajo de los otros dos.

`develop` sirve para integrar y para probar. **No es lo que se despliega.**

## 6 · Cuando dos han hecho lo mismo

Ya pasó y se resolvió bien: se comparan las dos soluciones **con datos**, sobrevive
la mejor y el otro retira su commit. No gana quien llegó antes ni quien tiene más
líneas. Lo que no vale es fusionar las dos «para no tirar trabajo».
