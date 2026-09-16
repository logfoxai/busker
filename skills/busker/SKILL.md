---
name: busker
description: Rules for building or changing a busker demo — scripted cursor animations over a fake product UI. Use when editing a routine, a mock's markup, or busker itself.
disable-model-invocation: true
---

# busker

The [README](https://raw.githubusercontent.com/logfoxai/busker/main/README.md) indexes the guides (§ Contents). Read the ones you need before changing a routine.

1. **Do not time page changes.** If a click causes it, use `{ click }` steps and let the real click do it. UI that changes on a timer will drift the first time a pause changes.
2. **`clickTargets` is the only list of visitor-clickable things.** Each selector gets `is-interactive` and counts for the miss hint. Never hand-maintain a parallel CSS list of `cursor: pointer` selectors.
3. **Scenes, modals, and filters are yours.** Busker does not switch views. Wire `click` handlers (or rely on scripted clicks). Use `{ run }`, `tasks`, or `onLoop` when you need timed code without moving the cursor.
4. **One step, one job.** `{ click }`, `{ wait: ms }`, `{ move }`, or `{ run }` — never bundle pauses or glide times onto a click step.
5. **Glide timing lives in `motion` on the routine**, not in steps. Constant `pxPerSecond` + shared `easing` cubic-bezier — never cap long glides with `maxMoveMs`.
6. **`press` in hand-timed `moves` does not click.** If you want a real click, it is a `{ click }` step.
7. **Never use `event.isTrusted` to tell busker's clicks from a visitor's.** Scripted clicks from any source are untrusted. Busker already tracks its own.
8. **Set `freezeAt`** to a frame that shows the point of the demo. It is what people on `prefers-reduced-motion` see.
9. **Targets are selectors, resolved every frame.** Do not pass coordinates for things that exist in the DOM — the cursor should follow the button when the layout changes.
10. **Call `destroy()` on unmount.** It removes every listener, observer, and class.
11. **No tests for CSS.** Cursor look, ripple, and hint styling are judged in a browser, not asserted as strings.

## Changing busker itself

Pure timing, easing, interpolation, and text belong in `src/timeline.ts` and get exhaustive unit tests. `src/busk.ts` is the DOM adapter and is tested through happy-dom with a hand-driven clock. Keep new logic on the pure side of that line where you can.
