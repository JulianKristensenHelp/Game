# Endringslogg

## Versjon 7.2 – 27. november 2026 (Kristensens endringsprompt 6)

Bygget på versjon 7.1. Det den andre utvikleren har laget, er bare endret der endringsprompten sier det (seksjon 1,
2 og 7). Hver slik endring er beskrevet under.

### 1. Feil: nivåtaket var borte, og kombinasjonene kom nesten aldri
**Årsak.** Taket ble ikke overskrevet ved et uhell, men fjernet med vilje i versjon 6 (den andre utviklerens
kortsystem). Våpnene fikk ingen nivåer. Hvert kort ga en «oppgradering» uten tak (hjelp har ingen `max`, så det
fantes alltid et gyldig kort), og en kombinasjon krevde 10 oppgraderinger. I versjon 7.0 beholdt jeg dette (se
konflikt 1 der) i stedet for å innføre nivå 9. Tre ting gjorde at kombinasjonene sjelden kom i praksis:
1. Trekningen sjekket aldri maks nivå. Oppgraderingene ble spredt på alle fire våpnene i det uendelige, så det tok
   lang tid før ett våpen hadde ti.
2. **Feil i tellingen:** et kort med to tillegg (for eksempel «+1 mus og +hjelp») talte som to oppgraderinger. Det
   gjorde tellingen ujevn og uforutsigbar.
3. Passiven kombinasjonen krever, kom sjelden opp, fordi kortene var vektet mot våpen man allerede hadde.

**Rettet:**
- Alle våpen har maks nivå 9 og alle passive maks nivå 5, også den andre utviklerens. Taket står ett sted:
  `CONFIG.limits` (`weaponLevel: 9`, `passiveLevel: 5`). `upgrades.combinationAfter` regnes ut fra det.
- Et nytt våpen er nivå 1, og hvert kort er nøyaktig ett nivå (`giveCard`).
- Et våpen på nivå 9 tilbys aldri som oppgradering igjen. Pakker fra leverandøren respekterer også taket.
- Nivå 9 + passiven (uansett nivå) gir kombinasjonen som et fremhevet «Nivå 10»-kort. Kortet og HUD-ikonet viser 10.
- Etter kombinasjonen tar våpenet ikke flere kort. The Matrix er også «nivå 10» og tar ikke flere kort.
- HUD-en viser nivå 1–9 på våpnene, og kortene viser «Nivå X av 9».
- Når alt er maksert, tilbys bare «Kaffepause-bonus», som før.
- **Automatisk sjekk i debug-modus:** overlegget viser «nivåtak ok». Går noe våpen over nivå 9 eller noen passiv
  over nivå 5, kommer en feilmelding i konsollen, et rødt banner og en linje i overlegget (`capViolations`).

### 2. Alle våpen har én kombinasjon
- Alle 12 kombinasjonene i tabellen fantes og var koblet til riktig passiv (kontrollert mot `CONFIG.weapons`).
- Bygget har 13 våpen. Det eneste uten kombinasjon var Livvakten.
- Den komplette tabellen over våpen, passive og kombinasjoner står i README.md.

**Kombinasjon jeg har designet:**

| Våpen | Passiv | Kombinasjon | Effekt |
| --- | --- | --- | --- |
| Livvakten | Brannmur (den andre utviklerens passiv fra versjon 5, ikke brukt i noen kombinasjon fra før) | **Neste generasjons brannmur** | Tre lengre brannmurer (150 px) i en trekant rundt spilleren, med én side mot den tetteste flokken. De står i 5 s, bremser 40 % og brenner i blå-hvite flammer. Nytt ikon: en flammetrekant med livvaktens solbriller |

- The Matrix godtar nå Livvakten på nivå 9 eller som kombinasjon, på samme måte som Skytsengelen.
- Oppslagstavla viser nå alle 13 kombinasjonene og The Matrix.

### 3. Capture-punktene: bare spilleren teller, større sirkel
- Fremdriften sjekker bare om spilleren står i sirkelen. «Opptatt»-tilstanden og visningen av den er fjernet.
- Sirkelen og boksen blir gule mens spilleren står i den.
- Radiusen er 70 logiske piksler (var 40).
- Alt annet er som før.

### 4. RNG: rundene blir forskjellige
**Funn i tilfeldighetsgeneratoren:**
- Generatoren (mulberry32 med xmur3-hash) er i orden.
- Hver strøm har sitt eget seed-navn og sin egen tilstand. Ingen strøm nullstilles under runden, og `Math.random()`
  brukes ikke.
- **Hovedårsaken** til like runder: alle de 16 strømmene var seedet fra datoen alene. Med samme valg ble det samme
  runde hele dagen, og i starten av en runde er valgene nesten alltid like.
- **Delt tilstand 1:** strømmen `spesial` ble brukt både til hastesakens tidspunkt og til bossenes angrep. Hvor lang
  bosskampen var, flyttet derfor hastesakene.
- **Delt tilstand 2:** strømmen `hendelser` ble brukt både til de sjeldne hendelsenes trekning og til retningen på
  de faste hendelsene. Når en boss forsinket en fast hendelse, endret det de sjeldne hendelsene senere.
- Faste seeds (`figurer|…`, `pynt`, `matrix-intro`) finnes bare i ren grafikk og er med vilje.

**Ny fordeling:**
- **Likt for alle hele dagen (datoen):**
  - når bossene kommer (fast)
  - når og hvilke kontorhendelser og punkt-hendelser som kommer
  - vanskelighetskurven (fra `CONFIG`)
  - hvor energidrikken og Sky-synk kommer
  - hastesakens tidspunkt og sted
- **Nytt i hver runde (rundeseeden):**
  - kortene
  - vanlige advokater (når, hvor og hvilke typer, og partnerne)
  - ringbølger og flokker, og detaljene i hendelsene (egen strøm `hendelsesdetaljer`)
  - drops
  - Dobbel skjerm, kritiske treff, unnvikelse, ping-pong og Fjernstyring
  - det tilfeldige i bossenes angrep (egen strøm `bossangrep`)
  - utseendet
- Rundeseeden lages med `crypto.getRandomValues` (16 heksadesimale tegn). Den lagres på topplisten (ny kolonne
  `seed`, lagt til automatisk i eksisterende databaser) og vises i debug-overlegget.
- `?debug&seed=…` spiller av en runde på nytt. En slik runde sendes ikke inn.
- **Kortene:** hvert gyldige kort har lik sjanse (`upgrades.equalOdds`). Det gjelder også den andre utviklerens
  vekter, som er tatt ut av bruk med dette valget. Detaljer:
  - Effektene på et våpen er ett kort.
  - Tilgjengelige kombinasjoner vises alltid.
  - Samme sett med kort tilbys aldri to ganger på rad.
  - Bot-testen viser at alle 13 våpen og alle 28 passive blir tilbudt.
- Simulatoren sjekker nå:
  - samme seed gir samme runde;
  - to seeder gir ulike runder;
  - strukturen fra dagens vakt er lik for begge.

### 5. Jacobs er en butikk
- Pulten med navneskiltet «JACOB» er fjernet. På samme sted står en liten dagligvarebutikk med:
  - hyller med varer, et kjøleskap med drikke, en snacksdisk med kurv og en kasse;
  - en stripete markise;
  - et eget treskilt med «JACOBS» og en liten kurv. Skiltet er tegnet i spillets egen stil, ikke kjedens logo,
    farger eller skrift.
- Sirkelen ligger foran og inn i butikken.
- Varselet er «Det er snacks på Jacobs!», og minikartet viser en liten butikk.
- Bonusen er uendret.

### 6. Utgåtte saker gir 70 % erfaring
- En ny lapp gir full erfaring. En utgått lapp gir 70 % som et fast trinn (`tickets.staleXp`). Saksbunker består
  bare av utgåtte lapper og gir 70 %.
- Erfaringen regnes ut når lappen når spilleren, også med Sky-synk. Testet: ny lapp 100, utgått lapp 70,
  saksbunke 70.
- Post-it-blokk: «Lappene gir full erfaring og full poengverdi i 2 sekunder lenger.»

### 7. Testrapport
**Bot-test.** `node tools/bot-test.js 120` kjører den automatiske testspilleren (`js/bot.js`) uten tegning.
- **Oppsett:**
  - 120 runder per gruppe, med ulike rundeseeder og alle fire karakterene;
  - to grupper: god spiller (ferdighet 0,9) og ekspert (1,0), altså 240 runder per måling.
- **Hva boten gjør:**
  - holder avstand til flokken;
  - henter energidrikk, lapper og Sky-synk;
  - tar punkt-hendelsene og går mot bossene;
  - fyller våpenplassene, oppgraderer det svakeste våpenet først (balansert bygg) og velger passiven
    kombinasjonene trenger.
- **Måler:**
  - varighet;
  - første og andre kombinasjon;
  - nivåopp per minutt;
  - hjelp per sekund per våpen og kombinasjon;
  - sparket per boss;
  - punkt-hendelser;
  - hvor ofte hvert kort tilbys.
- Samme test finnes som knapp i debug-panelet («Bot-test», 20 runder i nettleseren).

| Ekspert-bot (120 runder) | Før (7.1-regler, første kjøring) | Etter |
| --- | --- | --- |
| Varighet snitt / median | 11,4 / 14,2 min | 10,8 / 11,6 min |
| Beste 10 % fra / lengste | 15,8 / 17,3 min | 14,8 / 16,2 min |
| Første kombinasjon (median) | 4,9 min | 7,5 min |
| Andre kombinasjon (median) | 6,7 min | 9,3 min |
| Nivåopp per minutt, minutt 5–12 | 3,9–5,2 | 2,4–3,3 |
| Sparket (Nørdic / Printer / Anonymous / Johan) | 2/117 · 0/86 · 0/80 · 0/111 | 0/120 · 2/105 · 0/69 · 0/65 |
| Punkt-hendelser tatt | 89 % | 88 % |

Den gode boten (0,9) etter justeringene:
- varighet: snitt 10,4 min, median 10,7, beste 10 % fra 14,9;
- første kombinasjon: 7,2 min;
- sparket: 1 av ca. 100 møter per boss.

**Våpen og kombinasjoner** (`tools/measure-weapons.js`, hjelp per sekund mot 150 faste advokater, nivå 9 og
kombinasjon):

| | Før | Etter |
| --- | --- | --- |
| Nivå 9, spenn | 55–178 % av snittet | 69–138 % |
| Kombinasjon, spenn | 33–206 % | 44–136 % |

Tre kombinasjoner skiller seg fortsatt ut på denne målingen:
- **Allmøte på Teams** (44 %) og **Tofaktor** (66 %) er svake mot faste advokater, men blant de sterkeste i ekte
  runder (ca. 1 000 hjelp/s), fordi de rekker advokater langt unna.
- Det motsatte gjelder **Full omstart** og **Kabelkaos**: 135 % mot faste advokater, men lavere i rundene fordi
  boten holder avstand.
- Det er derfor bevisst at de ikke er presset helt likt på én av målingene.
- **The Matrix** er to våpen i én plass og ligger på ca. 2 × en kombinasjon.

**Mål som ikke er nådd helt:**
- **Første kombinasjon** kommer ved 7,2–7,5 min for boten, ikke 9–11.
  - Med brattere erfaringskurve kommer den senere, men da faller overlevelsen kraftig. Én test ga kombinasjon ved
    7,0 min, men median overlevelse på 9,1 min.
  - Årsaken er at boten bygger effektivt og plukker opp nesten alle lapper. En menneskelig spiller som mister en
    del lapper og velger mindre målrettet, får kombinasjonen senere.
  - Dette bør sjekkes med noen kolleger. Debug-overlegget viser nivåopp-tempoet.
  - Spakene er `CONFIG.level` (`square`), `CONFIG.upgrades.equalOdds` og `CONFIG.botTest`.
