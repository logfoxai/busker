# Markup

Busker reads your mock through five `data-` attributes and writes back a handful of classes. Nothing else is assumed: no wrapper components, no required class names, no shadow DOM.

## What busker reads

| Attribute | On | What it means |
|---|---|---|
| `data-cursor` | one element | The pointer. Busker positions it and shows the press. |
| `data-scene="home"` | a page of the mock | One is shown at a time. Named in `scene` and in `routes`. |
| `data-nav="home"` | the same scene element | Which nav item is lit while this scene is up. |
| `data-nav-item="home"` | a nav button or link | Gets `is-active` when a scene claims it. |

Anything else &mdash; rows, buttons, modals, inputs &mdash; is just your markup, targeted by whatever selector you like.

## What busker writes

| Class | On | When |
|---|---|---|
| `busker` | the root | For as long as busker is running. Everything in `busker.css` hangs off it. |
| `is-active` | a scene, a nav item | While that scene is the one on screen. |
| `is-interactive` | every `routes` target | Always. It is what makes clickable things look clickable. |
| `is-hover` | the current target | From the moment the cursor lands until it sets off again. |
| `is-pressing` | the cursor | For 200ms as it presses. |
| `is-ringing` | the cursor | For 500ms &mdash; the ripple outlives the press so the click reads. |
| `is-hint` | every `routes` target | For 1.5s after a visitor clicks something dead. |
| `is-aside` | the root | Once a visitor has taken over. |

Busker removes all of them on `destroy()`.

## The root element

The root is the element you pass to `busk()`. Two things follow from that:

- **The cursor is positioned against it.** `busker.css` sets `position: relative` on `.busker` for you. If you are writing your own styles, the root needs to be a positioning context.
- **Visibility is measured on it.** The show runs while the root is on screen, which means the root should be the visible frame of the mock, not a wrapper that is taller than the viewport. See [`visibility`](./api-reference.md#routine) if you want to loosen that.

## Scenes

A scene is one page of the mock. Busker shows one at a time by putting `is-active` on it, and `busker.css` handles the display:

```css
.busker [data-scene] { display: none; }
.busker [data-scene].is-active { display: block; }
```

Override those two rules if you want scenes to cross-fade, slide, or stack.

Scenes never change on a timer. They change because something was clicked &mdash; by the cursor or by a visitor &mdash; and a [route](./routines.md#routes) said so. That is the whole point: there is one cause, so there is nothing to synchronise.

## The cursor

`[data-cursor]` can be any element. `busker.css` styles it as the soft dot busker's own demos use, sized by `--busker-cursor-size`. To draw your own pointer instead, put an `<svg>` in there and skip the cursor rules &mdash; see [Styling](./styling.md).

The cursor is hidden until `busk()` runs, so it never flashes on a page whose JavaScript has not loaded, and it stays hidden under `prefers-reduced-motion`.

← [Getting started](./getting-started.md) &middot; Next: [Click-driven routines](./routines.md)
