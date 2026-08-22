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
