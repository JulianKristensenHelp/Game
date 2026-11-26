# Graph Report - Game  (2026-11-26)

## Corpus Check
- 37 files · ~76,939 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .ttf 1)

## Summary
- 589 nodes · 1461 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 142 edges (avg confidence: 0.87)
- Token cost: 118,851 input · 0 output

## Community Hubs (Navigation)
- Boss, Enemy & Effects Logic
- Figure Drawing & Portraits
- Main Loop, Input & Leaderboard Client
- HUD & Renderer
- Map, Utils, Pools & RNG
- Weapons & Activators
- Font Builder Tables
- Settings & Sound
- Changelog: v2 Pixel Art & Performance
- Leaderboard Server
- Package Manifest
- Bosses & Firing Rules (Docs)
- Config, Daily Seed & Project Docs
- Bitmap Pixel Font
- Index.html Screens & Debug Mode
- Game Overview, Font & License
- Changelog: v3 Difficulty & Characters
- Font Binary Buffer
- Chain, Homing & Angel Weapons (Docs)
- Score Store Backends
- Quick Start & Requirements
- Changelog: v1.0

## God Nodes (most connected - your core abstractions)
1. `Raster` - 30 edges
2. `Hud` - 21 edges
3. `Renderer` - 20 edges
4. `CONFIG` - 18 edges
5. `Game` - 18 edges
6. `el()` - 17 edges
7. `Rng` - 16 edges
8. `toCanvas()` - 15 edges
9. `spawnEnemy()` - 14 edges
10. `help()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Multifunksjonsmonsteret (boss 2, 6:00)` --references--> `drawPrinterBoss()`  [EXTRACTED]
  DOKUMENTASJON.md → js/figures.js
- `Four playable characters` --references--> `drawPortrait()`  [EXTRACTED]
  DOKUMENTASJON.md → js/figures.js
- `KontorPiksel pixel font` --semantically_similar_to--> `KontorPiksel font license notice`  [INFERRED] [semantically similar]
  DOKUMENTASJON.md → fonts/LISENS.txt
- `Daily leaderboard (toppliste)` --references--> `fetchLeaderboard()`  [EXTRACTED]
  DOKUMENTASJON.md → js/leaderboard.js
- `Deployment (single server or static hosting)` --references--> `fetchLeaderboard()`  [EXTRACTED]
  README.md → js/leaderboard.js

## Import Cycles
- 2-file cycle: `js/bosses.js -> js/enemies.js -> js/bosses.js`
- 2-file cycle: `js/enemies.js -> js/tickets.js -> js/enemies.js`
- 3-file cycle: `js/enemies.js -> js/player.js -> js/weapons.js -> js/enemies.js`
- 4-file cycle: `js/bosses.js -> js/player.js -> js/weapons.js -> js/enemies.js -> js/bosses.js`
- 4-file cycle: `js/enemies.js -> js/tickets.js -> js/player.js -> js/weapons.js -> js/enemies.js`

## Hyperedges (group relationships)
- **Fixed boss order: Nørdic (3:00), Printer (6:00), Fristen (9:00), Johan (12:00+)** — endringslogg_nordic_konsulenten, endringslogg_multifunksjonsmonsteret, endringslogg_fristen_boss, endringslogg_johan, endringslogg_sparken [EXTRACTED 1.00]
- **Performance measures for office PCs without GPU** — endringslogg_performance_v2, endringslogg_sprite_atlas, endringslogg_object_pools, endringslogg_spatial_grid, endringslogg_auto_quality, endringslogg_pixel_art_style [EXTRACTED 1.00]
- **Determinism via seeded separate RNG streams (Dagens vakt)** — dokumentasjon_dagens_vakt, endringslogg_rng_streams, dokumentasjon_dobbel_skjerm, endringslogg_energy_drink, endringslogg_lawyer_diversity, endringslogg_auto_quality, dokumentasjon_simulate [INFERRED 0.85]

## Communities (24 total, 5 thin omitted)

### Community 0 - "Boss, Enemy & Effects Logic"
Cohesion: 0.06
Nodes (81): activeBoss(), addPuddle(), ATTACKS, bossContactDamage(), bossHelped(), bossHelpFactor(), bossTimeAt(), bossTypeAt() (+73 more)

### Community 1 - "Figure Drawing & Portraits"
Cohesion: 0.06
Nodes (59): ACCENTS, anchor(), BEARD_OK, CLOTHES, COMMON, drawAny(), drawFigure(), drawPortrait() (+51 more)

### Community 2 - "Main Loop, Input & Leaderboard Client"
Cohesion: 0.06
Nodes (68): Daily leaderboard (toppliste), iconElement(), Input, fetchLeaderboard(), request(), submitScore(), chooseCard(), closeSettings() (+60 more)

### Community 3 - "HUD & Renderer"
Cohesion: 0.11
Nodes (9): figureType(), bannerActiveFor(), Hud, makeDecor(), ctx2d(), textWidth(), Renderer, drawSprite() (+1 more)

### Community 4 - "Map, Utils, Pools & RNG"
Cohesion: 0.06
Nodes (31): SENDER_BUBBLES, TYPE_NAMES, makeVariants(), POSE, TILE, SYMBOL, weaponIconId(), DOORS (+23 more)

### Community 5 - "Weapons & Activators"
Cohesion: 0.15
Nodes (28): effect(), help(), activateCtrlz(), activateHdmi(), activatePassword(), activatePowerCycle(), activateRemote(), activateTeams() (+20 more)

### Community 6 - "Font Builder Tables"
Cohesion: 0.07
Nodes (24): chars, cmap, codes, file, glyph_, glyphs, head, hhea (+16 more)

