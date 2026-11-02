"""Generera webbläsardata från granskad Tibnor-CSV. Endast Python-standardbibliotek."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
with (root / 'data/vkr-tibnor-2023.csv').open() as source:
    rows = [{key: float(value) for key, value in row.items()} for row in csv.DictReader(source)]
assert len(rows) == 65, 'Förväntar 65 kvadratiska tabellprofiler'
assert len({(r['h_mm'], r['b_mm'], r['t_mm']) for r in rows}) == len(rows)
assert all(all(value > 0 for value in row.values()) for row in rows)
for row in rows:
    assert row['h_mm'] == row['b_mm']
    assert row['source_page'] in (20, 21)
    # Oberoende avrundning i källans I och W tillåts, fel enhetsmultipel gör det inte.
    assert abs(row['Wel_cm3'] / (row['I_cm4'] * 20 / row['h_mm']) - 1) < 0.01
payload = json.dumps(rows, ensure_ascii=False, indent=2)
output = ('// Genererad av scripts/build_profiles.py. Källa: data/SOURCE.md.\n'
          '// Enheter: mm, kg/m, mm², cm⁴ och cm³ enligt fältnamnen.\n'
          '(function (root) {\n  const rows = ' + payload + ';\n'
          '  if (typeof module !== "undefined" && module.exports) module.exports = rows;\n'
          '  root.TibnorProfiles = rows;\n'
          '})(typeof globalThis !== "undefined" ? globalThis : this);\n')
(root / 'profiles.js').write_text(output)
print(f'Genererade {len(rows)} profiler i profiles.js')
