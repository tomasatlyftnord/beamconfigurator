const { test } = require('node:test');
const assert = require('node:assert/strict');
const { render, diagram } = require('../c-hook-report.js');
const input = { b: 20, h: 80, reach: 800, opening: 600, mass: 400, factor: 2, rootRestraint: 'ideal', loadPosition: 'centre' };

test('C-rapporten visar indata och handkontrollerade snittspänningar', () => {
  const html = render(input);
  assert.ok(html.includes('400,00 kg'));
  assert.ok(html.includes('9,82 m/s²'));
  assert.ok(html.includes('299,51'));
  assert.ok(html.includes('7,37'));
  assert.ok(html.includes('84,37'));
  assert.ok(html.includes('<mn>6,2848</mn><mtext> kNm</mtext>'));
  assert.ok(html.includes('Ryggen överför N och M, men ingen tvärskjuvkraft'));
  assert.ok(html.includes('max(|σ<sub>rygg</sub>|, √3|τ<sub>arm</sub>|)/355'));
  assert.equal((html.match(/class="report-page"/g) || []).length, 2);
});

test('konsolens Mcr redovisas som avgränsat jämförelsevärde', () => {
  const html = render(input);
  assert.ok(html.includes('<mn>63,9645</mn><mtext> kNm</mtext>'));
  assert.ok(html.includes('<mn>0,0983</mn>'));
  assert.ok(html.includes('inte en dimensionerande nyttjandegrad eller standardkontroll'));
  assert.ok(html.includes('Hela C-krokens stabilitet är inte verifierad'));
  assert.ok(!html.includes('Vippvillkor uppfyllt'));
  assert.ok(!html.includes('SS-EN 13155'));
});

test('fel lastläge eller okänd inspänning ger inget numeriskt Mcr', () => {
  for (const change of [{ loadPosition: 'other' }, { rootRestraint: 'unknown' }]) {
    const html = render({ ...input, ...change });
    assert.ok(html.includes('M<sub>cr</sub> och momentkvoten redovisas inte'));
    assert.ok(!html.includes('63,9645'));
    assert.ok(html.includes('inte tillämplig'));
  }
});

test('kort arm undertrycker numerisk vippningsjämförelse utan standardpåstående', () => {
  const html = render({ ...input, reach: 600 });
  assert.ok(html.includes('gräns för en slank arm är inte uppfylld'));
  assert.ok(html.includes('M<sub>cr</sub> och momentkvoten redovisas inte'));
  assert.ok(html.includes('inte ett standardkrav'));
});

test('rapporten räknar om från aktuella indata och markerar för svagt snitt', () => {
  const html = render({ ...input, mass: 800 });
  assert.ok(html.includes('599,02'));
  assert.ok(html.includes('Lokala snittvillkor överskrids'));
  assert.ok(html.includes('800,00 kg'));
  assert.ok(!html.includes('299,51'));
});

test('referensen behandlas som text och ogiltig geometri avvisas', () => {
  const html = render(input, '<img src=x onerror=alert(1)>');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('Beamconfigurator'));
  assert.ok(!html.includes('<a '));
  assert.throws(() => render({ ...input, mass: NaN }), RangeError);
  assert.throws(() => render({ ...input, opening: 80 }), RangeError);
  assert.ok(diagram(input).includes('L₁ = L₂ = 800 mm'));
});

test('icke plåtlikt snitt får ingen numerisk vippningsjämförelse', () => {
  const html = render({ ...input, b: 100 });
  assert.ok(html.includes('Plåttjockleken t är större än snitthöjden h'));
  assert.ok(html.includes('M<sub>cr</sub> och momentkvoten redovisas inte'));
});

test('överskridet elastiskt vippmoment ger en separat modellvarning', () => {
  const html = render({ ...input, mass: 5000 });
  assert.ok(html.includes('når eller överskrider konsolmodellens elastiska kritiska moment'));
  assert.ok(html.includes('Hela C-krokens stabilitet är inte verifierad'));
});