- **De beste 10 %** ligger på 14,8–14,9 min. Det er i øvre del av målet (12–15), og en veldig god spiller ryker
  rundt 15.

**Alle tall som er endret:**

| Hvor | Før | Etter | Hvorfor |
| --- | --- | --- | --- |
| `limits.weaponLevel` | – | 9 | Seksjon 1 |
| `upgrades.combinationAfter` | 10 | 8 (= nivå 9, regnes ut) | Seksjon 1 |
| `upgrades.equalOdds`, `repeatRedraws` | – | true, 6 | Seksjon 4 |
| `level` (erfaringskurven) | 20 + 10·n + 1,2·n² | 15 + 6·n + 2,2·n² | Raske nivåer tidlig, færre midt i: nivåopp ca. hvert 20. s ved minutt 8, senere kombinasjoner |
| `scaling.frustrationPerMin` | 0,15 | 0,10 | Færre nivåer midt i runden må veies opp, ellers rakk ikke boten første boss |
| `spawn.rate` ved 5 og 10 min | 5 / 13 per s | 4,2 / 10,5 per s | Samme grunn |
| `capture.radius` | 40 | 70 | Seksjon 3 |
| `tickets.staleXp` | – | 0,7 | Seksjon 6 |
| Fjernstyring `help` | 20 | 28 | Nivå 9 var 55 % av snittet |
| Teams-varsel `help` | 26 | 32 | 72 % |
| Oppdateringsstrålen `help` | 10 | 13 | 70 % |
| Ctrl+Z `help` | 14 | 12 | 178 % |
| Toner-kast `help` | 15 | 13 | 161 % |
| Ping-pong `help` | 30 | 38 | 66 % |
| Livvakten `help` | 26 | 34 | 71 % |
| Full omstart | radius 72, help 30 | radius 86, help 34 | Kombinasjonen tar ikke flere kort nå; svak i rundene |
| Tofaktor `help` | 34 | 29 | Sterkest i rundene |
| Kabelkaos | lengthPx 80, help 34 | 96, 40 | Svak i rundene |
| Domene-admin | hits 7, help 60 | 8, 70 | 63 % |
| Musematta | track 60, help 30 | 72, 38 | 80 % |
| Ctrl+Alt+Del | radius 90, help 30 | 108, 45 | Knapt sterkere enn Ctrl+Z på nivå 9 |
| Tvungen oppdatering | help 18, tick 0,45 | 48, 0,4 | 33 % |
| Allmøte på Teams `help` | 50 | 58 | 40 % |
| Neste generasjons brannmur | – | help 20, lengthPx 150, duration 5 | Ny |

Hvorfor kombinasjonene og den andre utviklerens våpen er justert:
- Kombinasjonene var laget som et utgangspunkt som skulle vokse med flere kort (versjon 6). Nå er de endelige, så
  flere av dem var knapt sterkere enn våpenet på nivå 9.
- Nivå 9-tallene til flere våpen skilte seg ut med mer enn ±30 %.
- Ingen passiver er endret.

**Ytelse:**
- Debug-panelet har fått «Stresstest-serie». Den kjører alle 13 kombinasjonene (fire om gangen), The Matrix, hver
  av de fire bossene og en punkt-hendelse med lunsjrush og partnermøte. Hvert scenario går 60 sekunder med maks
  advokater, og hovedtesten med Matrix og Anonymous går i 5 minutter.
- Serien måler FPS, frametid (snitt og verste), antall hakk over 16,7 ms og minne.
- **Ikke kjørt i denne versjonen.** Stresstest-serien er bygget og hvert scenario er sjekket for å sette seg opp
  uten feil, men selve målingen er hoppet over etter avtale med oppdragsgiver. Kjør den med `?debug&utenGPU` og
  knappen «Stresstest-serie», med nettleservinduet synlig. Resultatet kommer i konsollen. Siste målte stresstest
  (versjon 7.1, samme tunge bygg som hovedtesten) ga snitt 116 FPS, laveste 75 FPS og flat minnebruk.
- Det nye i 7.2 legger ikke til nye partikler eller effekter som tegnes hver frame. Den blå brannmuren er ferdigtegnet
  som de andre, og butikken er en del av det ferdigtegnede kartet. Forventet ytelse er derfor som i 7.1, men det er
  ikke målt.

## Versjon 7.1 – 27. november 2026 (Kristensens endringsprompt 5)

Bygget på versjon 7.0.1. Det den andre utvikleren har laget (versjon 5–6.1), er ikke endret, med det ene uttrykkelige
unntaket for Post-it-blokk (se «Konflikter»).

### Konflikter og avvik, og hvordan de er løst
1. **Post-it-blokk** (versjon 6.1) fikk lappene til å ligge 2 sekunder lenger per nivå. Som endringsprompten sier, gir
   den nå 2 sekunder lenger **full poengverdi** per nivå (samme tall). Hele forfallet, gulningen og sammenslåingen
   flyttes med, og lapper som allerede ligger ute, får den nye perioden. Navn, ikon og utseende er uendret. Kortet
   sier «Lappene gir full poengverdi i 2 sekunder lenger», og raden i «Dine tall» heter «Full poengverdi på lapper».
2. **Andre ting som påvirket hvor lenge lappene lå:** `CONFIG.tickets.lifetime` og `blinkTime` er fjernet (lappene
   forsvinner ikke og blinker ikke). Den gamle sammenslåingen over 400 lapper (versjon 4) er erstattet av saksbunkene
   og taket på 250. Tellingen av tapte lapper (`ticketsLost`) er fjernet, og slutt-skjermen viser i stedet hvor mange
   lapper du plukket og hvor stor andel som var nye. Lappemagneten ved nivåopp (6.1) og «Gratis lunsj!» (6) er
   uendret. Ingen karakterbonus eller annen passiv påvirket levetiden.
3. **Sky-synk og «drop-strømmen».** Endringsprompten sier at Sky-synk skal plasseres fra drop-strømmen. Den strømmen
   bestemmer også Ny PC, helsekjeks og pakker fra partnere. Bruker Sky-synk den, ville alle disse fått nye tidspunkter.
   Sky-synk har derfor sin egen strøm i «Dagens vakt» (`sky`). Den er like fast og lik for alle, og plasseres på samme
   måte som energidrikken.
4. **Hendelsene fra versjon 6** (lunsjrush, partnermøte, kaffepause …) er uendret. Punkt-hendelsene har sin egen
   strøm (`punkt`), teller ikke med i minstegapet på 25 sekunder mellom de gamle hendelsene, og «hendelser på
   kontoret» på slutt-skjermen teller fortsatt bare de gamle.
5. **Kartet:** ingenting er flyttet eller fjernet. Jacobs pult og pingpongbordet er lagt til på tomme plasser, og
   møterommet er det venstre av de to møterommene som fantes fra før.
6. **Erfaringskurven er ikke endret.** Se «Balansering» under.

### 1. Ticket-lappene går ut på dato i stedet for å forsvinne
- Lappene blir liggende til de plukkes opp, og erfaringen er alltid full.
- Poengene er fulle i 10 sekunder, synker jevnt til 25 % ved 30 sekunder og blir liggende der. Poengene regnes ut i
  det lappen når spilleren.
- Lapper eldre enn perioden er gulnet papir med et eselsøre. Blinkingen er fjernet.
- **Saksbunker:** gamle lapper i samme rute på 40 × 40 piksler slås sammen to ganger i sekundet til én bunke med
  samlet erfaring og samlet gjenværende poengverdi. Bunken er en stabel i tre størrelser (2, 6 og 15 lapper).
- **Tak:** maks 250 lapper og bunker. Over taket går nye lapper inn i nærmeste bunke innen 160 piksler, ellers i
  nærmeste lapp. Testet: 600 lapper gir 250 objekter, 6 000 av 6 000 erfaring er med, og poengene i bunkene etter 60
  sekunder er nøyaktig 25 %.
- **Sky-synk:** en ny pickup (sky med synk-pil), første gang ved 4:00, så hvert 90. sekund, maks én, minst 900
  piksler unna. Den vises med eget sky-symbol på minikartet og en grønn pil i kanten. Alle lapper og bunker på
  kartet kommer til spilleren på 1,5 sekunder (målt: 1,52 s).
- **Post-it-blokk:** se «Konflikter», punkt 1.

### 2. Nytt utseende på Livvakten og Shopkeeperen
- **Livvakten:** lys hud, fullt, kort og velstelt skjegg (kinn, hake og overleppe), litt tynt hår på toppen og blå
  genser med kort glidelås i halsen. Solbrillene og øreproppen med spiralledning er beholdt.
- **Shopkeeperen:** svart hettegenser med den store hvite «A»-en. Hetta dekker mesteparten av ansiktet: bare nedre
  del og det brune skjegget synes, aldri øynene, og litt brunt hår stikker fram under kanten. Alle rødlige farger er
  byttet til brunt. Ikonet til passiven er tegnet på nytt.
- I The Matrix har begge svarte frakker og svarte solbriller. Shopkeeperen beholder hetta, og brillene synes under
  kanten. Det nye utseendet brukes overalt: i spillet, på ikonene, på kortene, på oppslagstavla, i The Matrix og i
  animasjonen.
- Effekter, størrelser, animasjoner og tall er uendret.

### 3. Nye bilder for Johannes (karakter 3)
`figur_person3.png` (32 × 32) og `portrett_person3.png` (64 × 64) er byttet med de nye bildene med ugle, og brukes
piksel for piksel. Den nye figuren er identisk med den gamle bortsett fra ugla på skulderen (rad 12–18), og beina
(rad 27–30) er uendret. Gangsyklusen lages fortsatt fra fila: bare beina og føttene endres, og ugla følger hoppet.
Det er sjekket i nettleseren at hode, overkropp og ugle er identiske med originalen i alle fire gangbildene.
Spritene bygges fra filene ved hver lasting, så det ligger ingen gamle versjoner igjen. Treffboksen er den samme som
for de andre (`CONFIG.player.radius`).

### 4. Tilfeldige hendelser: ta et punkt på kartet
- **Hendelsene:** Snacks på Jacobs (+15 maks energi og 30 energi), Spille pingpong (+8 % hjelp på alle våpen) og
  Møterommet (+7 % bevegelseshastighet). Alle gir +1 nivå med en gang, og hver kan skje maks 2 ganger per vakt.
- **Stedene:** Jacobs pult med navneskilt og snacksskål (nederst, mellom resepsjonen og sofakroken), et pingpongbord
  (sosialt hjørne under kantina) og det venstre møterommet. De ligger 950–1 800 piksler fra hverandre.
- **Tidspunkt:** første rundt 1:30 (± 15 s), så ca. hvert 2. minutt, fra egen strøm (`punkt`). Aldri under en boss
  eller mindre enn 60 sekunder før en, og aldri to samtidig.
- **Gangen i en hendelse:** banner og lyd, sikte på minikartet og gul pil med ikon. Spilleren har 45 sekunder og en
  liten nedtellingsboks under poengsummen. En sirkel på 40 piksler må holdes i 8 sekunder. Ute av sirkelen synker
  fremdriften med 0,5 per sekund, og står en advokat i den, stopper fremdriften («Opptatt!», rødt). Første gang
  spilleren går inn, kommer en ekstra flokk fra tre retninger.
- **Belønning:** bonustekst og et gratis nivå. Bonusene vises som ikoner med antall (×2) etter våpnene nederst, og
  slutt-skjermen viser hvor mange hendelser du klarte.
- **Debug:** knappene «Snacks på Jacobs», «Spille pingpong», «Møterommet» og «Sky-synk».
- Alle tall og tekster står i `CONFIG.capture`.

