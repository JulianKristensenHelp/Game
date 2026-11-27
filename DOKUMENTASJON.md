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
- **Utseendet** er oppdragsgivers egne pikselbilder i `assets/karakterer/` (figur 32 × 32 og portrett 64 × 64 per
  karakter), brukt piksel for piksel: aldri tegnet om, fargejustert eller skalert med et ikke-heltall. Hvilken fil som
  hører til hvilken karakter, står i `sprite` og `portrait` i CONFIG.characters (person4 = Odyssefs, person3 =
  Johannes, person1 = Jin, person2 = Julian). Gangsyklusen (4 bilder) flytter bare beina og føttene og gir et hopp
  på én piksel; hode og overkropp er identiske med originalen. Venstre er speilet, og blink, sukkerkick og skjold
  legges oppå bildet. Topplisten bruker 32 × 32-figuren.
- **Johannes (person3) har en liten ugle på skulderen** (nye bilder i endringsprompt 5). Ugla er en del av bildet og
  er med overalt, også i gangsyklusen (den følger hoppet). Ugla er bare pynt: treffboksen er den samme som for de
  andre karakterene (`CONFIG.player.radius`). Bytter du bildene igjen, holder det å legge nye filer med samme navn i
  `assets/karakterer/`: spritene bygges fra filene hver gang spillet lastes, og serveren sender filene med
  `no-cache`, så nettleseren henter de nye.
- **Forhåndsvisning til godkjenning:** <http://localhost:3000/?debug=karakterer> viser alle fire med portrett,
  stående figur, animert gangsyklus og gangbilde 2 og 4, og dessuten Johan og Anonymous med venninnene.
- Bildene av personene er bare brukt som forelegg. De ligger ikke i prosjektet og publiseres ikke.

## Våpen, passive og kombinasjoner

Det finnes 13 IT-løsninger (maks 4 samtidig), spesialkombinasjonen The Matrix og 28 passive (maks 8 samtidig).
**Våpnene har ikke nivåer** (versjon 6):
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
advokat, Oppdateringsstrålen tettere takt, Teams-varsel skarpere styring og Skytsengelen kortere tid mellom papirarkene.
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
| Oppdateringsstrålen (stråle i gangretningen) | Shopkeeperen | Tvungen oppdatering |
| Teams-varsel (målsøkende varsler mot hver sin advokat) | Dobbel skjerm | Allmøte på Teams (hvert varsel deler seg i to) |
| Støydempende headset (skjold som blokkerer ett treff) | Ergonomisk stol | Hjemmekontor |
| Skytsengelen (kaster mini-printere) | Større boks | Himmelsk serviceavtale |
| Ping-pong (ball som spretter mot skjermkantene) | Joggesko | Ping of Death (ballen deler seg ved hvert sprett) |
| Livvakten (brannmur mellom deg og flokken) | – | Del av The Matrix |

Tallene står i CONFIG.weapons. «Dobbel skjerm» bruker en egen tilfeldighetsstrøm, så samme valg gir samme runde
for alle. Skytsengelen har et fast tak på antall mini-printere samtidig (maks 12), likt for alle.

### Skytsengelens mini-printere (endringsprompt 4)

Mini-printerne fungerer som molotov i survivors-spill: Skytsengelen kaster dem i en bue mot nærmeste advokat, de
lander der advokaten stod, og står helt stille. Derfra skyter de et papirark mot nærmeste advokat innenfor
rekkevidden (60 piksler) hvert 0,3. sekund, og etter ca. 4 sekunder forsvinner de i en liten papirsky. Landingen har
et lite hopp og en støvsky, arkene mates ut mens de skyter, og en svak sirkel på gulvet viser rekkevidden.
Himmelsk serviceavtale avslutter fortsatt med papirkonfetti. Oppgraderingene følger reglene fra versjon 6: `life`
(lenger levetid), `range` (+15 % rekkevidde per steg) og `burst` (kortere tid mellom arkene). Hjelpen er justert så
våpenet er like sterkt som før målt med `tools/measure-weapons.js`.

### Ping-pong (endringsprompt 4)

