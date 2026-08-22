# Publishing to the App Store and Google Play

Written 2026-08-22 by the agent holding **app, UX and UI**. Eugenio asked what it
takes to get the mobile app accepted by both stores.

This file exists because the answer keeps changing hands: agents are restarted,
names change, and the store requirements are the kind of thing that is expensive
to re-derive. **Anything below marked "measured" was checked in the code or
against production, not remembered.**

---

## Where we are

The platform is an installable PWA and it works: home-screen install on iOS,
opens offline with your own data, camera, self-updating. **There is no native
project** — no `ios/`, no `android/`, no Capacitor. Measured 2026-08-22.

## Blockers, and who can clear them

| # | What | Store | Who |
|---|---|---|---|
| 1 | Native wrapper (Capacitor) | Both | An agent, **once Xcode exists** |
| 2 | **Block a person** — nothing exists | Apple | Server area + UI |
| 3 | Sign in with Apple | Apple | Needs the paid Apple account |
| 4 | Developer accounts | Both | **Only Eugenio** |
| 5 | Screenshots, listing copy | Both | An agent |
| 6 | Stripe: donation vs subscription | Apple | **Only Eugenio** |

### Already done, do not redo

- Account deletion from inside the app **and** the public page at
  `/borrar-cuenta` — both stores require it, Play requires the public URL.
  **That route must never move**: it goes in the Play listing and changing it
  means going through review again. If it ever has to move, leave a redirect,
  never a 404.
- Reporting content, and a screen where somebody reads the reports. Apple
  requires that reports are reviewed; one nobody reads counts as not having one.
- Manifest with `id`, categories, orientation and shortcuts.

## The machine, measured 2026-08-22

| | |
|---|---|
| MacBook Pro M1 (2020), 8 GB RAM, 85 GB free | macOS **15.5** |
| Xcode | **Not installed**, and it now requires macOS **26.2** |
| Android SDK, Java | Not installed |

**So do not plan on building iOS locally.** Updating macOS takes the machine
down for an hour or two, and this Mac runs the whole team. The right answer is
**GitHub Actions macOS runners**, which come with Xcode: the repo already uses
Actions for deploys. Debugging then happens through TestFlight on a real iPhone,
which is a better test than a simulator anyway.

## Google Play is the short path, and nothing above blocks it

The Android package is generated from **pwabuilder.com** in a browser, from
`humanity.wiki`. No Xcode, no Android SDK, no local tooling.

Two things that decide whether it looks like an app or like a web page in a box:

- **`/.well-known/assetlinks.json`** with the package's signing fingerprint.
  Without it the app opens with a browser bar. The fingerprint only exists after
  the package is generated, so this is a "come back and fill it in" step.
- **The package is generated from `humanity.wiki` and only from there.** A user's
  own domain must never enter the package `scope`: if it did, opening somebody's
  shop from the app would pull it *inside* our application, with our name in the
  bar.

Also: a **personal** Play account created after Nov 2023 must run a closed test
with 12 testers for 14 continuous days before publishing. An **organisation**
account is exempt. Open it as the organisation.

---

## Contract: blocking a person

Nothing exists — measured 2026-08-22, `follows` exists and `bloqueos` does not.
Whoever holds `src/server/**` owns this half.

### What blocking has to mean

Apple checks this, and one direction is not enough:

| | |
|---|---|
| I stop seeing theirs | Posts, comments, profile |
| **They stop seeing mine** | And cannot follow, comment or message me |
| **They are not told** | Silently. Telling them turns a block into a provocation, which is the thing the person blocking is trying to avoid |

### Endpoints

```
POST   /api/bloqueos      { usuario_id }
DELETE /api/bloqueos/:id
GET    /api/bloqueos                      the ones I have blocked
```

### The part that is actually work

**A block that does not filter is a decorative button, and Apple tests it.**
Apply it to `/api/publicaciones`, the wall, comments, `/api/graphs`, projects and
people — **both directions**. Blocking should also break an existing follow, both
ways.

Three decisions for whoever writes it:

- Can you block an administrator? Probably yes in the list, but it must not hide
  moderation from them.

Two of the three were answered by the agent holding the economic half of the
server, unprompted, and both answers are better than the questions:

- **Filtering**: one SQL function `bloqueado_entre(a, b)`, or a view
  `bloqueos_vigentes` that every query joins in its `WHERE`, rather than five
  copied `NOT IN` clauses. Five copies of a rule is five places to forget it —
  which is exactly how a block ends up filtering the wall and not the comments.
- **The tombstone**: a deleted account keeps its id, so a block still points at
  something. That is correct and needs no special case — blocking a tombstone
  harms nobody, and unblocking still works.

### The UI half

The **Bloquear** action on a person, **desbloquear** in Configuración, and a hook
from the report dialog — reporting somebody is the moment they also want to stop
seeing them.
