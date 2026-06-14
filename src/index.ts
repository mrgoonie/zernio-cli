import yargs from 'yargs';
import type { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerAuthCommands } from './commands/auth.js';
import { registerProfileCommands } from './commands/profiles.js';
import { registerAccountCommands } from './commands/accounts.js';
import { registerPostCommands } from './commands/posts.js';
import { registerAnalyticsCommands } from './commands/analytics.js';
import { registerMediaCommands } from './commands/media.js';
import { registerInboxCommands } from './commands/inbox.js';
import { registerContactCommands } from './commands/contacts.js';
import { registerBroadcastCommands } from './commands/broadcasts.js';
import { registerSequenceCommands } from './commands/sequences.js';
import { registerAutomationCommands } from './commands/automations.js';
import { registerApiCommands } from './commands/api.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerPlatformCommands } from './commands/platforms.js';

/**
 * Zernio CLI - Schedule posts, manage inbox, broadcasts, sequences, and automations across 14 platforms.
 *
 * Outputs JSON by default (optimized for AI agents and piping).
 * Use --pretty for human-readable indented JSON.
 */
let cli: Argv = yargs(hideBin(process.argv))
  .scriptName('zernio')
  .usage('Usage: zernio <command> [options]')
  .option('pretty', {
    type: 'boolean',
    describe: 'Pretty-print JSON output',
    default: false,
    global: true,
  })
  .option('json', {
    type: 'boolean',
    describe: 'Keep machine-readable JSON output (default behavior)',
    default: true,
    global: true,
  })
  .strict()
  .demandCommand(1, 'You need to specify a command. Run "zernio --help" for available commands.')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version') as Argv;

// Register all command groups
cli = registerAuthCommands(cli);
cli = registerProfileCommands(cli);
cli = registerAccountCommands(cli);
cli = registerPostCommands(cli);
cli = registerAnalyticsCommands(cli);
cli = registerMediaCommands(cli);
cli = registerInboxCommands(cli);
cli = registerContactCommands(cli);
cli = registerBroadcastCommands(cli);
cli = registerSequenceCommands(cli);
cli = registerAutomationCommands(cli);
cli = registerApiCommands(cli);
cli = registerDoctorCommand(cli);
cli = registerPlatformCommands(cli);

// Parse and execute
cli.parse();
