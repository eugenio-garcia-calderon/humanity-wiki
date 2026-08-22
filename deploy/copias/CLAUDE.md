# Database backups

Before this existed, **humanity.wiki had no backups at all**. The
`pgBackRest a R2` checkbox in `docs/13_DEPLOY.md` had been unticked since
August and there was not one `pg_dump` anywhere in the repo. Production data
lived in a single volume on a single server.

Owned by **prog6** (escalabilidad). Caddy, certificates and the deploy itself
stay with prog2 — see `equipo/REPARTO.md`.

## What runs

A `copias` service in `docker-compose.prod.yml`, same image as `db`, which
takes **one logical dump per UTC day**, verifies it, and rotates.

```
/copias/humanity-2026-08-22.dump   custom format (-Fc), compressed, restorable table by table
/copias/estado.json                how the last run went — the healthcheck reads this
/copias/estado-remoto.json         same, for the off-site copy
```

Kept: the **14 most recent** dumps, plus **every 1st-of-month for 6 months**.
Both configurable (`COPIAS_DIAS`, `COPIAS_MESES`).

## The three decisions, and why

**One dump per day, taken as soon as the container can — not at a fixed hour.**
A fixed hour means a restart at the wrong moment silently skips a day. This way
a deploy, a reboot or a crash never costs a day. The price is that the dump
lands at an arbitrary time; on a database this size that is not worth
optimising.

**A compose service, not a host `cron`.** `deploy/CLAUDE.md` records what
happens when someone creates things on the server by hand: a root-owned
directory killed an entire deploy on 2026-08-22. A compose service travels in
the repo, survives the deploy's `git reset --hard` because it *is* the repo,
and nobody has to SSH in to install it.

**A dump *and* Hetzner's disk snapshots — not one instead of the other.**

| | Hetzner snapshot | This |
|---|---|---|
| Server burns down | ✅ everything back, including certificates and uploads | ❌ database only |
| A user deletes one page by mistake | ❌ rolls the whole server back | ✅ restore one table |
| Do you know it works? | ❌ not until you restore it | ✅ `restaurar.sh probar` |
| Consistency | crash-consistent, like a power cut | consistent by definition |

**Superseded the same day.** Eugenio parked the snapshot and asked for the dump
to leave Hetzner instead — see the next section. The dumps still land on the
server disk first; `copias-remoto` is what takes them off it.

## Off Hetzner: the `copias-remoto` service

Eugenio, 2026-08-22: *«hagamos el volcado de copia de base de datos fuera de
hetzner y olvidemos lo otro de momento de la foto»*. The Hetzner snapshot idea
above is **parked**, not chosen.

A second container (`rclone/rclone`) copies every new dump to an S3-compatible
bucket at another provider. It shares the `copias` volume and does nothing else.

**It copies, it never syncs.** `rclone sync` would make the remote a mirror of
the local directory — so a bug that emptied `/copias` would erase the off-site
copy too, which is the exact thing this protects against. `rclone copy` only
adds. At ~1.3 MB/day that is ~475 MB/year against R2's 10 GB free tier: decades
before it matters. When it does, prune by hand, deliberately.

**Unconfigured, it stays healthy and idle.** A container permanently red teaches
people to ignore red, and then nobody looks the day it means something. Missing
configuration is said in the log and reported to Eugenio, not screamed forever
in `docker ps`.

### Turning it on (Eugenio's part — needs an account, so it is not ours)

1. Cloudflare dashboard → **R2** → create bucket, e.g. `humanity-copias`.
   Same account as the DNS; 10 GB free; no egress charge.
2. **Manage R2 API Tokens** → create one scoped to **that bucket only**, with
   read **and** write. Read as well as write: a token that cannot read cannot
   verify, and an unverifiable backup is a guess.
3. Copy the Access Key ID, the Secret and the S3 endpoint into
   `/opt/humanity-wiki/.env.production` (see `.env.production.example` for the
   four `COPIAS_REMOTO_*` lines). That file is gitignored and survives deploys.
4. `docker compose -f docker-compose.prod.yml --env-file .env.production up -d copias-remoto`

Then check it took:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail 5 copias-remoto
# want: "al día: N volcado(s) en fuera:humanity-copias"
```

**The secret must never reach a versioned file, a `memory/` note or an agent's
transcript.** Eugenio pastes it into `.env.production` himself.

Any S3-compatible provider works — change `COPIAS_REMOTO_PROVEEDOR` and the
endpoint. R2 was picked because he already has the Cloudflare account, and
because a backup on Hetzner does not protect against losing Hetzner.

### Is it actually uploading? (healthy-and-idle looks like healthy-and-working)

The healthcheck deliberately shows green in both states, so **green is not
evidence that anything is leaving the server.** Green means "nothing is broken",
and "not configured" is not broken. To know, ask what is in the bucket:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T copias-remoto cat /copias/estado-remoto.json
```

| `resultado` | What it means |
|---|---|
| `sin_configurar` | **Nothing is leaving the server.** The four `COPIAS_REMOTO_*` lines are missing |
| `ok` with `ficheros_en_destino` > 0 | That many dumps are in the bucket, counted there, not assumed |
| `ok` with a stale `momento` | Cannot happen — stale turns the healthcheck red at 36 h |
| `error` | `detalle` carries the first 300 characters of what rclone said |

