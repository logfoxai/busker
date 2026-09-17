# `compile()` for tests

`busk()` only accepts **`steps`** — one script, one clock. Chart ticks, livetail rows, modals, and typing belong in **`{ run }`** steps (or in click handlers), not in parallel `toggles` / `tasks` arrays.

For **tests and tooling**, [`compile()`](./api-reference.md#compilesteps-resolvetarget-motion-start) lays the same script out without the DOM:

```typescript
import {compile, DEFAULT_MOTION} from '@logfox/busker';

const {moves, duration, tasks} = compile(steps, resolveTarget, DEFAULT_MOTION, startPx);
```

- **`moves`** — cursor glides with `from` / `until` / optional `press`
- **`tasks`** — one entry per `{ run }` step (when it fires)
- **`duration`** — loop length in ms

[`compileStepStarts()`](./api-reference.md) returns when each step begins if you need that in a test.

← [Click-driven routines](./routines.md) &middot; [When a visitor takes over](./taking-over.md)
