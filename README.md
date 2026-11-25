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
  images or sound files. Everything (sprites, pixel font, sound) is generated in code. The total size is about 0.4 MB.
- **Pixel art** rendered at 640 × 360 and scaled up with crisp pixels. Every screen sees the same area of the map.
- **Four playable characters**, each with its own starting weapon and bonus.
- **11 weapons** (max 4 at once), **12 passives** (max 6 at once) and **11 combinations** (evolutions), including a
  chain-lightning key, homing Teams alerts and a guardian angel who throws mini printers.
- **Diverse, procedurally composed lawyers**, including a ranged type that sends «Haster!» emails.
- **Four different bosses in a fixed order** (3:00, 6:00, 9:00 and the final boss at 12:00, who returns every
  3 minutes after that), each with its own telegraphed attacks. Bosses are mandatory: if a boss's countdown
  runs out, you're fired («Du har fått sparken!») and the shift ends.
- **"Today's shift" (Dagens vakt):** all randomness is seeded from today's date (Europe/Oslo), so everyone
  plays the same waves and gets the same upgrade offers for the same choices.
- **Shared daily leaderboard** using a tiny Node.js server with built-in SQLite. It resets at midnight Norwegian time.
- Keyboard (WASD/arrow keys) and touch (virtual joystick), with settings for volume, screen size, UI scale,
  minimap, screen shake and reduced flashing. Sound is off by default.

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
- Pick up the yellow tickets before they disappear. Look for **energy drinks** around the map (follow the green arrow).
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
js/map.js             Office map layout (zones, decorations, doors)
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
| `npm run measure-weapons` | Measures help per second for every weapon at level 8 and as a combination |
| `npm run build-font` | Rebuilds `fonts/kontorpiksel.ttf` from the glyphs in `js/pixelfont.js` |

On Windows without Node.js: `powershell -File tools/node.ps1 tools/simulate.js`.

**Debug mode:** add `?debug` to the URL for a performance overlay (FPS, frame time, entity counts, memory,
help per second per weapon) and buttons to skip time, level up, spawn bosses and run a 5-minute stress test.
`?debug&utenGPU` forces software rendering (the worst case for an office PC). `?debug=karakterer` shows a
preview of the four playable characters and the final boss. `?debug=boss1` … `?debug=boss4` jumps straight to
that boss with a typical build for the time. Runs where debug buttons were used are never submitted to the leaderboard.

## Customising

All balance numbers are in **[`js/config.js`](js/config.js)**, with a comment on every field. That includes
character names, titles, starting weapons and bonuses (`CONFIG.characters`), and the bosses' names, lines,
countdowns and attacks (`CONFIG.bosses`). See [DOKUMENTASJON.md](DOKUMENTASJON.md)
(Norwegian) for how to tune difficulty, edit the map and change the graphics.

## License

No license has been chosen yet. Add a `LICENSE` file before publishing if others should be allowed to reuse the code.
The pixel font in `fonts/` is CC0 (see `fonts/LISENS.txt`).
