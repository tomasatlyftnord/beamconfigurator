(function (root) {
  'use strict';
  const beam = typeof module !== 'undefined' && module.exports ? require('./asymmetric-beam.js') : root.AsymmetricBeam;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pair = (name, text) => `<div><dt>${name}</dt><dd>${text}</dd></div>`;
  const symbol = name => { const [base, sub] = name.split('_'); return sub ? `<msub><mi>${base}</mi><mtext>${sub}</mtext></msub>` : `<mi>${base}</mi>`; };
  const value = (v, digits = 2) => `<mn>${n(v, digits)}</mn>`;
  const op = text => `<mo>${text}</mo>`;
  const product = (...terms) => terms.join(op('·'));
  const fraction = (top, bottom) => `<mfrac><mrow>${top}</mrow><mrow>${bottom}</mrow></mfrac>`;
  const power = (base, exponent) => `<msup>${base}<mn>${exponent}</mn></msup>`;
  const sqrt = term => `<msqrt><mrow>${term}</mrow></msqrt>`;
  const result = (v, unit, digits = 2) => `${value(v, digits)}<mtext> ${unit}</mtext>`;
  const equation = (...terms) => `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${terms.join(op('='))}</mrow></math>`;

  function diagram(input) {
    const p = beam.loadCase(input);
    const x = 60 + 440 * p.leftLength / p.span;
    return `<svg viewBox="0 0 560 240" role="img" aria-label="Lyftok med förskjuten lyftpunkt, avstånden a och b samt balanserade ändlaster" style="display:block;width:100%;height:125px;margin:8px 0;font-family:Arial,sans-serif">
      <rect x="60" y="115" width="440" height="12" fill="#003152"/><path d="M60 115H500" stroke="#FFD200" stroke-width="3"/>
      <g fill="none" stroke="#003152" stroke-width="2"><path d="M${x} 115V38M${x - 6} 48L${x} 38L${x + 6} 48M60 127V190M54 180L60 190L66 180M500 127V190M494 180L500 190L506 180"/>
        <path d="M60 85H500M60 80V90M${x} 80V90M500 80V90" stroke-width="1"/>
      </g>
      <g fill="#003152" font-size="14"><text x="${x > 380 ? x - 11 : x + 11}" y="38" text-anchor="${x > 380 ? 'end' : 'start'}">F = ${n(p.force / 1000, 3)} kN ↑</text><text x="${(60 + x) / 2}" y="76" text-anchor="middle">a</text><text x="${(x + 500) / 2}" y="76" text-anchor="middle">b</text><text x="28" y="216">${n(p.leftForce / 1000, 3)} kN ↓</text><text x="429" y="216">${n(p.rightForce / 1000, 3)} kN ↓</text><text x="280" y="155" text-anchor="middle">L = a + b = ${n(p.span)} mm</text></g>
    </svg>`;
  }

  function render(profileName, input, reference = '') {
    beam.validate(input);
    const profile = beam.profiles.find(row => row.name === profileName);
    if (!profile) throw new RangeError('Välj en profil ur tabellen.');
    const p = beam.evaluate(profile, input);
    const doubleLoad = beam.evaluate(profile, { ...input, factor: 2 });
    const { g, E, allowableStress } = beam.constants;
    const bendingOK = p.utilization <= 1;
    const doubleLoadOK = doubleLoad.utilization <= 1;
    const L = symbol('L'), a = symbol('a'), b = symbol('b'), F = symbol('F'), W = symbol('W_x'), I = symbol('I_x'), M = symbol('M_x');
    const s = Math.min(p.leftLength, p.rightLength), D = p.span ** 2 - s ** 2;
    const forceEquations = [
      equation(F, product(symbol('m'), symbol('g')), product(value(p.totalMass), value(g)), result(p.force, 'N')),
      equation(symbol('F_vänster'), fraction(product(F, b), L), fraction(product(value(p.force), value(p.rightLength)), value(p.span)), result(p.leftForce, 'N')),
      equation(symbol('F_höger'), fraction(product(F, a), L), fraction(product(value(p.force), value(p.leftLength)), value(p.span)), result(p.rightForce, 'N')),
      equation(M, fraction(product(symbol('n'), F, a, b), L), fraction(product(value(p.factor), value(p.force), value(p.leftLength), value(p.rightLength)), value(p.span)), result(p.moment / 1e6, 'kNm', 4))
    ].join('');
    const stressEquations = [
      equation(symbol('σ'), fraction(M, W), fraction(value(p.moment, 0), value(p.W, 0)), result(p.stress, 'MPa')),
      equation(symbol('u'), fraction(symbol('σ'), symbol('σ_till')), fraction(value(p.stress, 4), value(allowableStress, 0)), result(p.utilization * 100, '%'))
    ].join('');
    const peakPosition = p.leftLength <= p.span / 2 ? `${L}${op('−')}${sqrt(fraction(`${power(L, 2)}${op('−')}${power(a, 2)}`, value(3, 0)))}` : sqrt(fraction(`${power(L, 2)}${op('−')}${power(b, 2)}`, value(3, 0)));
    const deflectionEquations = [
      equation(symbol('s'), `<mi mathvariant="normal">min</mi>${op('(')}${a}${op(',')}${b}${op(')')}`, result(s, 'mm')),
      equation(symbol('D'), `${power(L, 2)}${op('−')}${power(symbol('s'), 2)}`, result(D, 'mm²')),
      equation(symbol('f_max'), fraction(product(F, symbol('s'), `<msup>${symbol('D')}<mfrac><mn>3</mn><mn>2</mn></mfrac></msup>`), product(value(9, 0), sqrt(value(3, 0)), symbol('E'), I, L)), result(p.deflection, 'mm', 4)),
      equation(symbol('f_lyft'), fraction(product(F, power(a, 2), power(b, 2)), product(value(3, 0), symbol('E'), I, L)), result(p.deflectionAtLift, 'mm', 4)),
      equation(symbol('x_max'), peakPosition, result(p.xMaxDeflection, 'mm', 2))
    ].join('');
    const header = page => `<div class="report-masthead"><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = '<div class="report-footer"><span>Preliminär böjkontroll av lyftokets balkdel</span></div>';
    return `<article class="calculation-report hook-calculation-report asymmetric-beam-calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">Lyftok med asymmetriskt lyft</p><h1>Kontrollberäkning</h1><p class="report-profile">${escape(p.name)}</p>${String(reference).trim() ? `<p class="report-reference">Referens: ${escape(String(reference).trim())}</p>` : ''}</div>
        <div class="report-verdict ${bendingOK ? 'report-pass' : 'report-fail'}"><b>${bendingOK ? 'Böjkontroll: uppfyller beräkningsvillkoret' : 'Böjkontroll: överskrider beräkningsvillkoret'}</b><span>Kontrollen gäller elastisk böjning med automatiskt balanserad fördelning av ändlasterna.</span></div>
        <div class="report-highlights"><div><span>Böjspänning, σ</span><strong>${n(p.stress)} <small>MPa</small></strong></div><div><span>Nyttjandegrad, u</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div><div><span>Största avvikelse från kordan, f<sub>max</sub></span><strong>${n(p.deflection, 4)} <small>mm</small></strong></div></div>
        <h2>01 / Indata, material och balanserad last</h2><dl class="report-data">${pair('C-c mellan ändlastpunkter, L', `${n(p.span)} mm`)}${pair('Total lastvikt, m', `${n(p.totalMass)} kg`)}${pair('Vänster lastpunkt till lyftpunkt, a', `${n(p.leftLength)} mm`)}${pair('Lyftpunkt till höger lastpunkt, b', `${n(p.rightLength)} mm`)}${pair('Vänster ändlast, mb/L', `${n(p.leftMass)} kg`)}${pair('Höger ändlast, ma/L', `${n(p.rightMass)} kg`)}${pair('Säkerhetsfaktor för böjkontroll, n', n(p.factor))}${pair('Material / tillåten böjspänning', `S355 / σ<sub>till</sub> = ${n(allowableStress, 0)} MPa`)}${pair('Elasticitetsmodul, E', `${n(E, 0)} MPa`)}${pair('Tyngdacceleration, g', `${n(g)} m/s²`)}</dl>
        ${diagram(input)}
        <p class="report-copy">Balklängden är L. Kraft- och momentjämvikt ger ändlasterna F·b/L respektive F·a/L; verklig last ska motsvara denna fördelning. Figurens krafter är ofaktorerade. Balkens egenvikt försummas i både böjning och deformation.</p>
        <h2>02 / Vald profils tabellerade sektionsdata</h2><dl class="report-data">${pair('Elastiskt böjmotstånd, W<sub>x</sub>', `${n(p.W / 1000)} cm³ = ${n(p.W, 0)} mm³`)}${pair('Tröghetsmoment, I<sub>x</sub>', `${n(p.I / 10000)} cm⁴ = ${n(p.I, 0)} mm⁴`)}${pair('Profilvikt per meter', `${n(p.mass)} kg/m`)}${pair('Tvärsnittsarea, A', `${n(p.area, 0)} mm²`)}</dl>
        <p class="report-source">Källa för sektionsdata: Tibnors konstruktionstabeller 2023, avsnitt 008 VKR-rör, tryckt sida ${p.sourcePage} (PDF-sida 11). Kvadratiska S355J2H enligt SS-EN 10210. W<sub>x</sub> är tabellens elastiska böjmotstånd. I och W behåller källans oberoende avrundning.</p>
        <div class="report-limits"><b>Böjformen redovisas relativt kordan mellan ändlastpunkterna.</b> En ensam fri lyftpunkt bestämmer inte balkens stelkroppsrotation. Modellen bestämmer därför inte balkens absoluta höjdläge, ändpunkternas absoluta förskjutningar eller om balken hänger vågrätt.</div>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>03 / Ändkrafter och dimensionerande böjmoment</h2><div class="report-equation">${forceEquations}</div>
        <h2>04 / Elastisk böjspänning och nyttjandegrad</h2><div class="report-equation">${stressEquations}<p class="equation-condition">Villkor: σ ≤ σ<sub>till</sub> = 355 MPa, u ≤ 100 % → <b>${bendingOK ? 'UPPFYLLT' : 'ÖVERSKRIDET'}</b></p></div>
        <h2>05 / Böjform relativt ändpunkternas korda vid brukslast</h2><div class="report-equation">${deflectionEquations}</div>
        <p class="report-copy">f<sub>max</sub> är största beloppet av avvikelsen från den räta linjen mellan ändlastpunkterna. f<sub>lyft</sub> är avvikelsen från samma korda vid lyftpunkten x = a. x<sub>max</sub> mäts från vänster lastpunkt; uttrycket ovan gäller a ${p.leftLength <= p.span / 2 ? '≤' : '&gt;'} L/2. Ofaktorerad F används; n ingår inte. Inget gränsvärde har angetts för deformationen. Beräkningen använder full precision.</p>
        <h2>06 / Separat böjkontroll vid två gånger angiven last</h2><div class="report-strength ${doubleLoadOK ? 'strength-pass' : 'strength-fail'}"><b>${doubleLoadOK ? 'Balkens elastiska böjvillkor uppfylls vid n = 2,00.' : 'Balkens elastiska böjvillkor uppfylls inte vid n = 2,00.'}</b><p>${p.factor === 2 ? 'Samma säkerhetsfaktor används ovan.' : `Ovan används n = ${n(p.factor)}; detta uttalande räknas separat med n = 2,00.`} Vid n = 2,00 blir σ = ${n(doubleLoad.stress)} MPa och u = ${n(doubleLoad.utilization * 100)} %.</p></div>
        <p class="report-standard">Standardreferens: <b>SS-EN 13155</b>. Uttalandet gäller enbart balkens elastiska böjvillkor i den angivna lastmodellen. n = 2 är ett beräkningsantagande; standarduppfyllelse kan inte intygas. Skjuvning, stabilitet, lyftöglor, lastinfästningar och svetsar är inte verifierade.</p>
        ${footer}</section>
    </article>`;
  }
  const api = { render, diagram };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AsymmetricBeamReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
