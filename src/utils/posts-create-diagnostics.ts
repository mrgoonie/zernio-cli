import { LateApiError } from '@zernio/node';
import { handleError } from './errors.js';
import { outputError } from './output.js';
import type { PlatformTarget } from './posts-create-platform-data.js';

type AccountRecord = Record<string, unknown>;

type PostCreateErrorContext = {
  debugSafe: boolean;
  pretty: boolean;
  platforms: PlatformTarget[];
  accounts: AccountRecord[];
};

const SAFE_ACCOUNT_FIELDS = [
  'profileId',
  'profileName',
  'platform',
  'username',
  'displayName',
  'status',
  'canPost',
  'tokenValid',
  'needsReconnect',
  'issues',
];

export function handlePostCreateError(err: unknown, context: PostCreateErrorContext): never {
  if (!context.debugSafe) handleError(err);

  const status = err instanceof LateApiError ? err.statusCode : undefined;
  const message = err instanceof Error ? err.message : String(err);
  outputError(
    message,
    status,
    {
      code: status === 401 ? 'POST_CREATE_UNAUTHORIZED' : 'POST_CREATE_FAILED',
      diagnostic: buildPostCreateDiagnostic(context, status),
    },
    context.pretty,
  );
}

export function buildPostCreateDiagnostic(context: PostCreateErrorContext, status?: number): Record<string, unknown> {
  return {
    command: 'posts:create',
    resolvedPlatforms: context.platforms,
    targetAccounts: context.platforms.map((target) => summarizeAccount(target, context.accounts)),
    suggestions: suggestionsForStatus(status),
  };
}

export async function addAccountHealthDiagnostics(
  late: { accounts?: { getAccountHealth?: (args: { path: { accountId: string } }) => Promise<{ data: unknown }> } },
  accountIds: string[],
  accounts: AccountRecord[],
): Promise<AccountRecord[]> {
  if (!late.accounts?.getAccountHealth) return accounts;
  const healthEntries = await Promise.all(
    accountIds.map(async (id) => {
      try {
        const { data } = await late.accounts!.getAccountHealth!({ path: { accountId: id } });
        return [id, data] as const;
      } catch {
        return [id, undefined] as const;
      }
    }),
  );
  const healthById = new Map(healthEntries.filter((entry): entry is readonly [string, AccountRecord] => isRecord(entry[1])));
  return accounts.map((account) => {
    const id = accountId(account);
    return id && healthById.has(id) ? { ...account, ...healthById.get(id) } : account;
  });
}

function summarizeAccount(target: PlatformTarget, accounts: AccountRecord[]): Record<string, unknown> {
  const account = accounts.find((candidate) => accountId(candidate) === target.accountId) || {};
  const summary: Record<string, unknown> = {
    accountId: target.accountId,
    platform: target.platform,
  };

  for (const field of SAFE_ACCOUNT_FIELDS) {
    if (account[field] !== undefined && field !== 'platform') summary[field] = account[field];
  }
  return summary;
}

function accountId(account: AccountRecord): string | undefined {
  const id = account.id || account._id || account.accountId;
  return id === undefined ? undefined : String(id);
}

function isRecord(value: unknown): value is AccountRecord {
  return typeof value === 'object' && value !== null;
}

function suggestionsForStatus(status?: number): string[] {
  if (status === 401) {
    return [
      'Run zernio auth:check --pretty to verify the API key.',
      'Run zernio accounts:health --pretty and compare the target account status.',
      'If health is valid but create still returns 401, reconnect the account or report a backend authorization mismatch.',
    ];
  }
  return [
    'Run zernio auth:check --pretty to verify API connectivity.',
    'Run zernio accounts:list --pretty to confirm the target account IDs.',
  ];
}
