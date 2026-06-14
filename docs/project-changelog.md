# Project Changelog

## 2026-06-14

- Renamed package identity from official-style `@zernio/cli` to unofficial `zernio-cli`.
- Added deterministic OpenAPI catalog generation from bundled Zernio spec.
- Added `api:catalog`, `api:describe`, and `api:call`.
- Added header, raw-body, and safe retry header support for generic `api:call`.
- Added `doctor` and `platforms:list`.
- Replaced vulnerable `tsup` build path with plain `tsc`.
- Added CI, semantic-release, tests, audit gate, and release workflow validation gates.
- Hardened config handling: cwd dotenv loading is explicit opt-in, saved config files are private, and saved keys are not sent to arbitrary one-off hosts.
- Fixed `doctor --connection` so failed API checks exit non-zero for CI and scripts.
- Added coverage-gated tests for critical agent CLI paths: `api:*`, `doctor`, `platforms`, config, request construction, parsing, output, and error handling.
- Updated docs and skill guidance for media uploads, queue scheduling, errors, rate limits, and platforms.
