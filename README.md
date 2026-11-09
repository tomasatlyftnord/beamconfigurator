# Beamconfigurator

Fristående svensk webbsida för lyftberäkningar. Alla **tio beräkningsfall** i **Standardiserade beräkningar 0.1 – granskning** finns som valbara fall med arbetsbokens profiltabell, knäcktabell, samtliga delberäkningar och PDF-rapporter. De tidigare sju fallen med PDF-/Tibnor-underlag finns också kvar. Tillåten normalspänning σ_till är 355 MPa (S355).

Arbetsboken innehåller granskningspunkter och vissa ofullständiga profildata. Dessa redovisas vid berört resultat och i rapporten. Numerisk överensstämmelse med underlaget innebär inte att konstruktionen är verifierad. Se [täckning och källgranskning](data/WORKBOOK.md).

## Kör lokalt

### Enklast: öppna sidan direkt

1. Hämta projektet från GitHub med **Code → Download ZIP** och packa upp ZIP-filen. Du kan också klona repot:

   ```sh
   git clone https://github.com/tomasatlyftnord/beamconfigurator.git
   ```

2. Öppna den uppackade eller klonade projektmappen.
3. Dubbelklicka på `index.html`, eller välj **Öppna med → Google Chrome / Microsoft Edge / Firefox**.

Ingen installation av paket, byggning eller server behövs. När projektet har hämtats fungerar beräkning och rapportvisning utan internetanslutning. Behåll hela projektmappens struktur, inklusive alla `.js`- och `.css`-filer bredvid `index.html`. Behåll också `workbook-data.js`, `workbook-engine.js`, `workbook-report.js` och `workbook-cases.js` samt mappen `data` för källdokumentationen och de nedladdningsbara tabellerna. Python och Node.js behövs inte för att använda programmet på detta sätt.

### Alternativ: kör med en lokal webbserver

Om du föredrar en lokal webbadress och har Python 3 installerat, öppna en terminal i projektmappen (där `index.html` ligger) och kör:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

På Windows kan motsvarande kommando vara:

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1
```

Öppna sedan `http://127.0.0.1:8000` i din webbläsare. Låt terminalen vara öppen medan du använder sidan och stoppa servern med **Ctrl+C** när du är klar. Servern är endast åtkomlig från din egen dator.

### Skrivbordsgenväg med appikon (Windows, utan server)

1. Behåll projektmappen på en fast plats på datorn.
2. Högerklicka på `index.html` i Utforskaren. Välj vid behov **Visa fler alternativ → Skicka till → Skrivbord (skapa genväg)**.
3. Högerklicka på den nya skrivbordsgenvägen och välj **Egenskaper → Genväg → Byt ikon**.
4. Bläddra till projektets **`favicon.ico`**, välj ikonen och klicka **OK / Verkställ**.
5. Byt gärna genvägens namn till **Lyftberäkning**.

Genvägen öppnar verktyget i din vanliga webbläsare, utan Python, server eller internetanslutning. Flytta inte projektmappen efter att genvägen har skapats; om du gör det behöver både mål- och ikonvägen uppdateras. En befintlig genväg kan behöva tilldelas den nya ikonen manuellt.

### Öppna som installerad webbapp i eget fönster

Projektet innehåller nu ett webbmanifest och appikoner. För denna variant behöver sidan öppnas via den lokala webbservern ovan, exempelvis `http://127.0.0.1:8000`, eller från en HTTPS-adress. Vanlig `file://`-öppning av HTML-filen stöder inte normal webbappsinstallation.

- **Edge:** använd **Appar → Installera den här webbplatsen som en app**, om alternativet visas.
- **Chrome:** använd installationsikonen i adressfältet eller alternativet för att installera sidan som app i webbläsarens meny, om det finns. Menytexten kan variera mellan versioner.

