# System Architecture

```text
User / Agent
    |
    v
zernio CLI (yargs)
    |
    +-- curated commands -> @zernio/node SDK -> Zernio API
    |
    +-- api:* commands -> raw fetch helper -> Zernio API
    |
    +-- media:upload -> presign endpoint -> direct PUT upload URL
```

## Release Flow

```text
conventional commit
    |
push main/dev
    |
CI: install, generate, typecheck, test, audit
    |
semantic-release
    |
npm + GitHub release + changelog
```
