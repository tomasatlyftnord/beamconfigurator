(function (root) {
  'use strict';
  const engine = typeof module !== 'undefined' && module.exports ? require('./plate-shear.js') : root.PlateShearCalculations;
  const cases = {
    c1: { title: 'C1 – ändplåt', subtitle: 'Två lika bärande skjuvplan', source: 'Beräkning - C1.pdf', model: 'Två lika bärande skjuvplan A₁ och A₂ antas vid hålets sidor.' },
    l1: { title: 'L1 – skjuvkontroll', subtitle: 'Ett skjuvplan i bygelns krona', source: 'Beräkning - L1.pdf', model: 'Ett skjuvplan A antas i bygelns krona enligt underlagets skiss.' }
  };
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const symbol = name => { const [base, sub] = name.split('_'); return sub ? `<msub><mi>${base}</mi><mtext>${sub}</mtext></msub>` : `<mi>${base}</mi>`; };
  const value = (v, digits = 2) => `<mn>${n(v, digits)}</mn>`;
  const op = text => `<mo>${text}</mo>`;
  const product = (...terms) => terms.join(op('·'));
  const fraction = (top, bottom) => `<mfrac><mrow>${top}</mrow><mrow>${bottom}</mrow></mfrac>`;
  const result = (v, unit, digits = 2) => `${value(v, digits)}<mtext> ${unit}</mtext>`;
  const equation = (...terms) => `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mrow>${terms.join(op('='))}</mrow></math>`;
  const pair = (title, text) => `<div><dt>${title}</dt><dd>${text}</dd></div>`;
  function definition(caseId) {
    if (caseId !== 'c1' && caseId !== 'l1') throw new RangeError('Skjuvrapporten stöder endast beräkningsfall c1 och l1.');
    return cases[caseId];
  }

  function diagram(caseId, input) {
    definition(caseId);
    const p = engine[caseId](input);
    const geometry = caseId === 'c1' ? `<path d="M70 28H285V165Q177 245 70 165Z" fill="#FFD200" stroke="#003152" stroke-width="2"/>
      <circle cx="177" cy="86" r="35" fill="white" stroke="#003152" stroke-width="2"/>
      <path d="M142 86V198M212 86V198" stroke="#003152" stroke-width="2" stroke-dasharray="5 3"/>
      <path d="M177 121V239M171 229L177 239L183 229M110 158H137M217 158H244" fill="none" stroke="#003152" stroke-width="2"/>
      <g fill="#003152" font-size="14"><text x="87" y="154">A₁</text><text x="245" y="154">A₂</text><text x="187" y="238">F ↓</text></g>` : `<path d="M80 200A110 110 0 0 1 300 200H258A68 68 0 0 0 122 200Z" fill="#FFD200" stroke="#003152" stroke-width="2"/>
      <path d="M190 90V132" stroke="#003152" stroke-width="8" stroke-dasharray="3 3"/>
      <path d="M190 190V136M184 146L190 136L196 146M143 73L183 104M45 200Q65 211 85 200T125 200T165 200T205 200T245 200T285 200T325 200" fill="none" stroke="#003152" stroke-width="2"/>
      <g fill="#003152" font-size="14"><text x="123" y="72">A</text><text x="202" y="178">F ↑</text></g>`;
    return `<svg viewBox="0 0 560 250" role="img" aria-label="${caseId === 'c1' ? 'Ändplåt med hål och två skjuvplan A1 och A2' : 'Bygel med ett skjuvplan A i kronan'} och rektangulär skjuvarea K gånger t" style="display:block;width:100%;height:135px;margin:7px 0;font-family:Arial,sans-serif">
      ${geometry}<rect x="389" y="94" width="57" height="62" fill="#FFD200" stroke="#003152" stroke-width="2"/>
      <path d="M466 94V156M461 94H471M461 156H471M389 177H446M389 172V182M446 172V182" fill="none" stroke="#003152" stroke-width="1"/>
      <g fill="#003152" font-size="14"><text x="378" y="69">Area per plan</text><text x="407" y="130">A</text><text x="477" y="130">K</text><text x="413" y="195">t</text><text x="362" y="226">K = ${n(p.k)} mm · t = ${n(p.t)} mm</text></g>
    </svg>`;
  }

  function render(caseId, input, reference = '') {
    const config = definition(caseId);
    // Calculate from validated current input rather than reusing UI result objects.
    const p = engine[caseId](input);
    const { g, allowableShear, allowableStress } = engine.constants;
    const shearOK = p.utilization <= 1;
    const F = symbol('F'), A = symbol('A'), totalArea = symbol('A_tot');
    const areaTerms = caseId === 'c1' ? [symbol('A_1'), symbol('A_2')] : [A];
    const equations = [
      equation(F, product(symbol('m'), symbol('g'), symbol('n')), product(value(p.mass), value(g), value(p.factor)), result(p.force, 'N')),
      equation(...areaTerms, product(symbol('K'), symbol('t')), product(value(p.k), value(p.t)), result(p.areaPerPlane, 'mm²')),
      equation(totalArea, caseId === 'c1' ? `${symbol('A_1')}${op('+')}${symbol('A_2')}` : A, result(p.totalShearArea, 'mm²')),
      equation(symbol('τ'), fraction(F, totalArea), fraction(value(p.force), value(p.totalShearArea)), result(p.shearStress, 'MPa', 3)),
      equation(symbol('u'), fraction(symbol('τ'), symbol('τ_till')), fraction(value(p.shearStress, 3), value(allowableShear, 0)), result(p.utilization * 100, '%'))
    ].join('');
    return `<article class="calculation-report hook-calculation-report plate-shear-calculation-report">
      <section class="report-page"><div class="report-masthead"><span>SKJUVKONTROLL · 1/1</span></div>
        <div class="report-title"><p class="report-kicker">PLÅT · NOMINELL MEDELSKJUVSPÄNNING</p><h1>${config.title}</h1><p class="report-profile">${config.subtitle}</p>${String(reference).trim() ? `<p class="report-reference">Referens: ${escape(String(reference).trim())}</p>` : ''}</div>
        <div class="report-verdict ${shearOK ? 'report-pass' : 'report-fail'}"><b>${shearOK ? 'Det redovisade skjuvvillkoret uppfylls.' : 'Det redovisade skjuvvillkoret överskrids.'}</b><span>Resultatet gäller enbart de antagna skjuvplanen. Hela detaljens hållfasthet är inte verifierad.</span></div>
        <div class="report-highlights"><div><span>Kraft inklusive säkerhetsfaktor, F</span><strong>${n(p.force / 1000, 3)} <small>kN</small></strong></div><div><span>Medelskjuvspänning, τ</span><strong>${n(p.shearStress, 3)} <small>MPa</small></strong></div><div><span>Nyttjandegrad för skjuvning, u</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div></div>
        <h2>01 / Indata och skjuvmodell</h2><dl class="report-data">${pair('Lastvikt, m', `${n(p.mass)} kg`)}${pair('Säkerhetsfaktor, n', n(p.factor))}${pair('Längd i skjuvplanet, K', `${n(p.k)} mm`)}${pair('Plåttjocklek, t', `${n(p.t)} mm`)}${pair('Tyngdacceleration, g', `${n(g)} m/s²`)}${pair('Tillåten medelskjuvspänning, τ<sub>till</sub>', `${n(allowableShear, 0)} MPa`)}</dl>
        ${diagram(caseId, p)}
        <p class="report-copy">${config.model} Kraft per skjuvplan: F/${p.planes} = <b>${n(p.forcePerPlane)} N</b>. Area per plan: <b>${n(p.areaPerPlane)} mm²</b>; sammanlagd skjuvarea: <b>${n(p.totalShearArea)} mm²</b>. Figurerna är schematiska och inte skalenliga. Egenvikt försummas.</p>
        <h2>02 / Last, areor och skjuvvillkor</h2><div class="report-equation">${equations}<p class="equation-condition"><b>τ ≤ 213 MPa: ${n(p.utilization * 100)} % — ${shearOK ? 'skjuvvillkoret uppfylls' : 'skjuvvillkoret överskrids'}.</b></p></div>
        <p class="report-source">Källa: ${config.source}, sida 1. Lastvikt m och måtten K och t är inte ifyllda i underlaget. Programmets förifyllda värden är ett illustrativt exempel. Underlagets σ<sub>till</sub> = ${n(allowableStress, 0)} MPa används endast för sambandet τ<sub>till</sub> = 0,6σ<sub>till</sub> = 213 MPa; ingen normalspänningskontroll utförs. τ beräknas som medelskjuvspänning utan faktor 1,5.</p>
        <div class="report-limits"><b>Avgränsning: enbart nominell skjuvning kontrolleras.</b> Hålkanttryck, nettosnitt i drag, böjning i krökta delar, spänningskoncentrationer, svetsar, lokal stabilitet och utmattning ingår inte. Rapporten godkänner inte hela detaljen och styrker inte uppfyllelse av SS-EN 13155.</div>
        <div class="report-footer"><span>Förenklad skjuvkontroll · ${config.title}</span></div>
      </section>
    </article>`;
  }
  const api = { render, diagram };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PlateShearReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