Webbappen kan då få en egen skrivbordsgenväg med projektets ikon och öppnas i ett separat fönster utan vanligt adressfält. När du använder en lokalt installerad webbapp måste lokalservern fortfarande vara igång när verktyget startas. Manifestet startar inte servern och ger inte i sig fristående offlinekörning. För användning utan server, välj filgenvägen ovan.

Ikonfilerna finns i [icons](icons/README.md), med Windows-/webbläsarikonen [favicon.ico](favicon.ico) i projektroten. Samma motiv används i sidans huvud, webbläsarflik och appgenvägar.

### Om du ser en gammal version

Hämta de senaste projektfilerna (eller kör `git pull` i ett klonat repo), öppna rätt projektmapp och ladda om sidan med **Ctrl+Shift+R** i Chrome/Edge på Windows/Linux eller **Cmd+Shift+R** på Mac. Den aktuella versionen är märkt **V0.19 · BERÄKNINGSFALL** högst upp.

## Färger

Webbsidan och PDF-rapporten använder Lyftnords marinblå `#003152` och gula `#FFD200`. Gul används som accent och på primära knappar, med marinblå text.

## Layout

Applikationen använder den klassiska layouten från `7ce79bc`, med större diagram och resultat i rutor. Alla 17 beräkningsfall och PDF-rapporter finns i samma vy. Beräkningsfallsväljaren har två kategorier: **Komponenter** för L-/C-delar och enkla balkar (KB2, KB5 och KB6), och **Produkter** för lyftok med mittlyft/asymmetriskt lyft, H-ok, ramok, spridarok och semispridarok. Inmatade värden och profilval bevaras när du byter beräkningsfall medan sidan är öppen.

## Arbetsbokens beräkningsfall

Startfallet är åter **Lyftok med mittlyft**, med samma sidlayout som i commit `7ce79bc`. De tio tillagda fallen finns kvar i beräkningsfallsväljaren. Arbetsboken tillför följande fall, fördelade mellan **Komponenter** och **Produkter**:

| Fall | Beräkningar |
| --- | --- |
| L1, C1 | Medelskjuvspänning och nyttjandegrad för en respektive två skjuvareor |
| KB5, KB6, KB2 | Central punktlast, asymmetrisk punktlast respektive konsolbalk: böjning, nyttjandegrad och nedböjning mot L/200 |
| H-ok | Separata böj- och nedböjningskontroller av huvudbalk och tvärbalkar |
| Ramok | Kraftkomponenter, tryck och knäckning i två riktningar i ramplanet |
| C-krok av profiler | Arm- och ryggspänningar, deformationer, totalutböjning och arbetsbokens elastiska Mcr-jämförelse |
| Spridarok | Tryckkraft, slankhet, knäcktabell och nyttjandegrad |
| Semispridarok | Tryck, knäckning, böjning och arbetsbokens kombinationsregel |

Ange måtten och välj profil i formuläret. De 204 profilerna hämtas från arbetsboken, inklusive rektangulära rör och HEA. `⚠` markerar en granskningsanmärkning; saknade nödvändiga värden och HEA:s felaktiga areaenhet blockerar berörda beräkningar. Startvärdena motsvarar de sparade Excel-exemplen. KB6:s läge avser punktlasten mellan två stöd enligt arbetsboken; det tidigare fallet **Lyftok med asymmetriskt lyft** har sin egen lastmodell.

Resultatet använder samma resultatrutor och diagramlayout som de ursprungliga fallen. Kontrolltabell, granskningsanmärkningar, profilvärden och listan med alla Excelceller och formler kan fällas ut. Den första anmärkningen och antalet ytterligare anmärkningar visas direkt vid resultatet. Knäcktabellen väljer nästa **strikt större** slankhet enligt underlaget. Granskningsanmärkningarna följer med i PDF-rapporten; C-krokens och semispridarokets tveksamma uttryck används spårbart utan tysta rättningar. Rapporterna har en sammanställning och följande sidor med formler, resultat och cellreferenser.