### Balansering
Simulatoren (`--statistikk`, 10 dager × 4 karakterer). Nivåopp-tempoet er målt for ekspertrobotene:

| | Versjon 7.0.1 | 7.1 uten punkt-hendelser | 7.1 |
| --- | --- | --- | --- |
| God, planlagt (median) | 10,0 min | 11,1 min | 8,5 min |
| Ekspert (median / 75 % / maks) | 10,8 / 14,7 / 16,7 min | 14,2 / 15,0 / 16,2 min | 14,0 / 14,9 / 17,7 min |
| Sparket (ekspert) | 1 av 40 | 0 av 40 | 0 av 40 |
| Nivåopp, ekspert 5–7 / 7–9 / 9–12 min | hvert 15. / 13. / 16. s | 13. / 12. / 13. s | 14. / 11. / 13. s |

- At lappene ikke forsvinner, gir ekspertrobotene klart lenger runder (median 10,8 → 14,2 min). Det ligger rundt 15
  minutter, så **erfaringskurven er ikke endret**.
- Punkt-hendelsene er en reell risiko: robotene som går for dem, ryker litt tidligere i snitt (spesielt de nest beste,
  som går gjennom flokkene). De som klarer alle seks, er tydelig sterkere (beste runde 15:50 med 6 av 6).
- Robotene samler lapper mye bedre enn mennesker, så de går opp i nivå oftere (hvert 11.–14. sekund) enn målet for
  en god spiller (hvert 20.–30. sekund ved 8 minutter). For å måle ekte spillere viser debug-overlegget nå
  nivåopp-tempoet de siste 2 minuttene. Blir mennesker for raske eller trege, justeres `CONFIG.level`.
- Våpnene er ikke endret (`measure-weapons` gir samme tall som i 7.0).

### Ytelse
Stresstesten (5 minutter, `?debug&utenGPU`, programvarerendering, 400 advokater, fire kombinasjoner med The
Matrix og Anonymous ute hele tiden) ga snitt 116 FPS og laveste 75 FPS. Hver frame tok 0,2 ms oppdatering og
2,2–3,2 ms tegning, på full kvalitet hele tiden. Minnet var flatt (5,1 MB ved start, mellom 5,9 og 8,6 MB underveis,
8,2 MB ved slutt). Lappene holdt seg under taket: midt i testen lå 1 818 lapper som 240 objekter, 102 av dem bunker.
Sammenslåingen kjører to ganger i sekundet, og sjekken av punktet går gjennom advokatene én gang per oppdatering,
bare mens en hendelse pågår.

Determinismesjekkene i simulatoren er grønne (to like runder, Dobbel skjerm og annet utseende), og typesjekken har
de samme fire gamle advarslene i `js/input.js` som før.

## Versjon 7.0.1 – 26. november 2026
- Boss 3 heter nå **Anonymous** i spillet («Anonymous og venninnene har ankommet!», «ANONYMOUS» på pila og
  klokka). Utseende, replikker og angrep er uendret. I koden heter hun fortsatt `frida` (`CONFIG.bosses.frida`,
  `js/frida.js`), så Fiske-Frida i versjon 7.0 under er samme boss.

## Versjon 7.0 – 26. november 2026 (Kristensens endringsprompt 4, bygget på versjon 6.1)

Bygget videre på versjon 6.1 (den andre utviklerens grein). Det han la til, er ikke endret, fjernet eller
rebalansert, med unntakene som står under «Konflikter». Versjon 4.1 (stillestående mini-printere og
oppdragsgivers karakterbilder, laget på `main` før 6.1 var kjent) er flettet inn og tilpasset systemet i versjon 6.

### Konflikter med versjon 5–6.1, og hvordan de er løst
1. **«Maks våpennivå 9» og «kombinasjoner krever nivå 9».** I versjon 6 har våpnene ikke nivåer: hvert kort gir én
   oppgradering uten tak, og en kombinasjon krever 10 oppgraderinger + riktig passiv. Et nivåtak på 9 ville betydd å
   skrive om hele oppgraderingssystemet. Det er derfor ikke innført. Kravet «litt senere kombinasjoner» er allerede
   oppfylt (10 oppgraderinger ≈ «nivå 11»). Passord-reset (maks 24 hopp) og Skytsengelen (maks 6 per kast, 12
   samtidig) har allerede høyere tak enn «nivå 9» (11 hopp, 3 per kast og 7 samtidig), så tallene er ikke endret.
   Ping-pong og Livvakten har fått nivåtabellene fra endringsprompten som vekstregler, og The Matrix og Ping of Death
   krever 10 oppgraderinger, som de andre kombinasjonene. Passive har fortsatt maks nivå 5.
2. **Skytsengelen.** Mini-printerne i 6.1 tuslet mot advokatene og hjalp alle i en radius med papirsalver (regelen
   `burst`). Seksjon 1 sier eksplisitt at de skal stå stille og skyte papirark, så det er endret: `burst` betyr nå tid
   mellom arkene (0,3 s, med gulv 0,15 s), og `radius` (salveradius) er byttet med `range` (rekkevidde 60 piksler,
   +9 per steg, maks 130). De andre reglene (antall per kast, maks samtidig, intervall, levetid) er uendret. Hjelpen er
   justert så våpenet måler det samme som i 6.1 (+16: 1027 mot 1034, kombinasjon: 2108 mot 2150).
3. **«Brannmur»** er allerede navnet på en passiv (unnvikelse). Livvaktens flammelinje heter også brannmur i
   teksten, men våpenet heter Livvakten (`bodyguard`), så ingenting kolliderer.
4. **Joggesko** var ikke brukt i noen kombinasjon, så Ping of Death bruker Joggesko som ønsket.
5. **Klassepassivene** Kastekurs og Sommervikar lister våpnene i klassen sin. Teksten har fått Ping-pong og Livvakten
   lagt til (effekten er uendret).
6. **Bossenes frustrasjon** ble hevet i versjon 5. Fiske-Frida har samme tall som bossen hun erstatter (6 600).

### 1. Skytsengelens mini-printere står stille
Fra versjon 4.1: printerne lander der advokaten stod, står helt stille, skyter et papirark mot nærmeste advokat
innenfor 60 piksler hvert 0,3. sekund, og forsvinner etter ca. 4 sekunder i en papirsky. Landingshopp, støvsky,
ark som mates ut og en svak rekkeviddesirkel. Himmelsk serviceavtale står også stille og avslutter med konfetti.

### 2. Oppdragsgivers bilder av karakterene
Fra versjon 4.1: de 8 PNG-filene ligger i `assets/karakterer/` og brukes piksel for piksel med heltallsskalering
og nærmeste nabo. Gangsyklusen endrer bare beina og føttene (hopp på 1 piksel), venstre er speilet, og effekter
legges oppå. Topplisten bruker 32 × 32-figuren. De gamle spritene og portrettene er fjernet. Johan er tegnet i
samme stil. Forhåndsvisningen (`?debug=karakterer`) viser de fire, Johan og nå også Fiske-Frida med venninnene.

### 3. Nivå 9
Se «Konflikter», punkt 1.

### 4. Nytt våpen: Ping-pong
Spretter mot skjermkantene og ytterveggene, blir 6 % raskere og gir 10 % mer hjelp per sprett (tak +60 %, høyere
med oppgraderinger), går gjennom advokatene (samme ball maks hvert 0,5. sekund per advokat) og forsvinner etter et
fast antall sprett. «PING»/«PONG» annethvert sprett (bare når det er få baller) og «pok» når lyden er på. Retningen
kommer fra en ny strøm i «Dagens vakt» (`pingpong`). **Ping of Death** (+ Joggesko): ballen deler seg ved hvert
sprett (maks 12) og etterlater et glødende spor. Ballene bruker objektpoolen.

### 5. Nytt våpen: Livvakten
Følger spilleren og lager en brannmur av animerte flammer 30 piksler unna, på tvers av den tetteste flokken (eller
de 2–3 tetteste). Hjelp hvert kvarte sekund og 30 % sinking (opptil 50 %), blokkerer ingenting og skader aldri
spilleren. Hengelåser, enere og nuller stiger opp fra gløden. Maks 3 brannmurer samtidig, likt for alle.

### 6. Shopkeeperen
Sertifisering heter nå Shopkeeperen, med nytt ikon (svart genser med hvit «A») og en liten figur som følger
spilleren. Effekten er uendret. Tvungen oppdatering krever Oppdateringsstrålen + Shopkeeperen.

### 7. The Matrix
Tilbys som eget kort med grønn kode-ramme når Skytsengelen (10 oppgraderinger eller kombinert), Livvakten (10
oppgraderinger) og Shopkeeperen er samlet. Slår sammen engelen og livvakten (frigjør én våpenplass), spiller en
animasjon på 2,5 sekunder mens spillet står på pause (kan hoppes over, følger reduserte blinkeffekter, påvirker
ikke tiden eller «Dagens vakt»), og gir grønne mini-printere og brannmurer, kode-regn hvert 12. sekund (litt hjelp
til alle på skjermen) og bullet time (advokater, bosser og fiendeprosjektiler 50 % saktere i 3 sekunder; bossens
nedtelling går som normalt). Egen grønn ramme på oppslagstavla, og nevnt på slutt-skjermen. Bruker spillets egen
pikselfont – ingen logo, skrifttype eller figurer fra filmen.

### 8. Ny boss 3: Fiske-Frida og venninnene
Erstatter «Fristen er om 2 minutter!» (fjernet, nedtellingsklokka er beholdt for alle bossene). Fire angrep: «Klikk
på lenken!» (stiplet linje, kroken drar deg mot henne), silderegn (skygger, sild etter 1 sekund), videresendt
svindel-e-post (venninnene løfter mobilen, fisk i bølgete linje) og lokkemat (falsk drikk eller PC med fiskekrok,
kan avsløres på farge, krok og blink, aldri på minikartet, maks 3, borte når Frida er hjulpet). Venninnene har 15 %
av Fridas frustrasjon hver og gir ekstra poeng om de hjelpes for seg. Johans «Videresendt fra tidligere bosser» er
uendret (Nørdic og printeren).

### 9. Helsekjeks
Ca. 1 av 100 vanlige glade advokater legger igjen en kjeks (drop-strømmen): 5 energi, ingen sukkerkick, ligger i 10
sekunder og blinker de siste 3, maks 6 på kartet, samme plukkradius som lappene, svak varm glød, ikke på minikartet.
Partnerne (som allerede gir lapper og pakker), bossene, venninnene og hastesaken dropper ikke kjeks.

### Målinger
`tools/measure-weapons.js 16`:

| Våpen | +16 | Kombinasjon | Hjelp/s | I forhold til snittet |
| --- | --- | --- | --- | --- |
| Skytsengelen | 1027 | Himmelsk serviceavtale | 2108 | 95 % |
| Ping-pong | 855 | Ping of Death | 2312 | 104 % |
| Livvakten | 776 | The Matrix (med Skytsengelen og Shopkeeperen) | 2664 | 120 % |

De andre våpnene er uendret fra 6.1. The Matrix er med vilje litt sterkere enn en vanlig kombinasjon, siden den er
mye vanskeligere å få.

`tools/simulate.js x 25 --statistikk` (10 dager × 4 karakterer):

| Robot | Median | 25–75 % | Lengst | Sparket |
| --- | --- | --- | --- | --- |
| God, bygger bevisst | 10,0 min | 7,0–14,1 min | 15,5 min | 0 av 40 |
| Ekspert | 10,8 min | 7,1–14,7 min | 16,7 min | 1 av 40 |
| Ekspert, `--utennye` (uten Ping-pong og Livvakten i kortene) | 14,0 min | 8,2–15,0 min | 16,4 min | 1 av 40 |

