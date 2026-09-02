<div align="center">
  <picture>
    <source srcset="assets/busker-lockup-dark.svg" media="(prefers-color-scheme: dark)" />
    <source srcset="assets/busker-lockup-light.svg" media="(prefers-color-scheme: light)" />
    <img src="assets/busker-lockup-light.svg" width="220" alt="busker" />
  </picture>
  <h3 align="center">Scripted cursor demos that really click.</h3>
  <p align="center">
    <a href="https://busker.logfox.ai">busker.logfox.ai</a>
  </p>
</div>

Fake product demos on a landing page usually rot. The cursor is on one timeline, the page state is on another, and the moment you change a duration they drift &mdash; the cursor presses a button 200ms before the modal it opened, forever.

Busker gets rid of the second timeline. You give it a list of places the cursor goes, it glides there and **really clicks the element**, and your own handlers change the page. Nothing is timed except the pauses, so there is nothing to keep in sync.

```typescript
import {busk} from '@logfox/busker';
import '@logfox/busker/busker.css';

busk(document.querySelector('.app'), {
    scene: 'home',
    steps: [
        {click: '[data-nav-item="alerts"]', wait: 900},
        {click: '[data-row="p0"]', wait: 1500},
        {to: [0.55, 0.25], wait: 2600},
    ],
    routes: [
        {click: '[data-nav-item="alerts"]', scene: 'alerts'},
        {click: '[data-row="p0"]', scene: 'case'},
    ],
});
```

The show loops while the mock is on screen and stops when the tab is in the background. The first time a visitor clicks, busker steps aside &mdash; the cursor disappears and the mock is theirs to poke at. Click something dead and it flashes what is not.

Zero dependencies, about 4kB, no build step, no framework.

## Quick start

```bash
npm i @logfox/busker
```

[Getting started](src/content/docs/getting-started.md) is a working demo in four steps.

## Contents

Same guides as [busker.logfox.ai](https://busker.logfox.ai). Links are repo-relative, so they work in a checkout and on GitHub.

### Introduction

- [Getting started](src/content/docs/getting-started.md)
- [Markup](src/content/docs/markup.md) &mdash; the five attributes busker reads and the classes it writes

### Routines

- [Click-driven routines](src/content/docs/routines.md) &mdash; steps, timing, and routes
- [Hand-timed routines](src/content/docs/timeline.md) &mdash; for what no click causes: streaming logs, typing, countdowns
- [When a visitor takes over](src/content/docs/taking-over.md)

### Reference

- [API reference](src/content/docs/api-reference.md)
- [Styling](src/content/docs/styling.md)

### Project

- [Development](src/content/docs/development.md)

## License

MIT
