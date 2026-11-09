const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../workbook-engine.js');
const data = require('../workbook-data.js');
const report = require('../workbook-report.js');
const escaped = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = value => value.toLocaleString('sv-SE', { maximumFractionDigits: 6, minimumFractionDigits: 0 });

test('alla tio rapporter redovisar varje formelcell och varje aktuellt beräkningsresultat', () => {
  assert.equal(engine.models.length, 10);
  for (const model of engine.models) {
    const input = engine.defaults(model.id);
    const result = engine.calculate(model.id, input);
    const html = report.render(model.id, input);
    assert.ok(html.includes(escaped(model.sheet)), model.id);
    assert.ok(html.includes(escaped(data.source.fileName)), model.id);
    assert.ok(html.includes(data.source.sha256), model.id);
    assert.ok(html.includes('UNDERLAG FÖR GRANSKNING · ARBETSBOK 0.1'), model.id);
    assert.equal((html.match(/data-cell="/g) || []).length, result.rows.length, model.id);
    for (const row of result.rows) {
      assert.ok(html.includes(`data-cell="${row.cell}"`), `${model.id}!${row.cell}`);
      assert.ok(html.includes(escaped(row.formula)), `${model.id}!${row.cell}: källformel`);
      assert.ok(html.includes(typeof row.value === 'number' ? `<mn>${number(row.value)}</mn>` : escaped(row.value)), `${model.id}!${row.cell}: värde`);
    }
    for (const field of model.fields) assert.ok(html.includes(`${escaped(field.label)} · ${field.name}`), field.label);
    for (const check of result.checks) assert.ok(html.includes(escaped(check.label)), check.label);
    for (const warning of result.warnings) assert.ok(html.includes(escaped(warning)), warning);
    for (const profile of result.profiles) assert.ok(html.includes(escaped(profile.name)), profile.name);
  }
});

test('aritmetiken sätts som MathML med bråk, rötter, potenser och rätt enheter', () => {
  const kb5 = report.render('wb-kb5', engine.defaults('wb-kb5'));
  assert.ok(kb5.includes('<mfrac>'));
  assert.ok(kb5.includes('<msup>'));
  assert.ok(kb5.includes('<msub><mi>W</mi><mtext>x</mtext></msub>'));
  assert.ok(kb5.includes('<mi>σ</mi>'));
  assert.ok(kb5.includes('<mi>n</mi>'));
  assert.ok(kb5.includes('<mi>f</mi>'));
  const kb6 = report.render('wb-kb6', engine.defaults('wb-kb6'));
  assert.ok(kb6.includes('<msqrt>'));
  assert.ok(kb6.includes('<mtext> Nmm</mtext>'));
  assert.ok(kb6.includes('korrigerade enheten Nmm'));
  assert.ok(!kb6.includes('<script'));
});

test('rapporten räknar om redigerade indata och kallar KB6-massans originalformel för exempel', () => {
  const first = report.render('wb-l1', engine.defaults('wb-l1'));
  const changed = report.render('wb-l1', { ...engine.defaults('wb-l1'), E24: 25000 });
  assert.ok(first.includes('<mn>204,583333</mn>'));
  assert.ok(changed.includes('<mn>409,166667</mn>'));
  assert.ok(!changed.includes('<mn>204,583333</mn>'));
  const kb6 = report.render('wb-kb6', { ...engine.defaults('wb-kb6'), E27: 1000 });
  assert.ok(kb6.includes('Redigerbart indatavärde. Ursprungligt exempel i arbetsboken:'));
  assert.ok(kb6.includes('<code>=10000/3*2</code>'));
  assert.ok(kb6.includes('<mi>m</mi><mo>=</mo><mn>1 000</mn>'));
});

test('osäkra modeller ger inget grönt godkännande och samtliga granskningsanmärkningar följer med', () => {
  for (const model of engine.models) {
    const input = engine.defaults(model.id), result = engine.calculate(model.id, input);
    const html = report.render(model.id, input);
    assert.ok(!html.includes('report-pass'), model.id);
    assert.ok(!html.includes('Godkänd'), model.id);
    assert.ok(html.includes('inget godkännande av lyftredskapet'), model.id);
    assert.ok(html.includes('styrker inte uppfyllelse av SS-EN 13155'), model.id);
    assert.ok(html.includes(`Underlaget har ${result.warnings.length} granskningsanmärkningar`), model.id);
  }
  const hook = report.render('wb-c-hook', engine.defaults('wb-c-hook'));
  assert.ok(hook.includes('data-cell="E140"'));
  assert.ok(hook.includes('#N/A'));
  assert.ok(hook.includes('Bruten källreferens'));
  assert.ok(hook.includes('Total utböjning enligt mallen – ej verifierad'));
  const semi = report.render('wb-semispridarok', engine.defaults('wb-semispridarok'));
  assert.ok(semi.includes('1,75'));
  assert.ok(semi.includes('Minst ett av underlagets gränsvärden överskrids'));
});

test('referens escapes och rapporten använder endast neutral sidnumrering utan datum eller länkar', () => {
  const html = report.render('wb-kb5', engine.defaults('wb-kb5'), '<img src=x onerror="alert(1)">&\'');
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('Beamconfigurator'));
  assert.ok(!html.includes('Datum:'));
  assert.ok(!html.includes('<a '));
  const pages = (html.match(/class="report-page"/g) || []).length;
  assert.ok(pages >= 2);
  for (let page = 1; page <= pages; page++) assert.ok(html.includes(`BERÄKNINGSUNDERLAG · ${page}/${pages}`));
});

test('diagrammen skiljer geometrierna och validerar aktuella indata', () => {
  const labels = ['Ett skjuvplan', 'Två lika skjuvplan', 'centrerad punktlast', 'osymmetriskt placerad punktlast', 'H-ok', 'Ramok', 'C-krok av profiler', 'Konsolbalk', 'Spridarok', 'Semispridarok'];
  for (const [index, model] of engine.models.entries()) {
    const svg = report.diagram(model.id, engine.defaults(model.id));
    assert.ok(svg.includes(labels[index]), model.id);
    assert.ok(svg.includes('schematisk, inte skalenlig'), model.id);
    const massCell = model.fields.find(field => field.unit === 'kg').name;
    assert.throws(() => report.diagram(model.id, { ...engine.defaults(model.id), [massCell]: NaN }));
    assert.throws(() => report.render(model.id, { ...engine.defaults(model.id), [massCell]: 0 }));
  }
  for (const id of ['', 'wb-unknown', '__proto__', null]) {
    assert.throws(() => report.render(id, {}), RangeError);
    assert.throws(() => report.diagram(id, {}), RangeError);
  }
});

test('MathML visar explicita parenteser kring differenser och funktioners argument', () => {
  const html = report.render('wb-kb6', engine.defaults('wb-kb6'));
  assert.ok(!html.includes('<mfenced'));
  assert.ok(html.includes('<mo fence="true">(</mo>'));
  assert.ok(html.includes('<mo fence="true">)</mo>'));
  const deflectionTrace = html.split('data-cell="E41"')[1].split('</div>')[0];
  assert.ok(deflectionTrace.includes('<msup>'));
  assert.ok(deflectionTrace.includes('<mo>−</mo>'));
  assert.ok(deflectionTrace.includes('<mo fence="true">(</mo>'));
  assert.ok(deflectionTrace.includes('<mo fence="true">)</mo>'));
});

test('små nedböjningar avrundas till sex decimaler och jämförelsen visar kvot i procent', () => {
  const input = engine.defaults('wb-kb2');
  const html = report.render('wb-kb2', input);
  const table = html.split('<table class="workbook-checks">')[1].split('</table>')[0];
  assert.ok(table.includes('<th>Kvot</th>'));
  assert.ok(table.includes('<td>0,000544 mm</td>'));
  assert.ok(!table.includes('<td>0,001 mm</td>'));
  const changed = report.render('wb-kb2', { ...input, E28: 100 });
  const changedTable = changed.split('<table class="workbook-checks">')[1].split('</table>')[0];
  assert.ok(changedTable.includes('<td>0,000272 mm</td>'));
  assert.ok(changedTable.includes('0,032948 %'));
  const hook = report.render('wb-c-hook', engine.defaults('wb-c-hook'));
  assert.ok(hook.includes('Momentkvot mot idealt elastiskt Mcr'));
  assert.ok(hook.includes('<th>Kvot</th>'));
});