De beste rundene ryker fortsatt rundt 15–17 minutter (veggen i overtid). Medianen er lavere enn i 6.1 fordi
robotene, som bygger etter en fast plan, får sjeldnere tilbud om sine planlagte våpen når det er to flere våpen i
bunken. Med de nye våpnene holdt utenfor er medianen 14,0 (6.1: 13,2). Fiske-Frida ble hjulpet på 12–24 sekunder
av robotene i prøverundene. Determinismen holder: to like runder gir samme resultat, også med Dobbel skjerm og annet
utseende.

**Stresstest** (`?debug&utenGPU`, minutt 15, 400 advokater, Tofaktor + Kontorprinteren + Ping of Death + The
Matrix, Fiske-Frida ute hele tiden, kjørt bilde for bilde i nettleseren): snitt 5,1 ms per bilde (oppdatering 0,3 ms,
tegning 4,8 ms), median 2,7 ms, p99 11,9 ms – godt under 16,7 ms for 60 FPS. 12 baller, 3 brannmurer og kode-regn
samtidig. Kode-regnet koster ikke målbart (3,08 mot 3,04 ms tegning med og uten). Minnet er flatt (5,6 → 5,3 MB).
Stresstesten bør likevel kjøres på en ekte kontor-PC før publisering.

## Versjon 6.1 – 26. november 2026 (endringsprompt 6: finpuss og gjenstander)

### 1. Ikoner som manglet
- Kaffemaskin, Mekanisk tastatur, Overtid, Hev-senk-pult og Brannmur (fra versjon 5) hadde aldri fått ikon, så
  kortene, ikonraden og «Dine tall» viste tomt. Alle 57 ikoner (våpen, kombinasjoner, passive, knapper) tegnes nå
  uten feil i en test med stubbet lerret, og sprite-settet (inkludert pakken og de røde kopiene) lages uten feil.

### 2. Seks nye gjenstander (28 passive)
- Sikkerhetskopi (overlever dødelige treff, maks 3), Takknemlige advokater (energi per hjulpet), Post-it-blokk
  (lappene ligger lenger), Bonusordning (+10 % poeng), Termos (bedre energidrikk) og Vaktmester (mindre treghet).

### 3. Tre nye effekter og flere regler
- Purring (10 % mer hjelp fra alt i 3 sekunder), Eskalering (+15 % mot partnere og bosser) og Innkalling (drar
  advokaten mot deg, bare våpen med rekkevidde). Ni effekter i alt.
- Nye regler: dytt (Full omstart), hoppetid (Passord-reset), bue (HDMI-kabelen), rekkevidde (Fjernstyring, som
  før var fast 330 px), pause per advokat (mus og Ctrl+Alt+Del), takt (strålen), styring (Teams) og papirsalver
  (Skytsengelen).
- Hjelp-kort vektes 2,5 ganger og antall-kort 1,5 ganger innenfor et våpen, ellers ble byggen utvannet av småregler
  (ekspertrobotenes median falt fra 12 til 8 minutter før vektingen, og er 13 etter).

### 3b. Trefftallet viser hele treffet
- Før viste tallet bare det advokaten trengte (overskytende hjelp ble kuttet), så et stort våpen så lite ut mot
  juniorfullmektiger. Nå vises hele treffet. Statistikken og måleverktøyet teller fortsatt bare det som trengtes.

### 4. Fem småting (egne forslag)
1. Nivåkø i overskriften ved nivåopp.
2. Banner 10 sekunder før hver boss.
3. Lappemagnet ved nivåopp og pakke.
4. Bygget på slutt-skjermen, og «Dine tall» i pausemenyen.
5. Innstillinger for trefftall og frustrasjonsbarer.

`tools/measure-weapons.js 16` (fordelt som kortene kommer: hjelp og antall oftest):

| Våpen | +16 | Kombinasjon | Hjelp/s | I forhold til snittet |
| --- | --- | --- | --- | --- |
| Skru av og på | 861 | Full omstart | 2681 | 121 % |
| Toner-kast | 1156 | Kontorprinteren fra helvete | 2888 | 131 % |
| Passord-reset | 767 | Tofaktor | 2927 | 132 % |
| HDMI-kabelen | 961 | Kabelkaos | 2100 | 95 % |
| Fjernstyring | 345 | Domene-admin | 2310 | 104 % |
| Trådløse mus | 971 | Musematta | 2442 | 110 % |
| Ctrl+Z | 1039 | Ctrl+Alt+Del | 1997 | 90 % |
| Oppdateringsstrålen | 556 | Tvungen oppdatering | 1295 | 59 % |
| Teams-varsel | 409 | Allmøte på Teams | 1331 | 60 % |
| Skytsengelen | 1034 | Himmelsk serviceavtale | 2150 | 97 % |
| Støydempende headset | 0 | Hjemmekontor | 0 | (forsvar – blokkerer treff) |

`tools/simulate.js x 25 --statistikk`: ekspert median 13,2 min (25–75 %: 5,8–14,4, lengst 17,3, 1 av 40 sparket).
Bygget til robotene er enda litt bedre enn før (gjenstandene hjelper), så veggen i overtid tar dem litt senere.

## Versjon 6.0 – 26. november 2026 (endringsprompt 5: oppgraderinger uten tak)

Våpnene har ikke lenger nivåer. Hvert kort gir én bestemt oppgradering, kortene har sjeldenhet, flaksen avgjør hvor
langt du kommer, og vanskeligheten stiger lineært med hendelser som gir variasjon.

### 1. Oppgraderinger uten tak
- **Ett kort = ett steg.** «Trådløse mus: +1 mus (3 → 4)», «Toner-kast: +4,5 hjelp per treff (15 → 19,5)», «Passord-reset:
  Kortere tid mellom aktiveringer (1,05 s → 0,94 s)». Kortet viser alltid tallet før og etter. Et våpen kan ta
  så mange oppgraderinger du rekker. Hjelpen vokser lineært (`pct` av grunntallet per steg), intervallene har
  gulv, og alle antall (mus, kassetter, hopp, treff) har et tak av hensyn til kontor-PC-ene.
- **Reglene** står i `growth` på hvert våpen i `CONFIG.weapons`, som før, men uten nivålister. `weaponStats()` i
  js/weapons.js regner ut tallene fra grunntall + oppgraderingene (`w.up`) når noe endrer seg, aldri per bilde.
- **Kombinasjonen** krever 10 oppgraderinger pluss riktig passiv, og er et nytt utgangspunkt som er tydelig
  sterkere (1,5–3 × målt). Oppgraderingene etterpå vokser videre fra den. Kombinasjonenes tall er justert ned
  fra versjon 5, siden de ikke lenger er et sluttpunkt.
- **Effekter** (sjeldne kort): Gjennomtrengende, Sprut, Venter på IT, Saken ligger i køen, Avvist og Ekstra
  kaffe. Hvert våpen har en liste over hvilke det kan få. De er koblet inn ett sted (`help()` i js/enemies.js
  og prosjektilenes `through`), aldri i tegnekoden.

### 2. Kortnivåer og flaks
- **Fire nivåer:** grå = vanlig (1 steg), grønn = uvanlig (2), blå = sjelden (3, og effektene), oransje =
  legendarisk (5, eller to effektnivåer). Sjansene er 68/23/7/2 %. Kortene har farget stripe og ramme.
- **Hesteskoen** erstatter Kontorlotteriet: +25 % flaks per nivå (alt over vanlig ganges med 1 + flaks) og +12 %
  sjanse for et fjerde kort.
- **Nytt utvalg (R)** og **Fjern kortet (✕, eller B + tallet)**: ett av hvert fra start, ett til per hjulpet boss.
  Fjernede kort kommer aldri igjen den vakta.
- **Kortene vektes** slik at oppgraderinger til våpen du har kommer oftest, og nye våpen 2,5 ganger så ofte mens
  du har færre enn to.

### 3. Pakke fra leverandøren og partnernes lapper
- Hver hjulpet boss legger igjen en pakke (3 våpenoppgraderinger, minst uvanlige; Johan 5). En hjulpet partner
  gjør det i 2,5 % av tilfellene (1 oppgradering). Pakken åpnes med en egen skjerm som viser hva den inneholdt.
  Gull pil mot pakken når den er utenfor skjermen.
- Partnerne legger igjen 1–5 ticket-lapper (halv verdi hver) i stedet for én.

### 4. Klassepassive
- Hvert våpen har en klasse: prosjektil, kjede, område eller hjelper. Fire nye passive gir +15 % hjelp per nivå
  for én klasse: Kastekurs, Nettverkssertifisering, Åpent landskap og Sommervikar. 22 passive i alt.

### 5. Lineær vanskelighet med hendelser
- **Kurven er en rett linje:** frustrasjon 1 + 0,15 × (minutter − 3), skade +6 % per minutt, fart +3 % per minutt.
  Overtid fra 12:30 med × 1,8 per minutt og +22 % fart per minutt – det er veggen.
- **Faste hendelser** på hver vakt: Lunsjrush (2:30, 7:30, 12:30), Printerkø (4:30, 9:30, 14:30) og Partnermøte
  (7:30, 13:30). **Sjeldne hendelser** trekkes én gang i minuttet fra sin egen strøm: Kaffepause, Gratis lunsj
  og Serverkrasj. Alle vises som banner med forklaring. Minst 25 sekunder mellom to hendelser, og de faste venter
  mens en boss er ute.
- Trådløse mus starter med tre mus (var to), så musekarakteren ikke ryker i det første rushet.

### 6. Synlighet
- **Fiendtlige prosjektiler blinker rødt** (annethvert tidels sekund tegnes en rødtonet kopi). Med reduserte
  blinkeffekter er de rødtonet hele tiden i stedet.
- **Dine tall** viser nå også hjelp per klasse, flaks, fjerde kort, nytt utvalg og fjerninger igjen, og hvert våpen
  med alle tallene sine, antall oppgraderinger, hvor langt det er til kombinasjonen og effektene.
- Ikonraden nederst viser antall oppgraderinger per våpen. Slutt-skjermen teller pakker, oppgraderinger og hendelser.

### 7. Ytelse og determinisme
- Ingen nye objekter per bilde: de røde kopiene lages én gang, effektene er tall på våpenet, prosjektilene peker
  på våpenets effektobjekt. Sprut bruker en egen liste og hjelper maks 6 naboer, uten rekursjon.
- To nye strømmer i «Dagens vakt»: `pakke` og `hendelser`. Simulatoren bekrefter at to like runder gir samme
  resultat, også med Dobbel skjerm og annet utseende.

`tools/measure-weapons.js 16` (hjelp per sekund, 150 advokater 40–300 px rundt spilleren, 16 oppgraderinger jevnt fordelt):

| Våpen | +16 | Kombinasjon | Hjelp/s | I forhold til snittet |
| --- | --- | --- | --- | --- |
| Skru av og på | 945 | Full omstart | 2306 | 133 % |
| Toner-kast | 1082 | Kontorprinteren fra helvete | 2378 | 137 % |
| Passord-reset | 731 | Tofaktor | 2781 | 160 % |
| HDMI-kabelen | 1189 | Kabelkaos | 1635 | 94 % |
| Fjernstyring | 512 | Domene-admin | 1841 | 106 % |
| Trådløse mus | 687 | Musematta | 1537 | 88 % |
| Ctrl+Z | 898 | Ctrl+Alt+Del | 1537 | 88 % |
| Oppdateringsstrålen | 482 | Tvungen oppdatering | 820 | 47 % |
| Teams-varsel | 407 | Allmøte på Teams | 1186 | 68 % |
| Skytsengelen | 993 | Himmelsk serviceavtale | 1361 | 78 % |
| Støydempende headset | 0 | Hjemmekontor | 0 | (forsvar – blokkerer treff) |

