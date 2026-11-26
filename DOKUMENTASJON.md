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
| Trefftall over advokatene | av/på | på |
| Frustrasjonsbarer | av/på | på (partnerne har bar uansett) |

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

Det finnes 11 IT-løsninger (maks 4 samtidig) og 22 passive (maks 8 samtidig). **Våpnene har ikke nivåer** (versjon 6):
hvert kort ved nivåopp gir én bestemt oppgradering på ett våpen – mer hjelp, kortere intervall, én mus eller
tonerkassett til, lengre rekkevidde – og et våpen kan ta så mange oppgraderinger du rekker. Kortet viser tallet før
og etter («+1 mus (3 → 4)», «Kortere tid mellom aktiveringer (1,2 s → 1,08 s)»). Reglene står i `growth` på hvert
våpen i `CONFIG.weapons`: `pct` = andel av grunntallet per steg (hjelp vokser lineært, uten tak), `add` = fast
tillegg, `mul` = ganging (intervall, med gulv), og `max` = tak. **Antall** (mus, kassetter, hopp, treff) har alltid
et tak – det er taket som holder spillet raskt på en kontor-PC.

**Kortene har fire nivåer (sjeldenhet):** grå = vanlig (1 steg), grønn = uvanlig (2 steg), blå = sjelden (3 steg,
og det er her effektene kommer), oransje = legendarisk (5 steg, eller to effektnivåer). Sjansene er 68/23/7/2 %, og
«Hesteskoen» ganger alt over vanlig med 1 + flaks. Nye våpen er alltid uvanlige, passive alltid vanlige.

**Effektene** (sjeldne kort, maks 3–5 nivåer per våpen, `CONFIG.upgrades.effects`): Gjennomtrengende (prosjektilet
går videre til én advokat til – Toner-kast og Teams-varsel), Sprut (35 % hjelp til naboene), Venter på IT (20 %
saktere i 2 sekunder), Saken ligger i køen (30 % av hjelpen én gang til etter et sekund), Avvist (skyver
advokaten bakover), Ekstra kaffe (+8 % kritisk sjanse for det våpenet), Purring (advokater som treffes tar 10 % mer
hjelp fra alt i 3 sekunder), Eskalering (+15 % hjelp mot partnere og bosser) og Innkalling (treff drar advokaten
3 piksler mot deg – bare våpen med rekkevidde, så de kommer inn i musering og puls). Hvilke effekter et våpen kan
få, står i `effects` på våpenet.

**Flere regler per våpen (versjon 6.1):** Skru av og på kan få større dytt (kombinasjonen), Passord-reset raskere
hopp, HDMI-kabelen bredere bue, Fjernstyring lengre rekkevidde, Trådløse mus og Ctrl+Alt+Del kortere pause per
advokat, Oppdateringsstrålen tettere takt, Teams-varsel skarpere styring og Skytsengelen tettere papirsalver.
Hjelp-kort kommer 2,5 ganger så ofte som andre regler på et våpen, og antall-kort 1,5 ganger, så byggen ikke
drukner i småregler (`CONFIG.upgrades.weight`).

**Nytt utvalg og Fjern kortet:** du starter med ett av hvert, og hver hjulpet boss gir ett til. «Nytt utvalg» (R)
gir tre nye kort. «✕» på et kort (eller B og tallet) fjerner det for resten av vakta, og et nytt kort tar plassen.

**Pakke fra leverandøren:** hver hjulpet boss legger igjen en pakke (3 oppgraderinger, Johan 5), og en hjulpet
partner gjør det i 2,5 % av tilfellene (1 oppgradering). Pakkene inneholder bare våpenoppgraderinger, minst
uvanlige, og trekkes fra sin egen tilfeldighetsstrøm. Partnerne legger dessuten igjen 1–5 ticket-lapper.

**Alle våpen sikter på nærmeste advokat** (puls og mus er områdevåpen og trenger ikke sikte). Toner-kast, HDMI-kabelen,
Oppdateringsstrålen og Fjernstyring gikk tidligere etter gangretningen eller tilfeldige advokater.

