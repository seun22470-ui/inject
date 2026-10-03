import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { extractPage, webSearch } from './web.js';
import { executeCode, executeCommand } from '../executor.js';

export class AISeerInspector {
  static async inspectPage(url) {
    const raw = await extractPage(url);
    if (!raw || raw.status >= 400) {
      throw new Error(`Failed to reach ${url} (status: ${raw?.status || 'unknown'})`);
    }

    const html = raw.text || '';
    
    // 1. Detect Forms, inputs, buttons, and hidden inputs
    const forms = [];
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let match;
    while ((match = formRegex.exec(html)) !== null) {
      const formAttrs = match[1];
      const formBody = match[2];
      const inputs = [];
      const inputRegex = /<(input|textarea|select|button)\b([^>]*)>/gi;
      let inpMatch;
      while ((inpMatch = inputRegex.exec(formBody)) !== null) {
        const tag = inpMatch[1].toLowerCase();
        const attrs = inpMatch[2];
        const type = (/type=["']([^"']+)["']/i.exec(attrs) || [])[1] || (tag === 'textarea' ? 'textarea' : 'text');
        const name = (/name=["']([^"']+)["']/i.exec(attrs) || [])[1] || (/id=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
        const value = (/value=["']([^"']*)["']/i.exec(attrs) || [])[1] || '';
        const isHidden = type === 'hidden' || /style=["'][^"']*(display:\s*none|visibility:\s*hidden)[^"']*["']/i.test(attrs);

        inputs.push({ tag, type, name, value, isHidden, isInteractive: !isHidden && type !== 'submit' });
      }

      forms.push({
        action: (/action=["']([^"']*)["']/i.exec(formAttrs) || [])[1] || '',
        method: (/method=["']([^"']*)["']/i.exec(formAttrs) || [])[1] || 'GET',
        inputs,
        hiddenFieldsCount: inputs.filter(i => i.isHidden).length,
        visibleFieldsCount: inputs.filter(i => !i.isHidden).length
      });
    }

    // 2. AI Seer: Hidden Elements & Invisible Tokens
    const hiddenInputs = [...html.matchAll(/<input\b[^>]*type=["']hidden["'][^>]*>/gi)].map(m => m[0]);
    const hiddenContainers = [...html.matchAll(/<([a-z0-9]+)\b[^>]*style=["'][^"']*(?:display:\s*none|visibility:\s*hidden|opacity:\s*0)[^"']*[^>]*>([\s\S]*?)<\/\1>/gi)]
      .slice(0, 10)
      .map(m => ({ tag: m[1], preview: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 120) }));

    return {
      url: raw.url,
      title: raw.title,
      interactive: {
        linksCount: raw.links?.length || 0,
        sampleLinks: (raw.links || []).slice(0, 6),
        formsFound: forms.length
      },
      forms,
      aiSeer: {
        hiddenInputsCount: hiddenInputs.length,
        hiddenContainersCount: hiddenContainers.length,
        hiddenContainers,
        structuredDataTokens: raw.structuredData?.length || 0
      }
    };
  }
}

export class TaskScheduler {
  constructor() {
    this.activeTasks = new Map();
  }

  static parseDuration(str) {
    const s = (str || '').toLowerCase().trim();
    const match = s.match(/^(\d+(?:\.\d+)?)\s*(d|day|days|h|hr|hrs|hours|m|min|mins|minutes|s|sec|seconds)?$/);
    if (!match) return 3600 * 1000;
    const val = parseFloat(match[1]);
    const unit = match[2] || 'h';
    if (unit.startsWith('d')) return val * 24 * 3600 * 1000;
    if (unit.startsWith('h')) return val * 3600 * 1000;
    if (unit.startsWith('m')) return val * 60 * 1000;
    if (unit.startsWith('s')) return val * 1000;
    return val * 3600 * 1000;
  }

  startTask({ name, durationStr, intervalSeconds = 30, taskFn }) {
    const durationMs = TaskScheduler.parseDuration(durationStr);
    const id = `task_${Date.now().toString(36)}`;
    const startTime = Date.now();
    const endTime = startTime + durationMs;

    const taskRecord = {
      id,
      name,
      durationStr,
      durationMs,
      intervalSeconds,
      startTime: new Date(startTime).toISOString(),
      expectedEndTime: new Date(endTime).toISOString(),
      status: 'RUNNING',
      ticks: 0,
      errors: 0,
      lastTickTime: null,
      lastError: null,
      timer: null
    };

    const runIteration = async () => {
      const now = Date.now();
      if (now >= endTime) {
        this.stopTask(id, 'COMPLETED');
        return;
      }
      taskRecord.ticks++;
      taskRecord.lastTickTime = new Date().toISOString();
      try {
        if (typeof taskFn === 'function') {
          await taskFn({ tick: taskRecord.ticks, id, elapsedMs: now - startTime, remainingMs: endTime - now });
        }
      } catch (err) {
        taskRecord.errors++;
        taskRecord.lastError = err.message;
      }
    };

    runIteration();
    taskRecord.timer = setInterval(runIteration, intervalSeconds * 1000);
    this.activeTasks.set(id, taskRecord);

    return {
      id,
      name,
      durationStr,
      intervalSeconds,
      status: 'RUNNING',
      expectedEndTime: taskRecord.expectedEndTime
    };
  }

  stopTask(id, reason = 'STOPPED') {
    const task = this.activeTasks.get(id);
    if (!task) return false;
    if (task.timer) clearInterval(task.timer);
    task.status = reason;
    task.timer = null;
    return true;
  }

  listTasks() {
    return Array.from(this.activeTasks.values()).map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      durationStr: t.durationStr,
      ticks: t.ticks,
      errors: t.errors,
      startTime: t.startTime,
      expectedEndTime: t.expectedEndTime,
      lastTickTime: t.lastTickTime
    }));
  }
}

export const taskScheduler = new TaskScheduler();