[Detaljerad täckning, avvikelser och importinstruktioner](data/WORKBOOK.md) · [Profiltabell (CSV)](data/workbook-profiles-0.1.csv) · [Knäcktabell (CSV)](data/workbook-buckling-0.1.csv)

## Användning

De tidigare modellerna används så här:

- **Lyftok med mittlyft:** ange c-c mellan lastpunkterna, total lastvikt och säkerhetsfaktor n. Minsta W_x väljs bland Tibnors profiler som klarar modellens böjvillkor. Nedböjning vid brukslast redovisas men styr inte valet.
- **C-krok av utskuren plåt:** ange plåttjocklek t, tvärsnittshöjd h, armlängd L₁ = L₂, höjd L mellan armarnas centrumlinjer, lastvikt och säkerhetsfaktor. Samma tvärsnitt används i hela den raka C-ramen. Diagrammet visar måttdefinitionerna. Armlängderna är lika så att motriktade vertikala krafter ligger i samma lodlinje.

**C2 – lastöra:** ange lastvikt m, säkerhetsfaktor n, tjocklek t, snittmått a och b samt momentarm L enligt PDF-skissen. Skjuvning jämförs med 213 MPa; böjning och summan av böjning/drag jämförs med 355 MPa. C1-skjuvkontrollen finns som ett separat val och utförs inte automatiskt i C2. Startvärdena är endast ett illustrativt exempel.

**C4 – lastkrok:** ange m, n, tvärsnittshöjd K, tjocklek t och invändig diameter Ø_inne. Hävarmen beräknas som L = (K + Ø_inne)/2. Startvärdena motsvarar PDF:ens genomräknade 125 kg-exempel. Skjuvning, konsolböjning och böjnedböjning redovisas. **Även nedböjningen använder säkerhetsfaktorn n i detta fall**, enligt C4-underlaget.

**C1 – ändplåt:** ange lastvikt m, n, skjuvhöjd K och tjocklek t. Två lika skjuvytor K·t antas dela lika på F; τ = F/(2Kt).

**L1 – skjuvkontroll:** ange samma slags indata. Källan använder endast en skjuvyta K·t med hela F; τ = F/(Kt). Båda fallen använder gränsen 213 MPa. Källorna saknar numeriska m/K/t-värden, så förifyllda värden är exempel.

**Lyftok med asymmetriskt lyft:** ange balklängd/c-c L, total lastvikt, n och lyftpunktens avstånd a från vänster ände. Lastpunkterna antas sitta i balkens ändar. Programmet beräknar den lastfördelning som krävs för jämvikt: vänster m·(L−a)/L och höger m·a/L. Verkliga ändlaster måste motsvara denna fördelning. Lyftläget måste vara strikt mellan ändarna. VKR-profil väljs ur samma tabell som för mittlyft.

Indata bevaras separat när du byter fall. Ogiltiga indata blockerar resultat och rapport. Båda fallen försummar egenvikt och använder g = 9,82 m/s².

C-krokens vippning avser endast underarmen som en rak konsol med idealiserat sid- och vridstyv rot och spetskraft genom skjuvcentrum. En kontaktlast på ovansidan omfattas inte. Mcr-jämförelsen visas endast för dessa förutsättningar och programmets modellgränser L₂/h ≥ 10 och t ≤ h. Gränsen är inte ett standardkrav. M_x/Mcr är en momentkvot, inte en dimensionerande vippningsnyttjandegrad eller verifiering av hela C-ramens stabilitet.

## Kontrollrapport som PDF

1. Ange last, c-c-mått och säkerhetsfaktor n.
2. För lyftok med mittlyft eller asymmetriskt lyft: välj en profil med radioknappen i kolumnen **Rapportval** under **Jämför profiler**. Använd **Visa alla profiler** för hela tabellen. Rapportvalet är oberoende av det automatiska minsta profilvalet.
3. Arbetsbokens fall använder profilen som valts i formuläret. För de tidigare plåtfallen C-kroken, C2, C4, C1 och L1 behövs inget profilval. Fyll eventuellt i en rapportreferens och välj **Visa rapport / PDF** under resultatet.
4. Granska rapporten och klicka **Spara som PDF**. Välj **Spara som PDF** i webbläsarens utskriftsdialog, A4 och utan webbläsarens sidhuvud/sidfot.