`tools/simulate.js x 25 --statistikk` (10 dager × 4 karakterer):

| Robot | Median | 25–75 % | Lengst | Sparket |
| --- | --- | --- | --- | --- |
| God, bygger bevisst | 10,0 min | 5,8–14,7 min | 17,5 min | 1 av 40 |
| Ekspert | 12,1 min | 6,4–15,0 min | 18,1 min | 1 av 40 |

Medianen for ekspertene ligger altså ved Johan (12:00), som ønsket: om du kommer dit og videre, avgjøres av byggen
og flaksen med kortene. Veggen i overtid tar nesten alle mellom 15 og 18 minutter. Robotene bygger dårligere enn
et menneske og unngår skade dårligere, så forvent at folk ligger rundt det samme.

### Antakelser
- «Hver runde skal føles litt annerledes» er løst med hendelsene, men innenfor «Dagens vakt»: samme dag og samme
  valg gir fortsatt samme runde (topplisten må være rettferdig). Forskjellen mellom dager er større enn før.
- Kombinasjonene nullstiller oppgraderingene (de er bakt inn i kombinasjonens tall). Alternativet – å legge dem
  oppå – ga 6–10 × hopp og ble forkastet.
- Pakker fra partnere er sjeldne (2,5 %) med vilje: med 8 % snøballet alle gode runder til 20 minutter.
- Stresstesten (`?debug&utenGPU`) er ikke kjørt i denne omgangen (ingen nettleser i arbeidsmiljøet).

## Versjon 5.0 – 26. november 2026 (endringsprompt 4: Brotato-retning)

Spillet er fortsatt én sammenhengende vakt som blir vanskeligere og vanskeligere (ingen butikk, ingen runder), men
oppgraderingene er dypere, alt er synlig, og alle våpen sikter selv.

### 1. Alle våpen sikter på nærmeste advokat
- **Toner-kast, HDMI-kabelen og Oppdateringsstrålen** siktet før dit du gikk. Nå sikter de på nærmeste advokat
  (strålen følger den mens den varer). **Fjernstyring** tok tilfeldige advokater på skjermen, nå de nærmeste.
  Passord-reset, Ctrl+Z, Teams-varsel og Skytsengelen siktet på nærmeste fra før. Puls og mus er områdevåpen.
- **Nytt oppslag i rutenettet:** `Grid.nearest()` i js/utils.js går ut i ringer fra punktet og stopper så snart
  det beste treffet er nærmere enn neste ring kan være. Det koster noen få celler også med 400 advokater, og
  lager ingen objekter. Alle våpen bruker samme funksjon (`closest()` i js/weapons.js).

### 2. Tolv nivåer per våpen, laget av vekstregler
- **Nivåtaket er 12** (var 8). Kombinasjonen krever nivå 12 pluss riktig passiv, som før.
- **Hvert våpen har `base` (nivå 1) og `growth`** i `CONFIG.weapons`, og `buildLevels()` nederst i js/config.js
  lager de tolv nivåene og kortteksten. Eksempler: Trådløse mus får +1 mus annethvert nivå (2 → 8, 12 som
  kombinasjon), større bane og raskere rotasjon hvert nivå. Toner-kast får +1 kassett hvert tredje nivå (2 → 6).
  Passord-reset +1 hopp per nivå (3 → 14). Teams-varsel +1 varsel annethvert nivå (1 → 7). Fjernstyring +1 treff
  annethvert nivå (1 → 7). Skytsengelen flere mini-printere (2 → 5 samtidig). Headsetet får 2 ladninger fra nivå 7.
- Kortteksten lages av det som faktisk endret seg: «+1 mus, større bane, raskere rotasjon, +12 % hjelp.»
- `CONFIG.newWeapons` er tom (beholdt for verktøy); alle våpen står i `CONFIG.weapons`.

### 3. Frustrasjonsbarer og trefftall
- **Bar over hodet** på hver advokat som er skadet og ble hjulpet i løpet av de siste 1,5 sekundene (2 piksler høy,
  12 brede). Posisjonene samles i ett pass og fylles i to, så fyllfargen byttes to ganger uansett antall barer.
- **Trefftall** stiger og blekner over advokaten, med et 8 × 8-ikon av våpenet. Kritiske treff er gule. Treff på samme
  advokat innen 0,25 sekunder slås sammen til ett voksende tall (ingen tallsky fra kjeder og mus). Maks 120 tall
  samtidig. Sifrene kopieres fra et ferdiglaget ark – ingen tekstbehandling eller strenger per bilde.
- **Automatisk kvalitet:** middels skrur av ikonene, lav skrur av tall og barer (partnerne beholder baren).

### 4. Seks nye passive og «Dine tall» ved nivåopp
- **18 passive, maks 8 samtidig** (var 12 og 6). Nye: Kaffemaskin (+5 % kritisk sjanse, kritisk = 1,5 × hjelp),
  Mekanisk tastatur (+25 % kritisk hjelp), Overtid (+15 % hjelp, −4 % fart), Hev-senk-pult (+0,35 energi/s),
  Brannmur (+6 % unnvikelse, maks 30 %, «Unngikk!»), Kontorlotteriet (+20 % sjanse for et fjerde kort).
- Kritiske treff og unnvikelse har egne tilfeldighetsstrømmer i «Dagens vakt».
- **Kortene vektes:** våpen du har, kommer 2,5 ganger så ofte som nye, passive du har 1,5 ganger. Da kan du bygge.
- **«Dine tall»** under kortene: 17 tall (hjelp, kritisk, intervall, område, fart, varighet, prosjektiler, dobbel
  aktivering, energi, regenerering, skadereduksjon, unnvikelse, bevegelse, plukkradius, erfaring, fjerde kort) og
  alle våpen og passive med nivå. Tast 4 velger det fjerde kortet.

### 5. Partnere (eliter)
- Fra minutt 5: 1 % sjanse per advokat, +0,6 prosentpoeng per minutt, maks 8 %, maks 4 samtidig. Aldri avsendere.
- 6 × frustrasjon, 1,6 × skade, 0,85 × fart, 12 × poeng, litt større. Gullkrone, bred bar som alltid vises, og
  egenskapen som tekst over baren.
- **Partner-aura:** andre advokater innen 70 piksler tar halv hjelp (gul ring). **Delegerer:** tre juniorer når den
  er hjulpet. **Har hastverk:** «!» i 0,5 sekunder, så 0,6 sekunders spurt (3,2 × fart) mot der du stod.
- Slutt-skjermen teller partnerne. Debug-knapp «Partner».

### 6. Vanskelighet
- **Ingen advokat dør av ett treff i starten:** juniorfullmektig 18 frustrasjon (var 10), seniorpartner 140 (80),
  printerentusiast 60 (35), «Haster!»-avsender 50 (30), hastesak 220 (150). Startvåpnene gir 11–18 hjelp, så det
  er to treff på en junior.
- **Kurven:** +9 % frustrasjon per minutt etter minutt 3 (var +8 %), +7 % skade per minutt (6 %), +3 % fart (2,5 %).
  Overtid fra 13:00 er uendret – runden går «mot uendelig», men ingen overlever den.
- **Bossene** har 1,5 × frustrasjon (1 300 / 3 400 / 6 600 / 9 800), siden våpnene vokser lenger.
- **Raskere levling** (10 + 1,2 per nivå i stedet for 13 + 1,5), fordi det er 88 oppgraderinger å kjøpe mot 62.
- Topplistens tak på poeng per sekund er hevet til 9 000 (partnerne gir store lapper).

`tools/measure-weapons.js` (hjelp per sekund, 150 advokater 40–300 px rundt spilleren):

| Våpen | Nivå 12 | Kombinasjon | Hjelp/s | I forhold til snittet |
| --- | --- | --- | --- | --- |
| Skru av og på | 1129 | Full omstart | 1269 | 102 % |
| Toner-kast | 1444 | Kontorprinteren fra helvete | 1271 | 102 % |
| Passord-reset | 672 | Tofaktor | 1268 | 101 % |
| HDMI-kabelen | 1037 | Kabelkaos | 1255 | 100 % |
| Fjernstyring | 523 | Domene-admin | 1238 | 99 % |
| Trådløse mus | 903 | Musematta | 1269 | 101 % |
| Ctrl+Z | 1118 | Ctrl+Alt+Del | 1241 | 99 % |
| Oppdateringsstrålen | 481 | Tvungen oppdatering | 1249 | 100 % |
| Teams-varsel | 472 | Allmøte på Teams | 1254 | 100 % |
| Skytsengelen | 833 | Himmelsk serviceavtale | 1183 | 95 % |
| Støydempende headset | 0 | Hjemmekontor | 0 | (forsvar – blokkerer treff) |

`tools/simulate.js --statistikk` (10 dager × 4 karakterer):

| Robot | Median | 25–75 % | Lengst | Sparket |
| --- | --- | --- | --- | --- |
| God, bygger bevisst | 7,0 min | 5,8–11,0 min | 14,3 min | 1 av 40 |
| Ekspert | 7,8 min | 5,6–11,1 min | 14,4 min | 0 av 40 |

I versjon 4 var medianene 9,4 og 10,1 minutter, så vakta er omtrent to minutter hardere for robotene. Uten partnere
(`--utenpartnere`) og uten bosser (`--utenbosser`) er medianen rundt ett minutt lenger hver. Robotene bygger
dårligere enn et menneske med 12 nivåer og 18 passive, så forvent at folk holder lenger.

### 7. Ytelse
- Ingen nye objekter per bilde eller per treff: barposisjoner i typed arrays, sifre fra ett ark, ikoner laget én gang,
  trefftall i den eksisterende effektpoolen med eget tak.
- Nærmeste-søket er billigere enn før (ringer i rutenettet i stedet for alle advokater innen rekkevidde).
- Partnerauraen koster maks 4 avstandssjekker per treff.
- Stresstesten (`?debug&utenGPU`, knappen «Stresstest») bør kjøres på en kontor-PC før publisering; den er ikke
  kjørt i denne omgangen (ingen nettleser i arbeidsmiljøet).

### Antakelser
- «Litt mer Brotato» er tolket som: statistikk-passive, synlige tall, kritiske treff, eliter og vektede kort – ikke
  butikk, runder eller materialer. Vakta er fortsatt én sammenhengende runde.
- Puls og mus er bevisst holdt som områdevåpen («sikter» ikke), siden de omgir spilleren.
- Partnerne kommer fra minutt 5 så den rolige starten beholdes. Flytt `elites.from` for å endre det.

## Versjon 4.0 – 25. november 2026 (endringsprompt 3)

### 1. Fire forskjellige bosser i fast rekkefølge, og «Du har fått sparken!»

| Tid | Boss | Nedtelling | Frustrasjon | Poeng |
| --- | --- | --- | --- | --- |
| 3:00 | Nørdic-konsulenten | 120 s | 850 | 2 500 |
| 6:00 | Multifunksjonsmonsteret | 120 s | 2 200 | 4 000 |
| 9:00 | «Fristen er om 2 minutter!» (med e-postvifta) | 120 s | 4 400 | 6 000 |
| 12:00 | Johan, siste boss | 150 s | 6 500 | 15 000 |
| 15:00, 18:00 … | Johan igjen | 150 s | × 1,5 per gang | × 1,4 per gang |

