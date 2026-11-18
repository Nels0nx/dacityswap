# ADR 0002: Open the code that moves money, keep the defences private

- Status: accepted
- Date: 2026-11-17

## Context

Users are asked to send money to a platform they have no reason to trust yet. Open-sourcing
code is one way to earn that trust. Publishing everything, though, would also publish the fraud
rules, which makes them easier to beat.

## Decision

Draw the line at one question: _does this code decide what happens to a user's money?_

- **Open (Apache-2.0):** the escrow state machine, the fee engine, the escrow contract and the
  web client.
- **Closed:** fraud and risk scoring, KYC provider integrations, moderation, admin and dispute
  tooling.

The name and logo are not licensed with the code.

## Consequences

- Anyone can verify the fee a quote should show and the conditions under which funds release.
- The open parts must be the code that really runs. If the private back end ever diverges from
  `escrow-core`, the trust claim is false. CI on the private repository must test against the
  published package.
- Apache-2.0 allows competitors to reuse the engine. That is accepted: the engine is not the
  moat; liquidity and reputation are.
