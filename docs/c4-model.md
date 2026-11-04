# C4 – lastkrok

Källa: användarens **Rutin_Beräkning av C4 - Lastkrok.pdf**, sida 1. Dokumentet är en handskriven skiss med rubriken ”C4 – Lastkrok” och ett genomräknat exempel. Bilden har granskats visuellt.

Originalfilens SHA-256: `5c45389b9b84ef5d99b4dab171d9a9c294ae0b2ff1c156b2edf33bf8940c4d4d`.

## Indata

- m: lastvikt, kg. Exempel: 125 kg.
- n: säkerhetsfaktor, förvalt 2 enligt källan.
- K: tvärsnittshöjd i böjplanet, mm. Exempel: 25 mm.
- t: plåttjocklek, mm. Exempel: 10 mm.
- Ø_inne: invändig diameter, mm. Värdet 20 mm framgår av källans insättning för L.

Konstanter enligt källan: g = 9,82 m/s², E = 210 000 N/mm², σ_till = 355 MPa och τ_till = 0,6·355 = 213 MPa. Programmet beräknar med N och mm och håller full precision i mellanvärden.

## Uttryck enligt underlaget

1. F = m·g·n.
2. A = K·t.
3. Medelskjuvspänning τ = F/A. Nyttjande u_τ = τ/213.
4. Konsolens längd/hävarm L = K/2 + Ø_inne/2.
5. Rektangulärt böjmotstånd W_x = t·K²/6.
6. Tröghetsmoment I_x = t·K³/12.
7. Tecknat rotmoment M_max = −F·L.
8. Tecknad böjspänning σ = M_max/W_x. Böjnyttjande u_σ = |σ|/355.
9. Böjnedböjning f = F·L³/(3·E·I_x).

Styrande snittnyttjande är max(u_τ, u_σ). Källan kontrollerar skjuvning och böjning var för sig; ingen ytterligare kombinationsregel eller vippningskontroll läggs till.

**Även böjnedböjningen använder den säkerhetsfaktoriserade kraften F.** Detta följer C4-underlaget och skiljer sig från lyftokets brukslastnedböjning. Det finns inget föreskrivet gränsvärde för f i dokumentet, så f får ingen godkänd/underkänd-bedömning.

## Kontrollvärden från källexemplet

| Storhet | Beräknat utan avrundade mellanvärden |
| --- | ---: |
| F | 2 455 N |
| A | 250 mm² |
| L | 22,5 mm |
| W_x | 1 041,666667 mm³ |
| I_x | 13 020,833333 mm⁴ |
| M_max | −55 237,5 Nmm |
| σ | −53,028 MPa |
| τ | 9,82 MPa |
| u_σ | 14,937465 % |
| u_τ | 4,610329 % |
| f | 0,003408942857 mm |

Skissen avrundar W_x till cirka 1 042 mm³ och I_x till cirka 13 021 mm⁴. Med W_x = 1 042 blir σ cirka −53,011 MPa, vilket förklarar den lilla skillnaden mot programmets −53,028 MPa. Skissens avrundade u anges ungefär som 15 % för böjning och 5 % för skjuvning.

## Omfattning

Underlaget ersätter krokens krökta parti med en rak konsol och använder nominella spänningar i ett massivt rektangulärt snitt. Figuren i programmet är schematisk. Böjnedböjningen f är bara konsolmodellens böjningsbidrag: skjuvdeformation och verklig total krokdeformation ingår inte. Källexemplets L/K = 0,9 innebär en kort/djup konsol; värdet är därför en återgivning av den valda förenklingen, inte ett påstående om att all deformation är försumbar.

Krökt-balkspänningar, lokalt kontakttryck, hål och anslutningar, spänningskoncentrationer, utmattning och stabilitet verifieras inte. Rapporten intygar inte ett komplett redskaps hållfasthet eller uppfyllelse av SS-EN 13155.
