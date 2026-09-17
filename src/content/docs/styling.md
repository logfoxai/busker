# Styling

`busker.css` is optional. It styles the cursor, the ripple, the pointer affordance, the miss hint, and an optional `[data-scene]` cross-fade recipe &mdash; about 100 lines, all scoped to `.busker`.

```typescript
import '@logfox/busker/busker.css';
```

Or copy it into your own stylesheet and edit it. There is nothing clever in there.

## Custom properties

Set these on the root, or anywhere above it:

| Property | Default | What it is |
|---|---|---|
| `--busker-accent` | `#7c3aed` | The press colour and the ripple. Set this to your brand colour. |
| `--busker-cursor-size` | `0.95rem` | Diameter of the dot. |
| `--busker-cursor-fill` | `rgb(0 0 0 / 0.42)` | The dot at rest. |
| `--busker-cursor-edge` | `#fff` | The ring around the dot that keeps it visible on dark UI. |
| `--busker-cursor-shadow` | `rgb(0 0 0 / 0.3)` | The dot's drop shadow. |
| `--busker-cursor-z-index` | `2147483647` | Keeps the pointer above in-mock overlays and modals. |
| `--busker-scene-ms` | `0.4s` | How long one scene takes to cross-fade into the next. |

```css
.my-mock {
    --busker-accent: #e5484d;
    --busker-cursor-size: 1.1rem;
}
```

## Drawing your own pointer

The default cursor is a soft dot rather than an arrow, because an arrow on a screenshot of an app reads as *your* mouse and people try to move it. If you want an arrow anyway, put one in the cursor element and drop the dot styling:

```html
<span data-cursor><svg viewBox="0 0 11 18" width="16"><path d="M0 0 L0 16 L4 12.5 L6.5 18 L9 17 L6.5 11.5 L11 11 Z"/></svg></span>
```

```css
.busker [data-cursor] {
    background: none;
    border: 0;
    box-shadow: none;
    height: auto;
    width: auto;
}
```

Busker only sets `translate` (position) and the `is-*` classes. Everything else is yours.

## Demo hover

### Why you cannot rely on `:hover` during the show

CSS `:hover` follows the **operating-system pointer**, not whatever is drawn on screen. The demo pointer is `[data-cursor]` with `pointer-events: none` (see `busker.css`) so it never steals clicks or hovers from the mock underneath. While the scripted cursor glides over a button, the visitor's mouse may still be on the hero copy — **no `:hover` on that button**, even though the demo looks like it is hovering there.

Dispatching synthetic `mouseenter` / `mousemove` from JavaScript does **not** reliably turn on `:hover` the way a real pointer move does, and it fights focus, menus, and accessibility. There is no supported way to "just use `:hover`" for the fake cursor without moving the visitor's actual mouse.

### What busker does instead

During the show, busker toggles `is-hover` on the **current step target** when the demo cursor overlaps that element (and through dwell and press for clicks). It does **not** set `is-hover` on every control the cursor passes over — only the wired target for the active step. After [takeover](./taking-over.md) (`.is-aside`), busker clears `is-hover`; only real `:hover` applies.

### How to style it (one rule, not two themes)

**Extend your existing `:hover` selectors** so demo and visitor look identical:

```css
.my-button:is(:hover, .is-hover) {
    background: var(--accent-muted);
}
```

Use the **same declaration block** you would use for `:hover` alone. Pair nested pieces too (child text, `::after`, compact variants):

```css
.my-row:is(:hover, .is-hover) .issue-title__text {
    color: var(--accent-deep);
}
```

**Do not** add a second block scoped to `.busker:not(.is-aside) … .is-hover` with different colors or opacities. That duplicates hover styling and is the usual reason demo hover looks "off" compared to poking the mock after takeover — two sources of truth drift apart.

You do **not** need `.is-interactive` in the selector for hover paint; busker only adds `is-interactive` for the pointer cursor and miss hint. Hover pairing belongs on the control's normal class names.

After a visitor takes over (`.is-aside`), `:hover` alone is enough; keep `:is(:hover, .is-hover)` anyway so one rule covers both phases.

## Demo press

While the cursor is down on a click step, busker adds `is-pressing` to `[data-cursor]` and `is-pressed` to **`button`**, **`[data-busker-press]`**, and **`[role="button"].is-interactive`** — the same window as a real `:active` (200ms). Mark chip-style controls with `data-busker-press`. Use `data-busker-no-press` on inline back lines and text links.

Pair pressed styles the same way as hover:

```css
.mock-btn {
    transition: background 0.16s ease, box-shadow 0.16s ease; /* not transform — snap press */
}

.mock-btn:is(:active, .is-pressed) {
    transform: scale(0.96);
    box-shadow: inset 0 1px 0 rgb(0 0 0 / 0.12);
}
```

Chip-style filters and nav items usually only need a darker background, not a scale. Omit `transform` from the base transition so press/release stay sharp. If the step selector hits a child inside a `<button>`, busker walks up to the pressable wrapper for `is-pressed`.

Dropdown fields: put `data-busker-press` on the chip trigger and `data-busker-menu` on the panel. Menu row clicks get demo hover on the row only — not `is-pressed` on the trigger behind them.

### Step target is a child of the visible control

`click` / `clickTargets` selectors often point at a inner node (for example `[data-live-trace="two"]` on a row inside a `<button.mock-logs__trace-drill>`). Busker puts `is-hover` on **that** node, not the outer button. If your `:hover` rule styles a child from the parent (`button:hover .row`), add a demo branch, e.g. `button:has(.row.is-hover) .row`, or pair `:is(:hover, .is-hover)` on the same element that receives `is-hover`.

## Optional scene cross-fade

Busker does not activate scenes. If your mock uses `[data-scene]` and toggles `.is-active` in your own JavaScript, `busker.css` can cross-fade them.

Before `busk()` runs, inactive scene siblings are hidden with `display: none` while the active one stays in flow, so SSR and the first paint do not show every page at once. Once `.busker` is on the root, scenes stack and cross-fade instead.

Because stacked scenes are out of flow, **the element holding them needs a height of its own** &mdash; from a parent, a grid track, or its own rule.

Set `--busker-scene-ms` to retime the fade, or turn it into a cut:

```css
.my-mock {
    --busker-scene-ms: 0s;
}
```

## Two lengths are in both places

`is-ringing` lasts 500ms and `is-hint` lasts 1.5s. Those numbers are in `busker.css` as animation durations and in the JavaScript as the moment it takes the class off again. Change one, change the other.

## Reduced motion

`busker.css` turns off the cursor transition and the hint animation under `prefers-reduced-motion: reduce`. The loop itself is already off &mdash; that is handled in JavaScript, not CSS, so a frozen mock costs nothing.

← [When a visitor takes over](./taking-over.md) &middot; Next: [API reference](./api-reference.md)
