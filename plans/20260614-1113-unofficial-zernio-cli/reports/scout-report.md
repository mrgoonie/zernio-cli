# Scout Report

## Repo State
- Local repo attached to `https://github.com/mrgoonie/zernio-cli.git`.
- Default branch is `main`; no `dev` branch exists yet.
- GitHub Issues are disabled, blocking automatic vibe issue creation.
- `.env` exists locally and is untracked; values were not read.

## Existing CLI
- Runtime: Node/TypeScript ESM, yargs commands, `@zernio/node` SDK.
- Current package identity is official-style `@zernio/cli`; must become unofficial.
- Existing command groups: auth, profiles, accounts, posts, analytics, media, inbox, contacts, broadcasts, sequences, automations.
- Existing files over 200 lines: broadcasts, contacts, inbox, sequences. Avoid unrelated splitting unless touched.

## API Surface
- Attached OpenAPI: version 1.0.4.
- OpenAPI servers: production `https://zernio.com/api`, local `http://localhost:3000/api`.
- OpenAPI operation count: 383 operations across 255 paths.
- Current curated CLI covers useful workflows but not all endpoints.

## Release
- Existing `.github/workflows/publish.yml` publishes official and legacy package names. Replace with CI plus semantic-release.
- NPM package `zernio-cli` is currently unclaimed; `@zernio/cli` exists at 0.3.0.

## Unresolved Questions
- None.
