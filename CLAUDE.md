# CLAUDE.md – Help Desk Survivors

«Har du prøvd å skru den av og på?» is a browser-based, pixel-art bullet hell / survivors game set in an
office. The player is the IT department. Stressed lawyers walk up with IT problems, the player's IT
"solutions" fire automatically, helped lawyers leave with a thumbs-up and drop a support ticket. Survive the
shift, collect tickets, climb the shared daily leaderboard.

This file describes the design we are building toward and how we work. It deliberately does not describe the
current module layout or class structure. Those will change as the project matures. Read the code, the
graphify graph and `DOKUMENTASJON.md` for the current implementation.

## Design pillars

Every feature should be checked against these. If a proposal conflicts with a pillar, raise it before building.

1. **Office comedy, kind at heart.** The humour comes from recognisable IT-support life: password resets,
   Teams alerts, printers from hell, "have you tried turning it off and on again". Lawyers are not enemies to
   be killed. They are frustrated colleagues to be helped, and they leave happy. Nothing in the game should
   mock a real person or a real group of people.
2. **Automatic attacks, deliberate movement.** The player never aims or presses a fire button. Skill lives in
   positioning, dodging telegraphed attacks, picking up tickets and energy before they expire, and choosing
   upgrades. Any new weapon or mechanic must fit that model.
3. **Same shift for everyone.** All randomness is seeded from today's date in Norwegian time ("Dagens vakt").
   Two players making the same choices get the same waves, the same upgrade offers and the same boss timing.
   This is what makes the daily leaderboard fair and what lets bots validate balance. Never introduce
   unseeded randomness into anything that affects gameplay. Cosmetic variation uses its own random stream so
   it can never influence the outcome.
4. **Readable under pressure.** Every attack that can hurt the player is telegraphed first: a pose, a light,
   an exclamation mark, a line on the floor. Bosses show a visible countdown. The player should always be
   able to say "I saw that coming and I failed to dodge", never "that came out of nowhere".
5. **Runs on the worst office PC.** Target hardware is a locked-down corporate laptop with no GPU
   acceleration, in a browser the player does not control. Measure frame time in software rendering before
   accepting a feature. Entity caps, pooling and quality scaling are part of the design, not an afterthought.
6. **Small and self-contained.** No external assets, no third-party scripts, no tracking. Sprites, font and
   sound are generated in code. The whole game should stay small enough to drop on an intranet and forget.

## Core game design

### Setting and tone
- One office floor with distinct zones (open plan, canteen, lifts, meeting rooms, printer room, reception,
  lounge). Decor is readable and never blocks movement. Only the outer walls do.
- Visual style is low-resolution pixel art rendered at a fixed 16:9 virtual resolution and scaled with crisp
  pixels. Every player sees the same area of the map regardless of screen.
- Lawyers are procedurally composed from layered traits (skin tone, age, body, hair, glasses, beard, hijab,
  accessories, clothing) with even distribution. Diversity is the default look of the office, not a feature flag.
- All in-game text is Norwegian bokmål. Code, comments, commit messages and developer docs are English.
  Player-facing strings are data, not hardcoded in logic, so they can be rewritten without touching behaviour.
- Sound is off by default. It is an office.

### The run
- A run is one shift. The clock counts up. Difficulty rises linearly, with scheduled and rare events for
  variety, and a steep "overtime" wall that caps realistic runs around the fifteen-minute mark. The last boss
  and beyond should be decided by the build and the luck of the cards. There is no win state, only how far you got.
- Helping lawyers gives experience. Levelling up offers a choice of cards: a new weapon, a weapon upgrade, or
  a passive. Weapon slots and passive slots are capped so builds have to be chosen, not hoarded.
- Tickets dropped by helped lawyers are the score pickup. Letting them expire is the cost of playing badly.
  A score multiplier rewards keeping a streak going.
- Energy is the player's health. It drains from contact and attacks, and is restored by rare pickups the
  player has to go and fetch (an arrow points the way). Fetching them is a risk/reward decision.
- Special lawyer types change the pressure: at least one ranged type that keeps its distance and sends
  projectiles. Ranged and boss projectiles share a global cap so the screen never becomes unreadable.

### Weapons, passives and combinations
- Weapons are IT solutions with a joke name and a distinct firing pattern (orbit, chain, boomerang, beam,
  homing, shield, summon, area). A weapon has no level cap: every level-up card is one specific increment
  (help, interval, count, range, or an effect modifier), cards have a rarity tier, and counts are capped for
  performance. Enough increments plus a specific passive unlock a combination with a new name and a clearly
  bigger effect, which the later increments keep growing from.
- Discovered combinations are shown on an in-game notice board so players learn the recipes by playing.
- Passives are simple stat changes with office names (faster SSD, ergonomic chair, certification).
- Every weapon should be measurable in isolation (help per second) and its combination should be in a
  known band relative to the others. Balance is tuned with the tools, then play-tested.

### Characters
- A small roster of playable IT staff, each with its own starting weapon and a small bonus that nudges a
  playstyle. The choice is remembered, shown next to the energy bar, on the game-over screen and in the
  leaderboard. The leaderboard is shared across characters.
- Characters are drawn from reference photos that are never committed or published. The repo only contains
  pixel figures.

### Bosses
- Bosses arrive on a fixed schedule in a fixed order, and they are mandatory. Each has a visible countdown.
  If it runs out before the boss is helped, the player is fired («Du har fått sparken!») and the shift ends.
  Fired runs can still be submitted and are marked on the leaderboard.
- Each boss is a caricature of an IT-support archetype (the consultant, the multifunction printer, the
  urgent deadline, the manager) with a small set of telegraphed attacks that teach a dodge pattern.
