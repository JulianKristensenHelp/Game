# «Har du prøvd å skru den av og på?» – Help Desk Survivors

A pixel-art survivors-style browser game (think *Vampire Survivors*) set in an office. You play someone
from the IT department. Stressed lawyers walk up to you with IT problems, and your IT "solutions" fire
automatically to help them. Helped lawyers give a thumbs-up and leave a support ticket behind. Survive as
long as you can, collect tickets, and climb the shared daily leaderboard.

> All in-game text is in **Norwegian (bokmål)**. Detailed Norwegian documentation for balancing, the map,
> graphics and debug tools is in [DOKUMENTASJON.md](DOKUMENTASJON.md), and the change history is in
> [ENDRINGSLOGG.md](ENDRINGSLOGG.md).

## Features

- **Plain JavaScript, no build step.** HTML5 Canvas 2D and ES modules, with no npm packages, external scripts,
  external images or sound files. Everything (sprites, pixel font, sound) is generated in code. The total size is about 0.4 MB.
- **Pixel art** rendered at 640 × 360 and scaled up with crisp pixels. The only image files are the client's own
  character art in `assets/karakterer/`. Every screen sees the same area of the map.
- **Four playable characters**, each with its own starting weapon and bonus, drawn by the client as pixel art
  (`assets/karakterer/`, used pixel for pixel with integer scaling).
- **13 weapons up to level 9** (max 4 at once), **28 passives up to level 5** (max 8 at once), **13 combinations**
  (one per weapon, «level 10»: the weapon at level 9 + its passive) and the rare special combination **The Matrix**
  (Skytsengelen + Livvakten + Shopkeeperen, with code rain and bullet time). See the table below. Every level-up card
  is one specific increment and one level: more help, a shorter interval, one more mouse or cartridge, or an effect
  modifier (pierce, splash, slow, lingering help, knockback, crit, mark, escalation, pull). Every valid card has the
  same chance, an available combination is always shown, and the same set of cards never comes twice in a row. Cards
  have four tiers (common, uncommon, rare, legendary) with bigger increments, and luck («Hesteskoen») makes the rare
  ones more likely.
  Rerolls and banishes, supplier packages from bosses, and tag passives for weapon classes. All weapons aim at the
  nearest lawyer.
- **Brotato-style stats:** critical hits, armour, regeneration, dodge and luck, all shown on a stat sheet with every
  weapon's numbers at every level-up. Lawyers have frustration bars and every hit shows a number with the weapon's icon.
- **Linear difficulty with events:** the curve is a straight line until overtime, with scheduled events on every
  shift (lunch rush, printer queue, partner meeting) and rare ones rolled per day (coffee break, free lunch, server crash).
- **Capture-point events:** now and then you are called to a fixed spot on the map (snacks on Jacob's desk, a game
  of ping-pong, a meeting) and have to hold a circle for 8 seconds with no lawyers in it. Taking it gives a permanent
  bonus and a free level.
- **Tickets never disappear:** experience is always paid in full, but the points go stale after 10 seconds (down to
  25 %). Stale tickets turn yellow and merge into case piles, and the rare «Sky-synk» pickup pulls every ticket on
  the map to you.
- **Diverse, procedurally composed lawyers**, including a ranged type that sends «Haster!» emails, and rare
  **partners** (elites) with a crown, a big frustration bar and a trait: an aura that shields their neighbours,
  delegating to juniors when helped, or a telegraphed dash.
- **Four different bosses in a fixed order** (the consultant at 3:00, the multifunction printer at 6:00, Anonymous
  and her friends at 9:00 and the final boss at 12:00, who returns every 3 minutes after that), each with its own
  telegraphed attacks. Bosses are mandatory: if a boss's countdown
  runs out, you're fired («Du har fått sparken!») and the shift ends.
- **"Today's shift" (Dagens vakt) and the run seed:** the *structure* of the shift is seeded from today's date
  (Europe/Oslo) and is the same for everyone all day: when the bosses come, when the office events and the
  capture-point events come and which ones, the difficulty curve, where the energy drinks and «Sky-synk» appear, and
  when and where the urgent case comes. Everything else is new in every round, from a run seed made with
  `crypto.getRandomValues` when the round starts: the upgrade cards offered, where and when ordinary lawyers appear
  and which types, ring waves and flocks, drops (cookies, Ny PC, packages), «Dobbel skjerm», crits, dodges, the
  ping-pong launch direction and other weapon randomness, the details of the bosses' attacks, and the lawyers' looks.
  The run seed is saved with the leaderboard entry and shown in the debug overlay; `?debug&seed=<seed>` replays a
  round (such a replay is never submitted). The start screen still shows «Dagens vakt: [date]».
