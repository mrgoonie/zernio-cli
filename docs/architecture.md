# Architecture

## Shape

The CLI is a single TypeScript package.

```text
src/
  commands/      yargs command groups
  generated/     OpenAPI catalog generated from docs/openapi
  utils/         config, output, HTTP request helpers
scripts/         build-time helpers
docs/openapi/    bundled Zernio OpenAPI spec
```

## Boundaries

- Curated commands use `@zernio/node` where the SDK offers stable workflow methods.
- `api:*` commands use raw HTTP so every OpenAPI endpoint is reachable.
- `media:upload` remains special because uploads require presign + direct PUT.
- No MCP server is included.

## Config

Resolution order:
1. CLI one-off flags where supported
2. `ZERNIO_API_KEY`, `ZERNIO_API_URL`
3. `~/.zernio/config.json`
4. deprecated `LATE_*` and `~/.late/config.json`

Diagnostics report secret sources only, never values. Cwd dotenv loading is opt-in through `ZERNIO_CLI_LOAD_ENV=1` for local development, not automatic in the published CLI.

## OpenAPI Generation

`npm run generate:openapi` reads `docs/openapi/zernio-api-openapi.yaml` and writes `src/generated/openapi-catalog.ts`.

Generated output is deterministic so build/test does not create timestamp churn.
