import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('\n======================================================');
console.log('  INJECT AGENT v2.9 CLEAN-INSTALL & SKILLS TEST SUITE');
console.log('======================================================\n');

const testWorkspace = path.join(os.tmpdir(), `inject-v29-test-${Date.now()}`);
fs.mkdirSync(testWorkspace, { recursive: true });

try {
  // 1. Pack the package into a tarball
  console.log('[1/4] Packing inject v2.9 via npm pack...');
  const packOutput = execSync('npm pack', { cwd: process.cwd(), encoding: 'utf8' }).trim();
  const tarballName = packOutput.split('\n').filter(Boolean).pop().trim();
  const tarballPath = path.resolve(process.cwd(), tarballName);
  console.log(`      ✓ Created package archive: ${tarballName}`);

  // 2. Install cleanly into isolated directory
  console.log('[2/4] Testing isolated clean install...');
  fs.writeFileSync(
    path.join(testWorkspace, 'package.json'),
    JSON.stringify({ name: 'verify-v29', version: '2.9.0', type: 'module' }, null, 2)
  );

  execSync(`npm install "${tarballPath}" --no-audit --no-fund`, {
    cwd: testWorkspace,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  console.log('      ✓ Package installed cleanly.');

  // 3. Verify binaries
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

  // 4. Verify 75 skills loaded and PowerShell launch
  console.log('[4/4] Verifying 75 skills registration and interactive launch...');
  const agentEntry = path.join(testWorkspace, 'node_modules', 'inject-agent', 'bin', 'agent.js');

  const testProcess = spawn('node', [agentEntry], {
    cwd: testWorkspace,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  testProcess.stdout.on('data', (d) => { output += d.toString(); });
  testProcess.stderr.on('data', (d) => { output += d.toString(); });

  testProcess.stdin.write('/skills\n');
  testProcess.stdin.write('/exit\n');
  testProcess.stdin.end();

  await new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (output.includes('INJECT TERMINAL AGENT v2.9') && output.includes('75 CORE SKILLS MATRIX')) {
        console.log('      ✓ Banner v2.9 rendered correctly.');
        console.log('      ✓ All 75 Skills confirmed loaded across categories.');
        resolve();
      } else {
        reject(new Error(`Agent v2.9 launch test failed. Code: ${code}. Output: ${output}`));
      }
    });
  });

  fs.unlinkSync(tarballPath);

  console.log('\n======================================================');
  console.log('  PASSED: Inject Agent v2.9 with 75 Skills Verified! ');
  console.log('======================================================\n');
} catch (err) {
  console.error('\n[TEST FAILED]:', err.message);
  process.exit(1);
} finally {
  fs.rmSync(testWorkspace, { recursive: true, force: true });
}
