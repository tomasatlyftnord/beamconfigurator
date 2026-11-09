(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const data = commonJS ? require('./workbook-data.js') : root.WorkbookData;
  const engine = commonJS ? require('./workbook-engine.js') : root.WorkbookEngine;
  const reports = commonJS ? require('./workbook-report.js') : root.WorkbookReport;
  const registry = commonJS ? require('./load-cases.js').registry : root.LoadCases;
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const number = value => typeof value === 'number'
    ? value.toLocaleString('sv-SE', { maximumFractionDigits: Math.abs(value) < 1 ? 6 : 3 }) : escape(value ?? 'Saknas');
  const family = { SHS: 'Kvadrat', RHS: 'Rektangel', HEA: 'HEA' };
  const profileOptions = data.profiles.map(p => ({ value: p.name, label: `${family[p.family]} · ${p.name}${p.validityWarnings.length ? ' ⚠' : ''}` }));
  const assumptions = [
    `Källa: ${data.source.fileName}. Arbetsbokens version 0.1 är ett underlag för granskning. De tio flikarna återges som egna beräkningsfall; tidigare PDF-modeller finns kvar med sina egna underlag.`,
    'Beräkningarna följer arbetsbokens formler och tabellvärden. g = 9,82 m/s², σₜᵢₗₗ = 355 MPa och E = 210 000 MPa. Säkerhetsfaktorn n används i spänningskontrollerna; nedböjning beräknas med ofaktorerad last. Egenvikt försummas.',
    'Wₓ omvandlas från cm³ till mm³ med ×1 000. Iₓ, Iᵧ och Kv omvandlas från cm⁴ till mm⁴ med ×10 000. Inga tabellvärden ersätts med idealiserade skarpkantade tvärsnitt.',
    'Knäcktabellen använder strikt nästa större slankhet, även när slankheten träffar en tabellrad exakt. Ingen interpolation eller extrapolation görs. Tröghetsradien räknas från Iₓ/A enligt underlaget; svagaxelknäckning verifieras inte.',
    'En uppfylld tabellkontroll gäller bara det redovisade villkoret. Källans granskningspunkter och saknade kontroller framgår vid resultatet och följer med i rapporten. Ingen fullständig verifiering av lyftredskap eller uppfyllelse av SS-EN 13155 intygas.'
  ];

  function renderResults(result) {
    const warnings = [...new Set(result.warnings)];
    const failed = result.checks.some(check => !check.pass);
    const verdict = failed ? 'Minst ett redovisat villkor överskrids' : warnings.length
      ? 'Beräknat enligt arbetsboken – granskning återstår' : 'De redovisade villkoren uppfylls';
    const metrics = `<div class="metrics workbook-metrics">${result.checks.map(c => `<div><span>${escape(c.label)}</span><strong>${number(c.value)} <small>${escape(c.unit)}</small></strong><p class="help${c.pass ? '' : ' error'}">Gräns ${number(c.limit)} ${escape(c.unit)} · kvot ${number(c.value / c.limit * 100)} %${c.pass ? '' : ' · överskrids'}</p></div>`).join('')}</div>`;
    const checkTable = `<div class="table-wrap"><table class="workbook-checks"><thead><tr><th>Kontroll</th><th>Beräknat</th><th>Gräns</th><th>Kvot</th><th>Utfall</th></tr></thead><tbody>${result.checks.map(c => `<tr><th scope="row">${escape(c.label)}</th><td>${number(c.value)} ${escape(c.unit)}</td><td>${number(c.limit)} ${escape(c.unit)}</td><td>${number(c.value / c.limit * 100)} %</td><td><span class="status ${c.pass ? 'pass' : ''}">${c.pass ? 'Inom gränsen' : 'Överskrids'}</span></td></tr>`).join('')}</tbody></table></div>`;
    const profileData = result.profiles.length ? `<details class="workbook-details"><summary>Valda profilers tabellvärden</summary>${result.profiles.map(p => `<h3>${escape(p.name)} · Balkprofiler!B${p.row}:P${p.row}</h3><dl class="workbook-profile-data"><div><dt>Wₓ</dt><dd>${number(p.W)} mm³</dd></div><div><dt>Iₓ</dt><dd>${number(p.Ix)} mm⁴</dd></div><div><dt>Iᵧ</dt><dd>${number(p.Iy)} mm⁴</dd></div><div><dt>A, råvärde</dt><dd>${number(p.A)} ${p.family === 'HEA' ? '(enhetskonflikt)' : 'mm²'}</dd></div><div><dt>Kv</dt><dd>${number(p.Kv)} mm⁴</dd></div><div><dt>Massa per meter</dt><dd>${number(p.mass)} kg/m</dd></div></dl>`).join('')}<p class="help">Saknade egenskaper används inte som noll. HEA-radernas areor har enhetskonflikt i källan.</p></details>` : '';
    const trace = `<details class="workbook-details"><summary>Alla delberäkningar och Excelreferenser (${result.rows.length})</summary><div class="table-wrap"><table class="workbook-trace-table"><thead><tr><th>Cell</th><th>Storhet / formel i underlaget</th><th>Resultat</th></tr></thead><tbody>${result.rows.map(r => `<tr><td>${escape(r.cell)}</td><td>${escape(r.label)}${r.isInput ? '<span class="help">Redigerbar indata; formeln nedan är källans ursprungliga exempel.</span>' : ''}<code>${escape(r.formula || 'Konstant i arbetsboken')}</code></td><td>${number(r.value)} ${escape(r.unit)}</td></tr>`).join('')}</tbody></table></div></details>`;
    const warningList = `<ul>${warnings.map(w => `<li>${escape(w)}</li>`).join('')}</ul>`;
    const warningDetails = warnings.length ? `<details class="workbook-details workbook-warning"><summary>Granskningspunkter i underlaget (${warnings.length})</summary>${warningList}</details>` : '';
    const summaryWarning = warnings.length ? `<p>${escape(warnings[0])}${warnings.length > 1 ? ` Ytterligare ${warnings.length - 1} anmärkningar finns under granskningspunkter.` : ''}</p>` : '';
    const controls = `${metrics}${warningDetails}<details class="workbook-details workbook-comparison"><summary>Visa kontrollvillkor i tabell</summary>${checkTable}</details>`;
    return `<div class="case-verdict ${failed ? 'case-fail' : ''}"><b>${verdict}</b><p>${escape(result.sheet)} · arbetsbok 0.1. Utfallet gäller de redovisade beräkningarna.</p>${summaryWarning}</div>${controls}${profileData}${trace}<p class="help">Tabellunderlag: <a href="data/WORKBOOK.md">källor och granskningspunkter</a> · <a href="data/workbook-profiles-0.1.csv" download>alla 204 profiler (CSV)</a> · <a href="data/workbook-buckling-0.1.csv" download>knäcktabell (CSV)</a>.</p>`;
  }

  const definitions = engine.models.map(model => ({
    id: model.id, title: model.title, category: model.category, group: 'Arbetsbok 0.1 · för granskning', view: 'calculation',
    description: `Flik ”${model.sheet}” i Standardiserade beräkningar 0.1. Indata, tabellslagningar och samtliga delberäkningar följer arbetsboken.`,
    fields: model.fields.map(field => ({ ...field,
      ...(field.type === 'profile' ? { type: 'select', options: profileOptions } : {}),
      help: field.help
    })),
    assumptions,
    calculate: input => engine.calculate(model.id, input),
    diagram: input => reports.diagram(model.id, input).replace('<svg ', '<svg class="workbook-diagram" '),
    renderResults,
    renderReport: ({ input, reference }) => reports.render(model.id, input, reference)
  }));
  for (const definition of definitions) registry.register(definition);
  if (commonJS) module.exports = definitions;
})(typeof globalThis !== 'undefined' ? globalThis : this);
