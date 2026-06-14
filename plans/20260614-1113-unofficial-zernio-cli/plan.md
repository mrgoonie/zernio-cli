# Unofficial Zernio CLI Agentization Plan

## Context
- Work context: `/Volumes/GOON/www/oss/zernio-cli`
- Source repo: `mrgoonie/zernio-cli`
- Branch: `feat/unofficial-zernio-cli-agent-friendly`
- Mode: feature, CLI only, no MCP
- Primary sources: official Zernio docs, attached OpenAPI YAML, `zernio-dev/zernio-node`

## Phases
- [x] Scout repo and docs
- [x] Decide package/release strategy
- [x] Implement OpenAPI catalog, describe, and generic API call commands
- [x] Update package identity, CI, semantic release, and changelog setup
- [x] Create `zernio` companion skill and project docs
- [x] Run build, tests, audit, and code review

## Decisions
- Package name: `zernio-cli`, because `@zernio/cli` is official and already published.
- Release: semantic-release on `main` stable and `dev` beta prerelease.
- API coverage: keep curated workflow commands, add OpenAPI-backed catalog/describe/call for full endpoint coverage.
- Docs: commit the OpenAPI spec under `docs/openapi/` and generate a slim runtime catalog.
- MCP: explicitly out of scope because user said media uploads do not fit MCP.
- Compatibility: keep deprecated `late` bin, `LATE_*`, and `~/.late` fallbacks for this release.
- Generic output: `api:call` returns `{ ok, status, statusText, rateLimit, data }`.
- Upload boundary: keep `media:upload` as the preferred two-step presign workflow; `api:call` supports single-request JSON/form/multipart/raw-body operations.

## Blockers
- GitHub Issues are disabled on `mrgoonie/zernio-cli`, so `ck:vibe` issue creation cannot run unless repo settings change.

## Acceptance Criteria
- CLI builds on Node 20+.
- `zernio api:catalog`, `zernio api:describe`, and `zernio api:call` work without runtime YAML parsing.
- JSON output is default; pretty output remains available.
- Secrets are never printed by auth/doctor/test commands.
- NPM release uses `NPM_TOKEN`; connection tests can use `ZERNIO_API_KEY` without exposing value.
- Docs and skill cover platforms, guides, best practices, and common workflows.
- Tests cover catalog lookup, request construction, config redaction, and CLI smoke help.
- `npm audit --omit=optional` returns no vulnerabilities.

## Rollback
- If generic commands break release, remove `registerApiCommands(cli)` and keep curated commands.
- If semantic-release setup fails, revert `.github/workflows/release.yml` and publish manually from a tag.
- If package rename causes npm ownership trouble, switch to `@mrgoonie/zernio-cli`.

## Unresolved Questions
- None.
