[![CI](https://github.com/logfoxai/busker/actions/workflows/ci.yml/badge.svg)](https://github.com/logfoxai/busker/actions/workflows/ci.yml)
[![AutoRel](https://img.shields.io/badge/%F0%9F%9A%80%20AutoRel-2D4DDE)](https://github.com/mhweiner/autorel)

<div align="center">
  <picture>
    <source srcset="assets/busker-lockup-dark.svg" media="(prefers-color-scheme: dark)" />
    <source srcset="assets/busker-lockup-light.svg" media="(prefers-color-scheme: light)" />
    <img src="assets/busker-lockup-light.svg" width="220" alt="busker" />
  </picture>
  <h3 align="center">Scripted cursor demos that click.</h3>
  <p align="center">
    <a href="https://busker.logfox.ai">busker.logfox.ai</a>
  </p>
</div>

Fake product demos on a landing page usually rot. The cursor is on one timeline, the page state is on another, and the moment you change a duration they drift &mdash; the cursor presses a button 200ms before the modal it opened, forever.

Busker gets rid of the second timeline. You give it a list of places the cursor goes, it glides there and **clicks the element**, and your own handlers change the page. Nothing is timed except the pauses, so there is nothing to keep in sync.

```typescript
import {busk} from '@logfox/busker';
import '@logfox/busker/busker.css';

busk(document.querySelector('.app'), {
    steps: [
        {wait: 900},
        {click: '[data-nav-item="alerts"]'},
        {wait: 1500},
        {click: '[data-row="p0"]'},
        {wait: 2600},
        {move: [0.55, 0.25]},
    ],
    clickTargets: [
        '[data-nav-item="alerts"]',
        '[data-row="p0"]',
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

- [Click-driven routines](src/content/docs/routines.md) &mdash; steps, timing, and click targets
- [`compile()` helper](src/content/docs/compile.md) &mdash; lay out the same script in tests (no parallel schedules on `Routine`)
- [When a visitor takes over](src/content/docs/taking-over.md)

### Reference

- [API reference](src/content/docs/api-reference.md)
- [Styling](src/content/docs/styling.md)

### Project

- [Development](src/content/docs/development.md)

## Releases

Merges to `main` release through [AutoRel](https://github.com/mhweiner/autorel). The squash-merge title's conventional commit type sets the semver bump (`feat!:` → major). Do not hand-edit `package.json` version — it stays `0.0.0-autorel` in git; npm gets the real version at publish time.

## License

MIT
