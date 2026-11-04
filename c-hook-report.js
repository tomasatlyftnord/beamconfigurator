(function (root) {
  'use strict';
  const engine = typeof module !== 'undefined' && module.exports ? require('./calculations.js') : root.EngineeringCalculations;
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
  const pair = (title, value) => `<div><dt>${title}</dt><dd>${value}</dd></div>`;
  function diagram(input) {
    return `<svg viewBox="0 0 560 210" role="img" aria-label="C-krok med lika armlängder och motriktade vertikala krafter" style="display:block;width:100%;height:135px;margin:8px 0;font-family:Arial,sans-serif">
      <path d="M140 45 H365 M140 45 V165 H365" fill="none" stroke="#FFD200" stroke-width="22"/>
      <g stroke="#003152" stroke-width="2"><path d="M365 45 V10 M359 20 L365 10 L371 20 M365 165 V200 M359 190 L365 200 L371 190" fill="none"/><path d="M140 24H365M140 19V29M365 19V29M108 45V165M103 45H113M103 165H113" stroke-width="1"/></g>
      <g fill="#003152" font-size="14"><text x="148" y="15">L₁ = L₂ = ${n(input.reach, 0)} mm</text><text x="27" y="109">L = ${n(input.opening, 0)} mm</text><text x="380" y="24">F ↑</text><text x="380" y="199">F ↓</text><text x="190" y="102">h = ${n(input.h, 0)} mm</text><text x="190" y="122">t = ${n(input.b, 0)} mm</text></g>
    </svg>`;
  }
  function render(input, reference = '') {
    // Recompute from validated current input, never trust stale UI result objects.
    const p = engine.cHook(input);
    const { E, G, g, allowableStress, allowableShear } = engine.constants;
    const locallyOK = p.utilization <= 1;
    const rootIdeal = input.rootRestraint === undefined || input.rootRestraint === 'ideal';
    const loadCentre = input.loadPosition === undefined || input.loadPosition === 'centre';
    const slenderArm = input.reach / input.h >= 10;
    const plateLike = input.b <= input.h;
    const ltbApplicable = rootIdeal && loadCentre && slenderArm && plateLike;
    const header = page => `<div class="report-masthead"><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = '<div class="report-footer"><span>Förenklad snittkontroll av C-krok</span></div>';
    const F = symbol('F'), N = symbol('N'), V = symbol('V'), M = symbol('M_x'), A = symbol('A'), W = symbol('W_x');
    const forceEquations = [
      equation(F, product(symbol('m'), symbol('g')), product(value(input.mass), value(g)), result(p.force, 'N')),
      equation(symbol('F_n'), product(symbol('n'), F), product(value(input.factor), value(p.force)), result(p.designForce, 'N')),
      equation(M, product(symbol('F_n'), symbol('L_1')), product(value(p.designForce), value(input.reach, 0)), result(p.moment / 1e6, 'kNm', 4)),
      equation(N, V, result(p.designForce, 'N'))
    ].join('');
    const stressEquations = [
      equation(symbol('σ_b'), fraction(M, W), fraction(value(p.moment), value(p.W)), result(p.bendingStress, 'MPa')),
      equation(symbol('σ_N'), fraction(N, A), fraction(value(p.axialForce), value(p.area)), result(p.normalStress, 'MPa')),
      equation(symbol('σ_rygg'), `${symbol('σ_N')}${op('+')}${symbol('σ_b')}`, result(p.backStress, 'MPa')),
      equation(symbol('τ_arm'), fraction(product(value(1.5), V), A), fraction(product(value(1.5), value(p.shear)), value(p.area)), result(p.shearStress, 'MPa'))
    ].join('');
    const sectionEquations = [
      equation(A, product(symbol('t'), symbol('h')), result(p.area, 'mm²')),
      equation(symbol('I_x'), fraction(product(symbol('t'), power(symbol('h'), 3)), value(12, 0)), result(p.I, 'mm⁴', 0)),
      equation(W, fraction(product(symbol('t'), power(symbol('h'), 2)), value(6, 0)), result(p.W, 'mm³', 0))
    ].join('');
    const criticalMoment = p.armCriticalMoment;
    const stabilityEquations = ltbApplicable ? [
      equation(symbol('I_z'), fraction(product(symbol('h'), power(symbol('t'), 3)), value(12, 0)), result(p.armLateralI, 'mm⁴', 0)),
      equation(symbol('I_t'), result(p.armTorsionConstant, 'mm⁴', 0)),
      equation(symbol('M_cr'), product(fraction(value(4.013, 3), symbol('L_2')), `<msqrt><mrow>${product(symbol('E'), symbol('I_z'), symbol('G'), symbol('I_t'))}</mrow></msqrt>`), result(criticalMoment / 1e6, 'kNm', 4)),
      equation(fraction(M, symbol('M_cr')), value(p.armStabilityRatio, 4))
    ].join('') : '<p class="equation-condition">M<sub>cr</sub> och momentkvoten redovisas inte eftersom konsolmodellens upplags-, last- eller geometriförutsättningar inte är uppfyllda.</p>';
    return `<article class="calculation-report hook-calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">C-KROK · MASSIVT REKTANGULÄRT TVÄRSNITT</p><h1>Kontrollberäkning</h1><p class="report-profile">Utskuren plåt · rak C-ram</p>${reference.trim() ? `<p class="report-reference">Referens: ${escape(reference.trim())}</p>` : ''}</div>
        <div class="report-verdict ${locallyOK ? 'report-pass' : 'report-fail'}"><b>${locallyOK ? 'Lokala snittvillkor uppfylls i den förenklade balkmodellen.' : 'Lokala snittvillkor överskrids i den förenklade balkmodellen.'}</b><span>Detta är ingen verifiering av hela C-krokens hållfasthet eller stabilitet.</span></div>
        <div class="report-highlights"><div><span>Rygg: normal- och böjspänning</span><strong>${n(p.backStress)} <small>MPa</small></strong></div><div><span>Arm: maximal skjuvspänning</span><strong>${n(p.shearStress)} <small>MPa</small></strong></div><div><span>Styrande lokal nyttjandegrad</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div></div>
        <h2>01 / Indata och modell</h2><dl class="report-data">${pair('Lastvikt, m', `${n(input.mass)} kg`)}${pair('Säkerhetsfaktor, n', n(input.factor))}${pair('Armlängd, L₁ = L₂', `${n(input.reach)} mm`)}${pair('C-c mellan armarna, L', `${n(input.opening)} mm`)}${pair('Snitthöjd i plåtens plan, h', `${n(input.h)} mm`)}${pair('Plåttjocklek ur planet, t', `${n(input.b)} mm`)}${pair('Tillåten normalspänning, σ<sub>till</sub>', `${n(allowableStress, 0)} MPa`)}${pair('Tillåten skjuvspänning, σ<sub>till</sub>/√3', `${n(allowableShear)} MPa`)}${pair('Materialmoduler, E / G (ν = 0,30)', `${n(E, 0)} / ${n(G, 0)} MPa`)}${pair('Tyngdacceleration, g', `${n(g)} m/s²`)}</dl>
        ${diagram(input)}
        <p class="report-copy">Övre och undre krafter ligger på samma vertikala linje. L₁ och L₂ mäts från ryggens centrumlinje till kraftlinjen. Samma rektangulära snitt används i armar och rygg. Ryggen överför N och M, men ingen tvärskjuvkraft; armarna överför V och M. L påverkar inte de statiska snittkrafterna i denna modell.</p>
        <h2>02 / Snittdata</h2><div class="report-equation">${sectionEquations}</div>
        <p class="report-source">Egenvikt försummas. Modellen avser raka balkdelar; hörnradier, spänningskoncentrationer, hål, lokal kraftintroduktion och lokal buckling beräknas inte. Ingen öppningsdeformation eller nedböjning av hela C-ramen beräknas.</p>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>03 / Last och snittkrafter</h2><div class="report-equation">${forceEquations}</div>
        <h2>04 / Böjning, normalkraft och skjuvning</h2><div class="report-equation">${stressEquations}</div>
        <p class="report-copy">Ryggen kontrolleras med |σ<sub>N</sub>| + |σ<sub>b</sub>| ≤ 355 MPa. Armarna har böjning och skjuvning; maximal jämförelsespänning i det rektangulära snittet är max(|σ<sub>b</sub>|, √3|τ<sub>arm</sub>|). Styrande lokal nyttjandegrad blir max(|σ<sub>rygg</sub>|, √3|τ<sub>arm</sub>|)/355 = <b>${n(p.utilization * 100)} %</b>. Maximal böjspänning och maximal skjuvspänning uppträder på olika ställen i snittet.</p>
        <h2>05 / Vippning – idealiserad underarm</h2><div class="report-equation">${stabilityEquations}</div>${ltbApplicable && p.armStabilityRatio >= 1 ? '<p class="report-copy"><b>Momentkvoten är minst 1,00: det applicerade momentet når eller överskrider konsolmodellens elastiska kritiska moment.</b></p>' : ''}
        <p class="report-copy">I<sub>t</sub> uppskattas som ac³[1/3 − 0,21(c/a)(1 − c⁴/(12a⁴))], där a = max(h,t) och c = min(h,t). Saint-Venant-vridning används; välvstyvhet försummas. Kraftens angreppspunkt får inte flyttas till armens överkant utan en ny stabilitetsanalys. Gränsen L₂/h ≥ 10 är verktygets modellavgränsning, inte ett standardkrav. M<sub>cr</sub> avser en rak, prismatisk konsol med punktlast genom skjuvcentrum vid den fria änden och sid- och vridstyvt inspänd rot.</p>
        <div class="report-limits"><b>${ltbApplicable ? 'Idealiserad konsolmodell: sid- och vridstyv armrot och kraft genom skjuvcentrum antas.' : !rootIdeal ? 'Armrotens sid- och vridstyvhet är inte verifierad; konsolmodellen är inte tillämplig.' : !loadCentre ? 'Lasten verkar inte genom skjuvcentrum; denna konsolmodell är inte tillämplig.' : !slenderArm ? 'L₂/h är mindre än 10. Konsolmodellens gräns för en slank arm är inte uppfylld.' : 'Plåttjockleken t är större än snitthöjden h; modellen för den valda böjriktningen är inte tillämplig.'}</b> Kvoten M<sub>x</sub>/M<sub>cr</sub> är en jämförelse med ett idealt elastiskt kritiskt moment, inte en dimensionerande nyttjandegrad eller standardkontroll. Verklig flexibilitet i ryggen och samverkan mellan C-ramens delar kan ändra stabiliteten. Hela C-krokens stabilitet är inte verifierad, oavsett kvotens värde.</div>
        ${footer}</section>
    </article>`;
  }
  const api = { render, diagram };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CHookReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
