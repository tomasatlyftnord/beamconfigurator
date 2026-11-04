# Beräkningsmodeller

Gemensamt används N och mm, g = 9,82 m/s², E = 210 000 MPa,
ν = 0,30, G = E/[2(1 + ν)] och σ_till = 355 MPa. Egenvikt försummas.
Säkerhetsfaktorn n multiplicerar lastkraften i spänningskontrollerna.
Inget av fallen intygar standarduppfyllelse för ett komplett lyftredskap.

## Lyftok med mittlyft

Oförändrad modell: två lika ändlaster och centrerat mittlyft.
M_x = nFL/4, σ = M_x/W_x och f = FL³/(48EI). Nedböjningen använder
ofaktorerad last. Profilvalet använder Tibnors 65 kvadratiska VKR-profiler.
Se även [tabellkälla](../data/SOURCE.md).

## Lyftok med asymmetriskt lyft

Ett separat fall med lyftläge a och balanserad fördelning av ändlasterna
använder samma tabellprofiler. Se [modell, lastjämvikt och kordrelativ
deformation](asymmetric-beam-model.md). Vid a = L/2 återfås mittlyftsfallet.

## C-krok av plåt: raka balkdelar

Modellen motsvarar en C-form utskuren ur en plåt. Tvärsnittshöjden h ligger
i C-formens plan och plåttjockleken t är vinkelrät mot detta plan.
Samma h och t används i båda armarna och ryggen. L är centrumavståndet
mellan armarna; fri öppning är L − h. Armlängderna måste vara lika:
L₁ = L₂ = e, mätt från ryggens centrumlinje till kraftlinjen.
Två rent vertikala, motriktade krafter kan då vara i jämvikt utan ett
yttre kraftpar. Olika L₁ och L₂ kräver en annan last-/upplagsmodell.

F = mg, F_n = nF. Snittdata: A = th, I_x = th³/12 och W_x = th²/6.

- Armar: M_x = F_n e och V = F_n. Ingen normalkraft.
- Rygg: M_x = F_n e och N = F_n. Ingen tvärskjuvkraft.
- Största normalspänning i ryggen: σ_rygg = N/A + M_x/W_x.
- Maximal skjuvspänning i armarna: τ_max = 1,5V/A.

För ett massivt rektangulärt snitt med linjär böjspänning och parabolisk
skjuvspänning är största von Mises-spänning över armen
max(|σ_b,max|, √3|τ_max|). Maximal böj- och skjuvspänning uppträder inte på
samma punkt. Styrande jämförelsespänning över de kontrollerade snitten är
därför max(|σ_rygg|, √3|τ_arm,max|). Snittnyttjandegraden är detta värde
dividerat med 355 MPa. Lokal geometri vid hörnen ingår inte i detta värde.

Höjden L ändrar inte snittkrafterna i den statiska idealmodellen. Den kan
däremot påverka verklig eftergivlighet och stabilitet. Ingen deformation
av hela C-ramen eller krökt-balk-/hörnanalys utförs.

## Idealiserad vippningskontroll av underarmen

Separat balkidealisation: rak prismatisk underarm med sid- och vridstyvt
inspänd rot, fri spets och en punktkraft genom skjuvcentrum vid spetsen.
Saint-Venant-torsion används och välvstyvhet försummas.

Lateral tröghet I_z = ht³/12. Torsionskonstanten uppskattas med

I_t ≈ ac³[1/3 − 0,21(c/a)(1 − c⁴/(12a⁴))],

där a = max(h,t) och c = min(h,t). I_t är inte det polära tröghetsmomentet.

M_cr = 4,013 √(EI_z GI_t) / e och F_cr = M_cr/e.

Koefficienten kan verifieras genom idealmodellens differentialekvation
för vridningen: θ''(s) + λ²s²θ(s) = 0, θ'(0) = 0 vid den fria spetsen,
θ(1) = 0 vid roten. Här mäts s från spets mot rot och
λ = F_cr e²/√(EI_z GI_t). Första egenvärdet är cirka 4,012599.
Ett numeriskt oberoende RK4-/bisektionstest verifierar avrundningen 4,013.

Programmet visar endast M_cr-jämförelsen om användaren anger ideal
inspänning och kraft genom skjuvcentrum samt om e/h ≥ 10 och t ≤ h.
Denna geometrigräns är programmets avgränsning, **inte ett standardkrav**.

M_x/M_cr är en jämförelse med ett idealt elastiskt kritiskt moment,
**inte** en dimensionerande vippningsnyttjandegrad. Hela C-krokens
stabilitet verifieras inte. En verklig kontaktlast på armens ovansida
kan vara destabiliserande; resultatet för skjuvcentrumlaster är inte en
garanterad konservativ underkant för sådan kontaktlast. Rotens verkliga
sid- och vridstyvhet måste också bedömas.

## Vad som återstår för ett komplett redskap

Krökta hörn, radier och spänningskoncentrationer, hål, lokal
kraftintroduktion, lokal buckling, utmattning, dynamik och hela ramens
stabilitet ingår inte. En komplett verifiering mot tillämpliga krav,
exempelvis SS-EN 13155, behöver behandla de relevanta delarna separat.
