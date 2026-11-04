const { test } = require('node:test');
const assert = require('node:assert/strict');
const { constants, rectangle, cHook, bendingShear, cantileverLtb, ltb } = require('../calculations.js');
const near = (actual, expected, relative = 1e-10) => assert.ok(Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * relative, `${actual} != ${expected}`);

test('rektangulärt snitt och C-krokens snittkrafter stämmer med handvärden', () => {
  const s = rectangle(20, 100);
  near(s.area, 2000);
  near(s.I, 1666666.6666666667);
  near(s.W, 33333.333333333336);
  const p = cHook({ b: 20, h: 100, reach: 500, opening: 400, mass: 1000, factor: 2 });
  near(p.force, 9820);
  near(p.designForce, 19640);
  near(p.moment, 9820000);
  near(p.shear, 19640);
  near(p.axialForce, 19640);
  near(p.bendingStress, 294.6);
  near(p.normalStress, 9.82);
  near(p.backStress, 304.42);
  near(p.shearStress, 14.73);
  near(p.equivalentUpperBound, Math.sqrt(304.42 ** 2 + 3 * 14.73 ** 2));
  near(p.armEquivalentStress, 294.6);
  near(p.equivalentStress, 304.42);
  near(p.utilization, 304.42 / 355);
});

test('C-ramens höjd ändrar inte statiska snittspänningar i denna modell', () => {
  const input = { b: 40, h: 120, reach: 500, opening: 400, mass: 1000, factor: 2 };
  const a = cHook(input), b = cHook({ ...input, opening: 800 });
  near(a.backStress, b.backStress);
  near(a.shearStress, b.shearStress);
  const doubled = cHook({ ...input, mass: 2000 });
  near(doubled.backStress, a.backStress * 2);
  near(doubled.equivalentUpperBound, a.equivalentUpperBound * 2);
  assert.ok(!Object.hasOwn(a, 'deflection'));
});

test('fritt upplagd balk: handvärden för moment, skjuvning och nedböjning', () => {
  const p = bendingShear({ b: 20, h: 100, span: 2000, mass: 1000, factor: 2 });
  near(p.moment, 9820000);
  near(p.shear, 9820);
  near(p.bendingStress, 294.6);
  near(p.shearStress, 7.365);
  near(p.deflection, 4.6761904761904765);
  near(p.equivalentStress, 294.6);
});

test('rektangelns största von Mises-spänning söks vid kant eller neutralaxel', () => {
  // Kort, hög balk ger ett skjuvdominerat exempel; det är inte en
  // rekommendation att använda Euler–Bernoulli-nedböjning för en sådan balk.
  for (const span of [10, 2000]) {
    const p = bendingShear({ b: 20, h: 100, span, mass: 1000, factor: 2 });
    let scannedMax = 0;
    for (let i = 0; i <= 10000; i++) {
      const y = i / 10000;
      const vm = Math.hypot(p.bendingStress * y, Math.sqrt(3) * p.shearStress * (1 - y * y));
      scannedMax = Math.max(scannedMax, vm);
    }
    near(p.equivalentStress, scannedMax);
  }
});

test('säkerhetsfaktorn ändrar spänning men inte balkens brukslastnedböjning', () => {
  const input = { b: 20, h: 100, span: 2000, mass: 1000, factor: 2 };
  const a = bendingShear(input), b = bendingShear({ ...input, factor: 4 });
  near(b.bendingStress, a.bendingStress * 2);
  near(b.shearStress, a.shearStress * 2);
  near(b.deflection, a.deflection);
  near(bendingShear({ ...input, span: 4000 }).deflection, a.deflection * 8);
});

test('Mcr utan välvning överensstämmer med pi/L*sqrt(EIzGIt)', () => {
  const input = { length: 3000, Iz: 100, It: 10, Iw: 0 };
  const p = ltb(input);
  near(p.IzMm4, 1000000);
  near(p.ItMm4, 100000);
  near(p.IwMm6, 0);
  const expected = Math.PI / 3000 * Math.sqrt(210000 * 1000000 * (210000 / 2.6) * 100000);
  near(p.criticalMoment, expected);
  near(p.criticalMomentKNm, expected / 1e6);
  near(ltb({ ...input, length: 6000 }).criticalMoment, p.criticalMoment / 2);
  near(ltb({ ...input, Iz: 400 }).criticalMoment, p.criticalMoment * 2);
});

