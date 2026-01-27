const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = process.env.PORT ? Number(process.env.PORT) : 8000;

const mime = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(root, reqPath);
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback
      const fallback = path.join(root, 'index.html');
      return fs.readFile(fallback, (e, data) => {
        if (e) { res.statusCode = 500; res.end('Server error'); return; }
        res.setHeader('Content-Type', 'text/html');
        res.end(data);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => { res.statusCode = 500; res.end('Server error'); });
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Simple static server serving ${root} on http://127.0.0.1:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
