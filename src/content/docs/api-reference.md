# API reference

```typescript
import {busk} from '@logfox/busker';

const show = busk(root, routine);
```

## `busk(root, routine)`

Puts on a show inside `root`, an `HTMLElement`. Returns a [`Busker`](#busker). Starts by itself once the root is on screen.

## `Routine`

A routine is one of two things, never a mix. A `ScriptRoutine` has `steps` and
gets its loop length from them; a `TimedRoutine` has a `duration` you set
yourself. Mixing the two is a type error, so a hand-set `duration` can never
quietly cut a script short.

| Field | Type | Default | What it does |
|---|---|---|---|
| `steps` | [`Step[]`](#step) | &mdash; | A click-driven routine. Required in a `ScriptRoutine`. |
| `duration` | `number` | &mdash; | Loop length in ms. Required in a `TimedRoutine`. |
| `moves` | [`Move[]`](#move) | none | Hand-timed cursor glides. `TimedRoutine` only. |

Everything else is shared:

| Field | Type | Default | What it does |
|---|---|---|---|
| `initialScene` | `string` | none | Scene shown at the top of every loop. |
| `start` | `[number, number]` | `[0.5, 0.5]` | Where the cursor rests, as a fraction of the root's size. |
| `routes` | [`Route[]`](#route) | none | What a click &mdash; the cursor's or a visitor's &mdash; does. |
| `toggles` | [`Toggle[]`](#toggle) | none | Classes held for a slice of the loop. |
| `typing` | [`Typing[]`](#typing) | none | Text that types itself. |
| `countdowns` | [`Countdown[]`](#countdown) | none | `m:ss` clocks. |
| `visibility` | `number` | `1` | How much of the root must be on screen to run, as a fraction. |
| `freezeAt` | `number` | `0` | Frame to hold under `prefers-reduced-motion`. |

## `Step`

One beat of a click-driven routine. Either a press:

| Field | Type | Default |
|---|---|---|
| `click` | `string` | &mdash; |
| `wait` | `number` | `0` |
| `moveFor` | `number` | `600` |
| `dwell` | `number` | `250` |

…or a drift, which never clicks:

| Field | Type | Default |
|---|---|---|
| `to` | `string \| [number, number]` | &mdash; |
| `wait` | `number` | `0` |
| `moveFor` | `number` | `600` |

Beats run back to back: a step sets off `wait` after the last one finished.

## `Route`

| Field | Type | What it does |
|---|---|---|
| `click` | `string` | Selector of the clickable element. |
| `scene` | `string` | `data-scene` to show when it is clicked. |

Every route target also gets `is-interactive`, which is what makes it look clickable.

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
| `duration` | Loop length in ms: what you set, or what the `steps` add up to. |
| `play()` | Start or resume. A no-op once a visitor has taken over. |
| `pause()` | Hold where it is. |
| `stepAside()` | Hand the mock to the visitor: stop for good, hide the cursor. |
| `destroy()` | Stop everything and remove every class, listener, and observer busker added. |

← [Styling](./styling.md) &middot; Next: [Development](./development.md)
