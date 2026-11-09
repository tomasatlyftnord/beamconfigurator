(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const registry = commonJS ? require('./load-cases.js').registry : root.LoadCases;
  const model = commonJS ? require('./asymmetric-beam.js') : root.AsymmetricBeam;
  const report = commonJS ? require('./asymmetric-beam-report.js') : root.AsymmetricBeamReport;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const metric = (label, value, unit = '', digits = 2) => `<div><span>${label}</span><strong>${n(value, digits)} <small>${unit}</small></strong></div>`;
  const definition = {
    id: 'asymmetric-beam', title: 'Lyftok med asymmetriskt lyft', category: 'products', view: 'calculation', profileSelection: true,
    description: 'Valfri lyftpunkt mellan balkens ändar. Modellen räknar fram ändlasterna för jämvikt och väljer minsta Wₓ från VKR-tabellen.',
    fields: [
      { name: 'span', label: 'Balklängd / c-c lastpunkter L', unit: 'mm', default: 2000, min: 100, max: 20000, help: 'Lastpunkterna antas sitta i balkens vänstra och högra ände.' },
      { name: 'liftPosition', label: 'Lyftpunkt från vänster ände a', unit: 'mm', default: 500, min: 0, max: 20000, help: 'Måste vara större än 0 och mindre än L. Höger armlängd blir b = L − a.' },
      { name: 'mass', label: 'Maximal total lastvikt m', unit: 'kg', default: 1000, min: 0.001, max: 1000000, help: 'Totalvikt för båda ändlasterna. Fördelningen beräknas för jämvikt kring lyftpunkten.' },
      { name: 'factor', label: 'Säkerhetsfaktor n', default: 2, min: 1, max: 10, help: 'Används för böjmoment och böjspänning. Deformationen beräknas utan n.' }
    ],
    assumptions: [
      'Två vertikala lastpunkter i balkens ändar. En vertikal lyftkraft vid a från vänster ände. Balklängden är L och b = L − a. Egenvikt försummas.',
      'Lastfördelningen är den som modellen förutsätter för jämvikt: m_v = m·b/L och m_h = m·a/L. De verkliga ändlasterna måste motsvara denna fördelning; läget ensamt ändrar inte en verklig lasts tyngdpunkt.',
      'F = m·9,82, F_v = F·b/L och F_h = F·a/L. Största böjmomentet vid lyftpunkten är Mₓ = n·F_v·a = n·F_h·b = n·F·a·b/L. Tillåten spänning σₜᵢₗₗ = 355 MPa.',
      'Minsta elastiska böjmotstånd Wₓ väljs bland samma 65 kvadratiska VKR-profiler som i mittlyftsfallet. σ = Mₓ/Wₓ och u = σ/355. Rapportvalet kan göras för valfri profil i jämförelsetabellen.',
      'Deformation f mäts relativt den räta förbindelselinjen mellan balkens ändpunkter, inte som absolut ändhöjd. En ensam lyftpunkt låser inte balkens stela rotation. Vid a = L/2 blir modellen identisk med mittlyftets moment och böjdeformation.',
      'Med s = min(a,b) blir f_max = F·s·(L² − s²)^(3/2)/(9√3·E·I·L). Vid lyftpunkten blir f_a = F·a²·b²/(3·E·I·L). E = 210 000 MPa och brukslasten F används utan n. Inget deformationsgränsvärde används för profilvalet.',
      'Skjuvning, stabilitet, lyftöron, lokal kraftintroduktion, svetsar, utmattning och dynamik ingår inte. Resultatet är ingen fullständig verifiering av lyftredskap eller uppfyllelse av SS-EN 13155.'
    ],
    calculate: model.calculate,
    diagram: report.diagram,
    renderResults(result, input) {
      const { span: L, mass, liftPosition: a } = input;
      const b = L - a, p = result.chosen;
      const force = mass * model.constants.g;
      const loads = `<div class="case-loads"><h3>Lastfördelning för jämvikt</h3><div class="metrics">${metric('Vänster last mᵥ', mass * b / L, 'kg')}${metric('Höger last mₕ', mass * a / L, 'kg')}${metric('Vänster lastkraft Fᵥ', force * b / L / 1000, 'kN')}${metric('Höger lastkraft Fₕ', force * a / L / 1000, 'kN')}</div><p>Fördelningen förutsätts i modellen och måste motsvara de verkliga ändlasterna.</p></div>`;
      return loads + (p ? `<div class="case-verdict"><b>Minsta Wₓ som klarar böjvillkoret: ${p.name}</b><p>Tibnor 2023, sida ${p.sourcePage}. Välj profil för rapport i jämförelsetabellen.</p></div><div class="metrics">${metric('Böjmoment Mₓ vid lyftpunkten', p.moment / 1e6, 'kNm')}${metric('Nyttjandegrad u', p.utilization * 100, '%')}${metric('Krävt böjmotstånd Wₓ', p.requiredW / 1000, 'cm³')}${metric('Profilens tabellvärde Wₓ', p.W / 1000, 'cm³')}${metric('Största böjdeformation f', p.deflection, 'mm')}${metric('Läge för största f från vänster', p.xMaxDeflection, 'mm')}${metric('Böjdeformation vid lyftpunkten', p.deflectionAtLift, 'mm')}</div><p class="help">Böjdeformation relativt ändpunkternas förbindelselinje, utan säkerhetsfaktor. Absoluta ändhöjder och slutlig lutning bestäms inte här.</p>` : '<div class="case-verdict case-fail"><b>Ingen profil i jämförelselistan klarar böjvillkoret.</b><p>Du kan fortfarande välja en profil för en rapport som visar överskridandet.</p></div>');
    },
    renderReport: ({ input, profileName, reference }) => report.render(profileName, input, reference)
  };
  registry.register(definition);
  if (commonJS) module.exports = definition;
})(typeof globalThis !== 'undefined' ? globalThis : this);
