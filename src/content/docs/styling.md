# Styling

`busker.css` is optional. It styles the cursor, the ripple, the pointer affordance, the miss hint, and scene switching &mdash; about 100 lines, all scoped to `.busker`.

```typescript
import 'busker/busker.css';
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

Busker only sets `left`, `top`, and the `is-*` classes. Everything else is yours.

## Scenes

Two rules handle scene switching:

```css
.busker [data-scene] { display: none; }
.busker [data-scene].is-active { display: block; }
```

Override them for a cross-fade &mdash; but keep the inactive scene out of the accessibility tree and out of layout, or the mock will be twice as tall as it looks:

```css
.busker [data-scene] {
    display: grid;
    grid-area: 1 / 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
    visibility: hidden;
}

.busker [data-scene].is-active {
    opacity: 1;
    pointer-events: auto;
    visibility: visible;
}
```

## Two lengths are in both places

`is-ringing` lasts 500ms and `is-hint` lasts 1.5s. Those numbers are in `busker.css` as animation durations and in the JavaScript as the moment it takes the class off again. Change one, change the other.

## Reduced motion

`busker.css` turns off the cursor transition and the hint animation under `prefers-reduced-motion: reduce`. The loop itself is already off &mdash; that is handled in JavaScript, not CSS, so a frozen mock costs nothing.

← [When a visitor takes over](./taking-over.md) &middot; Next: [API reference](./api-reference.md)
