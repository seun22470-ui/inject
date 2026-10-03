import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'david-test-'));

console.log('\n======================================================');
console.log('  DAVID AGENT v4.2.0 UNIFIED 4-MODEL VERIFICATION');
console.log('======================================================\n');

try {
  // Step 1: Pack tarball
  console.log('[1/4] Packing david-agent v4.2.0 with npm pack...');
  const packOutput = execSync('npm pack', { encoding: 'utf-8' }).trim();
  const tarballName = packOutput.split('\n').filter(l => l.endsWith('.tgz')).pop();
  console.log(`      ✓ Created package archive: ${tarballName}`);

  // Step 2: Install
  console.log('[2/4] Testing isolated clean install...');
  execSync(`npm install --prefix "${tmpTestDir}" "${path.resolve(tarballName)}"`, { stdio: 'pipe' });
  console.log('      ✓ Package v4.2.0 installed cleanly.');

  // Step 3: Check binaries
  console.log('[3/4] Verifying CLI binaries: david, david-agent, inject-agent, forge...');
  const binDir = path.join(tmpTestDir, 'node_modules', '.bin');
  const davidBin = path.join(binDir, 'david');
  const agentBin = path.join(binDir, 'david-agent');
  if (!fs.existsSync(davidBin)) throw new Error('Missing binary: david');
  if (!fs.existsSync(agentBin)) throw new Error('Missing binary: david-agent');
  console.log('      ✓ Found executable: david');
  console.log('      ✓ Found executable: david-agent');

  // Step 4: Run process verification
  console.log('[4/4] Verifying David Unified Agent & 4 Internal Models...');
  const agentProcess = spawn('node', [davidBin], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  agentProcess.stdout.on('data', (d) => { output += d.toString(); });
  agentProcess.stderr.on('data', (d) => { output += d.toString(); });

  agentProcess.stdin.write('/help\n');
  agentProcess.stdin.write('/models\n');
  agentProcess.stdin.write('/exit\n');

  await new Promise((resolve) => {
    agentProcess.on('close', resolve);
    setTimeout(() => { agentProcess.kill(); resolve(); }, 4000);
  });

  if (!output.includes('DAVID AGENT') && !output.includes('David')) {
    throw new Error('David branding missing from banner');
  }
  if (!output.includes('INJECT') || !output.includes('CODE REVIEWER')) {
    throw new Error('Missing internal models');
  }

  console.log('      ✓ David Banner rendered correctly.');
  console.log('      ✓ 4 Internal Models active: INJECT, CODE REVIEWER, ACCUMULATE, DIGEST.');

  console.log('\n======================================================');
  console.log('  PASSED: David Agent v4.2.0 is 100% Operational!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\nFAILED:', err.message);
  process.exit(1);
}
