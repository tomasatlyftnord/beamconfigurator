(function (root) {
  'use strict';

  const constants = Object.freeze({
    g: 9.82,
    defaultFactor: 2,
    allowableStress: 355,
    allowableShear: 0.6 * 355
  });

  function positive(value, name, max) {
    if (!Number.isFinite(value) || value <= 0 || value > max) {
      throw new RangeError(`${name} ska vara större än 0 och högst ${max.toLocaleString('sv-SE')}.`);
    }
  }

  function calculate(input, planes) {
    if (planes !== 1 && planes !== 2) {
      throw new RangeError('Skjuvmodellen ska ha ett eller två skjuvplan.');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Indata för plåtens skjuvkontroll ska vara ett objekt.');
    }
    const { mass, factor = constants.defaultFactor, k, t } = input;
    positive(mass, 'Lastvikt (kg)', 1000000);
    if (!Number.isFinite(factor) || factor < 1 || factor > 10) {
      throw new RangeError('Säkerhetsfaktor n ska vara minst 1 och högst 10.');
    }
    positive(k, 'Skjuvhöjd k (mm)', 20000);
    positive(t, 'Plåttjocklek t (mm)', 20000);

    // Nominell medelskjuvspänning enligt användarens C1- och L1-underlag.
    // C1: två lika belastade skjuvplan. L1: ett skjuvplan i ringens krona.
    // Varje skjuvplan har arean k*t. Ingen böjning, lokal kontakt, svets,
    // stabilitet eller egenvikt ingår i den här kontrollen.
    const force = mass * constants.g * factor;
    const areaPerPlane = k * t;
    const totalShearArea = planes * areaPerPlane;
    const forcePerPlane = force / planes;
    const shearStress = force / totalShearArea;
    const utilization = shearStress / constants.allowableShear;
    const result = {
      mass, factor, k, t,
      force, areaPerPlane, totalShearArea, planes, forcePerPlane,
      shearStress, utilization
    };
    // Avvisa både overflow och underflow i härledda storheter, så att ett
    // numeriskt nollvärde inte kan tolkas som en giltig spänningskontroll.
    if (!Object.values(result).every(value => Number.isFinite(value) && value > 0)) {
      throw new RangeError('Indata är för små för en ändlig skjuvberäkning.');
    }
    return result;
  }

  function c1(input) {
    return calculate(input, 2);
  }

  function l1(input) {
    return calculate(input, 1);
  }

  const api = { constants, c1, l1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PlateShearCalculations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
