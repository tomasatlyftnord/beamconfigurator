const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Beam = require('../beam.js');
const AsymmetricBeam = require('../asymmetric-beam.js');
const { constants, profiles, validate, loadCase, evaluate, calculate } = AsymmetricBeam;

const base = Object.freeze({ span: 2000, mass: 1000, factor: 2, liftPosition: 500 });
const simpleProfile = Object.freeze({ name: 'Handsnitt', I: 1000000, W: 10000, mass: 12 });
const near = (actual, expected, relative = 1e-10) => assert.ok(
  Math.abs(actual - expected) <= Math.max(1, Math.abs(expected)) * relative,
  `${actual} != ${expected}`
);

test('centrerat lyft återger Beam för samtliga tabellprofiler', () => {
  assert.equal(constants, Beam.constants);
  assert.equal(profiles, Beam.profiles);
  const input = { ...base, liftPosition: 1000 };
  const centered = Beam.calculate(input), asymmetric = calculate(input);
  assert.equal(asymmetric.chosen.name, centered.chosen.name);
  assert.equal(asymmetric.rows.length, centered.rows.length);
  near(asymmetric.loadMoment, centered.loadMoment);
  near(asymmetric.loadRequiredW, centered.loadRequiredW);
  for (let i = 0; i < centered.rows.length; i++) {
    const p = asymmetric.rows[i], q = centered.rows[i];
    assert.equal(p.name, q.name);
    assert.equal(p.mass, q.mass);
    assert.equal(p.I, q.I);
    assert.equal(p.W, q.W);
    for (const field of ['force', 'moment', 'capacity', 'stress', 'requiredW', 'utilization', 'deflection']) near(p[field], q[field]);
    near(p.deflectionAtLift, q.deflection);
    near(p.xMaxDeflection, 1000);
  }
});

test('asymmetriskt handfall delar lasten 750/250 kg och ger 7,365 kNm', () => {
  const p = evaluate(simpleProfile, base);
  near(p.totalMass, 1000);
  near(p.mass, 12); // Profilens tabellvikt behålls i kg/m.
  near(p.force, 9820);
  near(p.leftMass, 750);
  near(p.rightMass, 250);
  near(p.leftForce, 7365);
  near(p.rightForce, 2455);
  near(p.leftLength, 500);
  near(p.rightLength, 1500);
  near(p.moment, 7365000);
  near(p.capacity, 3550000);
  near(p.requiredW, 7365000 / 355);
  near(p.stress, 736.5);
  near(p.utilization, 736.5 / 355);
  near(p.deflectionAtLift, 4.383928571428571);
  assert.ok(p.deflection > p.deflectionAtLift);
  assert.ok(p.xMaxDeflection > p.leftLength);
});

test('kordrelativ deformation bekräftas av oberoende numerisk krökningsintegration', () => {
  const p = evaluate(simpleProfile, base);
  // Integrera y''=M/(EI) utan inbyggda randvillkor och dra därefter bort
  // den räta linjen mellan ändarnas deformationer. Därmed fås kordan.
  const steps = 20000, dx = 2000 / steps;
  const curvature = x => -(x <= 500 ? 7365 * x : 2455 * (2000 - x)) / (210000 * 1000000);
  const raw = [0];
  let y = 0, slope = 0;
  for (let i = 1; i <= steps; i++) {
    const x = i * dx;
    const nextSlope = slope + (curvature(x - dx) + curvature(x)) * dx / 2;
    y += (slope + nextSlope) * dx / 2;
    raw.push(y);
    slope = nextSlope;
  }
  let max = 0, xMax = 0;
  for (let i = 0; i <= steps; i++) {
    const chordDeflection = raw[i] - (i / steps) * raw[steps];
    if (chordDeflection > max) { max = chordDeflection; xMax = i * dx; }
  }
  near(p.deflection, max, 1e-8);
  near(p.deflectionAtLift, raw[5000] - raw[steps] / 4, 1e-8);
  assert.ok(Math.abs(p.xMaxDeflection - xMax) <= dx);
});

test('speglad lyftpunkt speglar laster och deformationsläge', () => {
  for (const a of [1, 100, 500, 1000, 1500, 1999]) {
    const p = evaluate(simpleProfile, { ...base, liftPosition: a });
    const q = evaluate(simpleProfile, { ...base, liftPosition: 2000 - a });
    for (const field of ['moment', 'stress', 'utilization', 'deflection', 'deflectionAtLift']) near(p[field], q[field]);
    near(p.leftForce, q.rightForce);
    near(p.leftMass, q.rightMass);
    near(p.xMaxDeflection + q.xMaxDeflection, 2000);
  }
});