Lyftok med mittlyft/asymmetriskt lyft, C-krok, C2 och C4 har rapporter på två A4-sidor; de enklare C1- och L1-kontrollerna har varsin A4-sida. Rapporterna innehåller det valda fallets indata, källhänvisning, tillämpliga snittkontroller samt formler med insatta värden. Rapporten saknar produktnamn, datum och länkar i sidhuvud/sidfot. Sidnumrering och eventuell rapportreferens behålls. Utskriftslayouten använder egna inre marginaler för att undvika webbläsarens automatiska sidhuvud/sidfot. Egenvikt försummas. Lyftokets nedböjning räknas utan säkerhetsfaktor n och utan godkänd/underkänd-bedömning eftersom inget gränsvärde anges. Även en för svag profil kan väljas, men dess rapport markerar överskridet böjvillkor. Ogiltiga indata blockerar rapportöppning. Varje ny rapport använder aktuella indata; en redan öppnad rapport är en ögonblicksbild.

Lyftokets rapport innehåller också ett hållfasthetsuttalande för **två gånger angiven last, n = 2**. Det kontrolleras separat för vald profil även om formulärets säkerhetsfaktor är en annan. Uttalandet anger om det elastiska böjvillkoret uppfylls, med böjspänning och nyttjandegrad. Hänvisningen till **SS-EN 13155** beskriver rapporten som dimensioneringsunderlag för fortsatt verifiering, inte ett intyg om att hela lyftoket uppfyller standarden.

Ekvationerna använder webbläsarens inbyggda MathML-stöd för riktiga bråk, exponenter och index. Använd en aktuell version av Chrome, Edge, Firefox eller Safari. Ingen internetanslutning eller extern matematiktjänst behövs.

PDF skapas lokalt genom webbläsarens utskriftsfunktion. Inga data skickas till en extern tjänst och inga PDF-bibliotek behöver installeras.

**Om knappen inte öppnar utskriftsdialogen i en förhandsgranskning:** inbäddade förhandsvisningar kan blockera `window.print()`. Öppna sidan direkt i din egen webbläsare enligt instruktionerna ovan, antingen som lokal HTML-fil eller via lokal webbserver. Projektet behöver inte publiceras på internet. När rapporten visas kan du även använda **Ctrl+P** (Windows/Linux) eller **Cmd+P** (Mac) och välja **Spara som PDF**; i macOS kan alternativet ligga under menyn **PDF**.

## Modell och begränsningar

### Lyftok

Modellen använder följande beteckningar och formler (N och mm):

- Kraft: `F = m × g`, med `g = 9,82 m/s²`.
- Böjmoment: `M_x = n × F × L / 4`, där `n` är säkerhetsfaktorn.
- Böjspänning: `σ = M_x / W_x`.
- Tillåten spänning: `σ_till = 355 MPa`, alltid samma värde.
- Nyttjandegrad: `u = σ / σ_till`, redovisad i procent; böjvillkor `u ≤ 100 %`.
- Nedböjning vid ändarna relativt mittlyftet: `f = F × L³ / (48 × E × I)`, med `E = 210 000 MPa`.

Balkens egenvikt ingår inte i någon av beräkningarna. Säkerhetsfaktorn n används för böjmoment och böjspänning men inte för nedböjning. Profilvalet styrs enbart av böjning, utan skjuvvillkor eller nedböjningsgräns. Standardvärdet n = 2,0 är ett beräkningsantagande.

