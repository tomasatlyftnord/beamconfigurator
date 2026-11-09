// Integrationstest med riktig Chromium. Inga npm-paket behövs.
const { spawn } = require('node:child_process');
const { mkdtemp, rm, readFile, writeFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

async function main() {
  const files = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/report.css': ['report.css', 'text/css'], '/report.js': ['report.js', 'text/javascript'], '/profiles.js': ['profiles.js', 'text/javascript'], '/beam.js': ['beam.js', 'text/javascript'], '/app.js': ['app.js', 'text/javascript'], '/calculations.js': ['calculations.js', 'text/javascript'], '/c-hook-report.js': ['c-hook-report.js', 'text/javascript'], '/load-cases.js': ['load-cases.js', 'text/javascript'], '/case-ui.js': ['case-ui.js', 'text/javascript'], '/c2.js': ['c2.js', 'text/javascript'], '/c2-case.js': ['c2-case.js', 'text/javascript'], '/c2-report.js': ['c2-report.js', 'text/javascript'], '/c4.js': ['c4.js', 'text/javascript'], '/c4-case.js': ['c4-case.js', 'text/javascript'], '/c4-report.js': ['c4-report.js', 'text/javascript'], '/plate-shear.js': ['plate-shear.js', 'text/javascript'], '/plate-shear-cases.js': ['plate-shear-cases.js', 'text/javascript'], '/plate-shear-report.js': ['plate-shear-report.js', 'text/javascript'], '/asymmetric-beam.js': ['asymmetric-beam.js', 'text/javascript'], '/asymmetric-beam-case.js': ['asymmetric-beam-case.js', 'text/javascript'], '/asymmetric-beam-report.js': ['asymmetric-beam-report.js', 'text/javascript'], '/favicon.ico': ['favicon.ico', 'image/x-icon'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/icons/favicon-32.png': ['icons/favicon-32.png', 'image/png'], '/icons/apple-touch-icon.png': ['icons/apple-touch-icon.png', 'image/png'], '/icons/app-icon-192.png': ['icons/app-icon-192.png', 'image/png'], '/icons/app-icon-512.png': ['icons/app-icon-512.png', 'image/png'], '/icons/app-icon-maskable-512.png': ['icons/app-icon-maskable-512.png', 'image/png'] };
  for (const file of ['workbook-data.js', 'workbook-engine.js', 'workbook-report.js', 'workbook-cases.js']) {
    files[`/${file}`] = [file, 'text/javascript'];
  }
  files['/data/WORKBOOK.md'] = ['data/WORKBOOK.md', 'text/plain'];
  for (const file of ['workbook-profiles-0.1.csv', 'workbook-buckling-0.1.csv']) {
    files[`/data/${file}`] = [`data/${file}`, 'text/csv'];
  }
  const server = createServer(async (req, res) => {
    const file = files[new URL(req.url, 'http://127.0.0.1').pathname];
    if (!file) { res.writeHead(404).end(); return; }
    try { res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` }).end(await readFile(resolve(__dirname, '..', file[0]))); }
    catch { res.writeHead(500).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const dir = await mkdtemp(join(tmpdir(), 'beam-browser-'));
  const browser = spawn(process.env.CHROMIUM_BIN || 'chromium', [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
    '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws;
  try {
    const endpoint = await new Promise((resolveEndpoint, reject) => {
      let log = '';
      const timeout = setTimeout(() => reject(new Error(`Chromium startade inte: ${log.slice(-1200)}`)), 15000);
      browser.once('error', reject);
      browser.stderr.on('data', data => {
        log += data;
        const match = log.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timeout); resolveEndpoint(`http://127.0.0.1:${match[1]}`); }
      });
    });
    const targets = await (await fetch(`${endpoint}/json/list`)).json();
    ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolveOpen, reject) => { ws.onopen = resolveOpen; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const scriptErrors = [];
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') scriptErrors.push(message.params.exceptionDetails);
      if (pending.has(message.id)) {
        const { resolveResponse, reject } = pending.get(message.id);
        pending.delete(message.id);
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolveResponse(message.result);
      }
    };
    const send = (method, params = {}) => new Promise((resolveResponse, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolveResponse, reject });
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });
    const evaluate = async expression => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const selectCase = async caseId => evaluate(`document.getElementById('case-select').value=${JSON.stringify(caseId)}; document.getElementById('case-select').dispatchEvent(new Event('change'))`);
    const setCaseField = async (name, value) => evaluate(`document.getElementById(${JSON.stringify(`case-${name}`)}).value=${JSON.stringify(value)}; document.getElementById(${JSON.stringify(`case-${name}`)}).dispatchEvent(new Event('input',{bubbles:true}))`);
    await send('Runtime.enable');
    await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
    let ready = false;
    for (let n = 0; n < 100 && !ready; n++) {
      ready = await evaluate('Boolean(document.querySelector(".result-top") && typeof WorkbookEngine !== "undefined" && document.querySelectorAll("#case-select option").length === 17)');
      if (!ready) await new Promise(r => setTimeout(r, 50));
    }
    if (!ready) console.error(await evaluate('JSON.stringify({url:location.href,state:document.readyState,body:document.body?.innerText,beam:typeof Beam})'));
    assert.ok(ready, 'Sidan ska räkna vid start');
    assert.equal(await evaluate('document.querySelectorAll(".layout-switch, #layout-classic, #layout-workbook").length'), 0, 'Layoutväxlaren ska vara borttagen');
    assert.equal(await evaluate('document.getElementById("case-select").value'), 'lifting-beam');
    assert.equal(await evaluate('document.querySelectorAll("#case-select optgroup").length'), 2);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#case-select optgroup"), group => ({label:group.label, count:group.querySelectorAll("option").length}))'), [
      { label: 'Komponenter', count: 11 },
      { label: 'Produkter', count: 6 }
    ]);
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#case-select optgroup"), group => Array.from(group.querySelectorAll("option"), option => option.value))'), [
      ['c-hook', 'c2', 'c4', 'c1', 'l1', 'wb-l1', 'wb-c1', 'wb-kb5', 'wb-kb6', 'wb-c-hook', 'wb-kb2'],
      ['lifting-beam', 'asymmetric-beam', 'wb-h-ok', 'wb-ramok', 'wb-spridarok', 'wb-semispridarok']
    ], 'Varje beräkningsfall ska finnas under rätt komponent- eller produktkategori');
    assert.equal(await evaluate('document.getElementById("beam-case").hidden'), false);
    assert.equal(await evaluate('document.getElementById("custom-case").hidden'), true);
    assert.ok(await evaluate('document.querySelector("#beam-case .comparison").checkVisibility()'));
    // Startvyn ska åter motsvara mittlyftslayouten i 7ce79bc.
    for (const [label, width, height, mobile] of [['desktop', 1440, 1000, false], ['mobile', 390, 844, true]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
      await evaluate('window.scrollTo(0,0); new Promise(requestAnimationFrame)');
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `Återställd startvy: ${label}`);
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(tmpdir(), `restored-layout-${label}.png`), Buffer.from(screenshot.data, 'base64'));
      if (label === 'desktop') {
        await writeFile(join(tmpdir(), 'layout-classic-preview.png'), Buffer.from(screenshot.data, 'base64'));
        await evaluate('document.querySelector("#beam-case .workspace").scrollIntoView({block:"start"}); new Promise(requestAnimationFrame)');
        const calculation = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(tmpdir(), 'layout-classic-calculation.png'), Buffer.from(calculation.data, 'base64'));
      }
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await evaluate('document.querySelector(".result-top h3").textContent'), 'VKR 80 × 80 × 4');
    assert.ok(await evaluate('document.getElementById("result").textContent.includes("Tabellens Wx")'));
    assert.ok(await evaluate('!document.body.textContent.includes("Profilens W, modell")'));
    assert.ok(await evaluate('document.querySelector(".tag").textContent.includes("BERÄKNINGSFALL")'));
    assert.equal(await evaluate('document.getElementById("allowable-stress").readOnly'), true);
    assert.ok(await evaluate('document.getElementById("allowable-stress").value.includes("355")'));
    await evaluate('document.getElementById("mass").value = 2000; document.getElementById("mass").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.notEqual(await evaluate('document.querySelector(".result-top h3").textContent'), 'VKR 80 × 80 × 4');
    await evaluate('document.getElementById("toggle-profiles").click()');
    assert.equal(await evaluate('document.querySelectorAll("#profile-rows tr").length'), await evaluate('Beam.profiles.length'));
    assert.equal(await evaluate('document.querySelectorAll("#profile-rows tr").length'), 65);
    assert.equal(await evaluate('Array.from(document.querySelectorAll("#profile-rows tr")).find(row => row.cells[0].textContent === "VKR 40 × 40 × 4").cells[1].textContent'), '5,91');
    assert.ok(await evaluate('document.querySelector(".result-foot").textContent.includes("Tibnor 2023, sida 20")'));
    assert.equal(await evaluate('document.getElementById("open-report").disabled'), true);
    await evaluate(`Array.from(document.querySelectorAll('input[name="report-profile"]')).find(p => p.value === 'VKR 40 × 40 × 4').click()`);
    assert.equal(await evaluate('document.getElementById("open-report").disabled'), false);
    await evaluate('document.getElementById("open-report").click()');
    assert.ok(await evaluate('document.getElementById("report-dialog").open'));
    assert.equal(await evaluate('document.querySelector(".report-profile").textContent'), 'VKR 40 × 40 × 4');
    assert.ok(await evaluate('document.querySelector(".report-verdict").textContent.includes("överskrider")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("2 000,00 kg")'));
    await evaluate('document.getElementById("close-report").click()');
    await evaluate('document.getElementById("mass").value = ""; document.getElementById("mass").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("error").hidden'), false);
    assert.equal(await evaluate('document.querySelectorAll("#profile-rows tr").length'), 0);
    assert.equal(await evaluate('document.getElementById("open-report").disabled'), true);
    await evaluate('document.getElementById("mass").value=1000000; document.getElementById("span").value=20000; document.getElementById("mass").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.ok(await evaluate('document.getElementById("result").textContent.includes("Ingen kandidat")'));
    await evaluate('document.getElementById("mass").value=1000; document.getElementById("span").value=2000; document.getElementById("mass").dispatchEvent(new Event("input", {bubbles:true}))');
    await evaluate(`Array.from(document.querySelectorAll('input[name="report-profile"]')).find(p => p.value === 'VKR 80 × 80 × 4').click(); document.getElementById('open-report').click()`);
    assert.equal(await evaluate('document.querySelector(".report-profile").textContent'), 'VKR 80 × 80 × 4');
    assert.ok(await evaluate('document.querySelector(".report-verdict").textContent.includes("uppfyller")'));
    await evaluate('window.print = () => { window.testPrinted = true; }; document.getElementById("print-report").click()');
    assert.ok(await evaluate('window.testPrinted'));
    assert.ok(await evaluate('document.title.includes("VKR_80x80x4")'));
    await evaluate('window.dispatchEvent(new Event("afterprint"))');
    assert.equal(await evaluate('document.title'), 'Beamconfigurator · Lyftok');
    assert.ok(await evaluate('!document.getElementById("report-content").textContent.includes("Skjuvvillkor")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("9,82")'));
    assert.ok(await evaluate('!document.getElementById("report-content").textContent.includes("Beamconfigurator")'));
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
    const pdfBytes = Buffer.from(pdf.data, 'base64');
    assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
    const pdfPath = process.env.BEAM_TEST_PDF || join(tmpdir(), 'beam-report-example.pdf');
    await writeFile(pdfPath, pdfBytes);
    console.log(`PDF skapad: ${pdfPath}`);
    await evaluate('document.getElementById("close-report").click()');
    // Kontroll av rapporterad avvikelse: inmatade 400 kg ska förbli 400 kg.
    await evaluate('document.getElementById("mass").value=400; document.getElementById("span").value=350; document.getElementById("factor").value=2; document.getElementById("mass").dispatchEvent(new Event("input", {bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("mass").valueAsNumber'), 400);
    await evaluate(`Array.from(document.querySelectorAll('input[name="report-profile"]')).find(p => p.value === 'VKR 40 × 40 × 3').click(); document.getElementById('open-report').click()`);
    assert.equal(await evaluate('Array.from(document.querySelectorAll(".report-data > div")).find(row => row.querySelector("dt").textContent === "Total lastvikt, m").querySelector("dd").textContent'), '400,00 kg');
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("3 928,00")'));
    const casePDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
    await writeFile(join(tmpdir(), 'beam-400kg-350mm.pdf'), Buffer.from(casePDF.data, 'base64'));
    await evaluate('document.getElementById("close-report").click()');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobilläget ska inte ge horisontell sidskroll');
    // Nytt beräkningsfall använder egna indata och rapport, utan VKR-resultat.
    await evaluate('document.getElementById("case-select").value="c-hook"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("beam-case").hidden'), true);
    assert.equal(await evaluate('document.getElementById("custom-case").hidden'), false);
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("299,51")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("63,96")'));
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
    await evaluate('document.getElementById("case-report").click()');
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("C-KROK")'));
    assert.ok(await evaluate('!document.getElementById("report-content").textContent.includes("Tibnor")'));
    await evaluate('window.print = () => { window.testPrinted = true; }; document.getElementById("print-report").click()');
    assert.ok(await evaluate('document.title.includes("C-krok")'));
    await evaluate('window.dispatchEvent(new Event("afterprint"))');
    const cPDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
    await writeFile(join(tmpdir(), 'c-hook-report-example.pdf'), Buffer.from(cPDF.data, 'base64'));
    await evaluate('document.getElementById("close-report").click()');
    // Lastläge utanför modellen får inte visas som en giltig vippningskontroll.
    await evaluate('document.getElementById("case-loadPosition").value="other"; document.getElementById("case-loadPosition").dispatchEvent(new Event("change",{bubbles:true}))');
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("Mcr-jämförelse visas inte")'));
    await evaluate('document.getElementById("case-mass").value=""; document.getElementById("case-mass").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    assert.ok(await evaluate('!document.getElementById("case-error").hidden'));
    await evaluate('document.getElementById("case-mass").value=400; document.getElementById("case-mass").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    // Byte tillbaka bevarar lyftokets tidigare 400 kg och 350 mm.
    await evaluate('document.getElementById("case-select").value="lifting-beam"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("mass").valueAsNumber'), 400);
    assert.equal(await evaluate('document.getElementById("span").valueAsNumber'), 350);
    assert.equal(await evaluate('document.getElementById("beam-case").hidden'), false);
    await evaluate('document.getElementById("case-select").value="c-hook"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-loadPosition").value'), 'other');
    // C2 är ett tredje självständigt lastfall enligt PDF-underlaget.
    await evaluate('document.getElementById("case-select").value="c2"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("72,01")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("9,82")'));
    assert.ok(await evaluate('!document.getElementById("case-result").textContent.includes("Mcr")'));
    assert.equal(await evaluate('document.querySelectorAll("#case-select option").length'), 17);
    await evaluate('document.getElementById("case-report").click()');
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("C2")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("213")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("Beräkning - C2.pdf")'));
    assert.ok(await evaluate('!document.getElementById("report-content").textContent.includes("Beamconfigurator")'));
    const c2PDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
    await writeFile(join(tmpdir(), 'c2-report-example.pdf'), Buffer.from(c2PDF.data, 'base64'));
    await evaluate('document.getElementById("close-report").click()');
    await evaluate('document.getElementById("case-t").value=0; document.getElementById("case-t").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    await evaluate('document.getElementById("case-t").value=20; document.getElementById("case-t").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("36,01")'));
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await evaluate('document.getElementById("case-select").value="c-hook"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-loadPosition").value'), 'other');
    await evaluate('document.getElementById("case-select").value="c2"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-t").valueAsNumber'), 20);
    // C4 använder källexemplet och faktorerad kraft även för böjnedböjningen.
    await evaluate('document.getElementById("case-select").value="c4"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.querySelectorAll("#case-select option").length'), 17);
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("53,03")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("0,003409")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("2 455")'));
    await evaluate('document.getElementById("case-report").click()');
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("C4")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("Rutin_Beräkning av C4 - Lastkrok.pdf")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("213")'));
    assert.ok(await evaluate('!document.getElementById("report-content").textContent.includes("Beamconfigurator")'));
    const c4PDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
    await writeFile(join(tmpdir(), 'c4-report-example.pdf'), Buffer.from(c4PDF.data, 'base64'));
    await evaluate('document.getElementById("close-report").click()');
    await evaluate('document.getElementById("case-factor").value=1; document.getElementById("case-factor").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("26,51")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("0,001704")'));
    await evaluate('document.getElementById("case-k").value=0; document.getElementById("case-k").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    await evaluate('document.getElementById("case-k").value=25; document.getElementById("case-k").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await evaluate('document.getElementById("case-select").value="c2"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-t").valueAsNumber'), 20);
    await evaluate('document.getElementById("case-select").value="c4"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-factor").valueAsNumber'), 1);
    // C1 och L1 skiljer strikt på två respektive en verksam skjuvyta.
    for (const [id, expectedStress, source] of [['c1', '15,712', 'Beräkning - C1.pdf'], ['l1', '31,424', 'Beräkning - L1.pdf']]) {
      await evaluate(`document.getElementById('case-select').value='${id}'; document.getElementById('case-select').dispatchEvent(new Event('change'))`);
      assert.ok(await evaluate(`document.getElementById('case-result').textContent.includes('${expectedStress}')`));
      assert.ok(await evaluate('!document.getElementById("case-result").textContent.includes("Böjspänning")'));
      await evaluate('document.getElementById("case-report").click()');
      assert.ok(await evaluate(`document.getElementById('report-content').textContent.includes('${source}')`));
      assert.ok(await evaluate('!document.getElementById("report-content").textContent.includes("Beamconfigurator")'));
      const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
      await writeFile(join(tmpdir(), `${id}-report-example.pdf`), Buffer.from(pdf.data, 'base64'));
      await evaluate('document.getElementById("close-report").click()');
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    }
    await evaluate('document.getElementById("case-select").value="c1"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    await evaluate('document.getElementById("case-k").value=50; document.getElementById("case-k").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("7,856")'));
    await evaluate('document.getElementById("case-t").value=0; document.getElementById("case-t").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    await evaluate('document.getElementById("case-t").value=10; document.getElementById("case-t").dispatchEvent(new Event("input",{bubbles:true}))');
    await evaluate('document.getElementById("case-select").value="l1"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-k").valueAsNumber'), 25);
    await evaluate('document.getElementById("case-select").value="c1"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-k").valueAsNumber'), 50);
    // Asymmetriskt lyft: lastbalans, egen profiljämförelse och vald rapportprofil.
    await evaluate('document.getElementById("case-select").value="asymmetric-beam"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("750,00")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("250,00")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("VKR 70 × 70 × 4")'));
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    assert.equal(await evaluate('document.getElementById("case-profiles").hidden'), false);
    await evaluate('document.getElementById("case-profiles-toggle").click()');
    assert.equal(await evaluate('document.querySelectorAll("#case-profile-rows tr").length'), 65);
    await evaluate(`Array.from(document.querySelectorAll('input[name="case-profile"]')).find(p=>p.value==='VKR 70 × 70 × 4').click()`);
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
    await evaluate('document.getElementById("case-report").click()');
    assert.ok(await evaluate('document.querySelector(".report-profile").textContent.includes("VKR 70 × 70 × 4")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("750,00")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("250,00")'));
    const asymPDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true });
    await writeFile(join(tmpdir(), 'asymmetric-beam-report-example.pdf'), Buffer.from(asymPDF.data, 'base64'));
    await evaluate('document.getElementById("close-report").click()');
    await evaluate(`Array.from(document.querySelectorAll('input[name="case-profile"]')).find(p=>p.value==='VKR 40 × 40 × 3').click(); document.getElementById('case-report').click()`);
    assert.ok(await evaluate('document.querySelector(".report-profile").textContent.includes("VKR 40 × 40 × 3")'));
    assert.ok(await evaluate('document.querySelector(".report-verdict").classList.contains("report-fail")'));
    await evaluate('document.getElementById("close-report").click()');
    await evaluate('document.getElementById("case-liftPosition").value=1000; document.getElementById("case-liftPosition").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("500,00")'));
    assert.ok(await evaluate('document.getElementById("case-result").textContent.includes("VKR 80 × 80 × 4")'));
    await evaluate('document.getElementById("case-liftPosition").value=0; document.getElementById("case-liftPosition").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    assert.equal(await evaluate('document.getElementById("case-profiles").hidden'), true);
    await evaluate('document.getElementById("case-liftPosition").value=500; document.getElementById("case-liftPosition").dispatchEvent(new Event("input",{bubbles:true}))');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await evaluate('document.getElementById("case-select").value="lifting-beam"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("span").valueAsNumber'), 350);
    await evaluate('document.getElementById("case-select").value="asymmetric-beam"; document.getElementById("case-select").dispatchEvent(new Event("change"))');
    assert.equal(await evaluate('document.getElementById("case-span").valueAsNumber'), 2000);
    assert.equal(await evaluate('document.getElementById("case-liftPosition").valueAsNumber'), 500);
    assert.equal(await evaluate('document.querySelector("#case-profile-rows input:checked").value'), 'VKR 40 × 40 × 3');
    // Arbetsbokens tio fall har egna cellindata, kompletta profilval och rapporter.
    const workbookModels = await evaluate('WorkbookEngine.models.map(model => ({id:model.id,sheet:model.sheet,fields:model.fields}))');
    assert.equal(workbookModels.length, 10);
    const expectedChecks = { 'wb-l1': 1, 'wb-c1': 1, 'wb-kb5': 2, 'wb-kb6': 2, 'wb-h-ok': 4, 'wb-ramok': 2, 'wb-c-hook': 8, 'wb-kb2': 2, 'wb-spridarok': 1, 'wb-semispridarok': 3 };
    const reportPages = {};
    const paginationFailures = [];
    const reportOverflowFailures = [];
    for (const model of workbookModels) {
      await selectCase(model.id);
      assert.equal(await evaluate('document.getElementById("case-error").hidden'), true, `${model.id}: giltiga startvärden`);
      assert.equal(await evaluate('document.getElementById("case-report").disabled'), false, `${model.id}: rapport tillgänglig`);
      assert.equal(await evaluate('document.querySelectorAll("#case-result .metrics > div").length'), expectedChecks[model.id], `${model.id}: kontroller visas i den tidigare resultatlayouten`);
      assert.equal(await evaluate('document.querySelectorAll("#case-result .workbook-checks tbody tr").length'), expectedChecks[model.id]);
      assert.equal(await evaluate('document.querySelector("#case-result .workbook-checks").closest("details").open'), false, `${model.id}: utförlig kontrolltabell är infälld från början`);
      await evaluate('document.querySelector("#case-result .workbook-checks").closest("details").querySelector("summary").click()');
      assert.ok(await evaluate('document.querySelector("#case-result .workbook-checks").checkVisibility()'), `${model.id}: kontrolltabellen går att öppna`);
      await evaluate('document.querySelector("#case-result .workbook-checks").closest("details").querySelector("summary").click()');
      const workbookWarnings = await evaluate(`WorkbookEngine.calculate(${JSON.stringify(model.id)}).warnings`);
      assert.ok(workbookWarnings.length > 0, `${model.id}: källanmärkningar finns kvar`);
      assert.ok(await evaluate(`document.querySelector('#case-result .case-verdict').textContent.includes(${JSON.stringify(workbookWarnings[0])})`), `${model.id}: viktig anmärkning synlig i resultatet`);
      assert.equal(await evaluate('(() => { const warning = document.querySelector("#case-result .workbook-warning"); return (warning.matches("details") ? warning : warning.querySelector("details")).open; })()'), false, `${model.id}: utförliga anmärkningar är infällda`);
      await evaluate('(() => { const warning = document.querySelector("#case-result .workbook-warning"); (warning.matches("details") ? warning : warning.querySelector("details")).querySelector("summary").click(); })()');
      assert.ok(await evaluate('document.querySelector("#case-result .workbook-warning li").checkVisibility()'), `${model.id}: anmärkningar går att öppna`);
      await evaluate('(() => { const warning = document.querySelector("#case-result .workbook-warning"); (warning.matches("details") ? warning : warning.querySelector("details")).querySelector("summary").click(); })()');
      assert.ok(await evaluate('Boolean(document.querySelector("#case-diagram svg"))'));
      assert.ok(await evaluate('Boolean(document.querySelector("#case-diagram .workbook-diagram"))'));
      assert.ok(await evaluate('document.querySelectorAll("#case-result .workbook-trace-table tbody tr").length > 0'));
      for (const field of model.fields) {
        const actual = await evaluate(`document.getElementById(${JSON.stringify(`case-${field.name}`)}).${field.type === 'profile' ? 'value' : 'valueAsNumber'}`);
        assert.equal(actual, field.default, `${model.id}: fristående startvärde för ${field.name}`);
        if (field.type === 'profile') {
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`case-${field.name}`)}).options.length`), 204);
        }
      }
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${model.id}: desktopbredd`);
      if (model.id === 'wb-kb5' || model.id === 'wb-ramok') {
        await evaluate('window.scrollTo(0,0); new Promise(requestAnimationFrame)');
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(tmpdir(), model.id === 'wb-kb5' ? 'workbook-desktop.png' : 'workbook-ui.png'), Buffer.from(screenshot.data, 'base64'));
      }
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `${model.id}: mobilbredd`);
      if (model.id === 'wb-c-hook') {
        await evaluate('window.scrollTo(0,0); new Promise(requestAnimationFrame)');
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(tmpdir(), 'workbook-mobile.png'), Buffer.from(screenshot.data, 'base64'));
      }
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await evaluate('document.getElementById("case-report").click()');
      assert.ok(await evaluate('document.getElementById("report-dialog").open'));
      assert.ok(await evaluate('Boolean(document.querySelector("#report-content .workbook-report"))'));
      const reportText = await evaluate('document.getElementById("report-content").textContent');
      assert.ok(reportText.includes(model.sheet), `${model.id}: rätt blad i rapporten`);
      assert.ok(reportText.includes('Standardiserade beräkningar'), `${model.id}: källhänvisning`);
      for (const warning of workbookWarnings) assert.ok(reportText.includes(warning), `${model.id}: samtliga källanmärkningar följer rapporten`);
      assert.ok(reportText.toLowerCase().includes('granskningsunderlag'), `${model.id}: avgränsning följer exporten`);
      assert.equal(await evaluate('Boolean(document.querySelector("#report-content .report-verdict.report-pass"))'), false);
      assert.ok(await evaluate('document.querySelectorAll("#report-content math").length > 0'));
      const domPages = await evaluate('document.querySelectorAll("#report-content .report-page").length');
      const traceRows = await evaluate('document.querySelectorAll("#report-content .workbook-trace").length');
      const horizontalOverflow = await evaluate(`Array.from(document.querySelectorAll('#report-content math, #report-content .report-data dd, #report-content .workbook-checks')).flatMap(element => {
        const parent = element.closest('.workbook-trace') || element.closest('.report-page');
        const parentBounds = parent.getBoundingClientRect();
        const descendants = element.matches('math') ? Array.from(element.querySelectorAll('mrow, mfrac, msup, mi, mn, mtext')) : [element];
        const beyond = Math.max(0, (element.scrollWidth || 0) - (element.clientWidth || 0), ...descendants.map(node => node.getBoundingClientRect().right - parentBounds.right));
        return beyond > 2 ? [{cell: element.closest('[data-cell]')?.dataset.cell || element.textContent.slice(0,100), beyond:Math.round(beyond)}] : [];
      })`);
      assert.ok(domPages >= 2, `${model.id}: fullständig rapport`);
      assert.equal(traceRows, await evaluate('document.querySelectorAll("#case-result .workbook-trace-table tbody tr").length'), `${model.id}: alla delberäkningar följer med`);
      const workbookPDF = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
      const workbookBytes = Buffer.from(workbookPDF.data, 'base64');
      const pdfPath = join(tmpdir(), `${model.id}-report-example.pdf`);
      await writeFile(pdfPath, workbookBytes);
      const pdfPages = (workbookBytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
      reportPages[model.id] = { domPages, pdfPages, traceRows, pdfPath, horizontalOverflow };
      await writeFile(join(tmpdir(), 'workbook-report-pages.json'), JSON.stringify(reportPages, null, 2));
      if (pdfPages !== domPages) paginationFailures.push(`${model.id}: ${pdfPages} PDF-sidor för ${domPages} avsedda rapportsidor`);
      if (horizontalOverflow.length) reportOverflowFailures.push({ id: model.id, horizontalOverflow });
      await evaluate('document.getElementById("close-report").click()');
      const massField = model.fields.find(field => field.unit === 'kg');
      const oldResult = await evaluate('document.getElementById("case-result").textContent');
      await setCaseField(massField.name, massField.default * 1.01);
      assert.notEqual(await evaluate('document.getElementById("case-result").textContent'), oldResult, `${model.id}: ändrad massa räknas om`);
      await setCaseField(massField.name, '');
      assert.equal(await evaluate('document.getElementById("case-report").disabled'), true, `${model.id}: ogiltig massa stoppar export`);
      assert.equal(await evaluate('document.getElementById("case-error").hidden'), false);
      assert.equal(await evaluate('document.querySelectorAll("#case-diagram svg").length'), 0, `${model.id}: inga gamla resultat`);
      await setCaseField(massField.name, massField.default * 1.01);
    }
    for (const model of workbookModels) {
      await selectCase(model.id);
      const field = model.fields.find(field => field.unit === 'kg');
      assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`case-${field.name}`)}).valueAsNumber`), field.default * 1.01, `${model.id}: indata bevaras vid byte`);
    }
    // Källfel får anmärkning eller beräkningsstopp, inget generellt godkännande.
    await selectCase('wb-ramok');
    await setCaseField('E34', 'HE 100 A');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    assert.ok(await evaluate('document.getElementById("case-error").textContent.includes("HEA")'));
    await setCaseField('E34', '400x200x8');
    assert.equal(await evaluate('document.getElementById("case-report").disabled'), true);
    assert.ok(await evaluate('document.getElementById("case-error").textContent.includes("A")'));
    await setCaseField('E34', '80x40x4');
    assert.ok(await evaluate('document.querySelector("#case-result .workbook-warning").textContent.includes("Svagaxel")'));
    await selectCase('wb-kb5');
    await setCaseField('E30', '160x160x10');
    assert.ok(await evaluate('document.querySelector("#case-result .workbook-warning").textContent.includes("160x160x10")'));
    assert.ok(await evaluate('document.querySelector("#case-result .case-verdict").textContent.includes("granskning återstår")'));
    await evaluate('document.getElementById("case-report").click()');
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("160x160x10")'));
    assert.equal(await evaluate('Boolean(document.querySelector("#report-content .report-verdict.report-pass"))'), false);
    await evaluate('document.getElementById("close-report").click()');
    const downloads = await evaluate('Promise.all(["data/WORKBOOK.md","data/workbook-profiles-0.1.csv","data/workbook-buckling-0.1.csv"].map(async path=>{const r=await fetch(path);return {path,status:r.status,length:(await r.text()).length}}))');
    for (const download of downloads) {
      assert.equal(download.status, 200, `${download.path}: lokalt källunderlag kan hämtas`);
      assert.ok(download.length > 100);
    }
    // Den klassiska vyn behåller separata indata och rapportval mellan beräkningsfall.
    await selectCase('wb-kb5');
    await setCaseField('E28', 654.321);
    await setCaseField('E29', 350);
    await setCaseField('E30', '50x30x4');
    await setCaseField('E34', 2);
    const currentChecks = await evaluate('document.querySelector("#case-result .workbook-checks").textContent');
    await evaluate('document.getElementById("case-report").click()');
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("654,321 kg")'));
    assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("Standardiserade beräkningar")'));
    await evaluate('document.getElementById("close-report").click()');
    await selectCase('wb-c-hook');
    await selectCase('wb-kb5');
    assert.equal(await evaluate('document.getElementById("case-E28").valueAsNumber'), 654.321);
    assert.equal(await evaluate('document.querySelector("#case-result .workbook-checks").textContent'), currentChecks);
    assert.ok(await evaluate('document.querySelector("#case-result .workbook-metrics").checkVisibility()'));
    assert.equal(await evaluate('document.querySelector("#case-result .workbook-checks").checkVisibility()'), false);
    await selectCase('asymmetric-beam');
    assert.equal(await evaluate('document.querySelector("#case-profile-rows input:checked").value'), 'VKR 40 × 40 × 3');
    await selectCase('lifting-beam');
    await selectCase('asymmetric-beam');
    assert.equal(await evaluate('document.querySelector("#case-profile-rows input:checked").value'), 'VKR 40 × 40 × 3', 'Rapportens profilval ska bevaras mellan beräkningsfall');
    // Äldre jämförelselänkar får inte återaktivera den borttagna arbetsboksvyn.
    for (const obsoleteView of ['workbook', 'classic']) {
      await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/?view=${obsoleteView}` });
      let classicReady = false;
      for (let attempt = 0; attempt < 100 && !classicReady; attempt++) {
        classicReady = await evaluate('Boolean(document.readyState === "complete" && document.querySelectorAll("#case-select option").length === 17 && document.getElementById("case-select").value === "lifting-beam")');
        if (!classicReady) await new Promise(r => setTimeout(r, 50));
      }
      assert.ok(classicReady, `Äldre view=${obsoleteView} ska öppna klassisk mittlyftsvy`);
      assert.equal(await evaluate('document.querySelectorAll(".layout-switch, #layout-classic, #layout-workbook").length'), 0);
      assert.equal(await evaluate('document.getElementById("beam-case").hidden'), false);
      await selectCase('wb-kb5');
      assert.equal(await evaluate('document.getElementById("case-E30").options.length'), 204);
      assert.ok(await evaluate('document.querySelector("#case-result .workbook-metrics").checkVisibility()'));
      assert.equal(await evaluate('document.querySelector("#case-result .workbook-checks").checkVisibility()'), false);
      assert.ok(await evaluate('document.querySelector("#case-result details.workbook-warning")'));
    }
    // Samma filer ska också fungera direkt från disk, utan HTTP-server/API.
    const localUrl = pathToFileURL(resolve(__dirname, '..', 'index.html')).href;
    const fileNavigation = await send('Page.navigate', { url: localUrl });
    const fileBlockedByPolicy = fileNavigation.errorText === 'net::ERR_BLOCKED_BY_ADMINISTRATOR';
    if (fileBlockedByPolicy) {
      console.log('SKIP: file:// är blockerat av Chromium-miljöns organisationspolicy (ERR_BLOCKED_BY_ADMINISTRATOR). Direkt filöppning har inte kunnat verifieras här.');
    } else {
      assert.ok(!fileNavigation.errorText, `Filnavigering misslyckades: ${fileNavigation.errorText}`);
      let fileReady = false;
      for (let attempt = 0; attempt < 100 && !fileReady; attempt++) {
        fileReady = await evaluate('Boolean(location.protocol === "file:" && document.readyState === "complete" && typeof WorkbookEngine !== "undefined" && document.querySelectorAll("#case-select option").length === 17 && document.getElementById("case-select").value === "lifting-beam")');
        if (!fileReady) await new Promise(r => setTimeout(r, 50));
      }
      if (!fileReady) console.error({ fileNavigation, scriptErrors, page: await evaluate('({url:location.href,state:document.readyState,cases:document.querySelectorAll("#case-select option").length,selected:document.getElementById("case-select")?.value,engine:typeof WorkbookEngine,body:document.body?.innerText.slice(0,1200)})') });
      assert.ok(fileReady, 'Den återställda mittlyftsvyn ska fungera via file://');
      assert.equal(await evaluate('document.getElementById("beam-case").hidden'), false);
      assert.equal(await evaluate('document.getElementById("custom-case").hidden'), true);
      await selectCase('wb-kb5');
      assert.equal(await evaluate('document.getElementById("case-E30").options.length'), 204);
      assert.equal(await evaluate('document.getElementById("case-report").disabled'), false);
      await selectCase('wb-semispridarok');
      assert.equal(await evaluate('document.getElementById("case-E30").options.length'), 204);
      assert.ok(await evaluate('document.querySelector("#case-result .workbook-warning").textContent.includes("1,75")'));
      await evaluate('document.getElementById("case-report").click()');
      assert.ok(await evaluate('document.getElementById("report-dialog").open'));
      assert.ok(await evaluate('document.getElementById("report-content").textContent.includes("Semispridarok")'));
      await evaluate('document.getElementById("close-report").click()');
    }
    assert.deepEqual(scriptErrors, [], 'Inga ohanterade JavaScriptfel vid HTTP- eller filöppning');
    assert.deepEqual(paginationFailures, [], 'PDF ska ha en fysisk sida per avsedd rapportsida');
    assert.deepEqual(reportOverflowFailures, [], 'Ekvationer och profilvärden ska rymmas inom rapportsidan');
    console.log(`PASS: klassisk vy, 17 lastfall, tio arbetsboksrapporter/PDF, 204 profilval, äldre modeller, felhantering och mobil/desktop.${fileBlockedByPolicy ? ' file:// ej verifierat på grund av miljöpolicy.' : ' Direkt filöppning verifierad.'}`);
  } finally {
    if (ws) ws.close();
    const exited = new Promise(r => browser.once('exit', r));
    browser.kill();
    await exited;
    await rm(dir, { recursive: true, force: true });
    await new Promise(r => server.close(r));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
