# When a visitor takes over

A busker plays to whoever is passing. When someone actually walks up, they stop playing and let them have a go. Busker works the same way: the first real click ends the show and hands the mock to the visitor.

## What happens on a click

1. If the click hit a [route](./routines.md#routes) target, that scene comes up &mdash; the same code path the cursor's own clicks use.
2. The loop stops for good and the root gets `is-aside`, which hides the cursor.
3. If the click hit nothing clickable, every route target gets `is-hint` for 1.5s, so they can see what is live.

From then on the mock is an ordinary bit of interactive markup. Busker is not going to grab the pointer back mid-thought, which is the whole reason it stops for good rather than resuming after a pause.

## Its own clicks do not count

Busker's presses go through `el.click()` &mdash; real clicks, real handlers, real routes. It knows which ones are its own and does not mistake them for a visitor. You do not have to filter anything in your handlers.

`event.isTrusted` will not tell you the difference either, by the way: it is `false` for anything scripted, including test-runner and devtools clicks. Busker tracks its own presses directly instead.

## Handing over on purpose

`stepAside()` does the same thing from your code &mdash; for a "try it yourself" button, or when a visitor focuses something inside the mock:

```typescript
const show = busk(root, routine);

document.querySelector('#try-it')?.addEventListener('click', () => show.stepAside());
```

## Stopping and starting

`play()` and `pause()` are there if you need them, but you usually do not: busker already pauses when the mock scrolls off screen or the tab goes to the background, and resumes when it comes back. That is one `IntersectionObserver` and one `visibilitychange` listener, both cleaned up by `destroy()`.

`destroy()` puts everything back &mdash; listeners, observers, and every class busker added. Call it when the component unmounts.

## Reduced motion

Under `prefers-reduced-motion: reduce` there is no loop, no cursor, and no observer. Busker renders the [`freezeAt`](./timeline.md#freezing-for-reduced-motion) frame once and leaves it there. Routes are still wired, so the mock stays clickable &mdash; it just never moves on its own.

← [Hand-timed routines](./timeline.md) &middot; Next: [Styling](./styling.md)