**Kombinasjon:** et våpen med 10 oppgraderinger pluss riktig passiv gir en kombinasjon. Kombinasjonen er et nytt
utgangspunkt (tydelig sterkere enn våpenet med de ti oppgraderingene), og oppgraderingene du tar etterpå vokser
videre fra den. Effektene beholdes. Disse er nye eller endret i versjon 3 og 4:

| Våpen | + Passiv | = Kombinasjon |
| --- | --- | --- |
| Passord-reset (kjede: hopper fra advokat til advokat) | Raskere SSD | Tofaktor (to kjeder i hver sin retning) |
| Ctrl+Z (bumerang mot nærmeste advokat) | Hurtigtaster | Ctrl+Alt+Del |
| Oppdateringsstrålen (stråle i gangretningen) | Sertifisering | Tvungen oppdatering |
| Teams-varsel (målsøkende varsler mot hver sin advokat) | Dobbel skjerm | Allmøte på Teams (hvert varsel deler seg i to) |
| Støydempende headset (skjold som blokkerer ett treff) | Ergonomisk stol | Hjemmekontor |
| Skytsengelen (kaster mini-printere) | Større boks | Himmelsk serviceavtale |

Tallene står i CONFIG.weapons. «Dobbel skjerm» bruker en egen tilfeldighetsstrøm, så samme valg gir samme runde
for alle. Skytsengelen har et fast tak på antall mini-printere samtidig (maks 12), likt for alle.

### Gjenstandene (versjon 6.1)

| Passiv | Per nivå (maks 5) |
| --- | --- |
| Sikkerhetskopi | Overlever ett dødelig treff per vakt (maks 3), får halv energi tilbake og 2 sekunder usårbarhet |
| Takknemlige advokater | +0,04 energi for hver advokat du hjelper |
| Post-it-blokk | Ticket-lappene ligger 2 sekunder lenger |
| Bonusordning | +10 % poeng fra lapper, hastesaker og bosser |
| Termos | Energidrikken gir +10 energi, og sukkerkicket varer 2 sekunder lenger |
| Vaktmester | −15 % treghet fra papirbunker, blekk og ventemusikk (maks 75 %) |

Tallene står i `CONFIG.itemPassives`. Alle 28 passive har nå eget ikon (de seks fra versjon 5 manglet ikon).

### Klassepassive (versjon 6)

Hvert våpen har en klasse (`tag`): prosjektil (Toner-kast, Ctrl+Z, Teams-varsel), kjede (Passord-reset,
Fjernstyring), område (Skru av og på, Trådløse mus, HDMI-kabelen, Oppdateringsstrålen) og hjelper (Skytsengelen,
Støydempende headset). Fire passive gir +15 % hjelp per nivå for én klasse: Kastekurs, Nettverkssertifisering,
Åpent landskap og Sommervikar. Tallene står i `CONFIG.tagPassives`.

### De seks nye passive (versjon 5)

| Passiv | Per nivå (maks 5) |
| --- | --- |
| Kaffemaskin | +5 % kritisk sjanse. Et kritisk treff gir 1,5 × hjelp (gult tall) |
| Mekanisk tastatur | +25 % hjelp fra kritiske treff |
| Overtid | +15 % hjelp på alle våpen, men −4 % bevegelseshastighet |
| Hev-senk-pult | +0,35 energi per sekund |
| Brannmur | +6 % sjanse for å unngå et treff helt (maks 30 %), «Unngikk!» vises |
| Hesteskoen (erstatter Kontorlotteriet) | +25 % flaks (sjeldnere kort oftere) og +12 % sjanse for et fjerde kort |

Kritiske treff og unnvikelse bruker egne tilfeldighetsstrømmer («Dagens vakt»), så de er like for alle.
**Kortene ved nivåopp** vektes (`CONFIG.upgrades.weight`): oppgraderinger til våpen du har, kommer oftest, så
passive du har, så nye våpen og nye passive. Mens du har færre enn to våpen, kommer nye våpen 2,5 ganger så ofte.

