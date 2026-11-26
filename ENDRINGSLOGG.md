# Endringslogg

## Versjon 4.1 – 26. november 2026 (endringsprompt 4)

### 1. Skytsengelens mini-printere står stille
- **Ny oppførsel (som molotov):** mini-printeren kastes i en bue og lander der advokaten stod da kastet startet. Der står den helt stille og skyter et papirark mot nærmeste advokat innenfor 60 piksler hvert 0,3. sekund. Etter 4 sekunder forsvinner den i en liten papirsky.
- **Visuelt:** et lite hopp og en støvsky når den lander. Når den skyter, mates et ark ut og lampa lyser grønt. En svak, stiplet sirkel på gulvet viser rekkevidden.
- **Nivå 5:** printeren står og skyter 1 sekund lenger (5 sekunder), og rekkevidden øker med 15 % til 69 piksler.
- **Himmelsk serviceavtale:** printerne står også stille her og avslutter med papirkonfetti. Taket på antall samtidig er uendret.
- **Balanse:** hjelpen per ark er justert slik at våpenet er like sterkt som før (`tools/measure-weapons.js`):

  | | Før | Nå |
  | --- | --- | --- |
  | Nivå 8 | 582 hjelp/s | 582 hjelp/s |
  | Himmelsk serviceavtale | 710 hjelp/s | 708 hjelp/s |

### 2. Oppdragsgivers egne bilder av de fire karakterene
- **Bildene:** de 8 PNG-filene ligger i `assets/karakterer/` og brukes piksel for piksel, uten å tegnes om eller fargejusteres. Dette er kontrollert i koden: stående figur og portrett er identiske med filene.
- **Kobling etter utseende**, avtalt med oppdragsgiver fordi numrene ikke stemte med karakterene:

  | Fil | Karakter |
  | --- | --- |
  | person4 | Odyssefs |
  | person3 | Johannes |
  | person1 | Jin |
  | person2 | Julian |

  Koblingen står i `CONFIG.characters` (`sprite` og `portrait`).
- **Gangsyklus på 4 bilder:** bare beina og føttene endres. I bilde 2 og 4 dupper figuren én piksel og løfter én fot. Hode og overkropp er identiske med originalen.
- **Venstre og høyre:** vises med speiling.
- **Effekter oppå bildet:** blink ved treff legges oppå som en hvit silhuett, så selve bildet endres aldri. Spilleren har fått samme lille skygge under føttene som de andre figurene.
- **Portrettene** vises i karaktervalget, på slutt-skjermen og ved energibaren. Topplisten bruker den lille 32 × 32-figuren.
- **Skarpe bilder:**
  - Alle bilder tegnes med nærmeste nabo og heltallsskalering, også i HTML-menyene.
  - Størrelsen regnes ut i ekte skjermpiksler, så den alltid er et helt multiplum.
  - Spillflaten skaleres nå alltid med et helt tall. Før kunne den bruke et ikke-heltall hvis det fylte skjermen bedre.
- **Fjernet:** de gamle tegnede spritene og portrettene for de fire karakterene.

### 3. Johan i den nye stilen
- **Stil:** Johan er tegnet på nytt fra fotoet i samme stil som de nye bildene:
  - 1 piksel detalj (samme pikseltetthet).
  - Fargede omriss, altså en mørk utgave av hvert materiale.
  - Tre-tonet skyggelegging med lys fra venstre.
  - Øyne med hvitt, iris og en mørk øyelokklinje.
  - Samme hudfarger og samme proporsjoner (hodet er omtrent halve høyden).
- **Størrelse:** som boss er figuren dobbelt så stor (64 × 64). Portrettet er 64 × 64 med samme oppbygning som de fire.
- **Fil:** ny `js/johan.js`. Fotoet ligger fortsatt ikke i prosjektet.
- **Forhåndsvisning:** `?debug=karakterer` viser de fire og Johan stående, i gangsyklus og som portrett.

### Antakelser
- **Kobling:** filene er koblet til karakterene etter utseende, ikke etter nummer, slik oppdragsgiver bekreftet.
- **Små skjermer:** er skjermen mindre enn 640 × 360 ekte piksler, må spillflaten fortsatt skaleres ned med et ikke-heltall. Det gjelder bare svært små vinduer.

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
