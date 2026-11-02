(function (root) {
  'use strict';
  const beam = typeof module !== 'undefined' && module.exports ? require('./beam.js') : root.Beam;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pair = (name, value) => `<div><dt>${name}</dt><dd>${value}</dd></div>`;
  function render(profileName, input, reference = '', date = new Date()) {
    beam.validate(input);
    const profile = beam.profiles.find(p => p.name === profileName);
    if (!profile) throw new RangeError('Välj en profil ur tabellen.');
    const p = beam.evaluate(profile, input);
    const L = input.span, fy = input.fy, k = input.factor;
    const bendingOK = p.utilization <= 1;
    const shearOK = p.shearRatio <= 0.5;
    const timestamp = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'long', timeStyle: 'short' }).format(date);
    const header = page => `<div class="report-masthead"><b>Beamconfigurator</b><span>KONTROLLBERÄKNING · ${page}/2</span></div>`;
    const footer = `<div class="report-footer"><span>Beamconfigurator v0.3 · Tibnor 2023</span><span>Preliminär kontroll av balkdelen</span></div>`;
    return `<article class="calculation-report">
      <section class="report-page">${header(1)}
        <div class="report-title"><p class="report-kicker">LYFTOK · SYMMETRISKT MITTLYFT</p><h1>Kontrollberäkning</h1><p class="report-profile">${escape(p.name)}</p><p>${reference.trim() ? `Referens: ${escape(reference.trim())}<br>` : ''}${escape(timestamp)} · Europe/Stockholm</p></div>
        <div class="report-verdict ${bendingOK && shearOK ? 'report-pass' : 'report-fail'}"><b>${bendingOK ? 'Böjkontroll: uppfyller beräkningsvillkoret' : 'Böjkontroll: överskrider beräkningsvillkoret'}</b><span>${shearOK ? 'Förenklat skjuvvillkor V/V_Rd ≤ 50 % uppfyllt.' : 'Fördjupad skjuv-/böjinteraktionskontroll krävs.'} Detta är inget godkännande av ett komplett lyftredskap.</span></div>
        <div class="report-highlights"><div><span>Böjspänning σ</span><strong>${n(p.stress)} <small>MPa</small></strong></div><div><span>Böjutnyttjande η</span><strong>${n(p.utilization * 100)} <small>%</small></strong></div><div><span>Nedböjning δ</span><strong>${n(p.deflection)} <small>mm</small></strong></div></div>
        <h2>01 / Indata och material</h2><dl class="report-data">${pair('C-c lastpunkter, L', `${n(L, 0)} mm`)}${pair('Total lastvikt, m', `${n(input.mass)} kg`)}${pair('Last per ände', `${n(input.mass / 2)} kg`)}${pair('Lastfaktor, k', n(k))}${pair('Antagen sträckgräns, f_y', `${n(fy, 0)} MPa (S${fy})`)}${pair('Materialfaktor, γ_M', '1,00')}${pair('Elasticitetsmodul, E', '210 000 MPa')}${pair('Tyngdacceleration, g', '9,81 m/s²')}</dl>
        <h2>02 / Tabellerade sektionsdata</h2><dl class="report-data">${pair('Elastiskt böjmotstånd, W_el', `${n(p.W / 1000)} cm³ = ${n(p.W, 0)} mm³`)}${pair('Tröghetsmoment, I', `${n(p.I / 10000)} cm⁴ = ${n(p.I, 0)} mm⁴`)}${pair('Vikt per meter, g_b', `${n(p.mass)} kg/m`)}${pair('Balkens egenvikt, m_b', `${n(p.beamMass)} kg`)}${pair('Tvärsnittsarea, A', `${n(p.area, 0)} mm²`)}${pair('Böjaxel', 'y (kvadratisk profil: I_y = I_z)')}</dl>
        <p class="report-source">Källa: Tibnors konstruktionstabeller 2023, avsnitt 008 VKR-rör, tryckt sida ${p.sourcePage} (PDF-sida 11). Kvadratiska S355J2H enligt SS-EN 10210. Elastiskt W_el används, inte plastiskt W_pl. I och W behåller källans oberoende avrundning.${fy === 235 ? ' S235 är ett hållfasthetsantagande för samma geometri; källtabellen gäller S355J2H.' : ''}</p>
        <h2>03 / Lastmodell</h2><div class="report-beam"><span>↑ Mittlyft</span><div></div><p><b>↓ ${n(p.force / 2000)} kN</b><span>L = ${n(L, 0)} mm</span><b>↓ ${n(p.force / 2000)} kN</b></p></div><p class="report-copy">Två lika vertikala ändlaster. Balklängd = c-c. Varje balkhalva har längden L/2. Balkens egenvikt verkar jämnt längs hela balken. Nedböjningen avser ändarna relativt mittlyftet.</p>
        ${footer}</section>
      <section class="report-page">${header(2)}
        <h2>04 / Dimensionerande böjmoment</h2>
        <div class="report-equation"><b>P = m · g = ${n(input.mass)} · 9,81 = ${n(p.force)} N</b><br>q = g_b · g / 1 000 = ${n(p.mass)} · 9,81 / 1 000 = ${n(p.lineLoad, 5)} N/mm<br>M_last = k · P · L / 4 = ${n(k)} · ${n(p.force)} · ${n(L, 0)} / 4 = ${n(p.momentLoad / 1e6, 4)} kNm<br>M_egenvikt = k · q · L² / 8 = ${n(k)} · ${n(p.lineLoad, 5)} · ${n(L, 0)}² / 8 = ${n(p.momentSelf / 1e6, 4)} kNm<br><strong>M_Ed = M_last + M_egenvikt = ${n(p.moment / 1e6, 4)} kNm = ${n(p.moment, 2)} Nmm</strong></div>
        <h2>05 / Böjspänning och utnyttjandegrad</h2>
        <div class="report-equation">σ = M_Ed / W_el = ${n(p.moment, 2)} / ${n(p.W, 0)} = <strong>${n(p.stress)} MPa</strong><br>f_yd = f_y / γ_M = ${n(fy, 0)} / 1,00 = ${n(fy, 0)} MPa<br>η = σ / f_yd = ${n(p.stress, 4)} / ${n(fy, 0)} = <strong>${n(p.utilization * 100)} %</strong><br>Villkor: σ ≤ f_yd, motsvarande η ≤ 100 % → <b>${bendingOK ? 'UPPFYLLT' : 'ÖVERSKRIDET'}</b></div>
        <h2>06 / Nedböjning vid brukslast</h2>
        <div class="report-equation">δ_last = P · L³ / (48 · E · I)<br>= ${n(p.force)} · ${n(L, 0)}³ / (48 · 210 000 · ${n(p.I, 0)}) = ${n(p.deflectionLoad, 4)} mm<br>δ_egenvikt = q · L⁴ / (128 · E · I)<br>= ${n(p.lineLoad, 5)} · ${n(L, 0)}⁴ / (128 · 210 000 · ${n(p.I, 0)}) = ${n(p.deflectionSelf, 4)} mm<br><strong>δ = δ_last + δ_egenvikt = ${n(p.deflection, 4)} mm</strong></div><p class="report-copy">Ofaktorerad last. Lastfaktorn k används inte för nedböjningen. Inget gränsvärde har angetts; nedböjningen redovisas utan godkänd/underkänd-bedömning. Beräkningen använder full precision; insatta värden visas avrundade.</p>
        <h2>07 / Skjuvvillkor och beräkningens omfattning</h2>
        <p class="report-copy">Separat geometrisk uppskattning: A_v = 2t(h − 6t) = ${n(p.shearArea)} mm².<br>V_Ed = k(P/2 + qL/2) = ${n(p.shear / 1000)} kN. V_Rd = A_v · f_y / √3 = ${n(p.shearCapacity / 1000)} kN.<br>V_Ed / V_Rd = ${n(p.shearRatio * 100)} % → <b>${shearOK ? '≤ 50 %, modellens villkor uppfyllt' : '> 50 %, interaktionskontroll krävs'}</b>.</p>
        <div class="report-limits">Statisk, vertikal och symmetrisk last. Materialfaktor 1,0 och vald lastfaktor är beräkningsantaganden. Lokal buckling/tvärsnittsklass, vippning, dynamik, utmattning, snedlast, hål, lyftöron, svetsar och lokal kraftintroduktion ingår inte. Tillgänglighet och material ska verifieras. Fullständig konstruktionskontroll enligt tillämpliga krav, exempelvis EN 13155, krävs före tillverkning och användning.</div>
        ${footer}</section>
    </article>`;
  }
  const api = { render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BeamReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
