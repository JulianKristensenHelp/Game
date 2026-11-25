# «Har du prøvd å skru den av og på?» – Help Desk Survivors

Et nettleserspill for den interne konkurransen hos Help Forsikring. Du er IT-personen, advokatene kommer
med IT-problemer, og IT-løsningene dine gjør dem glade. Best runde i løpet av dagen vinner.

Spillet er rene statiske filer (HTML, CSS og JavaScript med ES-moduler) i detaljert pixel art.
Ingen byggesteg, ingen npm-pakker, ingen eksterne skript, bilder eller lydfiler. Samlet størrelse er ca. 0,3 MB.
Hva som er nytt i versjon 2, står i [ENDRINGSLOGG.md](ENDRINGSLOGG.md).

## Slik kjører du spillet

Du trenger **Node.js 22.5 eller nyere** (serveren bruker Nodes innebygde SQLite – ingen `npm install`).

```
node server/server.js
```

Åpne deretter <http://localhost:3000>. Annen port: sett miljøvariabelen `PORT`.

På Windows uten Node installert kan du kjøre `start.ps1` – den bruker Node-en som følger med VS Code.
Det samme gjelder verktøyene: `powershell -File tools/node.ps1 tools/simulate.js`.

> Spillet må åpnes via en webserver (http/https). Å dobbeltklikke på `index.html` virker ikke,
> fordi nettlesere ikke laster ES-moduler fra `file://`.

## Slik publiserer du internt

**Enklest – alt på én server:** legg hele mappen på en intern maskin og start `node server/server.js`
(gjerne som en tjeneste). Serveren leverer både spillet og topplisten. Del lenken, ferdig.

- Topplisten lagres i `server/data/leaderboard.db` (SQLite). Mappen kan flyttes med `DATA_DIR`.
  **Ikke legg databasen i en OneDrive-/SharePoint-synkronisert mappe** – synkroniseringen kan låse fila.
- Bare `index.html`, `css/`, `js/` og `fonts/` ligger åpent på nett. Server-mappen og databasen gjør det ikke.
- Bak en omvendt proxy (IIS, nginx): send både `/` og `/api/` videre til Node-serveren.

**Bare statiske filer:** `index.html`, `css/`, `js/` og `fonts/` kan legges på hvilken som helst webserver.
Spillet virker da fullt ut, men viser «Topplisten er utilgjengelig» til `api/toppliste` og `api/score`
svarer. Vil dere bruke en annen lagring, bytter dere bare innholdet i de to funksjonene
`fetchLeaderboard(date)` og `submitScore(entry)` i `js/leaderboard.js`.

Topplisten gjelder dagens dato i norsk tid og nullstilles ved midnatt. Hver person står med sin beste
runde (ett innslag per navn, uavhengig av store/små bokstaver). Serveren avviser urealistiske
poengsummer og tider, og begrenser antall innsendinger per minutt.

## Innstillinger

Menyen «Innstillinger» nås fra startskjermen og pausemenyen. Alt lagres lokalt i nettleseren og trer i kraft med en gang.

| Innstilling | Valg | Standard |
| --- | --- | --- |
| Demp alt | av/på | **På** (lyden er av – det er et kontor) |
| Hovedvolum, Lydeffekter | 0–100 % (testlyd når du slipper) | 50 % / 100 % |
| Fullskjerm | av/på (Esc avslutter som vanlig) | av |
| Spillstørrelse | Tilpass til vinduet, 2×, 3×, 4× | Tilpass |
| UI-størrelse | Auto, Liten, Middels, Stor, Ekstra stor | Auto |
| Minikart | Av, Liten, Stor | Liten |
| Skjermristing | av/på | på |
| Reduserte blinkeffekter | av/på | på hvis nettleseren melder «redusert bevegelse» |

Uansett spillstørrelse og skjerm ser alle nøyaktig like stort område av kartet (640 × 360 piksler).
Er skjermen ikke 16:9, fylles kantene med en rolig ramme. «Tilbakestill til standard» setter alt tilbake.

## De fire spillbare karakterene

Etter «Start vakt» velger spilleren én av fire karakterer fra IT-avdelingen (mus, touch, piltaster eller 1–4).
Valget huskes til neste gang, vises som et lite portrett ved energibaren og på slutt-skjermen, og lagres med
hvert innslag i topplisten (portrett ved navnet). Topplisten er felles for alle karakterene.

| Karakter | Startvåpen | Bonus |
| --- | --- | --- |
| 1 | Skru av og på | +20 maks energi |
| 2 | Toner-kast | +10 % hjelp |
| 3 | HDMI-kabelen | +10 % bevegelseshastighet |
| 4 | Trådløse mus | +25 % radius for å plukke opp ticket-lapper |

