/**
 * Servidor local do site da Prime Veículos.
 *
 *   node serve.js            → http://localhost:5500
 *   node serve.js 8080       → escolhe outra porta
 *
 * Suporta Range requests (necessário para o vídeo do hero tocar e
 * reiniciar o loop corretamente no Chrome/Edge).
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORTA = Number(process.argv[2]) || 5500;
const RAIZ  = __dirname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

http.createServer((req, res) => {
  // Remove querystring e decodifica %20 dos nomes de pasta
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  // Impede sair da pasta do projeto (../../)
  const arquivo = path.join(RAIZ, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ''));
  if (!arquivo.startsWith(RAIZ)) {
    res.writeHead(403).end('403 — fora do diretório');
    return;
  }

  fs.stat(arquivo, (erro, info) => {
    if (erro || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — não encontrado: ' + rel);
      console.log(`404  ${rel}`);
      return;
    }

    const tipo  = TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
    const total = info.size;
    const range = req.headers.range;

    // Entrega parcial (vídeo)
    if (range) {
      const [ini, fim] = range.replace(/bytes=/, '').split('-');
      const inicio = parseInt(ini, 10);
      const final  = fim ? parseInt(fim, 10) : total - 1;

      if (isNaN(inicio) || inicio >= total) {
        res.writeHead(416, { 'Content-Range': `bytes */${total}` }).end();
        return;
      }

      res.writeHead(206, {
        'Content-Range':  `bytes ${inicio}-${final}/${total}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': final - inicio + 1,
        'Content-Type':   tipo,
      });
      fs.createReadStream(arquivo, { start: inicio, end: final }).pipe(res);
      console.log(`206  ${rel}  (${inicio}-${final})`);
      return;
    }

    res.writeHead(200, {
      'Content-Type':   tipo,
      'Content-Length': total,
      'Accept-Ranges':  'bytes',
      'Cache-Control':  'no-cache',
    });
    fs.createReadStream(arquivo).pipe(res);
    console.log(`200  ${rel}`);
  });
}).listen(PORTA, () => {
  console.log('');
  console.log('  Prime Veículos rodando localmente');
  console.log(`  →  http://localhost:${PORTA}`);
  console.log('');
  console.log('  Ctrl + C para parar.');
  console.log('');
});
