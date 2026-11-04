(function (root) {
  'use strict';

  const constants = Object.freeze({
    g: 9.82,
    E: 210000,
    poisson: 0.3,
    G: 210000 / (2 * (1 + 0.3)),
    allowableStress: 355,
    allowableShear: 355 / Math.sqrt(3)
  });

  function range(value, name, min, max, allowMin = true) {
    if (!Number.isFinite(value) || (allowMin ? value < min : value <= min) || value > max) {
      throw new RangeError(`${name} ska vara ${allowMin ? 'minst' : 'större än'} ${min.toLocaleString('sv-SE')} och högst ${max.toLocaleString('sv-SE')}.`);
    }
  }

  function rectangle(b, h) {
    range(b, 'Tvärsnittsbredd b (mm)', 1, 5000);
    range(h, 'Tvärsnittshöjd h (mm)', 1, 5000);
    return { b, h, area: b * h, I: b * h ** 3 / 12, W: b * h ** 2 / 6 };
  }

  function load(input) {
    range(input.mass, 'Lastvikt (kg)', 0, 1000000, false);
    range(input.factor, 'Säkerhetsfaktor n', 1, 10);
    const force = input.mass * constants.g;
    return { force, designForce: input.factor * force };
  }

  function stresses(section, loads, moment, shear) {
    const bendingStress = moment / section.W;
    // Maximal skjuvspänning för ett massivt rektangulärt tvärsnitt.
    const shearStress = 1.5 * shear / section.area;
    return {
      ...section, ...loads, moment, shear, bendingStress, shearStress,
      bendingUtilization: bendingStress / constants.allowableStress,
      shearUtilization: shearStress / constants.allowableShear
    };
  }

  function cHook(input) {
    const { b, h, reach, opening } = input;
    const section = rectangle(b, h);
    const loads = load(input);
    range(reach, 'Armlängd L₁ = L₂ (mm)', 1, 20000);
    range(opening, 'Höjd L mellan armarnas centrumlinjer (mm)', 1, 20000);
    if (reach <= h / 2) throw new RangeError('Armlängden L₁ = L₂ ska vara större än h/2 så att lastlinjen ligger utanför ryggen.');
    if (opening <= h) throw new RangeError('Höjden L mellan armarnas centrumlinjer ska vara större än h så att det finns en fri öppning.');

    // Förenklad rak C-ram med samma massiva rektangulära snitt i båda
    // armarna och ryggen. Övre och undre kraft verkar på samma vertikala
    // linje e från ryggens centrumlinje. Ingen egenvikt eller hörnverkan.
    const base = stresses(section, loads, loads.designForce * reach, loads.designForce);
    const axialForce = loads.designForce;
    const normalStress = axialForce / section.area;
    const backStress = normalStress + base.bendingStress;
    const armEquivalentStress = Math.max(base.bendingStress, Math.sqrt(3) * base.shearStress);
    // Ryggen har normalkraft och moment, men ingen tvärkraft. Armarna
    // har moment och tvärkraft, men ingen normalkraft. Kontrollera dem
    // separat; spänningar från olika delar får inte påstås vara samma punkt.
    const equivalentStress = Math.max(backStress, armEquivalentStress);
    // Enveloppens övre gräns behålls endast som en diagnostisk storhet.
    const equivalentUpperBound = Math.hypot(backStress, Math.sqrt(3) * base.shearStress);
    const armStability = cantileverLtb({ length: reach, b, h });
    return {
      ...base, reach, opening, axialForce, normalStress, backStress,
      normalUtilization: normalStress / constants.allowableStress,
      backUtilization: backStress / constants.allowableStress,
      armEquivalentStress, equivalentStress, equivalentUpperBound,
      utilization: equivalentStress / constants.allowableStress,
      armTorsionConstant: armStability.It,
      armLateralI: armStability.Iz,
      armCriticalMoment: armStability.criticalMoment,
      armCriticalForce: armStability.criticalForce,
      armStabilityRatio: base.moment / armStability.criticalMoment
    };
  }

  function cantileverLtb(input) {
    const { length, b, h } = input;
    rectangle(b, h);
    range(length, 'Konsollängd (mm)', 1, 100000);
    const a = Math.max(b, h), c = Math.min(b, h);
    // Saint-Venants vridkonstant för en massiv rektangel, standardmässig
    // approximation. Iz är trögheten för rörelse ut ur C-krokens plan.
    const ratio = c / a;
    const It = a * c ** 3 * (1 / 3 - 0.21 * ratio * (1 - ratio ** 4 / 12));
    const Iz = h * b ** 3 / 12;
    // Klassisk elastisk konsolmodell med punktlast genom skjuvcentrum:
    // Pcr = 4,013*sqrt(E*Iz*G*It)/L², Mcr = Pcr*L.
    // Idealt fast inspänd i sidled och vridning, fri ände, ingen välvning,
    // lasthöjd, rotfjädring eller koppling till övriga C-ramen beaktas.
    // Värdet är en idealiserad armkontroll, inte C-krokens fulla stabilitet.
    const coefficient = 4.013;
    const criticalMoment = coefficient / length * Math.sqrt(constants.E * Iz * constants.G * It);
    return {
      length, b, h, coefficient, It, Iz, criticalMoment,
      criticalMomentKNm: criticalMoment / 1e6,
      criticalForce: criticalMoment / length
    };
  }

  function bendingShear(input) {
    const { b, h, span } = input;
    const section = rectangle(b, h);
    const loads = load(input);
    range(span, 'Spännvidd L (mm)', 10, 100000);
    // Fritt upplagd, rak, prismatisk balk med central punktlast.
    // För rektangeln är sigma = sigma_max*y och tau = tau_max*(1-y²),
    // |y| <= 1. Kvadraten på von Mises-spänningen är konvex i y²,
    // så dess maximum är vid y=0 eller |y|=1, inte summan av maxima.
    const base = stresses(section, loads, loads.designForce * span / 4, loads.designForce / 2);
    const equivalentStress = Math.max(base.bendingStress, Math.sqrt(3) * base.shearStress);
    return {
      ...base, span, equivalentStress,
      utilization: equivalentStress / constants.allowableStress,
      // Euler–Bernoulli, ofaktorerad last; skjuvdeformation ingår inte.
      deflection: loads.force * span ** 3 / (48 * constants.E * section.I)
    };
  }

  function ltb(input) {
    const { length, Iz, It, Iw } = input;
    range(length, 'Ostagad längd L (mm)', 10, 100000);
    range(Iz, 'Svagaxeltröghet I_z (cm⁴)', 0, 1e12, false);
    range(It, 'Vridstyvhetsfaktor I_t (cm⁴)', 0, 1e12, false);
    range(Iw, 'Välvtröghet I_w (cm⁶)', 0, 1e18);
    const IzMm4 = Iz * 10000;
    const ItMm4 = It * 10000;
    const IwMm6 = Iw * 1000000;
    // Elastiskt kritiskt vippmoment för dubbelsymmetriskt, prismatiskt
    // tvärsnitt under konstant moment: gaffellagrade ändar, fri välvning,
    // inga mellanliggande stag eller destabiliserande lasthöjd.
    // C1 = k = kw = 1. M_cr är inte en dimensionerande momentkapacitet.
    const torsionTerm = constants.G * ItMm4;
    const warpingTerm = Math.PI ** 2 * constants.E * IwMm6 / length ** 2;
    const criticalMoment = Math.PI / length * Math.sqrt(constants.E * IzMm4 * (torsionTerm + warpingTerm));
    return {
      length, Iz, It, Iw, IzMm4, ItMm4, IwMm6,
      torsionTerm, warpingTerm, criticalMoment,
      criticalMomentKNm: criticalMoment / 1000000
    };
  }

  const api = { constants, rectangle, cHook, bendingShear, cantileverLtb, ltb };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EngineeringCalculations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
