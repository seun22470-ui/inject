import readline from 'readline';
import { skillsRegistry } from './skills.js';
import { executeCommand, executeCode } from './executor.js';
import { SUPPORTED_LANGUAGES, resolveLanguage } from './languages.js';
import { brainManager } from './brain.js';
import { agentSwarm, AGENT_PERSONAS } from './agents/swarm.js';
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
  const current = agentSwarm.getCurrentAgent();
  console.log(`${c.cyan}${c.bold}
====================================================================
  INJECT TERMINAL AGENT v4.1.49 | 4-Agent Autonomous Swarm
====================================================================${c.reset}`);
  console.log(`${c.green}${c.bold}Active Agent:${c.reset} [${current.name}] - ${current.title}`);
  console.log(`${c.dim}Agents: ${c.yellow}INJECT${c.dim} (Commander) | ${c.yellow}CODE REVIEWER${c.dim} (Self-Healing) | ${c.yellow}ACCUMULATE${c.dim} (Packs & Web) | ${c.yellow}DIGEST${c.dim} (Memory)${c.reset}`);
  console.log(`${c.dim}Commands: ${c.yellow}/agent <name>${c.dim}, ${c.yellow}/packs${c.dim}, ${c.yellow}/heal <code>${c.dim}, ${c.yellow}/serve${c.dim}, ${c.yellow}/skills${c.dim}, ${c.yellow}/help${c.reset}\n`);
}

