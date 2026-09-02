---
name: busker
description: Rules for building or changing a busker demo — scripted cursor animations over a fake product UI. Use when editing a routine, a mock's markup, or busker itself.
disable-model-invocation: true
---

# busker

The [README](https://raw.githubusercontent.com/logfoxai/busker/main/README.md) indexes the guides (§ Contents). Read the ones you need before changing a routine.

1. **Do not time page changes.** If a click causes it, use `steps` and let the real click do it. A scene that changes on a timer will drift the first time a duration changes.
2. **`routes` is the only list of clickable things.** Adding a route wires the scene change *and* the pointer affordance. Never hand-maintain a parallel CSS list of `cursor: pointer` selectors.
3. **Routes are only for scenes.** Modals, filters, and toggles belong in your own click handlers — busker clicked the element, your code does the rest.
4. **Put time in `wait`, not `moveFor`.** `wait` is reading time for whatever the last press opened. A slow glide reads as lag.
5. **`press` in `moves` does not click.** Hand-timed mode animates the press only. If you want a real click, it is a `step`.
6. **Never use `event.isTrusted` to tell busker's clicks from a visitor's.** Scripted clicks from any source are untrusted. Busker already tracks its own.
7. **Set `freezeAt`** to a frame that shows the point of the demo. It is what people on `prefers-reduced-motion` see.
8. **Targets are selectors, resolved every frame.** Do not pass coordinates for things that exist in the DOM — the cursor should follow the button when the layout changes.
9. **Call `destroy()` on unmount.** It removes every listener, observer, and class.
10. **No tests for CSS.** Cursor look, ripple, and hint styling are judged in a browser, not asserted as strings.

## Changing busker itself

Pure timing, easing, interpolation, and text belong in `src/timeline.ts` and get exhaustive unit tests. `src/busk.ts` is the DOM adapter and is tested through happy-dom with a hand-driven clock. Keep new logic on the pure side of that line where you can.