And the one that settles it, listing the remote itself rather than trusting our
own status file:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T copias-remoto rclone lsl fuera:$COPIAS_REMOTO_CUBO
```

**Until that command lists a dump, there is a service waiting, not an off-site
backup.** And listing it still only proves the bytes arrived. The full proof is
bringing one back:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec -T copias-remoto rclone copy fuera:$COPIAS_REMOTO_CUBO/humanity-2026-08-22.dump /copias/desde-fuera/

# `probar` takes a path relative to /copias, so this restores THE DOWNLOADED
# copy, not the local one it came from — which is the whole point.
bash deploy/copias/restaurar.sh probar desde-fuera/humanity-2026-08-22.dump
```

Do that **once**, the day the bucket is configured. A round trip that has never
been made is a plan, not a backup.

## Restoring

```bash
bash deploy/copias/restaurar.sh listar      # what is there
bash deploy/copias/restaurar.sh probar      # SAFE: restores into a scratch DB, counts, drops it
bash deploy/copias/restaurar.sh restaurar humanity-2026-08-22.dump
```

**`probar` is the one that matters.** A backup nobody has ever restored is a
guess. It touches nothing: separate database, dropped at the end.

`restaurar` asks you to type `RESTAURAR PRODUCCION` in full, dumps the *current*
state to `antes-de-restaurar-<fecha>.dump` first, and stops `app` while it
works — restoring under a live app leaves the database half in one moment and
half in another.

## Before you change this, decide

**If you edit any script in this folder, the container will not pick it up on
its own.** They come in through a bind mount, and `up -d` has no reason to
recreate a service whose definition did not change — the same trap the Caddyfile
hit on 2026-08-22, written up in `deploy/CLAUDE.md`. After a deploy that touches
these:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart copias copias-remoto
```

Baking the scripts into an image instead would remove that footgun and cost a
Dockerfile plus a build on every deploy. Bind mount was chosen because the
scripts change rarely; if they start changing often, switch.

**The `.dump` files are not encrypted.** They hold every user's data. They are
readable by anyone with root on the server — and now by anyone holding the R2
token, which widens the blast radius rather than narrowing it.

The design is agreed with prog4 (security). It is **not built**, and it is not
blocked on code:

| | |
|---|---|
| Tool | `age`, not the platform's own `cifrado.ts`. `age` is built for encrypting a large file in a pipe, and it stays one line in `copias.sh` |
| **Asymmetric, not a shared passphrase** | The server carries only the **public** key: it can encrypt every dump and **cannot decrypt any of them**. Steal the server, get the backups, open none |
| Where the private key lives | **Not on the server and not in any `.env`.** Eugenio's password manager, plus an offline copy kept somewhere else |
| Split, rather than in one place | Three shares, any two reconstruct it (Shamir). Then it survives one person losing theirs, and no single person can open the backups alone |
| The wrapped per-file key | Travels **inside** the `age` file, and that is safe here only because it is wrapped with the public key: the thing that unwraps it exists nowhere on the server and nowhere in the bucket. In the envelope pattern prog4 uses for field data, where the wrapping key is reachable, the rule is the opposite — key and payload never share a file or a bucket, or whoever takes one takes both |
| The step that decides whether any of this is worth anything | A **test restore with the real key, before we start trusting it**. An encrypted backup nobody has restored is two beliefs stacked on one |

**The decision is Eugenio's, and it is not technical: if that private key is
lost, the backups can never be opened again.** Good code does not fix that, so
nothing gets encrypted until he has decided where the key lives. Raised with him
2026-08-22; to be asked alongside `CLAVE_FIRMA_REGISTRO`, which is waiting on
him too — two keys in one conversation rather than one a day.

**36 hours is the healthcheck threshold**, not 24, so a slow dump or an
off-hours restart does not cry wolf. If the daily cadence ever tightens, tighten
this with it.

## What was verified, and what was not

Verified 2026-08-22 against a real PostgreSQL 17, on a throwaway database
created and dropped for the test (Eugenio's `evolucion_humanidad` untouched):

- dump written, 420 objects counted, `estado.json` correct;
- **the dump restores**: 60 tables in, 60 tables out, row contents intact;
- rotation with 26 planted files kept exactly the right 18 (14 daily + 4 monthly);
- the healthcheck passes when fresh and fails in all three bad states (stale,
  failed, never run);
- the compose file parses and the other three services are unchanged.

Verified 2026-08-22 for `copias-remoto`, with **real rclone** against a local
remote (no Docker, so the container itself is again unverified):

- only `humanity-*.dump` goes up — `estado.json` stayed behind;
- **deleting a dump locally did not delete the remote one**, which is the whole
  point of `copy` over `sync`;
- an unreachable destination lands in `error` and the healthcheck fails;
- a destination that answers but holds nothing also fails, instead of reporting
  a cheerful success on an empty bucket;
- unconfigured stays healthy and idle, as designed.

**Not verified: the container itself.** There is no Docker on the Mac this was
written on, and `postgis/postgis:17-3.5` publishes no arm64 build anyway. The
entrypoint override, the bind mount and the healthcheck wiring have only been
reasoned about, not run. **First deploy, watch it**:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f copias
docker compose -f docker-compose.prod.yml --env-file .env.production ps copias   # want: healthy
bash deploy/copias/restaurar.sh probar
```
