const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { constants, calculate } = require('../c4.js');

const base = Object.freeze({ mass: 125, factor: 2, k: 25, t: 10, innerDiameter: 20 });
const near = (actual, expected, relative = 1e-10) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * relative,
  `${actual} != ${expected}`
);

test('C4 reproducerar underlagets handberäkning med oavrundade W och I', () => {
  const p = calculate(base);
  near(p.force, 2455);
  near(p.area, 250);
  near(p.lever, 22.5);
  near(p.W, 1041.6666666666667);
  near(p.I, 13020.833333333334);
  near(p.signedMoment, -55237.5);
  near(p.moment, 55237.5);
  near(p.signedStress, -53.028);
  near(p.bendingStress, 53.028);
  near(p.shearStress, 9.82);
  near(p.deflection, 0.003408942857142857);
  near(p.shearUtilization, 9.82 / 213);
  near(p.bendingUtilization, 53.028 / 355);
  near(p.utilization, p.bendingUtilization);
  near(constants.g, 9.82);
  near(constants.E, 210000);
  near(constants.allowableStress, 355);
  near(constants.allowableShear, 213);
  // Skissens ≈53,011 MPa använder avrundat W=1042 mm³.
  near(p.moment / 1042, 53.01103646833013);
});

test('massa och n skalar både spänningar och faktorerad nedböjning linjärt', () => {
  const p = calculate(base);
  const fields = ['force', 'signedMoment', 'moment', 'signedStress', 'bendingStress', 'shearStress', 'deflection', 'shearUtilization', 'bendingUtilization', 'utilization'];
  for (const changed of [{ mass: 250 }, { factor: 4 }]) {
    const doubled = calculate({ ...base, ...changed });
    for (const field of fields) near(doubled[field], 2 * p[field]);
    near(doubled.W, p.W);
    near(doubled.I, p.I);
  }
  const withoutFactor = { ...base };
  delete withoutFactor.factor;
  near(calculate(withoutFactor).force, p.force);
  near(calculate({ ...base, factor: 1 }).deflection, p.deflection / 2);
  near(calculate({ ...base, factor: 10 }).force, p.force * 5);
});

test('innerdiametern styr hävarmen och nedböjningen med korrekt potens', () => {
  const p = calculate(base);
  // d=65 ger L=(25+65)/2=45 mm, dvs dubbla ursprungliga hävarmen.
  const q = calculate({ ...base, innerDiameter: 65 });
  near(q.lever, 45);
  near(q.moment, p.moment * 2);
  near(q.bendingStress, p.bendingStress * 2);
  near(q.deflection, p.deflection * 8);
  near(q.shearStress, p.shearStress);
  near(q.W, p.W);
  near(q.I, p.I);
});

test('tjocklek och likformig geometrisk skalning ger oberoende samband', () => {
  const p = calculate(base);
  const thick = calculate({ ...base, t: 20 });
  near(thick.area, p.area * 2);
  near(thick.W, p.W * 2);
  near(thick.I, p.I * 2);
  for (const field of ['bendingStress', 'shearStress', 'deflection', 'utilization']) near(thick[field], p[field] / 2);
  const scaled = calculate({ ...base, k: 50, t: 20, innerDiameter: 40 });
  near(scaled.area, p.area * 4);
  near(scaled.W, p.W * 8);
  near(scaled.I, p.I * 16);
  near(scaled.bendingStress, p.bendingStress / 4);
  near(scaled.shearStress, p.shearStress / 4);
  near(scaled.deflection, p.deflection / 2);
});

test('böjgränsen u=1 och skjuvgränsen τ=213 MPa beräknas separat', () => {
  // Sigma = n*m*g*L*6/(t*k²), med L=22,5 mm.
  const criticalMass = 355 * 10 * 25 ** 2 / (2 * 9.82 * 22.5 * 6);
  const p = calculate({ ...base, mass: criticalMass });
  near(p.bendingStress, 355);
  near(p.bendingUtilization, 1);
  near(p.utilization, 1);
  assert.ok(p.shearUtilization < 1);
  assert.ok(calculate({ ...base, mass: criticalMass * 0.999 }).utilization < 1);
  assert.ok(calculate({ ...base, mass: criticalMass * 1.001 }).utilization > 1);
  const shearCriticalMass = 213 * 250 / (2 * 9.82);
  const q = calculate({ ...base, mass: shearCriticalMass });
  near(q.shearStress, 213);
  near(q.shearUtilization, 1);
  // Positiv diameter innebär L>k/2. Här styr böjningen redan innan
  // medelskjuvspänningen når sin gräns; ingen samverkansformel införs.
  assert.ok(q.bendingUtilization > 1);
  near(q.utilization, q.bendingUtilization);
});

test('ogiltiga laster, faktorer och dimensioner avvisas utan typkonvertering', () => {
  for (const field of ['mass', 'k', 't', 'innerDiameter']) {
    for (const value of [undefined, null, '', '10', 0, -1, NaN, Infinity, -Infinity]) {
      assert.throws(() => calculate({ ...base, [field]: value }), RangeError, `${field}: ${value}`);
    }
  }
  for (const factor of [null, '', '2', 0, 0.99, 10.01, NaN, Infinity]) {
    assert.throws(() => calculate({ ...base, factor }), RangeError);
  }
  for (const input of [undefined, null, 3, 'input', []]) assert.throws(() => calculate(input), TypeError);
  assert.throws(() => calculate({}), RangeError);
  assert.throws(() => calculate({ ...base, mass: 1000001 }), RangeError);
  for (const field of ['k', 't', 'innerDiameter']) assert.throws(() => calculate({ ...base, [field]: 20001 }), RangeError);
  assert.throws(() => calculate({ ...base, k: Number.MIN_VALUE, t: Number.MIN_VALUE }), RangeError);
});

test('C4 stöder webbläsarglobal och CommonJS och muterar inte indata', () => {
  assert.doesNotThrow(() => calculate(base));
  assert.ok(Object.isFrozen(constants));
  const context = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../c4.js'), 'utf8'), context);
  const p = context.C4Calculations.calculate(base);
  near(p.bendingStress, 53.028);
  near(p.deflection, 0.003408942857142857);
  assert.deepEqual(Object.keys(context.C4Calculations).sort(), ['calculate', 'constants']);
});
