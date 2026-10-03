import readline from 'readline';
import { skillsRegistry } from './skills.js';
import { executeCommand } from './executor.js';

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
  console.log(`${c.cyan}${c.bold}
====================================================================
  INJECT TERMINAL AGENT | Autonomous PowerShell & Coding Brain
====================================================================${c.reset}`);
  console.log(`${c.dim}Loaded Skills: Web Search, Site Inspector, Extractor, Shell Exec, Code Runner${c.reset}`);
  console.log(`${c.dim}Commands: ${c.yellow}/help${c.dim}, ${c.yellow}/search <query>${c.dim}, ${c.yellow}/inspect <url>${c.dim}, ${c.yellow}/exec <cmd>${c.dim}, ${c.yellow}/exit${c.reset}\n`);
}

export async function startAgent() {
  banner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${c.magenta}${c.bold}agent> ${c.reset}`
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

    if (input === '/help' || input === 'help') {
      console.log(`\n${c.bold}Active Agent Skills & Commands:${c.reset}`);
      skillsRegistry.list().forEach(s => {
        console.log(`  ${c.green}${s.name.padEnd(14)}${c.reset} : ${s.description}`);
      });
      console.log(`\n  ${c.cyan}/search <query>${c.reset}   : Search the live web`);
      console.log(`  ${c.cyan}/inspect <url>${c.reset}    : Inspect website framework and tech stack`);
      console.log(`  ${c.cyan}/extract <url>${c.reset}    : Extract headings, text and content from a page`);
      console.log(`  ${c.cyan}/exec <cmd>${c.reset}       : Execute PowerShell or shell command`);
      console.log(`  ${c.cyan}/exit${c.reset}             : Exit the agent\n`);
      rl.prompt();
      return;
    }

    if (input.startsWith('/search ')) {
      const q = input.slice(8).trim();
      console.log(`${c.cyan}[Searching web]: ${q}...${c.reset}`);
      const res = await skillsRegistry.get('search').handler({ query: q, limit: 5 });
      res.forEach((r, i) => {
        console.log(`\n${c.green}[${i+1}] ${r.title}${c.reset}`);
        if (r.url) console.log(`    ${c.dim}${r.url}${c.reset}`);
        console.log(`    ${r.snippet}`);
      });
      console.log('');
      rl.prompt();
      return;
    }

    if (input.startsWith('/inspect ')) {
      const url = input.slice(9).trim();
      console.log(`${c.cyan}[Inspecting website tech]: ${url}...${c.reset}`);
      const res = await skillsRegistry.get('inspect').handler({ url });
      console.log(JSON.stringify(res, null, 2));
      rl.prompt();
      return;
    }

    if (input.startsWith('/extract ')) {
      const url = input.slice(9).trim();
      console.log(`${c.cyan}[Extracting page content]: ${url}...${c.reset}`);
      const res = await skillsRegistry.get('extract').handler({ url });
      console.log(JSON.stringify(res, null, 2));
      rl.prompt();
      return;
    }

    if (input.startsWith('/exec ')) {
      const cmd = input.slice(6).trim();
      console.log(`${c.dim}[Running in PowerShell]: ${cmd}${c.reset}`);
      const res = await executeCommand(cmd);
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(`${c.red}${res.stderr}${c.reset}`);
      rl.prompt();
      return;
    }

    // Direct install prompts
    const lower = input.toLowerCase();
    if (lower.startsWith('npm install ') || lower.startsWith('install npm ')) {
      const pkg = input.replace(/^(npm install|install npm)\s+/i, '').trim();
      console.log(`${c.cyan}[Action] Installing Node packages: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('install_npm').handler({ packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    if (lower.startsWith('pip install ') || lower.startsWith('install pip ')) {
      const pkg = input.replace(/^(pip install|install pip)\s+/i, '').trim();
      console.log(`${c.cyan}[Action] Installing Python packages: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('install_pip').handler({ packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    // Default intent fallback
    console.log(`${c.yellow}[Agent Input]:${c.reset} ${input}`);
    console.log(`${c.dim}Tip: Type ${c.yellow}/help${c.dim} for skills, or use ${c.cyan}/search <query>${c.dim}, ${c.cyan}/exec <cmd>${c.reset}`);
    rl.prompt();
  });
}
