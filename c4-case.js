(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const registry = commonJS ? require('./load-cases.js').registry : root.LoadCases;
  const model = commonJS ? require('./c4.js') : root.C4Calculations;
  const report = commonJS ? require('./c4-report.js') : root.C4Report;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const metric = (label, value, unit = '', digits = 2) => `<div><span>${label}</span><strong>${n(value, digits)} <small>${unit}</small></strong></div>`;
  const definition = {
    id: 'c4', title: 'C4 – lastkrok', category: 'components', view: 'calculation',
    description: 'Lastkrok enligt ”Rutin_Beräkning av C4 - Lastkrok.pdf”: medelskjuvning, konsolböjning och böjnedböjning.',
    fields: [
      { name: 'mass', label: 'Lastvikt m', unit: 'kg', default: 125, min: 0.001, max: 1000000, help: 'Källexemplet använder 125 kg.' },
      { name: 'factor', label: 'Säkerhetsfaktor n', default: 2, min: 1, max: 10, help: 'Enligt C4 används n i både spänningskontroller och böjnedböjning.' },
      { name: 'k', label: 'Tvärsnittshöjd K', unit: 'mm', default: 25, min: 0.1, max: 5000, help: 'Höjd i böjplanet. Area A = K·t, böjmotstånd Wₓ = t·K²/6.' },
      { name: 't', label: 'Plåttjocklek t', unit: 'mm', default: 10, min: 0.1, max: 1000 },
      { name: 'innerDiameter', label: 'Invändig diameter Øᵢₙₙₑ', unit: 'mm', default: 20, min: 0.1, max: 20000, help: 'Hävarmen beräknas som L = K/2 + Øᵢₙₙₑ/2. Källexemplet ger L = 22,5 mm.' }
    ],
    assumptions: [
      'Källa: ”Rutin_Beräkning av C4 - Lastkrok.pdf”, sida 1. Startvärdena motsvarar källexemplet: m = 125 kg, n = 2, K = 25 mm, t = 10 mm och Øᵢₙₙₑ = 20 mm.',
      'F = m·g·n med g = 9,82 m/s². Area A = K·t. Medelskjuvspänningen τ = F/A jämförs med τₜᵢₗₗ = 0,6·355 = 213 MPa, utan faktor 1,5.',
      'Konsolens längd sätts till L = K/2 + Øᵢₙₙₑ/2. Wₓ = t·K²/6 och Iₓ = t·K³/12. Mmax = −F·L och σ = Mmax/Wₓ. Spänningens belopp jämförs med 355 MPa.',
      'Böjnedböjning enligt C4: f = F·L³/(3·E·Iₓ), E = 210 000 MPa. Kraften F innehåller här säkerhetsfaktorn n, precis som i PDF:en. Inget gränsvärde för f anges och ingen nedböjningsbedömning görs.',
      'Programmet behåller full precision i Wₓ och Iₓ. Källans avrundade mellanvärden kan därför ge små skillnader: exakt böjspänning i exemplet är −53,028 MPa, jämfört med skissens −53,011 MPa från Wₓ ≈ 1 042 mm³.',
      'Detta återger underlagets nominella raka konsolmodell, inte en analys av den verkliga krökta kroken. Skjuvdeformation, krökt-balkspänningar, hål/anslutningar, kontakttryck, spänningskoncentrationer, utmattning och vippning ingår inte. Resultatet intygar inte fullständig hållfasthet eller uppfyllelse av SS-EN 13155.'
    ],
    calculate: model.calculate,
    diagram: report.diagram,
    renderResults(result) {
      return `<div class="case-verdict ${result.utilization <= 1 ? '' : 'case-fail'}"><b>${result.utilization <= 1 ? 'De redovisade C4-snittvillkoren uppfylls' : 'Minst ett redovisat C4-snittvillkor överskrids'}</b><p>Nominell kontroll enligt PDF:ens raka konsolmodell. Den verkliga lastkroken är inte fullständigt verifierad.</p></div><div class="metrics">${metric('Medelskjuvspänning τ', result.shearStress, 'MPa')}${metric('Skjuvnyttjande uτ (213 MPa)', result.shearUtilization * 100, '%')}${metric('Böjspänningens belopp |σ|', result.bendingStress, 'MPa')}${metric('Böjnyttjande uσ (355 MPa)', result.bendingUtilization * 100, '%')}${metric('Böjnedböjning f enligt C4', result.deflection, 'mm', 6)}${metric('Styrande C4-snittnyttjande', result.utilization * 100, '%')}</div><div class="stability-result"><h3>Last och konsoldata</h3><div class="metrics">${metric('Kraft F = mgn', result.force, 'N')}${metric('Beräknad hävarm L', result.lever, 'mm')}${metric('Moment Mmax = −FL', result.signedMoment, 'Nmm')}${metric('Böjmotstånd Wₓ', result.W, 'mm³')}${metric('Tröghetsmoment Iₓ', result.I, 'mm⁴')}${metric('Area A = Kt', result.area, 'mm²')}</div><p>Böjnedböjningen använder den faktoriserade kraften F. Skjuvdeformation och nedböjningsgräns ingår inte.</p></div>`;
    },
    renderReport: ({ input, reference }) => report.render(input, reference)
  };
  registry.register(definition);
  if (commonJS) module.exports = definition;
})(typeof globalThis !== 'undefined' ? globalThis : this);