- **Shared daily leaderboard** using a tiny Node.js server with built-in SQLite. It resets at midnight Norwegian time.
- Keyboard (WASD/arrow keys) and touch (virtual joystick), with settings for volume, screen size, UI scale,
  minimap, screen shake, reduced flashing, hit numbers and frustration bars. Sound is off by default.

## Weapons, passives and combinations

Every weapon goes from level 1 to 9 (one level per card). At level 9, with its passive at any level, the combination is offered as a highlighted «level 10» card; after it the weapon takes no more cards. Passives go to level 5. The caps live in one place, `CONFIG.limits` in `js/config.js`, and the debug overlay warns if anything ever goes over them. New in v7.2 (Endringsprompt 6) is marked in **bold**.

| Weapon (level 1–9) | Added | + Passive | = Combination (level 10) | Combination added |
| --- | --- | --- | --- | --- |
| Skru av og på | original | Ekstra RAM | Full omstart | original |
| Toner-kast | original | Papirskuff | Kontorprinteren fra helvete | original |
| Passord-reset | original | Raskere SSD | Tofaktor | original |
| HDMI-kabelen | original | Lang skjøteledning | Kabelkaos | original |
| Fjernstyring | original | Admin-rettigheter | Domene-admin | original |
| Trådløse mus | original | Nye batterier | Musematta | original |
| Ctrl+Z | original | Hurtigtaster | Ctrl+Alt+Del | original |
| Oppdateringsstrålen | original | Shopkeeperen | Tvungen oppdatering | original |
| Teams-varsel | original | Dobbel skjerm | Allmøte på Teams | original |
| Skytsengelen | original | Større boks | Himmelsk serviceavtale | original |
| Støydempende headset | original | Ergonomisk stol | Hjemmekontor | original |
| Ping-pong | v7.0 | Joggesko | Ping of Death | v7.0 |
| Livvakten | v7.0 | Brannmur | Neste generasjons brannmur | **new in v7.2** |
| Skytsengelen (level 9 or combined) + Livvakten (level 9 or combined) | v7.0 | Shopkeeperen | The Matrix (special) | v7.0 (Livvakten combined also accepted from **v7.2**) |