test('lastfördelningen uppfyller kraft- och momentjämvikt', () => {
  for (const liftPosition of [1, 125, 500, 1000, 1777, 1999]) {
    const p = loadCase({ ...base, liftPosition });
    near(p.leftForce + p.rightForce, p.force);
    near(p.leftMass + p.rightMass, 1000);
    near(p.leftForce * p.leftLength, p.rightForce * p.rightLength);
    near(p.moment, p.factor * p.leftForce * p.leftLength);
    near(p.moment, p.factor * p.rightForce * p.rightLength);
  }
});

test('massa, säkerhetsfaktor och likformig längdskalning följer respektive samband', () => {
  const p = evaluate(simpleProfile, base);
  const mass = evaluate(simpleProfile, { ...base, mass: 2000 });
  for (const field of ['force', 'moment', 'stress', 'utilization', 'deflection', 'deflectionAtLift']) near(mass[field], p[field] * 2);
  const factor = evaluate(simpleProfile, { ...base, factor: 4 });
  near(factor.stress, p.stress * 2);
  near(factor.deflection, p.deflection);
  near(factor.deflectionAtLift, p.deflectionAtLift);
  const length = evaluate(simpleProfile, { ...base, span: 4000, liftPosition: 1000 });
  near(length.moment, p.moment * 2);
  near(length.deflection, p.deflection * 8);
  near(length.deflectionAtLift, p.deflectionAtLift * 8);
  near(length.xMaxDeflection, p.xMaxDeflection * 2);
});

test('profilvalet har minsta godtagbara W och tabellvikten avgör lika W', () => {
  const names = profiles.map(p => p.name);
  const result = calculate(base);
  assert.equal(result.rows.length, profiles.length);
  assert.ok(result.chosen);
  assert.ok(result.chosen.utilization <= 1);
  assert.ok(result.rows.every(p => p.W >= result.chosen.W || p.utilization > 1));
  for (let i = 1; i < result.rows.length; i++) {
    const p = result.rows[i - 1], q = result.rows[i];
    assert.ok(p.W < q.W || p.W === q.W && p.mass <= q.mass);
  }
  assert.deepEqual(profiles.map(p => p.name), names);
  const huge = calculate({ ...base, mass: 1000000, span: 20000, liftPosition: 10000 });
  assert.equal(huge.chosen, null);
  assert.ok(huge.rows.every(p => Object.values(p).filter(value => typeof value === 'number').every(Number.isFinite)));
});

test('ogiltiga indata och lyftpunkt i eller utanför ändarna avvisas', () => {
  for (const change of [
    { span: 99 }, { span: 20001 }, { span: NaN }, { mass: 0 }, { mass: 1000001 },
    { mass: '1000' }, { factor: undefined }, { factor: 0.99 }, { factor: 10.01 },
    { liftPosition: 0 }, { liftPosition: -1 }, { liftPosition: 2000 }, { liftPosition: 2001 },
    { liftPosition: undefined }, { liftPosition: null }, { liftPosition: '' }, { liftPosition: '500' },
    { liftPosition: NaN }, { liftPosition: Infinity }
  ]) {
    assert.throws(() => validate({ ...base, ...change }), RangeError);
    assert.throws(() => calculate({ ...base, ...change }), RangeError);
    assert.throws(() => evaluate(simpleProfile, { ...base, ...change }), RangeError);
  }
  for (const input of [undefined, null, [], 'input', 2]) assert.throws(() => validate(input), TypeError);
  assert.throws(() => evaluate({ ...simpleProfile, I: 0 }, base), RangeError);
  assert.throws(() => evaluate({ ...simpleProfile, W: NaN }, base), RangeError);
  assert.throws(() => evaluate({ ...simpleProfile, mass: -1 }, base), RangeError);
  assert.throws(() => evaluate(simpleProfile, { ...base, liftPosition: Number.MIN_VALUE }), RangeError);
});

test('beräkningen muterar inte indata och stöder webbläsare med befintlig Beam', () => {
  assert.doesNotThrow(() => evaluate(simpleProfile, base));
  const context = {};
  for (const file of ['../profiles.js', '../beam.js', '../asymmetric-beam.js']) {
    vm.runInNewContext(fs.readFileSync(require.resolve(file), 'utf8'), context);
  }
  assert.equal(context.AsymmetricBeam.constants, context.Beam.constants);
  assert.equal(context.AsymmetricBeam.profiles, context.Beam.profiles);
  near(context.AsymmetricBeam.evaluate(simpleProfile, base).moment, 7365000);
  assert.throws(() => vm.runInNewContext(fs.readFileSync(require.resolve('../asymmetric-beam.js'), 'utf8'), {}), /beam\.js/);
});
