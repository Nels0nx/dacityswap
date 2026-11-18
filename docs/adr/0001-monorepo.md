# ADR 0001: One repository, pnpm workspaces and Turborepo

- Status: accepted
- Date: 2026-11-17

## Context

The web app, the escrow engine and the contract must stay in step. A change to a fee rule
affects all three. They are written by the same small team.

## Decision

Keep them in one repository. Use pnpm workspaces to link packages and Turborepo to run and cache
tasks. `escrow-core` is consumed as TypeScript source and compiled by the app that imports it.

## Consequences

- A change that spans packages is one pull request and one CI run.
- There is no publish step for internal packages, and no version drift between them.
- `escrow-core` must stay free of browser-only and server-only APIs so that both can import it.
- If the engine is later published to npm for third parties, it will need its own build step.
