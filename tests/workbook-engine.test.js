const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const engine = require('../workbook-engine.js');
const data = require('../workbook-data.js');
const near = (actual, expected, tolerance = 1e-10) => assert.ok(
  typeof actual === 'number' && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
  `${actual} ≠ ${expected}`
);
const result = (id, input) => engine.calculate(`wb-${id}`, input);

test('alla tio flikar och samtliga 129 formelceller återges mot Excels sparade resultat', () => {
  assert.equal(engine.models.length, 10);
  assert.deepEqual(engine.models.map(m => m.sheet).sort(), data.sheets.map(s => s.name).sort());
  let compared = 0;
  for (const model of engine.models) {
    const r = engine.calculate(model.id);
    const formulas = Object.entries(data.sheets.find(s => s.name === model.sheet).cells).filter(([, cell]) => cell.formula);
    assert.equal(r.rows.length, formulas.length, model.sheet);
    for (const [address, source] of formulas) {
      const row = r.rows.find(row => row.cell === address);
      assert.ok(row, `${model.sheet}!${address} saknas i spårningen`);
      assert.equal(row.formula, source.formula);
      if (typeof source.cached === 'number') near(r.cells[address], source.cached);
      else assert.equal(r.cells[address], source.cached);
      compared++;
    }
    for (const check of r.checks) {
      assert.ok(Number.isFinite(check.value), `${model.id}: ${check.label}`);
      assert.ok(Number.isFinite(check.limit) && check.limit > 0);
      assert.equal(typeof check.pass, 'boolean');
    }
  }
  assert.equal(compared, 129);
});

test('profilbladets 204 formelomräkningar Wx cm³ till mm³ stämmer', () => {
  assert.equal(data.profiles.length, 204);
  for (const p of data.profiles) {
    near(p.W, p.wxCm3 * 1000);
    near(p.W, p.columns.D); // Excel's independently saved formula result.
  }
  const p = data.profiles.find(p => p.name === '40x40x4');
  near(p.W, 5910);
  near(p.Ix, 118000);
  near(p.Kv, 195000);
});

test('L1 och C1 har en respektive två skjuvareor med nmg och τtill = 213 MPa', () => {
  const l = result('l1', { E24: 400, E25: 25, E26: 10, E27: 2 });
  const c = result('c1', { E27: 400, E28: 25, E29: 10, E30: 2 });
  near(l.cells.E30, 31.424);
  near(c.cells.E33, 15.712);
  near(l.cells.E31, 31.424 / 213 * 100);
  near(c.cells.E34, 15.712 / 213 * 100);
  assert.ok(l.checks.every(c => c.pass));
  assert.ok(!result('c1').checks[0].pass);
});

test('KB5: handvärden och n påverkar hållfasthet men inte brukslastens deformation', () => {
  const p = result('kb5', { E28: 1000, E29: 2000, E30: '100x100x6', E34: 2 });
  const section = data.profiles.find(p => p.name === '100x100x6');
  near(p.cells.E37, 1000 * 9.82 * 2 * 2000 / (4 * section.W));
  near(p.cells.E39, 1000 * 9.82 * 2000 ** 3 / (48 * 210000 * section.Ix));
  near(p.cells.E40, 10);
  const increasedN = result('kb5', { ...p.input, E34: 4 });
  near(increasedN.cells.E37, p.cells.E37 * 2);
  near(increasedN.cells.E39, p.cells.E39);
  const increasedMass = result('kb5', { ...p.input, E28: 2000 });
  near(increasedMass.cells.E37, p.cells.E37 * 2);
  near(increasedMass.cells.E39, p.cells.E39 * 2);
});

