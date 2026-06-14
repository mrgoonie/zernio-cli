import type { Argv } from 'yargs';
import { readFileSync } from 'node:fs';
import { version as nodeVersion } from 'node:process';
import { resolveConfig } from '../utils/config.js';
import { runApiRequest } from '../utils/api-request.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

export function registerDoctorCommand(yargs: Argv): Argv {
  return yargs.command(
    'doctor',
    'Show redacted CLI configuration and optional connection status',
    (y) =>
      y.option('connection', {
        type: 'boolean',
        describe: 'Call the user endpoint to verify API connectivity',
        default: false,
      }),
    async (argv) => {
      try {
        const resolved = resolveConfig();
        const report: Record<string, unknown> = {
          cli: {
            name: packageJson.name,
            version: packageJson.version,
            node: nodeVersion,
          },
          config: {
            apiKey: {
              resolved: Boolean(resolved.config.apiKey),
              source: resolved.sources.apiKey,
            },
            baseUrl: {
              value: resolved.config.baseUrl || 'https://zernio.com/api',
              source: resolved.sources.baseUrl || 'default',
            },
          },
        };

        if (argv.connection) {
          const result = await runApiRequest({ method: 'GET', path: '/v1/users' });
          report.connection = {
            ok: result.ok,
            status: result.status,
            rateLimit: result.rateLimit,
          };
          output(report, argv.pretty as boolean);
          if (!result.ok) process.exit(1);
          return;
        }

        output(report, argv.pretty as boolean);
      } catch (err) {
        handleError(err);
      }
    },
  );
}
