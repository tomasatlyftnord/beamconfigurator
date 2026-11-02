(function (root) {
  'use strict';
  const G = 9.82;
  const E = 210000;
  const ALLOWABLE_STRESS = 355; // sigma_till, alltid 355 MPa
  const table = typeof module !== 'undefined' && module.exports ? require('./profiles.js') : root.TibnorProfiles;
  if (!table) throw new Error('Tibnors profildata saknas. Läs in profiles.js före beam.js.');
  const profiles = table.map(row => {
    const h = row.h_mm, b = row.b_mm, t = row.t_mm;
    return { h, b, t, I: row.I_cm4 * 10000, W: row.Wel_cm3 * 1000,
      mass: row.mass_kg_m, area: row.area_mm2, sourcePage: row.source_page,
      name: `VKR ${h} × ${b} × ${t.toLocaleString('sv-SE')}` };
  });
  function validate({ span, mass, factor }) {
    if (![span, mass, factor].every(Number.isFinite)) throw new RangeError('Fyll i alla fält med giltiga tal.');
    if (span < 100 || span > 20000) throw new RangeError('C-c-måttet ska vara 100–20 000 mm.');
    if (mass <= 0 || mass > 1000000) throw new RangeError('Lastvikten ska vara större än 0 och högst 1 000 000 kg.');
    if (factor < 1 || factor > 10) throw new RangeError('Säkerhetsfaktorn n ska vara mellan 1 och 10.');
  }
  function evaluate(profile, input) {
    const { span: L, mass, factor: safetyFactor } = input;
    const F = mass * G;
    const moment = safetyFactor * F * L / 4;
    const capacity = profile.W * ALLOWABLE_STRESS;
    return { ...profile, force: F, moment, capacity, stress: moment / profile.W,
      requiredW: moment / ALLOWABLE_STRESS, utilization: moment / capacity,
      deflection: F * L ** 3 / (48 * E * profile.I) };
  }
  function calculate(input) {
    validate(input);
    const rows = profiles.map(p => evaluate(p, input)).sort((a, b) => a.W - b.W || a.mass - b.mass);
    const chosen = rows.find(p => p.utilization <= 1) || null;
    return { chosen, rows, loadMoment: input.factor * input.mass * G * input.span / 4,
      loadRequiredW: input.factor * input.mass * G * input.span / (4 * ALLOWABLE_STRESS) };
  }
  const constants = Object.freeze({ g: G, E, allowableStress: ALLOWABLE_STRESS });
  const api = { profiles, calculate, evaluate, validate, constants };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Beam = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
