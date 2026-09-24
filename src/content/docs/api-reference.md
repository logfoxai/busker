# API reference

```typescript
import {busk, compile} from '@logfox/busker';

const show = busk(root, routine);
```

## `busk(root, routine)`

Puts on a show inside `root`, an `HTMLElement`. Returns a [`Busker`](#busker). Starts by itself once the root is on screen.

## `Routine`

Every routine has a non-empty **`steps`** array. Loop length is compiled from those steps (plus the ring on the last click). `busk()` validates the routine up front (runtyp) and throws before touching the DOM if the shape is wrong or includes unknown fields (including v1 parallel schedules like `toggles` or `duration`).

| Field | Type | Default | What it does |
|---|---|---|---|
| `steps` | [`Step[]`](#step) | &mdash; | **Required.** The only timeline. |

| Field | Type | Default | What it does |
|---|---|---|---|
| `start` | `[number, number]` | `[0.5, 0.5]` | Where the cursor rests, as a fraction of the root's size. |
| `motion` | [`MotionConfig`](#motionconfig) | see below | Glide timing for all `{ click }` and `{ move }` steps. |
| `clickTargets` | `string[]` | none | Selectors that look clickable and count for the miss hint. |
| `onLoop` | `() => void` | none | Called when the playhead wraps to 0. |
| `visibility` | `number` | `1` | How much of the root must be on screen to run, as a fraction. |
| `freezeAt` | `number` | `0` | Frame to hold under `prefers-reduced-motion`. |
| `exploreHint` | `boolean \| string \| ExploreHintConfig` | `true` | A "Click to explore" pill that tails the visitor's pointer. On by default; pass `false` to disable, a string for your own label, or a config object. |

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

## `ExploreHintConfig`

| Field | Default | What it does |
|---|---|---|
| `text` | `"Click to explore"` | Pill label. |
| `dismissAfterMs` | `1800` | Ms after pop-in before auto pop-out (fixed for the visit; pointer motion does not extend it). |
| `durationMs` | &mdash; | Alias for `dismissAfterMs`. |
| `offsetX` | `1.75rem` | Gap to the right of the pointer (any CSS length). |

Exports: `EXPLORE_HINT_TEXT`, `EXPLORE_HINT_DISMISS_MS`, `EXPLORE_HINT_OFFSET_X`.

## `compile(steps, resolveTarget, motion?, start?)`

Lays the same script out without the DOM — for tests and assertions. `resolveTarget(to, from)` returns the destination in px relative to the root (or `null` if missing). Returns `{ moves, duration, tasks }` where **`tasks`** are scheduled `{ run }` steps only.

## `Task`

Output of [`compile()`](#compilesteps-resolvetarget-motion-start) — not passed on `Routine`.

| Field | Type | What it does |
|---|---|---|
| `at` | `number` | Ms from loop start when `run` fires once. |
| `run` | `() => void` | Your code. |

## `Move`

Compiled glide shape returned by [`compile()`](#compilesteps-resolvetarget-motion-start) — not passed on `Routine`.

## `Busker`

| Member | What it does |
|---|---|
| `duration` | Loop length in ms from compiled `steps`. |
| `play()` | Start or resume. A no-op once a visitor has taken over. |
| `pause()` | Hold where it is. |
| `stepAside()` | Hand the mock to the visitor: stop for good, hide the cursor. |
| `destroy()` | Stop everything and remove every class, listener, and observer busker added. |

← [`compile()` helper](./compile.md) &middot; [Styling](./styling.md)
