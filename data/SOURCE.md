# Källa till VKR-data

Detta dokument gäller de tidigare lyftoksmodellerna. Den nya arbetsbokens 204 profiler och tio beräkningsfall har separat [källdokumentation och granskningspunkter](WORKBOOK.md).

Tibnors konstruktionstabeller, fil `konstruktionstabellerSWE-2023.pdf`, avsnitt 008 VKR-rör, tryckta sidor 20–21 (PDF-sida 11). Kvadratiska S355J2H enligt SS-EN 10210. 65 tabellrader har extraherats från användarens bifogade PDF.

Källa: https://www.tibnor.se/medias/konstruktionstabellerSWE-2023.pdf

Originalfilens SHA-256: `4977fea5282dbf5ed1e64fe8217be164a4cb46c26a40bdbaa1fe315570faa711`.

`vkr-tibnor-2023.csv` bevarar tabellens numeriska precision. Decimaltecken har normaliserats till punkt. I-kolumnens multipel är 10⁴ mm⁴, vilket är cm⁴. W-kolumnens multipel är 10³ mm³, vilket är cm³. W är **elastiskt** böjmotstånd (Wel), inte plastiskt Wpl. För kvadratiska profiler är y- och z-värden lika.

Exempel, tryckt sida 20: VKR 40 × 40 × 4 har Wel = 5,91 cm³, I = 11,8 cm⁴, g = 4,39 kg/m och A = 559 mm². Värdena är oberoende avrundade i källan; W ska därför inte räknas om från I.

Tabellen omfattar nominella sektionsdata och är ingen bekräftelse av aktuellt lagersortiment. Rektangulära VKR och KKR har inte importerats. Appen och rapporten betecknar tabellens elastiska böjmotstånd som W_x. Källfilens Wel-kolumnnamn bevaras i CSV-filen.

Kör `python3 scripts/build_profiles.py` efter en granskad ändring i CSV-filen för att generera `profiles.js`. Webbsidan använder den genererade filen direkt, utan CSV-hämtning eller internetanslutning.