Det eneste våpenet som spretter mot kantene av skjermbildet (og ytterveggene) og blir sterkere for hvert sprett.
Ballen slenges ut i en tilfeldig skrå retning fra sin egen strøm i «Dagens vakt», går gjennom advokatene og hjelper
alle den treffer (samme ball kan treffe samme advokat maks hvert 0,5. sekund). Hvert sprett gjør ballen 6 % raskere
og gir +10 % hjelp, opp til et tak (+60 % fra start). Annethvert sprett vises en liten «PING» eller «PONG» (og en
«pok» når lyden er på), men bare når det er få baller. Ballen forsvinner etter et fast antall sprett.
Oppgraderingene følger tabellen i endringsprompten som vekstregler: +hjelp, +2 sprett, +1 ball (maks 4), raskere
baller og høyere tak på hjelpeøkningen. **Ping of Death** (+ Joggesko): hver gang en ball spretter, deler den seg i
to (maks 12 baller), og ballene etterlater et kort glødende spor. Tallene står i `CONFIG.weapons.pingpong`.

### Livvakten (endringsprompt 4)

En stor, rolig livvakt går ved siden av spilleren: lys hud, fullt, kort og velstelt skjegg, litt tynt hår på toppen,
blå genser med kort glidelås i halsen, solbriller og ørepropp med spiralledning (nytt utseende i endringsprompt 5;
i The Matrix har han svart frakk over genseren). Med jevne
mellomrom stiller han seg opp og lager en **brannmur**: en rett linje av animerte flammer 30 piksler fra spilleren,
på tvers av retningen der flest advokater er (de tetteste flokkene telles i åtte sektorer). Brannmuren står i ca.
3 sekunder. Advokater i den får hjelp hvert kvarte sekund og går 30 % saktere. Den blokkerer ingenting og skader
aldri spilleren. Små hengelåser, enere og nuller stiger opp fra gløden. Oppgraderingene: +hjelp, lengre brannmur,
kortere tid mellom, står lenger, sterkere sinking og flere brannmurer samtidig (maks 3, mot de tetteste flokkene).
Livvakten har ingen vanlig kombinasjon. Tallene står i `CONFIG.weapons.bodyguard`.

### Shopkeeperen (tidligere Sertifisering)

Samme effekt som før (+8 % erfaring fra ticket-lapper per nivå, maks nivå 5), men nytt navn og nytt ikon: en
anonym figur i svart hettegenser med en stor hvit «A». Hetta dekker mesteparten av ansiktet, så bare nedre del av
ansiktet og det brune skjegget synes (aldri øynene), og litt brunt hår stikker fram under kanten (endringsprompt 5).
I The Matrix har han svart frakk og svarte solbriller rett under kanten av hetta. Når du har ham, står han som en
liten figur ved siden av deg og følger etter (bare pynt). Tvungen oppdatering krever nå Oppdateringsstrålen +
Shopkeeperen.

### The Matrix (spesialkombinasjon)

Når du har **Skytsengelen med 10 oppgraderinger (eller Himmelsk serviceavtale), Livvakten med 10 oppgraderinger og
Shopkeeperen**, tilbys The Matrix som et eget kort med grønn kode-ramme ved neste nivåopp, også om en vanlig
kombinasjon tilbys samtidig. Velger du det:

- Skytsengelen og Livvakten slås sammen til ett våpen, så én våpenplass blir ledig. Shopkeeperen beholdes.
- En kort animasjon (ca. 2,5 sekunder) spilles mens spillet står på pause: skjermen blir mørk og grønne tegn regner
  ned, de tre dukker opp og tar på seg solbriller én etter én, og «THE MATRIX» skrives ut bokstav for bokstav.
  Klikk eller en tast hopper over. Med reduserte blinkeffekter er regnet roligere og uten flimring.
- Engelen kaster grønne mini-printere og livvakten lager grønne brannmurer, sterkere enn før. Alle tre står rundt
  deg i svarte frakker og solbriller.
- **Kode-regn:** hvert 12. sekund faller grønne tegn over skjermen i 3 sekunder og hjelper alle advokater på
  skjermen litt. Samtidig er det **bullet time**: alle advokater, bosser og fiendeprosjektiler går 50 % saktere, mens
  du beveger deg som normalt. Bossenes nedtelling går som vanlig.
- The Matrix vises på oppslagstavla med egen grønn ramme når den er låst opp, og på slutt-skjermen.

Navnet «The Matrix» og den grønne kode-regn-stilen er brukt, men ikke filmens logo, skrifttype, figurer eller
bilder: tegnene er spillets egen pikselfont. Tallene står i `CONFIG.weapons.matrix`.

