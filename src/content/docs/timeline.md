# Hand-timed routines

Some of a demo is not caused by clicking. Logs stream in, a notification arrives, a countdown runs out, an assistant types a reply. Nothing pressed a button; it just happens. For that, give busker a `duration` and lay the events out on it.

```typescript
busk(root, {
    duration: 20_000,
    toggles: [
        {target: '[data-toast]', class: 'is-open', from: 3000, until: 11_000},
    ],
    typing: [
        {target: '[data-input]', text: 'why did checkout fail?', from: 4000, until: 6200, clearAt: 7000},
    ],
    countdowns: [
        {target: '[data-clock]', seconds: 90},
    ],
    moves: [
        {to: '[data-send]', from: 6400, until: 7000, press: 7100},
    ],
});
```

Use whichever pieces you need; they are all optional.

## Which mode to use

Pick by asking what makes the thing on screen change.

| The mock changes because… | Use |
|---|---|
| something was clicked | [`steps`](./routines.md) |
| time passed | `duration` and the fields below |

`steps` and `duration` are the two ways in. Give busker `steps` and the loop length comes from the routine; give it `duration` and you are timing everything yourself. A demo that is mostly clicks with one timed flourish is usually better as clicks plus a CSS animation on the element than as a hand-timed routine.

## toggles

Holds a class on an element for a slice of the loop. This is how a modal opens, a row highlights, or a banner slides in.

```typescript
{target: '[data-modal]', class: 'is-open', from: 3000, until: 11_000}
```

The class goes on at `from` and comes off at `until`. What that looks like is up to your CSS.

## typing

Writes text into an element a character at a time. It starts slow and speeds up, which reads more like a person than a constant rate does.

```typescript
{target: '[data-input]', text: 'hello', from: 4000, until: 5200, clearAt: 6000}
```

The whole string is on screen at `until`. `clearAt` wipes it &mdash; the moment the message was sent.

Busker sets `textContent`, so point it at a `<span>` inside your fake input rather than at a real `<input>`.

## countdowns

Ticks a `m:ss` clock down over the loop and stops at zero.

```typescript
{target: '[data-clock]', seconds: 90}
```

## moves

Glides the cursor on your timings instead of a routine's.

```typescript
{to: '[data-send]', from: 6400, until: 7000, press: 7100}
```

`press` animates the press &mdash; the squash and the ripple. **It does not click anything.** In hand-timed mode you are already saying what changes and when, so a real click would fire it twice. If you want the click to be the cause, that is what [`steps`](./routines.md) is for.

## Freezing for reduced motion

Under `prefers-reduced-motion: reduce` busker renders one frame and stops, with the cursor hidden. Pick which frame with `freezeAt`:

```typescript
busk(root, {duration: 20_000, freezeAt: 8000, /* … */});
```

Choose the moment that shows the point of the demo &mdash; the modal open, the reply written. It defaults to `0`, which for most routines is an empty starting state.

← [Click-driven routines](./routines.md) &middot; Next: [When a visitor takes over](./taking-over.md)
