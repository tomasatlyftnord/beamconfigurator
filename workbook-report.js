(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const engine = commonJS ? require('./workbook-engine.js') : root.WorkbookEngine;
  const data = commonJS ? require('./workbook-data.js') : root.WorkbookData;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (value, digits = 3) => typeof value === 'number'
    ? value.toLocaleString('sv-SE', { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : String(value ?? '—');
  const mappings = {
    'wb-l1': { E24: 'm', E25: 'K', E26: 't', E27: 'n', E30: 'τ', E31: 'u' },
    'wb-c1': { E27: 'm', E28: 'K', E29: 't', E30: 'n', E33: 'τ', E34: 'u' },
    'wb-kb5': { E28: 'm', E29: 'L', E30: 'profil', E31: 'i_profil', E32: 'W_x', E33: 'I_x', E34: 'n', E37: 'σ', E38: 'u', E39: 'f', E40: 'f_till' },
    'wb-kb6': { E27: 'm', E28: 'L', E29: 'a', E30: 'profil', E31: 'i_profil', E32: 'W_x', E33: 'I_x', E34: 'n', E37: 'M_x', E38: 'σ', E39: 'u', E40: 's', E41: 'f', E42: 'f_till' },
    'wb-h-ok': { E27: 'm', E28: 'L_1', E29: 'profil_1', E30: 'i_profil,1', E31: 'L_2', E32: 'profil_2', E33: 'i_profil,2', E34: 'W_x,1', E35: 'I_x,1', E36: 'W_x,2', E37: 'I_x,2', E38: 'n', E41: 'σ_1', E42: 'u_1', E43: 'f_1', E44: 'f_till,1', E45: 'σ_2', E46: 'u_2', E47: 'f_2', E48: 'f_till,2' },
    'wb-ramok': { E31: 'm', E32: 'L_1', E33: 'L_2', E34: 'profil', E35: 'i_profil', E36: 'α', E37: 'W_x', E38: 'I_x', E39: 'A', E40: 'n', E44: 'F_v', E45: 'β_1', E46: 'β_2', E47: 'F_s', E48: 'F_h', E49: 'N_1', E50: 'N_2', E51: 'σ_c,1', E52: 'σ_c,2', E53: 'i_x', E54: 'γ', E55: 'L_k,1', E56: 'L_k,2', E57: 'λ_1', E58: 'λ_2', E59: 'λ_tab,1', E60: 'λ_tab,2', E61: 'σ_k,till,1', E62: 'σ_k,till,2', E63: 'u_1', E64: 'u_2' },
    'wb-c-hook': { E22: 'm', E23: 'L', E24: 'L_1', E25: 'L_2', E26: 'profil', E27: 'i_profil', E28: 'W_x', E29: 'I_x', E30: 'I_y', E31: 'K_v', E32: 'A', E33: 'n', E34: 'n_vip', E66: 'M_1', E67: 'σ_1', E68: 'u_1', E69: 'f_1', E70: 'f_till,1', E83: 'λ_mall', E91: 'L_eff', E92: 'σ_b', E93: 'σ_c', E94: 'σ_tot', E95: 'u_tot', E96: 'f_rygg', E97: 'f_till,rygg', E98: 'M_cr', E99: 'M_vip', E117: 'M_2', E118: 'σ_2', E119: 'u_2', E120: 'f_2', E121: 'f_till,2', E139: 'L_halv', E140: 'i_fel', E141: 'f_rygg', E142: 'f_1', E143: 'f_rot,1', E144: 'f_rot,2', E145: 'f_2', E146: 'f_tot', E147: 'f_till' },
    'wb-spridarok': { E27: 'm', E28: 'L', E29: 'profil', E30: 'i_profil', E31: 'α', E32: 'W_x', E33: 'I_x', E34: 'A', E35: 'n', E38: 'N', E39: 'σ_c', E40: 'i_x', E41: 'γ', E42: 'L_k', E43: 'λ', E44: 'λ_tab', E45: 'σ_k,till', E46: 'u' },
    'wb-semispridarok': { E27: 'm', E28: 'L', E29: 'a', E30: 'profil', E31: 'i_profil', E32: 'α', E33: 'W_x', E34: 'I_x', E35: 'A', E36: 'n', E39: 'N', E40: 'σ_c', E41: 'i_x', E42: 'γ', E43: 'L_k', E44: 'λ', E45: 'λ_tab', E46: 'σ_k,till', E47: 'u_c', E48: 'M_x', E49: 'σ_b', E50: 'u_b', E51: 'u_komb' }
  };
  mappings['wb-kb2'] = mappings['wb-kb5'];
  const symbol = value => {
    const [base, ...suffix] = String(value).split('_');
    return suffix.length ? `<msub><mi>${escape(base)}</mi><mtext>${escape(suffix.join('_'))}</mtext></msub>` : `<mi>${escape(base)}</mi>`;
  };
  const mtext = text => `<mtext>${escape(text)}</mtext>`;
  const op = text => `<mo>${escape(text)}</mo>`;
  const group = contents => `<mrow>${contents}</mrow>`;
  const fenced = contents => group(`<mo fence="true">(</mo>${contents}<mo fence="true">)</mo>`);
  const cellSymbol = (id, cell) => symbol(mappings[id]?.[cell.replaceAll('$', '')] || `v_${cell.replaceAll('$', '')}`);

  // Presentation only: parse a small arithmetic subset into MathML. No formula is executed.
  function expressionMath(formula, id) {
    const source = String(formula || '').replace(/^=/, '');
    if (/XMATCH|INDEX|VLOOKUP|KNÄCKTABELL|#REF!|\[/.test(source)) {
      let explanation = 'Tabelluppslag enligt källformeln';
      if (source.includes('#REF!')) explanation = 'Bruten källreferens – inget giltigt tabellvärde';
      else if (source.includes('XMATCH')) explanation = 'Profilens radnummer i tabellen';
      else if (source.includes('VLOOKUP')) explanation = 'Tillåten tryckspänning ur knäcktabellen';
      else if (source.includes('MIN(IF')) explanation = 'Första tabellslankhet strikt större än beräknad slankhet';
      else if (source.includes('INDEX')) explanation = /\*10000/.test(source) ? 'Profilens tabellvärde × 10⁴' : 'Profilens tabellvärde';
      return mtext(explanation);
    }
    const tokens = source.match(/\$?[A-Z]+\$?\d+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|[+*/^(),-]/g) || [];
    if (tokens.join('') !== source.replace(/\s/g, '')) return mtext('Beräkning enligt källformeln nedan');
    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];
    function primary() {
      const token = take();
      if (token === '(') {
        const inside = sum();
        if (take() !== ')') throw new Error('parenthesis');
        return fenced(inside);
      }
      if (/^\$?[A-Z]+\$?\d+$/.test(token || '')) return cellSymbol(id, token);
      if (/^(?:\d|\.)/.test(token || '')) return `<mn>${escape(n(Number(token), 6))}</mn>`;
      if (/^[A-Za-z_]/.test(token || '')) {
        if (take() !== '(') throw new Error('function');
        const args = [];
        if (peek() !== ')') {
          do { args.push(sum()); } while (peek() === ',' && take());
        }
        if (take() !== ')') throw new Error('function-close');
        if (token === 'PI' && args.length === 0) return '<mi>π</mi>';
        if (token === 'SQRT' && args.length === 1) return `<msqrt>${args[0]}</msqrt>`;
        const names = { SIN: 'sin', COS: 'cos', TAN: 'tan', ATAN: 'arctan', MIN: 'min', MAX: 'max' };
        if (token === 'RADIANS' && args.length === 1) return `<mfrac>${group(`${args[0]}${op('·')}<mi>π</mi>`)}<mn>180</mn></mfrac>`;
        if (!names[token]) throw new Error('unsupported-function');
        return group(`<mi mathvariant="normal">${names[token]}</mi>${fenced(args.join(op(',')))}`);
      }
      throw new Error('token');
    }
    function unary() { if (peek() === '-' || peek() === '+') return group(op(take() === '-' ? '−' : '+') + unary()); return primary(); }
    function power() { const left = unary(); return peek() === '^' && take() ? `<msup>${group(left)}${group(power())}</msup>` : left; }
    function product() {
      const numerator = [power()], denominator = [];
      while (peek() === '*' || peek() === '/') {
        const operator = take(), right = power();
        (operator === '/' ? denominator : numerator).push(right);
      }
      const top = group(numerator.join(op('·')));
      return denominator.length ? `<mfrac>${top}${group(denominator.join(op('·')))}</mfrac>` : top;
    }
    function sum() {
      let left = product();
      while (peek() === '+' || peek() === '-') left = group(`${left}${op(take() === '-' ? '−' : '+')}${product()}`);
      return left;
    }
    try { const result = sum(); return index === tokens.length ? result : mtext('Beräkning enligt källformeln nedan'); }
    catch { return mtext('Beräkning enligt källformeln nedan'); }
  }
  function config(id) {
    const model = engine.models.find(model => model.id === id);
    if (!model) throw new RangeError('Okänt beräkningsfall i arbetsboken.');
    return model;
  }
  const valueMath = (value, unit) => typeof value === 'number'
    ? `<mn>${escape(n(value, 6))}</mn>${unit ? mtext(` ${unit}`) : ''}` : mtext(value);
  const page = (contents, index, count, title) => `<section class="report-page"><div class="report-masthead"><span>BERÄKNINGSUNDERLAG · ${index}/${count}</span></div>${contents}<div class="report-footer"><span>${escape(title)} · ${index}/${count}</span></div></section>`;
  const pair = (label, value) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`;
  const chunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
  function checksTable(checks) {
    const display = value => n(value, typeof value === 'number' && Math.abs(value) < 1 ? 6 : 3);
    return `<table class="workbook-checks"><thead><tr><th>Kontroll</th><th>Beräknat</th><th>Gränsvärde</th><th>Kvot</th><th>Jämförelse</th></tr></thead><tbody>${checks.map(check => `<tr><td>${escape(check.label)}</td><td>${escape(display(check.value))} ${escape(check.unit)}</td><td>${escape(display(check.limit))} ${escape(check.unit)}</td><td>${escape(display(check.value / check.limit * 100))} %</td><td>${check.pass ? 'Inom gränsvärdet' : 'Överskrids'}</td></tr>`).join('')}</tbody></table>`;
  }
  function traceRow(id, row, source) {
    const formula = row.formula ?? source.cells?.[row.cell]?.formula ?? '';
    const currentValue = `${cellSymbol(id, row.cell)}${op('=')}${valueMath(row.value, row.unit)}`;
    const math = row.isInput
      ? `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${group(currentValue)}</math><p class="report-copy">Redigerbart indatavärde. Ursprungligt exempel i arbetsboken:</p>`
      : `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${group(`${cellSymbol(id, row.cell)}${op('=')}${formula ? expressionMath(formula, id) : valueMath(row.value, row.unit)}`)}</math>${formula ? `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${group(currentValue)}</math>` : ''}`;
    return `<div class="workbook-trace" data-cell="${escape(row.cell)}"><h3>${escape(row.cell)} · ${escape(row.label || source.cells?.[row.cell]?.label || 'Beräknad storhet')}</h3>${math}${formula ? `<code>${escape(formula)}</code>` : ''}</div>`;
  }

  function draw(id, input) {
    const names = config(id).fields.filter(field => field.type !== 'profile');
    const measures = names.filter(field => field.unit === 'mm').slice(0, 3).map(field => `${field.label}: ${n(input[field.name])} mm`).join(' · ');
    let geometry, label;
    if (id === 'wb-l1' || id === 'wb-c1') {
      const c1 = id === 'wb-c1';
      geometry = c1 ? `<path d="M180 30H390V130Q285 194 180 130Z" fill="#FFD200" stroke="#003152" stroke-width="2"/><circle cx="285" cy="77" r="28" fill="white" stroke="#003152" stroke-width="2"/><path d="M257 77V151M313 77V151" stroke="#003152" stroke-width="3" stroke-dasharray="5 4"/><text x="273" y="176">F ↓</text>`
        : `<path d="M180 145A105 105 0 0 1 390 145H350A65 65 0 0 0 220 145Z" fill="#FFD200" stroke="#003152" stroke-width="2"/><path d="M285 40V80" stroke="#003152" stroke-width="6" stroke-dasharray="4 3"/><text x="297" y="119">F ↑</text>`;
      label = c1 ? 'Två lika skjuvplan, vardera K × t' : 'Ett skjuvplan med area K × t';
    } else if (id === 'wb-c-hook') {
      geometry = `<path d="M410 45H210V145H410" fill="none" stroke="#FFD200" stroke-width="21"/><path d="M410 45V11M405 19L410 11L415 19M410 145V179M405 171L410 179L415 171" fill="none" stroke="#003152" stroke-width="2"/><g font-size="14"><text x="422" y="22">F</text><text x="422" y="179">F</text><text x="284" y="25">L₁</text><text x="284" y="175">L₂</text><text x="178" y="100">L</text></g>`;
      label = 'C-krok av profiler · källans separata kontroller för armar, rygg och vippning';
    } else if (id === 'wb-h-ok' || id === 'wb-ramok') {
      geometry = id === 'wb-h-ok' ? `<path d="M185 40V140M435 40V140M185 90H435" stroke="#FFD200" stroke-width="20" fill="none"/><g stroke="#003152" stroke-width="2"><path d="M185 25V7M435 25V7M185 155V175M435 155V175M310 90V30"/></g><text x="321" y="45">F ↑</text>` : `<path d="M180 40H440V145H180Z" stroke="#FFD200" stroke-width="17" fill="none"/><path d="M180 40L310 5L440 40M180 145L310 5L440 145" stroke="#003152" stroke-width="1.5" fill="none"/><text x="459" y="98">L₂</text><text x="294" y="174">L₁</text>`;
      label = id === 'wb-h-ok' ? 'H-ok · huvudbalk och två lika tvärbalkar' : 'Ramok · planvy, krafter och knäckning i två riktningar';
    } else if (id === 'wb-spridarok' || id === 'wb-semispridarok') {
      geometry = `<rect x="120" y="118" width="380" height="17" fill="#FFD200" stroke="#003152"/><path d="M${id === 'wb-semispridarok' ? '165' : '120'} 118L310 16L${id === 'wb-semispridarok' ? '455' : '500'} 118M120 135V175M500 135V175" stroke="#003152" stroke-width="2" fill="none"/><text x="205" y="109">α</text><text x="322" y="24">F ↑</text><text x="95" y="174">F/2</text><text x="509" y="174">F/2</text>`;
      label = id === 'wb-semispridarok' ? 'Semispridarok · tryck och böjning vid utkragningarna' : 'Spridarok · tryckkraft från två sneda sling';
    } else if (id === 'wb-kb2') {
      geometry = `<path d="M140 31V153M127 40L140 31M127 60L140 51M127 80L140 71M127 100L140 91M127 120L140 111M127 140L140 131" stroke="#003152" stroke-width="2"/><rect x="140" y="78" width="330" height="20" fill="#FFD200" stroke="#003152"/><path d="M470 98V157M464 148L470 157L476 148" stroke="#003152" stroke-width="2" fill="none"/><text x="482" y="153">F</text><text x="292" y="126">L</text>`;
      label = 'Konsolbalk · inspänd i ena änden och punktlast i den andra';
    } else {
      const a = id === 'wb-kb6' ? 260 : 310;
      geometry = `<rect x="115" y="75" width="390" height="20" fill="#FFD200" stroke="#003152"/><path d="M115 96L104 113H126ZM505 96L494 113H516Z" fill="none" stroke="#003152" stroke-width="2"/><path d="M${a} 23V75M${a - 6} 66L${a} 75L${a + 6} 66" fill="none" stroke="#003152" stroke-width="2"/><text x="${a + 12}" y="43">F</text><path d="M115 145H505M115 139V151M505 139V151" stroke="#003152" fill="none"/><text x="301" y="163">L</text>`;
      label = id === 'wb-kb6' ? 'Fritt upplagd balk · osymmetriskt placerad punktlast' : 'Fritt upplagd balk · centrerad punktlast';
    }
    return `<svg viewBox="0 0 620 222" role="img" aria-label="${escape(label)}" style="display:block;width:100%;height:115px;margin:8px 0;font-family:Arial,sans-serif;fill:#003152">${geometry}<text x="310" y="201" text-anchor="middle" font-size="11">${escape(label)}</text><text x="310" y="218" text-anchor="middle" font-size="9">${escape(measures)} · schematisk, inte skalenlig</text></svg>`;
  }
  function diagram(id, input) {
    const result = engine.calculate(id, input);
    return draw(id, result.input);
  }
  function render(id, input, reference = '') {
    const model = config(id), result = engine.calculate(id, input);
    const source = data.sheets.find(sheet => sheet.name === model.sheet) || { cells: {} };
    const pages = [];
    const failed = result.checks.some(check => !check.pass);
    const warningText = result.warnings.length ? `Underlaget har ${result.warnings.length} granskningsanmärkningar. Samtliga redovisas i rapportens sista avsnitt.` : 'Kontrollerna gäller endast de redovisade antagandena och snitten.';
    pages.push(`<div class="report-title"><p class="report-kicker">UNDERLAG FÖR GRANSKNING · ARBETSBOK 0.1</p><h1>${escape(model.title)}</h1><p class="report-profile">${escape(model.sheet)}</p>${String(reference).trim() ? `<p class="report-reference">Referens: ${escape(String(reference).trim())}</p>` : ''}</div><div class="report-verdict ${failed ? 'report-fail' : ''}"><b>${failed ? 'Minst ett av underlagets gränsvärden överskrids.' : 'Jämförelserna ligger inom underlagets redovisade gränsvärden.'}</b><span>${escape(warningText)} Beräkningen är ett granskningsunderlag, inget godkännande av lyftredskapet.</span></div><h2>01 / Indata</h2><dl class="report-data">${model.fields.map(field => pair(`${field.label} · ${field.name}`, `${n(result.input[field.name])}${field.unit ? ` ${field.unit}` : ''}`)).join('')}${pair('Tyngdacceleration, g', '9,82 m/s²')}${pair('Elasticitetsmodul, E', '210 000 MPa')}${pair('Tillåten normalspänning, σₜᵢₗₗ', '355 MPa')}${pair('Lastförutsättning', 'Egenvikt försummas')}</dl>${draw(id, result.input)}<h2>02 / Jämförelser enligt arbetsboken</h2>${checksTable(result.checks)}<p class="report-source">Källa: ${escape(data.source.fileName)} · blad ${escape(model.sheet)}. Profilvärden hämtas från arbetsbokens tabell, inte från geometriska approximationer.</p>`);
    for (const [index, rows] of chunks(result.rows, 8).entries()) {
      pages.push(`<div class="report-title"><p class="report-kicker">UNDERLAG FÖR GRANSKNING · ARBETSBOK 0.1</p><h1>Beräkningsgång${index ? ' · fortsättning' : ''}</h1><p class="report-source">${escape(model.sheet)} · Excelcell anges vid varje resultat. u redovisas i procent.</p></div>${rows.map(row => traceRow(id, row, source)).join('')}<p class="report-copy">Formlerna återger källans beräkningsgång. Symbolernas cellkoppling framgår av indata och resultatens cellreferenser. Numeriska resultat beräknas av applikationen med aktuella indata.</p>`);
    }
    const warnings = result.warnings.length ? result.warnings : ['Inga särskilda granskningsanmärkningar är registrerade för detta blad. Detta ersätter inte en oberoende konstruktionskontroll.'];
    for (const [index, items] of chunks(warnings, 6).entries()) {
      pages.push(`<div class="report-title"><p class="report-kicker">UNDERLAG FÖR GRANSKNING · ARBETSBOK 0.1</p><h1>Källor och anmärkningar${index ? ' · fortsättning' : ''}</h1></div><ul class="workbook-warnings">${items.map(warning => `<li>${escape(warning)}</li>`).join('')}</ul>${index === 0 ? `<h2>Spårbarhet</h2><p class="report-source">Arbetsbok: ${escape(data.source.fileName)}<br>Blad: ${escape(model.sheet)}<br>SHA-256: <span style="overflow-wrap:anywhere">${escape(data.source.sha256)}</span></p>${result.profiles?.length ? `<h2>Valda profilers tabellvärden</h2><dl class="report-data">${result.profiles.flatMap(profile => [pair(`Profil · Balkprofiler!B${profile.row}`, profile.name), pair('Wₓ / Iₓ', `${n(profile.W)} mm³ / ${n(profile.Ix)} mm⁴`), pair('A / Iᵧ / Kᵥ', `${n(profile.A)} ${profile.family === 'HEA' ? '(råvärde; areaenheten behöver granskas)' : 'mm²'} / ${n(profile.Iy)} mm⁴ / ${n(profile.Kv)} mm⁴`)]).join('')}</dl>` : ''}<div class="report-limits"><b>Beräkningens omfattning.</b> Rapporten återger arbetsbokens formler och kontroller med redovisade granskningsanmärkningar. Den verifierar inte komplett hållfasthet, stabilitet, svetsar, lyftöron, lokal kraftintroduktion, utmattning eller dynamik och styrker inte uppfyllelse av SS-EN 13155. Underlagets formler och profiluppgifter behöver granskas innan de används för konstruktion.</div>` : ''}`);
    }
    return `<article class="calculation-report workbook-report">${pages.map((contents, index) => page(contents, index + 1, pages.length, model.title)).join('')}</article>`;
  }
  const api = { render, diagram };
  root.WorkbookReport = api;
  if (commonJS) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
