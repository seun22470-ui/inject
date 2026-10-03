import readline from 'readline';
import { skillsRegistry } from './skills.js';
import { executeCommand, executeCode } from './executor.js';
import { SUPPORTED_LANGUAGES, resolveLanguage } from './languages.js';
import { brainManager } from './brain.js';
import { davidSwarm, AGENT_PERSONAS } from './agents/swarm.js';
import { SkillPackManager, VALIDATED_SKILL_PACKS } from './skill_packs.js';
import { SelfHealingEngine } from './tools/self_healer.js';
import { serveLocalSite, publishToCloud } from './tools/publisher.js';

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
  console.log(`${c.cyan}${c.bold}
====================================================================
  DAVID AGENT v4.2.0 | Autonomous 4-Model Unified Intelligence
====================================================================${c.reset}`);
  console.log(`${c.green}${c.bold}General Name:${c.reset} David`);
  console.log(`${c.cyan}${c.bold}Active Model:${c.reset} [${current.name}] - ${current.modelTitle}`);
  console.log(`${c.dim}Internal Models: ${c.yellow}INJECT${c.dim} (Commander) | ${c.yellow}CODE REVIEWER${c.dim} (Self-Healing) | ${c.yellow}ACCUMULATE${c.dim} (Packs & Web) | ${c.yellow}DIGEST${c.dim} (Memory)${c.reset}`);
  console.log(`${c.dim}Commands: ${c.yellow}/model <name>${c.dim}, ${c.yellow}/models${c.dim}, ${c.yellow}/packs${c.dim}, ${c.yellow}/heal <code>${c.dim}, ${c.yellow}/serve${c.dim}, ${c.yellow}/skills${c.dim}, ${c.yellow}/help${c.reset}\n`);
}

