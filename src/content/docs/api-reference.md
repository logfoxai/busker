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
| `start` | [`Point`](#point) | `[0.5, 0.5]` | Where the cursor rests before the first beat, as a fraction of the root's size. |
| `motion` | [`MotionConfig`](#motionconfig) | see below | Glide timing for all `{ click }` and `{ move }` steps. |
| `clickTargets` | `string[]` | none | Selectors that look clickable and count for the miss hint. |
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

## `Point`

`[number, number]` — a spot as a fraction of the mock root (`[0.5, 0.5]` is center). Used for routine [`start`](#routine) and `{ move: [x, y] }` steps. The optional `start` argument to [`compile()`](#compilesteps-resolvetarget-motion-start) uses the same tuple shape but in **pixels**, not fractions.

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

## `ResolveTarget`

Type exported as **`ResolveTarget`**. It is **not** a function busker gives you — you **pass your own** into [`compile()`](#compilesteps-resolvetarget-motion-start) so glide lengths can be computed from distances.

```typescript
type ResolveTarget = (to: string | Point, from: Point) => Point | null;
```

| Argument | Meaning |
|---|---|
| `to` | The selector or fractional [`Point`](#point) from a `{ click }` or `{ move }` step. |
| `from` | Cursor position in **px** (root coordinates) when this step starts. |

Return the destination in **px** from the mock root's top-left. Return **`null`** when a selector is not in layout yet (compile assumes ~zero travel; at runtime `busk()` may remeasure and stretch the glide).

`busk()` builds a `ResolveTarget` from the live DOM. In unit tests you stub fixed coordinates — see [`compile()` for tests](./compile.md).

## `Glide`

One timed cursor segment from a `{ click }` or `{ move }` step. Output of [`compile()`](#compilesteps-resolvetarget-motion-start) only — not passed on [`Routine`](#routine).

| Field | Type | What it does |
|---|---|---|
| `to` | `string \| Point` | Same target as the step (selector or fraction). See [`Point`](#point). |
| `from` | `number` | Ms from loop start when the glide begins. |
| `until` | `number` | Ms when the cursor arrives at `to`. |
| `press` | `number` | Optional. On `{ click }` steps only: ms when the demo press runs and the element is `.click()`ed (after dwell). Absent on `{ move }` glides. Read-only output of [`compile()`](#compilesteps-resolvetarget-motion-start). |

## `ScheduledRun`

One `{ run }` step on the timeline. Output of [`compile()`](#compilesteps-resolvetarget-motion-start) only — not passed on [`Routine`](#routine).

| Field | Type | What it does |
|---|---|---|
| `at` | `number` | Ms from loop start when `run` fires once per lap. |
| `run` | `() => void` | Same function you put in the `{ run }` step. |

## `compile(steps, resolveTarget, motion?, start?)`

Runs the same scheduler as `busk()` without a DOM — for tests and assertions. Walkthrough: [`compile()` for tests](./compile.md).

| Argument | Type | Default | What it does |
|---|---|---|---|
| `steps` | [`Step[]`](#step) | &mdash; | Same script you would pass on a routine. |
| `resolveTarget` | [`ResolveTarget`](#resolvetarget) | &mdash; | Maps each glide target to px (or `null`). |
| `motion` | [`MotionConfig`](#motionconfig) | `DEFAULT_MOTION` | Same glide timing as on a routine. |
| `start` | `[number, number]` (px) | `[0, 0]` | Cursor position before the first step. Same tuple shape as [`Point`](#point), but **pixels**, not fractions. `busk()` converts routine `start` fractions to px first. |

Returns:

| Field | Type | What it does |
|---|---|---|
| `glides` | [`Glide[]`](#glide) | One entry per `{ click }` or `{ move }` step, in order. |
| `runs` | [`ScheduledRun[]`](#scheduledrun) | One entry per `{ run }` step. |
| `duration` | `number` | Loop length in ms (includes ring time after the last click). |

## `compileStepStarts(steps, resolveTarget, motion?, start?)`

Same arguments as [`compile()`](#compilesteps-resolvetarget-motion-start). Returns `number[]` — ms from loop start when each step **begins**, in script order (including `{ wait }` and `{ run }` steps).

## `Busker`

| Member | What it does |
|---|---|
| `duration` | Loop length in ms from compiled `steps`. |
| `play()` | Start or resume. A no-op once a visitor has taken over. |
| `pause()` | Hold where it is. |
| `stepAside()` | Hand the mock to the visitor: stop for good, hide the cursor. |
| `destroy()` | Stop everything and remove every class, listener, and observer busker added. |

← [`compile()` helper](./compile.md) &middot; [Styling](./styling.md)
