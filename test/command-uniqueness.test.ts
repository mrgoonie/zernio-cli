import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMMANDS_DIR = join(__dirname, '..', 'src', 'commands');
const GENERATED_FILE = 'generated.ts';

/**
 * Extract yargs command NAMES (first token of the command string, before any
 * positional args) from a source file. Matches `.command('name', ...)`,
 * `.command("name <arg>", ...)`, and `.command(\`name\`, ...)` — with the
 * command literal optionally on the line after `.command(`.
 */
function extractCommandNames(source: string): string[] {
  const names: string[] = [];
  const re = /\.command\(\s*['"`]([^'"`]+)['"`]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    // `.command('posts:list <id>', ...)` → name is `posts:list`
    const first = match[1].trim().split(/\s+/)[0];
    if (first) names.push(first);
  }
  return names;
}

function readCommandNames(file: string): Set<string> {
  const source = readFileSync(join(COMMANDS_DIR, file), 'utf8');
  return new Set(extractCommandNames(source));
}

describe('command name uniqueness', () => {
  it('has no duplicate command names between hand-written and generated', () => {
    const handFiles = readdirSync(COMMANDS_DIR)
      .filter((f) => f.endsWith('.ts') && f !== GENERATED_FILE);

    const handNames = new Set<string>();
    for (const file of handFiles) {
      for (const name of readCommandNames(file)) {
        handNames.add(name);
      }
    }

    const generatedNames = readCommandNames(GENERATED_FILE);

    // Sanity: catalogs are populated so a broken regex or generator rewrite
    // (emitting names via loops instead of literals) fails loudly.
    expect(handNames.size, 'hand-written command set should be non-empty').toBeGreaterThan(0);
    expect(generatedNames.size, 'generated command set should be > 300').toBeGreaterThan(300);

    const collisions = [...handNames].filter((n) => generatedNames.has(n)).sort();
    expect(
      collisions,
      collisions.length
        ? `hand-written commands shadowed by generated.ts: ${collisions.join(', ')}. ` +
          `Fix: run \`npm run gen\` to let scripts/generate-commands.mjs auto-skip ` +
          `the matching SDK operationId, or rename the hand command.`
        : '',
    ).toEqual([]);
  });

  it('has no duplicate command names within hand-written files', () => {
    const handFiles = readdirSync(COMMANDS_DIR)
      .filter((f) => f.endsWith('.ts') && f !== GENERATED_FILE);

    // Track every occurrence, not just first per file — catches copy-paste
    // within a single file (e.g. two `.command('posts:list', ...)` blocks).
    const occurrences = new Map<string, string[]>();
    for (const file of handFiles) {
      const source = readFileSync(join(COMMANDS_DIR, file), 'utf8');
      for (const name of extractCommandNames(source)) {
        const list = occurrences.get(name) ?? [];
        list.push(file);
        occurrences.set(name, list);
      }
    }

    const duplicates = [...occurrences.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => `${name} (in ${files.join(', ')})`)
      .sort();

    expect(duplicates, duplicates.length ? `duplicate hand-written names: ${duplicates.join('; ')}` : '').toEqual([]);
  });
});
