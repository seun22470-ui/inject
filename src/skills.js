import { executeCommand, executeCode, writeFile, readFile, listDirectory } from './executor.js';
import { SUPPORTED_LANGUAGES } from './languages.js';
import { webSearch, extractPage, inspectSite } from './tools/web.js';
import { buildProjectFromPrompt } from './tools/project_builder.js';

class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.registerBuiltInSkills();
  }

  register(name, description, handler) {
    this.skills.set(name.toLowerCase(), { name, description, handler });
  }

  get(name) {
    return this.skills.get(name.toLowerCase());
  }

  list() {
    return Array.from(this.skills.values()).map(s => ({
      name: s.name,
      description: s.description
    }));
  }

  registerBuiltInSkills() {
    // 1. Build Project from Prompt
    this.register('build_project', 'Turns prompts into real project files, runs code in workspace, and reports errors', async ({ prompt, targetDir = './generated-app', files, autoRun = true }) => {
      return await buildProjectFromPrompt({ prompt, targetDir, files, autoRun });
    });

    // 2. Dynamic Multi-Language Code Runner
    this.register('run_code', 'Dynamically execute code in Python, Node/TS, Go, Rust, C/C++, Ruby, PHP, Java, PowerShell or Bash', async ({ code, language }) => {
      return await executeCode({ code, language });
    });

    // 3. Web Search
    this.register('search', 'DuckDuckGo web search without any API keys', async ({ query, limit = 5 }) => {
      return await webSearch(query, limit);
    });

    // 4. Extract Webpage
    this.register('extract', 'Extract headings, meta, tables, and clean text from any URL', async ({ url }) => {
      return await extractPage(url);
    });

    // 5. Inspect Site
    this.register('inspect', 'Inspect target website technologies (React, Next.js, Vue, Tailwind, Stripe, etc.)', async ({ url }) => {
      return await inspectSite(url);
    });

    // 6. Terminal / PowerShell Command Exec
    this.register('exec', 'Run any PowerShell or shell command directly on the host', async ({ command }) => {
      return await executeCommand(command);
    });

    // 7. Write File
    this.register('write_file', 'Write or overwrite code to a specified file path', async ({ path: filePath, content }) => {
      const writtenPath = await writeFile(filePath, content);
      return { success: true, message: `File saved: ${writtenPath}` };
    });

    // 8. Read File
    this.register('read_file', 'Read contents of a file', async ({ path: filePath }) => {
      try {
        const content = await readFile(filePath);
        return { success: true, content };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // 9. List Directory
    this.register('ls', 'List files in current or specified directory', async ({ path: dirPath = '.' }) => {
      try {
        const entries = await listDirectory(dirPath);
        return { success: true, entries };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // 10. Multi-ecosystem package installation
    this.register('install_package', 'Install packages across npm, pip, cargo, go, or gem', async ({ manager, packages }) => {
      const mgr = manager.toLowerCase().trim();
      let cmd = '';
      if (mgr === 'npm') cmd = `npm install ${packages}`;
      else if (mgr === 'pip' || mgr === 'python') cmd = `pip install ${packages}`;
      else if (mgr === 'cargo' || mgr === 'rust') cmd = `cargo add ${packages}`;
      else if (mgr === 'go') cmd = `go get ${packages}`;
      else if (mgr === 'gem' || mgr === 'ruby') cmd = `gem install ${packages}`;
      else {
        return { success: false, stderr: `Unknown package manager: ${manager}` };
      }
      return await executeCommand(cmd);
    });
  }
}

export const skillsRegistry = new SkillRegistry();
