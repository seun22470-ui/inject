import { translateText } from './tools/translator.js';
import readline from 'readline';
import { skillsRegistry } from './skills.js';
import { executeCommand, executeCode } from './executor.js';
import { SUPPORTED_LANGUAGES, resolveLanguage } from './languages.js';
import { brainManager } from './brain.js';
import { davidSwarm, AGENT_PERSONAS } from './agents/swarm.js';
import { SkillPackManager, VALIDATED_SKILL_PACKS } from './skill_packs.js';
import { SelfHealingEngine } from './tools/self_healer.js';
import { serveLocalSite, publishToCloud } from './tools/publisher.js';
import { creditsManager } from './credits.js';
import { AISeerInspector, taskScheduler } from './tools/automator.js';

const c = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function banner() {
  const current = davidSwarm.getCurrentModel();
  const balance = creditsManager.getBalance().toLocaleString();
  console.log(`${c.cyan}${c.bold}
====================================================================
  DAVID AGENT v4.2.0 | Autonomous 4-Model Unified Intelligence
====================================================================${c.reset}`);
  console.log(`${c.green}${c.bold}Identity:${c.reset} David (Unified Agent)`);
  console.log(`${c.cyan}${c.bold}Active Model:${c.reset} [${current.name}] - ${current.modelTitle}`);
  console.log(`${c.yellow}${c.bold}Credits Balance:${c.reset} ${balance} credits | Tier: ${creditsManager.getTier()}`);
  console.log(`${c.dim}Internal Models: ${c.yellow}INJECT${c.dim} | ${c.yellow}CODE REVIEWER${c.dim} | ${c.yellow}ACCUMULATE${c.dim} | ${c.yellow}DIGEST${c.reset}`);
  console.log(`${c.dim}AI Capabilities: ${c.green}AI Seer DOM Inspector${c.dim}, ${c.green}24h/78h Task Scheduler${c.dim}, ${c.green}Self-Healing${c.reset}`);
  console.log(`${c.dim}Commands: ${c.yellow}/model <name>${c.dim}, ${c.yellow}/credits${c.dim}, ${c.yellow}/seer <url>${c.dim}, ${c.yellow}/automate <task> for <time>${c.dim}, ${c.yellow}/tasks${c.dim}, ${c.yellow}/help${c.reset}\n`);
}

function getPromptStr() {
  const model = davidSwarm.getCurrentModel().name;
  const bal = creditsManager.getBalance().toLocaleString();
  return `${c.magenta}${c.bold}David [${model} | ${bal}cr]> ${c.reset}`;
}

