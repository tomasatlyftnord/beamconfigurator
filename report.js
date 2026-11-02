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
  function render(profileName, input, reference = '', date = new Date()) {
    beam.validate(input);
    const profile = beam.profiles.find(p => p.name === profileName);
    if (!profile) throw new RangeError('Välj en profil ur tabellen.');
    const p = beam.evaluate(profile, input);
    const L = input.span, fy = input.fy, k = input.factor;
    const bendingOK = p.utilization <= 1;
    const shearOK = p.shearRatio <= 0.5;
    const momentEquations = [
      equation(symbol('P'), product(symbol('m'), symbol('g')), product(value(input.mass), value(9.81)), result(p.force, 'N')),
      equation(symbol('q'), fraction(product(symbol('g_b'), symbol('g')), value(1000, 0)), fraction(product(value(p.mass), value(9.81)), value(1000, 0)), result(p.lineLoad, 'N/mm', 5)),
      equation(symbol('M_last'), fraction(product(symbol('k'), symbol('P'), symbol('L')), value(4, 0)), fraction(product(value(k), value(p.force), value(L, 0)), value(4, 0)), result(p.momentLoad / 1e6, 'kNm', 4)),
      equation(symbol('M_egenvikt'), fraction(product(symbol('k'), symbol('q'), power(symbol('L'), 2)), value(8, 0)), fraction(product(value(k), value(p.lineLoad, 5), power(value(L, 0), 2)), value(8, 0)), result(p.momentSelf / 1e6, 'kNm', 4)),
      equation(symbol('M_Ed'), `${symbol('M_last')}${operator('+')}${symbol('M_egenvikt')}`, result(p.moment / 1e6, 'kNm', 4), result(p.moment, 'Nmm'))
    ].join('');
    const stressEquations = [
      equation(symbol('σ'), fraction(symbol('M_Ed'), symbol('W_el')), fraction(value(p.moment), value(p.W, 0)), result(p.stress, 'MPa')),
      equation(symbol('f_yd'), fraction(symbol('f_y'), symbol('γ_M')), fraction(value(fy, 0), value(1)), result(fy, 'MPa', 0)),
      equation(symbol('η'), fraction(symbol('σ'), symbol('f_yd')), fraction(value(p.stress, 4), value(fy, 0)), result(p.utilization * 100, '%'))
    ].join('');
    const deflectionEquations = [
      equation(symbol('δ_last'), fraction(product(symbol('P'), power(symbol('L'), 3)), product(value(48, 0), symbol('E'), symbol('I'))), fraction(product(value(p.force), power(value(L, 0), 3)), product(value(48, 0), value(210000, 0), value(p.I, 0))), result(p.deflectionLoad, 'mm', 4)),
      equation(symbol('δ_egenvikt'), fraction(product(symbol('q'), power(symbol('L'), 4)), product(value(128, 0), symbol('E'), symbol('I'))), fraction(product(value(p.lineLoad, 5), power(value(L, 0), 4)), product(value(128, 0), value(210000, 0), value(p.I, 0))), result(p.deflectionSelf, 'mm', 4)),
      equation(symbol('δ'), `${symbol('δ_last')}${operator('+')}${symbol('δ_egenvikt')}`, result(p.deflection, 'mm', 4))
    ].join('');
    const shearEquations = [
      equation(symbol('A_v'), `${value(2, 0)}${symbol('t')}${operator('(')}${symbol('h')}${operator('−')}${value(6, 0)}${symbol('t')}${operator(')')}`, result(p.shearArea, 'mm²')),
      equation(symbol('V_Ed'), product(symbol('k'), row(`${operator('(')}${fraction(symbol('P'), value(2, 0))}${operator('+')}${fraction(product(symbol('q'), symbol('L')), value(2, 0))}${operator(')')}`)), result(p.shear / 1000, 'kN')),
      equation(symbol('V_Rd'), fraction(product(symbol('A_v'), symbol('f_y')), '<msqrt><mn>3</mn></msqrt>'), result(p.shearCapacity / 1000, 'kN')),
      equation(fraction(symbol('V_Ed'), symbol('V_Rd')), result(p.shearRatio * 100, '%'))
    ].join('');
    const timestamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'long', timeStyle: 'short' }).format(date);
    const header = page => `<div class="report-masthead"><b>Beamconfigurator</b><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = `<div class="report-footer"><span>Beamconfigurator v0.4 · Tibnor 2023</span><span>Preliminär kontroll av balkdelen</span></div>`;
    return `<article class="calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">LYFTOK · SYMMETRISKT MITTLYFT</p><h1>Kontrollberäkning</h1><p class="report-profile">${escape(p.name)}</p><p>${reference.trim() ? `Referens: ${escape(reference.trim())}<br>` : ''}${escape(timestamp)} · Europe/Stockholm</p></div>
        <div class="report-verdict ${bendingOK && shearOK ? 'report-pass' : 'report-fail'}"><b>${bendingOK ? 'Böjkontroll: uppfyller beräkningsvillkoret' : 'Böjkontroll: överskrider beräkningsvillkoret'}</b><span>${shearOK ? 'Förenklat skjuvvillkor V/V_Rd ≤ 50 % uppfyllt.' : 'Fördjupad skjuv-/böjinteraktionskontroll krävs.'} Detta är inget godkännande av ett komplett lyftredskap.</span></div>
        <div class="report-highlights"><div><span>Böjspänning σ</span><strong>${n(p.stress)} <small>MPa</small></strong></div><div><span>Böjutnyttjande η</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div><div><span>Nedböjning δ</span><strong>${n(p.deflection)} <small>mm</small></strong></div></div>
        <h2>01 / Indata och material</h2><dl class="report-data">${pair('C-c lastpunkter, L', `${n(L, 0)} mm`)}${pair('Total lastvikt, m', `${n(input.mass)} kg`)}${pair('Last per ände', `${n(input.mass / 2)} kg`)}${pair('Lastfaktor, k', n(k))}${pair('Antagen sträckgräns, f<sub>y</sub>', `${n(fy, 0)} MPa (S${fy})`)}${pair('Materialfaktor, γ<sub>M</sub>', '1,00')}${pair('Elasticitetsmodul, E', '210 000 MPa')}${pair('Tyngdacceleration, g', '9,81 m/s²')}</dl>
        <h2>02 / Tabellerade sektionsdata</h2><dl class="report-data">${pair('Elastiskt böjmotstånd, W<sub>el</sub>', `${n(p.W / 1000)} cm³ = ${n(p.W, 0)} mm³`)}${pair('Tröghetsmoment, I', `${n(p.I / 10000)} cm⁴ = ${n(p.I, 0)} mm⁴`)}${pair('Vikt per meter, g<sub>b</sub>', `${n(p.mass)} kg/m`)}${pair('Balkens egenvikt, m<sub>b</sub>', `${n(p.beamMass)} kg`)}${pair('Tvärsnittsarea, A', `${n(p.area, 0)} mm²`)}${pair('Böjaxel', 'y (kvadratisk profil: I<sub>y</sub> = I<sub>z</sub>)')}</dl>
        <p class="report-source">Källa: Tibnors konstruktionstabeller 2023, avsnitt 008 VKR-rör, tryckt sida ${p.sourcePage} (PDF-sida 11). Kvadratiska S355J2H enligt SS-EN 10210. Elastiskt W<sub>el</sub> används, inte plastiskt W<sub>pl</sub>. I och W behåller källans oberoende avrundning.${fy === 235 ? ' S235 är ett hållfasthetsantagande för samma geometri; källtabellen gäller S355J2H.' : ''}</p>
        <h2>03 / Lastmodell</h2><div class="report-beam"><span>↑ Mittlyft</span><div></div><p><b>↓ ${n(p.force / 2000)} kN</b><span>L = ${n(L, 0)} mm</span><b>↓ ${n(p.force / 2000)} kN</b></p></div><p class="report-copy">Två lika vertikala ändlaster. Balklängd = c-c. Varje balkhalva har längden L/2. Balkens egenvikt verkar jämnt längs hela balken. Nedböjningen avser ändarna relativt mittlyftet.</p>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>04 / Dimensionerande böjmoment</h2>
        <div class="report-equation">${momentEquations}</div>
        <h2>05 / Böjspänning och utnyttjandegrad</h2>
        <div class="report-equation">${stressEquations}<p class="equation-condition">Villkor: σ ≤ f<sub>yd</sub>, motsvarande η ≤ 100 % → <b>${bendingOK ? 'UPPFYLLT' : 'ÖVERSKRIDET'}</b></p></div>
        <h2>06 / Nedböjning vid brukslast</h2>
        <div class="report-equation">${deflectionEquations}</div><p class="report-copy">Ofaktorerad last. Lastfaktorn k används inte för nedböjningen. Inget gränsvärde har angetts; nedböjningen redovisas utan godkänd/underkänd-bedömning. Beräkningen använder full precision; insatta värden visas avrundade.</p>
        <h2>07 / Skjuvvillkor och beräkningens omfattning</h2>
        <p class="report-copy">Skjuvarean är en separat geometrisk uppskattning, inte ett tabellvärde.</p><div class="report-equation report-shear">${shearEquations}<p class="equation-condition"><b>${shearOK ? '≤ 50 %, modellens villkor uppfyllt' : '> 50 %, interaktionskontroll krävs'}</b>.</p></div>
        <div class="report-limits">Statisk, vertikal och symmetrisk last. Materialfaktor 1,0 och vald lastfaktor är beräkningsantaganden. Lokal buckling/tvärsnittsklass, vippning, dynamik, utmattning, snedlast, hål, lyftöron, svetsar och lokal kraftintroduktion ingår inte. Tillgänglighet och material ska verifieras. Fullständig konstruktionskontroll enligt tillämpliga krav, exempelvis EN 13155, krävs före tillverkning och användning.</div>
        ${footer}</section>
    </article>`;
  }
  const api = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BeamReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
