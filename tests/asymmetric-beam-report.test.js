const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render, diagram } = require('../asymmetric-beam-report.js');
const input = { span: 2000, mass: 1000, factor: 2, liftPosition: 500 };
const profile = 'VKR 80 × 80 × 4';

test('asymmetrisk rapport visar balanserade handvärden och vald profil', () => {
  const html = render(profile, input);
  // F=9820, a=500,b=1500: Fv=7365,Fh=2455,M=2*9820*500*1500/2000.
  for (const text of ['Lyftok med asymmetriskt lyft', profile, '750,00 kg', '250,00 kg',
    '<mn>7 365,00</mn><mtext> N</mtext>', '<mn>2 455,00</mn><mtext> N</mtext>',
    '<mn>7,3650</mn><mtext> kNm</mtext>', '<mn>257,52</mn><mtext> MPa</mtext>',
    '<mn>72,54</mn><mtext> %</mtext>', '28,60 cm³', '114,00 cm⁴']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/class="report-page"/g) || []).length, 2);
  const small = render('VKR 40 × 40 × 4', input);
  assert.ok(small.includes('5,91 cm³'));
  assert.ok(small.includes('överskrider beräkningsvillkoret'));
  assert.ok(small.includes('ÖVERSKRIDET'));
});

test('böjformen visar största kordavvikelse, lyftpunktens kordavvikelse och koordinat', () => {
  const html = render(profile, input);
  // Med I=1 140 000 mm4: s=500,D=3 750 000; x=2000-sqrt(1 250 000).
  for (const text of ['<mn>4,7772</mn><mtext> mm</mtext>', '<mn>3,8456</mn><mtext> mm</mtext>',
    '<mn>881,97</mn><mtext> mm</mtext>', 'f<sub>lyft</sub> är avvikelsen från samma korda',
    'ändpunkternas absoluta förskjutningar', 'eller om balken hänger vågrätt']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Nedböjningen avser ändarna relativt mittlyftet'));
});

test('mittlyft återger den befintliga symmetriska deformationens belopp', () => {
  const html = render(profile, { ...input, liftPosition: 1000 });
  // F L³/(48EI) = 6.8365357839 mm; max och x=a sammanfaller vid mittpunkten.
  assert.equal((html.match(/<mn>6,8365<\/mn><mtext> mm<\/mtext>/g) || []).length, 2);
  assert.ok(html.includes('<mn>1 000,00</mn><mtext> mm</mtext>'));
  assert.ok(html.includes('500,00 kg'));
});

test('speglat lyft bevarar f och speglar x medan n endast ändrar böjkontrollen', () => {
  const mirrored = render(profile, { ...input, liftPosition: 1500 });
  assert.ok(mirrored.includes('<mn>4,7772</mn><mtext> mm</mtext>'));
  assert.ok(mirrored.includes('<mn>1 118,03</mn><mtext> mm</mtext>'));
  assert.ok(mirrored.includes('a &gt; L/2'));
  const n1 = render(profile, { ...input, factor: 1 });
  assert.ok(n1.includes('<mn>128,76</mn><mtext> MPa</mtext>'));
  assert.ok(n1.includes('<mn>4,7772</mn><mtext> mm</mtext>'));
  assert.ok(n1.includes('Ofaktorerad F används; n ingår inte'));
});

test('separat uttalande vid n2 kan underkännas även när n1 böjvillkor uppfylls', () => {
  const html = render('VKR 60 × 60 × 4', { ...input, factor: 1 });
  assert.ok(html.includes('Böjkontroll: uppfyller beräkningsvillkoret'));
  assert.ok(html.includes('Balkens elastiska böjvillkor uppfylls inte vid n = 2,00'));
  assert.ok(html.includes('räknas separat med n = 2,00'));
  assert.ok(html.includes('standarduppfyllelse kan inte intygas'));
});

test('tabellkälla, neutral sidnumrering och escaped referens följer rapportkraven', () => {
  const html = render(profile, input, '<img src=x onerror="alert(1)">&\'');
  assert.ok(html.includes('Tibnors konstruktionstabeller 2023'));
  assert.ok(html.includes('tryckt sida 20'));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('Beamconfigurator'));
  assert.ok(!html.includes('<a '));
  assert.ok(!html.includes('Datum:'));
});

test('ogiltiga lyftlägen och profilnamn avvisas; diagrammet placerar lyftet geometriskt', () => {
  for (const liftPosition of [0, 2000, -1, NaN, '500']) {
    assert.throws(() => render(profile, { ...input, liftPosition }), RangeError);
    assert.throws(() => diagram({ ...input, liftPosition }), RangeError);
  }
  assert.throws(() => render('VKR saknas', input), RangeError);
  assert.throws(() => render(profile, { ...input, mass: NaN }), RangeError);
  const svg = diagram(input);
  assert.ok(svg.includes('M170 115V38'));
  assert.ok(svg.includes('7,365 kN ↓'));
  assert.ok(svg.includes('2,455 kN ↓'));
});

test('rapportens indata bevarar decimaler i lyftläget', () => {
  const html = render('VKR 80 × 80 × 4', { ...input, liftPosition: 500.25 });
  assert.ok(html.includes('500,25 mm'));
  assert.ok(html.includes('1 499,75 mm'));
});
