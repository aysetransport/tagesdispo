// Selbsttest (node tools/offline-test.js, braucht Playwright mit Chromium): Änderungen ohne Netz gehen beim nächsten Start nach Drive statt überschrieben zu werden.
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const server = { version: 0, json: null, aus: false };
(async () => {
  const web = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, b) => { r.writeHead(e ? 404 : 200); r.end(b); }); }).listen(8765);
  const b = await chromium.launch(), ctx = await b.newContext(), p = await ctx.newPage();
  p.on('dialog', d => d.accept('1234')); p.on('pageerror', e => console.log('SEITENFEHLER', e.message)); p.on('console', m => m.type() === 'error' && console.log('KONSOLE', m.text()));
  await ctx.addInitScript(() => { try { localStorage.setItem('tagesdispo-pin', '1234'); } catch {} });
  await ctx.route('**/sw.js', r => r.fulfill({ status: 404, body: '' }));
  await ctx.route('https://script.google.com/**', async r => {
    if (server.aus) return r.abort('internetdisconnected');
    const { fn, args } = JSON.parse(r.request().postData()), ok = x => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: x }) });
    if (fn === 'anmelden') return ok(true);
    if (fn === 'laden') return ok({ version: server.version, json: server.json });
    if (fn === 'version') return ok(server.version);
    if (fn === 'speichern') { const [json, v, force] = args.slice(1); if (v !== server.version && !force) return ok({ konflikt: true, json: server.json, version: server.version }); server.json = json; server.version++; return ok({ version: server.version }); }
    return ok(null);
  });
  await ctx.route(/nominatim|photon|osrm|openplzapi/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(2500);
  const v1 = server.version;
  server.aus = true;
  await p.evaluate(() => { S.pruefMarke = 'offline-geaendert'; save(); }); await p.waitForTimeout(1500);
  const offen = await p.evaluate(() => localStorage.getItem('tagesdispo-offen'));
  await p.close(); server.aus = false;
  const p2 = await ctx.newPage(); p2.on('dialog', d => d.accept());
  await p2.goto('http://localhost:8765/index.html'); await p2.waitForTimeout(2500);
  const angekommen = JSON.parse(server.json || '{}').pruefMarke, offenDanach = await p2.evaluate(() => localStorage.getItem('tagesdispo-offen'));
  console.log({ v1, offen, angekommen, offenDanach, version: server.version });
  if (!(v1 >= 1 && offen === '1' && angekommen === 'offline-geaendert' && offenDanach === null)) { console.log('FEHLER'); process.exitCode = 1; } else console.log('OK');
  await b.close(); web.close();
})();
