import { skillsRegistry } from '../skills.js';
import { executeCode, executeCommand } from '../executor.js';
import { SelfHealingEngine } from '../tools/self_healer.js';
import { SkillPackManager } from '../skill_packs.js';
import { brainManager } from '../brain.js';
import { AISeerInspector, taskScheduler } from '../tools/automator.js';

export const AGENT_PERSONAS = {
  inject: {
    id: 'inject',
    name: 'INJECT',
    modelTitle: 'David-Inject Model (Master Commander & Code Architect)',
    role: 'Decomposes complex goals, architects systems, writes files, and triggers execution.',
    costPerRun: 25
  },
  reviewer: {
    id: 'reviewer',
    name: 'CODE REVIEWER',
    modelTitle: 'David-Reviewer Model (Self-Healing & Quality Assurance)',
    role: 'Performs syntax audits, catches runtime failures, and auto-repairs code.',
    costPerRun: 20
  },
  accumulate: {
    id: 'accumulate',
    name: 'ACCUMULATE',
    modelTitle: 'David-Accumulate Model (Web Harvester & Skill Packs)',
    role: 'Searches the web, imports validated skill packs, and expands capabilities.',
    costPerRun: 15
  },
  digest: {
    id: 'digest',
    name: 'DIGEST',
    modelTitle: 'David-Digest Model (Memory, Context & AST Analyzer)',
    role: 'Summarizes code trees, tracks dependencies, and indexes project state.',
    costPerRun: 10
  }
};

export class DavidSwarm {
  constructor() {
    this.name = 'David';
    this.activeModel = 'inject';
  }

  setActive(modelKey) {
    const k = (modelKey || '').toLowerCase().replace(/[^a-z]/g, '');
    if (k.includes('review')) this.activeModel = 'reviewer';
    else if (k.includes('accum') || k.includes('pack') || k.includes('search')) this.activeModel = 'accumulate';
    else if (k.includes('digest') || k.includes('mem') || k.includes('tree')) this.activeModel = 'digest';
    else this.activeModel = 'inject';
    return AGENT_PERSONAS[this.activeModel];
  }

  getCurrentModel() {
    return AGENT_PERSONAS[this.activeModel];
  }

  getAllModels() {
    return Object.values(AGENT_PERSONAS);
  }

  async runReviewerFix(code, language) {
    return await SelfHealingEngine.runWithSelfCorrection({ code, language });
  }

  async runAISeerInspection(url) {
    return await AISeerInspector.inspectPage(url);
  }
}

export const davidSwarm = new DavidSwarm();
export const agentSwarm = davidSwarm;
