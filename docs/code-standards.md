# Code Standards

- TypeScript ESM.
- Node 20+.
- yargs for command routing.
- JSON output by default.
- `src/generated/openapi-catalog.ts` is generated only.
- Keep new code files focused and under 200 lines where practical.
- Use plain HTTP helpers for generic OpenAPI calls.
- Use `@zernio/node` for curated SDK workflows.
- Do not log API keys, tokens, or full Authorization headers.