Felles for alle:
- **Obligatoriske.** Går nedtellingen ut, fryser spillet, bossen ser skuffet ut, og «DU HAR FÅTT SPARKEN!» vises. Slutt-skjermen får overskriften «Du har fått sparken!» og linjen «‹Boss› fikk deg sparket ved m:ss». Scoren kan sendes inn, og topplisten viser en liten flytteeske ved runden. Går energien tom først, er det vanlig game over.
- **Stor klokke øverst** mens bossen er ute (med navnet), i tillegg til klokka ved bossen. Den blir gul ved 30 sekunder og rød, blinkende og tikkende ved 10. Blinkingen følger innstillingen for reduserte blinkeffekter.
- **Egen introduksjon** med navn, replikk og egen lyd. Johan får en større intro: skjermen mørkner, og portrettet vises med «SISTE BOSS: JOHAN» og «Har du et lite minutt?».
- **Varsling.** Alle angrep varsles i 0,65 sekunder (positur, lys eller «!»), og Johans spurt viser en linje. Alle bossprosjektiler teller med i taket på 60.
- **Glad-animasjon** (tommel opp) og egen snakkeboble: «Sak lukket!», «Utskrift fullført», «Fristen ble holdt!» og «Bra jobba!».
- **Pilen og minikartet** gjelder for alle bossene. Pilen er merket NØRDIC, PRINTER, FRIST eller JOHAN.
- **Slutt-skjermen** viser alle bossene spilleren møtte, med små portretter, og hvem som ble hjulpet.

### 2. Nørdic-konsulenten (3:00)
- **Firmaet er oppdiktet:** «Nørdic», med egen logo (krøllparenteser rundt en N) i skoggrønt og lime, og en enkel pikselskrift. Ingen ekte navn, logo, fargeprofil eller skrifttype er brukt.
- **Utseende og tone:** headset, laptop og polo med «NØRDIC» på brystet. Han er vennlig og smiler.
- **«Du er nummer 47 i køen»:** ti noter ventemusikk i en ring. De sinker spilleren med 40 % i 2 sekunder og gir ingen skade.
- **«Saken er sendt videre»:** en ticket som deler seg i tre i en vifte.
- **«Vi ringer deg tilbake»:** han står stille i 3 sekunder og kan ikke hjelpes, maks én gang per 20 sekunder.

### 3. Multifunksjonsmonsteret (6:00)
- **Utseende:** stor printer på små bein, med sint ansikt på displayet, papirskuffer som klaprer og varsellamper.
- **Fargepatroner (CMYK):** lampene lyser i fire farger før fire patroner skytes ut. Landingsstedet er markert, og patronene blinker før de lander. Da blir de blekkdammer som sinker 30 %, i 4 sekunder, med maks 8 dammer samtidig.
- **«Utskriftsjobb på 400 sider»:** printeren rister og sender ut en strøm av ark i en sveipende bue i 2 sekunder.
- **«Papirstopp!»:** omtrent hvert 15. sekund står den fast i 3 sekunder, og «PAPIRSTOPP!» blinker. Da tar den dobbelt så mye hjelp.

### 4. Johan, siste boss (12:00)
- **Utseende:** laget fra bildet i samme stil som de spillbare karakterene, i dobbel størrelse. Han har kort, lysebrunt hår gredd opp og bakover, mørkegrå dressjakke over royalblå skjorte med åpen krage, og et varmt smil.
- **Animasjoner:** egne bilder for hvert angrep, et skuffet bilde (for sparken) og et portrett på 64 × 64. Han er godkjent i forhåndsvisningen (`?debug=karakterer`).
- **Angrep:**
  - Spurt mot der spilleren stod, med linje som varsel og ×1,6 skade.
  - Fem kalenderinvitasjoner, med et blinkende kalenderikon over hodet som varsel.
  - «Alle på møte!»: en ring av juniorfullmektiger med en tydelig åpning, maks én gang per 30 sekunder, innenfor taket på 400.
  - Fra halv frustrasjon også ticketen og patronene fra de tidligere bossene, sjeldnere enn hos dem.
- **Andre fase:** «Johan tar av seg dressjakka». Han går i skjorte, blir raskere og angriper oftere.
- **Johan igjen:** han kommer tilbake hvert 3. minutt etter 12:00. Ingen nye bosstyper etter ham.
- **Bildet** er bare brukt som forelegg og ligger ingen steder i prosjektet.

### 5. Passord-reset er et kjedevåpen, og Teams-varsel er målsøkende
- **Passord-reset:** nøkkelen hopper fra advokat til advokat innen 80 piksler, med 0,07 sekunder per hopp og en glitrende lysstripe etter seg. Hver kjede treffer hver advokat maks én gang. Antall hopp er 3 på nivå 1 og 10 på nivå 8, med +10 % hjelp på nivå 4 og 8.
- **Tofaktor:** to kjeder i hver sin retning, 16 hopp hver.
- **Teams-varsel:** målsøkende varsler som svinger mot hver sin advokat. Nivåene gir flere varsler (1 til 5), mer hjelp og kortere intervall.
- **Allmøte på Teams:** hvert varsel deler seg i tre nye målsøkende varsler når det treffer.

### 6. Nytt våpen: Skytsengelen
- **Utseende:** en liten, gammel, skallet mann med briller, cardigan, glorie og små hvite vinger som flakser. Han svever rundt spilleren og kan ikke treffes.
- **Mini-printere:** han kaster dem i en bue mot nærmeste advokat. De tusler videre på små bein, skyter ut papirark som hjelper alle rundt, og forsvinner i en papirsky.
- **Fast tak:** maks 2, 4 eller 6 mini-printere samtidig, og 10 som kombinasjon.
- **Himmelsk serviceavtale** (Skytsengelen + Større boks): lysende glorie, større vinger, dobbelt så mange mini-printere, og papirkonfetti til slutt.
- **Ikoner:** egne for våpenet og kombinasjonen. Kombinasjonen vises på oppslagstavla.
- Det finnes nå 11 våpen, og spilleren kan fortsatt ha 4 samtidig.

### 7. Balanse

Kombinasjonene er målt med `tools/measure-weapons.js` (hjelp per sekund):

| Kombinasjon | Hjelp/s | I forhold til snittet |
| --- | --- | --- |
| Tofaktor | 723 | 103 % |
| Allmøte på Teams | 694 | 99 % |
| Himmelsk serviceavtale | 710 | 102 % |

Resten ligger mellom 85 og 111 %, som før.

Bossene gjorde robotene mye svakere til å begynne med: de gode robotene hadde median 7 minutter, mot 12 uten bosser. Grunnen var mest at de må gå inn i folkemengden og blir sinket, mer enn skaden. Det ble jevnet ut slik:
- Færre vanlige advokater mens en boss er ute (55 %).
- En boss som er langt unna, jogger for å ta igjen spilleren, så kampen faktisk skjer.
- Lavere skade og litt lavere frustrasjon på bossene.

`tools/simulate.js --statistikk` (10 dager × 4 karakterer):

| Robot | Median | Lengst | Sparket |
| --- | --- | --- | --- |
| Ekspert | 10,5 min | 15,5 min | 3 av 40 |
| God, bygger bevisst | 9,0 min | 14,7 min | 2 av 40 |

Uten bosser er medianen 12,4 og 9,6 minutter. En veldig god spiller ryker fortsatt rundt 15 minutter.

### 8. Ytelse

Stresstest i minutt 15–17,6, med disse forholdene:
- **Last:** 400 advokater, Johan ute, og våpnene Tofaktor, Himmelsk serviceavtale, Allmøte på Teams og Kontorprinteren fra helvete.
- **Uten grafikkort:** `?debug&utenGPU`.
- **Fast takt:** spillet ble stegt med fast takt, fordi forhåndsvisningspanelet struper `requestAnimationFrame`.

Resultat:
- **Tid per bilde:** 3,5–3,8 ms i snitt (logikk og tegning), og 99 % av bildene under 12 ms.
- **Trege bilder:** maks 2 av 1 800 bilder over 16,7 ms per 30 sekunder.
- **Minne:** flatt, 4,5–5,8 MB.

### 9. Annet
- **Debug-snarveier:** `?debug=boss1` til `?debug=boss4` (og knapper i debug-panelet) hopper rett til en boss med et typisk bygg for tidspunktet.
- **Toppliste:**
  - Serveren lagrer om runden endte med sparken (ny kolonne `fired`, som legges til automatisk i eksisterende database).
  - Kontrollen mot urealistiske poengsummer følger den nye bossrekkefølgen.
- **Rettet fra oversettelsen til engelsk (3.1):**
  - Fem kombinasjonsikoner (Full omstart, Tofaktor, Domene-admin, Musematta, Tvungen oppdatering) viste tomt ikon.
  - Hendelsen for nye kombinasjoner hadde fortsatt norsk navn.

### Antakelser
- **Nørdic:** «Nørdic» er et oppdiktet firma, og logo og farger er laget fra bunnen av. Bytt gjerne navn eller farger i `CONFIG.bosses.nordic` og `NORDIC` i js/figures.js.
- **Replikker:** Johans tittel, replikk og fasetekst, og alle bossenes replikker, er plassholdere i `CONFIG.bosses`. «Fristen er om 2 minutter!» fikk replikken «Kan du se på dette før lunsj?», siden prompten ikke ga noen.
- **Nedtelling:** bossens nedtelling fortsetter under «Vi ringer deg tilbake» og papirstopp.
- **Under bosskamp:** det kommer færre vanlige advokater, og bossen jogger etter spilleren når den er langt unna. Det er lagt til for balansen og står i `CONFIG.bosses.spawnFactor` og `catchUpFrom`/`catchUpSpeed`.
- **Debug-modus:** med udødelighet starter nedtellingen på nytt i stedet for å gi sparken (brukes av stresstesten).

## Versjon 3.1 – 25. november 2026 (koden på engelsk)

All kode og alle kommentarer er oversatt til engelsk. **Teksten i selve spillet er uendret** (norsk), og spillet
oppfører seg nøyaktig likt: simulatoren gir identiske resultater før og etter, og fonten blir byte-for-byte lik.

- Variabler, funksjoner, klasser, id-er (våpen, passiver, fiender, lyder, hendelser), HTML-id-er, CSS-klasser og
  CSS-variabler har engelske navn. Kommentarer i JS, HTML og CSS er oversatt.
- Filene har nye navn, f.eks. `js/spill.js` → `js/game.js`, `js/vaapen.js` → `js/weapons.js`,
  `js/tegning.js` → `js/renderer.js`, `css/stil.css` → `css/style.css` (full liste i README.md, «Project structure»).
- npm-skript: `npm run simulate`, `npm run measure-weapons`, `npm run build-font`.
- Topplisten: API-et heter nå `/api/leaderboard` med engelske feltnavn. Databasen heter `server/data/leaderboard.db`
  med tabellen `entries`. **Eksisterende innslag flyttes automatisk over** første gang serveren starter.
- Lagrede innstillinger og oppdagede kombinasjoner i nettleseren (localStorage) oversettes automatisk, så ingen
  mister noe. Advokatenes utseende er det samme som før.
- Ikke oversatt med vilje: lagringsnøklene i nettleseren (`hds_…`), debug-adressene `?debug=karakterer` og
  `?debug&utenGPU`, meldinger serveren skriver i konsollen og feilmeldinger fra API-et (de vises i spillet), og
  dokumentasjonen på norsk (`DOKUMENTASJON.md`, denne fila).

## Versjon 3.0 – 25. november 2026 (endringsprompt 2)

### 1. Vanskelighet: tregere levling, svakere kombinasjoner, overtid fra 13:00

**Endelige tall** (alle i `js/config.js`):

