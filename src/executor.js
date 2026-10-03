import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SUPPORTED_LANGUAGES, resolveLanguage, detectLanguage, extractCodeBlock } from './languages.js';

export function executeCommand(cmd, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : undefined;

    exec(cmd, { cwd, shell, maxBuffer: 1024 * 1024 * 25 }, (error, stdout, stderr) => {
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

export async function executeCode({ code, language = null, cwd = process.cwd() }) {
  const rawCode = extractCodeBlock(code);
  const targetLang = resolveLanguage(language) || detectLanguage(code);
  const langConfig = SUPPORTED_LANGUAGES[targetLang];

  if (!langConfig) {
    return {
      success: false,
      language: targetLang,
      stderr: `Unsupported language: ${language}. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`
    };
  }

  const runId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tmpDir = path.join(os.tmpdir(), 'inject-agent-runner');
  await fs.mkdir(tmpDir, { recursive: true });

  const srcPath = path.join(tmpDir, `${runId}${langConfig.extension}`);
  const isWindows = process.platform === 'win32';
  const binPath = path.join(tmpDir, isWindows ? `${runId}.exe` : runId);

  try {
    await fs.writeFile(srcPath, rawCode, 'utf8');

    // Compilation step if needed (Rust, C, C++)
    if (typeof langConfig.compile === 'function') {
      const compileCmd = langConfig.compile(srcPath, binPath);
      const compileRes = await executeCommand(compileCmd, tmpDir);
      if (!compileRes.success) {
        return {
          success: false,
          language: targetLang,
          stage: 'compilation',
          exitCode: compileRes.exitCode,
          stdout: compileRes.stdout,
          stderr: compileRes.stderr
        };
      }
      const runCmd = langConfig.run(binPath);
      const runRes = await executeCommand(runCmd, cwd);
      return {
        ...runRes,
        language: targetLang
      };
    }

    // Direct interpreter/runner
    const runCmd = langConfig.run(srcPath);
    const runRes = await executeCommand(runCmd, cwd);
    return {
      ...runRes,
      language: targetLang
    };
  } finally {
    // Cleanup temporary artifacts
    await fs.unlink(srcPath).catch(() => {});
    await fs.unlink(binPath).catch(() => {});
  }
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
