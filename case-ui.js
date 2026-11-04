(function () {
  'use strict';
  const registry = window.LoadCases;
  const selector = document.getElementById('case-select');
  const form = document.getElementById('case-form');
  const error = document.getElementById('case-error');
  const reportButton = document.getElementById('case-report');
  const saved = new Map();
  const reportProfiles = new Map();
  const expandedProfiles = new Map();
  const profileArea = document.getElementById('case-profiles');
  const profileRows = document.getElementById('case-profile-rows');
  const profileToggle = document.getElementById('case-profiles-toggle');
  let active, input, result;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  for (const definition of registry.list()) selector.add(new Option(definition.title, definition.id));
  function read() {
    return Object.fromEntries(active.fields.map(field => [field.name, field.type === 'select' ? form.elements.namedItem(field.name).value : form.elements.namedItem(field.name).valueAsNumber]));
  }
  function renderProfiles() {
    profileArea.hidden = !active.profileSelection || !result;
    if (profileArea.hidden) { profileRows.replaceChildren(); return; }
    const selected = reportProfiles.get(active.id);
    const rows = result.rows;
    const focus = rows.find(p => p.name === selected) || result.chosen;
    const index = focus ? rows.indexOf(focus) : rows.length - 1;
    const expanded = expandedProfiles.get(active.id) || false;
    const visible = expanded ? rows : rows.slice(Math.max(0, index - 2), index + 4);
    const number = (v, digits = 2) => v.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    profileRows.innerHTML = visible.map(p => `<tr class="${p === result.chosen ? 'selected' : ''} ${p.name === selected ? 'report-selected' : ''}"><td>${escape(p.name)}</td><td>${number(p.W / 1000)}</td><td>${number(p.utilization * 100, 1)} %</td><td>${number(p.mass)}</td><td><span class="status ${p.utilization <= 1 ? 'pass' : ''}">${p === result.chosen ? 'Minsta W' : p.utilization <= 1 ? 'Klarar böjning' : 'Otillräckligt W'}</span></td><td><label class="profile-choice"><input type="radio" name="case-profile" value="${escape(p.name)}" aria-label="Välj ${escape(p.name)} för rapport" ${p.name === selected ? 'checked' : ''}> Välj</label></td></tr>`).join('');
    document.getElementById('case-profiles-count').textContent = `${rows.length} tabellprofiler`;
    const p = rows.find(row => row.name === selected);
    document.getElementById('case-selected-profile').textContent = p ? `Rapportval: ${p.name} · nyttjandegrad ${(number(p.utilization * 100, 1))} %` : 'Välj en profil i tabellen för att skapa rapport.';
    profileToggle.textContent = expanded ? 'Visa profiler nära valet' : `Visa alla ${rows.length} profiler`;
    profileToggle.setAttribute('aria-expanded', String(expanded));
    reportButton.disabled = !p;
  }
  function updateCase() {
    try {
      input = read();
      saved.set(active.id, input);
      result = active.calculate(input);
      document.getElementById('case-diagram').innerHTML = active.diagram(input);
      document.getElementById('case-result').innerHTML = active.renderResults(result, input);
      reportButton.disabled = false;
      error.hidden = true;
      renderProfiles();
    } catch (failure) {
      result = null;
      reportButton.disabled = true;
      error.textContent = failure.message;
      error.hidden = false;
      document.getElementById('case-result').textContent = 'Fyll i giltiga förutsättningar för att visa ett resultat.';
      document.getElementById('case-diagram').replaceChildren();
      renderProfiles();
    }
  }
  function selectCase() {
    active = registry.get(selector.value);
    document.getElementById('case-description').textContent = active.description;
    document.getElementById('beam-case').hidden = active.view !== 'catalogue';
    document.getElementById('custom-case').hidden = active.view === 'catalogue';
    profileArea.hidden = true;
    if (active.view === 'catalogue') return;
    const values = saved.get(active.id) || {};
    document.getElementById('case-title').textContent = active.title;
    form.innerHTML = active.fields.map(field => `<div class="case-field"><label for="case-${field.name}">${escape(field.label)}</label>${field.type === 'select'
      ? `<select id="case-${field.name}" name="${field.name}">${field.options.map(option => `<option value="${option.value}" ${option.value === (values[field.name] ?? field.default) ? 'selected' : ''}>${escape(option.label)}</option>`).join('')}</select>`
      : `<div class="unit-input"><input id="case-${field.name}" name="${field.name}" type="number" min="${field.min}" max="${field.max}" step="any" required value="${escape(values[field.name] ?? field.default)}">${field.unit ? `<span>${field.unit}</span>` : ''}</div>`}${field.help ? `<p class="help">${escape(field.help)}</p>` : ''}</div>`).join('') + '<button type="submit">Beräkna <span>→</span></button>';
    document.getElementById('case-assumptions').innerHTML = active.assumptions.map(text => `<li>${escape(text)}</li>`).join('');
    updateCase();
  }
  selector.addEventListener('change', selectCase);
  form.addEventListener('input', updateCase);
  form.addEventListener('change', updateCase);
  form.addEventListener('submit', event => { event.preventDefault(); updateCase(); });
  profileRows.addEventListener('change', event => {
    if (event.target.name !== 'case-profile') return;
    reportProfiles.set(active.id, event.target.value);
    renderProfiles();
    profileRows.querySelector('input:checked')?.focus();
  });
  profileToggle.addEventListener('click', () => {
    expandedProfiles.set(active.id, !expandedProfiles.get(active.id));
    renderProfiles();
  });
  reportButton.addEventListener('click', () => {
    if (!result) return;
    // Läs och räkna om för att aldrig exportera ett äldre resultat.
    updateCase();
    if (!result || reportButton.disabled) return;
    const profileName = reportProfiles.get(active.id);
    document.getElementById('report-content').innerHTML = active.renderReport({ input, result, profileName, reference: document.getElementById('case-reference').value });
    window.activeReportName = profileName ? `${active.title}_${profileName}` : active.title;
    document.getElementById('report-dialog').showModal();
  });
  selectCase();
})();
