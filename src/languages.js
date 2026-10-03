import os from 'os';
import path from 'path';

export const SUPPORTED_LANGUAGES = {
  javascript: {
    aliases: ['js', 'node', 'nodejs'],
    extension: '.mjs',
    compile: null,
    run: (filePath) => `node "${filePath}"`
  },
  typescript: {
    aliases: ['ts', 'tsx'],
    extension: '.ts',
    compile: null,
    run: (filePath) => `npx -y tsx "${filePath}"`
  },
  python: {
    aliases: ['py', 'python3'],
    extension: '.py',
    compile: null,
    run: (filePath) => {
      return process.platform === 'win32'
        ? `python "${filePath}"`
        : `(python3 "${filePath}" 2>/dev/null || python "${filePath}")`;
    }
  },
  bash: {
    aliases: ['sh', 'shell', 'zsh'],
    extension: '.sh',
    compile: null,
    run: (filePath) => `bash "${filePath}"`
  },
  powershell: {
    aliases: ['ps', 'ps1', 'pwsh'],
    extension: '.ps1',
    compile: null,
    run: (filePath) => `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${filePath}"`
  },
  go: {
    aliases: ['golang'],
    extension: '.go',
    compile: null,
    run: (filePath) => `go run "${filePath}"`
  },
  rust: {
    aliases: ['rs'],
    extension: '.rs',
    compile: (srcPath, binPath) => `rustc "${srcPath}" -o "${binPath}"`,
    run: (binPath) => `"${binPath}"`
  },
  c: {
    aliases: ['gcc', 'clang'],
    extension: '.c',
    compile: (srcPath, binPath) => `gcc "${srcPath}" -o "${binPath}"`,
    run: (binPath) => `"${binPath}"`
  },
  cpp: {
    aliases: ['c++', 'cxx'],
    extension: '.cpp',
    compile: (srcPath, binPath) => `g++ "${srcPath}" -o "${binPath}"`,
    run: (binPath) => `"${binPath}"`
  },
  ruby: {
    aliases: ['rb'],
    extension: '.rb',
    compile: null,
    run: (filePath) => `ruby "${filePath}"`
  },
  php: {
    aliases: [],
    extension: '.php',
    compile: null,
    run: (filePath) => `php "${filePath}"`
  },
  java: {
    aliases: [],
    extension: '.java',
    compile: null,
    run: (filePath) => `java "${filePath}"`
  }
};

export function resolveLanguage(langInput) {
  if (!langInput) return null;
  const clean = langInput.toLowerCase().trim().replace(/^\./, '');
  for (const [key, conf] of Object.entries(SUPPORTED_LANGUAGES)) {
    if (key === clean || conf.aliases.includes(clean)) {
      return key;
    }
  }
  return null;
}

export function detectLanguage(code) {
  const trimmed = code.trim();

  // 1. Markdown code block check: ```<lang> ... ```
  const mdMatch = trimmed.match(/^```([a-zA-Z0-9+#_.-]+)/);
  if (mdMatch) {
    const lang = resolveLanguage(mdMatch[1]);
    if (lang) return lang;
  }

  // 2. Shebang check
  if (trimmed.startsWith('#!')) {
    const firstLine = trimmed.split('\n')[0].toLowerCase();
    if (firstLine.includes('python')) return 'python';
    if (firstLine.includes('node')) return 'javascript';
    if (firstLine.includes('bash') || firstLine.includes('sh')) return 'bash';
    if (firstLine.includes('ruby')) return 'ruby';
    if (firstLine.includes('php')) return 'php';
  }

  // 3. Syntax heuristics
  if (/^\s*<\?php/i.test(trimmed)) return 'php';
  if (/^\s*package\s+main/m.test(trimmed) && /func\s+main\s*\(/m.test(trimmed)) return 'go';
  if (/fn\s+main\s*\(/m.test(trimmed)) return 'rust';
  if (/#include\s+<iostream>/m.test(trimmed) || /std::cout/m.test(trimmed)) return 'cpp';
  if (/#include\s+<stdio\.h>/m.test(trimmed)) return 'c';
  if (/public\s+class\s+\w+/m.test(trimmed) && /public\s+static\s+void\s+main/m.test(trimmed)) return 'java';
  if (/^\s*(import\s+.*from|export\s+|const\s+|let\s+|console\.log\()/m.test(trimmed)) {
    if (/interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|any)/m.test(trimmed)) {
      return 'typescript';
    }
    return 'javascript';
  }
  if (/^\s*(def\s+\w+\(|print\(|import\s+\w+|from\s+\w+\s+import)/m.test(trimmed)) {
    return 'python';
  }
  if (/^\s*(\$\w+\s*=|Write-Host|Get-|Set-)/m.test(trimmed)) {
    return 'powershell';
  }

  // Default fallback
  return 'javascript';
}

export function extractCodeBlock(input) {
  const match = input.match(/```(?:[a-zA-Z0-9+#_.-]*\s+)?([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }
  return input;
}
