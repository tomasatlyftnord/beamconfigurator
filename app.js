'use strict';
const form = document.getElementById('beam-form');
const number = (value, digits = 1) => value.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
let current;
let expanded = false;
let reportProfile = null;
let currentInput = null;
let printTitle;
function renderRows() {
  const { rows, chosen } = current;
  const focusProfile = rows.find(p => p.name === reportProfile) || chosen;
  const selectedIndex = focusProfile ? rows.indexOf(focusProfile) : rows.length - 1;
  const visible = expanded ? rows : rows.slice(Math.max(0, selectedIndex - 2), selectedIndex + 4);
  document.getElementById('profile-rows').innerHTML = visible.map(p => `<tr class="${p === chosen ? 'selected' : ''} ${p.name === reportProfile ? 'report-selected' : ''}"><td>${p.name}</td><td>${number(p.W / 1000, 2)}</td><td>${number(p.utilization * 100, 0)} %</td><td>${number(p.mass, 2)}</td><td><span class="status ${p.utilization <= 1 && p.shearRatio <= 0.5 ? 'pass' : ''}">${p === chosen ? 'Minsta W' : p.utilization > 1 ? 'Otillräckligt W' : p.shearRatio > 0.5 ? 'Hög skjuvning' : 'Klarar böjning'}</span></td><td><label class="profile-choice"><input type="radio" name="report-profile" value="${p.name}" aria-label="Välj ${p.name} för rapport" ${p.name === reportProfile ? 'checked' : ''}> Välj</label></td></tr>`).join('');
  document.getElementById('profile-count').textContent = `${rows.length} tabellprofiler`;
  const toggle = document.getElementById('toggle-profiles');
  toggle.textContent = expanded ? 'Visa profiler nära valet' : `Visa alla ${rows.length} profiler`;
  toggle.setAttribute('aria-expanded', String(expanded));
}
function update() {
  const error = document.getElementById('error');
  try {
    const input = { span: form.elements.span.valueAsNumber, mass: form.elements.mass.valueAsNumber, factor: form.elements.factor.valueAsNumber, fy: Number(form.elements.fy.value) };
    current = Beam.calculate(input);
    currentInput = input;
    error.hidden = true;
    document.getElementById('left-load').textContent = `${number(input.mass / 2, 0)} kg`;
    document.getElementById('right-load').textContent = `${number(input.mass / 2, 0)} kg`;
    document.getElementById('diagram-span').textContent = `c-c ${number(input.span, 0)} mm`;
    const p = current.chosen;
    document.getElementById('result').innerHTML = p ? `<div class="result-top"><div><p class="eyebrow">MINSTA W SOM KLARAR MODELLENS KRAV</p><h3>${p.name}</h3><p>S${input.fy} · kvadratisk profil · preliminär kandidat</p></div><span class="result-badge">${number(p.utilization * 100, 0)} %<small>böjutnyttjande</small></span></div><div class="metrics"><div><span>Krävt böjmotstånd</span><strong>${number(p.requiredW / 1000, 2)} <small>cm³</small></strong></div><div><span>Tabellens Wₑₗ</span><strong>${number(p.W / 1000, 2)} <small>cm³</small></strong></div><div><span>Dimensionerande moment</span><strong>${number(p.moment / 1e6, 2)} <small>kNm</small></strong></div><div><span>Nedböjning vid ändarna</span><strong>${number(p.deflection)} <small>mm</small></strong></div></div><p class="result-foot">Tibnor 2023, sida ${p.sourcePage} · egenvikt ${number(p.beamMass, 2)} kg · skjuvutnyttjande ${number(p.shearRatio * 100, 0)} % · nedböjning utan lastfaktor</p>` : `<div class="no-result"><h3>Ingen kandidat klarar modellens krav.</h3><p>Krävt W utan balkens egenvikt: ${number(current.loadRequiredW / 1000)} cm³. Jämförelselistan räcker inte för denna last och spännvidd, eller så krävs ytterligare skjuvkontroll. Det innebär inte att en lämplig profil saknas på marknaden.</p></div>`;
    renderRows();
    updateReportSelection();
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
    document.getElementById('result').innerHTML = '<p class="no-result">Fyll i giltiga förutsättningar för att visa ett resultat.</p>';
    document.getElementById('profile-rows').replaceChildren();
    current = null;
    currentInput = null;
    updateReportSelection();
  }
}
form.addEventListener('submit', event => { event.preventDefault(); update(); });
form.addEventListener('input', update);
document.getElementById('toggle-profiles').addEventListener('click', () => { if (current) { expanded = !expanded; renderRows(); } });
function updateReportSelection() {
  const profile = current?.rows.find(p => p.name === reportProfile);
  document.getElementById('open-report').disabled = !profile;
  document.getElementById('report-selection').textContent = profile
    ? `${profile.name} · böjutnyttjande ${number(profile.utilization * 100, 1)} %`
    : 'Välj en profil i tabellen med giltiga indata.';
}
document.getElementById('profile-rows').addEventListener('change', event => {
  if (event.target.name !== 'report-profile') return;
  reportProfile = event.target.value;
  renderRows();
  updateReportSelection();
  document.querySelector('input[name="report-profile"]:checked')?.focus();
});
const reportDialog = document.getElementById('report-dialog');
document.getElementById('open-report').addEventListener('click', () => {
  if (!current || !currentInput || !reportProfile) return;
  document.getElementById('report-content').innerHTML = BeamReport.render(reportProfile, currentInput, document.getElementById('report-reference').value);
  reportDialog.showModal();
});
document.getElementById('close-report').addEventListener('click', () => reportDialog.close());
document.getElementById('print-report').addEventListener('click', () => {
  printTitle = document.title;
  document.title = `Kontrollberakning_${reportProfile.replaceAll(' × ', 'x').replaceAll(' ', '_')}`;
  window.print();
});
window.addEventListener('afterprint', () => {
  if (printTitle) { document.title = printTitle; printTitle = null; }
});
update();
