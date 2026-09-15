# Click-driven routines

A routine is a list of places the cursor goes. At each stop it presses the element for real, so the mock changes through the handlers you already wrote. You never say *when* a page should change, only *what* gets clicked &mdash; the change is caused, not timed.

Scene changes, modals, and loop resets are **your** click handlers, `tasks`, `onLoop`, or `{ run }` steps &mdash; busker only drives the pointer and the clock.

```typescript
wireScenes(root);

busk(root, {
    start: [0.55, 0.25],
    onLoop: () => wireScenes(root, 'home'),
    steps: [
        {click: '[data-nav-item="alerts"]', wait: 900, moveFor: 550},
        {click: '[data-row="p0"]', wait: 1500, moveFor: 700},
        {click: '[data-close]', wait: 2600},
        {to: [0.55, 0.25], wait: 900, moveFor: 900},
    ],
    routes: ['[data-nav-item="home"]', '[data-nav-item="alerts"]', '[data-row="p0"]'],
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

…or runs your code (no cursor move):

| Field | Default | What it does |
|---|---|---|
| `run` | &mdash; | Function called once when this beat starts. |
| `wait` | `0` | Pause before `run` fires. |

A drift is how you get the cursor back out of the way before the loop starts over, or park it somewhere neutral while something animates on its own.

## Timing a routine

Time goes into `wait`, not into the glide. `wait` is how long a visitor gets to look at what just appeared; `moveFor` is only the travel. A step that opens something dense wants a long `wait` on the *next* step, not a slow glide on this one.

A press is a stroke rather than an instant: the cursor goes down on the target, and the real click fires as it lifts.

Because the beats are relative, you can drop a step into the middle of a routine and nothing after it needs touching.

## Routes

`routes` is a list of **selectors** for elements that should look clickable and count as hits when a visitor clicks (so dead clicks still get the miss hint):

```typescript
routes: ['[data-nav-item="alerts"]', '[data-filter]'],
```

Busker does **not** change your UI. Wire `click` handlers (or rely on scripted `steps` clicks) for scenes, filters, and modals.

## Tasks and `onLoop`

For hand-timed routines, or extra beats without cursor motion:

```typescript
tasks: [{at: 16_000, run: () => resetMyMock()}],
onLoop: () => resetMyMock(),
```

`onLoop` runs when the playhead wraps to 0. `tasks` fire once per loop when `elapsed` reaches `at`.

## Where the cursor starts

`start` is where the cursor rests before the first beat and after a drift, as a fraction of the root: `[0.55, 0.25]` is a bit right of centre, a quarter of the way down. It defaults to the middle.

## Reading positions

Targets are resolved from the DOM on every frame, so a routine keeps working when the mock reflows, when the container resizes, and at every breakpoint.

← [Markup](./markup.md) &middot; Next: [Hand-timed routines](./timeline.md)
