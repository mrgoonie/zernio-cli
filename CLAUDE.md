# CLAUDE.md

## Project Rules

- This is an unofficial Zernio CLI for humans and agents.
- Keep JSON output as the default.
- Do not print secrets.
- Do not create an MCP server in this repo unless explicitly requested later.
- `main` is stable release; `dev` is beta release.
- Use conventional commits for release automation.

## Verification

Run before handoff:

```bash
npm run build
npm test
npm run test:coverage
npm run typecheck
npm audit --omit=optional
```
