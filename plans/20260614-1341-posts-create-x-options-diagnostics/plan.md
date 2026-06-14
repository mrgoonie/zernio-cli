# posts:create X Options + Safe Diagnostics

## Context

- Issues: #5, #6, #7 in `mrgoonie/zernio-cli`
- Branch: `feat/posts-create-x-options-diagnostics`
- Worktree: `/Volumes/GOON/www/oss/zernio-cli-posts-create-x-options-diagnostics`
- Mode: `ck:vibe --tdd --ship` to stable `main`

## Resolution Scan

- #5 unresolved: `posts:create` has no `quoteTweetId`, `replyToTweetId`, or `replySettings` options.
- #6 unresolved: 401 errors still return only generic `Unauthorized` without safe post/account diagnostics.
- #7 unresolved: `posts:create` has no `threadItems`, `threadJson`, `threadFile`, or advanced `platformSpecificData` support.

## TDD Plan

1. Add failing tests for X platform data parsing. Complete.
2. Add failing tests for command payload mapping and validation. Complete.
3. Add failing tests for safe 401 diagnostics. Complete.
4. Implement parser/helper module and keep `posts.ts` focused. Complete.
5. Update README, CLI docs, roadmap, changelog, and zernio skill references. Complete.
6. Run build, unit tests, coverage, typecheck, audit. Complete.
7. Review, commit, push, PR, merge, watch stable CI. In progress.

## Acceptance Criteria

- `posts:create` accepts `--quoteTweetId`, `--replyToTweetId`, `--replySettings`.
- `posts:create` accepts `--threadJson` and `--threadFile`.
- Thread JSON accepts string arrays and object arrays with per-item `mediaItems`.
- `--platformSpecificData` accepts JSON object passthrough and merges explicit flags over it.
- X-specific options fail clearly if any selected account is not `twitter` or `x`.
- `quoteTweetId` rejects top-level `--media`; `replyToTweetId` rejects `replySettings`.
- Existing single-post payload remains unchanged when new options are absent.
- `--debug-safe` adds non-secret context for failed `posts:create`, especially HTTP 401.
- Docs state that with `threadItems`, top-level `--text` is display/search only.

## Validation

- `npm run build`
- `npm test`
- `npm run test:coverage`
- `npm run typecheck`
- `npm audit --omit=optional`

All local validation commands passed on 2026-06-14.

## Open Questions

- Backend may still return 401 for healthy accounts. CLI can surface safe diagnostics, but cannot force backend/account authorization success.
