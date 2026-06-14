# Contributing

## Local Loop

```bash
npm ci
npm run generate:openapi
npm run typecheck
npm test
npm run build
npm audit --omit=optional
```

## Code Rules

- Keep command adapters thin.
- Put reusable parsing/request logic in `src/utils/`.
- Do not print secrets.
- Prefer JSON envelopes for agent-facing commands.
- Add tests for new command behavior.
- Do not hand-edit `src/generated/openapi-catalog.ts`.

## Commits

Use conventional commits:

```text
feat: add api catalog command
fix: redact config source
test: cover api request builder
release: 1.2.3
```

`main` is stable. `dev` is beta.
