# Markup

Busker reads one required attribute on your mock (`data-cursor`) plus a few optional press hints. It writes back a handful of classes for the cursor and affordances. Nothing else is assumed: no wrapper components, no required class names, no shadow DOM.

## What busker reads

| Attribute | On | What it means |
|---|---|---|
| `data-cursor` | one element | The pointer. Busker positions it and shows the press. |

Anything else &mdash; nav, rows, buttons, modals, inputs &mdash; is just your markup, targeted by whatever selector you like in `steps`, `clickTargets`, and your own click handlers.

Optional press hints (yours to add):

| Attribute | On | What it means |
|---|---|---|
| `data-busker-press` | chip-style control | Gets demo `is-pressed` like a `<button>`. |
| `data-busker-no-press` | inline back / text link | Opt out of demo press. |
| `data-busker-menu` | dropdown panel | Row clicks inside do not press an outer `data-busker-press` trigger. |

## What busker writes

| Class | On | When |
|---|---|---|
| `busker` | the root | For as long as busker is running. Everything in `busker.css` hangs off it. |
| `is-interactive` | every `clickTargets` entry | Always. It is what makes clickable things look clickable. |
| `is-hover` | the current step target | Stand-in for `:hover` while the show runs (the fake cursor does not move the OS pointer). Toggled when the demo cursor reaches that target. **Pair with `:hover` in one rule** — `:is(:hover, .is-hover)` — never a separate busker-only stylesheet; see [Styling](./styling.md#demo-hover). |
| `is-pressing` | the cursor | For 200ms as it presses. |
| `is-pressed` | pressable step target | Same 200ms window on `button`, `[data-busker-press]`, or `[role="button"].is-interactive` — not `data-busker-no-press`. See [Styling](./styling.md#demo-press). |
| `is-ringing` | the cursor | For 500ms &mdash; the ripple outlives the press so the click reads. |
| `is-hint` | every `clickTargets` entry | For 1.5s after a visitor clicks something dead. |
| `is-aside` | the root | Once a visitor has taken over. |
| `is-visible` | the cursor, the explore hint | While each is showing. |

Busker removes all of them on `destroy()`. It does **not** toggle nav state, swap views, or add classes for your layout &mdash; that is your JavaScript and CSS.

One element is busker's own, not yours: when the routine sets [`exploreHint`](./taking-over.md#the-explore-hint), busker appends `[data-explore-hint]` to `document.body` (fixed to the visitor's pointer) and drives it. There is no markup to add &mdash; theme via CSS variables on `.busker` (see [Styling](./styling.md#explore-hint)).

## Your mock

Layout, colour, typography, and every UI change after a click are **100% yours**. Wire `click` handlers (or a framework) so scripted `{ click }` steps and visitor presses run the same code. Use any attributes and class names you want; busker only needs selectors that resolve when a step runs.

[`busker.css`](./styling.md) covers cursor affordances only (dot, ripple, miss hint, explore pill). It does not style your product UI.

## The root element

The root is the element you pass to `busk()`. Two things follow from that:

- **The cursor is positioned against it.** `busker.css` sets `position: relative` on `.busker` for you. If you are writing your own styles, the root needs to be a positioning context.
- **Visibility is measured on it.** The show runs while the root is on screen, which means the root should be the visible frame of the mock, not a wrapper that is taller than the viewport. See [`visibility`](./api-reference.md#routine) if you want to loosen that.

## The cursor

`[data-cursor]` can be any element. `busker.css` styles it as the soft dot busker's own demos use, sized by `--busker-cursor-size`. To draw your own pointer instead, put an `<svg>` in there and skip the cursor rules &mdash; see [Styling](./styling.md).

The cursor is hidden until `busk()` runs, so it never flashes on a page whose JavaScript has not loaded, and it stays hidden under `prefers-reduced-motion`.

← [Getting started](./getting-started.md) &middot; Next: [Click-driven routines](./routines.md)
