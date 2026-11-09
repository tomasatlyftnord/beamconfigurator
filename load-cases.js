(function (root) {
  'use strict';
  const beam = typeof module !== 'undefined' && module.exports ? require('./beam.js') : root.Beam;
  const calc = typeof module !== 'undefined' && module.exports ? require('./calculations.js') : root.EngineeringCalculations;
  const reports = typeof module !== 'undefined' && module.exports ? require('./c-hook-report.js') : root.CHookReport;
  const beamReports = typeof module !== 'undefined' && module.exports ? require('./report.js') : root.BeamReport;
  const n = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const metric = (label, value, unit = '') => `<div><span>${label}</span><strong>${value} <small>${unit}</small></strong></div>`;
  function createRegistry() {
    const definitions = new Map();
    return {
      register(definition) {
        if (!definition || !/^[a-z][a-z0-9-]*$/.test(definition.id) || !definition.title || !Array.isArray(definition.fields)
          || typeof definition.calculate !== 'function' || typeof definition.renderReport !== 'function'
          || (definition.view !== 'catalogue' && (typeof definition.diagram !== 'function' || typeof definition.renderResults !== 'function'))) {
          throw new TypeError('Ett lastfall behöver id, titel, indatafält, beräkning och rapport samt diagram/resultat för generisk vy.');
        }
        if (definitions.has(definition.id)) throw new Error(`Lastfallet ${definition.id} finns redan.`);
        const keys = definition.fields.map(field => field.name);
        if (new Set(keys).size !== keys.length) throw new Error('Indatafält måste ha unika namn.');
        definitions.set(definition.id, Object.freeze({ ...definition, fields: Object.freeze(definition.fields.map(field => Object.freeze({ ...field }))) }));
        return this;
      },
      get(id) { return definitions.get(id); },
      list() { return Array.from(definitions.values()); }
    };
  }
  const registry = createRegistry();
  registry.register({
    id: 'lifting-beam', title: 'Lyftok med mittlyft', category: 'products', view: 'catalogue', fields: [],
    description: 'Centrerad lyftpunkt och två lika ändlaster. Profilval från Tibnors kvadratiska VKR-tabell.',
    calculate: beam.calculate,
    renderReport: ({ input, profileName, reference }) => beamReports.render(profileName, input, reference)
  });
  registry.register({
    id: 'c-hook', title: 'C-krok av utskuren plåt', category: 'components', view: 'calculation',
    description: 'Rak C-form med lika armar och konstant rektangulärt tvärsnitt. Snittkontroller och idealiserad vippningskontroll av underarmen.',
    fields: [
      { name: 'mass', label: 'Maximal total lastvikt m', unit: 'kg', default: 400, min: 0.001, max: 1000000 },
      { name: 'factor', label: 'Säkerhetsfaktor n', default: 2, min: 1, max: 10, help: 'Multiplicerar kraften i spännings- och momentkontrollerna.' },
      { name: 'reach', label: 'Armlängd L₁ = L₂', unit: 'mm', default: 800, min: 1, max: 20000, help: 'Från ryggens centrumlinje till kraftens verkningslinje. Lika armar håller krafterna i samma lodlinje.' },
      { name: 'opening', label: 'Höjd L mellan armarnas centrumlinjer', unit: 'mm', default: 600, min: 1, max: 20000, help: 'Fri öppning blir L − h. L påverkar inte snittkrafterna i denna idealiserade statiska modell.' },
      { name: 'h', label: 'Tvärsnittshöjd h i plåtens plan', unit: 'mm', default: 80, min: 1, max: 2000, help: 'Samma materialbredd i rygg och båda armar.' },
      { name: 'b', label: 'Plåttjocklek t', unit: 'mm', default: 20, min: 1, max: 500 },
      { name: 'rootRestraint', label: 'Underarmens rot i sidled och vridning', type: 'select', default: 'ideal', options: [{ value: 'ideal', label: 'Idealiserat inspänd' }, { value: 'unknown', label: 'Inspänningen är inte verifierad' }] },
      { name: 'loadPosition', label: 'Lastens läge på underarmen', type: 'select', default: 'centre', options: [{ value: 'centre', label: 'Genom tvärsnittets skjuvcentrum' }, { value: 'other', label: 'På ovansidan / annat lastläge' }], help: 'En kontaktlast på ovansidan omfattas inte av den använda vippningsformeln.' }
    ],
    calculate: calc.cHook,
    stabilityApplicable: input => input.rootRestraint === 'ideal' && input.loadPosition === 'centre' && input.reach / input.h >= 10 && input.b <= input.h,
    assumptions: [
      'Rak, prismatisk C-ram i ett stycke med samma massiva rektangulära tvärsnitt i båda armar och ryggen. L₁ = L₂. Vertikala krafter verkar i samma lodlinje; egenvikt försummas.',
      'F = m·9,82. Armar: Mₓ = nF·L₁ och V = nF. Rygg: N = nF, Mₓ = nF·L₁ och ingen tvärskjuvkraft. Ryggens största normalspänning är N/A + Mₓ/Wₓ.',
      'I = t·h³/12, Wₓ = t·h²/6 och A = t·h. Armarnas största skjuvspänning är τ = 1,5V/A. Tillåtna jämförelsevärden: σₜᵢₗₗ = 355 MPa, τₜᵢₗₗ = 355/√3 MPa. Arm- och ryggkontroll gäller olika snitt.',
      'Idealiserad vippning: underarmen som rak konsol med sid- och vridstyvt inspänd rot, fri spets och spetslast genom skjuvcentrum. Mcr = 4,013·√(E·Iz·G·It)/L₂. Iz = h·t³/12 och It är en approximation av massiv rektangels torsionskonstant. E = 210 000 MPa och G = E/[2(1+0,30)].',
      'Programmets vippningsmodell avgränsas till L₂/h ≥ 10 och t ≤ h. Detta är programmets modellgräns, inte ett standardkrav. Utanför gränsen visas ingen giltig vippningsjämförelse. Krökt geometri, radier/spänningskoncentrationer, hål, lokal kraftintroduktion, lokal buckling och hela C-ramens stabilitet verifieras inte.',
      'Mcr är ett idealt elastiskt kritiskt moment för underarmen, inte dimensionerande bärförmåga eller hela krokens stabilitetsgräns. M/Mcr är en momentkvot, inte en Eurokod-nyttjandegrad. Verklig kontaktlast på ovansidan och eftergivlig rot kan sänka gränsen. Rapporten intygar inte uppfyllelse av SS-EN 13155.'
    ],
    diagram(input) {
      return `<svg viewBox="0 0 620 440" role="img" aria-label="C-krok med lika armar, uppåtriktad kraft på överarmen och nedåtriktad på underarmen. Rektangulärt plåttvärsnitt."><defs><marker id="hook-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#003152"/></marker></defs><path d="M390 100H130V340H390" fill="none" stroke="#FFD200" stroke-width="36" stroke-linejoin="miter"/><g stroke="#003152" stroke-width="3" marker-end="url(#hook-arrow)"><path d="M390 100V27"/><path d="M390 340V413"/></g><g stroke="#8ca2b3" stroke-width="1.5"><path d="M130 58H390M130 52V64M390 52V64M130 382H390M130 376V388M390 376V388M76 100V340M70 100H82M70 340H82"/></g><g fill="#003152" font-size="16" font-family="system-ui"><text x="402" y="40">F</text><text x="402" y="410">F</text><text x="200" y="45">L₁ = ${n(input.reach, 0)} mm</text><text x="200" y="405">L₂ = ${n(input.reach, 0)} mm</text><text x="32" y="225" transform="rotate(-90 32 225)">L = ${n(input.opening, 0)} mm</text><text x="450" y="170">Tvärsnitt</text><text x="450" y="316">t = ${n(input.b)} mm</text><text x="496" y="235">h = ${n(input.h)} mm</text></g><rect x="455" y="190" width="24" height="100" fill="#FFD200" stroke="#003152"/><text x="176" y="235" fill="#607487" font-family="system-ui" font-size="12">Samma h och t i hela C-ramen</text></svg>`;
    },
    renderResults(result, input) {
      const applies = this.stabilityApplicable(input);
      return `<div class="case-verdict ${result.utilization <= 1 ? '' : 'case-fail'}"><b>${result.utilization <= 1 ? 'De idealiserade snittvillkoren uppfylls' : 'Minst ett idealiserat snittvillkor överskrids'}</b><p>Resultatet gäller raka tvärsnitt, utan hörnens spänningskoncentrationer.</p></div><div class="metrics">${metric('Rygg: N/A + Mₓ/Wₓ', n(result.backStress), 'MPa')}${metric('Armar: böjspänning', n(result.bendingStress), 'MPa')}${metric('Armar: maximal skjuvspänning', n(result.shearStress), 'MPa')}${metric('Snittnyttjandegrad u', n(result.utilization * 100), '%')}${metric('Böjmoment Mₓ', n(result.moment / 1e6), 'kNm')}${metric('Kraft nF', n(result.designForce / 1000), 'kN')}</div><div class="stability-result"><h3>Idealiserad vippning av underarmen</h3>${applies ? `<div class="metrics">${metric('Kritiskt moment Mcr', n(result.armCriticalMoment / 1e6), 'kNm')}${metric('Momentkvot Mₓ/Mcr', n(result.armStabilityRatio * 100), '%')}</div><p>${result.armStabilityRatio < 1 ? 'Mₓ ligger under det ideala elastiska kritiska momentet.' : 'Mₓ når eller överskrider det ideala elastiska kritiska momentet.'} Kvoten är ingen dimensionerande vippningsnyttjandegrad.</p>` : '<p class="error">Mcr-jämförelse visas inte för valda förutsättningar. Modellen kräver idealiserad inspänning, last genom skjuvcentrum, L₂/h ≥ 10 och t ≤ h.</p>'}<p>Kontrollen gäller enbart underarmen, inte stabiliteten hos hela C-kroken. Kontaktlast på ovansidan omfattas inte.</p></div>`;
    },
    renderReport: ({ input, reference }) => reports.render(input, reference)
  });
  root.LoadCases = registry;
  if (typeof module !== 'undefined' && module.exports) module.exports = { registry, createRegistry };
})(typeof globalThis !== 'undefined' ? globalThis : this);
