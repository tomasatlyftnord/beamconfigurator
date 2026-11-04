const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { constants, calculate } = require('../c2.js');

const base = Object.freeze({ mass: 400, factor: 2, t: 10, a: 40, b: 30, lever: 40 });
const near = (actual, expected, relative = 1e-10) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * relative,
  `${actual} != ${expected}`
);

test('C2 stämmer med oberoende handvärden för 400 kg', () => {
  const p = calculate(base);
  near(p.force, 7856);
  near(p.loadPerSide, 3928);
  near(p.shearAreaPerSide, 400);
  near(p.tensionAreaPerSide, 300);
  near(p.W, 2666.6666666666665);
  near(p.moment, 157120);
  near(p.shearStress, 9.82);
  near(p.bendingStress, 58.92);
  near(p.tensionStress, 13.093333333333334);
  near(p.totalStress, 72.01333333333334);
  near(p.shearUtilization, 9.82 / 213);
  near(p.bendingUtilization, 58.92 / 355);
  near(p.totalUtilization, 72.01333333333334 / 355);
  near(p.utilization, p.totalUtilization);
  near(constants.g, 9.82);
  near(constants.allowableStress, 355);
  near(constants.allowableShear, 213);
});

test('ett andra oberoende handfall stämmer med andra snittmått', () => {
  const p = calculate({ mass: 1000, factor: 2, t: 20, a: 60, b: 40, lever: 50 });
  near(p.force, 19640);
  near(p.W, 12000);
  near(p.moment, 491000);
  near(p.shearStress, 8.183333333333334);
  near(p.bendingStress, 40.916666666666664);
  near(p.tensionStress, 12.275);
  near(p.totalStress, 53.19166666666666);
});

test('massa och säkerhetsfaktor skalar last, spänning och utnyttjande linjärt', () => {
  const p = calculate(base);
  const fields = ['force', 'loadPerSide', 'moment', 'shearStress', 'bendingStress', 'tensionStress', 'totalStress', 'shearUtilization', 'bendingUtilization', 'totalUtilization', 'utilization'];
  for (const changed of [{ mass: 800 }, { factor: 4 }]) {
    const doubled = calculate({ ...base, ...changed });
    for (const field of fields) near(doubled[field], p[field] * 2);
    near(doubled.W, p.W);
  }
  const withoutFactor = { ...base };
  delete withoutFactor.factor;
  near(calculate(withoutFactor).force, p.force);
  near(calculate({ ...base, factor: 1 }).force, p.force / 2);
  near(calculate({ ...base, factor: 10 }).force, p.force * 5);
});

test('tjocklek, snitthöjd och hävarm ger avsedda separata skalningar', () => {
  const p = calculate(base);
  const thickness = calculate({ ...base, t: 20 });
  for (const field of ['shearStress', 'bendingStress', 'tensionStress', 'totalStress', 'utilization']) near(thickness[field], p[field] / 2);
  near(thickness.W, p.W * 2);
  const height = calculate({ ...base, a: 80 });
  near(height.shearStress, p.shearStress / 2);
  near(height.bendingStress, p.bendingStress / 4);
  near(height.tensionStress, p.tensionStress);
  const lever = calculate({ ...base, lever: 80 });
  near(lever.bendingStress, p.bendingStress * 2);
  near(lever.shearStress, p.shearStress);
  near(lever.tensionStress, p.tensionStress);
  const width = calculate({ ...base, b: 60 });
  near(width.tensionStress, p.tensionStress / 2);
  near(width.bendingStress, p.bendingStress);
});

test('gränsen u=1 följer summan av böj- och dragspänning', () => {
  // Varje kg ger n*g*[3*L/(t*a²) + 1/(2*b*t)] MPa.
  const kgStress = 2 * 9.82 * (3 * 40 / (10 * 40 ** 2) + 1 / (2 * 30 * 10));
  const criticalMass = 355 / kgStress;
  const p = calculate({ ...base, mass: criticalMass });
  near(p.totalStress, 355);
  near(p.totalUtilization, 1);
  near(p.utilization, 1);
  assert.ok(p.shearUtilization < 1);
  assert.ok(calculate({ ...base, mass: criticalMass * 0.999 }).utilization < 1);
  assert.ok(calculate({ ...base, mass: criticalMass * 1.001 }).utilization > 1);
});

test('skjuvningen kan styra och använder exakt 213 MPa som gräns', () => {
  const input = { ...base, a: 40, b: 1000, lever: 1 };
  // Två skjuvareor à 400 mm², så F=2*400*213 ger tau=213 MPa.
  const criticalMass = 2 * 400 * 213 / (2 * 9.82);
  const p = calculate({ ...input, mass: criticalMass });
  near(p.shearStress, 213);
  near(p.shearUtilization, 1);
  near(p.utilization, 1);
  assert.ok(p.totalUtilization < 1);
  assert.ok(calculate({ ...input, mass: criticalMass * 1.001 }).utilization > 1);
});

test('tomma, icke-numeriska, negativa och orimliga indata avvisas', () => {
  for (const field of ['mass', 't', 'a', 'b', 'lever']) {
    for (const value of [undefined, null, '', '10', 0, -1, NaN, Infinity, -Infinity]) {
      assert.throws(() => calculate({ ...base, [field]: value }), RangeError, `${field}: ${value}`);
    }
  }
  for (const factor of [null, '', '2', 0, 0.99, 10.01, NaN, Infinity]) {
    assert.throws(() => calculate({ ...base, factor }), RangeError);
  }
  for (const input of [undefined, null, 3, 'input', []]) {
    assert.throws(() => calculate(input), TypeError);
  }
  assert.throws(() => calculate({}), RangeError);
  assert.throws(() => calculate({ ...base, mass: 1000001 }), RangeError);
  assert.throws(() => calculate({ ...base, t: 20001 }), RangeError);
  assert.throws(() => calculate({ ...base, a: Number.MIN_VALUE, t: Number.MIN_VALUE }), RangeError);
});

test('kalkylatorn muterar inte indata och fungerar utan CommonJS i webbläsare', () => {
  assert.doesNotThrow(() => calculate(base));
  assert.ok(Object.isFrozen(constants));
  const context = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../c2.js'), 'utf8'), context);
  const p = context.C2Calculations.calculate(base);
  near(p.totalStress, 72.01333333333334);
  assert.deepEqual(Object.keys(context.C2Calculations).sort(), ['calculate', 'constants']);
});
