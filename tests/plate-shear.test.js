const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { constants, c1, l1 } = require('../plate-shear.js');

const base = Object.freeze({ mass: 400, factor: 2, k: 25, t: 10 });
const near = (actual, expected, relative = 1e-10) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * relative,
  `${actual} != ${expected}`
);

test('C1 har två lika belastade skjuvplan enligt handvärden', () => {
  const p = c1(base);
  near(p.mass, 400);
  near(p.factor, 2);
  near(p.k, 25);
  near(p.t, 10);
  near(p.force, 7856);
  near(p.areaPerPlane, 250);
  near(p.totalShearArea, 500);
  near(p.planes, 2);
  near(p.forcePerPlane, 3928);
  near(p.shearStress, 15.712);
  near(p.utilization, 15.712 / 213);
  near(constants.g, 9.82);
  near(constants.allowableStress, 355);
  near(constants.allowableShear, 213);
});

test('L1 har ett skjuvplan och dubbla C1-spänningen för samma indata', () => {
  const p = l1(base), q = c1(base);
  near(p.force, 7856);
  near(p.areaPerPlane, 250);
  near(p.totalShearArea, 250);
  near(p.planes, 1);
  near(p.forcePerPlane, 7856);
  near(p.shearStress, 31.424);
  near(p.utilization, 31.424 / 213);
  near(p.shearStress, q.shearStress * 2);
  near(p.utilization, q.utilization * 2);
});

test('massa och n skalar last, skjuvspänning och utnyttjande linjärt', () => {
  for (const calculate of [c1, l1]) {
    const p = calculate(base);
    for (const changed of [{ mass: 800 }, { factor: 4 }]) {
      const doubled = calculate({ ...base, ...changed });
      for (const field of ['force', 'forcePerPlane', 'shearStress', 'utilization']) near(doubled[field], p[field] * 2);
      near(doubled.areaPerPlane, p.areaPerPlane);
      near(doubled.totalShearArea, p.totalShearArea);
    }
    const withoutFactor = { ...base };
    delete withoutFactor.factor;
    near(calculate(withoutFactor).force, p.force);
    near(calculate({ ...base, factor: 1 }).force, p.force / 2);
    near(calculate({ ...base, factor: 10 }).force, p.force * 5);
  }
});

test('k och t påverkar enbart skjuvarean och dess inversa spänningsberoende', () => {
  for (const calculate of [c1, l1]) {
    const p = calculate(base);
    for (const changed of [{ k: 50 }, { t: 20 }]) {
      const doubled = calculate({ ...base, ...changed });
      near(doubled.force, p.force);
      near(doubled.areaPerPlane, p.areaPerPlane * 2);
      near(doubled.totalShearArea, p.totalShearArea * 2);
      near(doubled.shearStress, p.shearStress / 2);
      near(doubled.utilization, p.utilization / 2);
    }
    near(calculate({ ...base, k: 50, t: 20 }).shearStress, p.shearStress / 4);
  }
});

test('båda modellerna passerar u=1 vid sina analytiska gränslaster', () => {
  for (const [calculate, planes] of [[c1, 2], [l1, 1]]) {
    const criticalMass = 213 * planes * 25 * 10 / (2 * 9.82);
    const p = calculate({ ...base, mass: criticalMass });
    near(p.shearStress, 213);
    near(p.utilization, 1);
    assert.ok(calculate({ ...base, mass: criticalMass * 0.999 }).utilization < 1);
    assert.ok(calculate({ ...base, mass: criticalMass * 1.001 }).utilization > 1);
  }
});

test('antalet skjuvplan är fast i respektive modell och styrs inte av indata', () => {
  for (const planes of [0, 1, 2, 3, 100, NaN, null]) {
    near(c1({ ...base, planes }).planes, 2);
    near(l1({ ...base, planes }).planes, 1);
  }
});

test('tomma, feltypade, icke-ändliga och orimliga indata avvisas', () => {
  for (const calculate of [c1, l1]) {
    for (const field of ['mass', 'k', 't']) {
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
    assert.throws(() => calculate({ ...base, k: 20001 }), RangeError);
    assert.throws(() => calculate({ ...base, t: 20001 }), RangeError);
    assert.throws(() => calculate({ ...base, k: Number.MIN_VALUE, t: Number.MIN_VALUE }), RangeError);
    assert.throws(() => calculate({ ...base, mass: Number.MIN_VALUE }), RangeError);
  }
});

test('webbläsarglobal och CommonJS ger samma beräkning utan att mutera indata', () => {
  assert.doesNotThrow(() => c1(base));
  assert.doesNotThrow(() => l1(base));
  assert.ok(Object.isFrozen(constants));
  const context = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../plate-shear.js'), 'utf8'), context);
  near(context.PlateShearCalculations.c1(base).shearStress, 15.712);
  near(context.PlateShearCalculations.l1(base).shearStress, 31.424);
  assert.deepEqual(Object.keys(context.PlateShearCalculations).sort(), ['c1', 'constants', 'l1']);
});
