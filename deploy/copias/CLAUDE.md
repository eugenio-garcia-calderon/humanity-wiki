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

The dumps sit on the server disk **on purpose**: the Hetzner snapshot then
carries them off the machine for free. Neither covers losing the Hetzner
account itself — that needs a copy at another provider, and it is not built.

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

**If you edit `copias.sh` or `salud.sh`, the container will not pick it up on
its own.** They come in through a bind mount, and `up -d` has no reason to
recreate a service whose definition did not change — the same trap the Caddyfile
hit on 2026-08-22, written up in `deploy/CLAUDE.md`. After a deploy that touches
these:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart copias
```

Baking the scripts into an image instead would remove that footgun and cost a
Dockerfile plus a build on every deploy. Bind mount was chosen because the
scripts change rarely; if they start changing often, switch.

**The `.dump` files are not encrypted.** They hold every user's data. They are
readable by anyone with root on the server or with a Hetzner snapshot. Adding
`age`/GPG is one line in `copias.sh` and one more secret to not lose — and a
backup you cannot decrypt is worse than no backup, so it needs a real key
custody decision first. Not made. Raised with Eugenio 2026-08-22.

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

**Not verified: the container itself.** There is no Docker on the Mac this was
written on, and `postgis/postgis:17-3.5` publishes no arm64 build anyway. The
entrypoint override, the bind mount and the healthcheck wiring have only been
reasoned about, not run. **First deploy, watch it**:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f copias
docker compose -f docker-compose.prod.yml --env-file .env.production ps copias   # want: healthy
bash deploy/copias/restaurar.sh probar
```