| Hva | Versjon 2 | Versjon 3 |
| --- | --- | --- |
| Erfaring per nivå | 15 + 10 × n + 0,6 × n² | **20 + 13 × n + 1,5 × n²** |
| Faser | … Fredag ettermiddag 10:00, Overtid 15:00 | **Fredag ettermiddag 10:00–13:00, Overtid fra 13:00** |
| Frustrasjon før overtid | +25 % per minutt fra 3:00 | **+8 % per minutt fra 3:00** (se under) |
| Overtid (fra 13:00) | ×1,6 per minutt fra 15:00 | **×1,6 per minutt på frustrasjon og skade, og +15 % fart per minutt uten tak** |
| Spawnrate | uendret | uendret: 0,5/s → 1,7 (1:30) → 5 (5:00) → 13 (10:00) → 22 (15:00) |

*Hvorfor bare +8 % og ikke +18 % per minutt:* kombinasjonene er svekket med 31–82 %. I tillegg er levlingen
tregere, og «Haster!»-avsenderne er nye. Med +18 % døde selv ekspertrobotene etter 3–5 minutter. Vanskeligheten
før overtid kommer nå mest fra disse endringene. Taket ved 15 minutter kommer fra overtid: fra 13:00 øker
frustrasjon og skade med ×1,6 per minutt, og advokatene blir raskere enn spilleren etter ca. 16–17 minutter.

**Kombinasjonene, målt med `tools/maalvaapen.js`** (hjelp per sekund, 150 advokater jevnt spredt rundt en
spiller i bevegelse, kombinasjonen med sin passive på nivå 1):

| Kombinasjon | Versjon 2 | Versjon 3 | Endring | Andel av snittet |
| --- | ---: | ---: | ---: | ---: |
| Full omstart | 2427 | 727 | −70 % | 107 % |
| Kontorprinteren fra helvete | 4274 | 773 | −82 % | 113 % |
| Tofaktor | 1112 | 675 | −39 % | 99 % |
| Kabelkaos | 2368 | 745 | −69 % | 109 % |
| Domene-admin | 1100 | 663 | −40 % | 97 % |
| Musematta | 975 | 670 | −31 % | 98 % |
| Ctrl+Alt+Del (ny) | – | 693 | – | 102 % |
| Tvungen oppdatering (ny) | – | 593 | – | 87 % |
| Allmøte på Teams (ny) | – | 599 | – | 88 % |
| Hjemmekontor (ny) | – | forsvar | – | – |

De sterkeste ble svekket mest. Alle ligger nå mellom 87 % og 113 % av snittet, så ingen er et opplagt valg.
Endringene er mindre hjelp, mindre område og lengre tid mellom aktiveringene (se `kombinasjon.tall` per våpen).

**Robotene i simulatoren** (tre datoer, 2026-11-25 til -27):

| Robot | Overlever |
| --- | --- |
| Nybegynner | ca. 2–3 min |
| Gjennomsnittlig | ca. 3–5 min |
| God, tilfeldig bygg | ca. 4–8 min |
| God/ekspert, bygger bevisst | ca. 9–14 min, **ingen over 15:00** |

Første kombinasjon kommer for robotene etter **6–13 minutter**, oftest rundt 6–7. Robotene velger alltid det
perfekte kortet for bygget sitt, så en menneskelig god spiller vil normalt få den senere. Målet «tidligst
9–11 minutter» er derfor trolig nådd for mennesker, men ikke bekreftet. Vil dere ha den senere også for
perfekt spill, økes `nivaa.kvadrat` (f.eks. til 1,8) – da blir rundene samtidig litt kortere.

### 2. Fire spillbare karakterer
- Fire karakterer i pixel art (32 × 32, full gangsyklus, glad bilde, blink) og portretter på 64 × 64,
  tegnet etter de fire bildene: frisyre, hårfarge, hudfarge og klær.
  1. Brunt, bustete hår med lugg, marineblå skjorte, svart slips og klokke – Skru av og på, +20 maks energi.
  2. Lyst, bakoverstrøket hår, grågrønn linjakke over hvit skjorte – Toner-kast, +10 % hjelp.
  3. Svart hår med midtskill, brun flettegenser, ringer – HDMI-kabelen, +10 % fart.
  4. Rødbrunt, bølgete hår, rosa kinn, hvit skjorte over t-skjorte, gullkjede og armbånd – Trådløse mus, +25 % plukkeradius.
- **Forhåndsvisning til godkjenning:** `?debug=karakterer`.
- **Karaktervalg** etter «Start vakt»: mus, touch, piltaster eller 1–4. Valget huskes.
- Portrett ved energibaren i HUD-en og på slutt-skjermen. Topplisten lagrer karakteren og viser portrett ved navnet.
  Eldre toppliste-databaser får den nye kolonnen automatisk.
- **Bildene er bare brukt som forelegg** og ligger ikke i prosjektet eller i den publiserte versjonen.

### 3. «Haster!»-avsenderen
- Ny advokattype fra 2:30 med lilla genser og åpen laptop, med samme mangfold, glad-animasjon og egne snakkebobler
  («Sendte deg en mail!», «Svarte du på mailen min?»).
- Holder seg 150–200 piksler unna: går nærmere, trekker seg unna eller går sidelengs.
- E-post ca. hvert 3. sekund (minst 1,8 s senere i runden). Før hvert skudd lyser laptopen og et rødt «!»
  vises i 0,5 s. E-posten flyr rett mot der spilleren stod (57 px/s, 60 % av spillerens fart), forsvinner etter 4 s
  eller ved veggen, og et treff virker som en berøring (også på multiplikatoren).
- Tak: maks 15 % av de aktive advokatene og maks 30 samtidig, og maks 60 e-poster på kartet (avsenderne venter).
- Bossen sender fra og med boss nummer tre en vifte med tre e-poster med samme varsel.

### 4–5. Fire nye våpen, fire nye passive og fire nye kombinasjoner
- **Ctrl+Z** (bumerang mot nærmeste advokat, treffer både ut og tilbake) → **Ctrl+Alt+Del** med Hurtigtaster
  (taster i spiral ut og inn).
- **Oppdateringsstrålen** («Oppdaterer… 47 %» i gangretningen, så pause) → **Tvungen oppdatering** med
  Sertifisering (to stråler som sveiper rundt).
- **Teams-varsel** (spretter til nærmeste advokat som ikke er truffet) → **Allmøte på Teams** med Dobbel skjerm
  (deler seg i to ved hvert sprett, tak på 24 treff).
- **Støydempende headset** (ring rundt figuren når skjoldet er klart, ring som fylles mens det lades,
  20 s på nivå 1 og 8 s på nivå 8) → **Hjemmekontor** med Ergonomisk stol (to ladninger, mye større puls).
  Et blokkert treff koster ikke energi og påvirker ikke multiplikatoren.
- Passive: **Dobbel skjerm** (+5 % sjanse for dobbel aktivering, maks 25 %, egen tilfeldighetsstrøm),
  **Hurtigtaster** (+12 % fart på prosjektiler, bumeranger og kjeder), **Ergonomisk stol** (−6 % skade, maks −30 %)
  og **Sertifisering** (+8 % erfaring).
- Egne pixel art-ikoner og effekter for alt. Kortene trekkes som før: lik sjanse for hvert gyldig valg,
  en tilgjengelig kombinasjon vises alltid, og ingen nye våpen eller passive når plassene er fulle.

### Ytelse
Stresstest uten grafikkort (`?debug&utenGPU`), minutt 15–20, 400 advokater (30 av dem avsendere), opptil 60 e-poster,
fire nye/tunge kombinasjoner (Allmøte på Teams, Ctrl+Alt+Del, Tvungen oppdatering, Kontorprinteren fra helvete):
- **Tid per bilde:** 4,0 ms i snitt (logikk ca. 0,2 ms, tegning ca. 3,8 ms).
- **Verste bilde:** 17,4 ms. **Bilder over 16,7 ms:** 1 av 17 988.
- **Minne:** flatt, 4,2 → 5,2 → 4,9 → 4,6 → 5,1 MB (målt hvert minutt).

E-poster, Ctrl+Z-taster og Teams-varsler bruker objektpooler og det romlige rutenettet. Alt er ferdigtegnede sprites.

### Antakelser i versjon 3
1. **Navn og titler:** bildene kom fram som `1.png`–`4.png`, så navnene står som «Karakter 1–4» og
   «Tittel fylles inn» i `CONFIG.karakterer` til oppdragsgiver fyller dem inn.
2. **Spillerfiguren:** de nye karakterene har ikke headset (det var ikke på bildene), men holder fortsatt en boks
   energidrikk. Det spesielle hvite omrisset er beholdt, så spilleren skiller seg ut.
3. **Startvåpen på lave nivåer:** Toner-kast (nå en vifte med 3–5 kassetter), HDMI-kabelen og Trådløse mus er styrket
   på nivå 1–2, ellers ble tre av fire karakterer klart svakere enn karakter 1 i starten.
4. **Avsendere skyter bare når de er på skjermen**, så varselet alltid kan sees.
5. **Et blokkert treff** gir den vanlige korte usårbarheten (0,5 s), så samme berøring ikke tømmer skjoldet med en gang.
6. **«Dobbel skjerm»** gjelder våpen som aktiveres i støt (også strålen), ikke de som virker hele tiden (mus, spiral, skjold).
7. **Simulatorrobotene** oppsøker nå advokatene til våpenets rekkevidde når bygget trenger det (kabel, mus, stråle),
   og går unna e-poster. De er fortsatt bare en pekepinn.

## Versjon 2.0 – 25. november 2026 (endringsprompt 1)

### 1. Ny grafisk stil: pixel art
- Spillverdenen tegnes på et internt lerret på **640 × 360 logiske piksler** og skaleres opp med nærmeste
  nabo (`image-rendering: pixelated`). Det brukes hele skaleringstall der det går (f.eks. 3× på 1080p).
- Alle ser nøyaktig samme område av kartet. Er skjermen ikke 16:9, fylles kantene med en rolig, rutete ramme.
- All grafikk er fargeindekserte pikselrutenett i koden (ingen bildefiler): spilleren 32 × 32,
  juniorfullmektig 24 × 32, printerentusiast 28 × 32, seniorpartner og hastesak 32 × 40, boss 64 × 64,
  lapper/energidrikk/Ny PC 12–18 piksler. Skyggelegging, mørkt omriss og automatisk lys/skygge.
- Gangsyklus på 4 bilder for alle figurer, speilvendt for venstre/høyre, blink ved treff på spilleren.
- Egne pixel art-effekter for alle våpen og kombinasjoner: strømpuls (dobbel ring for Full omstart),
  tonerkassetter og CMYK-sprut (ild for Kontorprinteren fra helvete), nøkler (blå for Tofaktor),
  pikselkabel (full sirkel for Kabelkaos), stråle ovenfra (gull for Domene-admin), mus (lysende for Musematta).
- Kontorpynt i pixel art: teppefliser, pulter, kontorstoler, planter, printere, kopimaskiner,
  vannkjølere, kaffemaskiner, kjøleskap, automater, møtebord, sofaer, resepsjonsdisk, heisdører og vinduer.
- Egenprodusert pikselfont «KontorPiksel» med æ, ø og å (CC0). Brukes både i menyene (TTF-fil i `fonts/`)
  og på lerretet (samme glyfer tegnet direkte).

### 2. Advokatene blir synlig glade
- I samme øyeblikk som frustrasjonen når null: advokaten stopper, kan ikke skade eller treffes, teller ikke
  som fiende, og ticket-lappen legges igjen.
- 0–0,3 s: glad versjon av akkurat den advokaten (stort smil, lukkede smilende øyne, røde kinn,
  tommelen i været), et lite hopp og glitter rundt. 0,3–0,5 s: en liten piksel-sky. Etter 0,5 s er den borte.
