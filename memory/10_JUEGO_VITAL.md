# 10 — Juego Vital (Real Life Game)

> Design agreed with Eugenio on 2026-08-18 (this file is the engineering record;
> the conversation happened in Spanish). The game is **a third view over the
> platform's real entities** — after the canvas/graph view and the card
> explorer — rendered as a walkable 3D world. Nothing exists "only in the
> game": every building, object and NPC is a real DB entity (project, document,
> task, person, challenge).

## Locked decisions (Eugenio, 2026-08-18)

| Decision | Choice |
|---|---|
| Art direction | **Stylized HD low-poly** (Wind Waker / Animal Crossing reference). COD-Mobile realism explicitly discarded as unreachable and mobile-hostile. |
| First phase | **"Pasear tu vida"** — walk the village with the robot, real projects as buildings. |
| Photo → 3D objects | **Hybrid**: CC0 stylized asset library matched by AI (free, instant) + real image-to-3D generation (~€0.10-0.50/object, to verify) as a premium option that costs puntos. |
| Target devices | **Mobile + desktop from day 1** (Eugenio's call over the desktop-first recommendation; adds touch joystick + mobile perf budget to F1). |
| Real messaging | **Telegram, not WhatsApp** (Eugenio, 2026-08-18, choosing among four options). Official bot API: real two-way messages, no risk of losing his personal number. WhatsApp bridges were offered and declined — see the WhatsApp section below, which stands. **Known limit, stated before building: a Telegram bot can only write to people who have messaged it first**, so each friend must `/start` the bot once. |
| 3D assets | **Full downloaded library — people AND objects** (Eugenio, 2026-08-18, over the "characters first" recommendation). CC0 only (Kenney / Quaternius: public domain, no attribution required, safe to redistribute). Accepted costs, stated when asked: tens of MB in the repo, and mixing packs can break style coherence — mitigated by preferring a single pack family per category. |

## The five pillars

1. **Your life is the map** — fog clears as your life enters the game.
2. **Everything is real** — playing is working without noticing.
3. **Intelligent company** — robot companion, project agents, person avatars, Humanity agent.
4. **Your world, your doors** — privacy per zone (private home w/ invitations, public project plaza), reusing the existing visibility system.
5. **From self to Humanity** — progression connects personal projects to the platform's real territories/challenges.

## World structure

- Personal world per user; districts = life areas defined by the AI founding
  interview. Buildings = projects (architecture reflects real kanban progress).
  Objects = publications (document → desk, canvas → physical whiteboard, task →
  quest board, image → picture, video → screen, presentation → projector).
- **Museo del Pasado**: the user's trajectory as a walkable timeline.
- **Humanity world**: run by a platform AI agent over the real data (14
  objectives as monuments, challenges as bonfires, 242 territories). The agent
  runs daily on a budget (cron, ~€0.5-2/day), researches one challenge with web
  search, and leaves findings as real common publications. Players can visit
  it, invite it to their world, and "adopt" challenges (embassy appears).
- **Eugenio's seed map**: village of 14 houses, a winding river + bridge,
  4 industrial naves, 118 ha (~1.09×1.09 km at 1 unit = 1 m), forests, lakes.
  Becomes a selectable template.

## Inhabitants

- **Personal robot** (the "Pikachu"): follows the player; talking to it = the
  existing AI assistant (web search + multimodal already live). Can build on
  command via the AI action catalogue; overnight "build while you sleep" drafts.
- **Project agents**: per-project NPC; proximity dialog states real status from
  DB, proposes next step, opens real pipelines (photo, canvas, document, video).
- **Person avatars** (Builder, Phase 3): photo → stylized avatar → agent with
  per-person memory. **Non-negotiable safeguards**: private by default until the
  person registers; permanent "simulation created by X, not this person" label;
  on registration the real person claims the avatar (inherit/wipe/delete);
  agents never impersonate the real person.
- **Pets**: photo of a real animal → AI matches species/breed/colors to a
  pre-rigged animated model from the CC0 library (auto-rigging from photo is too
  immature today; premium generation later). Free-roaming agent: wanders,
  greets you on login, brings forgotten notes/tasks, reacts to world state.
  Never suffers or dies (no tamagotchi guilt). Can also live in the Museo del
  Pasado (childhood pets). Phase 2.

## Vital inventory (real-life assets) — added 2026-08-18

The game knows what the player *has*, not only what they want: companies,
audiences/channels, contact networks, skills, infrastructure, trajectory.
Captured via the founding interview + document upload (multimodal). All agents
reason over the inventory (advice cites the player's actual assets); the
Impact axis uses real reach. **Data-protection rule**: model the asset's
existence and size ("~N customers, sector X"), never import third-party
personal data (e.g. the solar company's customer rows) into the platform.

## Real channels (WhatsApp) — added 2026-08-18

- WhatsApp has **no official API for personal accounts**. Unofficial bridges
  (whatsapp-web.js / Baileys) violate Meta ToS and risk a **permanent ban of
  Eugenio's personal number** — explicitly warned, not recommended, not built.
- Phase 3 ships the safe path: in an avatar chat, "send for real via WhatsApp"
  uses a `wa.me/<phone>?text=` deep link with the AI-drafted message; the user
  presses send inside WhatsApp. Zero risk, official, free.
- True two-way in-app messaging is only legally possible via Telegram's bot API
  (candidate for a later phase) or WhatsApp Business Cloud API (business↔customer
  only, separate number — does not cover personal chats).
- Fixed rule: **AI drafts, the human sends**; friends always receive messages
  from the person, never from a machine impersonating them.

## Progression

- XP from real actions (complete task, update document, canvas session).
- **Nivel Vital**, two axes: *Integration* (life areas with content, entities
  touched <30 days, streaks) and *Impact* (project reach over real territories ×
  community validation via existing ratings × VERIFIED/KNOWLEDGE roles). Impact
  is never self-declared. Rewards: puntos, new hectares, mounts, robot skins.
- World reflects real state: active areas bloom, neglected ones mist over.

## Phases

| Phase | Content | Estimate |
|---|---|---|
| F1 Pasear tu vida | Village, 3rd-person character (WASD + touch joystick), robot wired to real assistant, real projects as buildings, project panel | ~2 weeks |
| F2 Mundo vivo | Project agents, kanban quests, photo→object (library), basic Builder, Museo del Pasado, pets | 2-3 weeks |
| F3 Los otros | Async visits, invitations/private zones, person avatars + safeguards, WhatsApp deep-link channel, mailbox | ~2 weeks |
| F4 La Humanidad | Humanity world + daily agent, adoptable challenges, portals | ~2 weeks |
| F5 Lujo | Realtime WS presence, premium image→3D, mounts, weather/seasons, full Nivel Vital | open |

## F1 technical shape (built 2026-08-18)

- `three` + `@react-three/fiber` + `@react-three/drei`, all inside a
  lazy-loaded chunk (`src/pages/JuegoVital.tsx` → `React.lazy` →
  `src/components/juego/Escena.tsx`), so the main bundle does not pay for the
  engine. Route `/juego`, full-bleed, AI assistant in `bar` mode (same as
  Grafos) — the robot IS the assistant: proximity interaction focuses the bar
  input via the `humanity:asistente-focus` window event.
- World layout is **deterministic** (seeded PRNG in
  `src/components/juego/paleta.ts`) — no DB tables yet. Persistence
  (`game_worlds`, `game_objects`, …) arrives with the Builder in F2.
- Projects come from the existing `GET /api/proyectos` (own ones, ≤12);
  building height grows with real kanban progress (`hechas/tarjetas`).
- Instanced vegetation (~1'100 trees), `frustumCulled = false` on instanced
  meshes (their bounding volume ignores instance positions), shadow camera
  follows the player, `dpr` clamped to 1.75 for mobile.