### Community 7 - "Settings & Sound"
Cohesion: 0.13
Nodes (9): defaults(), LEGACY_KEYS, LEGACY_VALUES, migrate(), reduceMotion(), Settings, Sound, SOUNDS (+1 more)

### Community 8 - "Changelog: v2 Pixel Art & Performance"
Cohesion: 0.13
Nodes (13): Code-drawn pixel graphics (palette-indexed grids), Settings menu (Innstillinger), Visibly happy lawyers (thumbs-up animation), Bigger HUD (energy-drink bar, 48px icons), Procedurally composed diverse lawyers, Max 4 weapons, Four new weapons/passives/combinations (v3), Pixel art style at 640x360 (v2) (+5 more)

### Community 9 - "Leaderboard Server"
Cohesion: 0.13
Nodes (15): dateOslo(), FOLDER, json(), leaderboard(), maxRealisticScore(), MIME, OLD_FIELDS, OPEN (+7 more)

### Community 10 - "Package Manifest"
Cohesion: 0.15
Nodes (12): description, engines, node, name, private, scripts, build-font, measure-weapons (+4 more)

### Community 11 - "Bosses & Firing Rules (Docs)"
Cohesion: 0.26
Nodes (10): Bosses (fixed order, mandatory), Johan (final boss, 12:00, returns every 3 min), Multifunksjonsmonsteret (boss 2, 6:00), Nørdic-konsulenten (boss 1, 3:00), Johan (final boss), Leaderboard plausibility limits, Multifunksjonsmonsteret (boss 2), Nørdic-konsulenten (boss 1) (+2 more)

### Community 12 - "Config, Daily Seed & Project Docs"
Cohesion: 0.20
Nodes (10): js/config.js (all balance numbers), File overview (js modules, server, tools), Office map (2560x1440, zones, decor, doors), tools/simulate.js (bot balance simulator), Bounded office map and minimap (v2), Version 3.1: code translated to English, Customising via js/config.js, Today's shift (Dagens vakt) seeding (+2 more)

### Community 13 - "Bitmap Pixel Font"
Cohesion: 0.23
Nodes (8): allChars(), BitmapFont, G, glyph(), HEIGHT, OVER, parsed, UNDER

### Community 14 - "Index.html Screens & Debug Mode"
Cohesion: 0.25
Nodes (11): Four playable characters, Debug mode (?debug overlay and buttons), Stress test (5 min, 400 lawyers, utenGPU), #characterSelect screen, #debug panel (overlay and debug buttons), #gameOver screen (portrait, fired line, bosses, stats, submit form), #levelUp screen (upgrade cards), index.html (page and menus) (+3 more)

### Community 15 - "Game Overview, Font & License"
Cohesion: 0.27
Nodes (8): tools/build-font.js (font generator), Help Desk Survivors (game overview), KontorPiksel pixel font, CC0 1.0 Universal (Public Domain Dedication), KontorPiksel font license notice, Four bosses in fixed order, mandatory, Help Desk Survivors (README overview), License (none chosen; font is CC0)

### Community 16 - "Changelog: v3 Difficulty & Characters"
Cohesion: 0.24
Nodes (8): «Fristen er om 2 minutter!» (boss 3, 9:00), «Haster!»-avsenderen (ranged email lawyer), tools/measure-weapons.js (help per second), Four playable characters (v3), Difficulty curve v2 (phases, ~15 min cap), «Fristen er om 2 minutter!» (boss 3), «Haster!»-avsenderen (v3 ranged lawyer), Version 3.0 (endringsprompt 2): difficulty, characters, sender, new weapons

### Community 18 - "Chain, Homing & Angel Weapons (Docs)"
Cohesion: 0.25
Nodes (8): Passord-reset (chain weapon) / Tofaktor, Skytsengelen (guardian angel weapon), Teams-varsel (homing alerts) / Allmøte på Teams, Weapons, passives and combinations, Passord-reset as chain weapon / Tofaktor, Skytsengelen (new weapon) / Himmelsk serviceavtale, Teams-varsel homing alerts / Allmøte på Teams, #noticeBoard (discovered combinations)

### Community 19 - "Score Store Backends"
Cohesion: 0.50
Nodes (3): makeFileStore(), makeSqliteStore(), renameOldDataFile()

## Knowledge Gaps
- **9 isolated node(s):** `Version 1.0: first version`, `Visibly happy lawyers (thumbs-up animation)`, `Max 4 weapons`, `Requirements: Node.js 22.5+ with node:sqlite`, `Quick start (npm start / start.ps1)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 156 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Daily leaderboard (toppliste)` connect `Main Loop, Input & Leaderboard Client` to `Bosses & Firing Rules (Docs)`, `Index.html Screens & Debug Mode`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **What connects `Version 1.0: first version`, `Visibly happy lawyers (thumbs-up animation)`, `Max 4 weapons` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Boss, Enemy & Effects Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.05695970695970696 - nodes in this community are weakly interconnected._
- **Why does `drawPortrait()` connect `Figure Drawing & Portraits` to `Index.html Screens & Debug Mode`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Figure Drawing & Portraits` be split into smaller, more focused modules?**
  _Cohesion score 0.06327160493827161 - nodes in this community are weakly interconnected._
- **Why does `Leaderboard plausibility limits` connect `Bosses & Firing Rules (Docs)` to `Changelog: v2 Pixel Art & Performance`, `Main Loop, Input & Leaderboard Client`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Should `Main Loop, Input & Leaderboard Client` be split into smaller, more focused modules?**
  _Cohesion score 0.057124310288867254 - nodes in this community are weakly interconnected._