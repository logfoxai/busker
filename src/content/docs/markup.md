# Markup

Busker reads your mock through five `data-` attributes and writes back a handful of classes. Nothing else is assumed: no wrapper components, no required class names, no shadow DOM.

## What busker reads

| Attribute | On | What it means |
|---|---|---|
| `data-cursor` | one element | The pointer. Busker positions it and shows the press. |
| `data-scene="home"` | a page of the mock | Optional. You toggle `.is-active` in your own code; see [Styling](./styling.md#optional-scene-cross-fade). |
| `data-nav="home"` | the same scene element | Which nav item is lit while this scene is up. |
| `data-nav-item="home"` | a nav button or link | Gets `is-active` when a scene claims it. |

Anything else &mdash; rows, buttons, modals, inputs &mdash; is just your markup, targeted by whatever selector you like.

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
| `is-active` | a scene, a nav item | While that scene is the one on screen. |
| `is-interactive` | every `clickTargets` entry | Always. It is what makes clickable things look clickable. |
| `is-hover` | the current step target | Stand-in for `:hover` while the show runs (the fake cursor does not move the OS pointer). Toggled when the demo cursor reaches that target. **Pair with `:hover` in one rule** — `:is(:hover, .is-hover)` — never a separate busker-only stylesheet; see [Styling](./styling.md#demo-hover). |
| `is-pressing` | the cursor | For 200ms as it presses. |
| `is-pressed` | pressable step target | Same 200ms window on `button`, `[data-busker-press]`, or `[role="button"].is-interactive` — not `data-busker-no-press`. See [Styling](./styling.md#demo-press). |
| `is-ringing` | the cursor | For 500ms &mdash; the ripple outlives the press so the click reads. |
| `is-hint` | every `clickTargets` entry | For 1.5s after a visitor clicks something dead. |
| `is-aside` | the root | Once a visitor has taken over. |
| `is-visible` | the cursor, the explore hint | While each is showing. |

Busker removes all of them on `destroy()`.

One element is busker's own, not yours: when the routine sets [`exploreHint`](./taking-over.md#the-explore-hint), busker appends `[data-explore-hint]` to `document.body` (fixed to the visitor's pointer) and drives it. There is no markup to add &mdash; theme via CSS variables on `.busker` (see [Styling](./styling.md#explore-hint)).

## The root element

The root is the element you pass to `busk()`. Two things follow from that:

- **The cursor is positioned against it.** `busker.css` sets `position: relative` on `.busker` for you. If you are writing your own styles, the root needs to be a positioning context.
- **Visibility is measured on it.** The show runs while the root is on screen, which means the root should be the visible frame of the mock, not a wrapper that is taller than the viewport. See [`visibility`](./api-reference.md#routine) if you want to loosen that.

## Scenes

A scene is one page of the mock. Busker does not switch scenes for you &mdash; your click handlers (or scripted `steps` clicks) toggle `is-active`. Optional `busker.css` can cross-fade stacked `[data-scene]` panels; see [Styling](./styling.md#optional-scene-cross-fade).

Scenes should not change on a timer. They change because something was clicked, so there is one cause and nothing to synchronise.

### Before JavaScript runs

Put `is-active` on the opening scene and its nav item in your HTML so the first paint matches t=0. `busker.css` hides inactive scene siblings until `busk()` adds `.busker`, so every scene does not flash at once.

Mirror the opening frame in markup when the first beats are `{ run }` steps (for example a default scene class). Clicks and `{ run }` steps take it from there &mdash; there is no separate toggle schedule.

## The cursor

`[data-cursor]` can be any element. `busker.css` styles it as the soft dot busker's own demos use, sized by `--busker-cursor-size`. To draw your own pointer instead, put an `<svg>` in there and skip the cursor rules &mdash; see [Styling](./styling.md).

The cursor is hidden until `busk()` runs, so it never flashes on a page whose JavaScript has not loaded, and it stays hidden under `prefers-reduced-motion`.

← [Getting started](./getting-started.md) &middot; Next: [Click-driven routines](./routines.md)
