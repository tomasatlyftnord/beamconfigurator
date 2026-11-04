(function (root) {
  'use strict';

  const Beam = typeof module !== 'undefined' && module.exports ? require('./beam.js') : root.Beam;
  if (!Beam) throw new Error('Balkmodellen saknas. Läs in profiles.js och beam.js före asymmetric-beam.js.');
  // Behåll Tibnors tabellvärden, enheter och materialkonstanter från Beam.
  const { constants, profiles } = Beam;

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Indata för asymmetriskt lyftok ska vara ett objekt.');
    }
    Beam.validate(input);
    if (!Number.isFinite(input.liftPosition) || input.liftPosition <= 0 || input.liftPosition >= input.span) {
      throw new RangeError('Lyftpunktens läge a ska vara större än 0 och mindre än c-c-måttet L.');
    }
  }

  function loadCase(input) {
    validate(input);
    const { span, mass, factor, liftPosition } = input;
    const leftLength = liftPosition;
    const rightLength = span - liftPosition;
    const force = mass * constants.g;
    // Kraft- och momentjämvikt kräver olika ändlaster när lyftpunkten
    // förskjuts. Massorna avser den totala lasten, utan balkens egenvikt.
    const leftMass = mass * rightLength / span;
    const rightMass = mass * leftLength / span;
    const leftForce = force * rightLength / span;
    const rightForce = force * leftLength / span;
    const moment = factor * force * leftLength * rightLength / span;
    const requiredW = moment / constants.allowableStress;
    const loads = {
      span, totalMass: mass, factor, liftPosition,
      leftLength, rightLength, force, leftForce, rightForce, leftMass, rightMass,
      moment, requiredW
    };
    if (!Object.values(loads).every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('Indata ger inte två positiva, ändliga ändlaster.');
    }
    return loads;
  }

  function evaluateLoads(profile, loads) {
    if (!profile || typeof profile !== 'object') throw new TypeError('Välj en giltig profil.');
    if (![profile.I, profile.W].every(value => Number.isFinite(value) && value > 0) ||
        (profile.mass !== undefined && (!Number.isFinite(profile.mass) || profile.mass < 0))) {
      throw new RangeError('Profilens I och W ska vara positiva, ändliga tal och profilvikten får inte vara negativ.');
    }
    const { span: L, leftLength: a, rightLength: b, force: F, moment } = loads;
    const capacity = profile.W * constants.allowableStress;
    const stress = moment / profile.W;
    const utilization = moment / capacity;
    // En ensam ledad lyftpunkt bestämmer inte balkens stelkroppsrotation.
    // Använd därför deformation relativt kordan mellan ändlastpunkterna.
    // Lösningen motsvarar, upp till tecknet, en fritt upplagd balk med
    // punktlast F i x=a. Brukslasten F är här utan säkerhetsfaktorn n.
    const deflectionAtLift = F * a ** 2 * b ** 2 / (3 * constants.E * profile.I * L);
    const s = Math.min(a, b);
    const D = L ** 2 - s ** 2;
    const deflection = F * s * D ** 1.5 / (9 * Math.sqrt(3) * constants.E * profile.I * L);
    const xMaxDeflection = a <= L / 2 ? L - Math.sqrt((L ** 2 - a ** 2) / 3) : Math.sqrt((L ** 2 - b ** 2) / 3);
    const checks = [capacity, stress, utilization, deflectionAtLift, deflection, xMaxDeflection];
    if (!checks.every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('Indata ger inte en ändlig balkberäkning.');
    }
    // loads.totalMass är lasten i kg; profile.mass förblir tabellens kg/m.
    return { ...profile, ...loads, capacity, stress, utilization, deflection, deflectionAtLift, xMaxDeflection };
  }

  function evaluate(profile, input) {
    return evaluateLoads(profile, loadCase(input));
  }

  function calculate(input) {
    const loads = loadCase(input);
    const rows = profiles.map(profile => evaluateLoads(profile, loads)).sort((a, b) => a.W - b.W || a.mass - b.mass);
    const chosen = rows.find(profile => profile.utilization <= 1) || null;
    return { chosen, rows, ...loads, loadMoment: loads.moment, loadRequiredW: loads.requiredW };
  }

  const api = { constants, profiles, validate, loadCase, evaluate, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AsymmetricBeam = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
