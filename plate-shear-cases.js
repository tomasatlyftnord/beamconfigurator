(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const registry = commonJS ? require('./load-cases.js').registry : root.LoadCases;
  const model = commonJS ? require('./plate-shear.js') : root.PlateShearCalculations;
  const report = commonJS ? require('./plate-shear-report.js') : root.PlateShearReport;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const metric = (label, value, unit = '', digits = 2) => `<div><span>${label}</span><strong>${n(value, digits)} <small>${unit}</small></strong></div>`;
  const cases = [
    { id: 'c1', title: 'C1 – ändplåt', source: 'Beräkning - C1.pdf', planes: 2, description: 'Ändplåt enligt PDF-underlaget. Två lika skjuvytor A₁ och A₂, vardera K·t, delar på kraften F.' },
    { id: 'l1', title: 'L1 – skjuvkontroll', source: 'Beräkning - L1.pdf', planes: 1, description: 'Skjuvkontroll enligt L1-skissen. En skjuvyta K·t belastas av hela kraften F.' }
  ];
  for (const spec of cases) {
    registry.register({
      id: spec.id, title: spec.title, category: 'components', view: 'calculation', description: spec.description,
      fields: [
        { name: 'mass', label: 'Lastvikt m', unit: 'kg', default: 400, min: 0.001, max: 1000000, help: 'Last på denna detalj före säkerhetsfaktor. PDF:en saknar ifyllt lastvärde; startvärdet är ett exempel.' },
        { name: 'factor', label: 'Säkerhetsfaktor n', default: 2, min: 1, max: 10, help: 'PDF:ens värde n = 2 är förvalt.' },
        { name: 'k', label: 'Skjuvsnittets höjd K', unit: 'mm', default: 25, min: 0.1, max: 20000, help: spec.planes === 2 ? 'Höjd för var och en av de två lika skjuvytorna enligt C1-skissen.' : 'Höjd i den enda skjuvyta som markerats i L1-skissen.' },
        { name: 't', label: 'Plåttjocklek t', unit: 'mm', default: 10, min: 0.1, max: 20000 }
      ],
      assumptions: [
        `Källa: ”${spec.source}”, sida 1. m, K och t är inte ifyllda i underlaget; de förifyllda värdena är illustrativa exempel. g = 9,82 m/s² och n = 2 är angivna i källan.`,
        `Kraft F = m·g·n. Area per skjuvyta A = K·t. ${spec.planes === 2 ? 'C1 har två lika skjuvytor A₁ = A₂ = A, vilket ger total skjuvarea 2A och kraft F/2 per yta.' : 'L1 har en skjuvyta A som belastas med hela F.'}`,
        `Medelskjuvspänning enligt underlaget: ${spec.planes === 2 ? 'τ = F/(2·K·t).' : 'τ = F/(K·t).'} Tillåten medelskjuvspänning är τₜᵢₗₗ = 0,6·355 = 213 MPa. Nyttjandegrad u = τ/213. Ingen faktor 1,5 eller ersättning med 355/√3 används.`,
        'Endast den markerade nominella skjuvkontrollen utförs. Egenvikt försummas. Håldiameter, anliggning och verkliga snittmått härleds inte automatiskt; användaren anger K och t enligt den aktuella detaljen.',
        'Hålkanttryck, drag/nettosnitt, böjning, kontakttryck, radier/spänningskoncentrationer, svetsar, utmattning, vippning och nedböjning verifieras inte. Ett uppfyllt skjuvvillkor är inte en fullständig verifiering av detaljen eller SS-EN 13155.'
      ],
      calculate: model[spec.id],
      diagram: input => report.diagram(spec.id, input),
      renderResults(result) {
        return `<div class="case-verdict ${result.utilization <= 1 ? '' : 'case-fail'}"><b>${result.utilization <= 1 ? 'Det redovisade skjuvvillkoret uppfylls' : 'Det redovisade skjuvvillkoret överskrids'}</b><p>${spec.planes === 2 ? 'C1: två lika skjuvytor, F/2 per yta.' : 'L1: en skjuvyta med hela F.'} Resultatet avser enbart källans nominella skjuvkontroll.</p></div><div class="metrics">${metric('Medelskjuvspänning τ', result.shearStress, 'MPa', 3)}${metric('Skjuvnyttjande uτ (213 MPa)', result.utilization * 100, '%')}${metric('Kraft F = mgn', result.force, 'N')}${metric('Kraft per skjuvyta', result.forcePerPlane, 'N')}${metric('Area A = Kt per skjuvyta', result.areaPerPlane, 'mm²')}${metric('Total verksam skjuvarea', result.totalShearArea, 'mm²')}</div><div class="stability-result"><h3>Skjuvytor enligt ${spec.id.toUpperCase()}</h3><p>${spec.planes === 2 ? 'Två lika skjuvytor A₁ och A₂. τ = F/(2A).' : 'En skjuvyta A. τ = F/A.'} τₜᵢₗₗ = 213 MPa. Inga andra brottmoder är bedömda.</p></div>`;
      },
      renderReport: ({ input, reference }) => report.render(spec.id, input, reference)
    });
  }
  if (commonJS) module.exports = cases;
})(typeof globalThis !== 'undefined' ? globalThis : this);