function getPromptStr() {
  const model = davidSwarm.getCurrentModel().name;
  return `${c.magenta}${c.bold}David [${model}]> ${c.reset}`;
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

    // Switch between the 4 models
    if (input.startsWith('/model ') || input.startsWith('model ') || input.startsWith('/agent ') || input.startsWith('agent ')) {
      const target = input.replace(/^(\/?model|\/?agent)\s+/i, '').trim();
      const next = davidSwarm.setActive(target);
      console.log(`\n${c.green}${c.bold}David switched active model to [${next.name}]${c.reset}`);
      console.log(`${c.dim}Model Title: ${next.modelTitle}${c.reset}`);
      console.log(`${c.dim}Role: ${next.role}${c.reset}\n`);
      promptUser();
      return;
    }

    if (input === '/models' || input === '/agents') {
      console.log(`\n${c.bold}=== DAVID'S 4 INTERNAL MODELS ===${c.reset}`);
      for (const m of davidSwarm.getAllModels()) {
        const activeMarker = m.name === davidSwarm.getCurrentModel().name ? `${c.green}(ACTIVE)${c.reset}` : '';
        console.log(`  ${c.cyan}${m.name.padEnd(16)}${c.reset} ${activeMarker}`);
        console.log(`    ${c.bold}${m.modelTitle}${c.reset}`);
        console.log(`    ${c.dim}${m.role}${c.reset}`);
      }
      console.log(`\n${c.dim}Switch model: ${c.yellow}/model <name>${c.dim} (e.g. /model reviewer)${c.reset}\n`);
      promptUser();
      return;
    }

    // /packs - Searchable skill packs
    if (input === '/packs' || input.startsWith('/packs ') || input.startsWith('/pack ')) {
      const q = input.replace(/^\/packs?\s*/i, '').trim();
      if (!q.startsWith('install')) {
        console.log(`\n${c.bold}=== VALIDATED INSTALLABLE SKILL PACKS ===${c.reset}`);
        const packs = q ? SkillPackManager.searchPacks(q) : Object.entries(VALIDATED_SKILL_PACKS).map(([id, p]) => ({ id, ...p }));
        packs.forEach(p => {
          console.log(`  ${c.cyan}${p.id.padEnd(20)}${c.reset} : ${p.name}`);
          console.log(`    ${c.dim}${p.description}${c.reset}`);
          console.log(`    ${c.green}Skills: ${p.skills.map(s => s.name).join(', ')}${c.reset}`);
        });
        console.log(`\n${c.dim}To install a pack, type: ${c.yellow}/pack install <id>${c.dim} (e.g. /pack install devops-cloud)${c.reset}\n`);
        promptUser();
        return;
      }
    }

    // /pack install <id>
    if (input.startsWith('/pack install ') || input.startsWith('/install-pack ')) {
      const packId = input.replace(/^(\/?pack install|\/?install-pack)\s+/i, '').trim();
      console.log(`${c.cyan}[David - Model ACCUMULATE]: Installing skill pack '${packId}'...${c.reset}`);
      try {
        const res = await SkillPackManager.installPack(packId, skillsRegistry);
        console.log(`${c.green}${c.bold}Skill Pack '${res.pack}' successfully installed!${c.reset}`);
        console.log(`Skills registered: ${res.installedSkills.join(', ')}`);
      } catch (e) {
        console.error(`${c.red}Installation failed: ${e.message}${c.reset}`);
      }
      promptUser();
      return;
    }

    // /heal <code> - Autonomous Self-Healing Execution (Code Reviewer)
    if (input.startsWith('/heal ') || input.startsWith('heal ')) {
      const codeSnippet = input.replace(/^(\/?heal)\s+/i, '').trim();
      console.log(`${c.cyan}[David - Model CODE REVIEWER]: Initiating self-healing execution loop...${c.reset}`);
      try {
        const result = await SelfHealingEngine.runWithSelfCorrection({ code: codeSnippet, language: 'javascript' });
        console.log(`\n${result.success ? c.green : c.yellow}${c.bold}=== SELF-HEALING REPORT ===${c.reset}`);
        console.log(`Status: ${result.success ? 'RESOLVED & VERIFIED' : 'UNRESOLVED'}`);
        console.log(`Attempts: ${result.attempts}`);
        console.log(`Changes: ${result.fixesApplied.join(', ') || 'No patch needed'}`);
        if (result.stdout) console.log(`Output:\n${result.stdout}`);
      } catch (e) {
        console.error(`${c.red}Reviewer loop error: ${e.message}${c.reset}`);
      }
      promptUser();
      return;
    }

    // /skills
    if (input === '/skills' || input === 'skills') {
      console.log(`\n${c.bold}=== DAVID SKILLS MATRIX ===${c.reset}`);
      const list = skillsRegistry.list();
      list.slice(0, 30).forEach(s => {
        console.log(`  ${c.cyan}${s.name.padEnd(28)}${c.reset} : ${s.description}`);
      });
      if (list.length > 30) {
        console.log(`  ${c.dim}... and ${list.length - 30} more cataloged skills (total: ${list.length})${c.reset}`);
      }
      console.log(`\n${c.dim}Run skill: ${c.yellow}/skill <name> <jsonArgs>${c.reset}\n`);
      promptUser();
      return;
    }

    // /serve
    if (input.startsWith('/serve')) {
      const parts = input.split(' ');
      const dir = parts[1] || '.';
      const port = Number(parts[2]) || 5000;
      serveLocalSite(dir, port);
      promptUser();
      return;
    }

    // /help
    if (input === '/help' || input === 'help') {
      console.log(`\n${c.bold}=== DAVID AGENT COMMANDS ===${c.reset}
  ${c.yellow}David Unified Identity${c.reset} : Combines 4 internal models into one system.
  ${c.yellow}/model <name>${c.reset}          : Switch model (inject, reviewer, accumulate, digest)
  ${c.yellow}/models${c.reset}                : View all 4 models and their capabilities
  ${c.yellow}/packs [query]${c.reset}         : Search installable validated skill packs
  ${c.yellow}/pack install <id>${c.reset}     : Install skill pack into David's active registry
  ${c.yellow}/heal <code>${c.reset}           : Execute code through self-healing loop
  ${c.yellow}/serve [dir] [port]${c.reset}    : Launch local HTTP server preview
  ${c.yellow}/skills${c.reset}                : List all available skills
  ${c.yellow}/run <cmd>${c.reset}             : Run shell or terminal command
  ${c.yellow}/exit${c.reset}                  : Exit session\n`);
      promptUser();
      return;
    }

    // Default prompt handling with David
    const currentModel = davidSwarm.getCurrentModel();
    console.log(`${c.cyan}[David - Model ${currentModel.name}]: Executing instruction...${c.reset}`);
    const brainRes = await brainManager.processPrompt(input);
    if (brainRes.mode === 'llm') {
      console.log(`\n${brainRes.text}\n`);
    } else {
      console.log(`\n${c.green}David Result:${c.reset} ${brainRes.summary || input}`);
    }
    promptUser();
  });
}
