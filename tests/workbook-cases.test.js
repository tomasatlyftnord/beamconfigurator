const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../workbook-engine.js');
const definitions = require('../workbook-cases.js');
const { registry } = require('../load-cases.js');

test('alla tio Excelblad registreras med profilval och egna källreferenser', () => {
  assert.equal(definitions.length, 10);
  for (const model of engine.models) {
    const definition = registry.get(model.id);
    assert.equal(definition.group, 'Arbetsbok 0.1 · för granskning');
    for (const field of model.fields.filter(f => f.type === 'profile')) {
      const choices = definition.fields.find(f => f.name === field.name);
      assert.equal(choices.type, 'select');
      assert.equal(choices.options.length, 204);
      assert.ok(choices.options.some(p => p.value === field.default));
      assert.ok(choices.options.find(p => p.value === 'HE 180 A').label.includes('⚠'));
    }
    const result = definition.calculate(engine.defaults(model.id));
    const html = definition.renderResults(result);
    for (const row of result.rows) assert.ok(html.includes(`<td>${row.cell}</td>`));
    assert.ok(html.includes('workbook-profiles-0.1.csv'));
    assert.ok(definition.diagram(result.input).includes('<svg'));
  }
});

test('C-krokens källfel finns i resultatet och ersätts inte av ett generellt godkännande', () => {
  const definition = registry.get('wb-c-hook');
  const result = definition.calculate(engine.defaults(definition.id));
  assert.ok(result.checks.every(c => c.pass));
  const html = definition.renderResults(result);
  assert.ok(html.includes('granskning återstår'));
  assert.ok(html.includes('#N/A'));
  assert.ok(html.includes('E92'));
  assert.ok(html.includes('E143–E146'));
  assert.ok(html.includes('Randvillkor'));
  assert.ok(!html.includes('class="case-verdict case-fail"'));
});

test('semispridarok visar böjning och källans kombination som separata kontroller', () => {
  const definition = registry.get('wb-semispridarok');
  const input = engine.defaults(definition.id);
  const result = definition.calculate(input);
  const html = definition.renderResults(result);
  assert.ok(html.includes('Överskrids'));
  assert.ok(html.includes('1,75'));
  assert.ok(html.includes('0,9'));
  assert.ok(html.includes('E50'));
  assert.ok(html.includes('E51'));
});

test('ändrad KB6-massa märks som indata med ursprunglig exempelformel', () => {
  const definition = registry.get('wb-kb6');
  const result = definition.calculate({ ...engine.defaults(definition.id), E27: 1000 });
  const html = definition.renderResults(result);
  assert.ok(html.includes('Redigerbar indata'));
  assert.equal(result.cells.E27, 1000);
});
