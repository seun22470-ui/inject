import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DEFAULT_CREDITS = 100000;
const STORAGE_DIR = path.join(os.homedir(), '.david-agent');
const CREDITS_FILE = path.join(STORAGE_DIR, 'credits.json');

export class CreditsManager {
  constructor() {
    this.state = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(CREDITS_FILE)) {
        return JSON.parse(fs.readFileSync(CREDITS_FILE, 'utf-8'));
      }
    } catch (_) {}
    return {
      balance: DEFAULT_CREDITS,
      lifetime_spent: 0,
      tier: 'Enterprise Infinite Pro',
      history: [
        {
          timestamp: new Date().toISOString(),
          type: 'INITIAL_GRANT',
          amount: DEFAULT_CREDITS,
          model: 'SYSTEM',
          reason: 'Initial David Agent computational credits allocated'
        }
      ]
    };
  }

  _save() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(CREDITS_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (_) {}
  }

  getBalance() {
    return this.state.balance;
  }

  getTier() {
    return this.state.tier || 'Enterprise Infinite Pro';
  }

  deduct(amount, reason = 'Execution', model = 'INJECT') {
    if (this.state.balance < amount) {
      return {
        success: false,
        balance: this.state.balance,
        needed: amount,
        error: `Insufficient credits. Required: ${amount}, Available: ${this.state.balance}`
      };
    }
    this.state.balance -= amount;
    this.state.lifetime_spent = (this.state.lifetime_spent || 0) + amount;
    this.state.history.unshift({
      timestamp: new Date().toISOString(),
      type: 'DEDUCT',
      amount,
      model,
      reason,
      remaining: this.state.balance
    });
    if (this.state.history.length > 50) this.state.history.pop();
    this._save();
    return { success: true, balance: this.state.balance, deducted: amount };
  }

  add(amount, reason = 'Top-up') {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) return { success: false, error: 'Invalid credit amount' };
    this.state.balance += num;
    this.state.history.unshift({
      timestamp: new Date().toISOString(),
      type: 'ADD',
      amount: num,
      model: 'SYSTEM',
      reason,
      remaining: this.state.balance
    });
    this._save();
    return { success: true, balance: this.state.balance, added: num };
  }

  getHistory(limit = 6) {
    return (this.state.history || []).slice(0, limit);
  }

  formatSummary() {
    return [
      `💰 Available Balance: ${this.state.balance.toLocaleString()} credits`,
      `⭐ Membership Tier: ${this.getTier()}`,
      `📊 Total Credits Used: ${(this.state.lifetime_spent || 0).toLocaleString()} credits`
    ].join('\n');
  }
}

export const creditsManager = new CreditsManager();
