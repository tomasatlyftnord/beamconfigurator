const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render, diagram } = require('../c2-report.js');
const input = { mass: 400, factor: 2, t: 10, a: 40, b: 30, lever: 40 };

test('C2-rapporten visar oberoende handvärden och två rapportsidor', () => {
  const html = render(input);
  // F = 400*9.82*2; A_a=400; A_b=300; W=10*40²/6.
  for (const text of [
    '400,00 kg', '9,82 m/s²', '213 MPa', '355 MPa',
    '<mn>7 856,00</mn><mtext> N</mtext>',
    '<mn>3 928,00</mn><mtext> N</mtext>',
    '<mn>2 666,67</mn><mtext> mm³</mtext>',
    '<mn>157 120</mn><mtext> Nmm</mtext>',
    '<mn>9,82</mn><mtext> MPa</mtext>',
    '<mn>58,92</mn><mtext> MPa</mtext>',
    '<mn>13,09</mn><mtext> MPa</mtext>',
    '<mn>72,01</mn><mtext> MPa</mtext>',
    'Skjuvvillkor, τ ≤ 213 MPa: 4,61 %',
    'Böjvillkor, σB ≤ 355 MPa: 16,60 %',
    'Summavillkor, σB + σD ≤ 355 MPa: 20,29 %'
  ]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/class="report-page"/g) || []).length, 2);
  assert.ok(html.includes('KONTROLLBERÄKNING · 1/2'));
  assert.ok(html.includes('KONTROLLBERÄKNING · 2/2'));
});

test('källans metod och härledningen av böjmotståndet framgår', () => {
  const html = render(input);
  assert.ok(html.includes('Beräkning - C2.pdf, sida 1'));
  assert.ok(html.includes('W<sub>x</sub> = ta²/6 är härlett'));
  assert.ok(html.includes('utan faktor 1,5'));
  assert.ok(html.includes('213 MPa'));
  assert.ok(!html.includes('204,96'));
  assert.ok(html.includes('Summeringen σ<sub>B</sub> + σ<sub>D</sub> följer PDF:ens beräkningskonvention'));
  assert.ok(html.includes('inte att spänningarnas maxima uppträder i samma materialpunkt'));
});

test('godkända redovisade snitt innebär inte att hela lastörat godkänns', () => {
  const html = render(input);
  assert.ok(html.includes('De redovisade C2-snittvillkoren uppfylls.'));
  assert.ok(html.includes('Hål-/C1-kontrollen ingår inte'));
  assert.ok(html.includes('hela lastörat är inte verifierat'));
  assert.ok(html.includes('Beräknas med C1 standard'));
  assert.ok(html.includes('Rapporten styrker inte uppfyllelse av SS-EN 13155'));
  assert.ok(!html.includes('Lastörat är godkänt'));
});

test('ändrade indata räknas om och överskridanden markeras i respektive kontroll', () => {
  const html = render({ ...input, mass: 4000 });
  assert.ok(html.includes('Minst ett redovisat C2-snittvillkor överskrids.'));
  assert.ok(html.includes('Skjuvvillkor, τ ≤ 213 MPa: 46,10 % — villkoret uppfylls'));
  assert.ok(html.includes('Böjvillkor, σB ≤ 355 MPa: 165,97 % — villkoret överskrids'));
  assert.ok(html.includes('Summavillkor, σB + σD ≤ 355 MPa: 202,85 % — villkoret överskrids'));
  assert.ok(html.includes('<mn>720,13</mn><mtext> MPa</mtext>'));
  assert.ok(!html.includes('<mn>72,01</mn><mtext> MPa</mtext>'));
});

test('skjuvning kan styra oberoende av den summerade normalspänningen', () => {
  const html = render({ ...input, mass: 10000, a: 40, b: 300, lever: 1 });
  assert.ok(html.includes('Skjuvvillkor, τ ≤ 213 MPa: 115,26 % — villkoret överskrids'));
  assert.ok(html.includes('Minst ett redovisat C2-snittvillkor överskrids.'));
});

test('referensen escapes och rapporten saknar produktnamn, datum och länkar', () => {
  const html = render(input, '<img src=x onerror="alert(1)">&\'');
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('Beamconfigurator'));
  assert.ok(!html.includes('<a '));
  assert.ok(!html.includes('Datum:'));
});

test('ogiltiga indata stoppas även i fristående diagram och n har standardvärdet 2', () => {
  for (const change of [{ mass: NaN }, { t: 0 }, { a: -1 }, { b: '30' }, { lever: Infinity }, { factor: null }]) {
    assert.throws(() => render({ ...input, ...change }), RangeError);
    assert.throws(() => diagram({ ...input, ...change }), RangeError);
  }
  const { factor, ...withoutFactor } = input;
  assert.ok(render(withoutFactor).includes('<mn>7 856,00</mn><mtext> N</mtext>'));
  const svg = diagram(input);
  assert.ok(svg.includes('a = 40,00 mm'));
  assert.ok(diagram({ ...input, a: 40.25 }).includes('a = 40,25 mm'));
  assert.ok(svg.includes('b = 30,00 mm'));
  assert.ok(svg.includes('t = 10,00 mm'));
  assert.ok(svg.includes('L = 40,00 mm'));
});
