import readline from 'readline';
import { skillsRegistry } from './skills.js';
import { executeCommand, executeCode } from './executor.js';
import { SUPPORTED_LANGUAGES, resolveLanguage } from './languages.js';

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
  INJECT TERMINAL AGENT | Universal Scaffolder & Multi-Language Runtime
====================================================================${c.reset}`);
  console.log(`${c.dim}Capabilities: Project Generation, Error Reporting, Dynamic Multi-Lang Execution${c.reset}`);
  console.log(`${c.dim}Commands:${c.reset}`);
  console.log(`  ${c.yellow}/build <prompt>${c.dim}        : Scaffold project files, run in workspace, report errors`);
  console.log(`  ${c.yellow}/run <lang> <code>${c.dim}    : Execute code snippet dynamically`);
  console.log(`  ${c.yellow}/py <code>${c.dim}            : Run Python code directly`);
  console.log(`  ${c.yellow}/js <code>${c.dim}            : Run JavaScript code directly`);
  console.log(`  ${c.yellow}/ts <code>${c.dim}            : Run TypeScript code directly`);
  console.log(`  ${c.yellow}/go <code>${c.dim}            : Run Go code directly`);
  console.log(`  ${c.yellow}/rust <code>${c.dim}          : Compile & run Rust code`);
  console.log(`  ${c.yellow}/search <query>${c.dim}       : DuckDuckGo live web search`);
  console.log(`  ${c.yellow}/inspect <url>${c.dim}        : Website stack & technology inspector`);
  console.log(`  ${c.yellow}/exec <cmd>${c.dim}           : Shell / PowerShell command execution`);
  console.log(`  ${c.yellow}/help${c.dim}                 : Display all skills and capabilities\n`);
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
      console.log(`\n${c.bold}Registered Agent Skills:${c.reset}`);
      skillsRegistry.list().forEach(s => {
        console.log(`  ${c.green}${s.name.padEnd(16)}${c.reset} : ${s.description}`);
      });
      console.log(`\n${c.bold}Project Scaffolding:${c.reset}`);
      console.log(`  ${c.cyan}/build <prompt>${c.reset}     : Turn prompt into workspace files, test, & report errors`);
      console.log(`\n${c.bold}Language Shorthand Commands:${c.reset}`);
      console.log(`  ${c.cyan}/run <lang> <code>${c.reset}  : Execute code in any language (or auto-detect)`);
      console.log(`  ${c.cyan}/py <code>${c.reset}          : Run Python`);
      console.log(`  ${c.cyan}/js <code>${c.reset}          : Run Node.js JavaScript`);
      console.log(`  ${c.cyan}/ts <code>${c.reset}          : Run TypeScript`);
      console.log(`  ${c.cyan}/go <code>${c.reset}          : Run Go`);
      console.log(`  ${c.cyan}/rust <code>${c.reset}        : Compile & run Rust`);
      console.log(`  ${c.cyan}/c <code>${c.reset}           : Compile & run C`);
      console.log(`  ${c.cyan}/cpp <code>${c.reset}         : Compile & run C++`);
      console.log(`  ${c.cyan}/php <code>${c.reset}         : Run PHP`);
      console.log(`  ${c.cyan}/ruby <code>${c.reset}        : Run Ruby`);
      console.log(`  ${c.cyan}/ps <code>${c.reset}          : Run PowerShell script`);
      console.log(`  ${c.cyan}/bash <code>${c.reset}        : Run Bash script`);
      console.log(`\n${c.bold}Package Installation Commands:${c.reset}`);
      console.log(`  ${c.yellow}pip install <pkgs>${c.reset}   | ${c.yellow}npm install <pkgs>${c.reset}   | ${c.yellow}cargo add <pkgs>${c.reset}\n`);
      rl.prompt();
      return;
    }

    // /build <prompt>
    if (input.startsWith('/build ') || input.startsWith('build ')) {
      const promptText = input.replace(/^\/?build\s+/i, '').trim();
      console.log(`${c.cyan}[Scaffolding Project]: "${promptText}"...${c.reset}`);
      const res = await skillsRegistry.get('build_project').handler({ prompt: promptText });
      if (res.success) {
        console.log(`${c.green}${c.bold}Project successfully created and verified!${c.reset}`);
        console.log(`Workspace: ${c.dim}${res.workspacePath}${c.reset}`);
        console.log(`Files created: ${res.generatedFiles.join(', ')}`);
        if (res.errors.length > 0) {
          console.log(`${c.yellow}Warnings/Errors during execution:${c.reset}`);
          console.log(JSON.stringify(res.errors, null, 2));
        } else {
          console.log(`${c.green}No errors encountered during execution test.${c.reset}`);
        }
      } else {
        console.log(`${c.red}${c.bold}Build verification encountered errors:${c.reset}`);
        console.log(JSON.stringify(res.errors, null, 2));
      }
      rl.prompt();
      return;
    }

    // Dynamic execution via /run <lang> <code> OR /run <code> (auto-detected)
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

    // Specific language shorthand commands
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

    // Direct markdown code block pasted: ```<lang> ... ```
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

    // Inspect Site
    if (input.startsWith('/inspect ')) {
      const url = input.slice(9).trim();
      console.log(`${c.cyan}[Inspecting website tech]: ${url}...${c.reset}`);
      const res = await skillsRegistry.get('inspect').handler({ url });
      console.log(JSON.stringify(res, null, 2));
      rl.prompt();
      return;
    }

    // Extract Page
    if (input.startsWith('/extract ')) {
      const url = input.slice(9).trim();
      console.log(`${c.cyan}[Extracting page content]: ${url}...${c.reset}`);
      const res = await skillsRegistry.get('extract').handler({ url });
      console.log(JSON.stringify(res, null, 2));
      rl.prompt();
      return;
    }

    // PowerShell / Shell command execution
    if (input.startsWith('/exec ')) {
      const cmd = input.slice(6).trim();
      console.log(`${c.dim}[Running in PowerShell/Shell]: ${cmd}${c.reset}`);
      const res = await executeCommand(cmd);
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(`${c.red}${res.stderr}${c.reset}`);
      rl.prompt();
      return;
    }

    // Package managers shorthand
    const lower = input.toLowerCase();
    if (lower.startsWith('npm install ') || lower.startsWith('install npm ')) {
      const pkg = input.replace(/^(npm install|install npm)\s+/i, '').trim();
      console.log(`${c.cyan}[Installing NPM package]: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('install_package').handler({ manager: 'npm', packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    if (lower.startsWith('pip install ') || lower.startsWith('install pip ')) {
      const pkg = input.replace(/^(pip install|install pip)\s+/i, '').trim();
      console.log(`${c.cyan}[Installing Python package]: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('install_package').handler({ manager: 'pip', packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    if (lower.startsWith('cargo add ') || lower.startsWith('cargo install ')) {
      const pkg = input.replace(/^(cargo add|cargo install)\s+/i, '').trim();
      console.log(`${c.cyan}[Installing Cargo dependency]: ${pkg}${c.reset}`);
      const res = await skillsRegistry.get('install_package').handler({ manager: 'cargo', packages: pkg });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      rl.prompt();
      return;
    }

    // Automatic check if input looks like code (e.g. print(...), console.log(...), def ...)
    if (/^(print\(|console\.log\(|def\s+|function\s+|const\s+|let\s+|package\s+main|#include|fn\s+main)/.test(input)) {
      console.log(`${c.dim}[Auto-detected code snippet, running]...${c.reset}`);
      const res = await executeCode({ code: input });
      displayCodeResult(res);
      rl.prompt();
      return;
    }

    // Fallback info
    console.log(`${c.yellow}[Agent Input Received]:${c.reset} ${input}`);
    console.log(`${c.dim}Tip: Run code with ${c.yellow}/run <lang> <code>${c.dim}, ${c.yellow}/py <code>${c.dim}, or type ${c.yellow}/help${c.reset}`);
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
