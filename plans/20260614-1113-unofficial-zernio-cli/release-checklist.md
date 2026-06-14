# Release Checklist

- [x] `npm ci`
- [x] `npm run generate:openapi`
- [x] `npm run build`
- [x] `npm test`
- [x] `npm audit --omit=optional`
- [x] Configure `NPM_TOKEN` repo secret.
- [x] Configure `GITHUB_TOKEN` workflow permissions for release notes.
- [ ] Create/push `dev` branch for beta prereleases.
- [ ] Merge to `main` for stable release.

## Branch Policy
- `main`: stable public release.
- `dev`: beta prerelease channel.

## Unresolved Questions
- None.