`profiles.js` innehåller 65 kvadratiska VKR-profiler från **Tibnors konstruktionstabeller 2023, tryckta sidor 20–21 (PDF-sida 11)**. Tabellen gäller S355J2H enligt SS-EN 10210, storlek 40–400 mm och tjocklek 3–16 mm. W_x är tabellens elastiska böjmotstånd (Wel i källan), I är tabellens tröghetsmoment och vikten är tabellens kg/m. Dessa värden beräknas inte längre från en förenklad geometri.

Exempel: **VKR 40 × 40 × 4: W_x = 5,91 cm³, I = 11,8 cm⁴, vikt = 4,39 kg/m**. I och W behåller tabellens oberoende avrundning. Internt används mm⁴ respektive mm³. Vid standardindata (2 000 mm, 1 000 kg, n = 2, S355) väljs VKR 80 × 80 × 4 med W_x = 28,6 cm³.

Granskningsbar CSV och källdokumentation finns i [data/SOURCE.md](data/SOURCE.md). Kör `python3 scripts/build_profiles.py` om CSV-filen ändras; det genererar `profiles.js` utan externa paket. Den vanliga webbsidan kräver varken Python eller PDF-filen. Tabellprofilerna är inte en bekräftelse av aktuellt lagersortiment. Rektangulära VKR och KKR ingår inte.

Lyftokets rapport har ingen skjuvkontroll. Skjuvning, lokal buckling, tvärsnittsklass, vippning, dynamik, utmattning, lyftöron, svetsar, hål och kraftintroduktion ingår inte. Fullständig konstruktionskontroll enligt tillämpliga krav, exempelvis EN 13155, krävs före tillverkning/användning. Verktyget godkänner inte ett komplett lyftredskap.

Alla antaganden och formler finns även under ”Antaganden, formler och begränsningar” på webbsidan.

### C-krok

Armarna kontrolleras för M_x = nF·L₁, V = nF och τ_max = 1,5V/A. Ryggen har N = nF och M_x = nF·L₁, men ingen tvärskjuvkraft. Största normalspänning i ryggen är N/A + M_x/W_x. Maxspänningar från olika punkter och olika snitt kvadratsummeras inte som en faktisk lokal von Mises-spänning.

Mcr = 4,013·√(E·Iz·G·It)/L₂ för den avgränsade konsolmodellen. Rektangelns torsionskonstant It beräknas med en approximation, inte med det polära tröghetsmomentet. Rapporterna visar modellförutsättningar och undertrycker vippningsjämförelsen när de inte gäller. Hörnradier, spänningskoncentrationer, lokal kraftintroduktion och hela krokens stabilitet verifieras inte.

[Fullständiga modeller, formler och avgränsningar](docs/models.md).

### C2 – lastöra

C2 följer ”Beräkning - C2.pdf”, sida 1: F = mgn, τ = F/(2at), M_B = (F/2)L, σ_B = M_B/W_x, σ_D = F/(2bt) och σ_summa = σ_B + σ_D. Gränserna är σ_till = 355 MPa och τ_till = 213 MPa. Eftersom skissens böjmotstånd inte är utvecklat antas W_x = ta²/6 för ett massivt rektangulärt snitt.

Se [C2:s källa, formler, antaganden och kontrollvärden](docs/c2-model.md). Den hänvisade C1-skjuvkontrollen finns separat och kräver egna verkliga snittmått. Ingen fullständig hål- eller lastöronverifiering utförs.

### C4 – lastkrok

C4 följer ”Rutin_Beräkning av C4 - Lastkrok.pdf”, sida 1: F = mgn, A = Kt, τ = F/A, L = (K + Ø_inne)/2, W_x = tK²/6, I_x = tK³/12, Mmax = −FL och f = FL³/(3EI_x). Böjkontrollen använder spänningens belopp; skjuvgränsen är 213 MPa och normalspänningsgränsen 355 MPa. Böjnedböjningen använder den faktoriserade kraften F och bedöms inte mot något gränsvärde.

Källexemplet ger |σ| = 53,028 MPa och f = 0,00340894 mm. Små skillnader mot skissens mellanvärden beror på att programmet inte avrundar W_x och I_x under beräkningen. Se [C4:s källa, formler, avgränsningar och kontrollvärden](docs/c4-model.md).

