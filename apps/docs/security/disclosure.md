# Reporting a vulnerability

If you have found a way to make money move wrongly, thank you. Please tell us privately first.

## How to report

**Do not open a public issue.**

Email **security@dacityswap.com**, or use _Report a vulnerability_ on the repository's
[Security tab](https://github.com/Nels0nx/dacityswap/security). Include:

- what you found and where;
- the steps or a test that reproduces it;
- what an attacker could do with it.

A failing Foundry or Vitest test is the most useful report there is.

## What happens next

| When                  | What                                       |
| --------------------- | ------------------------------------------ |
| Within 3 working days | We acknowledge the report                  |
| While we work on it   | We keep you informed and may ask questions |
| When the fix ships    | We credit you, unless you prefer otherwise |

Please give us a reasonable time to fix an issue before you publish it.

## Scope

| In scope                                                              | Out of scope                                      |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/contracts`: anything that lets funds move or stick wrongly  | Findings that need a compromised device or wallet |
| `packages/escrow-core`: illegal transitions, fee or settlement errors | Denial of service by volume alone                 |
| `apps/web`: injection, data exposure                                  | Payment adapters not yet connected                |
| A difference between this documentation and the code                  | Third-party services                              |

The last row on the left is deliberate. If the docs promise something the code does not do,
that is a security bug.

## Safe harbour

We will not pursue legal action against anyone who reports a vulnerability in good faith,
avoids harming users and data, and gives us time to respond.

## Bounty

There is no bug bounty yet. One will open before the contract holds real funds, and its terms
will be published on this page.
