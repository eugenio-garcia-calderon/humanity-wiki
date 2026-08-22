# Deploying humanity.wiki

Hetzner + Docker Compose + Caddy, behind Cloudflare on Full (strict). A merge
to `main` triggers `.github/workflows/deploy.yml`, which SSHes in and runs
`git reset --hard origin/main` before rebuilding.

## THE RULE: one change per deploy

Eugenio, 2026-08-22: «siempre hacer despliegues propios como norma».

**A deploy carries one change. Not two, not "mine plus whatever was on
develop".** When a deploy breaks something, the only cheap question is "what
went out?", and it has a cheap answer only if the answer is one thing.

This came from a real near-miss the same day. A deploy of the publishing work
was about to carry a service worker that a different agent had just pushed to
`develop`. Both were verified on their own. Nobody had verified them together,
and a service worker is the one thing a user cannot get rid of by reloading —
it would have gone out hidden inside someone else's release, and if anything
had broken there would have been two suspects and no way to tell.

In practice:

1. **Look at what is actually going out**, right before merging:
   `git log --oneline origin/main..origin/develop`. Fetch first — checking a
   minute early is checking a different branch.
2. **If it carries someone else's work, stop and ask them.** They may not know
   their commit is about to ship.
3. **Anything a user cannot undo by reloading** — service workers, migrations
   that drop data, auth changes — goes out alone, always, and is Eugenio's
   call, not ours.
4. **Tell the others before and after.** Other agents may be about to merge
   too, and a second deploy mid-verification wipes the ground under the first.

## `git reset --hard` eats hand edits on the server

The deploy resets the checkout. **Any change made by hand on the server to a
file that git tracks disappears at the next deploy — anyone's deploy.**

Measured on 2026-08-22: the Caddy wildcard block and the certificate volume
mount were enabled by hand, another agent's deploy reverted both, and the
subdomains went back to error 525 with nobody touching them.

- Ignored files **do** survive: `deploy/certs/*`, `.env.production`.
- Tracked files **do not**: `Caddyfile`, `docker-compose.prod.yml`.
- So a server fix is not finished until it is merged to `main`. Doing it by
  hand is a way to test it, never a way to ship it.

## Anything you create on the server must belong to `deploy`

The deploy runs as the `deploy` user. **A directory created by hand as `root`
stops the next deploy dead**, and it fails in the quietest possible way.

Measured on 2026-08-22: `deploy/certs` was created over SSH as root. The next
deploy died at

```
error: unable to create file deploy/certs/LEEME.txt: Permission denied
fatal: Could not reset index file to revision 'origin/main'
```

`git reset --hard` runs **before** the rebuild, so nothing was rebuilt and
nothing broke — the site kept serving the old version. That is the trap: the
site is up, the workflow is red, and the change looks like it simply did not
work. Fix:

```bash
chown -R deploy:deploy /opt/humanity-wiki/deploy/certs
chmod 700 /opt/humanity-wiki/deploy/certs
chmod 600 /opt/humanity-wiki/deploy/certs/origen.key
```

Then re-run the failed workflow; no new commit is needed.

## A new Caddyfile never reaches the container by itself

`deploy/Caddyfile` is bind-mounted as a **single file**. `git reset --hard`
does not edit it, it **replaces** it, and the container keeps looking at the
old inode. The service definition does not change either, so `up -d` has no
reason to recreate it.

The result, measured on 2026-08-22: a Caddyfile change deploys, the workflow
goes green, and nothing happens. The file on the host had the new rule; the
container did not.

The deploy now ends with `up -d --force-recreate caddy`, so this is handled.
But if you ever change Caddy config by hand, **recreate the container** — a
`docker compose restart` is not enough either, for the same inode reason.

It was caught because a cache header did not change. It could just as easily
have been the subdomain block, and then it would have looked like the
certificate was failing.

## `header` in Caddy ADDS unless you write `>`

`header @foo Cache-Control "..."` does not replace a header the origin already
sent — it adds a second one. The response then carries two `Cache-Control`
lines and Cloudflare keeps the origin's.

The assets rule had been written that way since August and had never done
anything: measured against the origin, the response carried
`public, max-age=31536000, immutable` **and** `public, max-age=0`.

Always `header @foo >Cache-Control "..."` when the origin might set the same
field. And measure against the origin, not through Cloudflare:

```bash
curl -sI --resolve humanity.wiki:443:<IP> -k https://humanity.wiki/sw.js | grep -i cache-control
```

Through Cloudflare you see what the edge decided. Against the origin you see
what Caddy actually sent, and duplicated headers only show up there.

## The certificate for per-user subdomains

`*.humanity.wiki` needs a certificate **on this origin**, because Cloudflare
runs Full (strict). It is a Cloudflare origin certificate (15 years, no
renewal, no rate limit) living in `deploy/certs/`, gitignored, mounted at
`/etc/caddy/certs`.

**Never enable the wildcard block in the Caddyfile without the files in
place.** Caddy refuses to start, and that does not take down the subdomains —
it takes down humanity.wiki. Validate first, in a container that is not the
one serving traffic:

```bash
docker run --rm -v /tmp/Caddyfile.nuevo:/etc/caddy/Caddyfile:ro \
  -v /opt/humanity-wiki/deploy/certs:/etc/caddy/certs:ro \
  caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

That certificate also covers `humanity.wiki`, so Caddy serves the main domain
from it instead of Let's Encrypt. Correct behind Full (strict), and it removes
a renewal that could fail — but it is a change to something that already
worked, so look here first if the main domain's certificate ever misbehaves.

## Checking a deploy actually worked

`curl` returning 200 proves almost nothing here: the server hands the whole
application back for any path, so a 200 can mean "that screen does not exist".
Check the thing itself — the rendered title, the certificate the origin
presents — not the status code. This has bitten twice in one day.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://humanity.wiki
echo | openssl s_client -connect <IP>:443 -servername sub.humanity.wiki 2>/dev/null \
  | openssl x509 -noout -issuer
```