| Passive (level 1–5) | Added | Effect per level | Used in combination |
| --- | --- | --- | --- |
| Ekstra RAM | original | +10 % større område på alle våpen. | Full omstart |
| Papirskuff | original | +5 % hjelp på alle våpen. | Kontorprinteren fra helvete |
| Nye batterier | original | +10 % varighet og hastighet på våpen. | Musematta |
| Raskere SSD | original | −8 % tid mellom hver aktivering av våpen. | Tofaktor |
| Joggesko | original | +8 % bevegelseshastighet. | Ping of Death |
| Større boks | original | +20 maks energi og fyller opp 20 energi. | Himmelsk serviceavtale |
| Lang skjøteledning | original | +25 % større radius for å plukke opp ticket-lapper. | Kabelkaos |
| Admin-rettigheter | original | +10 % hjelp på alle våpen. | Domene-admin |
| Dobbel skjerm | v3 | +5 % sjanse for at et våpen aktiveres to ganger på rad. | Allmøte på Teams |
| Hurtigtaster | v3 | +12 % fart på prosjektiler, bumeranger og kjeder. | Ctrl+Alt+Del |
| Ergonomisk stol | v3 | −6 % skade fra treff. | Hjemmekontor |
| Shopkeeperen | v3 (renamed v7.0) | +8 % erfaring fra ticket-lapper. | Tvungen oppdatering, The Matrix |
| Kaffemaskin | v5–6 (other developer) | +5 % kritisk sjanse (kritiske treff gir ekstra hjelp). | – |
| Mekanisk tastatur | v5–6 (other developer) | +25 % hjelp fra kritiske treff. | – |
| Overtid | v5–6 (other developer) | +15 % hjelp på alle våpen, men −4 % bevegelseshastighet. | – |
| Hev-senk-pult | v5–6 (other developer) | +0,35 energi per sekund i regenerering. | – |
| Brannmur | v5–6 (other developer) | +6 % sjanse for å unngå et treff helt. | Neste generasjons brannmur (**new in v7.2**) |
| Hesteskoen | v5–6 (other developer) | +25 % flaks: sjeldnere kort oftere, og +12 % sjanse for et fjerde kort. | – |
| Kastekurs | v6 (other developer) | +15 % hjelp fra prosjektilvåpen: Toner-kast, Ctrl+Z, Teams-varsel og Ping-pong. | – |
| Nettverkssertifisering | v6 (other developer) | +15 % hjelp fra kjedevåpen: Passord-reset og Fjernstyring. | – |
| Åpent landskap | v6 (other developer) | +15 % hjelp fra områdevåpen: Skru av og på, Trådløse mus, HDMI-kabelen og Oppdateringsstrålen. | – |
| Sommervikar | v6 (other developer) | +15 % hjelp fra hjelperne: Skytsengelen, Livvakten og Støydempende headset. | – |
| Sikkerhetskopi | v6.1 (other developer) | Overlever ett dødelig treff per vakt (maks 3) og får halv energi tilbake. | – |
| Takknemlige advokater | v6.1 (other developer) | +0,04 energi for hver advokat du hjelper. | – |
| Post-it-blokk | v6.1 (other developer) | Lappene gir full erfaring og full poengverdi i 2 sekunder lenger. | – |
| Bonusordning | v6.1 (other developer) | +10 % poeng fra lapper, hastesaker og bosser. | – |
| Termos | v6.1 (other developer) | Energidrikken gir +10 energi og sukkerkicket varer 2 sekunder lenger. | – |
| Vaktmester | v6.1 (other developer) | −15 % treghet fra papirbunker, blekk og ventemusikk. | – |

## Requirements

