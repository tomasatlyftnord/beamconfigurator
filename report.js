(function (root) {
  'use strict';
  const beam = typeof module !== 'undefined' && module.exports ? require('./beam.js') : root.Beam;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pair = (name, value) => `<div><dt>${name}</dt><dd>${value}</dd></div>`;
  // Native MathML: skarpa ekvationer i webbläsare och PDF, utan externa bibliotek.
  const symbol = name => {
    const [base, index] = name.split('_');
    return index ? `<msub><mi>${base}</mi><mtext>${index}</mtext></msub>` : `<mi>${base}</mi>`;
  };
  const value = (v, digits = 2) => `<mn>${n(v, digits)}</mn>`;
  const operator = text => `<mo>${text}</mo>`;
  const row = content => `<mrow>${content}</mrow>`;
  const fraction = (top, bottom) => `<mfrac>${row(top)}${row(bottom)}</mfrac>`;
  const power = (base, exponent) => `<msup>${base}<mn>${exponent}</mn></msup>`;
  const product = (...terms) => terms.join(operator('·'));
  const result = (v, unit, digits = 2) => `${value(v, digits)}<mtext> ${unit}</mtext>`;
  const equation = (...terms) => `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${row(terms.join(operator('=')))}</math>`;
  function render(profileName, input, reference = '') {
    beam.validate(input);
    const profile = beam.profiles.find(p => p.name === profileName);
    if (!profile) throw new RangeError('Välj en profil ur tabellen.');
    const p = beam.evaluate(profile, input);
    const L = input.span, safetyFactor = input.factor;
    const { g, E, allowableStress } = beam.constants;
    const bendingOK = p.utilization <= 1;
    // Uttalandet om två gånger last verifieras separat, även om formulärets n ändras.
    const doubleLoad = beam.evaluate(profile, { ...input, factor: 2 });
    const doubleLoadOK = doubleLoad.utilization <= 1;
    const momentEquations = [
      equation(symbol('F'), product(symbol('m'), symbol('g')), product(value(input.mass), value(g)), result(p.force, 'N')),
      equation(symbol('M_x'), fraction(product(symbol('n'), symbol('F'), symbol('L')), value(4, 0)), fraction(product(value(safetyFactor), value(p.force), value(L, 0)), value(4, 0)), result(p.moment / 1e6, 'kNm', 4)),
      equation(symbol('M_x'), result(p.moment, 'Nmm'))
    ].join('');
    const stressEquations = [
      equation(symbol('σ_till'), result(allowableStress, 'MPa', 0)),
      equation(symbol('σ'), fraction(symbol('M_x'), symbol('W_x')), fraction(value(p.moment), value(p.W, 0)), result(p.stress, 'MPa')),
      equation(symbol('u'), fraction(symbol('σ'), symbol('σ_till')), fraction(value(p.stress, 4), value(allowableStress, 0)), result(p.utilization * 100, '%'))
    ].join('');
    const deflectionEquations = [
      equation(symbol('f'), fraction(product(symbol('F'), power(symbol('L'), 3)), product(value(48, 0), symbol('E'), symbol('I'))), fraction(product(value(p.force), power(value(L, 0), 3)), product(value(48, 0), value(E, 0), value(p.I, 0))), result(p.deflection, 'mm', 4))
    ].join('');
    const header = page => `<div class="report-masthead"><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = `<div class="report-footer"><span>Preliminär kontroll av balkdelen</span></div>`;
    return `<article class="calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">LYFTOK · SYMMETRISKT MITTLYFT</p><h1>Kontrollberäkning</h1><p class="report-profile">${escape(p.name)}</p>${reference.trim() ? `<p class="report-reference">Referens: ${escape(reference.trim())}</p>` : ''}</div>
        <div class="report-verdict ${bendingOK ? 'report-pass' : 'report-fail'}"><b>${bendingOK ? 'Böjkontroll: uppfyller beräkningsvillkoret' : 'Böjkontroll: överskrider beräkningsvillkoret'}</b><span>Kontrollen avser enbart elastisk böjning och redovisning av nedböjning.</span></div>
        <div class="report-highlights"><div><span>Böjspänning σ</span><strong>${n(p.stress)} <small>MPa</small></strong></div><div><span>Nyttjandegrad u</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div><div><span>Nedböjning f</span><strong>${n(p.deflection)} <small>mm</small></strong></div></div>
        <h2>01 / Indata och material</h2><dl class="report-data">${pair('C-c lastpunkter, L', `${n(L, 0)} mm`)}${pair('Total lastvikt, m', `${n(input.mass)} kg`)}${pair('Last per ände', `${n(input.mass / 2)} kg`)}${pair('Säkerhetsfaktor, n', n(safetyFactor))}${pair('Tillåten böjspänning, σ<sub>till</sub>', `${n(allowableStress, 0)} MPa`)}${pair('Material', 'S355')}${pair('Elasticitetsmodul, E', '210 000 MPa')}${pair('Tyngdacceleration, g', '9,82 m/s²')}</dl>
        <h2>02 / Tabellerade sektionsdata</h2><dl class="report-data">${pair('Elastiskt böjmotstånd, W<sub>x</sub>', `${n(p.W / 1000)} cm³ = ${n(p.W, 0)} mm³`)}${pair('Tröghetsmoment, I', `${n(p.I / 10000)} cm⁴ = ${n(p.I, 0)} mm⁴`)}${pair('Vikt per meter, g<sub>b</sub>', `${n(p.mass)} kg/m`)}${pair('Tvärsnittsarea, A', `${n(p.area, 0)} mm²`)}${pair('Böjriktning', 'Kvadratisk profil: lika W och I i båda riktningar')}</dl>
        <p class="report-source">Källa: Tibnors konstruktionstabeller 2023, avsnitt 008 VKR-rör, tryckt sida ${p.sourcePage} (PDF-sida 11). Kvadratiska S355J2H enligt SS-EN 10210. Rapportens W<sub>x</sub> är tabellens elastiska böjmotstånd; plastiskt böjmotstånd används inte. I och W behåller källans oberoende avrundning.</p>
        <h2>03 / Lastmodell</h2><div class="report-beam"><span>↑ Mittlyft</span><div></div><p><b>↓ ${n(p.force / 2000)} kN</b><span>L = ${n(L, 0)} mm</span><b>↓ ${n(p.force / 2000)} kN</b></p></div><p class="report-copy">Två lika vertikala ändlaster. Balklängd = c-c. Varje balkhalva har längden L/2. Balkens egenvikt försummas i både böjning och nedböjning. Nedböjningen avser ändarna relativt mittlyftet.</p>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>04 / Dimensionerande böjmoment</h2>
        <div class="report-equation">${momentEquations}</div>
        <h2>05 / Böjspänning och nyttjandegrad</h2>
        <div class="report-equation">${stressEquations}<p class="equation-condition">Villkor: σ ≤ σ<sub>till</sub> = 355 MPa, motsvarande u ≤ 100 % → <b>${bendingOK ? 'UPPFYLLT' : 'ÖVERSKRIDET'}</b></p></div>
        <h2>06 / Nedböjning vid brukslast</h2>
        <div class="report-equation">${deflectionEquations}</div><p class="report-copy">Ofaktorerad last utan egenvikt. Säkerhetsfaktorn n används inte för nedböjningen. Inget gränsvärde har angetts; nedböjningen redovisas utan godkänd/underkänd-bedömning. Beräkningen använder full precision; insatta värden visas avrundade.</p>
        <h2>07 / Hållfasthetsuttalande och standardreferens</h2>
        <div class="report-strength ${doubleLoadOK ? 'strength-pass' : 'strength-fail'}">
          <b>${doubleLoadOK ? 'Balkens elastiska böjvillkor uppfylls vid två gånger angiven last.' : 'Balkens elastiska böjvillkor uppfylls inte vid två gånger angiven last.'}</b>
          <p>${safetyFactor === 2 ? 'Den redovisade böjkontrollen använder säkerhetsfaktor n = 2,00.' : `Ovanstående beräkningar använder n = ${n(safetyFactor)}. Detta uttalande bygger på en separat kontroll med n = 2,00.`} Det innebär två gånger lastkraften F, utan balkens egenvikt. Vid n = 2,00 blir böjspänningen ${n(doubleLoad.stress)} MPa och nyttjandegraden ${n(doubleLoad.utilization * 100)} %, mot tillåten spänning σ<sub>till</sub> = 355 MPa.</p>
        </div>
        <p class="report-standard">Beräkningen är ett dimensioneringsunderlag med målsättningen att uppfylla tillämpliga hållfasthetskrav enligt <b>SS-EN 13155</b>. Uttalandet avser enbart balkens beräknade elastiska böjhållfasthet i den angivna lastmodellen. Faktorn n = 2 är ett beräkningsantagande, inte i sig en verifiering av standardens krav. Fullständig verifiering av lyftoket enligt standarden ingår inte; standarduppfyllelse kan därför inte intygas med denna rapport.</p>
        ${footer}</section>
    </article>`;
  }
  const api = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BeamReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
