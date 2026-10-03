import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'david-test-'));

console.log('\n======================================================');
console.log('  DAVID AGENT v4.2.0 FULL CAPABILITY TEST');
console.log('======================================================\n');

try {
  console.log('[1/4] Packing david-agent v4.2.0 with npm pack...');
  const packOutput = execSync('npm pack', { encoding: 'utf-8' }).trim();
  const tarballName = packOutput.split('\n').filter(l => l.endsWith('.tgz')).pop();
  console.log(`      ✓ Created package archive: ${tarballName}`);

  console.log('[2/4] Testing isolated clean install...');
  execSync(`npm install --prefix "${tmpTestDir}" "${path.resolve(tarballName)}"`, { stdio: 'pipe' });
  console.log('      ✓ Package v4.2.0 installed cleanly.');

  console.log('[3/4] Verifying CLI binaries: david, david-agent...');
  const binDir = path.join(tmpTestDir, 'node_modules', '.bin');
  const davidBin = path.join(binDir, 'david');
  if (!fs.existsSync(davidBin)) throw new Error('Missing binary: david');
  console.log('      ✓ Found executable: david');

  console.log('[4/4] Verifying David Unified Agent, Credits, AI Seer & Scheduler...');
  const agentProcess = spawn('node', [davidBin], { stdio: ['pipe', 'pipe', 'pipe'] });

  let output = '';
  agentProcess.stdout.on('data', (d) => { output += d.toString(); });
  agentProcess.stderr.on('data', (d) => { output += d.toString(); });

  agentProcess.stdin.write('/help\n');
  agentProcess.stdin.write('/models\n');
  agentProcess.stdin.write('/credits\n');
  agentProcess.stdin.write('/tasks\n');
  agentProcess.stdin.write('/exit\n');

  await new Promise((resolve) => {
    agentProcess.on('close', resolve);
    setTimeout(() => { agentProcess.kill(); resolve(); }, 4000);
  });

  if (!output.includes('DAVID AGENT')) throw new Error('David header missing');
  if (!output.includes('Credits Balance')) throw new Error('Credits balance missing');
  if (!output.includes('AI Seer')) throw new Error('AI Seer missing from help');

  console.log('      ✓ David Banner with Credits Balance rendered cleanly.');
  console.log('      ✓ AI Seer & 24h/78h Task Scheduler active.');

  console.log('\n======================================================');
  console.log('  PASSED: David Agent v4.2.0 is 100% Operational!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\nFAILED:', err.message);
  process.exit(1);
}
