const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculate, evaluate, profiles } = require('../beam.js');
const find = (h, t) => profiles.find(p => p.h === h && p.t === t);
const input = { span: 2000, mass: 1000, factor: 2, fy: 355 };
function near(actual, expected) { assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * 1e-10, `${actual} != ${expected}`); }
test('centrerat lyft: ändlaster ger M = PL/4, egenvikt qL²/8', () => {
  const p = { ...find(100, 5), mass: 0 };
  const r = evaluate(p, input);
  near(r.moment, 9810000);
  near(r.shear, 9810);
  near(r.requiredW, 9810000 / 355);
  const withWeight = evaluate({ ...p, mass: 10 }, input);
  near(withWeight.moment - r.moment, 98100);
  near(withWeight.shear - r.shear, 196.2);
});
test('nedböjning följer två konsoler och använder brukslast', () => {
  const p = { ...find(100, 5), mass: 0 };
  near(evaluate(p, input).deflection, (9810 / 2) * 1000 ** 3 / (3 * 210000 * p.I));
  near(evaluate(p, input).deflection, evaluate(p, { ...input, factor: 4 }).deflection);
  const doubled = evaluate(p, { ...input, span: 4000 });
  near(doubled.deflection, evaluate(p, input).deflection * 8);
});
test('Tibnor sida 20: VKR 40×40×4 har elastiskt W 5,91 cm³', () => {
  const p = find(40, 4);
  assert.equal(p.W, 5910);
  assert.equal(p.I, 118000);
  assert.equal(p.mass, 4.39);
  assert.equal(p.area, 559);
  assert.equal(p.sourcePage, 20);
  assert.notEqual(p.W, p.I / (p.h / 2), 'Tabellens oberoende avrundning ska bevaras');
  assert.notEqual(p.W, 7440, 'Plastiskt Wpl = 7,44 cm³ får inte användas');
});
test('tabellrader från början, mitt och slut har rätt enhetsmultiplar', () => {
  for (const [h, t, I, W, mass, page] of [
    [40, 3, 97800, 4890, 3.41, 20],
    [80, 7.1, 1760000, 43900, 15.8, 20],
    [120, 4.5, 4550000, 75800, 16.1, 20],
    [140, 5, 8070000, 115000, 21, 21],
    [250, 12.5, 109150000, 873000, 91.9, 21],
    [400, 16, 593440000, 2967000, 191, 21]
  ]) {
    const p = find(h, t);
    assert.deepEqual([p.I, p.W, p.mass, p.sourcePage], [I, W, mass, page]);
  }
});
test('samtliga 65 tabellprofiler har fysikaliskt rimliga enheter', () => {
  assert.equal(profiles.length, 65);
  for (const p of profiles) {
    assert.ok(Math.abs(p.W / (p.I / (p.h / 2)) - 1) < 0.01);
    assert.ok(Math.abs(p.mass / (p.area * 0.00785) - 1) < 0.01);
    assert.ok(p.shearArea > 0);
  }
});
test('valet har minsta W bland samtliga kandidater som klarar kontrollerna', () => {
  const { chosen, rows } = calculate(input);
  assert.ok(chosen);
  assert.ok(chosen.utilization <= 1 && chosen.shearRatio <= 0.5);
  assert.ok(rows.every(p => p.W >= chosen.W || p.utilization > 1 || p.shearRatio > 0.5));
  assert.equal(rows.length, profiles.length);
  assert.equal(chosen.name, 'VKR 80 × 80 × 4');
  near(chosen.moment, 9902312.1);
  near(chosen.capacity, 10153000);
});
test('högre last och lägre hållfasthet ger minst lika stort W', () => {
  const base = calculate(input).chosen;
  assert.ok(calculate({ ...input, mass: 2000 }).chosen.W >= base.W);
  assert.ok(calculate({ ...input, fy: 235 }).chosen.W >= base.W);
});
test('orimliga och ofullständiga indata avvisas', () => {
  for (const change of [{ span: 0 }, { mass: -1 }, { mass: NaN }, { factor: 0.5 }, { factor: Infinity }, { fy: 999 }]) {
    assert.throws(() => calculate({ ...input, ...change }), RangeError);
  }
});
test('listan har unik positiv geometri och extrem last ger ingen kandidat', () => {
  assert.equal(new Set(profiles.map(p => p.name)).size, profiles.length);
  assert.ok(profiles.every(p => p.I > 0 && p.mass > 0 && Number.isFinite(p.W)));
  assert.equal(calculate({ ...input, mass: 1000000, span: 20000 }).chosen, null);
});
