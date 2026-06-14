import { readFileSync } from 'node:fs';

export function toArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

export function parseKeyValueList(items: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of toArray(items)) {
    const index = item.indexOf('=');
    if (index === -1) throw new Error(`Expected key=value, got "${item}"`);
    const key = item.slice(0, index).trim();
    if (!key) throw new Error(`Expected non-empty key in "${item}"`);
    result[key] = item.slice(index + 1);
  }
  return result;
}

export function parseJsonInput(json?: string, file?: string): unknown {
  if (json && file) throw new Error('Use either --body-json or --body-file, not both.');
  if (!json && !file) return undefined;
  const raw = file ? readFileSync(file, 'utf8') : json!;
  return JSON.parse(raw);
}
