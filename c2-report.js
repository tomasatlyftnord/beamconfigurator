(function (root) {
  'use strict';
  const engine = typeof module !== 'undefined' && module.exports ? require('./c2.js') : root.C2Calculations;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const symbol = name => { const [base, sub] = name.split('_'); return sub ? `<msub><mi>${base}</mi><mtext>${sub}</mtext></msub>` : `<mi>${base}</mi>`; };
  const value = (v, digits = 2) => `<mn>${n(v, digits)}</mn>`;
  const op = text => `<mo>${text}</mo>`;
  const product = (...terms) => terms.join(op('·'));
  const fraction = (top, bottom) => `<mfrac><mrow>${top}</mrow><mrow>${bottom}</mrow></mfrac>`;
  const power = (base, exponent) => `<msup>${base}<mn>${exponent}</mn></msup>`;
  const result = (v, unit, digits = 2) => `${value(v, digits)}<mtext> ${unit}</mtext>`;
  const equation = (...terms) => `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${terms.join(op('='))}</mrow></math>`;
  const pair = (title, text) => `<div><dt>${title}</dt><dd>${text}</dd></div>`;
  const check = (label, utilization) => `<p class="equation-condition"><b>${label}: ${n(utilization * 100)} % — ${utilization <= 1 ? 'villkoret uppfylls' : 'villkoret överskrids'}.</b></p>`;

  function diagram(input) {
    // Validate before interpolating dimensions, including when used outside render().
    const p = engine.calculate(input);
    return `<svg viewBox="0 0 560 300" role="img" aria-label="Schematisk C2-plåt med två lika belastade sidor, måtten a, b, t och momentarmen L" style="display:block;width:100%;height:165px;margin:8px 0;font-family:Arial,sans-serif">
      <path d="M142 54 H322 V228 Q280 280 232 280 Q184 280 142 228 Z M194 112 V220 H270 V112 H247 V100 H217 V112 Z" fill="#FFD200" fill-rule="evenodd" stroke="#003152" stroke-width="2"/>
      <circle cx="232" cy="251" r="12" fill="white" stroke="#003152" stroke-width="2"/>
      <rect x="407" y="54" width="14" height="226" fill="#FFD200" stroke="#003152" stroke-width="2"/>
      <g stroke="#003152" fill="none" stroke-width="2"><path d="M176 16V78 M170 68L176 78L182 68 M288 16V78 M282 68L288 78L294 68 M232 296V263 M226 273L232 263L238 273"/>
        <path d="M142 35H176 M142 30V40 M176 30V40 M342 54V112 M337 54H347 M337 112H347 M270 184H322 M270 179V189 M322 179V189 M407 291H421 M407 286V296 M421 286V296" stroke-width="1"/>
        <path d="M142 112H194 M270 112H322" stroke-dasharray="4 3" stroke-width="1"/>
      </g>
      <g fill="#003152" font-size="13"><text x="178" y="16">F/2</text><text x="290" y="16">F/2</text><text x="150" y="27">L</text><text x="352" y="87">a</text><text x="288" y="177">b</text><text x="430" y="296">t</text><text x="250" y="296">F</text><text x="386" y="40">Sidovy</text><text x="16" y="142">a = ${n(p.a)} mm</text><text x="16" y="163">b = ${n(p.b)} mm</text><text x="16" y="184">t = ${n(p.t)} mm</text><text x="16" y="205">L = ${n(p.lever)} mm</text><text x="440" y="244">Hål: C1-kontroll</text><text x="440" y="261">ingår inte</text></g>
    </svg>`;
  }

  function render(input, reference = '') {
    // Always calculate from the current, validated input, independent of UI state.
    const p = engine.calculate(input);
    const { g, allowableStress, allowableShear } = engine.constants;
    const allOK = p.utilization <= 1;
    const header = page => `<div class="report-masthead"><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = '<div class="report-footer"><span>Förenklad snittkontroll av lastöra C2</span></div>';
    const F = symbol('F'), sideForce = fraction(F, value(2, 0)), A = symbol('A_a'), B = symbol('A_b'), W = symbol('W_x'), M = symbol('M_b');
    const sectionEquations = [
      equation(A, product(symbol('a'), symbol('t')), product(value(p.a), value(p.t)), result(p.shearAreaPerSide, 'mm²')),
      equation(B, product(symbol('b'), symbol('t')), product(value(p.b), value(p.t)), result(p.tensionAreaPerSide, 'mm²')),
      equation(W, fraction(product(symbol('t'), power(symbol('a'), 2)), value(6, 0)), result(p.W, 'mm³'))
    ].join('');
    const loadEquations = [
      equation(F, product(symbol('m'), symbol('g'), symbol('n')), product(value(p.mass), value(g), value(p.factor)), result(p.force, 'N')),
      equation(sideForce, result(p.loadPerSide, 'N'))
    ].join('');
    const shearEquations = [
      equation(symbol('τ'), fraction(F, product(value(2, 0), symbol('a'), symbol('t'))), fraction(value(p.force), product(value(2, 0), value(p.a), value(p.t))), result(p.shearStress, 'MPa')),
      equation(symbol('u_τ'), fraction(symbol('τ'), symbol('τ_till')), fraction(value(p.shearStress), value(allowableShear, 0)), result(p.shearUtilization * 100, '%'))
    ].join('');
    const bendingEquations = [
      equation(M, product(sideForce, symbol('L')), product(value(p.loadPerSide), value(p.lever)), result(p.moment, 'Nmm', 0)),
      equation(symbol('σ_B'), fraction(M, W), fraction(value(p.moment, 0), value(p.W)), result(p.bendingStress, 'MPa')),
      equation(symbol('u_B'), fraction(symbol('σ_B'), symbol('σ_till')), result(p.bendingUtilization * 100, '%'))
    ].join('');
    const combinedEquations = [
      equation(symbol('σ_D'), fraction(F, product(value(2, 0), symbol('b'), symbol('t'))), fraction(value(p.force), product(value(2, 0), value(p.b), value(p.t))), result(p.tensionStress, 'MPa')),
      equation(symbol('σ_str'), `${symbol('σ_B')}${op('+')}${symbol('σ_D')}`, `${value(p.bendingStress)}${op('+')}${value(p.tensionStress)}`, result(p.totalStress, 'MPa')),
      equation(symbol('u_str'), fraction(symbol('σ_str'), symbol('σ_till')), fraction(value(p.totalStress), value(allowableStress, 0)), result(p.totalUtilization * 100, '%'))
    ].join('');
    return `<article class="calculation-report hook-calculation-report c2-calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">C2 · LASTÖRA I PLÅT</p><h1>Kontrollberäkning</h1><p class="report-profile">Två lika belastade sidor</p>${String(reference).trim() ? `<p class="report-reference">Referens: ${escape(String(reference).trim())}</p>` : ''}</div>
        <div class="report-verdict ${allOK ? 'report-pass' : 'report-fail'}"><b>${allOK ? 'De redovisade C2-snittvillkoren uppfylls.' : 'Minst ett redovisat C2-snittvillkor överskrids.'}</b><span>Kontroll enligt underlagets nominella snittmetod. Hål-/C1-kontrollen ingår inte; ett komplett lastöra är inte verifierat.</span></div>
        <div class="report-highlights"><div><span>Medelskjuvspänning, τ</span><strong>${n(p.shearStress)} <small>MPa</small></strong></div><div><span>Spänningssumma, σ<sub>B</sub> + σ<sub>D</sub></span><strong>${n(p.totalStress)} <small>MPa</small></strong></div><div><span>Styrande redovisad nyttjandegrad</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div></div>
        <h2>01 / Indata och beräkningsmodell</h2><dl class="report-data">${pair('Lastvikt, m', `${n(p.mass)} kg`)}${pair('Säkerhetsfaktor, n', n(p.factor))}${pair('Plåttjocklek, t', `${n(p.t)} mm`)}${pair('Höjd vid skjuv-/böjsnitt, a', `${n(p.a)} mm`)}${pair('Bredd vid dragsnitt, b', `${n(p.b)} mm`)}${pair('Momentarm, L', `${n(p.lever)} mm`)}${pair('Tyngdacceleration, g', `${n(g)} m/s²`)}${pair('Tillåten normalspänning, σ<sub>till</sub>', `${n(allowableStress, 0)} MPa`)}${pair('Tillåten medelskjuvspänning, τ<sub>till</sub>', `${n(allowableShear, 0)} MPa`)}${pair('Lastfördelning', 'F/2 per sida')}</dl>
        ${diagram(p)}
        <p class="report-copy">Schematisk figur, inte skalenlig. Måtten och lastens momentarm anges direkt av användaren. Två symmetriska sidor antas bära lika stor last; egenvikt försummas. Den nedre håldetaljen kräver separat C1-kontroll.</p>
        <h2>02 / Areor och antaget böjmotstånd per sida</h2><div class="report-equation">${sectionEquations}</div>
        <p class="report-source">Källa: Beräkning - C2.pdf, sida 1. Underlaget saknar ifyllda värden för last, mått och böjmotstånd. W<sub>x</sub> = ta²/6 är härlett för ett massivt rektangulärt böjsnitt med höjd a och bredd t. De förifyllda måtten i programmet är endast ett illustrativt exempel.</p>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>03 / Kraft inklusive säkerhetsfaktor</h2><div class="report-equation">${loadEquations}</div>
        <h2>04 / Skjuvning enligt underlaget</h2><div class="report-equation">${shearEquations}${check('Skjuvvillkor, τ ≤ 213 MPa', p.shearUtilization)}</div>
        <p class="report-copy">τ är medelskjuvspänning på två snitt med area a·t vardera. Underlagets uttryck används direkt, utan faktor 1,5.</p>
        <h2>05 / Böjning per sida</h2><div class="report-equation">${bendingEquations}${check('Böjvillkor, σB ≤ 355 MPa', p.bendingUtilization)}</div>
        <h2>06 / Drag och summerad spänning enligt underlaget</h2><div class="report-equation">${combinedEquations}${check('Summavillkor, σB + σD ≤ 355 MPa', p.totalUtilization)}</div>
        <p class="report-copy">Summeringen σ<sub>B</sub> + σ<sub>D</sub> följer PDF:ens beräkningskonvention. Den visar inte att spänningarnas maxima uppträder i samma materialpunkt och är ingen separat von Mises-kontroll. Redovisad styrande nyttjandegrad är max(u<sub>τ</sub>, u<sub>str</sub>) = <b>${n(p.utilization * 100)} %</b>.</p>
        <div class="report-limits"><b>Avgränsning: hela lastörat är inte verifierat.</b> Underlagets hänvisning ”Beräknas med C1 standard” gäller en separat kontroll. C1 finns nu som eget beräkningsfall för två lika skjuvytor; välj verkliga snittmått K och t där. C1 utförs inte automatiskt i denna rapport och verifierar inte hela håldetaljen. Hålkanttryck, nettosnitt vid hålet, utrivning, spänningskoncentrationer och utmattning ingår inte. Vippning och nedböjning beräknas inte. Rapporten styrker inte uppfyllelse av SS-EN 13155.</div>
        ${footer}</section>
    </article>`;
  }
  const api = { render, diagram };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.C2Report = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
