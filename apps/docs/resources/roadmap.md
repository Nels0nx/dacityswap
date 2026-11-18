# Roadmap

What is done, what is next and what it depends on. Dates are deliberately absent: several steps
depend on legal and regulatory answers that cannot be scheduled.

## Done

- [x] Escrow state machine with deadlines, roles and split rulings
- [x] Fee engine and settlement maths, with a conservation property test
- [x] Record verification (`verifyRecord`)
- [x] Escrow contract: full lifecycle, deferred payments, two-step ownership
- [x] Contract test suite: unit, fuzz, shared vectors, invariants
- [x] Web app: catalogue, checkout, orders, selling, disputes
- [x] This documentation

## Next

- [ ] **Company and legal set-up**, in progress: the company, a legal opinion on the operating
      model and a licensed payment partner. Trading opens when it is complete
- [ ] Publish `@dacityswap/escrow-core` to npm
- [ ] Static analysis of the contract in CI
- [ ] A delivery connector interface, so a game that exposes delivery data can confirm a
      delivery without the buyer
- [ ] Public testnet deployment with a walkthrough
- [ ] Independent audit of the contract, report published

## Before launch

None of these steps waits for a particular game. Where GTA VI fits is explained on
[GTA VI and launch timing](/guide/gta-vi-and-launch).

- [ ] API service, database and authentication
- [ ] Card payments through a licensed provider's marketplace product
- [ ] Seller verification and payouts
- [ ] Dispute tooling, evidence handling and buyer–seller chat
- [ ] Signed receipts, so each party holds its own copy of an order's history
- [ ] Bug bounty
- [ ] Production contract deployment behind a multisig and timelock

## Under consideration

- Funding with a signed permit, to save the buyer an approval transaction
- A panel of arbiters in place of a single one
- Per-category windows: a vehicle and a cash drop do not take the same time to deliver

## How to influence it

Open an issue on [GitHub](https://github.com/Nels0nx/dacityswap/issues) describing the
problem you have. For changes to the engine or the contract, read
[CONTRIBUTING](https://github.com/Nels0nx/dacityswap/blob/main/CONTRIBUTING.md) first: they
are held to a stricter bar than the rest.
