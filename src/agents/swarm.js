import { skillsRegistry } from '../skills.js';
import { executeCode, executeCommand } from '../executor.js';
import { SelfHealingEngine } from '../tools/self_healer.js';
import { SkillPackManager } from '../skill_packs.js';
import { brainManager } from '../brain.js';

export const AGENT_PERSONAS = {
  inject: {
    id: 'inject',
    name: 'INJECT',
    modelTitle: 'David-Inject Model (Architecture & Execution)',
    role: 'Decomposes complex goals, architects systems, writes files, and runs live code.'
  },
  reviewer: {
    id: 'reviewer',
    name: 'CODE REVIEWER',
    modelTitle: 'David-Reviewer Model (Static Audit & Self-Healing)',
    role: 'Performs syntax & static analysis, catches runtime errors, and auto-repairs code.'
  },
  accumulate: {
    id: 'accumulate',
    name: 'ACCUMULATE',
    modelTitle: 'David-Accumulate Model (Web Search & Pack Harvester)',
    role: 'Conducts live web searches, pulls packages, and installs validated skill packs.'
  },
  digest: {
    id: 'digest',
    name: 'DIGEST',
    modelTitle: 'David-Digest Model (AST Tree & Memory Analyzer)',
    role: 'Indexes project directory maps, resolves dependencies, and compresses context.'
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

  async runAccumulateSearch(query) {
    const packs = SkillPackManager.searchPacks(query);
    const web = await SkillPackManager.searchWebForSkills(query);
    return { matchingPacks: packs, webResources: web };
  }

  async runDigestAnalysis(dirPath = '.') {
    const files = await skillsRegistry.get('folder_tree_builder').handler({ dirPath, maxDepth: 2 });
    const deps = await skillsRegistry.get('dependency_analyzer').handler({ dir: dirPath });
    return { tree: files, dependencies: deps };
  }
}

export const davidSwarm = new DavidSwarm();
export const agentSwarm = davidSwarm;
