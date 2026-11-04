// Integrationstest med riktig Chromium. Inga npm-paket behövs.
const { spawn } = require('node:child_process');
const { mkdtemp, rm, readFile, writeFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const files = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/report.css': ['report.css', 'text/css'], '/report.js': ['report.js', 'text/javascript'], '/profiles.js': ['profiles.js', 'text/javascript'], '/beam.js': ['beam.js', 'text/javascript'], '/app.js': ['app.js', 'text/javascript'], '/calculations.js': ['calculations.js', 'text/javascript'], '/c-hook-report.js': ['c-hook-report.js', 'text/javascript'], '/load-cases.js': ['load-cases.js', 'text/javascript'], '/case-ui.js': ['case-ui.js', 'text/javascript'], '/c2.js': ['c2.js', 'text/javascript'], '/c2-case.js': ['c2-case.js', 'text/javascript'], '/c2-report.js': ['c2-report.js', 'text/javascript'], '/c4.js': ['c4.js', 'text/javascript'], '/c4-case.js': ['c4-case.js', 'text/javascript'], '/c4-report.js': ['c4-report.js', 'text/javascript'], '/plate-shear.js': ['plate-shear.js', 'text/javascript'], '/plate-shear-cases.js': ['plate-shear-cases.js', 'text/javascript'], '/plate-shear-report.js': ['plate-shear-report.js', 'text/javascript'], '/asymmetric-beam.js': ['asymmetric-beam.js', 'text/javascript'], '/asymmetric-beam-case.js': ['asymmetric-beam-case.js', 'text/javascript'], '/asymmetric-beam-report.js': ['asymmetric-beam-report.js', 'text/javascript'] };
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
    ws.onmessage = event => {
      const message = JSON.parse(event.data);
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
    await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
    let ready = false;
    for (let n = 0; n < 100 && !ready; n++) {
      ready = await evaluate('Boolean(document.querySelector(".result-top"))');
      if (!ready) await new Promise(r => setTimeout(r, 50));
    }
    if (!ready) console.error(await evaluate('JSON.stringify({url:location.href,state:document.readyState,body:document.body?.innerText,beam:typeof Beam})'));
    assert.ok(ready, 'Sidan ska räkna vid start');
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
    assert.equal(await evaluate('document.querySelectorAll("#case-select option").length'), 7);
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
    assert.equal(await evaluate('document.querySelectorAll("#case-select option").length'), 7);
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
    console.log('PASS: sju lastfall, asymmetrisk lastbalans, profilval, rapporter, felhantering och mobilbredd.');
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