export async function startAgent() {
  await brainManager.init();
  await skillsRegistry.loadCustomSkills();
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: () => `${c.magenta}${c.bold}${agentSwarm.getCurrentAgent().name.toLowerCase()}> ${c.reset}`
  });

  rl.setPrompt(`${c.magenta}${c.bold}${agentSwarm.getCurrentAgent().name.toLowerCase()}> ${c.reset}`);
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '/exit' || input === 'exit') {
      console.log(`${c.yellow}Exiting v4.1.49 multi-agent session. Goodbye!${c.reset}`);
      process.exit(0);
    }

    // Switch between the 4 agents
    if (input.startsWith('/agent ') || input.startsWith('agent ')) {
      const target = input.replace(/^\/?agent\s+/i, '').trim();
      const next = agentSwarm.setActive(target);
      console.log(`\n${c.green}${c.bold}Switched Active Persona to [${next.name}]${c.reset}`);
      console.log(`${c.dim}Role: ${next.role}${c.reset}\n`);
      rl.setPrompt(`${c.magenta}${c.bold}${next.name.toLowerCase()}> ${c.reset}`);
      rl.prompt();
      return;
    }

    // /packs - Searchable skill packs
    if (input === '/packs' || input.startsWith('/packs ') || input.startsWith('/pack ')) {
      const q = input.replace(/^\/packs?\s*/i, '').trim();
      console.log(`\n${c.bold}=== VALIDATED INSTALLABLE SKILL PACKS ===${c.reset}`);
      const packs = q ? SkillPackManager.searchPacks(q) : Object.entries(VALIDATED_SKILL_PACKS).map(([id, p]) => ({ id, ...p }));
      packs.forEach(p => {
        console.log(`  ${c.cyan}${p.id.padEnd(20)}${c.reset} : ${p.name}`);
        console.log(`    ${c.dim}${p.description}${c.reset}`);
        console.log(`    ${c.green}Skills: ${p.skills.map(s => s.name).join(', ')}${c.reset}`);
      });
      console.log(`\n${c.dim}To install a pack, type: ${c.yellow}/pack install <id>${c.dim} (e.g. /pack install devops-cloud)${c.reset}\n`);
      rl.prompt();
      return;
    }

    // /pack install <id>
    if (input.startsWith('/pack install ') || input.startsWith('/install-pack ')) {
      const packId = input.replace(/^(\/?pack install|\/?install-pack)\s+/i, '').trim();
      console.log(`${c.cyan}[ACCUMULATE Agent]: Installing skill pack '${packId}'...${c.reset}`);
      try {
        const res = await SkillPackManager.installPack(packId, skillsRegistry);
        console.log(`${c.green}${c.bold}Skill Pack '${res.pack}' successfully installed!${c.reset}`);
        console.log(`Skills registered: ${res.installedSkills.join(', ')}`);
      } catch (e) {
        console.error(`${c.red}Installation failed: ${e.message}${c.reset}`);
      }
      rl.prompt();
      return;
    }

    // /heal <code> - Autonomous Self-Healing Execution (Code Reviewer)
    if (input.startsWith('/heal ') || input.startsWith('heal ')) {
      const code = input.replace(/^\/?heal\s+/i, '').trim();
      console.log(`${c.cyan}[CODE REVIEWER Agent]: Running with automated error detection & self-healing...${c.reset}`);
      const res = await SelfHealingEngine.runWithSelfCorrection({ code });
      if (res.success) {
        console.log(`${c.green}${c.bold}Execution succeeded after ${res.attemptsRequired} attempt(s)!${c.reset}`);
        if (res.output) console.log(res.output);
        if (res.attemptsRequired > 1) {
          console.log(`${c.yellow}[Self-Healing Fix Applied]:${c.reset}\n${res.finalCode}`);
        }
      } else {
        console.log(`${c.red}${c.bold}Self-correction failed after ${res.attemptsRequired} attempts:${c.reset} ${res.error}`);
      }
      rl.prompt();
      return;
    }

    // /serve [dir] [port] - Local Web Server
    if (input.startsWith('/serve')) {
      const parts = input.split(' ');
      const dir = parts[1] || './generated-app';
      const port = parseInt(parts[2] || '5000', 10);
      console.log(`${c.cyan}[INJECT Agent]: Starting embedded local web server...${c.reset}`);
      const res = await serveLocalSite({ dir, port });
      console.log(`${c.green}${c.bold}${res.message}${c.reset}`);
      rl.prompt();
      return;
    }

    // /publish [dir] [provider]
    if (input.startsWith('/publish')) {
      const parts = input.split(' ');
      const dir = parts[1] || './generated-app';
      const provider = parts[2] || 'vercel';
      console.log(`${c.cyan}[INJECT Agent]: Publishing to cloud via ${provider}...${c.reset}`);
      const res = await publishToCloud({ dir, provider });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    // /skills or /help
    if (input === '/skills' || input === '/help' || input === 'help') {
      const grouped = skillsRegistry.getByCategory();
      console.log(`\n${c.bold}=== INJECT v4.1.49 CAPABILITY MATRIX ===${c.reset}`);
      console.log(`\n${c.magenta}${c.bold}[4 DEDICATED SUB-AGENTS]${c.reset}`);
      Object.values(AGENT_PERSONAS).forEach(a => {
        console.log(`  ${c.green}${a.name.padEnd(16)}${c.reset} : ${a.title} - ${a.role}`);
      });

      console.log(`\n${c.magenta}${c.bold}[SEARCHABLE SKILL PACKS]${c.reset}`);
      Object.keys(VALIDATED_SKILL_PACKS).forEach(p => {
        console.log(`  ${c.cyan}${p.padEnd(18)}${c.reset} : ${VALIDATED_SKILL_PACKS[p].name}`);
      });

      console.log(`\n${c.magenta}${c.bold}[CORE COMMANDS]${c.reset}`);
      console.log(`  ${c.cyan}/agent <name>${c.reset}          : Switch between INJECT, CODE REVIEWER, ACCUMULATE, DIGEST`);
      console.log(`  ${c.cyan}/packs [query]${c.reset}        : Search and view validated installable skill packs`);
      console.log(`  ${c.cyan}/pack install <id>${c.reset}    : Install validated pack without empty placeholders`);
      console.log(`  ${c.cyan}/heal <code>${c.reset}          : Auto error detection, self-correction, & testing loop`);
      console.log(`  ${c.cyan}/build <prompt>${c.reset}       : Scaffold project files, run, & report errors`);
      console.log(`  ${c.cyan}/serve [dir] [port]${c.reset}   : Launch built-in local web server`);
      console.log(`  ${c.cyan}/run <lang> <code>${c.reset}    : Multi-language runner`);
      console.log(`  ${c.cyan}/key <provider> <key>${c.reset} : Optional brain key (e.g. opus) to boost reasoning\n`);
      rl.prompt();
      return;
    }

    // Natural Key Setter (e.g. "this key is opus: sk-ant-...")
    const keyMatch = input.match(/^(?:\/key|key\s+is|this\s+key\s+is|use\s+key)\s+([a-zA-Z0-9_-]+)[:\s]+([a-zA-Z0-9_.-]+)/i);
    if (keyMatch) {
      const provider = keyMatch[1];
      const keyVal = keyMatch[2];
      await brainManager.setKey(provider, keyVal);
      console.log(`${c.green}${c.bold}Brain key registered for ${provider.toUpperCase()}!${c.reset}`);
      rl.prompt();
      return;
    }

    // /build <prompt>
    if (input.startsWith('/build ') || input.startsWith('build ')) {
      const promptText = input.replace(/^\/?build\s+/i, '').trim();
      console.log(`${c.cyan}[INJECT Agent]: Scaffolding "${promptText}"...${c.reset}`);
      const builder = skillsRegistry.get('build_project');
      const res = await builder.handler({ prompt: promptText });
      if (res.success) {
        console.log(`${c.green}${c.bold}Project successfully scaffolded and verified!${c.reset}`);
        console.log(`Workspace: ${res.workspacePath}`);
        console.log(`Files created: ${res.generatedFiles.join(', ')}`);
      } else {
        console.log(`${c.red}${c.bold}CODE REVIEWER detected errors:${c.reset}`);
        console.log(JSON.stringify(res.errors, null, 2));
      }
      rl.prompt();
      return;
    }

    // Dynamic execution via /run <lang> <code>
    if (input.startsWith('/run ') || input.startsWith('/run\n')) {
      const rest = input.slice(5).trim();
      const firstWord = rest.split(/\s+/)[0];
      const detectedLang = resolveLanguage(firstWord);

      let targetLang = null;
      let code = rest;

      if (detectedLang) {
        targetLang = detectedLang;
        code = rest.slice(firstWord.length).trim();
      }

      console.log(`${c.dim}[Running code${targetLang ? ` (${targetLang})` : ' (auto-detect)'}]...${c.reset}`);
      const res = await executeCode({ code, language: targetLang });
      displayCodeResult(res);
      rl.prompt();
      return;
    }

    // Shorthand language commands
    const langAliases = {
      '/py': 'python',
      '/python': 'python',
      '/js': 'javascript',
      '/node': 'javascript',
      '/ts': 'typescript',
      '/go': 'go',
      '/rust': 'rust',
      '/c': 'c',
      '/cpp': 'cpp',
      '/ruby': 'ruby',
      '/php': 'php',
      '/ps': 'powershell',
      '/bash': 'bash'
    };

    for (const [cmdPrefix, lang] of Object.entries(langAliases)) {
      if (input.startsWith(`${cmdPrefix} `) || input.startsWith(`${cmdPrefix}\n`)) {
        const code = input.slice(cmdPrefix.length).trim();
        console.log(`${c.dim}[Running in ${lang}]...${c.reset}`);
        const res = await executeCode({ code, language: lang });
        displayCodeResult(res);
        rl.prompt();
        return;
      }
    }

    // Auto-code detection
    if (/^(print\(|console\.log\(|def\s+|function\s+|const\s+|let\s+|package\s+main|#include|fn\s+main)/.test(input)) {
      console.log(`${c.dim}[Auto-detected code snippet, executing with self-healing]...${c.reset}`);
      const res = await SelfHealingEngine.runWithSelfCorrection({ code: input });
      if (res.success) {
        console.log(`${c.green}${c.bold}=== EXECUTION SUCCESS ===${c.reset}`);
        if (res.output) console.log(res.output);
      } else {
        console.log(`${c.red}${c.bold}=== EXECUTION FAILED ===${c.reset}`);
        console.error(res.error);
      }
      rl.prompt();
      return;
    }

    console.log(`${c.yellow}[${agentSwarm.getCurrentAgent().name}]:${c.reset} ${input}`);
    console.log(`${c.dim}Commands: ${c.yellow}/agent <name>${c.dim}, ${c.yellow}/packs${c.dim}, ${c.yellow}/heal <code>${c.dim}, ${c.yellow}/build <prompt>${c.dim}, or ${c.yellow}/help${c.reset}`);
    rl.prompt();
  });
}

function displayCodeResult(res) {
  const langTag = res.language ? `[${res.language.toUpperCase()}]` : '[OUTPUT]';
  if (res.success) {
    console.log(`${c.green}${c.bold}=== ${langTag} SUCCESS ===${c.reset}`);
    if (res.stdout) console.log(res.stdout);
    if (!res.stdout && !res.stderr) console.log(`${c.dim}(Execution completed cleanly with no output)${c.reset}`);
    if (res.stderr) console.log(`${c.yellow}${res.stderr}${c.reset}`);
  } else {
    console.log(`${c.red}${c.bold}=== ${langTag} FAILED (Exit Code ${res.exitCode || 1}) ===${c.reset}`);
    if (res.stdout) console.log(res.stdout);
    if (res.stderr) console.error(`${c.red}${res.stderr}${c.reset}`);
  }
}
