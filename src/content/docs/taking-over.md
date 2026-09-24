# When a visitor takes over

A busker plays to whoever is passing. When someone actually walks up, they stop playing and let them have a go. Busker works the same way: the first real click ends the show and hands the mock to the visitor.

## What happens on a click

1. The loop stops for good and the root gets `is-aside`, which hides the cursor.
2. If the click hit a [click target](./routines.md#click-targets) selector, nothing special &mdash; your handlers already ran from the real click.
3. If the click hit nothing clickable, every click target gets `is-hint` for 1.5s, so they can see what is live.

From then on the mock is an ordinary bit of interactive markup. Busker is not going to grab the pointer back mid-thought, which is the whole reason it stops for good rather than resuming after a pause.

## Its own clicks do not count

Busker's presses go through `el.click()` &mdash; real clicks, real handlers. It knows which ones are its own and does not mistake them for a visitor. You do not have to filter anything in your handlers.

`event.isTrusted` will not tell you the difference either, by the way: it is `false` for anything scripted, including test-runner and devtools clicks. Busker tracks its own presses directly instead.

## The explore hint

A looping show can read as a video. Set `exploreHint` on the routine and busker shows a pill that tails the visitor's pointer the first time they hover, inviting them in:

```typescript
busk(root, {
    exploreHint: true, // or 'Try it yourself', or { text: '…', dismissAfterMs: 4000 }
    steps: [/* … */],
});
```

It pops in once when the pointer enters the mock and tails the pointer on the page. While they stay on the mock it auto pops out **1.8s** after the pill pops in (`dismissAfterMs`, default 1800). That clock starts when the hint becomes visible, not when the pop-in animation finishes (~220ms in `busker.css`), and the pop-out adds ~260ms after the timer — so “gone” can feel closer to ~2.1s wall clock. Moving the mouse does not extend the timer. Moving the mouse does not show it again — only leaving the mock and hovering again starts a fresh visit. Leaving the mock hides it right away; the pill keeps tailing the pointer until the pop-out animation finishes. A visitor click hides it for that visit; the show's own scripted presses do not, and brief `pointerleave` churn after a scripted click that opens a modal or reshapes the layout is ignored too. Takeover dismisses it for good. Busker creates the element; there is no markup to add. Touch pointers never see it. To restyle the pill, see [Styling](./styling.md#explore-hint).

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

Under `prefers-reduced-motion: reduce` there is no loop, no cursor, and no observer. Busker renders the [`freezeAt`](./api-reference.md#routine) frame once and leaves it there. Use `{ run }` steps or your own init code to match that frame in the DOM. Click targets are still wired, so the mock stays clickable &mdash; it just never moves on its own.

← [Click-driven routines](./routines.md) &middot; Next: [Styling](./styling.md)