test('välvningsbidraget använder cm6→mm6 och höjer det kritiska momentet', () => {
  const base = { length: 3000, Iz: 100, It: 10, Iw: 10000 };
  const p = ltb(base);
  near(p.IwMm6, 1e10);
  near(p.warpingTerm, Math.PI ** 2 * 210000 * 1e10 / 3000 ** 2);
  assert.ok(p.criticalMoment > ltb({ ...base, Iw: 0 }).criticalMoment);
  near(constants.G, 80769.23076923077);
});

test('ogiltiga laster, dimensioner och sektionsdata avvisas', () => {
  const hook = { b: 20, h: 100, reach: 500, opening: 400, mass: 1000, factor: 2 };
  for (const change of [{ b: 0 }, { h: NaN }, { reach: 50 }, { opening: 100 }, { mass: 0 }, { factor: 0.5 }]) {
    assert.throws(() => cHook({ ...hook, ...change }), RangeError);
  }
  assert.throws(() => bendingShear({ ...hook, span: Infinity }), RangeError);
  assert.throws(() => bendingShear({ ...hook, span: 0 }), RangeError);
  const stability = { length: 3000, Iz: 100, It: 10, Iw: 0 };
  for (const change of [{ length: 0 }, { Iz: 0 }, { It: -1 }, { Iw: -1 }, { Iw: NaN }]) {
    assert.throws(() => ltb({ ...stability, ...change }), RangeError);
  }
  assert.throws(() => cantileverLtb({ length: 0, b: 20, h: 100 }), RangeError);
});

test('konsolens vippmoment använder rektangelns verkliga vridkonstant och sidotröghet', () => {
  const p = cantileverLtb({ length: 500, b: 20, h: 100 });
  near(p.Iz, 100 * 20 ** 3 / 12);
  const J = 100 * 20 ** 3 * (1 / 3 - 0.21 * 0.2 * (1 - 0.2 ** 4 / 12));
  near(p.It, J);
  near(p.criticalMoment, 4.013 / 500 * Math.sqrt(210000 * p.Iz * (210000 / 2.6) * J));
  near(p.criticalForce, p.criticalMoment / 500);
  near(cantileverLtb({ length: 1000, b: 20, h: 100 }).criticalMoment, p.criticalMoment / 2);
  near(cantileverLtb({ length: 1000, b: 20, h: 100 }).criticalForce, p.criticalForce / 4);
  const hook = cHook({ b: 20, h: 100, reach: 500, opening: 400, mass: 1000, factor: 2 });
  near(hook.armCriticalMoment, p.criticalMoment);
  near(hook.armStabilityRatio, hook.moment / p.criticalMoment);
});

test('koefficient 4,013 verifieras mot konsolens idealiserade vridningsekvation', () => {
  // Oberoende numerisk kontroll: theta'' + lambda²*s²*theta = 0,
  // theta(0)=1, theta'(0)=0 vid fria änden, theta(1)=0 vid inspänningen.
  // lambda = Pcr*L²/sqrt(E*Iz*G*It). RK4 och intervallhalvering.
  function rootValue(lambda) {
    const steps = 2000, ds = 1 / steps;
    let y = 1, v = 0;
    const derivative = (s, yy) => -(lambda ** 2) * s ** 2 * yy;
    for (let i = 0; i < steps; i++) {
      const s = i * ds;
      const a1 = v, b1 = derivative(s, y);
      const a2 = v + ds * b1 / 2, b2 = derivative(s + ds / 2, y + ds * a1 / 2);
      const a3 = v + ds * b2 / 2, b3 = derivative(s + ds / 2, y + ds * a2 / 2);
      const a4 = v + ds * b3, b4 = derivative(s + ds, y + ds * a3);
      y += ds * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
      v += ds * (b1 + 2 * b2 + 2 * b3 + b4) / 6;
    }
    return y;
  }
  let low = 3, high = 5;
  for (let i = 0; i < 45; i++) {
    const mid = (low + high) / 2;
    if (rootValue(mid) > 0) low = mid; else high = mid;
  }
  near((low + high) / 2, 4.013, 0.0002);
});
