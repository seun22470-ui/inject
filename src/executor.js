import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export function executeCommand(cmd, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : undefined;

    exec(cmd, { cwd, shell, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          exitCode: error.code || 1,
          stdout: stdout ? stdout.trim() : '',
          stderr: (stderr ? stderr.trim() : '') || error.message
        });
      } else {
        resolve({
          success: true,
          exitCode: 0,
          stdout: stdout ? stdout.trim() : '',
          stderr: stderr ? stderr.trim() : ''
        });
      }
    });
  });
}

export async function writeFile(filePath, content) {
  const resolved = path.resolve(process.cwd(), filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, 'utf8');
  return resolved;
}

export async function readFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  return await fs.readFile(resolved, 'utf8');
}

export async function listDirectory(dirPath = '.') {
  const resolved = path.resolve(process.cwd(), dirPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`);
}
