import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.inject-agent');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class BrainManager {
  constructor() {
    this.config = {
      keys: {},
      activeModel: null
    };
  }

  async init() {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(data);
    } catch {
      this.config = { keys: {}, activeModel: null };
    }
  }

  async save() {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save config:', err.message);
    }
  }

  setKey(providerOrModel, apiKey) {
    const cleanKey = apiKey.trim();
    const cleanName = providerOrModel.toLowerCase().trim();
    this.config.keys[cleanName] = cleanKey;
    this.config.activeModel = cleanName;
    return this.save();
  }

  getKey(providerOrModel) {
    return this.config.keys[providerOrModel.toLowerCase().trim()];
  }

  hasOptionalBrain() {
    return Object.keys(this.config.keys).length > 0;
  }

  getActiveBrainInfo() {
    if (!this.hasOptionalBrain()) {
      return { active: false, info: 'Offline Autonomous Mode (No external API key, pure skills engine)' };
    }
    const providers = Object.keys(this.config.keys).join(', ');
    return { active: true, info: `Hybrid Brain Powered by: ${providers} (optional reasoning)` };
  }

  // Attempt optional LLM generation if key is provided, otherwise fallback to local code scaffolding
  async generateCodeWithBrain(prompt) {
    const anthropicKey = this.config.keys['opus'] || this.config.keys['claude'] || this.config.keys['anthropic'];
    const openaiKey = this.config.keys['openai'] || this.config.keys['gpt'];

    if (anthropicKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-opus-20240229',
            max_tokens: 4096,
            messages: [{ role: 'user', content: `Generate production-ready code files for the following request. Return files with headers or raw code:\n\n${prompt}` }]
          })
        });
        const data = await res.json();
        if (data.content && data.content[0]?.text) {
          return { success: true, provider: 'Opus/Anthropic', text: data.content[0].text };
        }
      } catch (e) {
        console.warn('Optional brain call failed, falling back to local skills:', e.message);
      }
    }

    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await res.json();
        if (data.choices && data.choices[0]?.message?.content) {
          return { success: true, provider: 'OpenAI', text: data.choices[0].message.content };
        }
      } catch (e) {
        console.warn('Optional brain call failed, falling back to local skills:', e.message);
      }
    }

    return { success: false, info: 'Local Autonomous Engine' };
  }
}

export const brainManager = new BrainManager();