### Nivå 9 og våpen uten nivåer

Endringsprompt 4 ber om maks våpennivå 9 og at kombinasjoner krever nivå 9. I versjon 6 har våpnene ikke lenger
nivåer (hvert kort gir én oppgradering, uten tak), og en kombinasjon krever 10 oppgraderinger – altså allerede
senere enn «nivå 9». Det systemet er beholdt uendret, se ENDRINGSLOGG.md (konflikter).

### Helsekjeks

Vanlige advokater (ikke bosser, Anonymous' venninner, partnere eller hastesaker) legger av og til igjen en liten kjeks
med sjokoladebiter når de blir glade: ca. 1 av 100, fra drop-strømmen i «Dagens vakt». Den gir 5 energi (ingen
sukkerkick), ligger i 10 sekunder og blinker de siste 3, plukkes opp med samme radius som ticket-lappene, har en
svak, varm glød og vises ikke på minikartet. Maks 6 samtidig. Tallene står i `CONFIG.cookie`. Energidrikken på
kartet er uendret og fortsatt den viktigste kilden til energi.

### Gjenstandene (versjon 6.1)

| Passiv | Per nivå (maks 5) |
| --- | --- |
| Sikkerhetskopi | Overlever ett dødelig treff per vakt (maks 3), får halv energi tilbake og 2 sekunder usårbarhet |
| Takknemlige advokater | +0,04 energi for hver advokat du hjelper |
| Post-it-blokk | Lappene gir full poengverdi i 2 sekunder lenger (endringsprompt 5, var: ligger 2 sekunder lenger) |
| Bonusordning | +10 % poeng fra lapper, hastesaker og bosser |
| Termos | Energidrikken gir +10 energi, og sukkerkicket varer 2 sekunder lenger |
| Vaktmester | −15 % treghet fra papirbunker, blekk og ventemusikk (maks 75 %) |

Tallene står i `CONFIG.itemPassives`. Alle 28 passive har nå eget ikon (de seks fra versjon 5 manglet ikon).

### Klassepassive (versjon 6)

Hvert våpen har en klasse (`tag`): prosjektil (Toner-kast, Ctrl+Z, Teams-varsel, Ping-pong), kjede (Passord-reset,
Fjernstyring), område (Skru av og på, Trådløse mus, HDMI-kabelen, Oppdateringsstrålen) og hjelper (Skytsengelen,
Livvakten, The Matrix, Støydempende headset). Fire passive gir +15 % hjelp per nivå for én klasse: Kastekurs, Nettverkssertifisering,
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

## Ticket-lappene, saksbunker og Sky-synk (endringsprompt 5)

- **Lappene forsvinner aldri**, og **erfaringen fra en lapp er alltid full**, uansett hvor gammel den er.
- **Poengene «går ut på dato»:** full verdi de første 10 sekundene, deretter jevnt ned til 25 % ved 30 sekunder, og
  der blir den liggende. Poengene regnes ut i det lappen når deg (med multiplikatoren akkurat da).
- **Utseende:** nye lapper er knallgule. Lapper som har passert den nye perioden, er gulnet papir med et eselsøre.
  Ingen lapper blinker lenger.
- **Saksbunker:** gamle lapper som ligger nær hverandre (i samme rute på 40 × 40 piksler), slås sammen til én
  saksbunke med samlet erfaring og samlet gjenværende poengverdi. Bunken er en stabel med lapper i tre størrelser
  (fra 2, 6 og 15 lapper). Sammenslåingen kjører to ganger i sekundet, ikke hver frame, og er lik for alle.
- **Tak:** maks 250 lapper og bunker på kartet. Når taket er nådd, legges nye lapper inn i nærmeste bunke (innen 160
  piksler), ellers i nærmeste lapp.
- **Post-it-blokk** forlenger perioden med full poengverdi med 2 sekunder per nivå. Hele forfallet flyttes: med 16
  sekunder full verdi er lappen nede på 25 % ved 36 sekunder. Gulning og sammenslåing starter også først etter den
  lengre perioden, og lapper som allerede ligger ute, får den nye perioden med en gang.
- **Sky-synk:** en sjelden pickup formet som en liten sky med en synk-pil. Første gang ved 4:00, deretter hvert 90.
  sekund, maks én om gangen, et godt stykke unna deg (minst 900 piksler), på faste steder fra sin egen strøm i
  «Dagens vakt». Den vises på minikartet som en hvit sky, og en grønn pil i skjermkanten viser veien. Plukker du den
  opp, flyr alle lapper og bunker på hele kartet til deg i løpet av 1,5 sekunder.

Tallene står i `CONFIG.tickets` og `CONFIG.cloudSync`. Lappemagneten ved nivåopp (140 piksler) er uendret.

## Ta et punkt på kartet (endringsprompt 5)

Tre hendelser der spilleren må gå til et fast sted og holde et punkt:

| Hendelse | Sted | Permanent bonus | I tillegg |
| --- | --- | --- | --- |
| Snacks på Jacobs | Jacobs pult (navneskilt «JACOB» og en skål snacks), nederst mellom resepsjonen og sofakroken | +15 maks energi, og fyller 30 energi med en gang | +1 nivå |
| Spille pingpong | Pingpongbordet i det sosiale hjørnet rett under kantina | +8 % hjelp på alle våpen | +1 nivå |
| Møterommet | Det venstre møterommet med glassvegger (øverst til høyre) | +7 % bevegelseshastighet | +1 nivå |

- **Når:** første rundt 1:30, deretter ca. hvert 2. minutt (± 15 sekunder). Tidspunkt og hvilken hendelse det blir,
  trekkes fra en egen strøm i «Dagens vakt» (`punkt`). Aldri mens en boss er ute, og aldri med mindre enn 60
  sekunder til neste boss. Da venter den til bossen er ferdig. Aldri mer enn én om gangen, og hver kan skje maks 2
  ganger per vakt.
- **Varsel:** banner («Det er snacks på Jacobs pult!», «Noen vil spille pingpong!», «Du er innkalt til møte!») og en
  kort lyd når lyden er på. Stedet får et sikte på minikartet, og en gul pil med hendelsens ikon viser veien.
- **Frist:** 45 sekunder. En liten boks under poengsummen viser «Ta punktet 0:32» og fremdriften.
- **Ta punktet:** stå i sirkelen på gulvet (40 piksler radius) i 8 sekunder. Går du ut, synker fremdriften sakte
  (0,5 sekunder per sekund). Står det en advokat i sirkelen, stopper fremdriften helt: sirkelen og boksen blir røde
  med «Opptatt!». Første gang du går inn, kommer en ekstra flokk (6 + 0,8 per minutt, maks 18) fra tre retninger.
- **Belønning:** når ringen er full, kommer bonusteksten («Snacks! +15 maks energi», «+1 nivå») og du går opp et
  nivå med en gang (uten å bruke erfaring). Bonusene legges oppå passivene og vises som ikoner med antall (×2) til
  høyre for våpnene nederst. Bommer du, forsvinner hendelsen uten annen straff.
- Slutt-skjermen viser hvor mange av hendelsene du klarte.

Alle tallene, tekstene og bonusene står i `CONFIG.capture`. Stedene står i `HOTSPOTS` i `js/map.js`, og logikken i
`js/capture.js`. Ingen av de gamle hendelsene under er endret, og de to typene påvirker ikke hverandre.

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
| 9:00 | Anonymous og venninnene | 120 s | «Klikk på lenken!» (fiskekrok som drar deg mot henne), silderegn, videresendt svindel-e-post (fra venninnene), lokkemat |
| 12:00 | Johan (siste boss) | 150 s | Spurt, kalenderinvitasjoner, «Alle på møte!», og fra halv frustrasjon også de tidligere bossenes angrep |
| 15:00, 18:00 … | Johan igjen | 150 s | Sterkere for hver gang |

- Alle angrep varsles først (en positur, lys eller et «!» i 0,65 sekunder), og Johans spurt viser en linje.
- Klokka øverst blir gul ved 30 sekunder og rød, blinkende og tikkende ved 10 (blinkingen følger innstillingen
  for reduserte blinkeffekter).
- Mens en boss er ute, kommer det færre vanlige advokater (55 %). En boss som er langt unna, jogger for å ta deg igjen.
- **Navn, replikker og alle tall** står i CONFIG.bosses i js/config.js (`intro`, `line`, `happyText`, Johans
  `title` og `phaseText` er plassholdere som kan endres fritt).
- **Utseendet** står i js/figures.js (NORDIC for konsulenten, drawPrinterBoss for printeren), js/johan.js (Johan,
  figur og portrett) og js/frida.js (Anonymous og venninnene). Johan og Anonymous er tegnet i samme stil som
  oppdragsgivers karakterbilder: 1 piksel detalj, fargede omriss og myk skyggelegging med lys fra venstre. Nørdic er
  et oppdiktet firma med egen logo (krøllparenteser rundt en N) i skoggrønt og lime.

**Anonymous og venninnene (boss 3):** en hjertelig bestemor (64 × 64) med grått hår i knute, briller i kjede,
strikket cardigan, håndveske og fiskestang, og to mindre venninner (32 × 40) i egne strikkeklær med mobiltelefon.
Vitsen er at hun er lurt, ikke at hun er dum. Venninnene har hver sin frustrasjon (15 % av Anonymous') og gir ekstra
poeng hvis de hjelpes hver for seg, men det er Anonymous som må hjelpes. Når hun blir glad, blir venninnene også glade,
og hun sier «Oi, var det svindel? Takk, vennen!».

| Angrep | Varsling | Hva skjer |
| --- | --- | --- |
| «Klikk på lenken!» | Anonymous svinger stanga over hodet, en stiplet linje viser retningen | Kroken kastes i en rett linje. Treff gir vanlig skade og drar deg 48 piksler mot henne |
| Silderegn | Små skygger på gulvet (én der du står) | Sild faller på skyggene etter 1 sekund |
| Videresendt svindel-e-post | Venninnene løfter mobilen og får «!» | Fiskeformede e-poster svømmer i en bølgete linje mot deg |
| Lokkemat | Ingen tydelig varsling – det er poenget | Falsk energidrikk eller falsk «Ny PC» med en liten fiskekrok. Gir litt skade og sinker i 2 sekunder |

Lokkematen kan avsløres: litt feil farge (gulere grønn boks, rosa skjerm), en synlig fiskekrok, en annen, ujevn
blink (kjapp dobbeltblink i stedet for den rolige pulsen) og et stivere hopp. Den vises aldri på minikartet, det er
maks 3 samtidig, og de forsvinner når Anonymous er hjulpet. Alt står i `CONFIG.bosses.frida`.
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
| endre lappenes poengforfall, bunkene og taket | `tickets` (`freshTime`, `decayTime`, `minValue`, `max`, `mergeCell`) |
| endre Sky-synk | `cloudSync` (first, interval, pullTime, minDistance) |
| endre hendelsene med punkt på kartet | `capture` (når, frist, sirkel, holdetid, ekstraflokk, bonuser) |
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
spredning og hvor mange som fikk sparken (`--detaljer` lister alle tidene), og hvor ofte ekspertrobotene går opp i
nivå mellom 5 og 12 minutter. Med tallene som ligger inne nå (versjon 7.1, se ENDRINGSLOGG.md for tabellen) har
ekspertrobotene median rundt 14 minutter, en fjerdedel ryker før 8 minutter, og veggen i overtid tar de beste
mellom 15 og 18 minutter. `--utennye` holder Ping-pong og Livvakten utenfor kortene, og `--utenkjeks` slår av
kjeksen. `--utenpunkt` slår av hendelsene med punkt på kartet, `--ikketa` lar dem komme uten at robotene går dit, og
`--utensky` slår av Sky-synk. Det er med vilje: fra Johan og
utover er det byggen og flaksen med kortene som avgjør. `--utenpartnere`, `--utenbosser` og `--utenhendelser` viser
hvor mye partnerne, bossene og hendelsene bidrar. Robotene ser ikke varslene slik et menneske gjør, så de får mer
skade enn en oppmerksom spiller, men de bygger også dårligere. Prøvespill gjerne med noen kolleger.

**Sammenlign våpen og kombinasjoner:** `node tools/measure-weapons.js [antall] [våpen,våpen]` måler hjelp per sekund for alle 13
våpen (The Matrix står på Livvaktens rad) med 16 oppgraderinger jevnt fordelt (uten effekter) og som kombinasjon under like forhold. I debug-modus viser overlegget det samme i spillet
(hjelp per sekund per våpen, siste 10 sekunder).

## Slik endrer du kartet

Kartet er én kontoretasje på 2560 × 1440 piksler med yttervegger, og oppsettet er likt for alle.

- **Soner** (kontorlandskap, kantine, heiser, møterom, printerrom, resepsjon, sofakrok) står i `ZONES` i
  `js/map.js`: navn, gulvtype, plassering og farge på minikartet.
- **Pynt** (pulter, stoler, planter, printere, vannkjølere …) står i `makeDecor()` i samme fil, som en liste
  med navn og koordinater. Pynt blokkerer aldri bevegelse – bare ytterveggene gjør det.
- **Stedene for punkt-hendelsene** (Jacobs pult, pingpongbordet, møterommet) står i `HOTSPOTS`. Flytter du et sted,
  følger pynten (pulten og bordet) med.
- **Dører og heiser** der advokater kommer inn når det er trangt, står i `DOORS`.
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
- **nivåopp-tempoet** de siste 2 minuttene av vakta («nivåopp hvert 24. s»), og hvor mange Sky-synk og punkter du
  har tatt. Bruk det til å måle hvor ofte en god spiller går opp i nivå mellom 5 og 12 minutter (målet er omtrent
  hvert 20.–30. sekund ved minutt 8).

Knappene lar deg hoppe 1 eller 3 minutter frem, gå opp ett eller ti nivåer, få fire våpen med 16 oppgraderinger
(«Maks bygg») og gjøre dem om til kombinasjoner, slå på udødelighet, og sette ut boss, hastesak, Ny PC,
energidrikk, en partner, en pakke fra leverandøren, en helsekjeks, en Sky-synk eller 100 ekstra advokater. «The Matrix-bygg»
gir The Matrix med en gang (med animasjonen), og «Ping-pong + Livvakt» gir begge med 10 oppgraderinger og Joggesko.
«Snacks på Jacobs», «Spille pingpong» og «Møterommet» starter den hendelsen med en gang (den teller med i maks 2 per
vakt).

**Stresstest (5 min):** starter på minutt 15 med fire våpen som kombinasjoner (Tofaktor, Kontorprinteren fra
helvete, Ping of Death og The Matrix), med Anonymous og venninnene ute hele tiden, holder antall advokater på
taket (400) og kjører i 5 minutter uten at du kan dø. Den logger FPS, tid per bilde og
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
| `js/map.js` | Kartets soner, pynt, dører, vegger og stedene for punkt-hendelsene (`HOTSPOTS`) |
| `js/capture.js` | Hendelsene med punkt på kartet (Snacks på Jacobs, Spille pingpong, Møterommet) |
| `js/renderer.js` | Spillverdenen i pixel art (640 × 360) |
| `js/hud.js` | HUD og minikart |
| `js/figures.js`, `js/sprites.js`, `js/icons.js`, `js/pixel.js`, `js/pixelfont.js` | Grafikken |
| `js/johan.js`, `js/frida.js` | Johan og Anonymous med venninnene, i stilen til karakterbildene |
| `js/matrixfx.js` | Animasjonen når The Matrix velges |
| `assets/karakterer/` | Oppdragsgivers pikselbilder av de fire karakterene (figur og portrett) |
| `js/settings.js`, `js/sound.js`, `js/input.js` | Innstillinger, lyd (Web Audio) og tastatur/touch |
| `js/ui.js`, `js/main.js` | Menyer, hovedløkka, automatisk kvalitet, debug og stresstest |
| `js/leaderboard.js`, `server/server.js` | Toppliste-klient og Node-server med SQLite |
| `tools/simulate.js`, `tools/measure-weapons.js`, `tools/build-font.js`, `tools/node.ps1` | Balansetest, våpenmåling, font-generator og hjelpeskript |

**Dagens vakt:** all tilfeldighet kommer fra en seedet generator (mulberry32) med dagens dato i norsk tid
som seed, i separate strømmer: når advokater kommer (og om de er partnere), hvor de kommer inn, hastesak/boss,
oppgraderingskort (og kortnivåene), Ny PC-drops, helsekjeks og partnernes lapper, energidrikkens plassering,
«Dobbel skjerm», kritiske treff, unnvikelse, pakkene fra leverandøren, hendelsene, retningen på pingpongballene og
utseende. Anonymous' silderegn og lokkemat bruker hastesak/boss-strømmen. `Math.random()` brukes ikke.
