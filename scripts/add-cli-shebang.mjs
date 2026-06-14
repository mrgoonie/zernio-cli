import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const entry = resolve('dist/index.js');
const source = readFileSync(entry, 'utf8');

if (!source.startsWith('#!/usr/bin/env node')) {
  writeFileSync(entry, `#!/usr/bin/env node\n${source}`);
}

chmodSync(entry, 0o755);