- Glade advokater tegnes under aktive, så de aldri skjuler noen som fortsatt trenger hjelp.
- Blir over 60 glade samtidig (f.eks. Ny PC), forkortes animasjonen til 0,25 s (smilet vises fortsatt).
- Frustrerte advokater har rynkede bryn, munnviker ned og av og til en svettedråpe.

### 3. Mangfold blant advokatene
- Hver advokat settes sammen av lag: 7 hudfarger (veldig lys til veldig mørk), 3 aldre (eldre har grått/hvitt
  hår og roligere gange), høyde og kroppsbredde, 10 frisyrer (kort, langt, hestehale, krøllete, afro, fletter,
  knute, skallet, hijab, bob), 6 hårfarger, briller, skjegg/bart, øreringer, slips/skjerf og skjørt/bukser.
- 42 varianter for vanlige typer, 21 for hastesak og 12 for boss. Alle egenskaper fordeles jevnt.
- Typene kjennes på klær, størrelse og silhuett: junior (liten, lys skjorte, laptop), senior (stor, mørk dress,
  dokumentmappe), printerentusiast (strikkejakke, papirbunke), hastesak (gyllen dress og glød), boss (64 × 64, klokke).
- Utseendet trekkes fra en egen tilfeldighetsstrøm og påvirker aldri Dagens vakt
  (simulatoren bekrefter: helt annet utseende gir nøyaktig samme runde).

### 4. Maks 4 våpen
- Startvåpenet teller som ett av fire. Med fire våpen tilbys bare oppgraderinger, passive og kombinasjoner.
- Kortet sier «Nytt våpen (2 av 4 plasser brukt)». HUD-en viser 4 plasser, tomme som stiplede rammer.

### 5. Større og tydeligere HUD
- Energibaren er en energidrikkboks på minst 25 % av skjermbredden, med «72 / 100» skrevet på.
  Den blinker rødt under 25 % (fast rød med reduserte blinkeffekter).
- Våpen- og passiv-ikoner er 48 × 48 skjermpiksler ved 1080p (skaleres med UI-størrelsen), i hver sin rad,
  med nivå på hvert ikon. Kombinasjoner har gullramme og stjerne.
- Tid, score og multiplikator i stor pikselskrift. Alle ikoner har mørkt omriss og egen form.
- HUD-en tegnes på et eget lerret i full oppløsning, og bare når noe har endret seg (maks ca. 20 ganger i sekundet).

### 6. Innstillinger
- Ny meny fra startskjermen og pausemenyen: demp alt, hovedvolum, lydeffekter (testlyd når man slipper),
  fullskjerm, spillstørrelse (tilpass, 2×, 3×, 4×), UI-størrelse (auto, liten, middels, stor, ekstra stor),
  minikart (av, liten, stor), skjermristing og reduserte blinkeffekter, pluss «Tilbakestill til standard».
- Lagres lokalt (med try/catch) og trer i kraft med en gang. Lyden er fortsatt av som standard (50 % når den slås på).

### 7. Raskere vanskelighetskurve (tak rundt 15 minutter)
- Nye faser: Morgenkaffe (0:00), Formiddagen (1:30), Etter lunsj (5:00), Fredag ettermiddag (10:00), Overtid (15:00).
- Seniorpartnere fra 1:30, printerentusiaster fra 3:00. Boss hvert 3. minutt med 90 sekunders nedtelling.
- Første hastesak ved 1:00, deretter hvert 45.–60. sekund.
- Frustrasjonen øker 25 % per minutt (oppå hverandre) fra minutt 3, og fra 15:00 ganges den i tillegg med
  1,6 per minutt. Spawnraten øker ca. dobbelt så raskt som før.
- Erfaring per nivå: 15 + 10 × nivå + 0,6 × nivå² (slakere enn før).
- Resultat i simulatoren: se DOKUMENTASJON.md. Planlagte bygg når 16–17 minutter, og første kombinasjon kommer etter 3–6 minutter.

### 8. Avgrenset kart og minikart
- Én kontoretasje på 2560 × 1440 piksler med yttervegger og fast oppsett: kontorlandskap, kantine, heiser,
  møterom med glassvegger, printerrom, resepsjon og sofakrok, hver med eget gulv og egen pynt.
- Ytterveggene stopper spilleren og advokatene. Pynten blokkerer ikke. Kameraet stopper ved kartkanten.
- Den gamle «flytt nærmere»-mekanismen er fjernet. Advokatene kommer inn på tilfeldige steder utenfor
  synsfeltet (380–560 px unna), eller fra heiser og dører når det er trangt, og aldri nærmere enn 260 px.
- Flokker og ringer tilpasses veggene. Ringpunkter som havner tett inntil spilleren hoppes over.
- Minikart øverst til høyre (14 % av bredden, 22 % som «stor»), oppdateres 10 ganger i sekundet.
  Symboler: spiller (rund prikk), energidrikk (grønn boks), hastesak (gull stjerne), boss (stort rødt symbol),
  advokater (svake prikker) og en ramme for det som er på skjermen.

### 9. Energidrikk må hentes
- Dropper ikke lenger fra advokater eller bosser, og er fjernet som valg ved nivåopp.
- Første boks ved 0:30, så hvert 35. sekund, maks 3 samtidig, alltid minst 960 px (1,5 skjermbredder) unna.
  Plassene trekkes fra en egen strøm (12 faste kandidater per boks), så alle får samme steder og tider.
- Boksen gløder, hopper og glitrer, vises på minikartet og har en grønn pil i skjermkanten.
- Bossen gir fortsatt poengbonus og garantert Ny PC.

### 10. Ytelse

**Årsaken til hakkingen i versjon 1** (målt med Chrome, 1920 × 1080):
1. **Nedskalerte sprites.** Alle figurer var lagret i tre ganger oppløsning og ble skalert ned med en
   transformasjon i hver frame. Når Chrome tegner uten grafikkort (vanlig på kontor-PC-er og i Citrix), kostet
   det ca. 0,47 ms per figur. 300 advokater og 240 lapper tok over 200 ms per bilde, mot 0,6 ms for det samme
   tegnet 1:1. Antall advokater og lapper øker utover i runden, og derfor ble det gradvis verre.
2. **Fullskjermslerret.** Hele gulvet og store gjennomsiktige sirkler ble fylt i full oppløsning hver frame.
3. **Søppel for minnerydderen.** Nye fargestrenger for hver effekt i hver frame ga hyppige minneryddinger
   (minnet gikk i sagtann, 2 → 8 MB på 10 sekunder).
4. Inntil 5 logikk-oppdateringer per bilde, og ingen tak på naboer ved dytting i tette klumper.

**Det som er gjort:**
- Verden tegnes på 640 × 360 og skaleres av nettleseren. Alle sprites kopieres 1:1 på hele piksler.
- Kartet med gulv, vegger og pynt tegnes én gang til et eget lerret. Hver frame kopieres bare utsnittet.
- Alle figurvarianter (inkl. glade og blinkende bilder) samles i **ett atlas per type**. Målinger viste at
  tegning fra mange små lerreter var ca. 20 ganger tregere (0,09 mot 0,004 ms per figur).
- Atlasene lages ferdig mens startskjermen vises og endres aldri under spill. Endring av et atlas midt i spillet
  ga topper på 150–600 ms fordi nettleseren må kopiere hele atlaset på nytt.
- Glød, ringer, tonersprut, piler, klokker, snakkebobler og poengtekster er ferdigtegnede sprites (cache),
  aldri `shadowBlur`, gradienter eller filtre under spill.
- HUD tegnes på eget lerret bare ved endringer (maks ca. 20 ganger i sekundet), uten DOM-oppdateringer per
  frame. Minikartet oppdateres 10 ganger i sekundet.
- Fast tidssteg med **maks 4 oppdateringer per bilde**.
- Objektpooler og «swap and pop» for alt. Prosjektiler fjernes når de forlater skjermen. Maks 60 prosjektiler
  per våpen og maks 900 effekter. Gjenbrukte lister og oppslag (ingen `filter`/`map`/nye objekter per frame i spill-løkka).
- Romlig rutenett (32 px ruter) for alle kollisjoner. Dytting mellom advokater sjekker maks 6 naboer.
- **Maks 400 aktive advokater.** Over taket «spares» advokatene, og de neste blir sterkere
  (+50 % frustrasjon og +20 % skade per spart, maks 4).
- Lyd: hver lyd regnes ut én gang til en buffer som gjenbrukes, med maks 4 like lyder samtidig.
- Ingen lagring under spill: kombinasjoner til oppslagstavla lagres når runden er over.
- **Automatisk kvalitet:** ligger tiden per bilde over 16,5 ms i 1,5 s, skrus glitter, snakkebobler,
  glad-animasjon og fyll i effekter ned (to trinn), og opp igjen etter 8 s med god tid.
  Det ligger bare i tegnekoden og kan ikke påvirke spillogikken.

**Stresstest** (minutt 15–20, fire våpen med kombinasjoner, antall holdt på 400, all tegning på prosessoren
via `?debug&utenGPU`, 18 000 bilder):
- **Tid per bilde:** snitt 2,86 ms (logikk ca. 0,15 ms, tegning ca. 2,7 ms, HUD ca. 0,02 ms).
- **Verste bilde:** 15,9 ms. **Bilder over 16,7 ms:** 0 av 17 999.
- **Minne:** flatt gjennom hele testen (5,0 → 4,6 → 5,0 → 4,6 → 4,4 → 5,4 MB, målt hvert minutt).

### Antakelser i denne versjonen
1. **Egen pikselfont:** Jeg laget en egen font (CC0) i stedet for å hente en OFL-font utenfra, siden ingenting
   skal hentes fra nettet. Den har æ, ø, å og vanlige tegn. Navn med andre tegn vises med reservefont i menyene.
2. **Ingen musikk:** Spillet har bare lydeffekter, så det er ingen musikk-glidebryter. Menyen sier dette.
3. **Energidrikkens plassering** bruker en egen tilfeldighetsstrøm («drikk») i stedet for drop-strømmen.
   Drop-strømmen brukes per hjulpet advokat og ville gitt ulike plasser for ulike spillere.
4. **Spawn-plasser** avhenger av hvor spilleren står, så de trekkes fra en egen strøm («plass»).
   Tidspunkt og typer kommer fortsatt fra spawn-strømmen og er like for alle.
5. **Ny PC** virker på det som er innenfor skjermen (640 × 360 rundt kameraet), likt for alle.
6. **Bossen** som går ut når fristen er ute, forsvinner når den er ute av synsfeltet (eller etter 8 s).
7. **Blink når en advokat får hjelp** vises som en lysere versjon av figuren, ikke helt hvit, så den aldri
   forveksles med en glad advokat.
8. **UI-størrelse «Auto»** velger «Stor» når spillområdet er lavere enn 600 piksler (mobil), ellers «Middels».
9. **Spillstørrelse 2×/3×/4×** er i CSS-piksler og krympes automatisk hvis vinduet er for lite.
10. **Mobil:** Spillet er 16:9, så det blir lite på en stående telefon. Startskjermen foreslår å snu telefonen.
11. **Balanse:** Robotene i simulatoren er dårligere enn mennesker til å unnvike. Tallene er satt slik at et
    planlagt bygg når 16–17 minutter, og at alle ryker innen 1–2 minutter etter 15:00. Prøvespill gjerne før konkurransen.
12. **«Maks bygg» i debug-modus** gir fire våpen (Skru av og på, Trådløse mus, Toner-kast og Fjernstyring) med passive.
    «Kombiner» gjør dem om til kombinasjoner.
13. **Toppliste-grensene** er justert for kortere runder med høyere poeng per sekund (maks 5000 poeng og
    50 hjulpne per sekund før en runde regnes som urealistisk).

## Versjon 1.0 – 25. november 2026
Første versjon etter den opprinnelige spesifikasjonen.
