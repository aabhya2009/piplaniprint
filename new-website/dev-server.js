const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 5173;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const clients = new Set();

function safePath(urlPath) {
  let filePath = decodeURIComponent(urlPath.split('?')[0]);
  if (filePath === '/') filePath = '/index.html';
  const resolved = path.normalize(path.join(ROOT, filePath));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function injectLiveReload(html) {
  const snippet = `\n<script>
(() => {
  const es = new EventSource('/__livereload');
  es.onmessage = (ev) => {
    if (ev.data === 'reload') window.location.reload();
  };
})();
</script>\n`;

  if (html.includes('</body>')) return html.replace('</body>', `${snippet}</body>`);
  return `${html}${snippet}`;
}

function broadcastReload() {
  for (const res of clients) {
    res.write('data: reload\\n\\n');
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('data: connected\\n\\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  const filePath = safePath(req.url || '/');
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    if (ext === '.html') {
      const html = injectLiveReload(data.toString('utf-8'));
      res.writeHead(200, { 'Content-Type': type });
      res.end(html);
      return;
    }

    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

let debounce;
fs.watch(ROOT, { recursive: true }, (_, filename) => {
  if (!filename) return;
  if (filename.includes('.git') || filename.includes('node_modules')) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => broadcastReload(), 90);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Live dev server running: http://127.0.0.1:${PORT}`);
  console.log('Edit files and browser will auto-refresh.');
});
