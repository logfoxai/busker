# Development

```bash
git clone https://github.com/logfoxai/busker.git
cd busker
npm ci
npm run validate
```

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | `tsc` → `dist/` |
| `npm test` | [kizu](https://github.com/mhweiner/kizu) specs under c8 coverage |
| `npm run lint` | `eslint --fix` |
| `npm run astro:dev` | The docs site at `localhost:4321` |
| `npm run astro:build` | The docs site → `docs-site/` |
| `npm run validate` | Everything CI runs, in the same order. Run it before you push. |

## Layout

| Path | What is in it |
|---|---|
| `src/timeline.ts` | The pure part: laying a routine out on a timeline, easing, interpolation, text. |
| `src/busk.ts` | The DOM part: the loop, clicks, observers, and classes. |
| `src/types.ts` | The public shape of a routine. |
| `busker.css` | Optional styling, shipped as-is. |
| `src/content/docs/` | These guides. Same files serve GitHub and the site. |
| `assets/` | Brand art. Also the docs site's `publicDir`. |

The split is deliberate: everything that can be tested without a DOM lives in `timeline.ts` and is tested exhaustively. `busk.ts` is tested through [happy-dom](https://github.com/capricorn86/happy-dom) with a hand-driven clock, for the behaviours that only exist in a browser &mdash; a scripted click not being mistaken for a visitor's, a beat firing exactly once per pass, `destroy()` leaving nothing behind.

## Docs

Guides are plain markdown with a `# Title` and no frontmatter, so they read correctly on GitHub and in the site from the same file. Relative `./page.md` links are rewritten to site slugs at build time.

## Releases

Merges to `main` release through [autorel](https://github.com/mhweiner/autorel): the PR title's conventional-commit type decides the version bump, and the docs site publishes in the same run. Use `feat:` and `fix:` for anything that ships, `docs:` for guides.
