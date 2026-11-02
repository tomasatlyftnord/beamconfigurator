// Integrationstest med riktig Chromium. Inga npm-paket behövs.
const { spawn } = require('node:child_process');
const { mkdtemp, rm, readFile, writeFile } = require('node:fs/promises');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const files = { '/': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/report.css': ['report.css', 'text/css'], '/report.js': ['report.js', 'text/javascript'], '/profiles.js': ['profiles.js', 'text/javascript'], '/beam.js': ['beam.js', 'text/javascript'], '/app.js': ['app.js', 'text/javascript'] };
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
    assert.ok(await evaluate('document.getElementById("result").textContent.includes("Tabellens Wₑₗ")'));
    assert.ok(await evaluate('!document.body.textContent.includes("Profilens W, modell")'));
    assert.ok(await evaluate('document.querySelector(".tag").textContent.includes("TABELLDATA")'));
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
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
    const pdfBytes = Buffer.from(pdf.data, 'base64');
    assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
    const pdfPath = process.env.BEAM_TEST_PDF || join(tmpdir(), 'beam-report-example.pdf');
    await writeFile(pdfPath, pdfBytes);
    console.log(`PDF skapad: ${pdfPath}`);
    await evaluate('document.getElementById("close-report").click()');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobilläget ska inte ge horisontell sidskroll');
    console.log('PASS: lokal HTTP-server, standardresultat, ändrad last, profillista, ogiltig indata, extrem last och mobilbredd.');
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
