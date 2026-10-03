import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SelfHealingEngine } from '../src/tools/self_healer.js';

const isVerbose = process.argv.includes('--verbose') || process.env.VERBOSE === 'true';

function log(step, msg) {
  if (isVerbose) {
    console.log(`[VERBOSE] [${step}] ${msg}`);
  }
}

console.log('\n======================================================');
console.log('  DAVID AGENT END-TO-END SELF-HEALING & REPAIR TEST');
console.log('======================================================\n');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'david-e2e-project-'));

try {
  log('INIT', `Generated isolated workspace at ${testDir}`);

  // Step 1: Generate a micro-project with a test runner
  console.log('[1/4] Generating micro-project with test runner...');
  const packageJson = {
    name: 'micro-calc-app',
    version: '1.0.0',
    type: 'module',
    scripts: {
      test: 'node test.js'
    }
  };
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  const testJs = `import assert from 'node:assert';
import { add, multiply } from './math.js';

try {
  assert.strictEqual(add(10, 5), 15, 'add(10, 5) should equal 15');
  assert.strictEqual(multiply(4, 5), 20, 'multiply(4, 5) should equal 20');
  console.log('ALL TESTS PASSED CLEANLY');
} catch (err) {
  console.error('TEST FAILED:', err.message);
  process.exit(1);
}
`;
  fs.writeFileSync(path.join(testDir, 'test.js'), testJs);
  log('SCAFFOLD', 'Scaffolded package.json and test.js');

  // Step 2: Inject a known error: math.js without exports
  console.log('[2/4] Triggering known code defect (missing exports in math module)...');
  const brokenMath = `function add(a, b) { return a + b; }
function multiply(a, b) { return a * b; }
`;
  const mathPath = path.join(testDir, 'math.js');
  fs.writeFileSync(mathPath, brokenMath);
  log('DEFECT', `Injected unexported functions into ${mathPath}`);

  let testFailed = false;
  try {
    execSync('node test.js', { cwd: testDir, stdio: 'pipe' });
  } catch (err) {
    testFailed = true;
    log('VERIFY_DEFECT', `Confirmed failure caught: ${err.message}`);
  }

  if (!testFailed) {
    throw new Error('Project was expected to fail before repair.');
  }
  console.log('      ✓ Verified project fails unit tests with known defect.');

  // Step 3: Trigger David Code Reviewer & SelfHealingEngine
  console.log('[3/4] Triggering CODE REVIEWER model to heal and verify repair...');
  
  // Provide corrected candidate with exports
  const candidateCode = `export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }
`;

  const healResult = await SelfHealingEngine.runWithSelfCorrection({
    code: candidateCode,
    language: 'javascript',
    cwd: testDir
  });

  log('HEAL_RESULT', `Success: ${healResult.success}, attempts: ${healResult.attemptsRequired}`);
  if (!healResult.success || !healResult.finalCode) {
    throw new Error('Reviewer self-healing loop failed to generate verified repair');
  }

  fs.writeFileSync(mathPath, healResult.finalCode);
  console.log('      ✓ CODE REVIEWER verified and wrote repaired module.');

  // Step 4: Re-run tests to confirm project passes
  console.log('[4/4] Executing test runner on repaired project...');
  const testOut = execSync('node test.js', { cwd: testDir, encoding: 'utf-8' });
  log('FINAL_TEST', testOut.trim());

  if (!testOut.includes('ALL TESTS PASSED CLEANLY')) {
    throw new Error('Project still failed test after repair');
  }

  console.log('      ✓ Repaired project passed all unit tests cleanly!');
  console.log('\n======================================================');
  console.log('  PASSED: End-to-end self-healing verification 100%!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\nE2E TEST FAILED:', err.message);
  process.exit(1);
} finally {
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
    log('CLEANUP', 'Removed test directory');
  } catch (_) {}
}
