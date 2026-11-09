# Standardiserade beräkningar 0.1 – granskning

Källa: användarens bifogade **Standardiserade beräkningar - 0.1 - granskning.xlsx**.
SHA-256: `e4e586a02501f0bd772bed8982e9cd655c89bc9ce6c01a8b96bda7d86f683c7e`.

Alla tio beräkningsflikar finns i applikationen. L1, C1, C-krok och de enkla balkfallen KB2/KB5/KB6 ligger under **Komponenter**; H-ok, ramok, spridarok och semispridarok ligger under **Produkter**. Startfallet är Lyftok med mittlyft, med samma sidlayout som i commit `7ce79bc`. De tidigare sju fallen har kvar sina egna PDF-/Tibnor-underlag och placeras i samma kategorier efter typ av detalj eller produkt. De olika metoderna blandas inte: exempelvis är C4:s nedböjning faktorerad enligt dess PDF, medan KB2:s nedböjning följer arbetsbokens ofaktorerade last.

## Täckning

| Flik | Beräkningsfall | Återgivna beräkningar |
| --- | --- | --- |
| L1 | L1 – en skjuvarea | Medelskjuvspänning och nyttjandegrad, E30–E31 |
| C1 | C1 – två skjuvareor | Medelskjuvspänning och nyttjandegrad, E33–E34 |
| Balkböjning (KB5) | KB5 – balk med central punktlast | Profiluppslag, böjspänning, nyttjandegrad, nedböjning och L/200, E31–E40 |
| Balkböjning-Assymetrisk (KB6) | KB6 – balk med asymmetrisk punktlast | Profiluppslag, moment, spänning, nyttjandegrad, kortaste arm, största nedböjning och L/200, E27–E42 |
| H-ok | H-ok – huvudbalk och tvärbalkar | Två profiluppslag samt separata böj- och nedböjningskontroller, E30–E48 |
| Ramok | Ramok – axiella krafter och knäckning | Kraftfördelning, vinklar, tryck, knäcklängder, slankhet, två tabellslagningar och nyttjandegrader, E35–E64 |
| C-krok (profiler) | C-krok av profiler – arbetsbokens modell | Profiluppslag, båda armarna, ryggen, Mcr, momentjämförelse och total utböjning inklusive hjälpceller, E27–E147 |
| Konsolbalk (KB2) | KB2 – konsolbalk med punktlast | Profiluppslag, böjspänning, nyttjandegrad, nedböjning och L/200, E31–E40 |
| Spridarok | Spridarok – tryck och knäckning | Profiluppslag, tryckkraft/-spänning, tröghetsradie, knäcklängd, slankhet, tabellslagning och nyttjandegrad, E30–E46 |
| Semispridarok | Semispridarok – knäckning och böjning | Profiluppslag, tryck, knäckning, böjmoment/-spänning, separata nyttjandegrader och kombination, E31–E51 |
| Balkprofiler | Gemensam profiltabell | 204 poster: 84 kvadratiska, 102 rektangulära och 18 HEA. Wₓ = Wx × 1 000; Iₓ/Iᵧ/Kv × 10 000. Alla råkolumner bevaras. |
| KNÄCKTABELL | Gemensam knäcktabell | 23 rader. Strikt nästa större slankhet enligt arrayformlerna, ingen interpolation/extrapolation. |

Samtliga 129 formelceller i beräkningsflikarna redovisas, inklusive profiluppslag och hjälpceller. KB6!E27 har en konstant indataformel `=10000/3*2`; det sparade värdet används som redigerbar startmassa. C-krok!E140 är trasig i källan och återges som `#N/A` med anmärkning. Den används inte av andra beräkningar. Även profiltabellens 204 omvandlingsformler verifieras mot sparade källvärden.

## Granskningspunkter

Applikationen återger källans numeriska formler. Den ersätter inte tveksamma uttryck med nya modeller utan att det framgår. Följande anmärkningar följer berört resultat och PDF:

