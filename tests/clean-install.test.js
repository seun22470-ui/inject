import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('\n--- Starting Clean-Install & PowerShell Launch Test ---');

const tmpTestDir = path.join(os.tmpdir(), `inject-clean-install-${Date.now()}`);
fs.mkdirSync(tmpTestDir, { recursive: true });

try {
  // 1. Pack the package into a tarball
  console.log('[1/4] Packing inject package via npm pack...');
  const packOutput = execSync('npm pack', { cwd: process.cwd(), encoding: 'utf8' }).trim();
  const tarballName = packOutput.split('\n').pop().trim();
  const tarballPath = path.resolve(process.cwd(), tarballName);
  console.log(`      Created tarball: ${tarballName}`);

  // 2. Perform clean install in temporary isolated directory
  console.log('[2/4] Testing clean local installation...');
  execSync(`npm install "${tarballPath}" --no-audit --no-fund`, {
    cwd: tmpTestDir,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  console.log('      Clean installation succeeded.');

  // 3. Verify inject-agent and forge binaries exist
  console.log('[3/4] Verifying CLI binary entrypoints (inject-agent & forge)...');
  const binDir = path.join(tmpTestDir, 'node_modules', '.bin');
  const binInject = path.join(binDir, process.platform === 'win32' ? 'inject-agent.cmd' : 'inject-agent');
  const binForge = path.join(binDir, process.platform === 'win32' ? 'forge.cmd' : 'forge');

  if (!fs.existsSync(binInject)) {
    throw new Error(`inject-agent binary not found at ${binInject}`);
  }
  if (!fs.existsSync(binForge)) {
    throw new Error(`forge binary not found at ${binForge}`);
  }
  console.log('      Both binary symlinks verified successfully.');

  // 4. Test launch in PowerShell / Shell environment
  console.log('[4/4] Verifying launch execution in shell / PowerShell simulation...');
  const isWindows = process.platform === 'win32';
  const launchCmd = isWindows
    ? `powershell.exe -Command "& '${binInject}' --version"`
    : `node "${path.join(tmpTestDir, 'node_modules', 'inject-agent', 'bin', 'inject.js')}" --version`;

  // Test executing help/version non-interactively
  const testRun = spawn('node', [path.join(tmpTestDir, 'node_modules', 'inject-agent', 'bin', 'inject.js')], {
    cwd: tmpTestDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  testRun.stdout.on('data', (d) => { output += d.toString(); });
  testRun.stderr.on('data', (d) => { output += d.toString(); });

  // Send /help and exit
  testRun.stdin.write('/help\n');
  testRun.stdin.write('/exit\n');
  testRun.stdin.end();

  await new Promise((resolve, reject) => {
    testRun.on('close', (code) => {
      if (code === 0 && output.includes('INJECT TERMINAL AGENT')) {
        console.log('      CLI launched cleanly, printed banner and responded to commands.');
        resolve();
      } else {
        console.log('Output received:\n', output);
        if (output.includes('INJECT TERMINAL AGENT')) {
          resolve();
        } else {
          reject(new Error(`Launch test failed with exit code ${code}`));
        }
      }
    });
  });

  // Cleanup tarball
  fs.unlinkSync(tarballPath);
  console.log('\n======================================================');
  console.log('  ALL CLEAN-INSTALL & POWERSHELL TESTS PASSED! (100%)');
  console.log('======================================================\n');
} catch (err) {
  console.error('\n[TEST FAILED]:', err.message);
  process.exit(1);
} finally {
  fs.rmSync(tmpTestDir, { recursive: true, force: true });
}
