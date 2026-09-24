# Getting started

For coding agents: [Working with Coding Agents](./coding-agents.md) (copy-paste prompts; skill [SKILL.md](../../skills/busker/SKILL.md)).

## 1. Install

```bash
npm i @logfox/busker
```

Busker has no dependencies and runs in the browser. It ships types and ES modules, and works with any framework or none &mdash; it only ever touches the element you hand it.

## 2. Write the mock

A mock is ordinary markup. Layout, styles, nav, and what clicks do are all yours. No busker-specific HTML required.

```html title="index.html"
<div class="app">
    <nav>
        <button type="button" data-nav-item="home">Home</button>
        <button type="button" data-nav-item="alerts">Alerts</button>
    </nav>

    <main>
        <p>Your product UI lives here.</p>
    </main>
</div>
```

Use any selectors in your routine (`data-nav-item` in the example is just a convenient hook). Wire click handlers in your own JavaScript so each `{ click }` does something visible &mdash; busker calls `.click()` on the element; it does not change the page for you. [Markup](./markup.md) lists what busker reads and writes.

## 3. Put on a show

```typescript title="main.ts"
import {busk} from '@logfox/busker';
import '@logfox/busker/busker.css';

const root = document.querySelector<HTMLElement>('.app');

if (root) {
    busk(root, {
        steps: [
            {wait: 1200},
            {click: '[data-nav-item="alerts"]'},
            {wait: 2000},
            {click: '[data-nav-item="home"]'},
        ],
        clickTargets: [
            '[data-nav-item="home"]',
            '[data-nav-item="alerts"]',
        ],
    });
}
```

That is the whole thing. Each `{ wait }` is a pause; each `{ click }` is a real press through your handlers. Glide speed comes from the routine's `motion` settings, not from the script, so you never maintain two clocks for the same UI change. The demo pointer is created for you; to restyle it or use your own SVG, see [Customizing the pointer](./styling.md#customizing-the-pointer).

## 4. Let people play with it

Every selector in `clickTargets` is wired for the visitor too. Click anything the show can click and busker steps aside: the loop stops, the cursor disappears, and the mock is yours. Click something dead and it flashes what *is* clickable.

You get that for free &mdash; see [When a visitor takes over](./taking-over.md). By default a "Click to explore" pill tails the visitor's pointer when they hover the mock; pass `exploreHint: false` to turn it off.

## What busker does not do

- **It does not record or replay.** There is no capture step and no video. The mock is your markup, and the show is a few lines of config.
- **It does not fake the clicks.** `el.click()` is a real click through your real handlers, so the mock behaves the same whether the cursor pressed the button or a person did.
- **It does not style the mock or swap views.** Your CSS and your handlers own navigation, modals, filters, and every state change. `busker.css` only covers cursor affordances (dot, ripple, miss hint, explore pill).
- **It does not run off screen.** The loop only runs while the mock is on screen and the tab is in front.

Next: [Markup](./markup.md) &middot; [Click-driven routines](./routines.md)
