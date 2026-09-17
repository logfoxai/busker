# Timed extras

The cursor follows [`steps`](./routines.md). Loop length comes from that script. Some visuals still need to happen on a clock — chart ticks, a toast, typing in a field — without a click. Use **`toggles`**, **`typing`**, and **`countdowns`** with absolute `from` / `until` times in ms on the same loop.

Use [`compile()`](./api-reference.md#compilesteps-resolvetarget-motion-start) when you need those times to line up with compiled glides (after waits and clicks).

```typescript
busk(root, {
    steps: [
        {wait: 1400},
        {click: '[data-open]'},
        {wait: 2000},
    ],
    toggles: [
        {target: '[data-sparkline]', class: 'points-5', from: 1400, until: 99_999},
    ],
    typing: [
        {target: '[data-input]', text: 'why did checkout fail?', from: 4000, until: 6200, clearAt: 7000},
    ],
    countdowns: [
        {target: '[data-clock]', startSeconds: 90},
    ],
});
```

Invalid routines (unknown fields, bad step shapes) throw at `busk()` before playback starts.

## toggles

Holds a class on an element for a slice of the loop.

```typescript
{target: '[data-modal]', class: 'is-open', from: 3000, until: 11_000}
```

## typing

Writes text a character at a time into an element's `textContent`.

```typescript
{target: '[data-input]', text: 'hello', from: 4000, until: 5200, clearAt: 6000}
```

## countdowns

Ticks a `m:ss` clock down over the loop.

```typescript
{target: '[data-clock]', startSeconds: 90}
```

## Freezing for reduced motion

Under `prefers-reduced-motion: reduce` busker renders one frame and stops. Pick which frame with `freezeAt` (ms on the compiled loop).

← [Click-driven routines](./routines.md) &middot; Next: [When a visitor takes over](./taking-over.md)
