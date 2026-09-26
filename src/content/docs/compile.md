# `compile()` for tests

`busk()` only accepts **`steps`** — one script, one clock. Mock UI updates belong in **`{ run }`** steps or click handlers, not parallel schedules on the routine.

[`compile()`](./api-reference.md#compilesteps-resolvetarget-motion-start) runs **the same timeline math** as `busk()` without mounting a show. You use it to assert glide times, loop length, and when `{ run }` steps fire.

## What you pass in

1. **`steps`** — the routine script ([`Step`](./api-reference.md#step) shapes).
2. **`resolveTarget`** — your [`ResolveTarget`](./api-reference.md#resolvetarget) callback. Busker does not ship a default for tests; you decide where selectors “are” in px.
3. **`motion`** (optional) — usually [`DEFAULT_MOTION`](./api-reference.md#motionconfig) in app code, or a **fixed** config in tests so distances map to predictable ms.
4. **`start`** (optional) — cursor start in **px**, default `[0, 0]`. (On a live routine, `start` is a fraction of the root; `busk()` converts that to px before compiling.)

## Example

Stub selectors to fixed positions so assertions stay stable:

```typescript
import {compile} from '@logfox/busker';
import type {Point} from '@logfox/busker';

const resolveTarget = (to: string | Point, from: Point): Point | null => {
    if (Array.isArray(to)) {
        // Fractions → px the same way as a 100×100 root in tests
        return [to[0] * 100, to[1] * 100];
    }
    if (to === '#save') return [200, 40];
    if (to === '#cancel') return [280, 40];

    return from;
};

const fixedMotion = {pxPerSecond: 1e9, minMoveMs: 100, dwellMs: 50};

const {glides, duration, runs} = compile(
    [{wait: 100}, {click: '#save'}, {wait: 200}, {run: () => {}}, {click: '#cancel'}],
    resolveTarget,
    fixedMotion,
    [0, 0],
);

// glides[0] → { to: '#save', from: 100, until: 200, press: 250 }
// runs[0].at → 650 (after wait, click beat, and wait: 200)
// duration → 1520 (includes ring after last click)
```

Return shape and field types: [`Glide`](./api-reference.md#glide), [`ScheduledRun`](./api-reference.md#scheduledrun), and [`compile()`](./api-reference.md#compilesteps-resolvetarget-motion-start) in the API reference.

## Tips

- Match **`motion`** to what you care about: real [`DEFAULT_MOTION`](./api-reference.md#motionconfig) for integration-style checks, exaggerated `pxPerSecond` / `minMoveMs` in unit tests for round numbers.
- Return **`null`** from `resolveTarget` when an element is hidden; compile uses a short glide. At runtime, `busk()` can remeasure and call `stretchGlide()` — see `timeline.spec.ts` in the repo.
- Need when **each** step starts (not just glides and runs)? Use [`compileStepStarts()`](./api-reference.md#compilestepstartssteps-resolvetarget-motion-start).

← [Click-driven routines](./routines.md) &middot; [When a visitor takes over](./taking-over.md)