- **Navn og tittel** står i js/config.js under CONFIG.characters (Odyssefs, Johannes, Jin og Julian, alle med
  tittelen «IT-avdelingen»). Der står også startvåpen og bonus.
- **Utseendet** står i js/figures.js (PLAYERS for figuren og drawPortrait for portrettet på 64 × 64).
- **Forhåndsvisning til godkjenning:** <http://localhost:3000/?debug=karakterer> viser alle fire med portrett,
  animert gangsyklus, glad bilde, navn, tittel, startvåpen og bonus.
- Bildene av personene er bare brukt som forelegg. De ligger ikke i prosjektet og publiseres ikke.

## Våpen, passive og kombinasjoner

Det finnes 11 IT-løsninger (maks 4 samtidig) og 12 passive (maks 6 samtidig). Hvert våpen på nivå 8 pluss
riktig passiv gir en kombinasjon. Disse er nye eller endret i versjon 3 og 4:

| Våpen | + Passiv | = Kombinasjon |
| --- | --- | --- |
| Passord-reset (kjede: hopper fra advokat til advokat, 3–10 hopp) | Raskere SSD | Tofaktor (to kjeder i hver sin retning, 16 hopp hver) |
| Ctrl+Z (bumerang mot nærmeste advokat) | Hurtigtaster | Ctrl+Alt+Del |
| Oppdateringsstrålen (stråle i gangretningen) | Sertifisering | Tvungen oppdatering |
| Teams-varsel (målsøkende varsler mot hver sin advokat) | Dobbel skjerm | Allmøte på Teams (hvert varsel deler seg i tre) |
| Støydempende headset (skjold som blokkerer ett treff) | Ergonomisk stol | Hjemmekontor |
| Skytsengelen (kaster mini-printere) | Større boks | Himmelsk serviceavtale |

Tallene står i CONFIG.weapons og CONFIG.newWeapons. «Dobbel skjerm» bruker en egen tilfeldighetsstrøm, så
samme valg gir samme runde for alle. Skytsengelen har et fast tak på antall mini-printere samtidig (2, 4 eller 6,
og 10 som kombinasjon), likt for alle.

**«Haster!»-avsenderen** (fra 2:30) holder seg 150–200 piksler unna og sender e-poster mot der spilleren
står. Laptopen lyser og et «!» vises 0,5 sekunder før hvert skudd. Maks 15 % av advokatene og maks 30 samtidig,
og maks 60 fiendeprosjektiler på kartet (e-poster og alle bossangrep til sammen).
Tallene står i CONFIG.sender og CONFIG.enemyShots.

## Bossene

Bossene kommer i fast rekkefølge, og de er obligatoriske: går nedtellingen ut før bossen er hjulpet, får
spilleren **sparken**. Spillet fryser kort, bossen ser skuffet ut, «DU HAR FÅTT SPARKEN!» vises, og slutt-skjermen
sier hvilken boss det var. Poengene kan likevel sendes inn, og topplisten viser en liten flytteeske ved runden.

| Tid | Boss | Nedtelling | Angrep |
| --- | --- | --- | --- |
| 3:00 | Nørdic-konsulenten | 120 s | Ventemusikk i en ring (sinker), ticket som deler seg i tre, «Vi ringer deg tilbake» (kan ikke hjelpes i 3 s) |
| 6:00 | Multifunksjonsmonsteret | 120 s | CMYK-patroner som blir blekkdammer, utskriftsjobb på 400 sider, papirstopp (dobbel hjelp i 3 s) |
| 9:00 | «Fristen er om 2 minutter!» | 120 s | En vifte med tre e-poster |
| 12:00 | Johan (siste boss) | 150 s | Spurt, kalenderinvitasjoner, «Alle på møte!», og fra halv frustrasjon også de tidligere bossenes angrep |
| 15:00, 18:00 … | Johan igjen | 150 s | Sterkere for hver gang |

- Alle angrep varsles først (en positur, lys eller et «!» i 0,65 sekunder), og Johans spurt viser en linje.
- Klokka øverst blir gul ved 30 sekunder og rød, blinkende og tikkende ved 10 (blinkingen følger innstillingen
  for reduserte blinkeffekter).
- Mens en boss er ute, kommer det færre vanlige advokater (55 %). En boss som er langt unna, jogger for å ta deg igjen.
- **Navn, replikker og alle tall** står i CONFIG.bosses i js/config.js (`intro`, `line`, `happyText`, Johans
  `title` og `phaseText` er plassholdere som kan endres fritt).
