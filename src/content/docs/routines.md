# Click-driven routines

A routine is a **script**: a list of steps that run top to bottom, loop after loop. Each step does exactly one thing — click, wait, move the cursor, or run your code. There is no second timeline for UI state: if a click causes a change, you list the click and your handler does the rest. Change a `{ wait: … }` and nothing else drifts.

```typescript
wireScenes(root);

busk(root, {
    start: [0.55, 0.25],
    onLoop: () => wireScenes(root, 'home'),
    steps: [
        {wait: 900},
        {click: '[data-nav-item="alerts"]'},
        {wait: 1500},
        {click: '[data-row="p0"]'},
        {wait: 2600},
        {click: '[data-close]'},
        {wait: 900},
        {move: [0.55, 0.25]},
    ],
    clickTargets: ['[data-nav-item="home"]', '[data-nav-item="alerts"]', '[data-row="p0"]'],
});
```

## Steps

| Step | What it does |
|---|---|
| `{ click: 'selector' }` | Glide to the element, dwell, press, and **really** `.click()` it. |
| `{ wait: ms }` | Pause — reading time after whatever just opened or happened. |
| `{ move: selector \| [x, y] }` | Glide somewhere **without** pressing (park the cursor before the loop ends). |
| `{ run: () => void }` | Your code once, cursor stays put (keyboard shortcut, sync another animation, etc.). |

That is the whole vocabulary for click-driven shows. Pauses are never folded into click steps, so the script reads like a storyboard.

## Cursor motion (`motion`)

Glide speed is **not** on each step. Pass `motion` once on the routine (defaults are tuned for product mocks):

```typescript
busk(root, {
    motion: {
        pxPerSecond: 580,
        easing: [0.4, 0, 0.2, 1],
        dwellMs: 250,
    },
    steps: [/* … */],
});
```

Busker measures distance in pixels when each glide starts. **Duration = distance ÷ `pxPerSecond`** — same speed on every glide, no max cap that turns long crosses into teleports. Progress along the line uses **`easing`**, a CSS-style cubic-bezier (default `[0.4, 0, 0.2, 1]`).

Each loop re-compiles the script from fresh layout. If a step target sits in a scene that is hidden on that compile (typical for multi-scene mocks), busker **remeasures that glide when the playhead reaches it** and stretches the rest of the timeline so every glide still uses the same `pxPerSecond` and `easing`.

## Click targets

`clickTargets` is the list of **selectors** that should look clickable and count as hits when a visitor clicks (dead clicks still get the miss hint):

```typescript
clickTargets: ['[data-nav-item="alerts"]', '[data-filter]'],
```

Busker does **not** change your UI. Wire `click` handlers (or rely on scripted `{ click }` steps) for scenes, filters, and modals.

## Tasks and `onLoop`

Absolute-time `tasks` and `onLoop` are for hand-timed extras or loop reset — not for UI that a click should cause:

```typescript
tasks: [{at: 16_000, run: () => resetAmbientAnimation()}],
onLoop: () => wireScenes(root, 'home'),
```

`onLoop` runs when the playhead wraps to 0, after the last step (including ring-out on a final click).

## Where the cursor starts

`start` is where the cursor rests before the first step, as a fraction of the root: `[0.55, 0.25]` is a bit right of centre, a quarter of the way down. It defaults to the middle.

## Migrating from v1

v1 let you bundle `wait`, `moveFor`, and `dwell` on the same step as `click`, and used `{ to: … }` for drifts. v2 splits those apart:

| v1 | v2 |
|---|---|
| `{ click: '…', wait: 900, moveFor: 550 }` | `{ wait: 900 }, { click: '…' }` |
| `{ to: [0.5, 0.5], wait: 900 }` | `{ wait: 900 }, { move: [0.5, 0.5] }` |
| `{ run: fn, wait: 400 }` | `{ wait: 400 }, { run: fn }` |
| per-step `moveFor` / `dwell` | optional routine `motion` |

Need the loop length for hand-timed toggles or typing? Use `compile()` from `@logfox/busker` with the same steps and a distance resolver — see [API reference](./api-reference.md).

← [Markup](./markup.md) &middot; Next: [Hand-timed routines](./timeline.md)
