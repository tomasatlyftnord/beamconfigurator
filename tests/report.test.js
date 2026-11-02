const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../report.js');
const { evaluate, profiles } = require('../beam.js');
const input = { span: 2000, mass: 1000, factor: 2, fy: 355 };
test('rapporten använder vald profil, inte automatiskt minsta profilen', () => {
  const html = render('VKR 40 × 40 × 4', input);
  assert.ok(html.includes('5,91 cm³'));
  assert.ok(html.includes('11,80 cm⁴'));
  assert.ok(html.includes('överskrider beräkningsvillkoret'));
  assert.ok(html.includes('ÖVERSKRIDET'));
});
test('böjspänning och utnyttjande följer samma beräkning som rapportens moment', () => {
  const p = evaluate(profiles.find(p => p.name === 'VKR 80 × 80 × 4'), input);
  assert.ok(Math.abs(p.stress - 346.23468881118885) < 1e-9);
  assert.ok(Math.abs(p.stress / 355 - p.utilization) < 1e-12);
  assert.equal(p.moment, p.momentLoad + p.momentSelf);
  assert.equal(p.deflection, p.deflectionLoad + p.deflectionSelf);
  const html = render(p.name, input);
  assert.ok(html.includes('346,23 MPa'));
  assert.ok(html.includes('97,53 %'));
  assert.ok(html.includes('6,8778 mm'));
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