test('KB6 har symmetri kring mittpunkten och sammanfaller med KB5 vid a = L/2', () => {
  const common = { E27: 500, E28: 1200, E30: '80x40x4', E34: 2 };
  const a = result('kb6', { ...common, E29: 300 });
  const b = result('kb6', { ...common, E29: 900 });
  for (const cell of ['E37', 'E38', 'E39', 'E40', 'E41', 'E42']) near(a.cells[cell], b.cells[cell]);
  near(a.cells.E37, 500 * 9.82 * 2 * 300 * 900 / 1200);
  assert.equal(a.rows.find(row => row.cell === 'E37').unit, 'Nmm');
  const mid = result('kb6', { ...common, E29: 600 });
  const kb5 = result('kb5', { E28: 500, E29: 1200, E30: '80x40x4', E34: 2 });
  near(mid.cells.E38, kb5.cells.E37);
  near(mid.cells.E41, kb5.cells.E39);
  assert.equal(mid.input.E27, 500);
  assert.equal(mid.cells.E27, 500);
});

test('KB2 konsolformler har fyra gånger böjspänning och sexton gånger f för samma balk', () => {
  const input = { E28: 750, E29: 1000, E30: '80x80x4', E34: 2 };
  const cantilever = result('kb2', input), centre = result('kb5', input);
  near(cantilever.cells.E37, centre.cells.E37 * 4);
  near(cantilever.cells.E39, centre.cells.E39 * 16);
  const higherN = result('kb2', { ...input, E34: 3 });
  near(higherN.cells.E37, cantilever.cells.E37 * 1.5);
  near(higherN.cells.E39, cantilever.cells.E39);
  assert.ok(cantilever.warnings.some(w => /rubrik.*KB5/.test(w)));
});

test('H-ok tvärbalkar bär halva vikten och båda balktyper får separata f-gränser', () => {
  const r = result('h-ok', { E27: 2000, E28: 1000, E29: '100x100x6', E31: 1000, E32: '100x100x6', E38: 2 });
  near(r.cells.E45, r.cells.E41 / 2);
  near(r.cells.E47, r.cells.E43 / 2);
  near(r.cells.E44, 5); near(r.cells.E48, 5);
  assert.equal(r.checks.length, 4);
  const longerCrossbeam = result('h-ok', { ...r.input, E31: 2000 });
  near(longerCrossbeam.cells.E45, r.cells.E45 * 2);
  near(longerCrossbeam.cells.E47, r.cells.E47 * 8);
  near(longerCrossbeam.cells.E41, r.cells.E41);
  near(longerCrossbeam.cells.E43, r.cells.E43);
  assert.ok(r.warnings.some(w => /Bildformeln.*1\/2.*E47/.test(w)));
  assert.ok(r.warnings.some(w => /L\/200.*deformationsgräns/.test(w)));
});

test('knäcktabellen väljer strikt nästa rad och extrapolerar aldrig över λ = 190', () => {
  const values = [0, 19.9, 20, 24.99, 25, 29.99, 30, 189.999];
  const expected = [20, 20, 25, 25, 30, 30, 37, 190];
  values.forEach((lambda, i) => assert.equal(engine.nextBuckling(lambda).lambda, expected[i]));
  assert.equal(engine.nextBuckling(0, 8).lambda, 25);
  assert.equal(engine.nextBuckling(20, 8).stress, 220);
  assert.throws(() => engine.nextBuckling(190), /utanför.*knäcktabell/);
  assert.throws(() => engine.nextBuckling(1000), /utanför.*knäcktabell/);
});

test('Ramok använder /3, kättingvinkel mot horisontalen och olika tabellstarter för sidorna', () => {
  const r = result('ramok', { E31: 3000, E32: 100, E33: 100, E34: '60x60x3,2', E36: 30, E40: 2 });
  near(r.cells.E44, 3000 * 9.82 * 2 / 3);
  near(r.cells.E47, r.cells.E44 * 2);
  near(r.cells.E48, r.cells.E44 * Math.sqrt(3));
  near(r.cells.E49, r.cells.E48 / Math.sqrt(2));
  near(r.cells.E49, r.cells.E50);
  assert.equal(r.cells.E59, 20);
  assert.equal(r.cells.E60, 25);
  assert.equal(r.cells.E61, 225);
  assert.equal(r.cells.E62, 220);
  const gamma = result('ramok', { ...r.input, E54: 2 });
  near(gamma.cells.E55, r.cells.E55 * 2);
  near(gamma.cells.E56, r.cells.E56 * 2);
  near(gamma.cells.E57, r.cells.E57 * 2);
  near(gamma.cells.E58, r.cells.E58 * 2);
  near(gamma.cells.E51, r.cells.E51);
  assert.ok(r.rows.find(row => row.cell === 'E64').label.includes('sida 2'));
});

