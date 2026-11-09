(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const registry = commonJS ? require('./load-cases.js').registry : root.LoadCases;
  const model = commonJS ? require('./c2.js') : root.C2Calculations;
  const report = commonJS ? require('./c2-report.js') : root.C2Report;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const metric = (label, value, unit = '') => `<div><span>${label}</span><strong>${n(value)} <small>${unit}</small></strong></div>`;
  const definition = {
    id: 'c2', title: 'C2 – lastöra', category: 'components', view: 'calculation',
    description: 'Snittkontroller av lastöra enligt ”Beräkning - C2.pdf”: två lika belastade sidor, skjuvning, böjning och drag.',
    fields: [
      { name: 'mass', label: 'Lastvikt m', unit: 'kg', default: 400, min: 0.001, max: 1000000, help: 'Total lastvikt före säkerhetsfaktor. PDF:en hänvisar till lasten från momentberäkningen.' },
      { name: 'factor', label: 'Säkerhetsfaktor n', default: 2, min: 1, max: 10, help: 'PDF:ens värde är n = 2. Resultatet räknas om om du väljer ett annat värde.' },
      { name: 't', label: 'Plåttjocklek t', unit: 'mm', default: 10, min: 0.1, max: 1000 },
      { name: 'a', label: 'Höjd a vid övre skjuv-/böjsnitt', unit: 'mm', default: 40, min: 0.1, max: 5000, help: 'Varje sida har skjuvarea a·t. Böjmotståndet antas vara Wₓ = t·a²/6.' },
      { name: 'b', label: 'Bredd b vid dragsnitt', unit: 'mm', default: 30, min: 0.1, max: 5000, help: 'Två dragsnitt med area b·t per sida.' },
      { name: 'lever', label: 'Momentarm L', unit: 'mm', default: 40, min: 0.1, max: 20000, help: 'Direkt inmatad momentarm enligt skissen. Böjmoment per sida är (F/2)·L.' }
    ],
    assumptions: [
      'Källa: användarens ”Beräkning - C2.pdf”, sida 1. PDF:en saknar numeriska värden för last och geometri; de förifyllda värdena är endast ett illustrativt exempel.',
      'F = m·g·n med g = 9,82 m/s². Två lika belastade sidor ger kraft F/2 per sida. Egenvikt ingår inte.',
      'Skjuvning enligt PDF: τ = F/(2·a·t), jämförd med τₜᵢₗₗ = 213 MPa. Det är medelskjuvspänning; ingen faktor 1,5 läggs till.',
      'Böjning enligt PDF: Mᵦ = (F/2)·L och σᵦ = Mᵦ/Wₓ. Skissens nämnare är ofylld. Här antas ett massivt rektangulärt böjsnitt med Wₓ = t·a²/6.',
      'Drag enligt PDF: σᴅ = F/(2·b·t). Därefter summeras σₛₜᵣ = σᵦ + σᴅ enligt dokumentets metod och jämförs med 355 MPa. Detta är PDF:ens nominella spänningssumma, ingen lokal analys av samma materialpunkt.',
      'C1-skjuvkontrollen finns som separat beräkningsfall och körs inte automatiskt här. Ange last och verkliga snittmått K och t i C1; C2:s a och b överförs inte automatiskt. Hålkanttryck, nettosnitt vid hålet, utrivning, spänningskoncentrationer, utmattning, vippning och nedböjning beräknas inte här. Resultatet verifierar inte ett komplett lastöra eller uppfyllelse av SS-EN 13155.'
    ],
    calculate: model.calculate,
    diagram: report.diagram,
    renderResults(result) {
      return `<div class="case-verdict ${result.utilization <= 1 ? '' : 'case-fail'}"><b>${result.utilization <= 1 ? 'De redovisade C2-snittvillkoren uppfylls' : 'Minst ett redovisat C2-snittvillkor överskrids'}</b><p>Beräknat enligt PDF:ens nominella snittmetod. Hål-/C1-kontrollen ingår inte.</p></div><div class="metrics">${metric('Skjuvspänning τ', result.shearStress, 'MPa')}${metric('Skjuvnyttjande uτ (213 MPa)', result.shearUtilization * 100, '%')}${metric('Böjspänning σᵦ', result.bendingStress, 'MPa')}${metric('Böjnyttjande uᵦ (355 MPa)', result.bendingUtilization * 100, '%')}${metric('Dragspänning σᴅ', result.tensionStress, 'MPa')}${metric('Spänningssumma σᵦ + σᴅ', result.totalStress, 'MPa')}${metric('Nyttjande för summan (355 MPa)', result.totalUtilization * 100, '%')}${metric('Styrande C2-snittnyttjande', result.utilization * 100, '%')}</div><div class="stability-result"><h3>Last och tvärsnitt</h3><div class="metrics">${metric('Dimensionerande kraft F = mgn', result.force / 1000, 'kN')}${metric('Kraft per sida F/2', result.loadPerSide / 1000, 'kN')}${metric('Böjmoment per sida', result.moment / 1e6, 'kNm')}${metric('Antaget böjmotstånd Wₓ', result.W / 1000, 'cm³')}</div><p>σₜᵢₗₗ = 355 MPa · τₜᵢₗₗ = 213 MPa · två lika belastade sidor.</p></div>`;
    },
    renderReport: ({ input, reference }) => report.render(input, reference)
  };
  registry.register(definition);
  if (commonJS) module.exports = definition;
})(typeof globalThis !== 'undefined' ? globalThis : this);
