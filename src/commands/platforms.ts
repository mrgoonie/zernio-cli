import type { Argv } from 'yargs';
import { output } from '../utils/output.js';

const platforms = [
  'twitter',
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'reddit',
  'bluesky',
  'threads',
  'googlebusiness',
  'telegram',
  'snapchat',
  'whatsapp',
  'discord',
] as const;

export function registerPlatformCommands(yargs: Argv): Argv {
  return yargs.command(
    'platforms:list',
    'List supported platform identifiers',
    (y) => y,
    (argv) => {
      output({
        platforms,
        source: 'https://docs.zernio.com/platforms',
        note: 'Use the docs page as source of truth for current platform capabilities and constraints.',
      }, argv.pretty as boolean);
    },
  );
}