- **C-krok!E92:** ryggens böjspänning använder rygglängden som hävarm, vilket avviker från jämvikt för den ritade raka C-ramen. **E143–E146:** armrotationer uppskattas från ryggens sekantlutning; totalutböjningen är inte verifierad. **E98:** Mcr-formelns randvillkor är inte styrkta för hela C-kroken. Momentkvoten är ingen dimensionerande vippningsbärförmåga. Två olika armlängder ger dessutom inte jämvikt med enbart de ritade vertikala krafterna.
- **C-krok!E83:** kvoten E70/E68 har dimension mm/% och är inget slankhetstal. **E140:** trasig `#REF!` i ett oanvänt profiluppslag. **E27–E32:** externa `[1]!VKR` löses uttryckligen till den lokala profiltabellen. Det stämmer med det sparade exemplet; den externa tabellens övriga innehåll kan inte verifieras. **E70:** övre armens gräns använder rygglängd/200, till skillnad från nedre armens egen längd/200.
- **Semispridarok!E46:** tabellspänningen multipliceras med 1,75. Källan frågar själv ”Varför faktor 1,75?”. **E51:** kombinationen `0,9 × u_böj + u_tryck` saknar angiven grund. Både delvillkor och summan visas; ett överskridet böjvillkor döljs inte av faktorn 0,9.
- **Knäckning:** radien beräknas från Iₓ/A, inte min(Iₓ,Iᵧ). Svagaxelknäckning för rektangulära profiler verifieras inte. Knäcktabellen saknar angiven material-/normgrund. λ måste vara mindre än 190; λ = 170 väljer raden 190/20 MPa. Vid exakt tabellvärde väljs nästa rad. Ramok sida 2 börjar på λ = 25, övriga på 20. γ = 1 är ett antagande om effektiv knäcklängd.
- **Ramok!E44:** last per belastat hörn sätts till nmg/3. Detta är källans dimensioneringsantagande, inte en komplett lösning med fyra samtidigt lika belastade hörn.
- **KB6!F37:** momentet rubriceras Nm men formeln ger Nmm. Programmet visar Nmm med oförändrat talvärde. **KB2!A2:** felaktig KB5-rubrik; fliknamn och konsolformler används. **H-ok!E47:** cellens halva totallast följs; den inbäddade formelbilden saknar faktorn 1/2. Huvudbalkens och tvärbalkarnas deformationer är separata bidrag.
- **C1/L1:** F/A är nominell medelskjuvspänning; etiketten ”maximal” i källan beskriver inte lokala spänningstoppar. L/200 är arbetsbokens deformationsgräns, utan angiven generell normgrund.

### Profildata som kräver granskning

| Excelrad | Profil | Avvikelse |
| --- | --- | --- |
| 82 | 160x160x10 | Wₓ = 173 cm³ men Iₓ = 2 186 cm⁴ ger I/(h/2) = 273,25 cm³. |
| 152 | 140x70x5 | Wₓ = 59,8 cm³ men Iₓ = 488 cm⁴ ger 69,71 cm³. |
| 173 | 180x100x10 | A = 4 540 mm² är oförenligt med 40 kg/m för stål. |
| 174 | 200x100x5 | A = 3 870 mm² är oförenligt med 22,6 kg/m för stål. |
| 204 | 400x200x8 | A saknas, Iᵧ och Kv är noll, Wₓ är oförenligt med Iₓ och höjd. |
| 214–231 | HEA | A-rubrik mm² men tal i cm²; Iᵧ/Kv saknas. Tryck/knäckning och C-krok blockeras. |
| 218 | HE 180 A | A = 15,3 är dessutom oförenligt med vikt och radie. |
| 112–122 | Rektangulära profiler | Angivna radier i J/N avviker ungefär ×10 från √(I/A). Beräkningsfallen använder √(I/A). |

Råvärden bevaras. Rätt ersättningsvärde kan inte fastställas ur filen ensam. Saknade eller icke positiva nödvändiga profildata blockerar beräkning, utan antagande om noll eller interpolering. HEA-areorna används inte för tryck/knäckning eftersom enheten är felaktig. En profil kan fortfarande användas i en beräkning där de saknade egenskaperna inte behövs; anmärkningen kvarstår.

## Filer och reproduktion

- [workbook-profiles-0.1.csv](workbook-profiles-0.1.csv): alla originalkolumner med radreferenser och granskningsanmärkningar.
- [workbook-buckling-0.1.csv](workbook-buckling-0.1.csv): originalets knäcktabell.
- `workbook-data.js`: källdata, formler, sparade Excelresultat, tabeller och filens kontrollsumma. Inga externa arbetsböcker läses vid körning.
- `workbook-engine.js`: uttryckliga JavaScript-beräkningar. Ingen `eval` eller exekvering av innehåll ur Excel.
- `workbook-cases.js` och `workbook-report.js`: formulär, beräkningsspår och rapporter med MathML.

Importera om samma underlag med Python och `openpyxl`:

```sh
python3 scripts/import_workbook.py "sökväg/Standardiserade beräkningar - 0.1 - granskning.xlsx"
```

Importen läser originalet utan att skriva till det. Python behövs bara vid ny import; sidan fungerar fortsatt direkt från `index.html` utan server. Vid en ny arbetsboksversion måste även de uttryckliga beräkningarna och granskningsanmärkningarna granskas mot de nya formlerna.

Testerna jämför varje formelcell mot arbetsbokens sparade exempelresultat, kontrollerar profilomvandlingarna och provar ändrade indata, tabellgränser, felhantering och PDF-rapportering. Numerisk överensstämmelse med en arbetsbok är inte ett intyg om modellens giltighet eller uppfyllelse av SS-EN 13155.
