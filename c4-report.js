(function (root) {
  'use strict';
  const engine = typeof module !== 'undefined' && module.exports ? require('./c4.js') : root.C4Calculations;
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
    const p = engine.calculate(input);
    return `<svg viewBox="0 0 560 270" role="img" aria-label="Schematisk krökt lastkrok och idealiserad rak konsol, med höjd K, tjocklek t och innerdiameter" style="display:block;width:100%;height:155px;margin:8px 0;font-family:Arial,sans-serif">
      <path d="M148 32 V82 C148 117 108 143 105 180 C98 216 129 246 163 240 C191 238 210 221 217 195" fill="none" stroke="#003152" stroke-width="28" stroke-linecap="round"/>
      <path d="M148 32 V82 C148 117 108 143 105 180 C98 216 129 246 163 240 C191 238 210 221 217 195" fill="none" stroke="#FFD200" stroke-width="24" stroke-linecap="round"/>
      <rect x="335" y="120" width="155" height="43" fill="#FFD200" stroke="#003152" stroke-width="2"/>
      <g stroke="#003152" fill="none" stroke-width="2"><path d="M335 85V201 M335 93L322 106 M335 109L322 122 M335 125L322 138 M335 141L322 154 M335 157L322 170 M335 173L322 186 M335 189L322 202" stroke-width="1.5"/>
        <path d="M490 73V120 M484 110L490 120L496 110 M177 150V217 M171 207L177 217L183 207"/>
        <path d="M335 65H490 M335 60V70 M490 60V70 M510 120V163 M505 120H515 M505 163H515 M128 187H197 M128 182V192 M197 182V192" stroke-width="1"/>
      </g>
      <g fill="#003152" font-size="13"><text x="81" y="14">Schematisk lastkrok</text><text x="350" y="38">Rak konsolmodell</text><text x="406" y="57">L</text><text x="500" y="88">F</text><text x="188" y="161">F</text><text x="519" y="147">K</text><text x="345" y="187">t = ${n(p.t)} mm ur planet</text><text x="104" y="174">φ inne</text><text x="85" y="265">φ inne = ${n(p.innerDiameter)} mm</text><text x="336" y="220">K = ${n(p.k)} mm</text><text x="336" y="241">L = ${n(p.lever)} mm</text></g>
    </svg>`;
  }

  function render(input, reference = '') {
    // Recompute from current input so report and exported PDF cannot use stale results.
    const p = engine.calculate(input);
    const { g, E, allowableStress, allowableShear } = engine.constants;
    const allOK = p.utilization <= 1;
    const header = page => `<div class="report-masthead"><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = '<div class="report-footer"><span>Förenklad snittkontroll av lastkrok C4</span></div>';
    const F = symbol('F'), A = symbol('A'), L = symbol('L'), W = symbol('W_x'), I = symbol('I_x'), M = symbol('M_max'), stress = symbol('σ_max');
    const sectionEquations = [
      equation(A, product(symbol('K'), symbol('t')), product(value(p.k), value(p.t)), result(p.area, 'mm²')),
      equation(W, fraction(product(symbol('t'), power(symbol('K'), 2)), value(6, 0)), result(p.W, 'mm³', 3)),
      equation(I, fraction(product(symbol('t'), power(symbol('K'), 3)), value(12, 0)), result(p.I, 'mm⁴', 3))
    ].join('');
    const loadEquations = [
      equation(F, product(symbol('m'), symbol('g'), symbol('n')), product(value(p.mass), value(g), value(p.factor)), result(p.force, 'N')),
      equation(L, `${fraction(symbol('K'), value(2, 0))}${op('+')}${fraction(symbol('φ_inne'), value(2, 0))}`, `${fraction(value(p.k), value(2, 0))}${op('+')}${fraction(value(p.innerDiameter), value(2, 0))}`, result(p.lever, 'mm'))
    ].join('');
    const shearEquations = [
      equation(symbol('τ'), fraction(F, A), fraction(value(p.force), value(p.area)), result(p.shearStress, 'MPa')),
      equation(symbol('u_τ'), fraction(symbol('τ'), symbol('τ_till')), fraction(value(p.shearStress), value(allowableShear, 0)), result(p.shearUtilization * 100, '%'))
    ].join('');
    const bendingEquations = [
      equation(M, `${op('−')}${product(F, L)}`, `${op('−')}${product(value(p.force), value(p.lever))}`, result(p.signedMoment, 'Nmm')),
      equation(stress, fraction(M, W), fraction(value(p.signedMoment), value(p.W, 3)), result(p.signedStress, 'MPa', 3)),
      equation(symbol('u_σ'), fraction(`${op('|')}${stress}${op('|')}`, symbol('σ_till')), fraction(value(p.bendingStress, 3), value(allowableStress, 0)), result(p.bendingUtilization * 100, '%'))
    ].join('');
    const deflectionEquation = equation(symbol('f'), fraction(product(F, power(L, 3)), product(value(3, 0), symbol('E'), I)), fraction(product(value(p.force), power(value(p.lever), 3)), product(value(3, 0), value(E, 0), value(p.I, 3))), result(p.deflection, 'mm', 6));
    return `<article class="calculation-report hook-calculation-report c4-calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">C4 · LASTKROK I PLÅT</p><h1>Kontrollberäkning</h1><p class="report-profile">Förenklad rak konsolmodell</p>${String(reference).trim() ? `<p class="report-reference">Referens: ${escape(String(reference).trim())}</p>` : ''}</div>
        <div class="report-verdict ${allOK ? 'report-pass' : 'report-fail'}"><b>${allOK ? 'De redovisade C4-snittvillkoren uppfylls.' : 'Minst ett redovisat C4-snittvillkor överskrids.'}</b><span>Kontrollen avser underlagets nominella konsolmodell. Den krökta krokens fullständiga hållfasthet är inte verifierad.</span></div>
        <div class="report-highlights"><div><span>Medelskjuvspänning, τ</span><strong>${n(p.shearStress)} <small>MPa</small></strong></div><div><span>Böjspänningens belopp, |σ<sub>max</sub>|</span><strong>${n(p.bendingStress)} <small>MPa</small></strong></div><div><span>Konsolens nedböjning med n, f</span><strong>${n(p.deflection, 6)} <small>mm</small></strong></div></div>
        <h2>01 / Indata och beräkningsmodell</h2><dl class="report-data">${pair('Lastvikt, m', `${n(p.mass)} kg`)}${pair('Säkerhetsfaktor, n', n(p.factor))}${pair('Rektangulär snitthöjd, K', `${n(p.k)} mm`)}${pair('Plåttjocklek, t', `${n(p.t)} mm`)}${pair('Innerdiameter, φ inne', `${n(p.innerDiameter)} mm`)}${pair('Härledd momentarm, L = K/2 + φ inne/2', `${n(p.lever)} mm`)}${pair('Tyngdacceleration, g', `${n(g)} m/s²`)}${pair('Elasticitetsmodul, E', `${n(E, 0)} MPa`)}${pair('Tillåten normalspänning, σ<sub>till</sub>', `${n(allowableStress, 0)} MPa`)}${pair('Tillåten medelskjuvspänning, τ<sub>till</sub>', `${n(allowableShear, 0)} MPa`)}</dl>
        ${diagram(p)}
        <p class="report-copy">Figurerna är schematiska och inte skalenliga. Krokens nedre del ersätts av en rak, inspänd konsol med rektangulärt snitt K × t och punktlast vid fria änden. Samma faktor n används i kraft, spänningar och nedböjning. Egenvikt försummas.</p>
        <h2>02 / Rektangulära snittdata enligt underlaget</h2><div class="report-equation">${sectionEquations}</div>
        <p class="report-source">Källa: Rutin_Beräkning av C4 - Lastkrok.pdf, sida 1. Programmets förifyllda värden m = 125 kg, n = 2, K = 25 mm, t = 10 mm och φ inne = 20 mm återger källexemplet. Rapporten visar de indata som användaren har valt.</p>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>03 / Kraft inklusive säkerhetsfaktor och momentarm</h2><div class="report-equation">${loadEquations}</div>
        <h2>04 / Medelskjuvspänning</h2><div class="report-equation">${shearEquations}${check('Skjuvvillkor, τ ≤ 213 MPa', p.shearUtilization)}</div>
        <p class="report-copy">τ = F/A följer källans medelskjuvspänning; ingen faktor 1,5 används.</p>
        <h2>05 / Böjmoment och nominell böjspänning</h2><div class="report-equation">${bendingEquations}${check('Böjvillkor, |σmax| ≤ 355 MPa', p.bendingUtilization)}</div>
        <p class="report-copy">Minustecknet följer källans momentriktning. Spänningens belopp jämförs med 355 MPa. Styrande nyttjandegrad är max(u<sub>τ</sub>, u<sub>σ</sub>) = <b>${n(p.utilization * 100)} %</b>. Kontrollerna av skjuvning och böjning görs var för sig.</p>
        <h2>06 / Nedböjning med säkerhetsfaktor n</h2><div class="report-equation">${deflectionEquation}</div>
        <p class="report-copy">F = mgn används även här. f är böjbidraget till den raka konsolens nedböjning vid punktlasten, inte hela den krökta krokens deformation. Skjuvdeformation försummas; det är särskilt relevant för en kort och hög konsol (aktuellt L/K = ${n(p.lever / p.k)}). Underlaget anger ingen tillåten nedböjning; därför ges inget godkännandevillkor för f.</p>
        <p class="report-source">Alla mellanled beräknas med full precision. Källexemplet avrundar W<sub>x</sub> till 1 042 mm³ och I<sub>x</sub> till 13 021 mm⁴ och får cirka −53,011 MPa. Med oavrundade snittdata blir motsvarande spänning −53,028 MPa (belopp 53,03 MPa). Skillnaden beror på mellanavrundning.</p>
        <div class="report-limits"><b>Avgränsning: hela lastkroken är inte verifierad.</b> Modellen analyserar en rak konsol som ersättning för den krökta kroken. Spänningsfördelning enligt krökt balkteori, spänningskoncentrationer, hål, lokal kraftintroduktion, lokal stabilitet och utmattning beräknas inte. Ingen vippnings- eller kombinerad spänningskontroll ingår. Rapporten styrker inte uppfyllelse av SS-EN 13155.</div>
        ${footer}</section>
    </article>`;
  }
  const api = { render, diagram };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.C4Report = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
