import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { webSearch } from './tools/web.js';
import { executeCode } from './executor.js';

export const VALIDATED_SKILL_PACKS = {
  'web-automation': {
    name: 'Web Automation & Scraper Pack',
    description: 'Tools for extracting JSON-LD, sitemaps, table data, and automated browser simulation',
    skills: [
      {
        name: 'extract_tables',
        description: 'Extracts all HTML tables into structured JSON arrays',
        code: `return { tables: (args.html ? [...args.html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)].map(m => m[1].length) : []) };`
      },
      {
        name: 'parse_sitemap',
        description: 'Parses XML sitemaps to locate all discoverable app URLs',
        code: `const urls = [...(args.xml || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]); return { total: urls.length, urls: urls.slice(0, 50) };`
      }
    ]
  },
  'devops-cloud': {
    name: 'DevOps, Containers & Cloud Pack',
    description: 'Dockerfiles, docker-compose, CI/CD GitHub Actions workflows, and healthchecks',
    skills: [
      {
        name: 'generate_dockerfile',
        description: 'Generates optimized multi-stage Dockerfiles for Node or Python',
        code: `const runtime = args.runtime || 'node'; return { dockerfile: runtime === 'python' ? 'FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD ["python", "main.py"]' : 'FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nEXPOSE 3000\nCMD ["node", "src/index.js"]' };`
      },
      {
        name: 'generate_github_action',
        description: 'Generates GitHub Actions CI workflow for test and build',
        code: `return { workflow: 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm ci\n      - run: npm test' };`
      }
    ]
  },
  'database-orm': {
    name: 'Database, SQL & Migration Pack',
    description: 'Prisma schema generation, SQL query optimization, and seed data synthesis',
    skills: [
      {
        name: 'generate_mock_data',
        description: 'Synthesizes mock database rows in JSON or SQL insert statements',
        code: `const count = Math.min(args.count || 5, 50); const rows = []; for (let i = 1; i <= count; i++) rows.push({ id: i, name: 'Record ' + i, created: new Date().toISOString() }); return { rows };`
      },
      {
        name: 'sql_index_advisor',
        description: 'Identifies foreign keys and timestamp columns that need b-tree indexes',
        code: `const cols = args.columns || []; const indexed = cols.filter(c => c.endsWith('_id') || c.includes('date') || c.includes('time')); return { recommendedIndexes: indexed.map(c => 'CREATE INDEX idx_' + c + ' ON ' + (args.table || 'table') + '(' + c + ');') };`
      }
    ]
  },
  'security-audit': {
    name: 'Security & Vulnerability Pack',
    description: 'Audit regex, sanitize input strings, prevent injection, check secret leaks',
    skills: [
      {
        name: 'scan_secrets',
        description: 'Detects hardcoded API keys, JWTs, and private keys in code',
        code: `const code = args.code || ''; const leaked = []; if (/sk-[a-zA-Z0-9]{20,}/.test(code)) leaked.push('OpenAI / Anthropic Secret Key'); if (/ghp_[a-zA-Z0-9]{30,}/.test(code)) leaked.push('GitHub Personal Access Token'); if (/-----BEGIN PRIVATE KEY-----/.test(code)) leaked.push('Private Key Block'); return { safe: leaked.length === 0, detectedLeaks: leaked };`
      }
    ]
  }
};

export class SkillPackManager {
  static searchPacks(query) {
    const q = query.toLowerCase().trim();
    const results = [];
    for (const [id, pack] of Object.entries(VALIDATED_SKILL_PACKS)) {
      if (id.includes(q) || pack.name.toLowerCase().includes(q) || pack.description.toLowerCase().includes(q)) {
        results.push({ id, ...pack });
      }
    }
    return results;
  }

  static async searchWebForSkills(query) {
    const q = `site:github.com OR site:npmjs.com "${query}" skill or cli tool`;
    const searchResults = await webSearch(q, 5);
    return searchResults;
  }

  static async installPack(packId, skillsRegistry) {
    const pack = VALIDATED_SKILL_PACKS[packId.toLowerCase()];
    if (!pack) {
      throw new Error(`Skill pack '${packId}' not found. Available: ${Object.keys(VALIDATED_SKILL_PACKS).join(', ')}`);
    }

    const installed = [];
    for (const skill of pack.skills) {
      await skillsRegistry.installSkill({
        name: skill.name,
        description: `[${pack.name}] ${skill.description}`,
        code: skill.code
      });
      installed.push(skill.name);
    }

    return {
      success: true,
      pack: pack.name,
      installedSkills: installed
    };
  }
}
