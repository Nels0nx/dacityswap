# Security policy

DacitySwap is software that decides when money moves. A flaw in it is a flaw in that decision,
so reports are taken seriously and handled privately.

## Reporting a vulnerability

Please **do not open a public issue**.

- Email **security@dacityswap.com**, or
- use **Report a vulnerability** on this repository's
  [Security tab](https://github.com/Nels0nx/dacityswap/security).

Include what you found and where, the steps or a test that reproduces it, and what an attacker
could do with it. A failing Foundry or Vitest test is the most useful report there is.

| When                  | What happens                               |
| --------------------- | ------------------------------------------ |
| Within 3 working days | We acknowledge the report                  |
| While we work on it   | We keep you informed and may ask questions |
| When the fix ships    | We credit you, unless you prefer otherwise |

Please give us a reasonable time to fix an issue before you publish it. We will not pursue
legal action against anyone who reports in good faith, avoids harming users and data, and
gives us time to respond.

## Scope

| In scope                                                              | Out of scope                                      |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/contracts`: anything that lets funds move or stick wrongly  | Findings that need a compromised device or wallet |
| `packages/escrow-core`: illegal transitions, fee or settlement errors | Denial of service by volume alone                 |
| `apps/web`: injection, data exposure                                  | The simulated payments of the demo                |
| A difference between the documentation and what the code does         | Third-party services                              |

## Current status

- The demo handles no real funds, credentials or personal data.
- `DacityEscrow.sol` is **unaudited** and has never been deployed to a production network. Do
  not use it with real funds. There is no official deployment; any address claiming to be one
  is not ours.
- There is no bug bounty yet. One will open before the contract holds real funds.

The security model, the threats it covers and the trust that remains are described at
[docs.dacityswap.com/security/model](https://docs.dacityswap.com/security/model).