- **Node.js 22.5 or newer** (uses the built-in `node:sqlite`, so you don't need `npm install`).
- A modern browser: Chrome, Edge, Firefox or Safari.

## Quick start

```bash
git clone <your-repo-url> help-desk-survivors
cd help-desk-survivors
npm start
```

Then open <http://localhost:3000>.

`npm start` is the same as `node server/server.js`. There are no dependencies to install.

**On Windows without Node.js** (but with VS Code installed), run `start.ps1`. It uses the Node runtime that
ships with VS Code:

```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

> The game has to be served over http(s). Opening `index.html` directly from disk (`file://`) won't work,
> because browsers block ES modules there.

### Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `server/data` | Where the leaderboard database (`leaderboard.db`) is stored |

Example: `PORT=8080 DATA_DIR=/var/lib/hds node server/server.js`

## How to play

- **Move:** WASD or arrow keys, or drag a finger on touch screens. You never aim or attack; all weapons fire automatically.
- **Level-up cards:** click, or press **1**, **2** or **3**.
- **Pause:** Esc or P, or the pause button on touch screens.
- Pick up the yellow tickets while they are fresh (they never disappear, but their points go stale). Look for
  **energy drinks** and the **Sky-synk** cloud around the map (follow the green arrow), and follow the gold arrow when
  you are called to a capture point.
- **Bosses** show a big countdown at the top of the screen. Help them before it runs out, or you're fired. Every
  boss attack is warned (a pose, a light or a «!») just before it comes, so watch the boss and dodge.

## Deployment

**Everything on one server (recommended):** copy the repository to a server, run `npm start` (for example
as a systemd service, Windows service or `pm2`), and share the URL. The server delivers both the game and
the leaderboard API.

- Only `index.html`, `css/`, `js/` and `fonts/` are served publicly. The server code and database are not.
- Behind a reverse proxy (nginx, IIS, Caddy), forward both `/` and `/api/` to the Node server.
- Keep `DATA_DIR` on a normal local disk, not in a OneDrive/Dropbox-synced folder, because syncing can lock SQLite files.
- The server rejects unrealistic scores and rate-limits submissions. This is light anti-cheat meant for a
  friendly internal competition.

**Static hosting only:** `index.html`, `css/`, `js/` and `fonts/` can go on any static host. For example,
`python -m http.server` works for local testing. The game is fully playable, but it shows "Topplisten er
utilgjengelig" (leaderboard unavailable) until `/api/leaderboard` and `/api/score` respond. To use different
storage, replace `fetchLeaderboard(date)` and `submitScore(entry)` in `js/leaderboard.js`.

### Leaderboard API

| Method | Path | Body / query | Response |
| --- | --- | --- | --- |
| `GET` | `/api/leaderboard` | `?date=YYYY-MM-DD&name=<name>` | `{ date, top: [...], own, count }` (top 20, plus your own rank; each entry has `fired`) |
| `POST` | `/api/score` | `{ name, date, character, score, time, helped, maxMult, fired }` | `{ ok, improved, spot }` |

## Project structure

```
index.html            Page and menus
css/style.css         Menu and HUD styling
fonts/                Pixel font «KontorPiksel» (generated, CC0)
js/config.js          ALL balance numbers (weapons, enemies, curve, characters …)
js/game.js            Game state and fixed-timestep update (60 per second)
js/player.js          The player (movement, energy, pickups)
js/enemies.js         Lawyers and spawning
js/bosses.js          The four bosses: order, countdown («fired»), attacks and enemy projectiles
js/weapons.js         Weapons and combinations
js/upgrades.js        Level-up cards and passives
js/tickets.js, js/score.js   Tickets / energy drinks / new PC, points and multiplier
js/map.js             Office map layout (zones, decorations, doors, capture-point spots)
js/capture.js         Capture-point events (take a spot on the map for a permanent bonus)
js/renderer.js        World renderer (640 × 360 pixel art)
js/hud.js             HUD and minimap
js/figures.js         Characters and lawyers (palette-indexed pixel grids)
js/sprites.js, js/icons.js, js/pixel.js, js/pixelfont.js   Graphics
js/settings.js, js/sound.js, js/input.js   Settings, sound (Web Audio), keyboard/touch
js/leaderboard.js     Leaderboard client
js/main.js, js/ui.js  Game loop, menus, debug mode
server/server.js      Static file server + leaderboard API (SQLite)
tools/                Balance simulator, weapon measurement, font generator
```

## Development tools

| Command | What it does |
| --- | --- |
| `npm run simulate` | Bots play full runs in seconds and report survival times, plus determinism checks |
| `npm run measure-weapons` | Measures help per second for every weapon at level 9, as its combination (level 10) and The Matrix |
| `npm run bot-test` | The automatic test player plays 2 × 120 rounds with different run seeds and characters, and reports round length, combination timing, level pace, help per second per weapon, bosses' fire rates, capture points and card offer counts |
| `npm run build-font` | Rebuilds `fonts/kontorpiksel.ttf` from the glyphs in `js/pixelfont.js` |

On Windows without Node.js: `powershell -File tools/node.ps1 tools/simulate.js`.

**Debug mode:** add `?debug` to the URL for a performance overlay (FPS, frame time, entity counts, memory,
help per second per weapon, level-up pace) and buttons to skip time, level up, spawn bosses, start each capture-point
event, drop a Sky-synk and run a 5-minute stress test.
`?debug&utenGPU` forces software rendering (the worst case for an office PC). `?debug=karakterer` shows a
preview of the four playable characters, the final boss and Anonymous. `?debug=boss1` … `?debug=boss4` jumps straight to
that boss with a typical build for the time. Runs where debug buttons were used are never submitted to the leaderboard.

## Customising

All balance numbers are in **[`js/config.js`](js/config.js)**, with a comment on every field. That includes
character names, titles, starting weapons and bonuses (`CONFIG.characters`), the bosses' names, lines,
countdowns and attacks (`CONFIG.bosses`), the elites (`CONFIG.elites`), the events (`CONFIG.events`), the card
tiers and effect modifiers (`CONFIG.upgrades`), and each weapon's `base` numbers and `growth` rules (one card = one
step of one rule; counts have a hard cap for performance). See [DOKUMENTASJON.md](DOKUMENTASJON.md)
(Norwegian) for how to tune difficulty, edit the map and change the graphics.

## License

No license has been chosen yet. Add a `LICENSE` file before publishing if others should be allowed to reuse the code.
The pixel font in `fonts/` is CC0 (see `fonts/LISENS.txt`).
