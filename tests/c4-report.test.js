const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render, diagram } = require('../c4-report.js');
const input = { mass: 125, factor: 2, k: 25, t: 10, innerDiameter: 20 };

test('C4-rapporten återger källexemplet med oavrundade handvärden', () => {
  const html = render(input);
  // F=125*9.82*2; L=(25+20)/2; M=-2455*22.5; sigma=-55237.5/(10*25²/6).
  for (const text of [
    '125,00 kg', '9,82 m/s²', '213 MPa', '355 MPa',
    '<mn>2 455,00</mn><mtext> N</mtext>',
    '<mn>22,50</mn><mtext> mm</mtext>',
    '<mn>250,00</mn><mtext> mm²</mtext>',
    '<mn>1 041,667</mn><mtext> mm³</mtext>',
    '<mn>13 020,833</mn><mtext> mm⁴</mtext>',
    '<mn>−55 237,50</mn><mtext> Nmm</mtext>',
    '<mn>−53,028</mn><mtext> MPa</mtext>',
    '<mn>9,82</mn><mtext> MPa</mtext>',
    '<mn>0,003409</mn><mtext> mm</mtext>',
    'Skjuvvillkor, τ ≤ 213 MPa: 4,61 %',
    'Böjvillkor, |σmax| ≤ 355 MPa: 14,94 %'
  ]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/class="report-page"/g) || []).length, 2);
  assert.ok(html.includes('KONTROLLBERÄKNING · 1/2'));
  assert.ok(html.includes('KONTROLLBERÄKNING · 2/2'));
});

test('C4-källan, precisionen och konsolmodellens avgränsning framgår', () => {
  const html = render(input);
  assert.ok(html.includes('Rutin_Beräkning av C4 - Lastkrok.pdf, sida 1'));
  assert.ok(html.includes('Skillnaden beror på mellanavrundning'));
  assert.ok(html.includes('−53,011 MPa'));
  assert.ok(html.includes('Spänningsfördelning enligt krökt balkteori'));
  assert.ok(html.includes('hela lastkroken är inte verifierad'));
  assert.ok(html.includes('Rapporten styrker inte uppfyllelse av SS-EN 13155'));
  assert.ok(html.includes('Kontrollerna av skjuvning och böjning görs var för sig'));
  assert.ok(html.includes('ingen faktor 1,5 används'));
  assert.ok(!html.includes('Lastkroken är godkänd'));
});

test('nedböjningen använder samma säkerhetsfaktor som spänningarna', () => {
  const html = render({ ...input, factor: 1 });
  assert.ok(html.includes('<mn>1 227,50</mn><mtext> N</mtext>'));
  assert.ok(html.includes('<mn>−26,514</mn><mtext> MPa</mtext>'));
  assert.ok(html.includes('<mn>0,001704</mn><mtext> mm</mtext>'));
  assert.ok(!html.includes('<mn>0,003409</mn><mtext> mm</mtext>'));
  assert.ok(html.includes('F = mgn används även här'));
  assert.ok(html.includes('inget godkännandevillkor för f'));
  assert.ok(html.includes('Skjuvdeformation försummas'));
  assert.ok(html.includes('L/K = 0,90'));
});

test('större aktuell last markeras separat i böjning och skjuvning', () => {
  const html = render({ ...input, mass: 1000 });
  assert.ok(html.includes('Minst ett redovisat C4-snittvillkor överskrids.'));
  assert.ok(html.includes('Skjuvvillkor, τ ≤ 213 MPa: 36,88 % — villkoret uppfylls'));
  assert.ok(html.includes('Böjvillkor, |σmax| ≤ 355 MPa: 119,50 % — villkoret överskrids'));
  assert.ok(html.includes('<mn>−424,224</mn><mtext> MPa</mtext>'));
  assert.ok(html.includes('<mn>0,027272</mn><mtext> mm</mtext>'));
});

test('referensen är text och rapporten saknar produktnamn, personnamn, datum och länkar', () => {
  const html = render(input, '<img src=x onerror="alert(1)">&\'');
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('Beamconfigurator'));
  assert.ok(!html.includes('Daniel'));
  assert.ok(!html.includes('16-02-2023'));
  assert.ok(!html.includes('<a '));
  assert.ok(!html.includes('Datum:'));
});

test('ogiltiga indata avvisas även i diagrammet och utelämnat n blir 2', () => {
  for (const change of [{ mass: NaN }, { k: 0 }, { t: -1 }, { innerDiameter: '20' }, { factor: null }]) {
    assert.throws(() => render({ ...input, ...change }), RangeError);
    assert.throws(() => diagram({ ...input, ...change }), RangeError);
  }
  const { factor, ...withoutFactor } = input;
  assert.ok(render(withoutFactor).includes('<mn>2 455,00</mn><mtext> N</mtext>'));
  const svg = diagram(input);
  assert.ok(svg.includes('K = 25,00 mm'));
  assert.ok(svg.includes('t = 10,00 mm'));
  assert.ok(svg.includes('φ inne = 20,00 mm'));
  assert.ok(svg.includes('L = 22,50 mm'));
});
