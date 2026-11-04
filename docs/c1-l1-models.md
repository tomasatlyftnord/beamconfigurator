# C1 och L1 – nominella skjuvkontroller

Källor: användarens **Beräkning - C1.pdf** och **Beräkning - L1.pdf**, sida 1 i respektive fil. Båda är handskrivna skannade bilder som har granskats visuellt. C1-rubriken anger ”C1 – Ändplåt”. L1:s fullständiga produktbeteckning utvecklas inte i programmet; fallet kallas ”L1 – skjuvkontroll”.

Originalfiler, SHA-256:

- C1: `df7677f302cb019f3e4452447f62a43e58ab5c1e4843f0b88f8b0752c34452a6`.
- L1: `e56aef194867be18630e07f4390f4678ebde000f3b5f5573396bb106892f2b7c`.

## Gemensamma indata och konstanter

m är lasten på den valda detaljen i kg. K är höjden av en markerad skjuvyta i mm och t plåttjockleken i mm. Båda underlagen anger g = 9,82 m/s², n = 2, σ_till = 355 MPa och τ_till = 0,6·σ_till = 213 MPa.

F = m·g·n och A = K·t, där A alltid är arean **per skjuvyta**. Egenvikt försummas. Det är medelskjuvspänning enligt källorna som kontrolleras; ingen faktor 1,5 och ingen ändring av gränsen till 355/√3 görs.

Källorna saknar ifyllda värden för m, K och t. Startvärdena 400 kg, K = 25 mm och t = 10 mm är därför illustrativa exempel, inte originaldata. Lastvärde och verkliga snittmått måste anges för den aktuella detaljen.

## C1 – två lika skjuvytor

Skissen visar två lika materialligament/skjuvytor A₁ och A₂ vid hålet. Programmet antar A₁ = A₂ = K·t och lika lastfördelning.

- Total skjuvarea A_tot = 2·K·t.
- Kraft per yta F/2.
- τ = F/(2·K·t).
- u = τ/213; ett uppfyllt nominellt skjuvvillkor innebär u ≤ 1.

Detta är inte ett generellt påstående om hela förbandets skjuvplan eller en automatisk beräkning utifrån håldiametern. Användaren anger den markerade skjuvhöjden K.

## L1 – en skjuvyta

Skissen markerar en skjuvyta i ring-/bågpartiets krona. Formeln i underlaget använder hela kraften på denna area:

- Total skjuvarea A_tot = K·t.
- Kraft per yta F.
- τ = F/(K·t).
- u = τ/213; ett uppfyllt nominellt skjuvvillkor innebär u ≤ 1.

Programmet delar inte L1:s last på två grenar. Med identiska m, n, K och t blir därför L1-spänningen exakt dubbelt så stor som C1-spänningen. Detta återger källans skjuvformel, inte en fullständig ringdimensionering.

## Oberoende kontrollvärden

| Indata/resultat | C1 | L1 |
| --- | ---: | ---: |
| m | 125 kg | 125 kg |
| n | 2 | 2 |
| K | 25 mm | 25 mm |
| t | 10 mm | 10 mm |
| F | 2 455 N | 2 455 N |
| A per skjuvyta | 250 mm² | 250 mm² |
| Total skjuvarea | 500 mm² | 250 mm² |
| τ | 4,91 MPa | 9,82 MPa |
| u | 2,305164 % | 4,610329 % |

Med appens startmassa 400 kg blir τ = 15,712 MPa för C1 och 31,424 MPa för L1.

## Förhållande till C2 och avgränsning

C2-underlaget hänvisar till ”C1 standard”. C1-skjuvberäkningen finns nu separat, men utförs inte automatiskt i C2:s rapport. C2:s a och b överförs inte till C1:s K. C1 kräver rätt last och verkliga snittmått för håldetaljens två skjuvytor.

Varken C1 eller L1 utför hålkanttryckskontroll, nettodrag, böjning, pinn-/svetskontroll, kontaktanalys, spänningskoncentrationsanalys, utmattning, nedböjning eller vippning. Källans tomma ”Godkänd”-rad återges därför inte som ett generellt godkännande. Rapporten anger endast om det redovisade nominella skjuvvillkoret uppfylls och intygar inte fullständig detalj- eller standardverifiering.
