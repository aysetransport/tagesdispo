'use strict';
// Erzeugt die App-Symbole aus logo.svg: icon-192/512.png randlos (iPhone, Android, maskierbar).
// Aufruf: node tools/icons.js (braucht Playwright mit Chromium).
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const wurzel = path.join(__dirname, '..'), svg = fs.readFileSync(path.join(wurzel, 'logo.svg'), 'utf8');
(async () => {
  const b = await chromium.launch(), s = await b.newPage();
  for (const [datei, px] of [['icon-512.png', 512], ['icon-192.png', 192]]) {
    await s.setViewportSize({ width: px, height: px });
    await s.setContent(`<style>html,body{margin:0}svg{display:block;width:${px}px;height:${px}px}</style>${svg}`);
    await s.screenshot({ path: path.join(wurzel, datei) });
    console.log(datei, px);
  }
  await b.close();
})();
