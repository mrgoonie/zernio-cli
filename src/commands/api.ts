import type { Argv } from 'yargs';
import { openApiInfo } from '../generated/openapi-catalog.js';
import { parseJsonInput, parseKeyValueList } from '../utils/argument-parsing.js';
import { prepareApiRequest, runApiRequest } from '../utils/api-request.js';
import { requireApiKey } from '../utils/config.js';
import { handleError } from '../utils/errors.js';
import {
  endpointSuggestions,
  endpointToSummary,
  findEndpoint,
  listEndpoints,
} from '../utils/openapi-catalog.js';
import { output, outputError } from '../utils/output.js';

export function registerApiCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'api:catalog',
      'Search the generated OpenAPI endpoint catalog',
      (y) =>
        y
          .option('tag', { type: 'string', describe: 'Filter by OpenAPI tag' })
          .option('method', { type: 'string', describe: 'Filter by HTTP method' })
          .option('search', { type: 'string', describe: 'Search operation IDs, paths, and summaries' })
          .option('limit', { type: 'number', describe: 'Maximum endpoints to return', default: 50 }),
      (argv) => {
        const endpoints = listEndpoints({
          tag: argv.tag,
          method: argv.method,
          search: argv.search,
          limit: argv.limit,
        }).map(endpointToSummary);

        output({ ...openApiInfo, endpoints }, argv.pretty as boolean);
      },
    )
    .command(
      'api:describe <operation>',
      'Describe one endpoint by operationId or "METHOD /v1/path"',
      (y) => y.positional('operation', { type: 'string', demandOption: true }),
      (argv) => {
        const endpoint = findEndpoint(argv.operation!);
        if (!endpoint) {
          outputError(`Endpoint not found: ${argv.operation}`, 404);
        }
        output(endpoint, argv.pretty as boolean);
      },
    )
    .command(
      'api:call <operation>',
      'Call any Zernio API endpoint from the OpenAPI catalog',
      (y) =>
        y
          .positional('operation', { type: 'string', demandOption: true })
          .option('path', { type: 'array', describe: 'Path param key=value, repeatable' })
          .option('query', { type: 'array', describe: 'Query param key=value, repeatable' })
          .option('header', { type: 'array', describe: 'Request header key=value, repeatable' })
          .option('form', { type: 'array', describe: 'Form field key=value, repeatable' })
          .option('file', { type: 'array', describe: 'Multipart file key=/path/to/file, repeatable' })
          .option('body-json', { type: 'string', describe: 'JSON request body string' })
          .option('body-file', { type: 'string', describe: 'Path to JSON request body file' })
          .option('raw-body-file', { type: 'string', describe: 'Path to raw request body file' })
          .option('content-type', { type: 'string', describe: 'Content-Type for JSON, form, or raw body' })
          .option('request-id', { type: 'string', describe: 'Set x-request-id header for safe retries' })
          .option('idempotency-key', { type: 'string', describe: 'Set Idempotency-Key header for safe retries' })
          .option('api-key', { type: 'string', describe: 'API key override; never printed' })
          .option('base-url', { type: 'string', describe: 'API base URL override' })
          .option('dry-run', { type: 'boolean', describe: 'Print request preview without sending' }),
      async (argv) => {
        try {
          const endpoint = findEndpoint(argv.operation!);
          if (!endpoint) {
            outputError(
              `Endpoint not found: ${argv.operation}`,
              404,
              { suggestions: endpointSuggestions(argv.operation!).map(endpointToSummary) },
              argv.pretty as boolean,
            );
          }

          const headers = parseKeyValueList(argv.header);
          if (argv.requestId) headers['x-request-id'] = String(argv.requestId);
          if (argv.idempotencyKey) headers['Idempotency-Key'] = String(argv.idempotencyKey);

          const requestOptions = {
            apiKey: argv.apiKey,
            baseUrl: argv.baseUrl,
            method: endpoint.method,
            path: endpoint.path,
            headers,
            pathParams: parseKeyValueList(argv.path),
            query: parseKeyValueList(argv.query),
            form: parseKeyValueList(argv.form),
            files: parseKeyValueList(argv.file),
            body: parseJsonInput(argv.bodyJson, argv.bodyFile),
            rawBodyFile: argv.rawBodyFile,
            contentType: argv.contentType,
          };

          if (!argv.dryRun && !argv.apiKey) requireApiKey();

          if (argv.dryRun) {
            const prepared = prepareApiRequest(requestOptions);
            const headers = prepared.init.headers as Headers;
            output({
              ok: true,
              dryRun: true,
              operation: endpointToSummary(endpoint),
              request: {
                method: requestOptions.method,
                url: prepared.url,
                hasAuthorization: headers.has('authorization'),
                headers: headersToPreview(headers),
                hasBody: prepared.init.body !== undefined,
              },
            }, argv.pretty as boolean);
            return;
          }

          const result = await runApiRequest(requestOptions);
          output(result, argv.pretty as boolean);
          if (!result.ok) process.exit(1);
        } catch (err) {
          handleError(err);
        }
      },
    );
}

function headersToPreview(headers: Headers): Record<string, string> {
  const preview: Record<string, string> = {};
  headers.forEach((value, key) => {
    preview[key] = isSafeHeaderValue(key) ? value : '<redacted>';
  });
  return preview;
}

function isSafeHeaderValue(key: string): boolean {
  return ['accept', 'content-type'].includes(key.toLowerCase());
}
