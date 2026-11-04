(function (root) {
  'use strict';

  const constants = Object.freeze({
    g: 9.82,
    defaultFactor: 2,
    allowableStress: 355,
    // Uttryckligen angivet i användarens C2-underlag, i MPa.
    allowableShear: 213
  });

  function positive(value, name, max) {
    if (!Number.isFinite(value) || value <= 0 || value > max) {
      throw new RangeError(`${name} ska vara större än 0 och högst ${max.toLocaleString('sv-SE')}.`);
    }
  }

  function calculate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TypeError('Indata för C2-lastöra ska vara ett objekt.');
    }
    const { mass, factor = constants.defaultFactor, t, a, b, lever } = input;
    positive(mass, 'Lastvikt (kg)', 1000000);
    if (!Number.isFinite(factor) || factor < 1 || factor > 10) {
      throw new RangeError('Säkerhetsfaktor n ska vara minst 1 och högst 10.');
    }
    positive(t, 'Plåttjocklek t (mm)', 20000);
    positive(a, 'Mått a (mm)', 20000);
    positive(b, 'Mått b (mm)', 20000);
    positive(lever, 'Hävarm L (mm)', 20000);

    // Nominell kontroll enligt den bifogade skissen ”C2-lastöra”.
    // Två lika belastade sidor; inga bidrag från egenvikt. Spänningarna
    // gäller den skissade idealiseringen. Hålet och C1-kontrollen ingår inte.
    const force = factor * mass * constants.g;
    const loadPerSide = force / 2;
    const shearAreaPerSide = a * t;
    const tensionAreaPerSide = b * t;
    // Härlett för ett massivt rektangulärt snitt med höjd a och bredd t:
    // Wx = I/(a/2) = (t*a³/12)/(a/2) = t*a²/6.
    // Underlagets nämnare är inte ifylld; detta är ett modellantagande.
    const W = t * a ** 2 / 6;
    const moment = loadPerSide * lever;
    const shearStress = loadPerSide / shearAreaPerSide;
    const bendingStress = moment / W;
    const tensionStress = loadPerSide / tensionAreaPerSide;
    // Summan följer C2-underlaget; ingen separat von Mises-kontroll antas.
    const totalStress = bendingStress + tensionStress;
    const shearUtilization = shearStress / constants.allowableShear;
    const bendingUtilization = bendingStress / constants.allowableStress;
    const totalUtilization = totalStress / constants.allowableStress;
    const utilization = Math.max(shearUtilization, totalUtilization);
    const result = {
      mass, factor, t, a, b, lever,
      force, loadPerSide, shearAreaPerSide, tensionAreaPerSide, W, moment,
      shearStress, bendingStress, tensionStress, totalStress,
      shearUtilization, bendingUtilization, totalUtilization, utilization
    };
    // Även ändliga men extremt små indata kan ge numeriskt odefinierade
    // kvoter. Returnera aldrig ett skenbart beräkningsresultat med NaN/∞.
    if (!Object.values(result).every(Number.isFinite) || W <= 0 || shearAreaPerSide <= 0 || tensionAreaPerSide <= 0) {
      throw new RangeError('Dimensionerna är för små för en ändlig C2-beräkning.');
    }
    return result;
  }

  const api = { constants, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.C2Calculations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