- The final boss returns at a regular interval and grows stronger each time, and from mid-frustration can
  borrow earlier bosses' attacks. That recurrence is the late-game pressure.
- While a boss is active, regular spawns thin out so the fight is readable. A boss far from the player
  closes the distance rather than being ignored.
- Boss names, lines, timings and attack parameters are data and are expected to be rewritten.

### Leaderboard and fairness
- One leaderboard per calendar day in Norwegian time, resetting at midnight. One entry per name,
  case-insensitive, best run wins. Entries record character, score, time, lawyers helped, max multiplier
  and whether the player was fired.
- The server applies light anti-cheat: plausibility limits on score and time, and rate limiting. This is for a
  friendly internal competition, not a hostile internet. Do not over-engineer it, but never trust the client.
- Runs where debug tools were used are never submitted.
- The game must remain fully playable with no server. The leaderboard degrades to an "unavailable" notice.

### Accessibility and settings
- Keyboard and touch are first-class. Touch uses a virtual joystick and on-screen pause.
- Settings cover volume, fullscreen, game scale, UI scale, minimap size, screen shake, reduced flashing, hit
  numbers and frustration bars.
  Reduced flashing defaults on when the browser reports reduced motion. All settings persist locally and
  apply immediately.
- Any new visual effect must respect the reduced-flashing setting. Any new input must work on touch.

## Engineering principles

These describe how we build, not what the files are called today.

- **One source of truth for balance.** Every tunable number lives in one configuration layer with a comment
  on each field. Game logic reads configuration; it never embeds magic numbers. A designer should be able to
  retune the game without reading logic.
- **Fixed timestep simulation, decoupled rendering.** Game state advances in fixed ticks. Rendering reads
  state and never mutates it. This is what keeps determinism and the simulator honest.
- **Determinism is tested, not assumed.** The bot simulator replays runs and asserts that identical choices
  produce identical results, including with every optional random stream in play, and that cosmetic
  variation has no effect on outcome. A change that breaks that assertion is a bug, however small.
- **Performance budgets are explicit.** Entity caps, projectile caps, object pools, spatial partitioning for
  collisions and automatic quality scaling are maintained deliberately. The debug stress test in software
  rendering is the acceptance test for anything that adds entities or draw calls.
- **Data over code for content.** Weapons, passives, combinations, characters, bosses, map zones and decor,
  figure traits and strings are data. Adding content should mean adding data and, at most, one new behaviour
  hook. If adding a weapon requires touching five systems, the abstraction is wrong.
- **No build step, for now.** Plain ES modules served over HTTP, no npm dependencies, Node with built-in
  SQLite on the server. This may change as the project grows. If a build step or framework is introduced, it
  must not break the "runs on a locked-down office PC" pillar or the small-footprint pillar.
- **Debug mode is a product feature.** The `?debug` overlay, time skipping, boss jumps, forced builds and the
  stress test are how we validate changes. Keep them working, and keep them out of leaderboard submissions.

## How to work in this repo

### Running and testing
- `npm start` serves the game and the leaderboard API. Open http://localhost:3000. The game must be served
  over HTTP; `file://` does not load ES modules.
- `npm run simulate` runs bot playthroughs and determinism checks. Run it after any change to gameplay,
  balance, spawning, upgrades, bosses or randomness.
- `npm run measure-weapons` reports help per second for every weapon and combination. Run it after any
  weapon or passive change and sanity-check the band.
- `?debug` in the browser for the overlay, `?debug&utenGPU` for software rendering, `?debug=boss1` through
  `?debug=boss4` to jump to a boss, `?debug=karakterer` to preview the characters.
- Windows machines without Node can use `start.ps1` and `tools/node.ps1`, which borrow the Node runtime
  bundled with VS Code.

### Definition of done for a feature
1. Matches the design pillars above, or the conflict was discussed and documented.
2. Tunables are in configuration with comments. Player-facing strings are Norwegian bokmål and live in data.
3. Simulator passes, including determinism checks.
4. Measured in software rendering under the stress test if it adds entities, projectiles or draw work.
5. Works with keyboard and touch, and respects reduced-flashing and other settings.
6. `DOKUMENTASJON.md` (Norwegian, for the people running the competition) and `ENDRINGSLOGG.md` (Norwegian
   changelog) are updated. README is updated if the public surface changed.

### Code and language conventions
- English identifiers, comments and commit messages. Norwegian only in player-facing strings and the two
  Norwegian docs.
- Prefer small, pure functions over stateful helpers. Rendering code must not mutate game state.
- Never call `Math.random()` in gameplay or cosmetic code. Use the seeded streams.
- Do not add dependencies, external scripts, images or audio files without discussing it first.
- Do not commit reference photos of real people, the leaderboard database, or anything under `server/data/`.

### Using the knowledge graph (graphify)
A graphify knowledge graph of this repo lives in `graphify-out/`. Use it to understand blast radius before
changing anything, since several core modules are mutually dependent.

- Before touching gameplay: `graphify query "<what you are about to change>"` to see which modules,
  docs and concepts are connected.
- To check whether a dependency already exists before adding one: `graphify path "<A>" "<B>"`.
- To get a plain-language description of a symbol or concept: `graphify explain "<name>"`.
- After committing code changes the post-commit hook, if installed, rebuilds the code side of the graph.
  After editing the Norwegian docs, run `/graphify --update` so doc-to-code links stay current.
- If the graph and the code disagree, the code wins. Rebuild the graph.

## Direction

The game started as an internal competition entry and is moving toward a more structured indie production.
Expect module boundaries, data formats and tooling to be reorganised. When that happens, update this file's
engineering principles if they genuinely change, but keep the design pillars stable unless the game itself
changes direction. The pillars are the product.
