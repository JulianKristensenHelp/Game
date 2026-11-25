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
Det samme gjelder verktøyene: `powershell -File tools/node.ps1 tools/simuler.js`.

> Spillet må åpnes via en webserver (http/https). Å dobbeltklikke på `index.html` virker ikke,
> fordi nettlesere ikke laster ES-moduler fra `file://`.

## Slik publiserer du internt

**Enklest – alt på én server:** legg hele mappen på en intern maskin og start `node server/server.js`
(gjerne som en tjeneste). Serveren leverer både spillet og topplisten. Del lenken, ferdig.

- Topplisten lagres i `server/data/toppliste.db` (SQLite). Mappen kan flyttes med `DATA_DIR`.
  **Ikke legg databasen i en OneDrive-/SharePoint-synkronisert mappe** – synkroniseringen kan låse fila.
- Bare `index.html`, `css/`, `js/` og `fonts/` ligger åpent på nett. Server-mappen og databasen gjør det ikke.
- Bak en omvendt proxy (IIS, nginx): send både `/` og `/api/` videre til Node-serveren.

**Bare statiske filer:** `index.html`, `css/`, `js/` og `fonts/` kan legges på hvilken som helst webserver.
Spillet virker da fullt ut, men viser «Topplisten er utilgjengelig» til `api/toppliste` og `api/score`
svarer. Vil dere bruke en annen lagring, bytter dere bare innholdet i de to funksjonene
`hentToppliste(dato)` og `sendInnScore(innslag)` i `js/toppliste.js`.

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

- **Navn og tittel** fylles inn i js/config.js under CONFIG.karakterer (nå står det «Karakter 1–4» og
  «Tittel fylles inn»). Der står også startvåpen og bonus.
- **Utseendet** står i js/figurer.js (SPILLERE for figuren og 	egnPortrett for portrettet på 64 × 64).
- **Forhåndsvisning til godkjenning:** <http://localhost:3000/?debug=karakterer> viser alle fire med portrett,
  animert gangsyklus, glad bilde, navn, tittel, startvåpen og bonus.
- Bildene av personene er bare brukt som forelegg. De ligger ikke i prosjektet og publiseres ikke.

## Våpen, passive og kombinasjoner

Det finnes 10 IT-løsninger (maks 4 samtidig) og 12 passive (maks 6 samtidig). Hvert våpen på nivå 8 pluss
riktig passiv gir en kombinasjon. Fire våpen, fire passive og fire kombinasjoner er nye i versjon 3:

| Våpen | + Passiv | = Kombinasjon |
| --- | --- | --- |
| Ctrl+Z (bumerang mot nærmeste advokat) | Hurtigtaster | Ctrl+Alt+Del |
| Oppdateringsstrålen (stråle i gangretningen) | Sertifisering | Tvungen oppdatering |
| Teams-varsel (spretter fra advokat til advokat) | Dobbel skjerm | Allmøte på Teams |
| Støydempende headset (skjold som blokkerer ett treff) | Ergonomisk stol | Hjemmekontor |

De nye tallene står i CONFIG.nyeVaapen og CONFIG.nyePassiver. «Dobbel skjerm» bruker en egen
tilfeldighetsstrøm, så samme valg gir samme runde for alle.

**«Haster!»-avsenderen** (fra 2:30) holder seg 150–200 piksler unna og sender e-poster mot der spilleren
står. Laptopen lyser og et «!» vises 0,5 sekunder før hvert skudd. Maks 15 % av advokatene og maks 30 samtidig,
og maks 60 e-poster på kartet. Fra og med boss nummer tre sender bossen en vifte med tre e-poster.
Tallene står i CONFIG.avsender, CONFIG.fiendeSkudd og CONFIG.bossSkudd.

## Slik justerer du balansen

Alle tall ligger i **`js/config.js`**, med en kommentar på hvert felt. Endre et tall, lagre og last
siden på nytt. De viktigste:

| Vil du … | Endre |
| --- | --- |
| gjøre starten lettere/vanskeligere | `spawn.rate` (de første punktene), `skalering.startEtterMin` |
| gjøre midtspillet lettere/vanskeligere | `skalering.frustrasjonVekstPerMin`, `spawn.rate` |
| flytte «veggen» for de beste (nå ca. 15 min) | `skalering.overtidFraMin` (13), `overtidVekstPerMin`, `overtidFartPerMin` |
| gi raskere/tregere nivåopp | `nivaa` (`base`, `perNivaa`, `kvadrat`) |
| endre et våpen | `vaapen.<navn>.nivaaer` (én linje per nivå) og `kombinasjon.tall` |
| endre hastesak og boss | `fiender.hastesak`, `fiender.boss` |
| endre energidrikken | `energidrikk` (første, intervall, maks, minAvstand) |
| antall våpenplasser | `grenser.vaapen` (nå 4) |
| endre karakterene | `karakterer` (navn, tittel, startvåpen, bonus) |
| endre «Haster!»-avsenderen | `avsender`, `fiendeSkudd`, `bossSkudd` |

