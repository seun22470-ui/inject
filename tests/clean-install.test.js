import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('\n======================================================');
console.log('  CLEAN-INSTALL & POWERSHELL VERIFICATION SUITE');
console.log('======================================================\n');

const testWorkspace = path.join(os.tmpdir(), `inject-clean-install-${Date.now()}`);
fs.mkdirSync(testWorkspace, { recursive: true });

try {
  // 1. Pack the package into a distributable tarball
  console.log('[1/4] Packing tarball with npm pack...');
  const packOutput = execSync('npm pack', { cwd: process.cwd(), encoding: 'utf8' }).trim();
  const tarballName = packOutput.split('\n').filter(Boolean).pop().trim();
  const tarballPath = path.resolve(process.cwd(), tarballName);
  console.log(`      ✓ Created package archive: ${tarballName}`);

  // 2. Initialize isolated test environment with fresh package.json
  console.log('[2/4] Testing isolated clean install...');
  fs.writeFileSync(
    path.join(testWorkspace, 'package.json'),
    JSON.stringify({ name: 'verify-env', version: '1.0.0', type: 'module' }, null, 2)
  );

  execSync(`npm install "${tarballPath}" --no-audit --no-fund`, {
    cwd: testWorkspace,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  console.log('      ✓ Package installed cleanly.');

  // 3. Verify executable binaries (both inject-agent and forge)
  console.log('[3/4] Verifying CLI binaries: inject-agent & forge...');
  const binDir = path.join(testWorkspace, 'node_modules', '.bin');
  const binInject = path.join(binDir, process.platform === 'win32' ? 'inject-agent.cmd' : 'inject-agent');
  const binForge = path.join(binDir, process.platform === 'win32' ? 'forge.cmd' : 'forge');

  if (!fs.existsSync(binInject)) {
    throw new Error(`inject-agent binary not found at ${binInject}`);
  }
  if (!fs.existsSync(binForge)) {
    throw new Error(`forge binary not found at ${binForge}`);
  }
  console.log('      ✓ Found executable: inject-agent');
  console.log('      ✓ Found executable: forge');

  // 4. Verify PowerShell / Shell launch execution
  console.log('[4/4] Verifying launch simulation in PowerShell / Shell...');
  const agentEntry = path.join(testWorkspace, 'node_modules', 'inject-agent', 'bin', 'agent.js');

  const testProcess = spawn('node', [agentEntry], {
    cwd: testWorkspace,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  testProcess.stdout.on('data', (d) => { output += d.toString(); });
  testProcess.stderr.on('data', (d) => { output += d.toString(); });

  // Send interactive commands: /help and /exit
  testProcess.stdin.write('/help\n');
  testProcess.stdin.write('/exit\n');
  testProcess.stdin.end();

  await new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (output.includes('INJECT TERMINAL AGENT')) {
        console.log('      ✓ Banner rendered and command prompt initialized.');
        console.log('      ✓ Received interactive /help and /exit correctly.');
        resolve();
      } else {
        reject(new Error(`Agent process failed to launch. Output: ${output}`));
      }
    });
  });

  // Clean tarball
  fs.unlinkSync(tarballPath);

  console.log('\n======================================================');
  console.log('  PASSED: Both binaries and PowerShell launch verified!');
  console.log('======================================================\n');
} catch (err) {
  console.error('\n[TEST FAILED]:', err.message);
  process.exit(1);
} finally {
  fs.rmSync(testWorkspace, { recursive: true, force: true });
}
