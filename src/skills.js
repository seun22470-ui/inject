import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { SKILL_DEFINITIONS } from './skills/catalog.js';
import { executeCode } from './executor.js';

const SKILLS_DIR = path.join(os.homedir(), '.inject-agent', 'skills');

class SkillRegistry {
  constructor() {
    this.skills = new Map();
    this.customSkills = new Map();
    this.registerBuiltInSkills();
  }

  registerBuiltInSkills() {
    for (const def of SKILL_DEFINITIONS) {
      this.skills.set(def.id.toLowerCase(), { ...def, type: 'builtin' });
      // Also register by natural name lowercased without spaces
      const compactName = def.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (compactName !== def.id.toLowerCase()) {
        this.skills.set(compactName, { ...def, type: 'builtin' });
      }
    }
  }

  async loadCustomSkills() {
    try {
      await fs.mkdir(SKILLS_DIR, { recursive: true });
      const files = await fs.readdir(SKILLS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(SKILLS_DIR, file), 'utf8');
          const skillData = JSON.parse(content);
          this.registerCustomSkill(skillData.name, skillData.description, skillData.handlerCode);
        }
      }
    } catch {}
  }

  registerCustomSkill(name, description, handlerCode) {
    const handler = async (args) => {
      return await executeCode({
        code: `const args = ${JSON.stringify(args)};\n${handlerCode}`,
        language: 'javascript'
      });
    };
    const key = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    this.customSkills.set(key, { name, description, handlerCode });
    this.skills.set(key, {
      id: key,
      name,
      category: 'Custom Installed',
      description,
      handler,
      type: 'custom'
    });
  }

  async installSkill({ name, description, code }) {
    await fs.mkdir(SKILLS_DIR, { recursive: true });
    const key = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const skillPath = path.join(SKILLS_DIR, `${key}.json`);
    const skillData = {
      name,
      description: description || 'Custom user installed skill',
      handlerCode: code,
      installedAt: new Date().toISOString()
    };
    await fs.writeFile(skillPath, JSON.stringify(skillData, null, 2), 'utf8');
    this.registerCustomSkill(name, skillData.description, code);
    return { success: true, message: `Skill '${name}' installed into agent brain!` };
  }

  get(nameOrId) {
    if (!nameOrId) return null;
    const key = nameOrId.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    return this.skills.get(key);
  }

  list() {
    const unique = new Map();
    for (const s of this.skills.values()) {
      if (!unique.has(s.id)) {
        unique.set(s.id, s);
      }
    }
    return Array.from(unique.values());
  }

  getByCategory() {
    const groups = {};
    for (const s of this.list()) {
      const cat = s.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }
}

export const skillsRegistry = new SkillRegistry();
