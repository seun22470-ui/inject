import readline from 'readline';
import { skillsRegistry } from './skills.js';
import { executeCommand, executeCode } from './executor.js';
import { SUPPORTED_LANGUAGES, resolveLanguage } from './languages.js';
import { brainManager } from './brain.js';

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
  const brainInfo = brainManager.getActiveBrainInfo();
  const allSkills = skillsRegistry.list();
  console.log(`${c.cyan}${c.bold}
====================================================================
  INJECT TERMINAL AGENT v2.9 | 75 Advanced Autonomous Brain Skills
====================================================================${c.reset}`);
  console.log(`${c.dim}Runtime Matrix: 75 Registered Skills across Thinking, Research, Writing, Debugging, Automation${c.reset}`);
  console.log(`${c.dim}Brain Engine: ${brainInfo.info}${c.reset}`);
  console.log(`${c.dim}Commands: ${c.yellow}/skills${c.dim}, ${c.yellow}/build <prompt>${c.dim}, ${c.yellow}/skill install <name> <code>${c.dim}, ${c.yellow}/key <provider> <key>${c.dim}, ${c.yellow}/run <lang> <code>${c.reset}\n`);
}

export async function startAgent() {
  await brainManager.init();
  await skillsRegistry.loadCustomSkills();
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${c.magenta}${c.bold}agent[v2.9]> ${c.reset}`
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '/exit' || input === 'exit') {
      console.log(`${c.yellow}Exiting agent session. Goodbye!${c.reset}`);
      process.exit(0);
    }

    if (input === '/skills' || input === '/help' || input === 'help') {
      const grouped = skillsRegistry.getByCategory();
      console.log(`\n${c.bold}=== 75 CORE SKILLS MATRIX (v2.9) ===${c.reset}`);
      let index = 1;
      for (const [cat, skills] of Object.entries(grouped)) {
        console.log(`\n${c.cyan}${c.bold}[${cat.toUpperCase()}]${c.reset}`);
        for (const s of skills) {
          const typeTag = s.type === 'custom' ? `${c.magenta}[CUSTOM]${c.reset}` : '';
          console.log(`  ${c.green}${String(index++).padStart(2, ' ')}. ${s.name.padEnd(28)}${c.reset} ${typeTag}: ${s.description}`);
        }
      }

      console.log(`\n${c.bold}Agent Command Shortcuts:${c.reset}`);
      console.log(`  ${c.cyan}/build <prompt>${c.reset}              : Scaffolds project files, executes tests, reports errors`);
      console.log(`  ${c.cyan}/skill install <name> <code>${c.reset} : Installs custom dynamic skill`);
      console.log(`  ${c.cyan}/key <provider> <key>${c.reset}       : Optional API key (Opus, GPT) to boost thinking`);
      console.log(`  ${c.cyan}/run <lang> <code>${c.reset}           : Multi-language runner (Python, Node, TS, Go, Rust, C, C++, PHP)`);
      console.log(`  ${c.cyan}/py <code> | /js <code> | /go <code> | /rust <code> | /c <code> | /ps <code>${c.reset}\n`);
      rl.prompt();
      return;
    }

    // Natural Key Setter (e.g. "this key is opus: sk-ant-..." or "/key opus sk-ant-...")
    const keyMatch = input.match(/^(?:\/key|key\s+is|this\s+key\s+is|use\s+key)\s+([a-zA-Z0-9_-]+)[:\s]+([a-zA-Z0-9_.-]+)/i);
    if (keyMatch) {
      const provider = keyMatch[1];
      const keyVal = keyMatch[2];
      await brainManager.setKey(provider, keyVal);
      console.log(`${c.green}${c.bold}Brain key registered for ${provider.toUpperCase()}!${c.reset}`);
      console.log(`${c.dim}Optional cloud reasoning boosted. Agent operates 100% autonomously offline when key is omitted.${c.reset}`);
      rl.prompt();
      return;
    }

    // Install dynamic skill: /skill install <name> <code>
    if (input.startsWith('/skill install ') || input.startsWith('install skill ')) {
      const payload = input.replace(/^(\/skill install|install skill)\s+/i, '').trim();
      const firstSpace = payload.indexOf(' ');
      if (firstSpace === -1) {
        console.log(`${c.red}Usage: /skill install <skill_name> <javascript_code>${c.reset}`);
        rl.prompt();
        return;
      }
      const skillName = payload.slice(0, firstSpace).trim();
      const skillCode = payload.slice(firstSpace).trim();
      const res = await skillsRegistry.installSkill({ name: skillName, code: skillCode });
      console.log(`${c.green}${res.message}${c.reset}`);
      rl.prompt();
      return;
    }

    // /build <prompt>
    if (input.startsWith('/build ') || input.startsWith('build ')) {
      const promptText = input.replace(/^\/?build\s+/i, '').trim();
      console.log(`${c.cyan}[v2.9 Scaffolding Engine]: "${promptText}"...${c.reset}`);

      const builder = skillsRegistry.get('build_project');
      const res = await builder.handler({ prompt: promptText });
      if (res.success) {
        console.log(`${c.green}${c.bold}Project successfully scaffolded and verified!${c.reset}`);
        console.log(`Workspace: ${c.dim}${res.workspacePath}${c.reset}`);
        console.log(`Files created: ${res.generatedFiles.join(', ')}`);
        if (res.errors.length > 0) {
          console.log(`${c.yellow}Runtime feedback/warnings:${c.reset}`);
          console.log(JSON.stringify(res.errors, null, 2));
        } else {
          console.log(`${c.green}Zero errors encountered during code execution verification.${c.reset}`);
        }
      } else {
        console.log(`${c.red}${c.bold}Execution verification detected errors:${c.reset}`);
        console.log(JSON.stringify(res.errors, null, 2));
      }
      rl.prompt();
      return;
    }

    // Dynamic execution via /run <lang> <code> OR /run <code>
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

    // Language shorthands
    const langAliases = {
      '/py': 'python',
      '/python': 'python',
      '/js': 'javascript',
      '/node': 'javascript',
      '/ts': 'typescript',
      '/go': 'go',
      '/rust': 'rust',
      '/rs': 'rust',
      '/c': 'c',
      '/cpp': 'cpp',
      '/c++': 'cpp',
      '/ruby': 'ruby',
      '/rb': 'ruby',
      '/php': 'php',
      '/java': 'java',
      '/bash': 'bash',
      '/sh': 'bash',
      '/ps': 'powershell'
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

    // Code blocks pasted
    if (input.startsWith('```')) {
      console.log(`${c.dim}[Detected Code Block, auto-executing]...${c.reset}`);
      const res = await executeCode({ code: input });
      displayCodeResult(res);
      rl.prompt();
      return;
    }

    // Web Search
    if (input.startsWith('/search ')) {
      const q = input.slice(8).trim();
      console.log(`${c.cyan}[Searching web]: ${q}...${c.reset}`);
      const res = await skillsRegistry.get('web_searcher').handler({ query: q, limit: 5 });
      res.forEach((r, i) => {
        console.log(`\n${c.green}[${i+1}] ${r.title}${c.reset}`);
        if (r.url) console.log(`    ${c.dim}${r.url}${c.reset}`);
        console.log(`    ${r.snippet}`);
      });
      console.log('');
      rl.prompt();
      return;
    }

    // Shell command
    if (input.startsWith('/exec ')) {
      const cmd = input.slice(6).trim();
      console.log(`${c.dim}[Running in PowerShell/Shell]: ${cmd}${c.reset}`);
      const res = await executeCommand(cmd);
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(`${c.red}${res.stderr}${c.reset}`);
      rl.prompt();
      return;
    }

    // Package managers
    const lower = input.toLowerCase();
    if (lower.startsWith('npm install ') || lower.startsWith('install npm ')) {
      const pkg = input.replace(/^(npm install|install npm)\s+/i, '').trim();
      console.log(`${c.cyan}[Installing NPM package]: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('package_installer').handler({ manager: 'npm', packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    if (lower.startsWith('pip install ') || lower.startsWith('install pip ')) {
      const pkg = input.replace(/^(pip install|install pip)\s+/i, '').trim();
      console.log(`${c.cyan}[Installing Python package]: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('package_installer').handler({ manager: 'pip', packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    // Direct skill invocation by ID or name
    const words = input.split(' ');
    const potentialSkill = skillsRegistry.get(words[0]);
    if (potentialSkill) {
      console.log(`${c.cyan}[Invoking Skill]: ${potentialSkill.name}${c.reset}`);
      const payload = input.slice(words[0].length).trim();
      try {
        const res = await potentialSkill.handler({ prompt: payload, task: payload, query: payload });
        console.log(JSON.stringify(res, null, 2));
      } catch (e) {
        console.error(`${c.red}Skill error: ${e.message}${c.reset}`);
      }
      rl.prompt();
      return;
    }

    // Auto-code detection
    if (/^(print\(|console\.log\(|def\s+|function\s+|const\s+|let\s+|package\s+main|#include|fn\s+main)/.test(input)) {
      console.log(`${c.dim}[Auto-detected code snippet, running]...${c.reset}`);
      const res = await executeCode({ code: input });
      displayCodeResult(res);
      rl.prompt();
      return;
    }

    console.log(`${c.yellow}[v2.9 Engine]:${c.reset} ${input}`);
    console.log(`${c.dim}Type ${c.yellow}/skills${c.dim} to see all 75 skills, ${c.yellow}/build <prompt>${c.dim} to generate apps, or ${c.yellow}/help${c.reset}`);
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
