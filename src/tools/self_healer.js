import { executeCode } from '../executor.js';
import fs from 'fs/promises';
import path from 'path';

export class SelfHealingEngine {
  /**
   * Executes code dynamically, reviews for errors, automatically applies corrections, and verifies up to maxAttempts
   */
  static async runWithSelfCorrection({ code, language, cwd = process.cwd(), maxAttempts = 3 }) {
    let currentCode = code;
    let attempt = 1;
    const history = [];

    while (attempt <= maxAttempts) {
      const res = await executeCode({ code: currentCode, language, cwd });

      if (res.success) {
        return {
          success: true,
          attemptsRequired: attempt,
          finalCode: currentCode,
          output: res.stdout,
          warnings: res.stderr,
          history
        };
      }

      // Failure encountered: Code Reviewer & Self-Healing Agent steps in
      const errorLog = res.stderr || res.stdout || 'Unknown runtime error';
      history.push({
        attempt,
        error: errorLog,
        codeVersion: currentCode
      });

      // Analyze error and generate surgical correction
      const repaired = SelfHealingEngine.diagnoseAndFix({
        code: currentCode,
        error: errorLog,
        language: res.language || language
      });

      if (repaired === currentCode) {
        // No automatic patch heuristic found
        return {
          success: false,
          attemptsRequired: attempt,
          error: errorLog,
          finalCode: currentCode,
          history
        };
      }

      currentCode = repaired;
      attempt++;
    }

    return {
      success: false,
      attemptsRequired: maxAttempts,
      error: 'Max correction attempts reached without clean run',
      history
    };
  }

  static diagnoseAndFix({ code, error, language }) {
    let fixed = code;

    // 1. Missing module import in Node.js
    const missingModuleMatch = error.match(/Cannot find module ['"]([^'"]+)['"]/);
    if (missingModuleMatch && (language === 'javascript' || language === 'typescript')) {
      const mod = missingModuleMatch[1];
      if (!fixed.includes(`import ${mod}`) && !fixed.includes(`require('${mod}')`)) {
        fixed = `import ${mod} from '${mod}';\n` + fixed;
        return fixed;
      }
    }

    // 2. SyntaxError: await outside async
    if (error.includes('await is only valid in async functions') && (language === 'javascript' || language === 'typescript')) {
      fixed = `(async () => {\n${fixed}\n})();`;
      return fixed;
    }

    // 3. NameError: name not defined in Python
    const pyNameError = error.match(/NameError: name '([^']+)' is not defined/);
    if (pyNameError && language === 'python') {
      const missingVar = pyNameError[1];
      if (['sys', 'os', 'json', 'math', 'time', 'subprocess'].includes(missingVar)) {
        fixed = `import ${missingVar}\n` + fixed;
        return fixed;
      }
    }

    // 4. Go missing import "fmt"
    if (error.includes('undefined: fmt') && language === 'go') {
      if (!fixed.includes('"fmt"')) {
        fixed = fixed.replace(/import\s*\(/, 'import (\n\t"fmt"');
        return fixed;
      }
    }

    // 5. C/C++ missing headers
    if (error.includes("'printf' was not declared") || error.includes("implicit declaration of function 'printf'")) {
      fixed = '#include <stdio.h>\n' + fixed;
      return fixed;
    }
    if (error.includes("'cout' was not declared") || error.includes("use of undeclared identifier 'cout'")) {
      fixed = '#include <iostream>\n' + fixed;
      return fixed;
    }

    return fixed;
  }
}
