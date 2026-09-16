# API reference

```typescript
import {busk, compile} from '@logfox/busker';

const show = busk(root, routine);
```

## `busk(root, routine)`

Puts on a show inside `root`, an `HTMLElement`. Returns a [`Busker`](#busker). Starts by itself once the root is on screen.

## `Routine`

A routine is one of two things, never a mix. A `ScriptRoutine` has `steps` and
gets its loop length from them; a `TimedRoutine` has a `duration` you set
yourself. Mixing the two is a type error.

| Field | Type | Default | What it does |
|---|---|---|---|
| `steps` | [`Step[]`](#step) | &mdash; | A click-driven script. Required in a `ScriptRoutine`. |
| `duration` | `number` | &mdash; | Loop length in ms. Required in a `TimedRoutine`. |
| `moves` | [`Move[]`](#move) | none | Hand-timed cursor glides. `TimedRoutine` only. |

Shared fields:

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
| `baseMoveMs` | `200` | Added to every glide before distance scaling. |
| `pxPerSecond` | `500` | Travel speed once distance is known. |
| `minMoveMs` | `280` | Shortest glide. |
| `maxMoveMs` | `900` | Longest glide. |
| `dwellMs` | `250` | Hover on target before a `{ click }` presses. |

Easing is fixed in-out cubic (`easeInOutCubic` in the package exports).

## `compile(steps, resolveTarget, motion?, start?)`

Lays a script out on a timeline for tests or syncing hand-timed toggles. `resolveTarget(to, from)` returns the destination in px relative to the root (or `null` if missing). Returns `{ moves, duration, tasks }` — same shape the runtime uses internally.

## `Task`

| Field | Type | What it does |
|---|---|---|
| `at` | `number` | Ms from loop start when `run` fires once. |
| `run` | `() => void` | Your code. |

## `Move`

A hand-timed glide. See [Hand-timed routines](./timeline.md#moves).

| Field | Type | What it does |
|---|---|---|
| `to` | `string \| [number, number]` | Where to glide. |
| `from` | `number` | When it sets off. |
| `until` | `number` | When it arrives. |
| `press` | `number` | Optional. Animates a press. Does **not** click. |

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

← [Hand-timed routines](./timeline.md) &middot; [Styling](./styling.md)
