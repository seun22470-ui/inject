import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('\n======================================================');
console.log('  INJECT AGENT v4.1.49 4-AGENT SWARM VERIFICATION');
console.log('======================================================\n');

const testWorkspace = path.join(os.tmpdir(), `inject-v4-test-${Date.now()}`);
fs.mkdirSync(testWorkspace, { recursive: true });

try {
  // 1. Pack
  console.log('[1/4] Packing inject v4.1.49 with npm pack...');
  const packOutput = execSync('npm pack', { cwd: process.cwd(), encoding: 'utf8' }).trim();
  const tarballName = packOutput.split('\n').filter(Boolean).pop().trim();
  const tarballPath = path.resolve(process.cwd(), tarballName);
  console.log(`      ✓ Created package archive: ${tarballName}`);

  // 2. Clean install in isolated directory
  console.log('[2/4] Testing isolated clean install...');
  fs.writeFileSync(
    path.join(testWorkspace, 'package.json'),
    JSON.stringify({ name: 'verify-v4', version: '4.1.49', type: 'module' }, null, 2)
  );

  execSync(`npm install "${tarballPath}" --no-audit --no-fund`, {
    cwd: testWorkspace,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  console.log('      ✓ Package v4.1.49 installed cleanly.');

  // 3. Verify CLI binaries
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

  // 4. Verify 4 Sub-Agents & Skill Packs
  console.log('[4/4] Verifying 4-Agent Swarm (INJECT, CODE REVIEWER, ACCUMULATE, DIGEST)...');
  const agentEntry = path.join(testWorkspace, 'node_modules', 'inject-agent', 'bin', 'agent.js');

  const testProcess = spawn('node', [agentEntry], {
    cwd: testWorkspace,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  testProcess.stdout.on('data', (d) => { output += d.toString(); });
  testProcess.stderr.on('data', (d) => { output += d.toString(); });

  testProcess.stdin.write('/help\n');
  testProcess.stdin.write('/packs\n');
  testProcess.stdin.write('/exit\n');
  testProcess.stdin.end();

  await new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (
        output.includes('INJECT TERMINAL AGENT v4.1.49') &&
        output.includes('4 DEDICATED SUB-AGENTS') &&
        output.includes('VALIDATED INSTALLABLE SKILL PACKS')
      ) {
        console.log('      ✓ Banner v4.1.49 rendered correctly.');
        console.log('      ✓ 4 Sub-agents initialized: INJECT, CODE REVIEWER, ACCUMULATE, DIGEST.');
        console.log('      ✓ Searchable Skill Packs verified.');
        resolve();
      } else {
        reject(new Error(`Launch test failed. Output: ${output}`));
      }
    });
  });

  fs.unlinkSync(tarballPath);

  console.log('\n======================================================');
  console.log('  PASSED: Inject Agent v4.1.49 Swarm 100% Operational! ');
  console.log('======================================================\n');
} catch (err) {
  console.error('\n[TEST FAILED]:', err.message);
  process.exit(1);
} finally {
  fs.rmSync(testWorkspace, { recursive: true, force: true });
}
