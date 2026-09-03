# Styling

`busker.css` is optional. It styles the cursor, the ripple, the pointer affordance, the miss hint, and scene switching &mdash; about 100 lines, all scoped to `.busker`.

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

Busker only sets `left`, `top`, and the `is-*` classes. Everything else is yours.

## Scenes

Scenes are stacked on top of each other and cross-fade, so the one going out
fades under the one coming in instead of popping. `visibility` waits out the
fade on the way out, which keeps a scene nobody can see from being read aloud or
tabbed into.

Because they are stacked, they are out of flow, and **the element holding them
needs a height of its own** &mdash; from a parent, a grid track, or its own
rule. Without one it collapses and the mock looks empty. In exchange the mock
never changes height when the scene changes.

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
