# Project Overview PDR

## Goal

Ship an unofficial Zernio CLI that is useful for humans and agents.

## Users

- Developers automating social media workflows.
- Agents that need JSON-first command output.
- Operators testing Zernio API endpoints from terminal.

## Requirements

- Install with `npm install -g zernio-cli`.
- Keep `zernio` binary and deprecated `late` alias.
- Support curated workflows and full OpenAPI endpoint access.
- Release stable from `main`, beta from `dev`.
- Never expose `NPM_TOKEN` or `ZERNIO_API_KEY`.

## Non-Goals

- No MCP server.
- No replacement for official Zernio docs.
- No local scheduling engine; Zernio remains source of truth.