export async function startAgent() {
  await brainManager.init();
  await skillsRegistry.loadCustomSkills();
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.setPrompt(getPromptStr());
    rl.prompt();
  };

  promptUser();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      promptUser();
      return;
    }

    if (input === '/exit' || input === 'exit') {
      console.log(`${c.yellow}Exiting David agent session. Goodbye!${c.reset}`);
      process.exit(0);
    }

    // Credits
    if (input === '/credits' || input.startsWith('/credits ')) {
      const parts = input.split(' ').filter(Boolean);
      if (parts[1] === 'add' && parts[2]) {
        const added = creditsManager.add(Number(parts[2]), 'User top-up');
        console.log(`\n${c.green}${c.bold}✓ Added ${Number(parts[2]).toLocaleString()} credits!${c.reset} (New balance: ${added.balance.toLocaleString()} credits)\n`);
      } else {
        console.log(`\n${c.bold}=== DAVID CREDITS WALLET ===${c.reset}`);
        console.log(creditsManager.formatSummary());
        console.log(`\n${c.dim}Recent Transactions:${c.reset}`);
        for (const tx of creditsManager.getHistory(5)) {
          console.log(`  [${tx.model}] ${tx.type === 'ADD' ? '+' : '-'}${tx.amount} cr: ${tx.reason}`);
        }
        console.log(`\n${c.dim}Top-up: ${c.yellow}/credits add <amount>${c.reset}\n`);
      }
      promptUser();
      return;
    }

    // /seer <url> - AI Seer Vision & Invisible Elements Inspector
    if (input.startsWith('/seer ') || input.startsWith('seer ')) {
      const targetUrl = input.replace(/^(\/?seer)\s+/i, '').trim();
      const deduct = creditsManager.deduct(20, `AI Seer inspection: ${targetUrl}`, 'ACCUMULATE');
      if (!deduct.success) {
        console.log(`${c.red}${deduct.error}${c.reset}`);
        promptUser();
        return;
      }
      console.log(`\n${c.cyan}${c.bold}[David AI Seer]: Inspecting DOM & hidden structures for ${targetUrl}...${c.reset}`);
      try {
        const report = await AISeerInspector.inspectPage(targetUrl);
        console.log(`\n${c.green}${c.bold}=== AI SEER INSPECTION REPORT ===${c.reset}`);
        console.log(`Title: ${report.title}`);
        console.log(`Interactive Links Found: ${report.interactive.linksCount}`);
        console.log(`Interactive Forms Detected: ${report.forms.length}`);
        console.log(`\n${c.yellow}Invisible / Hidden Elements:${c.reset}`);
        console.log(`  • Hidden Form Inputs: ${report.aiSeer.hiddenInputsCount}`);
        console.log(`  • Hidden CSS Containers (display:none): ${report.aiSeer.hiddenContainersCount}`);
        console.log(`  • Structured JSON-LD Data Tokens: ${report.aiSeer.structuredDataTokens}`);
        if (report.aiSeer.hiddenContainers.length > 0) {
          console.log(`\n${c.dim}Preview of Hidden Containers:${c.reset}`);
          report.aiSeer.hiddenContainers.slice(0, 3).forEach((h, i) => {
            console.log(`  [${i+1}] <${h.tag}>: "${h.preview}..."`);
          });
        }
      } catch (err) {
        console.error(`${c.red}AI Seer failed: ${err.message}${c.reset}`);
      }
      promptUser();
      return;
    }

    // /automate <task> for <time> (e.g. 24hrs, 78hrs)
    if (input.startsWith('/automate ') || input.startsWith('automate ')) {
      const match = input.match(/^\/?automate\s+(.+?)\s+for\s+(\d+\w+)(?:\s+interval\s+(\d+))?/i);
      if (!match) {
        console.log(`${c.yellow}Usage: /automate <task description> for <24hrs|78hrs|30m> [interval <seconds>]${c.reset}`);
        promptUser();
        return;
      }
      const taskName = match[1];
      const duration = match[2];
      const intervalSec = Number(match[3]) || 60;
      const deduct = creditsManager.deduct(50, `Scheduled automation: ${taskName} for ${duration}`, 'INJECT');
      if (!deduct.success) {
        console.log(`${c.red}${deduct.error}${c.reset}`);
        promptUser();
        return;
      }

      const scheduled = taskScheduler.startTask({
        name: taskName,
        durationStr: duration,
        intervalSeconds: intervalSec,
        taskFn: async ({ tick, elapsedMs, remainingMs }) => {
          const remHours = (remainingMs / (3600 * 1000)).toFixed(1);
          console.log(`\n${c.cyan}[David Automation Heartbeat]: '${taskName}' tick #${tick} running. Remaining time: ${remHours} hrs${c.reset}`);
        }
      });

      console.log(`\n${c.green}${c.bold}✓ Automation Scheduled!${c.reset}`);
      console.log(`Task ID: ${scheduled.id}`);
      console.log(`Target: ${scheduled.name} for ${scheduled.durationStr}`);
      console.log(`Scheduled Completion: ${scheduled.expectedEndTime}`);
      console.log(`${c.dim}Check active runs with: ${c.yellow}/tasks${c.reset}\n`);
      promptUser();
      return;
    }

    // /tasks
    if (input === '/tasks' || input === 'tasks') {
      const list = taskScheduler.listTasks();
      console.log(`\n${c.bold}=== DAVID RUNNING AUTOMATION TASKS ===${c.reset}`);
      if (list.length === 0) {
        console.log(`${c.dim}No active automation tasks running.${c.reset}`);
      } else {
        list.forEach(t => {
          console.log(`  ${c.cyan}${t.id}${c.reset} | ${t.name} (${t.status})`);
          console.log(`    Duration: ${t.durationStr} | Ticks: ${t.ticks} | Ends: ${t.expectedEndTime}`);
        });
      }
      console.log('');
      promptUser();
      return;
    }

    // /model <name>
    if (input.startsWith('/model ') || input.startsWith('model ')) {
      const target = input.replace(/^(\/?model)\s+/i, '').trim();
      const next = davidSwarm.setActive(target);
      console.log(`\n${c.green}${c.bold}David switched active model to [${next.name}]${c.reset}`);
      console.log(`${c.dim}${next.modelTitle} - ${next.role}${c.reset}\n`);
      promptUser();
      return;
    }

    // /models
    if (input === '/models' || input === 'models') {
      console.log(`\n${c.bold}=== DAVID'S 4 INTERNAL MODELS ===${c.reset}`);
      for (const m of davidSwarm.getAllModels()) {
        const activeMarker = m.name === davidSwarm.getCurrentModel().name ? `${c.green}(ACTIVE)${c.reset}` : '';
        console.log(`  ${c.cyan}${m.name.padEnd(16)}${c.reset} ${activeMarker}`);
        console.log(`    ${c.bold}${m.modelTitle}${c.reset}`);
        console.log(`    ${c.dim}${m.role} [Cost: ${m.costPerRun} cr]${c.reset}`);
      }
      console.log('');
      promptUser();
      return;
    }

    // /heal <code>
    if (input.startsWith('/heal ') || input.startsWith('heal ')) {
      const codeSnippet = input.replace(/^(\/?heal)\s+/i, '').trim();
      creditsManager.deduct(30, 'Self-healing run', 'CODE REVIEWER');
      console.log(`${c.cyan}[David - Model CODE REVIEWER]: Running self-healing loop...${c.reset}`);
      try {
        const result = await SelfHealingEngine.runWithSelfCorrection({ code: codeSnippet, language: 'javascript' });
        console.log(`\n${c.green}${c.bold}Status: ${result.success ? 'RESOLVED' : 'UNRESOLVED'}${c.reset}`);
        if (result.output) console.log(result.output);
      } catch (e) {
        console.error(`${c.red}Error: ${e.message}${c.reset}`);
      }
      promptUser();
      return;
    }

    // /packs
    if (input === '/packs' || input.startsWith('/packs ')) {
      console.log(`\n${c.bold}=== VALIDATED INSTALLABLE SKILL PACKS ===${c.reset}`);
      const packs = Object.entries(VALIDATED_SKILL_PACKS).map(([id, p]) => ({ id, ...p }));
      packs.forEach(p => {
        console.log(`  ${c.cyan}${p.id.padEnd(20)}${c.reset} : ${p.name}`);
        console.log(`    ${c.dim}${p.description}${c.reset}`);
      });
      console.log(`\n${c.dim}Install: ${c.yellow}/pack install <id>${c.reset}\n`);
      promptUser();
      return;
    }

    // /help
    if (input === '/help' || input === 'help') {
      console.log(`\n${c.bold}=== DAVID COMMANDS ===${c.reset}
  ${c.yellow}/model <name>${c.reset}                : Switch internal model (inject, reviewer, accumulate, digest)
  ${c.yellow}/models${c.reset}                      : View all 4 internal models
  ${c.yellow}/credits${c.reset}                     : View credits wallet and balance
  ${c.yellow}/credits add <amount>${c.reset}        : Top up credits
  ${c.yellow}/seer <url>${c.reset}                  : AI Seer vision: inspect visible & invisible elements, forms & tokens
  ${c.yellow}/automate <task> for <time>${c.reset} : Schedule long-running automation (e.g. for 24hrs or 78hrs)
  ${c.yellow}/tasks${c.reset}                       : View all active long-running automation tasks
  ${c.yellow}/heal <code>${c.reset}                 : Execute code through self-healing loop
  ${c.yellow}/packs${c.reset}                       : List installable skill packs
  ${c.yellow}/serve [dir] [port]${c.reset}          : Launch preview HTTP server
  ${c.yellow}/skills${c.reset}                      : Complete skills matrix
  ${c.yellow}/exit${c.reset}                        : Exit session\n`);
      promptUser();
      return;
    }

        // /translate <text> to <language>
    if (input.startsWith('/translate ') || input.startsWith('translate ')) {
      const match = input.match(/^\/?translate\s+(.+?)\s+to\s+([a-zA-Z\-_]+)$/i);
      if (!match) {
        console.log(`${c.yellow}Usage: /translate <text> to <language> (e.g. /translate Hello world to Spanish)${c.reset}`);
        promptUser();
        return;
      }
      const textToTranslate = match[1];
      const targetLang = match[2];
      creditsManager.deduct(5, `Translate text to ${targetLang}`, 'DIGEST');
      console.log(`${c.cyan}[David Translation]: Translating to ${targetLang}...${c.reset}`);
      const trResult = await translateText(textToTranslate, targetLang);
      if (trResult.success) {
        console.log(`\n${c.green}${c.bold}Translation (${targetLang}):${c.reset} ${trResult.translatedText}\n`);
      } else {
        console.log(`\n${c.red}Translation error: ${trResult.error}${c.reset}\n`);
      }
      promptUser();
      return;
    }

    // Default instruction execution
    const currentModel = davidSwarm.getCurrentModel();
    creditsManager.deduct(currentModel.costPerRun, input.substring(0, 25), currentModel.name);
    console.log(`${c.cyan}[David - Model ${currentModel.name}]: Executing task...${c.reset}`);
    const brainRes = await brainManager.processPrompt(input);
    if (brainRes.mode === 'llm') {
      console.log(`\n${brainRes.text}\n`);
    } else {
      console.log(`\n${c.green}David Executed:${c.reset} ${brainRes.summary || input}`);
    }
    promptUser();
  });
}
