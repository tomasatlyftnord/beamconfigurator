# C2 – lastöra

Källa: användarens bifogade **Beräkning - C2.pdf**, sida 1, handskriven skiss med rubriken ”C2 – lastöra”. PDF:en är en skannad bild och har granskats visuellt.

Originalfilens SHA-256: `c74d7e2016ff7466e0727aa66baa7f09baa18c4168ccc66b2a05362c548f5cac`.

## Indata och mått

- m: lastvikt som belastar lastörat, kg, före säkerhetsfaktor. Underlaget hänvisar till en tidigare momentberäkning (B). Någon sådan överföring från ett annat fall görs inte automatiskt.
- n: säkerhetsfaktor. PDF:en anger 2; det värdet är förvalt och kan ändras.
- t: plåttjocklek, mm.
- a: höjd vid det övre skjuv-/böjsnittet, mm.
- b: bredd per sida vid dragsnittet, mm.
- L: lokal momentarm i överdelen, mm; den är inte totalhöjden.

Två lika belastade sidor antas. Inmatade a och b är nominella mått för snitten i skissen; programmet bestämmer inte snitten från hålgeometri. PDF:en lämnar massan och alla mått tomma. De förifyllda appvärdena är ett illustrativt exempel, inte uppgifter från källan.

## Källans formler

F = m·g·n, där g = 9,82 m/s². Kraft per sida är F/2.

1. **Skjuvning:** τ = F/(2at), u_τ = τ/213.
2. **Böjning:** M_B = (F/2)L, σ_B = M_B/W_x, u_B = σ_B/355.
3. **Drag:** σ_D = F/(2bt).
4. **Summa enligt C2-underlaget:** σ_summa = σ_B + σ_D, u_summa = σ_summa/355.

Spänningar anges i MPa (N/mm²). Utnyttjanden redovisas i procent. Styrande snittnyttjande är max(u_τ, u_summa). Egenvikt försummas.

Skjuvspänningen är **medelskjuvspänningen enligt PDF:en**. Varken faktorn 1,5 för rektangelns maximala skjuvspänning eller gränsen 355/√3 används här. Källans uttryckliga gräns är **213 MPa**.

Skissen visar W_x men lämnar det geometriska uttrycket ofyllt. Programmet kompletterar med **W_x = ta²/6** för ett massivt rektangulärt böjsnitt. Detta är ett redovisat antagande, inte ett uttryck som står utskrivet i källan.

Summeringen σ_B + σ_D följer dokumentets nominella metod. Den är ingen separat verifiering av att dessa spänningar verkar i samma punkt i den verkliga detaljen.

## Kontrollvärden

Ett oberoende handfall, inte ett källexempel:

| Storhet | Värde |
| --- | ---: |
| m | 1 000 kg |
| n | 2 |
| t, a, b, L | 20, 60, 40, 50 mm |
| F | 19 640 N |
| W_x | 12 000 mm³ |
| M_B | 491 000 Nmm |
| τ | 8,183333 MPa |
| σ_B | 40,916667 MPa |
| σ_D | 12,275 MPa |
| σ_summa | 53,191667 MPa |
| u_summa | 14,983568 % |

Appens startvärden (m = 400 kg, n = 2, t = 10 mm, a = 40 mm, b = 30 mm, L = 40 mm) ger F = 7 856 N, τ = 9,82 MPa, σ_B = 58,92 MPa, σ_D = 13,093333 MPa och σ_summa = 72,013333 MPa.

## Omfattning

Vid nederhålet står ”Beräknas med C1 standard”. C1 är numera tillagt som separat fall enligt det kompletterande underlaget ”Beräkning - C1.pdf”. C1 gör en nominell kontroll av två lika skjuvytor K·t och utförs inte automatiskt i C2. Användaren måste ange rätt m, K och t för den verkliga C1-detaljen; C2:s mått a och b är inte automatiskt samma som C1:s K. Ett godkänt C1-skjuvvillkor verifierar inte hela hålet eller anslutningen. Hålkanttryck, nettosnitt vid hålet, utrivning, radier/spänningskoncentrationer, utmattning, vippning och nedböjning verifieras inte. Rapporten redovisar enbart C2-underlagets snittmetod och intygar inte ett komplett lastöras hållfasthet eller standarduppfyllelse.
