(function (root) {
  'use strict';

  const constants = Object.freeze({
    g: 9.82,
    defaultFactor: 2,
    E: 210000,
    allowableStress: 355,
    allowableShear: 213
  });

  function positive(value, name, max) {
    if (!Number.isFinite(value) || value <= 0 || value > max) {
      throw new RangeError(`${name} ska vara större än 0 och högst ${max.toLocaleString('sv-SE')}.`);
    }
  }

  function calculate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Indata för C4-lastkrok ska vara ett objekt.');
    }
    const { mass, factor = constants.defaultFactor, k, t, innerDiameter } = input;
    positive(mass, 'Lastvikt (kg)', 1000000);
    if (!Number.isFinite(factor) || factor < 1 || factor > 10) {
      throw new RangeError('Säkerhetsfaktor n ska vara minst 1 och högst 10.');
    }
    positive(k, 'Tvärsnittshöjd k (mm)', 20000);
    positive(t, 'Plåttjocklek t (mm)', 20000);
    positive(innerDiameter, 'Innerdiameter (mm)', 20000);

    // Nominell konsolbalksmodell enligt det bifogade underlaget
    // ”C4-lastkrok”. Rakt, massivt rektangulärt snitt, ingen egenvikt.
    // Krökt balk, lokal kontakt, stabilitet och samverkande spänningar
    // kontrolleras inte av denna modell.
    const force = mass * constants.g * factor;
    const area = k * t;
    const lever = k / 2 + innerDiameter / 2;
    // Behåll full precision. Underlagets W≈1042 mm³ och I≈13021 mm⁴
    // är avrundningar; dessa ger små skillnader i utskrivna handvärden.
    const W = t * k ** 2 / 6;
    const I = t * k ** 3 / 12;
    const signedMoment = -force * lever;
    const moment = Math.abs(signedMoment);
    const signedStress = signedMoment / W;
    const bendingStress = Math.abs(signedStress);
    // Underlaget använder medelskjuvspänning F/A, utan faktorn 1,5.
    const shearStress = force / area;
    // Även nedböjningen använder den faktorerade kraften enligt underlaget.
    const deflection = force * lever ** 3 / (3 * constants.E * I);
    const shearUtilization = shearStress / constants.allowableShear;
    const bendingUtilization = bendingStress / constants.allowableStress;
    const utilization = Math.max(shearUtilization, bendingUtilization);
    const result = {
      mass, factor, k, t, innerDiameter,
      force, area, lever, W, I, signedMoment, moment,
      signedStress, bendingStress, shearStress, deflection,
      shearUtilization, bendingUtilization, utilization
    };
    if (!Object.values(result).every(Number.isFinite) || area <= 0 || W <= 0 || I <= 0) {
      throw new RangeError('Dimensionerna är för små för en ändlig C4-beräkning.');
    }
    return result;
  }

  const api = { constants, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.C4Calculations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