- **Utseendet** står i js/figures.js: NORDIC (konsulenten), drawPrinterBoss (printeren) og JOHAN (figur og
  portrett). Nørdic er et oppdiktet firma med egen logo (krøllparenteser rundt en N) i skoggrønt og lime.
- **Bildet av Johan** er bare brukt som forelegg. Det ligger ikke i prosjektet og publiseres ikke.
- **Test en boss direkte:** <http://localhost:3000/?debug=boss1> til `?debug=boss4` hopper rett til boss 1–4 med
  et typisk bygg for tidspunktet (knappene «Boss 1–4» i debug-panelet gjør det samme).

## Slik justerer du balansen

Alle tall ligger i **`js/config.js`**, med en kommentar på hvert felt. Endre et tall, lagre og last
siden på nytt. De viktigste:

| Vil du … | Endre |
| --- | --- |
| gjøre starten lettere/vanskeligere | `spawn.rate` (de første punktene), `scaling.startAfterMin` |
| gjøre midtspillet lettere/vanskeligere | `scaling.frustrationGrowthPerMin`, `spawn.rate` |
| flytte «veggen» for de beste (nå ca. 15 min) | `scaling.overtimeFromMin` (13), `overtimeGrowthPerMin`, `overtimeSpeedPerMin` |
| gi raskere/tregere nivåopp | `level` (`base`, `perLevel`, `square`) |
| endre et våpen | `weapons.<id>.levels` (én linje per nivå) og `combination.stats` |
| endre hastesaken | `enemies.urgent` |
| endre bossene (navn, replikker, frustrasjon, angrep, nedtelling) | `bosses` |
| endre energidrikken | `energyDrink` (first, interval, max, minDistance) |
| antall våpenplasser | `limits.weapons` (nå 4) |
| endre karakterene | `characters` (navn, tittel, startvåpen, bonus) |
| endre «Haster!»-avsenderen | `sender`, `enemyShots` |

**Test endringene uten å spille:** `node tools/simulate.js [dato] [maks minutter]` lar enkle roboter
spille hele runder på noen sekunder og skriver ut hvor lenge de holder ut, hvilke bosser de hjalp (og hvor fort),
og om runden endte med sparken. Den sjekker også at to like runder gir nøyaktig samme resultat (også med
«Dobbel skjerm»), og at utseendet på advokatene ikke påvirker spillet.

`node tools/simulate.js x 25 --statistikk` kjører 10 dager × 4 karakterer for de gode robotene og skriver ut median,
spredning og hvor mange som fikk sparken. Med tallene som ligger inne nå:

| Robot | Median | 25–75 % | Lengst | Sparket |
| --- | --- | --- | --- | --- |
| God, bygger bevisst | 9,0 min | 6,4–12,1 min | 14,7 min | 2 av 40 |
| Ekspert | 10,5 min | 6,0–13,6 min | 15,5 min | 3 av 40 |

Uten bosser (`--utenbosser`) er tallene 9,6 og 12,4 minutter, så bossene gjør det bare litt vanskeligere. Robotene
ser ikke varslene slik et menneske gjør, så de får mer skade fra bossene enn en oppmerksom spiller. Robotene
svinger mye fra runde til runde og er ikke mennesker. Prøvespill gjerne med noen kolleger.

**Sammenlign våpen og kombinasjoner:** `node tools/measure-weapons.js` måler hjelp per sekund for alle 11 våpen
på nivå 8 og som kombinasjon under like forhold. I debug-modus viser overlegget det samme i spillet
(hjelp per sekund per våpen, siste 10 sekunder).

## Slik endrer du kartet

Kartet er én kontoretasje på 2560 × 1440 piksler med yttervegger, og oppsettet er likt for alle.

- **Soner** (kontorlandskap, kantine, heiser, møterom, printerrom, resepsjon, sofakrok) står i `SONER` i
  `js/map.js`: navn, gulvtype, plassering og farge på minikartet.
- **Pynt** (pulter, stoler, planter, printere, vannkjølere …) står i `lagPynt()` i samme fil, som en liste
  med navn og koordinater. Pynt blokkerer aldri bevegelse – bare ytterveggene gjør det.
- **Dører og heiser** der advokater kommer inn når det er trangt, står i `DOERER`.
- **Glassvegger** (bare pynt) står i `GLASS`.
- Kartets størrelse og veggtykkelse står i `CONFIG.map`.

## Slik endrer du grafikken

All grafikk tegnes med kode som fargeindekserte pikselrutenett (`js/pixel.js`) – ingen bildefiler.

