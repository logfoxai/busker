# Getting started

## 1. Install

```bash
npm i busker
```

Busker has no dependencies and runs in the browser. It ships types, and works with any framework or none &mdash; it only ever touches the element you hand it.

## 2. Write the mock

A mock is ordinary markup. Busker needs three things from it, all `data-` attributes so your class names stay yours:

```html title="index.html"
<div class="app">
    <nav>
        <button data-nav-item="home">Home</button>
        <button data-nav-item="alerts">Alerts</button>
    </nav>

    <section data-scene="home" data-nav="home">
        <p>Nothing is on fire.</p>
    </section>

    <section data-scene="alerts" data-nav="alerts">
        <p>Two things are on fire.</p>
    </section>

    <span data-cursor></span>
</div>
```

`[data-scene]` marks each page of the mock, `[data-nav-item]` marks the nav, and `[data-cursor]` is the pointer busker moves. [Markup](./markup.md) has the full contract.

## 3. Put on a show

```typescript title="main.ts"
import {busk} from 'busker';
import 'busker/busker.css';

const root = document.querySelector<HTMLElement>('.app');

if (root) {
    busk(root, {
        scene: 'home',
        steps: [
            {click: '[data-nav-item="alerts"]', wait: 1200},
            {click: '[data-nav-item="home"]', wait: 2000},
        ],
        routes: [
            {click: '[data-nav-item="home"]', scene: 'home'},
            {click: '[data-nav-item="alerts"]', scene: 'alerts'},
        ],
    });
}
```

That is the whole thing. The cursor glides to the Alerts button, presses it, and the mock changes &mdash; because busker really clicks it. There is no separate timeline saying "and at 1.8s, switch to the alerts scene", so there is nothing to fall out of sync when you change a duration.

## 4. Let people play with it

Every selector in `routes` is wired for the visitor too. Click anything the show can click and busker steps aside: the loop stops, the cursor disappears, and the mock is yours. Click something dead and it flashes what *is* clickable.

You get that for free &mdash; see [When a visitor takes over](./taking-over.md).

## What busker does not do

- **It does not record or replay.** There is no capture step and no video. The mock is your markup, and the show is a few lines of config.
- **It does not fake the clicks.** `el.click()` is a real click through your real handlers, so the mock behaves the same whether the cursor pressed the button or a person did.
- **It does not run off screen.** The loop only runs while the mock is on screen and the tab is in front.

Next: [Markup](./markup.md) &middot; [Click-driven routines](./routines.md)
