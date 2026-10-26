// SPDX-License-Identifier: MIT
// Same transport constraints as the Android wrapper, for local development only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const provider = require('../web/features/gutenberg.js');
async function proxy(req, res) {
  try {
    let url = provider.validateUrl(new URL(req.url, 'http://localhost').searchParams.get('url'));
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45000);
    req.on('close', () => { if (!req.complete) controller.abort(); });
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      for (let hops = 0; hops <= 5; hops++) {
        const response = await fetch(url, { redirect: 'manual', signal: controller.signal,
          headers: { 'User-Agent': 'Lisiere-Compact/1.4.0 (OPDS reader; https://github.com/Zachiran42/lisiere-compact)', 'Accept-Encoding': 'identity' } });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location'); await response.body?.cancel();
          if (!location) throw Error('Invalid redirect'); url = provider.validateUrl(location, url); continue;
        }
        const epub = /\.epub(?:3?\.(?:images|noimages))?$/.test(new URL(url).pathname);
        const bytes = await provider.boundedBytes(response, (epub ? 40 : 2) * 1024 * 1024, controller.signal);
        res.writeHead(200, { 'Content-Type': epub ? 'application/epub+zip' : 'application/atom+xml; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(bytes); return;
      }
      throw Error('Too many redirects');
    } finally { clearTimeout(timer); }
  } catch (error) { res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Gutenberg indisponible.'); }
}
http.createServer((req, res) => {
  if (req.url.startsWith('/gutenberg?') && req.method === 'GET') { proxy(req, res); return; }
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store'); res.end(data);
  });
}).listen(Number(process.env.LISIERE_PREVIEW_PORT || 8768), '127.0.0.1', () => console.log('Lisiere preview: http://127.0.0.1:' + (process.env.LISIERE_PREVIEW_PORT || 8768) + '/web/index.html'));
