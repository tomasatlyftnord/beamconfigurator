# Lyftok med asymmetriskt lyft

En balk med två vertikala ändlaster och en enda vertikal lyftkraft.
Lastpunkterna antas ligga i balkens ändar. Avståndet mellan dem är L;
lyftpunkten ligger a från vänster ände, och b = L − a från höger.
Modellen kräver 0 < a < L, så att båda ändlasterna är positiva.

## Lastfördelning och jämvikt

Användaren anger total lastmassa m. För den avbildade geometrin kräver
kraft- och momentjämvikt följande fördelning:

- m_v = m·b/L; m_h = m·a/L.
- F = m·g, F_v = F·b/L, F_h = F·a/L, med g = 9,82 m/s².
- F_v + F_h = F och F_v·a = F_h·b.

Detta är den lastfördelning modellen **förutsätter**, inte en verifiering
av en verklig lasts tyngdpunktsläge. Fördelningen måste motsvara de
verkliga ändlasterna. Egenvikt försummas.

## Böjning och profilval

Största momentet uppträder vid lyftpunkten:

M_x = n·F_v·a = n·F_h·b = n·F·a·b/L.

σ = M_x/W_x, σ_till = 355 MPa och u = σ/355. Minsta erforderliga W_x är
M_x/355. Samma 65 kvadratiska VKR-profiler och oberoende tabellerade W/I
som i mittlyftsfallet används. Se [tabellkälla](../data/SOURCE.md).
Den minsta profilen väljs efter W_x, med kg/m som sekundär sortering.
Valfri jämförelseprofil kan väljas för rapport, även en profil som
överskrider böjvillkoret. Resultatet ska då visa överskridandet.

## Böjdeformation utan stel rotation

En ensam ledad lyftpunkt låser inte balkens stelkroppsrotation.
Beräkningen anger därför inte absoluta ändhöjder eller slutlig lutning.
I stället redovisas deformationen relativt den räta förbindelselinjen
mellan ändlastpunkterna (kordan). Denna deformation är oberoende av en
gemensam stel rotation.

Med E = 210 000 MPa, tabellens I i mm⁴ och brukslasten F utan n:

- Vid lyftpunkten: f_a = F·a²·b²/(3·E·I·L).
- Sätt s = min(a,b) och D = L² − s².
- Största deformation längs balken: f_max = F·s·D^(3/2)/(9√3·E·I·L).
- Läget för maximum från vänster ände:
  - Om a ≤ L/2: x_max = L − √((L² − a²)/3).
  - Annars: x_max = √((L² − b²)/3).

f_a och f_max är normalt olika vid asymmetri. Ingen deformationsgräns
används för profilvalet. Sambanden kan härledas genom integration av
balkkrökningen; relativt ändpunktskordan är lösningen densamma i belopp
som en fritt upplagd balk med punktlast F vid a och spegelvända krafter.

## Kontrollfall

L = 2 000 mm, a = 500 mm, m = 1 000 kg och n = 2 ger m_v = 750 kg,
m_h = 250 kg och M_x = 7,365 kNm. Minsta godtagbara tabellprofil är
VKR 70 × 70 × 4 med W_x = 21,3 cm³.

Om a speglas till L − a byter ändlasterna plats. Moment och
deformationsbelopp är oförändrade, medan x_max speglas till L − x_max.

Vid a = b = L/2 blir M_x = nFL/4 och f_max = f_a = FL³/(48EI).
Detta överensstämmer med det befintliga mittlyftsfallet för varje profil.
Automatiska tester kontrollerar även deformationssambanden mot en
oberoende numerisk integration av balkkrökningen.

## Omfattning

Skjuvning, stabilitet, lokal kraftintroduktion, hål, lyftöron, svetsar,
utmattning och dynamik verifieras inte. Rapportens hållfasthetsuttalande
avser endast den beräknade elastiska böjningen, inte fullständig
verifiering av redskapet eller SS-EN 13155.
