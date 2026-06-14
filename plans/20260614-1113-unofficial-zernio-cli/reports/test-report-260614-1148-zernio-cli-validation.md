# Test Report - 260614-1148 - zernio-cli validation

## Summary

- Scope: pending `zernio-cli` bootstrap/API/release changes
- Result: PASS after fixing `doctor --connection` failed-check exit code
- Unresolved questions: GitHub Issues remain disabled for `mrgoonie/zernio-cli`

## Test Results Overview

- `npm run build`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS, 4 files, 11 tests
- `npm audit --omit=optional`: PASS, 0 vulnerabilities
- `npm pack --dry-run`: PASS, 63 files, 381.1 kB package
- `npx semantic-release --dry-run --no-ci`: PASS, branch correctly skipped publish

## Targeted Probes

- Invalid API key:
  - Command: `ZERNIO_API_KEY=invalid_for_review node dist/index.js doctor --connection --pretty`
  - Result: PASS, exits `1`, reports `connection.ok:false`, `status:401`
- Live API key from explicit local env opt-in:
  - Command: `ZERNIO_CLI_LOAD_ENV=1 node dist/index.js doctor --connection --pretty`
  - Result: PASS, exits `0`, reports `connection.ok:true`, `status:200`
- Idempotency dry-run:
  - Command: `node dist/index.js api:call createPost --body-json ... --request-id req_123 --dry-run --pretty`
  - Result: PASS, `authorization` and `x-request-id` redacted
- Raw body/header dry-run:
  - Command: `node dist/index.js api:call uploadWhatsAppNumberKycDocument --header X-Filename=README.md --content-type application/octet-stream --raw-body-file README.md --dry-run --pretty`
  - Result: PASS, `authorization` and `x-filename` redacted

## Fix Applied

- `src/commands/doctor.ts`: `doctor --connection` now exits non-zero after printing the structured report when the API response is not ok.
- `test/cli-smoke.test.ts`: added regression coverage for failed connection exit status.
- `docs/project-changelog.md`: recorded the bug fix.

## Coverage Metrics

No coverage command exists in `package.json`; skipped coverage metrics.

## Failed Tests

None after fix.

## Build Status

- Build: PASS
- Warnings: none observed
- Dependencies: resolved, audit clean

## Recommendations

1. Enable GitHub Issues or change `package.json` `bugs.url` before publishing.
2. Add a coverage script later if project policy requires numeric coverage gates.

## Unresolved Questions

- Should GitHub Issues be enabled for public support before first release?
