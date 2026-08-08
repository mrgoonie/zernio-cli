import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMMANDS_DIR = join(__dirname, '..', 'src', 'commands');
const GENERATED_FILE = 'generated.ts';

/**
 * Extract every yargs command NAME (and alias) a source file registers.
 *
 * Covers the four shapes yargs accepts, per docs:
 *   - String form:  .command('name <arg>', 'desc', builder, handler)
 *   - Array form:   .command(['name', 'alt', ...], 'desc', ...)
 *   - Object form:  .command({ command: 'name <arg>', aliases: ['alt'], ... })
 *   - aliases field: `aliases: 'alt'` or `aliases: ['alt1', 'alt2']`
 *     (module-form registrations passed into .command() or exported as modules)
 *
 * Every match's first whitespace-delimited token is treated as the command
 * name — `.command('posts:list <id>')` → `posts:list`. Aliases contribute one
 * name each. Regex-based on purpose: fast, dependency-free, and matches the
 * literal source we commit (no runtime yargs eval).
 */
export function extractCommandNames(source: string): string[] {
  const names: string[] = [];
  const push = (raw: string): void => {
    const first = raw.trim().split(/\s+/)[0];
    if (first) names.push(first);
  };
  const pushAllQuoted = (arrayBody: string): void => {
    for (const el of arrayBody.matchAll(/['"`]([^'"`]+)['"`]/g)) push(el[1]);
  };

  // String form: .command('name'...) / .command("name"...) / .command(`name`...)
  for (const m of source.matchAll(/\.command\(\s*['"`]([^'"`]+)['"`]/g)) {
    push(m[1]);
  }

  // Array form: .command(['name', 'alt', ...]...)
  for (const m of source.matchAll(/\.command\(\s*\[([^\]]+)\]/g)) {
    pushAllQuoted(m[1]);
  }

  // Object / ESM-module form command field:
  //   { command: 'name' }              — object literal passed to .command()
  //   { command: ['name', 'alt'] }
  //   export const command = 'name'    — yargs command module (loaded via
  //                                       .commandDir or .command(module))
  //   export const command = ['name', 'alt']
  for (const m of source.matchAll(/\bcommand\s*[:=]\s*['"`]([^'"`]+)['"`]/g)) {
    push(m[1]);
  }
  for (const m of source.matchAll(/\bcommand\s*[:=]\s*\[([^\]]+)\]/g)) {
    pushAllQuoted(m[1]);
  }

  // aliases field (string or array), regardless of the enclosing shape.
  // Matches object-literal `aliases: 'alt'` and ESM-module `export const
  // aliases = ['alt', ...]` in one pass.
  for (const m of source.matchAll(/\baliases\s*[:=]\s*['"`]([^'"`]+)['"`]/g)) {
    push(m[1]);
  }
  for (const m of source.matchAll(/\baliases\s*[:=]\s*\[([^\]]+)\]/g)) {
    pushAllQuoted(m[1]);
  }

  return names;
}

function readCommandNames(file: string): Set<string> {
  const source = readFileSync(join(COMMANDS_DIR, file), 'utf8');
  return new Set(extractCommandNames(source));
}

describe('extractCommandNames — yargs shape coverage', () => {
  it('extracts string form', () => {
    expect(new Set(extractCommandNames(`.command('foo <id>', 'd', b, h)`))).toEqual(new Set(['foo']));
  });

  it('extracts array form (all names)', () => {
    expect(new Set(extractCommandNames(`.command(['foo', 'bar'], 'd', b, h)`))).toEqual(
      new Set(['foo', 'bar']),
    );
  });

  it('extracts object form command + string alias', () => {
    expect(
      new Set(
        extractCommandNames(`
          yargs.command({
            command: 'foo <id>',
            aliases: 'bar',
            describe: 'd',
            handler: () => {},
          });
        `),
      ),
    ).toEqual(new Set(['foo', 'bar']));
  });

  it('extracts object form command + array aliases', () => {
    expect(
      new Set(
        extractCommandNames(`
          .command({
            command: 'foo',
            aliases: ['bar', 'baz'],
            describe: 'd',
          })
        `),
      ),
    ).toEqual(new Set(['foo', 'bar', 'baz']));
  });

  it('extracts ESM-module command declarations (export const command = ...)', () => {
    expect(
      new Set(
        extractCommandNames(`
          export const command = 'foo <id>';
          export const aliases = ['bar', 'baz'];
        `),
      ),
    ).toEqual(new Set(['foo', 'bar', 'baz']));
  });

  it('extracts array-form command combined with a separate aliases declaration', () => {
    // Two independent registrations in one source file — array form for one,
    // aliases field for another. Both must contribute names.
    expect(
      new Set(
        extractCommandNames(`
          .command(['foo', 'alt'], 'd', b, h);
          .command('bar', 'd2', b2, h2).aliases('x');
          const aliases = ['y'];
        `),
      ),
    ).toEqual(new Set(['foo', 'alt', 'bar', 'y']));
  });
});

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
          `Fix: run \`npm run generate:commands\` to let scripts/generate-commands.mjs ` +
          `auto-skip the matching SDK operationId, or rename the hand command.`
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

  it('flags a hand-written alias that shadows a generated command name', () => {
    // Prove the gate would fire for the shape most likely to slip past a
    // review: a future hand file adds an alias whose value collides with an
    // existing generated command. The alias, not the primary command name,
    // is the collision — the pre-#16 regex would miss it.
    const generatedNames = readCommandNames(GENERATED_FILE);
    const victim = [...generatedNames][0];
    expect(victim, 'generated set should have at least one command').toBeTruthy();

    const injected = `
      yargs.command({
        command: 'zc-safe-and-unique',
        aliases: ['${victim}'],
        describe: 'test',
        handler: () => {},
      });
    `;
    const extracted = new Set(extractCommandNames(injected));

    // Extractor must surface both the primary name and the aliased name,
    // and the collision filter must catch the alias against generated.ts.
    expect(extracted.has('zc-safe-and-unique')).toBe(true);
    expect(extracted.has(victim)).toBe(true);
    const collisions = [...extracted].filter((n) => generatedNames.has(n));
    expect(collisions, 'injection alias should surface as collision').toContain(victim);
  });
});
