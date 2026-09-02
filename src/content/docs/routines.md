# Click-driven routines

A routine is a list of places the cursor goes. At each stop it presses the element for real, so the mock changes through the handlers you already wrote. You never say *when* a page should change, only *what* gets clicked &mdash; the change is caused, not timed.

```typescript
busk(root, {
    scene: 'home',
    start: [0.55, 0.25],
    steps: [
        {click: '[data-nav-item="alerts"]', wait: 900, moveFor: 550},
        {click: '[data-row="p0"]', wait: 1500, moveFor: 700},
        {click: '[data-close]', wait: 2600},
        {to: [0.55, 0.25], wait: 900, moveFor: 900},
    ],
    routes: [
        {click: '[data-nav-item="alerts"]', scene: 'alerts'},
        {click: '[data-row="p0"]', scene: 'case'},
    ],
});
```

## Steps

Each step is one beat, and they run back to back. The loop is as long as the beats add up to &mdash; there is no `duration` to keep in step.

A step either presses something:

| Field | Default | What it does |
|---|---|---|
| `click` | &mdash; | Selector of the element to press. Really clicked. |
| `wait` | `0` | Pause before the cursor sets off. This is reading time for whatever the last press opened. |
| `moveFor` | `600` | How long the glide takes. |
| `dwell` | `250` | How long the cursor hovers on the target before pressing. |

…or drifts somewhere without pressing:

| Field | Default | What it does |
|---|---|---|
| `to` | &mdash; | A selector, or `[x, y]` as a fraction of the root's size. |
| `wait` | `0` | Pause before setting off. |
| `moveFor` | `600` | How long the glide takes. |

A drift is how you get the cursor back out of the way before the loop starts over, or park it somewhere neutral while something animates on its own.

## Timing a routine

Time goes into `wait`, not into the glide. `wait` is how long a visitor gets to look at what just appeared; `moveFor` is only the travel. A step that opens something dense wants a long `wait` on the *next* step, not a slow glide on this one.

Because the beats are relative, you can drop a step into the middle of a routine and nothing after it needs touching.

## Routes

A route says what a click does:

```typescript
routes: [
    {click: '[data-nav-item="alerts"]', scene: 'alerts'},
]
```

Routes do two jobs, which is the reason they are one list:

1. **They switch scenes** &mdash; for the cursor's clicks and for a visitor's, identically.
2. **They mark what is clickable.** Every route target gets `is-interactive`, which is what gives it a pointer cursor. So the things that look clickable are exactly the things that are, with no CSS list to maintain alongside.

Anything your own handlers do &mdash; opening a modal, filtering a table, toggling a row &mdash; needs no route at all. Busker clicked the element; your code took it from there. Routes are only for the part busker owns, which is which scene is up.

## Where the cursor starts

`start` is where the cursor rests before the first beat and after a drift, as a fraction of the root: `[0.55, 0.25]` is a bit right of centre, a quarter of the way down. It defaults to the middle.

## Reading positions

Targets are resolved from the DOM on every frame, so a routine keeps working when the mock reflows, when the container resizes, and at every breakpoint. There are no coordinates to re-measure after a design change &mdash; if the button moved, the cursor moves with it.

← [Markup](./markup.md) &middot; Next: [Hand-timed routines](./timeline.md)
