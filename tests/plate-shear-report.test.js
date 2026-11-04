const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render, diagram } = require('../plate-shear-report.js');
const input = { mass: 400, factor: 2, k: 25, t: 10 };

test('C1-rapporten använder två areor och fördelar kraften en gång', () => {
  const html = render('c1', input);
  // F=7856 N, A1=A2=250 mm², tau=7856/500=15.712 MPa.
  assert.ok(html.includes('C1 – ändplåt'));
  assert.ok(html.includes('<mn>7 856,00</mn><mtext> N</mtext>'));
  assert.ok(html.includes('F/2 = <b>3 928,00 N</b>'));
  assert.ok(html.includes('Area per plan: <b>250,00 mm²</b>'));
  assert.ok(html.includes('sammanlagd skjuvarea: <b>500,00 mm²</b>'));
  assert.ok(html.includes('<mn>15,712</mn><mtext> MPa</mtext>'));
  assert.ok(html.includes('τ ≤ 213 MPa: 7,38 %'));
  assert.ok(!html.includes('<mn>7,856</mn><mtext> MPa</mtext>'));
  assert.equal((html.match(/class="report-page"/g) || []).length, 1);
});

test('L1-rapporten belastar ett enda skjuvplan med hela kraften', () => {
  const html = render('l1', input);
  // Samma F och area per plan som C1, men tau=7856/250=31.424 MPa.
  assert.ok(html.includes('L1 – skjuvkontroll'));
  assert.ok(html.includes('Ett skjuvplan i bygelns krona'));
  assert.ok(html.includes('F/1 = <b>7 856,00 N</b>'));
  assert.ok(html.includes('sammanlagd skjuvarea: <b>250,00 mm²</b>'));
  assert.ok(html.includes('<mn>31,424</mn><mtext> MPa</mtext>'));
  assert.ok(html.includes('τ ≤ 213 MPa: 14,75 %'));
  assert.ok(!html.includes('<mn>15,712</mn><mtext> MPa</mtext>'));
  assert.equal((html.match(/class="report-page"/g) || []).length, 1);
});

test('samma säkerhetsfaktor följer med hela vägen och aktuella indata räknas om', () => {
  const html = render('l1', { ...input, factor: 1 });
  assert.ok(html.includes('<mn>3 928,00</mn><mtext> N</mtext>'));
  assert.ok(html.includes('<mn>15,712</mn><mtext> MPa</mtext>'));
  assert.ok(html.includes('9,82 m/s²'));
  assert.ok(!html.includes('<mn>31,424</mn><mtext> MPa</mtext>'));
  const { factor, ...withoutFactor } = input;
  assert.ok(render('c1', withoutFactor).includes('<mn>7 856,00</mn><mtext> N</mtext>'));
});

test('källhänvisning, tomma källvärden och kontrollens omfattning anges för båda fallen', () => {
  for (const [id, source] of [['c1', 'Beräkning - C1.pdf'], ['l1', 'Beräkning - L1.pdf']]) {
    const html = render(id, input);
    assert.ok(html.includes(`${source}, sida 1`));
    assert.ok(html.includes('måtten K och t är inte ifyllda'));
    assert.ok(html.includes('ett illustrativt exempel'));
    assert.ok(html.includes('ingen normalspänningskontroll utförs'));
    assert.ok(html.includes('utan faktor 1,5'));
    assert.ok(html.includes('Hela detaljens hållfasthet är inte verifierad'));
    assert.ok(html.includes('styrker inte uppfyllelse av SS-EN 13155'));
    assert.ok(html.includes('Det redovisade skjuvvillkoret uppfylls'));
    assert.ok(!html.includes('Godkänd:'));
  }
});

test('överbelastning ger skjuvbrottsvillkor utan godkännande av detaljen', () => {
  for (const id of ['c1', 'l1']) {
    const html = render(id, { ...input, mass: 10000 });
    assert.ok(html.includes('Det redovisade skjuvvillkoret överskrids'));
    assert.ok(html.includes('skjuvvillkoret överskrids'));
    assert.ok(!html.includes('Det redovisade skjuvvillkoret uppfylls'));
  }
});

test('okända fall och ogiltiga dimensioner avvisas även av diagrammen', () => {
  for (const id of ['C1', 'c2', '__proto__', '', null]) {
    assert.throws(() => render(id, input), RangeError);
    assert.throws(() => diagram(id, input), RangeError);
  }
  for (const id of ['c1', 'l1']) {
    for (const change of [{ mass: NaN }, { k: 0 }, { t: '10' }, { factor: null }]) {
      assert.throws(() => render(id, { ...input, ...change }), RangeError);
      assert.throws(() => diagram(id, { ...input, ...change }), RangeError);
    }
  }
});

test('referensen escapes och endast neutral sidnumrering och sidfot används', () => {
  for (const id of ['c1', 'l1']) {
    const html = render(id, input, '<img src=x onerror="alert(1)">&\'');
    assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;'));
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('Beamconfigurator'));
    assert.ok(!html.includes('<a '));
    assert.ok(!html.includes('Datum:'));
    assert.ok(html.includes('SKJUVKONTROLL · 1/1'));
  }
  assert.ok(diagram('c1', input).includes('två skjuvplan A1 och A2'));
  assert.ok(diagram('l1', input).includes('ett skjuvplan A i kronan'));
});