test('Spridarok last, vinkel och knäcklängdsfaktor påverkar olika delar av beräkningen', () => {
  const r = result('spridarok');
  const doubled = result('spridarok', { E27: r.input.E27 * 2 });
  near(doubled.cells.E38, r.cells.E38 * 2);
  near(doubled.cells.E39, r.cells.E39 * 2);
  near(doubled.cells.E46, r.cells.E46 * 2);
  near(doubled.cells.E43, r.cells.E43);
  const shallow = result('spridarok', { E31: 30 });
  near(shallow.cells.E38, r.cells.E38 * Math.sqrt(3));
  const longer = result('spridarok', { E41: 2 });
  near(longer.cells.E43, r.cells.E43 * 2);
  assert.ok(longer.cells.E45 < r.cells.E45);
  assert.throws(() => result('spridarok', { E28: 100000 }), /utanför.*knäcktabell/);
});

test('Semispridarok bevarar ifrågasatt 1,75 och 0,9 samt visar källvarningar', () => {
  const r = result('semispridarok');
  const table = data.buckling.find(row => row.lambda === r.cells.E45);
  near(r.cells.E46, table.stress * 1.75);
  near(r.cells.E51, 0.9 * r.cells.E50 + r.cells.E47);
  assert.ok(r.cells.E51 > 100);
  assert.equal(r.checks.at(-1).pass, false);
  assert.ok(r.warnings.some(w => /G46.*1,75/.test(w)));
  assert.ok(r.warnings.some(w => /0,9/.test(w)));
  const zeroOutstand = result('semispridarok', { E29: 0 });
  near(zeroOutstand.cells.E48, 0); near(zeroOutstand.cells.E50, 0);
  near(zeroOutstand.cells.E51, zeroOutstand.cells.E47);
  const longer = result('semispridarok', { E29: 600 });
  near(longer.cells.E48, r.cells.E48 * 2);
  near(longer.cells.E47, r.cells.E47);
  const lowSlenderness = result('semispridarok', { E42: 0.1 });
  near(lowSlenderness.cells.E46, 393.75);
  assert.ok(lowSlenderness.warnings.some(w => /överstiger 355 MPa/.test(w)));
});

test('C-krok återger alla formelavvikelser synligt, inklusive trasigt oanvänt E140', () => {
  const r = result('c-hook');
  assert.equal(r.cells.E140, '#N/A');
  near(r.cells.E92, r.input.E22 * 9.82 * r.input.E33 * r.input.E23 / r.cells.E28);
  near(r.cells.E83, r.cells.E70 / r.cells.E68);
  near(r.cells.E70, r.input.E23 / 200);
  near(r.cells.E121, r.input.E25 / 200);
  near(r.cells.E146, r.cells.E143 + r.cells.E144 + r.cells.E142 + r.cells.E145);
  near(r.cells.E98, Math.PI * Math.sqrt(210000 * r.cells.E30 * 80000 * r.cells.E31) / (r.input.E23 + r.input.E24));
  const combined = r.warnings.join('\n');
  for (const text of ['E92', 'E143', 'Mcr', '#REF!', 'extern arbetsbok', 'E70']) assert.ok(combined.includes(text), text);
  const changedN = result('c-hook', { E33: 4 });
  near(changedN.cells.E67, r.cells.E67 * 2);
  near(changedN.cells.E69, r.cells.E69);
  near(changedN.cells.E146, r.cells.E146);
  near(changedN.cells.E98, r.cells.E98);
  const changedVip = result('c-hook', { E34: 5.6 });
  near(changedVip.cells.E99, r.cells.E99 * 2);
  near(changedVip.cells.E66, r.cells.E66);
  const unequal = result('c-hook', { E25: 370 });
  near(unequal.cells.E117, r.cells.E117 * 2);
  near(unequal.cells.E120, r.cells.E120 * 8);
  assert.ok(unequal.warnings.some(w => /inte i momentjämvikt/.test(w)));
});