### Dine tall ved nivåopp

Under kortene står alle tallene som passive og karakter påvirker: hjelp (og hjelp per klasse), kritisk sjanse og
kritisk hjelp, tid mellom aktiveringer, område, prosjektilfart, varighet, ekstra prosjektiler, dobbel aktivering,
maks energi, regenerering, skadereduksjon, unnvikelse, bevegelse, plukkradius, erfaring, flaks, sjansen for et
fjerde kort og hvor mange nye utvalg og fjerninger du har igjen. Så kommer **hvert våpen** med alle tallene sine
(hjelp per treff med alle bonuser, intervall, antall, rekkevidde …), antall oppgraderinger, hvor langt det er til
kombinasjonen, og effektene det har. På små skjermer (under 640 piksler høye) skjules arket.

### Frustrasjonsbar og trefftall

- Hver advokat får en liten rød bar over hodet når den er skadet og nylig ble hjulpet (1,5 sekunder). Bossene har sin
  egen bar som før.
- Hvert treff viser et tall som stiger og blekner, med et lite ikon av våpenet som ga hjelpen. Tallet er hele
  treffet, også det som var mer enn advokaten trengte. Kritiske treff er gule.
  Treff på samme advokat innen et kvart sekund slås sammen til ett voksende tall, og det er maks 120 tall samtidig.
- Alt dette er ren grafikk og påvirker aldri spillet. Automatisk kvalitet skrur av ikonene først (middels), og
  tall og barer helt (lav). Partnerne beholder baren uansett.

## Partnere (eliter)

Fra minutt 5 kan en vanlig advokat komme inn som **partner**: gullkrone, bred frustrasjonsbar som alltid vises,
6 × frustrasjon, 1,6 × skade, litt tregere og 12 × poeng på lappen. Sjansen starter på 1 % per advokat og øker
med 0,6 prosentpoeng per minutt (maks 8 %), og det er maks 4 partnere samtidig. Hver har én egenskap (navnet står
over baren):

| Egenskap | Hva den gjør |
| --- | --- |
| Partner-aura | Andre advokater innen 70 piksler tar bare halv hjelp. En gul ring viser rekkevidden |
| Delegerer | Når partneren er hjulpet, kommer tre juniorfullmektiger ut av den |
| Har hastverk | Hvert 4. sekund: «!» i et halvt sekund, så et spurt mot der du står |

Tallene står i `CONFIG.elites`. Knappen «Partner» i debug-panelet setter ut én.

**«Haster!»-avsenderen** (fra 2:30) holder seg 150–200 piksler unna og sender e-poster mot der spilleren
står. Laptopen lyser og et «!» vises 0,5 sekunder før hvert skudd. Maks 15 % av advokatene og maks 30 samtidig,
og maks 60 fiendeprosjektiler på kartet (e-poster og alle bossangrep til sammen).
Tallene står i CONFIG.sender og CONFIG.enemyShots.

## Småting som gjør vakta bedre (versjon 6.1)

- **Nivåkø:** når flere nivåer kommer på én gang (pakke, gratis lunsj), står det «(2 nivåer til etter dette)» i
  overskriften, så du vet at flere kort kommer.
- **Boss-varsel:** 10 sekunder før hver boss kommer et banner («Nørdic-konsulenten kommer om 10 sekunder»), så
  du kan plassere deg (`bosses.warnBefore`).
- **Lappemagnet:** ved nivåopp og når en pakke åpnes, flyr alle lapper innen 140 piksler til deg, så pausen aldri
  koster lapper (`levelMagnet`).
- **Bygget ditt** står som brikker på slutt-skjermen, og pausemenyen viser hele «Dine tall».
- **Innstillinger** for trefftall og frustrasjonsbarer (av/på).

## Hendelser (versjon 6)

Vanskeligheten stiger **lineært**: frustrasjonen er 1 + 0,15 × (minutter − 3) fram til overtid (12:30), der den
stiger bratt. Variasjonen fra vakt til vakt kommer fra hendelsene, som vises som banner:

| Hendelse | Når | Hva |
| --- | --- | --- |
| Lunsjrush! | 2:30, 7:30, 12:30 | En flokk juniorfullmektiger (24 + 3 per minutt) fra én kant |
| Printerkø! | 4:30, 9:30, 14:30 | En flokk printerentusiaster (8 + 1 per minutt) |
| Partnermøte! | 7:30, 13:30 | Tre partnere på én gang |
| Kaffepause | sjelden, fra minutt 2 (6 % per minutt) | Advokatene går halvparten så fort i 12 sekunder |
| Gratis lunsj! | sjelden, fra minutt 3 (5 % per minutt) | 30 ticket-lapper rundt deg |
| Serverkrasj! | sjelden, fra minutt 5 (5 % per minutt) | Alle er 35 % raskere og gjør 50 % mer skade i 15 sekunder |

De faste hendelsene venter mens en boss er ute, og det er alltid minst 25 sekunder mellom to hendelser. De sjeldne
trekkes én gang i minuttet fra sin egen strøm i «Dagens vakt», så de er like for alle samme dag, men ulike fra dag
til dag. Alt står i `CONFIG.events`.

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
| gjøre midtspillet lettere/vanskeligere | `scaling.frustrationPerMin` (lineær, +15 prosentpoeng per minutt), `spawn.rate` |
| flytte «veggen» for de beste (nå ca. 15–17 min) | `scaling.overtimeFromMin` (12,5), `overtimeGrowthPerMin`, `overtimeSpeedPerMin` |
| endre hendelsene (lunsjrush, partnermøte, kaffepause …) | `events` (når, hvor ofte, sjanse, størrelse) |
| endre kortnivåene, effektene, nytt utvalg og pakkene | `upgrades`, `package`, `eliteDrops` |
| gi raskere/tregere nivåopp | `level` (`base`, `perLevel`, `square`) |
| endre et våpen | `weapons.<id>.base` (start), `weapons.<id>.growth` (ett kort = ett steg av én regel), `effects` og `combination.stats` |
| endre partnerne (eliter) | `elites` (fra når, sjanse, maks samtidig, styrke, egenskaper) |
| endre de nye passive | `statPassives`, `tagPassives` og `critMult` |
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
spredning og hvor mange som fikk sparken (`--detaljer` lister alle tidene). Med tallene som ligger inne nå (versjon 6,
se ENDRINGSLOGG.md for tabellen) har ekspertrobotene median rundt 12 minutter – altså ved Johan – en fjerdedel ryker
før 6–7 minutter, og veggen i overtid tar nesten alle mellom 15 og 18 minutter. Det er med vilje: fra Johan og
utover er det byggen og flaksen med kortene som avgjør. `--utenpartnere`, `--utenbosser` og `--utenhendelser` viser
hvor mye partnerne, bossene og hendelsene bidrar. Robotene ser ikke varslene slik et menneske gjør, så de får mer
skade enn en oppmerksom spiller, men de bygger også dårligere. Prøvespill gjerne med noen kolleger.

**Sammenlign våpen og kombinasjoner:** `node tools/measure-weapons.js [antall]` måler hjelp per sekund for alle 11
våpen med 16 oppgraderinger jevnt fordelt (uten effekter) og som kombinasjon under like forhold. I debug-modus viser overlegget det samme i spillet
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

Knappene lar deg hoppe 1 eller 3 minutter frem, gå opp ett eller ti nivåer, få fire våpen med 16 oppgraderinger
(«Maks bygg») og gjøre dem om til kombinasjoner, slå på udødelighet, og sette ut boss, hastesak, Ny PC,
energidrikk, en partner, en pakke fra leverandøren eller 100 ekstra advokater.

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
som seed, i separate strømmer: når advokater kommer (og om de er partnere), hvor de kommer inn, hastesak/boss,
oppgraderingskort (og kortnivåene), Ny PC-drops og partnernes lapper, energidrikkens plassering, «Dobbel skjerm»,
kritiske treff, unnvikelse, pakkene fra leverandøren, hendelsene og utseende. `Math.random()` brukes ikke.
