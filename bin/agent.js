#!/usr/bin/env node

import { startAgent } from '../src/index.js';

startAgent().catch((err) => {
  console.error('\x1b[31m[Agent Fatal Error]:\x1b[0m', err.message);
  process.exit(1);
});
