import fs from 'fs/promises';
import path from 'path';
import { executeCommand, writeFile, readFile, listDirectory } from './executor.js';
import { webSearch, extractPage, inspectSite } from './tools/web.js';

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
    // 1. Web Search
    this.register('search', 'Perform DuckDuckGo web search without any API keys', async ({ query, limit = 5 }) => {
      return await webSearch(query, limit);
    });

    // 2. Extract Webpage
    this.register('extract', 'Extract headings, meta, tables, and clean text from any URL', async ({ url }) => {
      return await extractPage(url);
    });

    // 3. Inspect Site
    this.register('inspect', 'Inspect target website technologies (React, Next.js, Vue, Tailwind, Stripe, etc.)', async ({ url }) => {
      return await inspectSite(url);
    });

    // 4. Run PowerShell command
    this.register('exec', 'Run any terminal or PowerShell command', async ({ command }) => {
      return await executeCommand(command);
    });

    // 5. Code File Generation
    this.register('write_file', 'Write or overwrite code to a specified file path', async ({ path: filePath, content }) => {
      const writtenPath = await writeFile(filePath, content);
      return { success: true, message: `File saved: ${writtenPath}` };
    });

    // 6. Read File
    this.register('read_file', 'Read contents of a file', async ({ path: filePath }) => {
      try {
        const content = await readFile(filePath);
        return { success: true, content };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // 7. List Directory
    this.register('ls', 'List files in current or specified directory', async ({ path: dirPath = '.' }) => {
      try {
        const entries = await listDirectory(dirPath);
        return { success: true, entries };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // 8. Install NPM Package
    this.register('install_npm', 'Install npm package dependencies in current directory', async ({ packages, dev = false }) => {
      const flag = dev ? '--save-dev' : '';
      return await executeCommand(`npm install ${packages} ${flag}`.trim());
    });

    // 9. Install PIP Package
    this.register('install_pip', 'Install Python packages via pip', async ({ packages }) => {
      return await executeCommand(`pip install ${packages}`);
    });

    // 10. Live Code Runner (eval script)
    this.register('run_code', 'Write a temporary Node.js script and execute it immediately', async ({ code }) => {
      const tmpFile = path.resolve(process.cwd(), '.agent-run.mjs');
      await fs.writeFile(tmpFile, code, 'utf8');
      const res = await executeCommand(`node "${tmpFile}"`);
      await fs.unlink(tmpFile).catch(() => {});
      return res;
    });
  }
}

export const skillsRegistry = new SkillRegistry();