- **Advokatene** lages i `js/figures.js`. Hver figur settes sammen av lag: hudfarge (7), alder, kropp,
  frisyre (10), hårfarge (6), briller, skjegg/bart, øreringer, slips/skjerf, skjørt eller bukser.
  Fargene står øverst i fila (`HUDFARGER`, `HAARFARGER`, `KLAER` osv.), og alle egenskaper fordeles jevnt.
  Typene kjennes igjen på klær, størrelse og det de bærer (laptop, papirbunke, dokumentmappe).
  Antall varianter per type står i `CONFIG.figureVariants`. Utseendet trekkes fra en egen
  tilfeldighetsstrøm og påvirker aldri spillet.
- **Gjenstander, pynt, gulv og effekter** står i `js/sprites.js`.
- **Ikonene** (16 × 16) står i `js/icons.js`.
- **Pikselfonten** «KontorPiksel» (med æ, ø og å) er egenprodusert. Glyfene står i `js/pixelfont.js`.
  Endrer du dem, lag font-fila på nytt med `node tools/build-font.js` (den brukes i menyene).
  Lisens: CC0 (fri bruk), se `fonts/LISENS.txt`.

## Debug-modus

Legg til `?debug` i adressen: <http://localhost:3000/?debug>. (`?debug=karakterer` viser forhåndsvisningen av karakterene og Johan, og `?debug=boss1` til `?debug=boss4` hopper rett til en boss.) Da vises et ytelsesoverlegg med:

- FPS nå, minste og snitt, og millisekunder per bilde delt på oppdatering og tegning
- antall advokater, prosjektiler, effekter, ticket-lapper og glade advokater under animasjon
- minnebruk (i Chrome/Edge), automatisk kvalitetsnivå, inn per sekund og frustrasjonsfaktor
- hjelp per sekund for hvert våpen spilleren har (siste 10 sekunder)

Knappene lar deg hoppe 1 eller 3 minutter frem, gå opp ett eller ti nivåer, få fire våpen på maks nivå
(«Maks bygg») og gjøre dem om til kombinasjoner, slå på udødelighet, og sette ut boss, hastesak, Ny PC,
energidrikk eller 100 ekstra advokater.

**Stresstest (5 min):** starter på minutt 15 med fire våpen som kombinasjoner (Allmøte på Teams, Ctrl+Alt+Del,
Tvungen oppdatering og Kontorprinteren fra helvete), holder antall advokater på taket (400, med opptil 30 avsendere) og kjører i 5 minutter uten at du kan dø. Den logger FPS, tid per bilde og
minnebruk hvert 30. sekund i konsollen (F12) og viser resultatet i overlegget til slutt.
Legg til `&utenGPU` (`?debug&utenGPU`) for å tvinge all tegning over på prosessoren – slik en kontor-PC
uten grafikkortstøtte tegner. Det er verste fall for ytelsen.

Runder der debug-knappene er brukt, kan ikke sendes inn til topplisten.

## Filene

| Fil | Innhold |
| --- | --- |
| `js/config.js` | **Alle balansetall** |
| `js/game.js` | Spilltilstanden og én oppdatering per fast tidssteg (60 per sekund) |
| `js/player.js`, `js/enemies.js`, `js/weapons.js` | Spilleren, advokatene (inkl. spawning på kartet) og IT-løsningene |
| `js/bosses.js` | Bossene: rekkefølgen, nedtellingen («sparken»), angrepene og fiendeprosjektilene |
| `js/upgrades.js`, `js/tickets.js`, `js/score.js` | Nivåopp-kort, lapper/energidrikk/Ny PC, poeng og multiplikator |
| `js/map.js` | Kartets soner, pynt, dører og vegger |
| `js/renderer.js` | Spillverdenen i pixel art (640 × 360) |
| `js/hud.js` | HUD og minikart |
| `js/figures.js`, `js/sprites.js`, `js/icons.js`, `js/pixel.js`, `js/pixelfont.js` | Grafikken |
| `js/settings.js`, `js/sound.js`, `js/input.js` | Innstillinger, lyd (Web Audio) og tastatur/touch |
| `js/ui.js`, `js/main.js` | Menyer, hovedløkka, automatisk kvalitet, debug og stresstest |
| `js/leaderboard.js`, `server/server.js` | Toppliste-klient og Node-server med SQLite |
| `tools/simulate.js`, `tools/measure-weapons.js`, `tools/build-font.js`, `tools/node.ps1` | Balansetest, våpenmåling, font-generator og hjelpeskript |

**Dagens vakt:** all tilfeldighet kommer fra en seedet generator (mulberry32) med dagens dato i norsk tid
som seed, i separate strømmer: når advokater kommer, hvor de kommer inn, hastesak/boss, oppgraderingskort,
Ny PC-drops, energidrikkens plassering, Fjernstyring, «Dobbel skjerm» og utseende. `Math.random()` brukes ikke.
