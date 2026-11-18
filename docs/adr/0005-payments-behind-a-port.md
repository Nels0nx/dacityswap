# ADR 0005: Payments sit behind a port

- Status: accepted
- Date: 2026-11-17

## Context

The demo cannot take real payments, and it is not yet known which providers will accept the
business. The checkout still has to be built now and kept later.

## Decision

Checkout depends on a `PaymentProvider` interface with two methods, `createIntent` and
`confirm`. The demo registers two simulators. Adapters are chosen in one file,
`apps/web/src/lib/payments/index.ts`.

## Consequences

- The checkout UI, the escrow flow and the error states are real and are kept.
- Changing provider, or running several, does not touch the UI.
- The simulators run in the browser. Real adapters must run on the server, so the port will move
  behind an API endpoint with the same shape.
- The interface was designed without a real provider. Expect to adjust it at the first
  integration, most likely to add redirects for 3-D Secure.
