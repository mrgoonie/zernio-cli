# Agentize Decisions

## Mode
- CLI only.
- Reason: user explicitly said no MCP because media upload is not suitable for MCP.

## Capability Map
| Capability | Entry | Inputs | Outputs | Side Effects | Auth | Agent Value | CLI Value |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Curated workflows | Existing yargs commands | Flags/files | JSON result | API writes for mutating commands | Yes | High | High |
| Catalog API | `api:catalog` | tags/search/method/path | Endpoint list | None | No | High | High |
| Describe API | `api:describe` | operation or method/path | Params/requestBody metadata | None | No | High | High |
| Generic API call | `api:call` | operation/path, path/query/body/form/file | API response | API call | Yes | High | High |
| Doctor | `doctor` | none | redacted config/report | Network with `--connection` | Optional | High | Medium |
| Platforms | `platforms:list` | none | Supported platforms | None | No | Medium | High |

## Command Decisions
- Use colon commands to match existing CLI style.
- Keep `--pretty`; add `--json` alias for agent familiarity.
- Generic API command returns concise structured errors and rate-limit metadata.
- Mutating generic calls are allowed because CLI user explicitly invokes method/operation; support `--dry-run` to preview request.

## Package Metadata
- NPM name: `zernio-cli`.
- Repository: `https://github.com/mrgoonie/zernio-cli`.
- License: MIT.
- Author: `mrgoonie`.

## Unresolved Questions
- None.