test('rektangulär knäckprofil flaggar utebliven svagaxel; HEA-area och saknade data avvisas', () => {
  const rectangular = result('spridarok', { E29: '100x50x6' });
  assert.ok(rectangular.warnings.some(w => /Svagaxelknäckning saknas/.test(w)));
  assert.throws(() => result('spridarok', { E29: 'HE 100 A' }), /HEA.*area.*enhet/);
  assert.throws(() => result('ramok', { E34: 'HE 100 A' }), /HEA.*area.*enhet/);
  assert.throws(() => result('c-hook', { E26: 'HE 100 A' }), /saknar|area/);
  assert.throws(() => result('spridarok', { E29: '400x200x8' }), /saknar.*A/);
  assert.throws(() => result('c-hook', { E26: '400x200x8' }), /saknar.*Iy/);
  const bending = result('kb5', { E30: 'HE 100 A' });
  near(bending.cells.E32, 73000);
  near(bending.cells.E33, 3490000);
  assert.ok(bending.warnings.length > 0);
  assert.doesNotThrow(() => result('kb5', { E30: '400x200x8' }));
});

test('samtliga tabellprofiler fungerar i böjning när bara Wx och Ix krävs', () => {
  for (const profile of data.profiles) {
    const r = result('kb5', { E30: profile.name });
    near(r.cells.E32, profile.W);
    near(r.cells.E33, profile.Ix);
    assert.equal(r.cells.E31, profile.index);
    assert.ok(Number.isFinite(r.cells.E37));
    assert.ok(Number.isFinite(r.cells.E39));
  }
});

test('numeriska fält avvisar feltyper, tomma värden och värden utanför tillåtna gränser', () => {
  for (const model of engine.models) {
    for (const field of model.fields) {
      if (field.type === 'profile') {
        for (const invalid of ['', 'okänd', null, 0, undefined]) assert.throws(() => engine.calculate(model.id, { [field.name]: invalid }), RangeError);
      } else {
        for (const invalid of [undefined, null, '', '2', NaN, Infinity, -Infinity, -1, field.max * 2]) {
          assert.throws(() => engine.calculate(model.id, { [field.name]: invalid }), RangeError, `${model.id}!${field.name}=${invalid}`);
        }
      }
    }
    for (const input of [null, false, 2, 'sträng', []]) assert.throws(() => engine.calculate(model.id, input), TypeError);
  }
  for (const E29 of [0, 962, 1000]) assert.throws(() => result('kb6', { E29 }), /måste|strikt/);
  for (const E31 of [0, 90, 180]) assert.throws(() => result('spridarok', { E31 }), RangeError);
  assert.throws(() => engine.calculate('saknas'), /Okänt/);
});

test('webbläsarglobal fungerar utan bibliotek, eval eller muterade indata', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../workbook-data.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(require.resolve('../workbook-engine.js'), 'utf8'), context);
  const input = Object.freeze({ E24: 400, E25: 25, E26: 10, E27: 2 });
  const r = context.WorkbookEngine.calculate('wb-l1', input);
  near(r.cells.E30, result('l1', input).cells.E30);
  const d = engine.defaults('wb-kb5');
  d.E28 = 1;
  assert.equal(engine.defaults('wb-kb5').E28, 400);
  const raw = fs.readFileSync(require.resolve('../workbook-engine.js'), 'utf8');
  assert.ok(!/\beval\s*\(|new Function\s*\(/.test(raw));
});
