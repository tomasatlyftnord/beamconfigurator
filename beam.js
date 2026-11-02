(function (root) {
  'use strict';
  const G = 9.81;
  const E = 210000;
  const table = typeof module !== 'undefined' && module.exports ? require('./profiles.js') : root.TibnorProfiles;
  if (!table) throw new Error('Tibnors profildata saknas. Läs in profiles.js före beam.js.');
  const profiles = table.map(row => {
    const h = row.h_mm, b = row.b_mm, t = row.t_mm;
    return { h, b, t, I: row.I_cm4 * 10000, W: row.Wel_cm3 * 1000,
      mass: row.mass_kg_m, area: row.area_mm2, sourcePage: row.source_page,
      // Separat förenklad uppskattning för skjuvning; ej ett Tibnor-tabellvärde.
      shearArea: 2 * t * (h - 6 * t), name: `VKR ${h} × ${b} × ${t.toLocaleString('sv-SE')}` };
  });
  function validate({ span, mass, factor, fy }) {
    if (![span, mass, factor, fy].every(Number.isFinite)) throw new RangeError('Fyll i alla fält med giltiga tal.');
    if (span < 100 || span > 20000) throw new RangeError('C-c-måttet ska vara 100–20 000 mm.');
    if (mass <= 0 || mass > 1000000) throw new RangeError('Lastvikten ska vara större än 0 och högst 1 000 000 kg.');
    if (factor < 1 || factor > 10) throw new RangeError('Lastfaktorn ska vara mellan 1 och 10.');
    if (![235, 355].includes(fy)) throw new RangeError('Välj S235 eller S355.');
  }
  function evaluate(profile, input) {
    const { span: L, mass, factor, fy } = input;
    const P = mass * G;
    const q = profile.mass * G / 1000; // N/mm, egenvikt över hela längden L
    const momentLoad = factor * P * L / 4;
    const momentSelf = factor * q * L ** 2 / 8;
    const moment = momentLoad + momentSelf;
    const capacity = profile.W * fy; // elastisk böjning, gamma_M = 1,0
    const shear = factor * (P / 2 + q * L / 2);
    const shearCapacity = profile.shearArea * fy / Math.sqrt(3);
    const deflectionLoad = P * L ** 3 / (48 * E * profile.I);
    const deflectionSelf = q * L ** 4 / (128 * E * profile.I);
    return { ...profile, force: P, lineLoad: q, momentLoad, momentSelf, moment, capacity, stress: moment / profile.W, requiredW: moment / fy,
      utilization: moment / capacity, shear, shearCapacity,
      shearRatio: shear / shearCapacity,
      deflectionLoad, deflectionSelf, deflection: deflectionLoad + deflectionSelf,
      beamMass: profile.mass * L / 1000 };
  }
  function calculate(input) {
    validate(input);
    const rows = profiles.map(p => evaluate(p, input)).sort((a, b) => a.W - b.W || a.mass - b.mass);
    // Vid hög skjuvning behövs en interaktionskontroll som denna modell inte utför.
    const chosen = rows.find(p => p.utilization <= 1 && p.shearRatio <= 0.5) || null;
    return { chosen, rows, loadMoment: input.factor * input.mass * G * input.span / 4,
      loadRequiredW: input.factor * input.mass * G * input.span / (4 * input.fy) };
  }
  const api = { profiles, calculate, evaluate, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Beam = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
