import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { executeCommand } from '../executor.js';

let activeServer = null;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

export async function serveLocalSite({ dir = './generated-app', port = 5000 }) {
  if (activeServer) {
    activeServer.close();
    activeServer = null;
  }

  const root = path.resolve(process.cwd(), dir);
  const server = http.createServer(async (req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(root, reqPath);

    try {
      const ext = path.extname(filePath).toLowerCase();
      const content = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      activeServer = server;
      resolve({
        success: true,
        localUrl: `http://localhost:${port}`,
        directory: root,
        message: `Website live locally at http://localhost:${port}`
      });
    });
  });
}

export async function publishToCloud({ dir = './generated-app', provider = 'vercel' }) {
  const fullPath = path.resolve(process.cwd(), dir);
  let cmd = '';

  if (provider === 'surge') {
    cmd = `npx -y surge "${fullPath}"`;
  } else if (provider === 'netlify') {
    cmd = `npx -y netlify-cli deploy --dir="${fullPath}" --prod`;
  } else {
    cmd = `npx -y vercel deploy "${fullPath}" --prod --yes`;
  }

  const res = await executeCommand(cmd, fullPath);
  return {
    provider,
    command: cmd,
    ...res
  };
}
