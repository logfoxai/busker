# Development

```bash
git clone https://github.com/logfoxai/busker.git
cd busker
npm ci
npm run astro:sync
npm run validate
```

After `npm ci`, run **`npm run astro:sync`** once so `.astro/types.d.ts` exists for the docs site (Starlight splash and guides). The editor uses `tsconfig.astro.json` for `.astro` files and `tsconfig.lib.json` for the library.

**Cmd+click class names** on the splash page (e.g. `splash-hero__lead` in `index.astro` → nested under `.splash-page .splash-hero` in `src/components/splash.css`): install [HTML CSS Support](https://marketplace.visualstudio.com/items?itemName=ecmel.vscode-html-css), then reload the window (`css.enabledLanguages` includes `astro` in `.vscode/settings.json`).

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | `tsc -p tsconfig.lib.json` → `dist/` |
| `npm run astro:sync` | Generates `.astro/types.d.ts` for docs / IDE |
| `npm test` | [kizu](https://github.com/mhweiner/kizu) specs under c8 coverage |
| `npm run lint` | `eslint --fix` |
| `npm run dev` | Alias for `astro:dev` |
| `npm run astro:dev` | The docs site at `localhost:4321` (only one dev server at a time) |
| `npm run astro:build` | The docs site → `docs-site/`. Skips `astro sync` while dev is listening so the dev server is not disturbed. |
| `npm run validate` | Everything CI runs, in the same order. Run it before you push — you can keep `astro:dev` up. |

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

Merges to `main` release through [AutoRel](https://github.com/mhweiner/autorel): the squash-merge title's conventional-commit type decides the semver bump, npm publish runs with `--publish`, and the docs site deploys in the same workflow. **`package.json` version is always `0.0.0-autorel` in git** — never bump it in a PR; AutoRel writes the released version to the tag/changelog/npm.

Use `feat:` and `fix:` for anything that ships, `feat!:` / `fix!:` for breaking changes, `docs:` for guides only.
