const http = require('node:http');
const { readFile, realpath } = require('node:fs/promises');
const { resolve, sep, extname } = require('node:path');
const { fetchCharacter } = require('./refresh-character.cjs');

const root = resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function createServer(getCharacter = fetchCharacter) {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end('Invalid URL'); }
    if (pathname === '/api/character') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        const character = await getCharacter();
        return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(character));
      } catch {
        res.writeHead(502);
        return res.end(JSON.stringify({ error: 'Armory refresh unavailable' }));
      }
    }
    // Serve public site assets only; keep dotfiles and source scripts private.
    if (pathname.split('/').some(part => part.startsWith('.')) || !types[extname(pathname === '/' ? '/index.html' : pathname)]) {
      res.writeHead(404); return res.end('Not found');
    }
    try {
      const file = await realpath(resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)));
      if (!file.startsWith(root + sep)) { res.writeHead(404); return res.end('Not found'); }
      const data = await readFile(file);
      res.setHeader('Content-Type', types[extname(file)]);
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8788);
  const server = createServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Orken's Journal: http://127.0.0.1:${port} (Armory refreshes on every page load)`));
}
module.exports = { createServer };
