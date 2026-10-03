import { skillsRegistry } from '../skills.js';
import { executeCode, executeCommand } from '../executor.js';
import { SelfHealingEngine } from '../tools/self_healer.js';
import { SkillPackManager } from '../skill_packs.js';
import { brainManager } from '../brain.js';

export const AGENT_PERSONAS = {
  inject: {
    name: 'INJECT',
    title: 'Primary Commander & Code Generator',
    role: 'Decomposes high-level instructions, architects systems, writes files, and triggers execution.'
  },
  reviewer: {
    name: 'CODE REVIEWER',
    title: 'Critic, Synthesizer & Self-Healing Agent',
    role: 'Performs static analysis, catches runtime errors, applies instant repairs, and validates tests.'
  },
  accumulate: {
    name: 'ACCUMULATE',
    title: 'Research, Knowledge & Skill Pack Collector',
    role: 'Searches the web for libraries, imports validated skill packs, and expands agent capabilities.'
  },
  digest: {
    name: 'DIGEST',
    title: 'Context, Codebase & Memory Analyzer',
    role: 'Summarizes deep code trees, tracks dependencies, analyzes logs, and indexes project state.'
  }
};

export class AgentSwarm {
  constructor() {
    this.activeAgent = 'inject';
  }

  setActive(agentKey) {
    const k = agentKey.toLowerCase().replace(/[^a-z]/g, '');
    if (k.includes('review')) this.activeAgent = 'reviewer';
    else if (k.includes('accum') || k.includes('pack') || k.includes('search')) this.activeAgent = 'accumulate';
    else if (k.includes('digest') || k.includes('mem') || k.includes('tree')) this.activeAgent = 'digest';
    else this.activeAgent = 'inject';
    return AGENT_PERSONAS[this.activeAgent];
  }

  getCurrentAgent() {
    return AGENT_PERSONAS[this.activeAgent];
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

export const agentSwarm = new AgentSwarm();
