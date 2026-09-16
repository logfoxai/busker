# API reference

```typescript
import {busk, compile} from '@logfox/busker';

const show = busk(root, routine);
```

## `busk(root, routine)`

Puts on a show inside `root`, an `HTMLElement`. Returns a [`Busker`](#busker). Starts by itself once the root is on screen.

## `Routine`

Every routine has a non-empty **`steps`** array. Loop length is compiled from those steps (plus the ring on the last click). Hand-timed **`duration`** / **`moves`** were removed in v2 — `busk()` throws if you pass them.

| Field | Type | Default | What it does |
|---|---|---|---|
| `steps` | [`Step[]`](#step) | &mdash; | **Required.** Click-driven script. |

| Field | Type | Default | What it does |
|---|---|---|---|
| `start` | `[number, number]` | `[0.5, 0.5]` | Where the cursor rests, as a fraction of the root's size. |
| `motion` | [`MotionConfig`](#motionconfig) | see below | Glide timing for all `{ click }` and `{ move }` steps. |
| `clickTargets` | `string[]` | none | Selectors that look clickable and count for the miss hint. |
| `tasks` | [`Task[]`](#task) | none | Callbacks at absolute times in the loop. |
| `onLoop` | `() => void` | none | Called when the playhead wraps to 0. |
| `toggles` | [`Toggle[]`](#toggle) | none | Classes held for a slice of the loop. |
| `typing` | [`Typing[]`](#typing) | none | Text that types itself. |
| `countdowns` | [`Countdown[]`](#countdown) | none | `m:ss` clocks. |
| `visibility` | `number` | `1` | How much of the root must be on screen to run, as a fraction. |
| `freezeAt` | `number` | `0` | Frame to hold under `prefers-reduced-motion`. |

## `Step`

One line in a click-driven script — exactly one of:

| Shape | What it does |
|---|---|
| `{ click: string }` | Glide, dwell, press, real click. |
| `{ wait: number }` | Pause the playhead (ms). |
| `{ move: string \| [number, number] }` | Glide without pressing. |
| `{ run: () => void }` | Run code once; cursor unchanged. |

## `MotionConfig`

| Field | Default | What it does |
|---|---|---|
| `pxPerSecond` | `580` | Constant travel speed (px/s). Glide ms = distance ÷ speed (+ short-hop floor below ~150px). |
| `minMoveMs` | `115` | Minimum glide time before short-hop extras. |
| `dwellMs` | `300` | Hover on target before a `{ click }` presses. |
| `easing` | `[0.4, 0, 0.2, 1]` | CSS cubic-bezier control points for glide progress. |

Exports: `cubicBezierEasing`, `DEFAULT_EASING`, `DEFAULT_MOTION`.

## `compile(steps, resolveTarget, motion?, start?)`

Lays a script out on a timeline for tests or syncing hand-timed toggles. `resolveTarget(to, from)` returns the destination in px relative to the root (or `null` if missing). Returns `{ moves, duration, tasks }` — same shape the runtime uses internally.

## `Task`

| Field | Type | What it does |
|---|---|---|
| `at` | `number` | Ms from loop start when `run` fires once. |
| `run` | `() => void` | Your code. |

## `Move`

Compiled glide shape returned by [`compile()`](#compilesteps-resolvetarget-motion-start) — not passed on `Routine`.

## `Toggle`

| Field | Type | What it does |
|---|---|---|
| `target` | `string` | Selector of the element. |
| `class` | `string` | Class held while the loop is inside `[from, until)`. |
| `from` | `number` | |
| `until` | `number` | |

## `Typing`

| Field | Type | What it does |
|---|---|---|
| `target` | `string` | Selector. Busker writes its `textContent`. |
| `text` | `string` | |
| `from` | `number` | Typing starts. |
| `until` | `number` | The whole string is on screen. |
| `clearAt` | `number` | Optional. Wipes it. |

## `Countdown`

| Field | Type | What it does |
|---|---|---|
| `target` | `string` | Selector. Busker writes its `textContent`. |
| `startSeconds` | `number` | Value at the top of every loop. Counts down to zero and stops. |

## `Busker`

| Member | What it does |
|---|---|
| `duration` | Loop length in ms: what you set, or what the `steps` add up to after scheduling. |
| `play()` | Start or resume. A no-op once a visitor has taken over. |
| `pause()` | Hold where it is. |
| `stepAside()` | Hand the mock to the visitor: stop for good, hide the cursor. |
| `destroy()` | Stop everything and remove every class, listener, and observer busker added. |

← [Timed extras](./timeline.md) &middot; [Styling](./styling.md)
