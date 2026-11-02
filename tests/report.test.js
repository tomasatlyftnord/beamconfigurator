const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../report.js');
const { evaluate, profiles } = require('../beam.js');
const input = { span: 2000, mass: 1000, factor: 2 };
test('rapporten använder vald profil, inte automatiskt minsta profilen', () => {
  const html = render('VKR 40 × 40 × 4', input);
  assert.ok(html.includes('5,91 cm³'));
  assert.ok(html.includes('11,80 cm⁴'));
  assert.ok(html.includes('överskrider beräkningsvillkoret'));
  assert.ok(html.includes('ÖVERSKRIDET'));
});
test('böjspänning och utnyttjande följer samma beräkning som rapportens moment', () => {
  const p = evaluate(profiles.find(p => p.name === 'VKR 80 × 80 × 4'), input);
  assert.ok(Math.abs(p.stress - 343.35664335664336) < 1e-9);
  assert.ok(Math.abs(p.stress / 355 - p.utilization) < 1e-12);
  assert.equal(p.moment, 9820000);
  assert.ok(Math.abs(p.deflection - 6.836535783904205) < 1e-12);
  const html = render(p.name, input);
  assert.ok(html.includes('<mn>343,36</mn><mtext> MPa</mtext>'));
  assert.ok(html.includes('<mn>96,72</mn><mtext> %</mtext>'));
  assert.ok(html.includes('<mn>6,8365</mn><mtext> mm</mtext>'));
  assert.ok(html.includes('Inget gränsvärde har angetts'));
});
test('rapportreferensen är text, och ogiltiga indata kan inte exporteras', () => {
  const html = render('VKR 80 × 80 × 4', input, '<img src=x onerror=alert(1)>', new Date('2026-11-02T12:00:00Z'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('13:00'));
  assert.throws(() => render('VKR saknas', input), RangeError);
  assert.throws(() => render('VKR 80 × 80 × 4', { ...input, mass: NaN }), RangeError);
});

test('rapporten använder nya beteckningar och saknar skjuvavsnitt och egenviktsbidrag', () => {
  const html = render('VKR 80 × 80 × 4', input);
  const math = [...html.matchAll(/<math[\s\S]*?<\/math>/g)].map(m => m[0]).join('');
  assert.ok(math.includes('<mi>F</mi>'));
  assert.ok(math.includes('<mi>n</mi>'));
  assert.ok(math.includes('<mi>M</mi><mtext>x</mtext>'));
  assert.ok(math.includes('<mi>W</mi><mtext>x</mtext>'));
  assert.ok(math.includes('<mi>σ</mi><mtext>till</mtext>'));
  assert.ok(math.includes('<mi>u</mi>'));
  assert.ok(math.includes('<mi>f</mi>'));
  for (const forbidden of ['<mi>P</mi>', '<mi>k</mi>', '<mtext>Ed</mtext>', '<mtext>el</mtext>', 'f_yd', 'η', 'δ', 'egenvikt']) {
    assert.ok(!math.includes(forbidden), forbidden);
  }
  assert.ok(html.includes('9,82 m/s²'));
  assert.ok(!html.includes('Skjuvvillkor och beräkningens omfattning'));
  assert.ok(!html.includes('report-shear'));
});
