# ADR 0004: The scene uses original or openly licensed assets, never a publisher's

- Status: accepted (revised 2026-11-17)
- Date: 2026-11-17

## Context

The first idea for the hero was to take official game artwork, a poster or an in-game location,
and rework it into a 3D scene. That is ruled out. The artwork is the publisher's copyright and a
reworked version is still a derivative of it. Using it would also suggest an affiliation that
does not exist. Copyright infringement and false affiliation are exactly the claims a publisher
is currently bringing against a third-party marketplace.
That an image is widely shared online does not make it licensed.

A first version of the scene was fully procedural. It avoided the legal problem but looked
synthetic, and feedback asked for something that reads as a real place.

## Decision

Build the scene from assets that are original or openly licensed, and credit them:

- a real, public-domain photograph of Miami, the city this genre of game is modelled on, as
  the backdrop;
- a CC0 studio HDRI for lighting;
- 3D models generated from original text prompts, supplied by the project owner, or taken
  from openly licensed sample libraries;
- the coin, water and grading generated in code.

Every third-party asset is listed in `CREDITS.md` with its author and licence.

## Consequences

- Nothing in the product is a copy of a publisher's work, and nothing implies endorsement.
- The current photo is public domain but low resolution, and several sample models carry a
  third party's logo. Both are stand-ins to be replaced with commissioned or licensed assets
  before launch.
- Contributors must not add game assets. This is stated in `CONTRIBUTING.md`.