**Test endringene uten å spille:** `node tools/simuler.js [dato] [maks minutter]` lar enkle roboter
spille hele runder på noen sekunder og skriver ut hvor lenge de holder ut og når de får første kombinasjon.
Den sjekker også at to like runder gir nøyaktig samme resultat (også med «Dobbel skjerm»), og at utseendet på
advokatene ikke påvirker spillet. Med tallene som ligger inne nå (tre forskjellige datoer):

| Robot | Overlever ca. |
| --- | --- |
| Nybegynner (går ofte feil vei, tilfeldige kort) | 2–3 min |
| Gjennomsnittlig | 3–5 min |
| God, tilfeldig bygg | 4–8 min |
| God/ekspert, bygger bevisst mot kombinasjoner | 9–14 min (ingen over 15) |

Robotene svinger mye fra runde til runde og er ikke mennesker. Prøvespill gjerne med noen kolleger.

**Sammenlign våpen og kombinasjoner:** `node tools/maalvaapen.js` måler hjelp per sekund for alle 10 våpen
på nivå 8 og som kombinasjon under like forhold. I debug-modus viser overlegget det samme i spillet
(hjelp per sekund per våpen, siste 10 sekunder).

## Slik endrer du kartet

Kartet er én kontoretasje på 2560 × 1440 piksler med yttervegger, og oppsettet er likt for alle.

- **Soner** (kontorlandskap, kantine, heiser, møterom, printerrom, resepsjon, sofakrok) står i `SONER` i
  `js/kart.js`: navn, gulvtype, plassering og farge på minikartet.
- **Pynt** (pulter, stoler, planter, printere, vannkjølere …) står i `lagPynt()` i samme fil, som en liste
  med navn og koordinater. Pynt blokkerer aldri bevegelse – bare ytterveggene gjør det.
- **Dører og heiser** der advokater kommer inn når det er trangt, står i `DOERER`.
- **Glassvegger** (bare pynt) står i `GLASS`.
- Kartets størrelse og veggtykkelse står i `CONFIG.kart`.

## Slik endrer du grafikken

All grafikk tegnes med kode som fargeindekserte pikselrutenett (`js/piksel.js`) – ingen bildefiler.

- **Advokatene** lages i `js/figurer.js`. Hver figur settes sammen av lag: hudfarge (7), alder, kropp,
  frisyre (10), hårfarge (6), briller, skjegg/bart, øreringer, slips/skjerf, skjørt eller bukser.
  Fargene står øverst i fila (`HUDFARGER`, `HAARFARGER`, `KLAER` osv.), og alle egenskaper fordeles jevnt.
  Typene kjennes igjen på klær, størrelse og det de bærer (laptop, papirbunke, dokumentmappe).
  Antall varianter per type står i `CONFIG.figurVarianter`. Utseendet trekkes fra en egen
  tilfeldighetsstrøm og påvirker aldri spillet.
- **Gjenstander, pynt, gulv og effekter** står i `js/sprites.js`.
- **Ikonene** (16 × 16) står i `js/ikoner.js`.
- **Pikselfonten** «KontorPiksel» (med æ, ø og å) er egenprodusert. Glyfene står i `js/pikselfont.js`.
  Endrer du dem, lag font-fila på nytt med `node tools/lagfont.js` (den brukes i menyene).
  Lisens: CC0 (fri bruk), se `fonts/LISENS.txt`.

## Debug-modus

Legg til `?debug` i adressen: <http://localhost:3000/?debug>. (`?debug=karakterer` viser forhåndsvisningen av karakterene.) Da vises et ytelsesoverlegg med:

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
| `js/spill.js` | Spilltilstanden og én oppdatering per fast tidssteg (60 per sekund) |
| `js/spiller.js`, `js/fiender.js`, `js/vaapen.js` | Spilleren, advokatene (inkl. spawning på kartet) og IT-løsningene |
| `js/oppgraderinger.js`, `js/lapper.js`, `js/score.js` | Nivåopp-kort, lapper/energidrikk/Ny PC, poeng og multiplikator |
| `js/kart.js` | Kartets soner, pynt, dører og vegger |
| `js/tegning.js` | Spillverdenen i pixel art (640 × 360) |
| `js/hud.js` | HUD og minikart |
| `js/figurer.js`, `js/sprites.js`, `js/ikoner.js`, `js/piksel.js`, `js/pikselfont.js` | Grafikken |
| `js/innstillinger.js`, `js/lyd.js`, `js/styring.js` | Innstillinger, lyd (Web Audio) og tastatur/touch |
| `js/ui.js`, `js/main.js` | Menyer, hovedløkka, automatisk kvalitet, debug og stresstest |
| `js/toppliste.js`, `server/server.js` | Toppliste-klient og Node-server med SQLite |
| `tools/simuler.js`, `tools/maalvaapen.js`, `tools/lagfont.js`, `tools/node.ps1` | Balansetest, våpenmåling, font-generator og hjelpeskript |

**Dagens vakt:** all tilfeldighet kommer fra en seedet generator (mulberry32) med dagens dato i norsk tid
som seed, i separate strømmer: når advokater kommer, hvor de kommer inn, hastesak/boss, oppgraderingskort,
Ny PC-drops, energidrikkens plassering, Fjernstyring, «Dobbel skjerm» og utseende. `Math.random()` brukes ikke.
