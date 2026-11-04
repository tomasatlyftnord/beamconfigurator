const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registry, createRegistry } = require('../load-cases.js');
require('../c2-case.js');
require('../c4-case.js');
require('../plate-shear-cases.js');
require('../asymmetric-beam-case.js');

test('lastfallsregistret innehåller sju fall med egna beräkningar', () => {
  assert.deepEqual(registry.list().map(c => c.id), ['lifting-beam', 'c-hook', 'c2', 'c4', 'c1', 'l1', 'asymmetric-beam']);
  const beam = registry.get('lifting-beam').calculate({ mass: 400, span: 350, factor: 2 });
  assert.equal(beam.chosen.force, 3928);
  const hook = registry.get('c-hook');
  const input = Object.fromEntries(hook.fields.map(f => [f.name, f.default]));
  const result = hook.calculate(input);
  assert.ok(Math.abs(result.backStress - 299.51) < 0.01);
  assert.ok(hook.renderReport({ input, reference: 'CK-001' }).includes('CK-001'));
});

test('ett nytt beräkningsfall kan registreras utan ändring av befintliga modeller', () => {
  const extension = createRegistry();
  const definition = { id: 'new-case', title: 'Exempelfall', fields: [{ name: 'force', default: 10 }],
    calculate: i => ({ value: i.force * 2 }), diagram: () => '<svg/>',
    renderResults: r => String(r.value), renderReport: ({ result }) => String(result.value) };
  extension.register(definition);
  const c = extension.get('new-case');
  const result = c.calculate({ force: 30 });
  assert.equal(c.renderResults(result), '60');
  assert.equal(c.renderReport({ result }), '60');
  assert.throws(() => extension.register(definition), /finns redan/);
  assert.throws(() => extension.register({ id: 'missing-parts' }), TypeError);
  assert.equal(registry.get('new-case'), undefined);
});

test('vippningsjämförelsen tillåts endast inom den deklarerade konsolmodellen', () => {
  const c = registry.get('c-hook');
  const input = Object.fromEntries(c.fields.map(f => [f.name, f.default]));
  assert.ok(c.stabilityApplicable(input));
  for (const change of [{ rootRestraint: 'unknown' }, { loadPosition: 'other' }, { reach: 600 }, { b: 100 }]) {
    assert.equal(c.stabilityApplicable({ ...input, ...change }), false);
    assert.ok(c.renderResults(c.calculate({ ...input, ...change }), { ...input, ...change }).includes('Mcr-jämförelse visas inte'));
  }
});

test('C2 registreras som separat modell med källspecifik skjuvgräns', () => {
  const c2 = registry.get('c2');
  const input = Object.fromEntries(c2.fields.map(f => [f.name, f.default]));
  const result = c2.calculate(input);
  assert.ok(Math.abs(result.totalStress - 72.01333333333334) < 1e-9);
  assert.ok(Math.abs(result.shearUtilization - 9.82 / 213) < 1e-12);
  assert.ok(c2.renderResults(result).includes('Hål-/C1-kontrollen ingår inte'));
  assert.ok(c2.renderReport({ input, reference: 'C2-001' }).includes('C2-001'));
  assert.ok(c2.assumptions.some(t => t.includes('Beräkning - C2.pdf')));
});

test('C4 registreras separat och räknar nedböjning med säkerhetsfaktorn', () => {
  const c4 = registry.get('c4');
  const input = Object.fromEntries(c4.fields.map(f => [f.name, f.default]));
  const p = c4.calculate(input);
  assert.equal(p.force, 2455);
  assert.equal(p.lever, 22.5);
  assert.ok(Math.abs(p.bendingStress - 53.028) < 1e-9);
  assert.ok(Math.abs(p.deflection - 0.003408942857142857) < 1e-12);
  assert.ok(c4.renderResults(p).includes('0,003409'));
  assert.ok(c4.renderReport({ input, reference: 'C4-001' }).includes('C4-001'));
});

test('C1 och L1 använder låst antal skjuvytor och separata rapporter', () => {
  const c1 = registry.get('c1'), l1 = registry.get('l1');
  const input = { mass: 400, factor: 2, k: 25, t: 10 };
  const a = c1.calculate(input), b = l1.calculate(input);
  assert.equal(a.planes, 2);
  assert.equal(b.planes, 1);
  assert.equal(b.shearStress, 2 * a.shearStress);
  assert.ok(c1.renderReport({ input, reference: 'C1-001' }).includes('C1-001'));
  assert.ok(l1.renderReport({ input, reference: 'L1-001' }).includes('L1-001'));
});

test('asymmetriskt lyft har egen profiljämförelse och rapporterar valt tvärsnitt', () => {
  const c = registry.get('asymmetric-beam');
  const input = Object.fromEntries(c.fields.map(f => [f.name, f.default]));
  const result = c.calculate(input);
  assert.equal(c.profileSelection, true);
  assert.equal(result.chosen.name, 'VKR 70 × 70 × 4');
  assert.ok(c.renderResults(result, input).includes('750,00'));
  assert.ok(c.renderReport({ input, profileName: 'VKR 40 × 40 × 3', reference: 'AS-001' }).includes('AS-001'));
});