### C1 och L1

C1 följer ”Beräkning - C1.pdf”: τ = F/(2Kt) på två lika skjuvytor. L1 följer ”Beräkning - L1.pdf”: τ = F/(Kt) på en skjuvyta. Med identiska indata ger L1 alltså dubbelt så stor medelskjuvspänning som C1. Rapporterna gör endast denna nominella skjuvkontroll, utan att godkänna hela förbandet eller detaljen.

Se [C1/L1:s källor, formler och kontrollvärden](docs/c1-l1-models.md).

### Lyftok med asymmetriskt lyft

Med b = L−a gäller M_x = n·F·a·b/L. Vid a = L/2 återfås mittlyftsfallet. Deformationen redovisas relativt ändpunkternas förbindelselinje, utan säkerhetsfaktor; detta är ingen beräkning av absoluta ändhöjder eller slutlig lutning. Rapporten visar både största deformation längs balken och deformation vid själva lyftpunkten.

Se [modell, jämvikt, deformation och kontrollvärden](docs/asymmetric-beam-model.md). Profiljämförelsen och rapportvalet ligger i den gemensamma lastfallsvyn och hålls separata från mittlyftets indata.

## Utöka med fler beräkningsfall

`load-cases.js` registrerar indatafält, beräkning, diagram, resultat och rapport för varje fall. `case-ui.js` bygger det gemensamma formuläret och hanterar växling. `beam.js` och `report.js` används fortfarande för VKR-lyftoket, medan `calculations.js` och `c-hook-report.js` hanterar C-modellen. C2 och C4 läggs till med separata registreringsfiler `c2-case.js` respektive `c4-case.js`, beräkningsmoduler och rapportmoduler. C1 och L1 har separata registerposter via `plate-shear-cases.js`, med gemensam beräkningskod och rapportmall som skiljer på antalet skjuvytor.

Se [guide för nya beräkningsfall](docs/adding-load-cases.md). Nya parametriska fall kräver en beräknings-/rapportmodul och registrering, utan att det befintliga lyftokets kod ändras.

## Testa

Med Node.js 18 eller senare, utan externa paket:

```sh
node tests/beam.test.js
node tests/report.test.js
node tests/calculations.test.js
node tests/load-cases.test.js
node tests/c-hook-report.test.js
node tests/c2.test.js
node tests/c2-report.test.js
node tests/c4.test.js
node tests/c4-report.test.js
node tests/plate-shear.test.js
node tests/plate-shear-report.test.js
node tests/asymmetric-beam.test.js
node tests/asymmetric-beam-report.test.js
node tests/workbook-engine.test.js
node tests/workbook-report.test.js
node tests/workbook-cases.test.js
```

Testerna verifierar tabellvärden, handberäknade snittkrafter och spänningar, nedböjning, enhetsomvandling, registerutökning, rapportvärden, modellgränser och felhantering. Konsolens vippningskoefficient kontrolleras även genom en oberoende numerisk egenvärdeslösning.

Med Node.js 22+ och Chromium: `node tests/browser.cjs`. Integrationstestet verifierar alla 17 fallen, växling med separata indata, profilval, rapportknappar, felhantering, vippningsavgränsning och mobilbredd. Arbetsbokens PDF:er kontrolleras även för sidöverflöd och att anmärkningar följer med. Riktiga PDF-filer skapas i systemets temporära katalog för alla fall, exempelvis `beam-report-example.pdf`, `c-hook-report-example.pdf`, `asymmetric-beam-report-example.pdf` och `wb-kb5-report-example.pdf`. Välj annan sökväg för den första med `BEAM_TEST_PDF`; ange vid behov Chromium-sökväg med `CHROMIUM_BIN`. Vid en miljöpolicy som blockerar `file://` hoppas endast den kontrollen över med angivet skäl; HTTP-prov och PDF-kontroller körs ändå.
