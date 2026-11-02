# Beamconfigurator

Fristående svensk webbsida för preliminär böjdimensionering av ett lyftok med centrerad lyftpunkt och två lika ändlaster. Tillåten spänning σ_till är alltid 355 MPa (S355).

## Kör lokalt

### Enklast: öppna sidan direkt

1. Hämta projektet från GitHub med **Code → Download ZIP** och packa upp ZIP-filen. Du kan också klona repot:

   ```sh
   git clone https://github.com/tomasatlyftnord/beamconfigurator.git
   ```

2. Öppna den uppackade eller klonade projektmappen.
3. Dubbelklicka på `index.html`, eller välj **Öppna med → Google Chrome / Microsoft Edge / Firefox**.

Ingen installation av paket, byggning eller server behövs. När projektet har hämtats fungerar beräkning och rapportvisning utan internetanslutning. Håll `index.html`, `style.css`, `report.css`, `profiles.js`, `beam.js`, `report.js` och `app.js` i samma mapp. Behåll även mappen `data` för källdokumentationen och den nedladdningsbara CSV-tabellen. Python och Node.js behövs inte för att använda programmet på detta sätt.

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

### Om du ser en gammal version

Hämta de senaste projektfilerna (eller kör `git pull` i ett klonat repo), öppna rätt projektmapp och ladda om sidan med **Ctrl+Shift+R** i Chrome/Edge på Windows/Linux eller **Cmd+Shift+R** på Mac. Den aktuella versionen är märkt **V0.8 · TIBNOR 2023 · TABELLDATA** högst upp.

## Färger

Webbsidan och PDF-rapporten använder Lyftnords marinblå `#003152` och gula `#FFD200`. Gul används som accent och på primära knappar, med marinblå text.

## Användning

Ange c-c mellan lastpunkterna i mm och total lastvikt i kg. Ange säkerhetsfaktor n. Tillåten spänning är låst till 355 MPa. Resultatet uppdateras direkt och visar minsta elastiska böjmotstånd W bland jämförelsekandidater som klarar modellens böjvillkor. Balkens egenvikt försummas. Nedböjningen redovisas för ofaktorerad last och styr inte valet.

## Kontrollrapport som PDF

1. Ange last, c-c-mått och säkerhetsfaktor n.
2. Välj en profil med radioknappen i kolumnen **Rapportval** under **Jämför profiler**. Använd **Visa alla profiler** för hela tabellen. Rapportvalet är oberoende av det automatiska minsta profilvalet.
3. Fyll eventuellt i en rapportreferens och välj **Visa rapport / PDF**.
4. Granska rapporten och klicka **Spara som PDF**. Välj **Spara som PDF** i webbläsarens utskriftsdialog, A4 och utan webbläsarens sidhuvud/sidfot.

Rapporten är formgiven för två A4-sidor med indata, tabellvärden och källsida, lastmodell, böjmoment, böjspänning, böjutnyttjande samt nedböjning med formler och insatta värden. Rapporten saknar produktnamn, datum och länkar i sidhuvud/sidfot. Sidnumrering och eventuell rapportreferens behålls. Utskriftslayouten använder egna inre marginaler för att undvika webbläsarens automatiska sidhuvud/sidfot. Egenvikt försummas i både böjning och nedböjning; nedböjning räknas utan säkerhetsfaktor n och utan godkänd/underkänd-bedömning eftersom inget gränsvärde anges. Även en för svag profil kan väljas, men dess rapport markerar överskridet böjvillkor. Ogiltiga indata blockerar rapportöppning. Varje ny rapport använder aktuella indata; en redan öppnad rapport är en ögonblicksbild.

Rapporten innehåller också ett hållfasthetsuttalande för **två gånger angiven last, n = 2**. Det kontrolleras separat för vald profil även om formulärets säkerhetsfaktor är en annan. Uttalandet anger om det elastiska böjvillkoret uppfylls, med böjspänning och nyttjandegrad. Hänvisningen till **SS-EN 13155** beskriver rapporten som dimensioneringsunderlag för fortsatt verifiering, inte ett intyg om att hela lyftoket uppfyller standarden.

Ekvationerna använder webbläsarens inbyggda MathML-stöd för riktiga bråk, exponenter och index. Använd en aktuell version av Chrome, Edge, Firefox eller Safari. Ingen internetanslutning eller extern matematiktjänst behövs.

PDF skapas lokalt genom webbläsarens utskriftsfunktion. Inga data skickas till en extern tjänst och inga PDF-bibliotek behöver installeras.

**Om knappen inte öppnar utskriftsdialogen i en förhandsgranskning:** inbäddade förhandsvisningar kan blockera `window.print()`. Öppna sidan direkt i din egen webbläsare enligt instruktionerna ovan, antingen som lokal HTML-fil eller via lokal webbserver. Projektet behöver inte publiceras på internet. När rapporten visas kan du även använda **Ctrl+P** (Windows/Linux) eller **Cmd+P** (Mac) och välja **Spara som PDF**; i macOS kan alternativet ligga under menyn **PDF**.

## Modell och begränsningar

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

Rapportavsnittet ”Skjuvvillkor och beräkningens omfattning” ingår inte. Skjuvning, lokal buckling, tvärsnittsklass, vippning, dynamik, utmattning, lyftöron, svetsar, hål och kraftintroduktion ingår inte. Fullständig konstruktionskontroll enligt tillämpliga krav, exempelvis EN 13155, krävs före tillverkning/användning. Verktyget godkänner inte ett komplett lyftredskap.

Alla antaganden och formler finns även under ”Antaganden, formler och begränsningar” på webbsidan.

## Testa

Med Node.js 18 eller senare: `node tests/beam.test.js`. Inga paket behövs. Testerna verifierar lastmodell utan egenvikt, nedböjning, tabellvärden och enhetsomvandling, profilval och ogiltiga indata.

Rapporttester: `node tests/report.test.js` (profilval, böjspänning, utnyttjande, nedböjning, rapportreferens och ogiltiga indata).

Med Node.js 22+ och Chromium: `node tests/browser.cjs`. Integrationstestet startar en tillfällig lokal HTTP-server och verifierar inmatning, profilval, felhantering, rapportvisning, utskriftsknapp och mobilbredd i en riktig webbläsare. En riktig PDF skapas i systemets temporära katalog som `beam-report-example.pdf`; välj annan sökväg med `BEAM_TEST_PDF`. Ange vid behov sökvägen till Chromium med `CHROMIUM_BIN`.
