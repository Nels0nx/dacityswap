# @dacityswap/docs

The documentation site published at [docs.dacityswap.com](https://docs.dacityswap.com). Built
with [VitePress](https://vitepress.dev).

```bash
pnpm docs:dev       # http://localhost:3001, with hot reload
pnpm docs:build     # static site → apps/docs/.vitepress/dist
```

## Layout

```
index.md                  home page
guide/                    how escrow works, for buyers and sellers
protocol/                 the state machine, settlement, audit trail, guarantees
developers/               quickstart, references, integration, deployment
security/                 the security model, status, disclosure
resources/                FAQ, glossary, roadmap, changelog, legal
.vitepress/config.ts      navigation, sidebar, metadata
.vitepress/theme/         the DacitySwap look and three interactive components
public/                   logo, coin, social image, CNAME
```

## The interactive components run the real engine

`EscrowSimulator` (the live order), `FeeCalculator` and `StateDiagram` import `@dacityswap/escrow-core` from the
workspace. They hold no rules, rates or rounding of their own, so the site cannot show a number
or allow a move that the engine would not.

## Writing

- Say only what the code does. A difference between a page and the code is a bug.
- Mark anything that is not live yet with `<p class="status">…</p>` at the top of the page.
- Take example numbers from the engine, not from a calculator.

## Publishing

docs.dacityswap.com is a Render static site built from `main`:

| Setting           | Value                                          |
| ----------------- | ---------------------------------------------- |
| Root directory    | (empty: the repository root)                   |
| Publish directory | `apps/docs/.vitepress/dist`                    |
| Environment       | `NODE_VERSION=22`                              |
| Custom domain     | `docs.dacityswap.com`, a DNS `CNAME` to Render |

Build command:

```sh
npx -y pnpm@10.19.0 install --frozen-lockfile --filter "@dacityswap/docs..." && npx -y pnpm@10.19.0 --filter @dacityswap/docs build && cd apps/docs/.vitepress/dist && find . -name "*.html" ! -name "index.html" ! -name "404.html" | while read f; do mkdir -p "${f%.html}"; cp "$f" "${f%.html}/index.html"; done
```

The last part copies every page to `page/index.html`, so clean URLs such as `/guide/try-it`
work on a host that does not map them to `.html` by itself. Any other static host works the
same way: build with `pnpm docs:build` and publish `apps/docs/.vitepress/dist`.
