(function (root) {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? require('./workbook-data.js') : root.WorkbookData;
  const G = 9.82, E = 210000, SIGMA = 355, TAU = 213;
  const numeric = (name, label, unit, value, min = 0.001, max = 1000000000) => ({ name, label, unit, default: value, min, max });
  const mass = (name, value) => numeric(name, 'Maximal total lastvikt m', 'kg', value);
  const length = (name, label, value) => numeric(name, label, 'mm', value);
  const factor = (name, value = 2, label = 'Säkerhetsfaktor n') => numeric(name, label, '', value, 1, 100);
  const gamma = name => numeric(name, 'Knäcklängdsfaktor γ', '', 1, 0.001, 100);
  const angle = name => ({ ...numeric(name, 'Kättingvinkel mot horisontalplanet α', '°', 45, 0.001, 89.999), help: 'Arbetsbokens vinkel mäts från horisontalplanet.' });
  const profile = (name, label, value) => ({ name, label, type: 'profile', default: value });
  const models = [
    { id: 'wb-l1', category: 'components', sheet: 'L1', title: 'L1 – en skjuvarea', fields: [mass('E24', 12500), length('E25', 'Skjuvlängd K', 48), length('E26', 'Plåttjocklek t', 25), factor('E27')] },
    { id: 'wb-c1', category: 'components', sheet: 'C1', title: 'C1 – två skjuvareor', fields: [mass('E27', 12500), length('E28', 'Skjuvlängd K per sida', 15), length('E29', 'Plåttjocklek t', 25), factor('E30')] },
    { id: 'wb-kb5', category: 'components', sheet: 'Balkböjning (KB5)', title: 'KB5 – balk med central punktlast', fields: [mass('E28', 400), length('E29', 'Balklängd L', 350), profile('E30', 'Balkprofil', '50x30x4'), factor('E34')] },
    { id: 'wb-kb6', category: 'components', sheet: 'Balkböjning-Assymetrisk (KB6)', title: 'KB6 – balk med asymmetrisk punktlast', fields: [mass('E27', 10000 / 3 * 2), length('E28', 'Balklängd L', 962), length('E29', 'Avstånd a från vänster stöd till punktlasten', 371), profile('E30', 'Balkprofil', '150x100x6,3'), factor('E34')] },
    { id: 'wb-h-ok', category: 'products', sheet: 'H-ok', title: 'H-ok – huvudbalk och tvärbalkar', fields: [mass('E27', 1500), length('E28', 'Huvudbalkens längd L', 1384), profile('E29', 'Huvudbalkens profil', '100x50x6'), length('E31', 'Tvärbalkarnas längd Lₜ', 1230), profile('E32', 'Tvärbalkarnas profil', '80x40x4'), factor('E38')] },
    { id: 'wb-ramok', category: 'products', sheet: 'Ramok', title: 'Ramok – axiella krafter och knäckning', fields: [mass('E31', 7700), length('E32', 'Längd sida 1', 1200), length('E33', 'Längd sida 2', 1600), profile('E34', 'Ramens balkprofil', '60x60x3,2'), angle('E36'), factor('E40'), gamma('E54')] },
    { id: 'wb-c-hook', category: 'components', sheet: 'C-krok (profiler)', title: 'C-krok av profiler – arbetsbokens modell', fields: [mass('E22', 125), length('E23', 'Rygglängd L', 500), length('E24', 'Övre armlängd L₁', 185), length('E25', 'Nedre armlängd L₂', 185), profile('E26', 'Krokens balkprofil', '40x40x4'), factor('E33'), factor('E34', 2.8, 'Säkerhetsfaktor för vippningsmoment nᵥ')] },
    { id: 'wb-kb2', category: 'components', sheet: 'Konsolbalk (KB2)', title: 'KB2 – konsolbalk med punktlast', fields: [mass('E28', 200), length('E29', 'Konsolens längd L', 165), profile('E30', 'Balkprofil', '160x160x12,5'), factor('E34')] },
    { id: 'wb-spridarok', category: 'products', sheet: 'Spridarok', title: 'Spridarok – tryck och knäckning', fields: [mass('E27', 2000), length('E28', 'Balklängd L', 1384), profile('E29', 'Balkprofil', '60x60x3,2'), angle('E31'), factor('E35'), gamma('E41')] },
    { id: 'wb-semispridarok', category: 'products', sheet: 'Semispridarok', title: 'Semispridarok – knäckning och böjning', fields: [mass('E27', 280000), length('E28', 'c-c lyftöron L', 5400), { ...length('E29', 'Utstickande balklängd a per ände', 300), min: 0 }, profile('E30', 'Balkprofil', '400x400x16'), angle('E32'), factor('E36'), gamma('E42')] }
  ];
  const modelMap = new Map(models.map(model => [model.id, model]));
  const sheetMap = new Map(data.sheets.map(sheet => [sheet.name, sheet]));
  const profileMap = new Map(data.profiles.map(p => [p.name, p]));
  function getModel(id) {
    const model = modelMap.get(id);
    if (!model) throw new RangeError('Okänt beräkningsfall i arbetsboken.');
    return model;
  }
  function defaults(id) { return Object.fromEntries(getModel(id).fields.map(field => [field.name, field.default])); }
  function validate(model, supplied) {
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) throw new TypeError('Indata ska vara ett objekt.');
    const input = { ...defaults(model.id), ...supplied };
    for (const field of model.fields) {
      const value = input[field.name];
      if (field.type === 'profile') {
        if (typeof value !== 'string' || !profileMap.has(value)) throw new RangeError(`Välj en giltig tabellprofil för ${field.label.toLowerCase()}.`);
      } else if (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max) {
        throw new RangeError(`${field.label} måste vara ett ändligt tal mellan ${field.min} och ${field.max}${field.unit ? ' ' + field.unit : ''}.`);
      }
    }
    if (model.id === 'wb-kb6' && !(input.E29 > 0 && input.E29 < input.E28)) throw new RangeError('Punktlastens läge a måste ligga strikt mellan balkens ändar: 0 < a < L.');
    return Object.fromEntries(model.fields.map(field => [field.name, input[field.name]]));
  }
  function requireProperties(p, properties) {
    for (const key of properties) {
      if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] <= 0) {
        throw new RangeError(`Profil ${p.name}: arbetsboken saknar ett positivt, giltigt tabellvärde för ${key}. Välj en annan profil; värdet uppskattas inte.`);
      }
    }
    if (properties.includes('A') && (p.family === 'HEA' || /^HE\s/.test(p.name))) {
      throw new RangeError(`Profil ${p.name}: HEA-tabellens area har oklar/felaktig enhet och kan inte användas för tryck, drag eller knäckning. Verifiera A i mm² innan denna profil kan beräknas.`);
    }
  }
  function nextBuckling(lambda, firstRow = 7) {
    const selected = data.buckling.find(row => row.row >= firstRow && row.row <= 29 && row.lambda > lambda);
    if (!selected) throw new RangeError('Slankhetstalet ligger utanför arbetsbokens knäcktabell (λ måste vara mindre än 190). Ingen extrapolering utförs.');
    return selected;
  }
  const units = {
    'wb-l1': { E30: 'MPa', E31: '%' },
    'wb-c1': { E33: 'MPa', E34: '%' },
    'wb-kb5': { E31: '', E32: 'mm³', E33: 'mm⁴', E37: 'MPa', E38: '%', E39: 'mm', E40: 'mm' },
    'wb-kb6': { E27: 'kg', E31: '', E32: 'mm³', E33: 'mm⁴', E37: 'Nmm', E38: 'MPa', E39: '%', E40: 'mm', E41: 'mm', E42: 'mm' },
    'wb-h-ok': { E30: '', E33: '', E34: 'mm³', E35: 'mm⁴', E36: 'mm³', E37: 'mm⁴', E41: 'MPa', E42: '%', E43: 'mm', E44: 'mm', E45: 'MPa', E46: '%', E47: 'mm', E48: 'mm' },
    'wb-ramok': { E35: '', E37: 'mm³', E38: 'mm⁴', E39: 'mm²', E44: 'N', E45: '°', E46: '°', E47: 'N', E48: 'N', E49: 'N', E50: 'N', E51: 'MPa', E52: 'MPa', E53: 'mm', E55: 'mm', E56: 'mm', E57: '', E58: '', E59: '', E60: '', E61: 'MPa', E62: 'MPa', E63: '%', E64: '%' },
    'wb-c-hook': { E27: '', E28: 'mm³', E29: 'mm⁴', E30: 'mm⁴', E31: 'mm⁴', E32: 'mm²', E66: 'Nmm', E67: 'MPa', E68: '%', E69: 'mm', E70: 'mm', E83: 'mm/%', E91: 'mm', E92: 'MPa', E93: 'MPa', E94: 'MPa', E95: '%', E96: 'mm', E97: 'mm', E98: 'Nmm', E99: 'Nmm', E117: 'Nmm', E118: 'MPa', E119: '%', E120: 'mm', E121: 'mm', E139: 'mm', E140: '', E141: 'mm', E142: 'mm', E143: 'mm', E144: 'mm', E145: 'mm', E146: 'mm', E147: 'mm' },
    'wb-kb2': { E31: '', E32: 'mm³', E33: 'mm⁴', E37: 'MPa', E38: '%', E39: 'mm', E40: 'mm' },
    'wb-spridarok': { E30: '', E32: 'mm³', E33: 'mm⁴', E34: 'mm²', E38: 'N', E39: 'MPa', E40: 'mm', E42: 'mm', E43: '', E44: '', E45: 'MPa', E46: '%' },
    'wb-semispridarok': { E31: '', E33: 'mm³', E34: 'mm⁴', E35: 'mm²', E39: 'N', E40: 'MPa', E41: 'mm', E43: 'mm', E44: '', E45: '', E46: 'MPa', E47: '%', E48: 'Nmm', E49: 'MPa', E50: '%', E51: '%' }
  };
  function calculate(id, supplied = {}) {
    const model = getModel(id), sheet = sheetMap.get(model.sheet), input = validate(model, supplied);
    const c = { ...input }, checks = [], warnings = [], profiles = [];
    function selected(cell, properties) {
      const p = profileMap.get(c[cell]);
      requireProperties(p, properties);
      profiles.push(p);
      if (Array.isArray(p.validityWarnings)) warnings.push(...p.validityWarnings.map(w => `${p.name}: ${w}`));
      return p;
    }
    function section(inputCell, indexCell, assignments, properties) {
      const p = selected(inputCell, properties);
      c[indexCell] = p.index;
      for (const [cell, key] of Object.entries(assignments)) c[cell] = p[key];
      return p;
    }
    function check(label, valueCell, limit, unit, strict = false) {
      const value = c[valueCell], limitValue = typeof limit === 'string' ? c[limit] : limit;
      checks.push({ label, value, limit: limitValue, unit, pass: strict ? value < limitValue : value <= limitValue, cell: valueCell, limitCell: typeof limit === 'string' ? limit : null });
    }
    function bucklingWarning(p) {
      warnings.push('Knäcktabellen saknar verifierad standardhänvisning och material-/knäckkurva. Resultatet återger underlagets tabellmetod, inte en fullständig stabilitetsverifiering.');
      warnings.push('Arbetsboken väljer nästa strikt större tabellvärde för λ, även när λ exakt motsvarar en tabellrad.');
      if (Math.abs(p.Ix - p.Iy) > 1e-8 * p.Ix || !Number.isFinite(p.Iy) || p.Iy <= 0) {
        warnings.push('Knäckningen beräknas med iₓ = √(Iₓ/A), inte minsta tröghetsradien. Svagaxelknäckning saknas för denna profil och måste kontrolleras separat.');
      }
    }
    switch (id) {
      case 'wb-l1':
        c.E30 = c.E24 * G * c.E27 / c.E25 / c.E26;
        c.E31 = c.E30 / TAU * 100;
        check('Nominell medelskjuvspänning', 'E30', TAU, 'MPa');
        warnings.push('Skjuvspänningen är nominell medelskjuvspänning F/(Kt), inte lokal maximal skjuvspänning vid hål eller radier.');
        break;
      case 'wb-c1':
        c.E33 = c.E27 * G * c.E30 / c.E28 / c.E29 / 2;
        c.E34 = c.E33 / TAU * 100;
        check('Nominell medelskjuvspänning över två lika areor', 'E33', TAU, 'MPa');
        warnings.push('Skjuvspänningen är nominell medelskjuvspänning F/(2Kt). Modellen förutsätter jämn fördelning över två lika skjuvareor; lokala toppar kontrolleras inte.');
        break;
      case 'wb-kb5':
      case 'wb-kb2': {
        section('E30', 'E31', { E32: 'W', E33: 'Ix' }, ['W', 'Ix']);
        const central = id === 'wb-kb5';
        c.E37 = c.E28 * G * c.E34 * c.E29 / (central ? 4 : 1) / c.E32;
        c.E38 = c.E37 / SIGMA * 100;
        c.E39 = c.E28 * G * c.E29 ** 3 / (central ? 48 : 3) / E / c.E33;
        c.E40 = c.E29 / 200;
        check('Böjspänning', 'E37', SIGMA, 'MPa');
        check('Nedböjning vid brukslast', 'E39', 'E40', 'mm');
        if (!central) warnings.push('Flikens rubrik anger KB5, men fliknamnet och formlerna avser konsolbalk KB2. Applikationen använder konsolformlerna.');
        break;
      }
      case 'wb-kb6':
        section('E30', 'E31', { E32: 'W', E33: 'Ix' }, ['W', 'Ix']);
        c.E37 = c.E27 * G * c.E34 * (c.E29 * (c.E28 - c.E29)) / c.E28;
        c.E38 = c.E37 / c.E32;
        c.E39 = c.E38 / SIGMA * 100;
        c.E40 = Math.min(c.E29, c.E28 - c.E29);
        c.E41 = c.E27 * G * c.E40 * (c.E28 ** 2 - c.E40 ** 2) ** (3 / 2) / 9 / Math.sqrt(3) / E / c.E33 / c.E28;
        c.E42 = c.E28 / 200;
        check('Böjspänning', 'E38', SIGMA, 'MPa');
        check('Största nedböjning vid brukslast', 'E41', 'E42', 'mm');
        warnings.push('Underlaget märker momentet E37 som Nm, men formeln med längder i mm ger Nmm. Applikationen visar den korrigerade enheten Nmm utan att ändra talvärdet.');
        break;
      case 'wb-h-ok':
        section('E29', 'E30', { E34: 'W', E35: 'Ix' }, ['W', 'Ix']);
        section('E32', 'E33', { E36: 'W', E37: 'Ix' }, ['W', 'Ix']);
        c.E41 = c.E27 * G * c.E38 * c.E28 / 4 / c.E34;
        c.E42 = c.E41 / SIGMA * 100;
        c.E43 = c.E27 * G * c.E28 ** 3 / 48 / E / c.E35;
        c.E44 = c.E28 / 200;
        c.E45 = (c.E27 * G * c.E38) / 2 * c.E31 / 4 / c.E36;
        c.E46 = c.E45 / SIGMA * 100;
        c.E47 = (c.E27 * G) / 2 * c.E31 ** 3 / 48 / E / c.E37;
        c.E48 = c.E31 / 200;
        check('Huvudbalk: böjspänning', 'E41', SIGMA, 'MPa');
        check('Huvudbalk: nedböjning', 'E43', 'E44', 'mm');
        check('Tvärbalk: böjspänning', 'E45', SIGMA, 'MPa');
        check('Tvärbalk: nedböjning', 'E47', 'E48', 'mm');
        warnings.push('Tvärbalkarna förutsätts bära hälften av totalvikten vardera och ha lika ändlaster. Huvudbalkens och tvärbalkarnas nedböjningar kontrolleras separat, inte som total deformation i en lastpunkt.');
        warnings.push('Bildformeln för tvärbalkens nedböjning saknar lastfaktorn 1/2 som finns i E47. Applikationen följer cellformeln E47 och halva totalvikten per tvärbalk.');
        break;
      case 'wb-ramok': {
        const p = section('E34', 'E35', { E37: 'W', E38: 'Ix', E39: 'A' }, ['W', 'Ix', 'A']);
        c.E44 = c.E31 * c.E40 * G / 3;
        c.E45 = Math.atan(c.E33 / c.E32) * 180 / Math.PI;
        c.E46 = Math.atan(c.E32 / c.E33) * 180 / Math.PI;
        c.E47 = c.E44 / Math.sin(c.E36 * Math.PI / 180);
        c.E48 = c.E47 * Math.cos(c.E36 * Math.PI / 180);
        c.E49 = c.E48 * Math.cos(c.E45 * Math.PI / 180);
        c.E50 = c.E48 * Math.cos(c.E46 * Math.PI / 180);
        c.E51 = c.E49 / c.E39;
        c.E52 = c.E50 / c.E39;
        c.E53 = Math.sqrt(c.E38 / c.E39);
        c.E55 = c.E54 * c.E32;
        c.E56 = c.E54 * c.E33;
        c.E57 = c.E55 / c.E53;
        c.E58 = c.E56 / c.E53;
        const table1 = nextBuckling(c.E57), table2 = nextBuckling(c.E58, 8);
        c.E59 = table1.lambda; c.E60 = table2.lambda;
        c.E61 = table1.stress; c.E62 = table2.stress;
        c.E63 = c.E51 / c.E61 * 100; c.E64 = c.E52 / c.E62 * 100;
        check('Sida 1: tryckspänning mot knäcktabell', 'E51', 'E61', 'MPa');
        check('Sida 2: tryckspänning mot knäcktabell', 'E52', 'E62', 'MPa');
        bucklingWarning(p);
        warnings.push('Vertikalkraften per belastat hörn sätts till nmg/3 enligt E44, även om ramen har fyra hörn. Fördelningen måste verifieras för det verkliga lyftet.');
        warnings.push('Sida 2 använder tabellintervallet A8:B30 och börjar på λ = 25; sida 1 börjar på λ = 20. Skillnaden återges enligt källan. E64 avser sida 2 trots att underlagets etikett upprepar sida 1.');
        break;
      }
      case 'wb-c-hook':
        section('E26', 'E27', { E28: 'W', E29: 'Ix', E30: 'Iy', E31: 'Kv', E32: 'A' }, ['W', 'Ix', 'Iy', 'Kv', 'A']);
        c.E66 = c.E22 * G * c.E33 * c.E24;
        c.E67 = c.E66 / c.E28;
        c.E68 = c.E67 / SIGMA * 100;
        c.E69 = c.E22 * G * c.E24 ** 3 / 3 / E / c.E29;
        c.E70 = c.E23 / 200;
        c.E83 = c.E70 / c.E68;
        c.E91 = c.E23 + c.E24;
        c.E92 = c.E22 * G * c.E33 * c.E23 / c.E28;
        c.E93 = c.E22 * G * c.E33 / c.E32;
        c.E94 = c.E93 + c.E92;
        c.E95 = c.E94 / SIGMA * 100;
        c.E96 = c.E22 * G * c.E24 / 2 / E / c.E29 * (c.E23 / 2) ** 2;
        c.E97 = c.E23 / 200;
        c.E98 = Math.PI * Math.sqrt(E * c.E30 * 80000 * c.E31) / c.E91;
        c.E99 = c.E22 * G * c.E34 * c.E24;
        c.E117 = c.E22 * G * c.E33 * c.E25;
        c.E118 = c.E117 / c.E28;
        c.E119 = c.E118 / SIGMA * 100;
        c.E120 = c.E22 * G * c.E25 ** 3 / 3 / E / c.E29;
        c.E121 = c.E25 / 200;
        c.E139 = c.E23 / 2;
        c.E140 = '#N/A';
        c.E141 = c.E96;
        c.E142 = c.E69;
        c.E143 = Math.sin(Math.atan(c.E141 / c.E139)) * c.E24;
        c.E144 = Math.sin(Math.atan(c.E141 / c.E139)) * c.E25;
        c.E145 = c.E120;
        c.E146 = c.E144 + c.E143 + c.E145 + c.E142;
        c.E147 = c.E23 / 200;
        check('Övre arm: böjspänning enligt mallen', 'E67', SIGMA, 'MPa');
        check('Övre arm: utböjning mot rygglängd/200 enligt E70', 'E69', 'E70', 'mm');
        check('Rygg: summerad normalspänning enligt mallen', 'E94', SIGMA, 'MPa');
        check('Rygg: utböjning enligt mallen', 'E96', 'E97', 'mm');
        check('Momentkvot mot idealt elastiskt Mcr', 'E99', 'E98', 'Nmm', true);
        check('Nedre arm: böjspänning enligt mallen', 'E118', SIGMA, 'MPa');
        check('Nedre arm: utböjning enligt mallen', 'E120', 'E121', 'mm');
        check('Total utböjning enligt mallen – ej verifierad', 'E146', 'E147', 'mm');
        warnings.push('Granskningspunkt E92: ryggens böjspänning beräknas med rygglängden L som momentarm. Detta avviker från en rak C-rams momentjämvikt med armlängden L₁; källformeln återges utan rättning.');
        warnings.push('Granskningspunkt E143–E146: rotationsbidraget beräknas från ryggens sekantlutning, inte ändtangenten. Totalutböjningen är därför inte verifierad som C-ramens deformation.');
        warnings.push('Mcr i E98 återger arbetsbokens elastiska formel med G = 80 000 MPa och längden L + L₁. Randvillkor och lastläge är inte styrkta; jämförelsen är ingen dimensionerande vippningskontroll eller godkänd bärförmåga.');
        warnings.push('E83 = E70/E68 är en hjälpkvot i mm/% och inget giltigt slankhetstal. Den används inte i någon annan formel. E140 innehåller en trasig #REF!-referens och ger #N/A; även den cellen är oanvänd.');
        warnings.push('Profiluppslagen hänvisar till en extern arbetsbok [1]. Applikationen använder uttryckligen den bifogade arbetsbokens lokala tabell Balkprofiler; detta ger samma tabellvärden som de sparade exempelresultaten.');
        warnings.push('Övre armens tillåtna utböjning E70 sätts till rygglängden L/200, medan nedre armens gräns är L₂/200. Asymmetrin återges enligt underlaget.');
        if (Math.abs(c.E24 - c.E25) > 1e-10 * Math.max(c.E24, c.E25)) warnings.push('L₁ ≠ L₂: de två vertikala krafterna i skissen verkar inte i samma lodlinje. En fri krok med enbart dessa krafter är inte i momentjämvikt; yttre moment/annan lastlinje måste definieras.');
        break;
      case 'wb-spridarok': {
        const p = section('E29', 'E30', { E32: 'W', E33: 'Ix', E34: 'A' }, ['W', 'Ix', 'A']);
        c.E38 = c.E27 * G * c.E35 / 2 / Math.tan(c.E31 * Math.PI / 180);
        c.E39 = c.E38 / c.E34;
        c.E40 = Math.sqrt(c.E33 / c.E34);
        c.E42 = c.E41 * c.E28;
        c.E43 = c.E42 / c.E40;
        const table = nextBuckling(c.E43);
        c.E44 = table.lambda; c.E45 = table.stress;
        c.E46 = c.E39 / c.E45 * 100;
        check('Tryckspänning mot knäcktabell', 'E39', 'E45', 'MPa');
        bucklingWarning(p);
        break;
      }
      case 'wb-semispridarok': {
        const p = section('E30', 'E31', { E33: 'W', E34: 'Ix', E35: 'A' }, ['W', 'Ix', 'A']);
        c.E39 = c.E27 * G * c.E36 / 2 / Math.tan(c.E32 * Math.PI / 180);
        c.E40 = c.E39 / c.E35;
        c.E41 = Math.sqrt(c.E34 / c.E35);
        c.E43 = c.E42 * c.E28;
        c.E44 = c.E43 / c.E41;
        const table = nextBuckling(c.E44);
        c.E45 = table.lambda;
        c.E46 = table.stress * 1.75;
        c.E47 = c.E40 / c.E46 * 100;
        c.E48 = c.E27 * G * c.E36 / 2 * c.E29;
        c.E49 = c.E48 / c.E33;
        c.E50 = c.E49 / SIGMA * 100;
        c.E51 = 0.9 * c.E50 + c.E47;
        check('Tryckspänning mot mallens förhöjda knäckgräns', 'E40', 'E46', 'MPa');
        check('Böjspänning', 'E49', SIGMA, 'MPa');
        check('Samverkan 0,9·u_böjning + u_knäckning enligt mallen', 'E51', 100, '%');
        bucklingWarning(p);
        warnings.push('Olöst granskningspunkt G46: ”Varför faktor 1,75?”. E46 höjer knäcktabellens spänning med 1,75. Faktorn återges exakt men saknar verifierad motivering och kan ge en för hög tillåten belastning.');
        if (c.E46 > SIGMA) warnings.push('Den förhöjda knäckgränsen E46 överstiger 355 MPa för dessa indata. Mallens faktor 1,75 är inte en verifiering av att denna tryckspänning kan tillåtas.');
        warnings.push('Samverkansformeln E51 = 0,9·u_böjning + u_knäckning återges från arbetsboken. Faktorn 0,9 och tillämpningsvillkoren är inte styrkta som standardkrav.');
        break;
      }
      default: throw new RangeError('Okänt beräkningsfall.');
    }
    if (checks.some(check => check.unit === 'mm')) warnings.push('L/200 återges som arbetsbokens deformationsgräns. Gränsen är inte här verifierad som ett generellt krav enligt SS-EN 13155.');
    for (const [cell, value] of Object.entries(c)) {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError(`Beräkningen gav ett icke ändligt värde i ${model.sheet}!${cell}.`);
    }
    const labelOverrides = {
      'wb-l1:E30': 'Nominell medelskjuvspänning', 'wb-c1:E33': 'Nominell medelskjuvspänning',
      'wb-h-ok:E33': 'Tvärbalkens profilindex', 'wb-ramok:E53': 'Tröghetsradie iₓ enligt mallen',
      'wb-ramok:E64': 'Nyttjandegrad sida 2', 'wb-c-hook:E83': 'Hjälpkvot E70/E68 (ej slankhetstal)',
      'wb-c-hook:E140': 'Trasigt, oanvänt profiluppslag i källan', 'wb-spridarok:E40': 'Tröghetsradie iₓ enligt mallen',
      'wb-semispridarok:E41': 'Tröghetsradie iₓ enligt mallen'
    };
    const rows = Object.entries(sheet.cells).filter(([cell, source]) => source.formula && Object.hasOwn(c, cell)).map(([cell, source]) => ({
      cell, label: labelOverrides[`${id}:${cell}`] || source.label || cell, value: c[cell], unit: units[id][cell] ?? '', formula: source.formula,
      isInput: model.fields.some(field => field.name === cell)
    }));
    return { id, sheet: model.sheet, input, cells: c, checks, warnings: [...new Set(warnings)], rows, profiles };
  }
  const api = { models, calculate, defaults, constants: { g: G, E, sigmaTill: SIGMA, tauTill: TAU }, nextBuckling };
  root.WorkbookEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
