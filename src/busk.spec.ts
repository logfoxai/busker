import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {busk} from './busk.ts';
import type {Busker, Routine} from './types.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 1024, height: 768});

const MOCK = `
    <nav>
        <button data-nav-item="home">Home</button>
        <button data-nav-item="alerts">Alerts</button>
    </nav>
    <section data-scene="home" data-nav="home"><p>home</p></section>
    <section data-scene="list" data-nav="alerts"><button data-row="p0">row</button></section>
    <span data-cursor></span>
`;

interface Stage {
    root: HTMLElement;
    show: Busker;
    /** Let the show know it is on screen. */
    startShow(): void;
    /** Run the loop forward. */
    tick(ms: number): void;
    /** A visitor click, as opposed to one the show made. */
    clickAsVisitor(selector: string): void;
}

const observers: FakeObserver[] = [];

class FakeObserver implements IntersectionObserver {

    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: readonly number[] = [];

    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        observers.push(this);
    }

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }

    fire(): void {
        this.callback([], this);
    }

}

/**
 * happy-dom does no layout, so every rect is zero and the show would think it
 * is off screen. Give the root a size, and give everything inside it a box
 * that goes away when its scene is hidden, the way a real one does.
 */
function wireTestScenes(root: HTMLElement): {showScene: (scene: string) => void} {
    const showScene = (scene: string): void => {
        root.querySelectorAll<HTMLElement>('[data-scene]').forEach((el) => {
            el.classList.toggle('is-active', el.dataset.scene === scene);
        });

        const navKey = root.querySelector<HTMLElement>(`[data-scene="${scene}"]`)?.dataset.nav;

        root.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((el) => {
            el.classList.toggle('is-active', el.dataset.navItem === navKey);
        });
    };

    root.querySelector('[data-nav-item="home"]')?.addEventListener('click', () => showScene('home'));
    root.querySelector('[data-nav-item="alerts"]')?.addEventListener('click', () => showScene('list'));
    root.querySelector('[data-row="p0"]')?.addEventListener('click', () => showScene('home'));

    const initial = root.querySelector<HTMLElement>('[data-scene].is-active')?.dataset.scene ?? 'home';

    showScene(initial);

    return {showScene};
}

function stage(routine: Routine): Stage & {showScene: (scene: string) => void} {
    document.body.innerHTML = `<div id="root">${MOCK}</div>`;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => {
            const scene = el.closest('[data-scene]');

            return scene && !scene.classList.contains('is-active')
                ? new DOMRect(0, 0, 0, 0)
                : new DOMRect(100, 50, 80, 20);
        };
    });

    observers.length = 0;

    let now = 0;
    let queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const {showScene} = wireTestScenes(root);

    const show = busk(root, {
        ...routine,
        onLoop: routine.onLoop ?? ((): void => {
            showScene('home');
        }),
    });

    return {
        root,
        show,
        showScene,
        startShow: () => observers[0].fire(),
        tick: (ms): void => {
            now += ms;

            const due = queued;

            queued = [];
            for (const cb of due) cb(now);
        },
        clickAsVisitor: (selector) => root.querySelector<HTMLElement>(selector)?.click(),
    };
}

const routine: Routine = {
    steps: [
        {click: '[data-nav-item="alerts"]', moveFor: 100, dwell: 0},
        {click: '[data-row="p0"]', wait: 100, moveFor: 100, dwell: 0},
    ],
    routes: ['[data-nav-item="home"]', '[data-nav-item="alerts"]'],
};

test('the show clicks for real, so the mock changes through its own handlers', (assert) => {

    const {root, startShow, tick} = stage(routine);

    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);

    startShow();
    tick(350);

    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);
    assert.equal(root.querySelector('[data-nav-item="alerts"]')?.classList.contains('is-active'), true);

});

test('the page holds still until the press lifts, so the click reads first', (assert) => {

    const {root, startShow, tick} = stage(routine);

    startShow();

    // The cursor has arrived and gone down on the nav item. Changing the scene
    // now would take the button away mid-press, before the click could read.
    tick(150);
    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);

    tick(200);
    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);

});

test('a routine that ends on a click still lands it', (assert) => {

    const {root, startShow, tick} = stage({
        ...routine,
        steps: [{click: '[data-nav-item="alerts"]', moveFor: 100, dwell: 0}],
    });

    startShow();
    tick(350);

    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);

});

test('the cursor holds its place when its own click takes the target away', (assert) => {

    const {root, startShow, tick, showScene} = stage({
        steps: [{click: '[data-row="p0"]', moveFor: 100, dwell: 0}],
        routes: ['[data-row="p0"]'],
    });

    showScene('list');

    const cursor = root.querySelector<HTMLElement>('[data-cursor]');

    // Arrived on the row and pressing it.
    tick(0);
    startShow();
    tick(100);

    const onTheRow = cursor?.style.left;

    assert.equal(cursor?.classList.contains('is-pressing'), true);

    // The click has landed and taken the row out of layout with it. The ring
    // outlives the press on purpose, so on every frame that is left it has to
    // keep running where the row was — not wherever an unresolvable target
    // works out to.
    tick(210);
    tick(16);

    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);
    assert.equal(cursor?.classList.contains('is-ringing'), true);
    assert.equal(cursor?.style.left, onTheRow);

});

test('the show does not mistake its own click for a visitor taking over', (assert) => {

    const {root, startShow, tick} = stage(routine);

    startShow();
    tick(350);

    assert.equal(root.classList.contains('is-aside'), false);

});

test('a visitor click stops the show for good', (assert) => {

    const {root, startShow, tick, clickAsVisitor} = stage(routine);

    startShow();
    clickAsVisitor('[data-nav-item="alerts"]');

    assert.equal(root.classList.contains('is-aside'), true);
    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);

    // The loop is over: the second step never presses.
    tick(1000);
    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);

});

test('a visitor click on nothing lights up what is clickable', (assert) => {

    const {root, startShow, clickAsVisitor} = stage(routine);

    startShow();
    clickAsVisitor('[data-scene="home"] p');

    assert.equal(root.querySelector('[data-nav-item="alerts"]')?.classList.contains('is-hint'), true);

});

test('every clickable thing looks clickable', (assert) => {

    const {root} = stage(routine);

    assert.equal(root.querySelector('[data-nav-item="home"]')?.classList.contains('is-interactive'), true);
    assert.equal(root.querySelector('[data-scene="home"] p')?.classList.contains('is-interactive'), false);

});

test('each beat presses once, and the loop starts over from the top', (assert) => {

    let clicks = 0;
    const {root, startShow, tick} = stage(routine);

    root.querySelector('[data-nav-item="alerts"]')?.addEventListener('click', () => {
        clicks += 1;
    });

    startShow();
    tick(350);
    assert.equal(clicks, 1);

    // Still in the same pass — the beat must not fire again on every frame.
    tick(50);
    tick(50);
    assert.equal(clicks, 1);

    // Past the end of the routine: back to the top, and it presses again.
    tick(600);
    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);
    tick(350);
    assert.equal(clicks, 2);

});

test('busk does not change which scene is active on init', (assert) => {

    document.body.innerHTML = `<div id="root">${MOCK.replace(
        'data-scene="list"',
        'data-scene="list" class="is-active"',
    ).replace('data-scene="home"', 'data-scene="home"')}</div>`;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);
    wireTestScenes(root);

    const show = busk(root, {routes: routine.routes, steps: routine.steps});

    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);
    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), false);
    show.destroy();

});

test('onLoop runs when the playhead wraps', (assert) => {

    let loops = 0;
    const {root, startShow, tick, showScene} = stage({
        ...routine,
        onLoop: () => {
            loops += 1;
            showScene('home');
        },
    });

    showScene('list');
    startShow();
    tick(2000);

    assert.equal(loops >= 1, true);
    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);

});

test('tasks at t=0 wait until playback starts', (assert) => {

    let runs = 0;

    const {startShow, tick} = stage({
        steps: [{click: '[data-nav-item="alerts"]', moveFor: 50, dwell: 0}],
        tasks: [{at: 0, run: (): void => {
            runs += 1;
        }}],
    });

    assert.equal(runs, 0);
    startShow();
    tick(1);
    assert.equal(runs, 1);

});

test('a task at loop end runs before the playhead wraps', (assert) => {

    let end = 0;
    const {startShow, tick} = stage({
        duration: 500,
        moves: [],
        tasks: [{at: 500, run: (): void => {
            end += 1;
        }}],
        onLoop: (): void => {},
    });

    startShow();
    tick(500);
    assert.equal(end, 1);

});

test('a run step and tasks fire once per loop', (assert) => {

    let runs = 0;

    const {startShow, tick} = stage({
        steps: [
            {run: (): void => {
                runs += 1;
            }, wait: 50},
            {click: '[data-nav-item="alerts"]', moveFor: 50, dwell: 0},
        ],
        tasks: [{at: 200, run: (): void => {
            runs += 10;
        }}],
    });

    startShow();
    tick(80);
    assert.equal(runs, 1);
    tick(150);
    assert.equal(runs, 11);
    tick(2000);
    tick(80);
    assert.equal(runs, 12);

});

test('t=0 toggles are applied when busk() starts', (assert) => {

    document.body.innerHTML = `
        <div id="root">
            <button class="view-traces">traces</button>
            <span data-cursor></span>
        </div>
    `;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => new DOMRect(100, 50, 80, 20);
    });

    const show = busk(root, {
        duration: 1000,
        toggles: [{target: '.view-traces', class: 'is-on', from: 0, until: 1000}],
    });

    assert.equal(root.querySelector('.view-traces')?.classList.contains('is-on'), true);
    show.destroy();

});

test('scroll re-checks visibility when the mock leaves the viewport', (assert) => {

    document.body.innerHTML = `
        <div id="root">
            <button class="marker">x</button>
            <span data-cursor></span>
        </div>
    `;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    let top = 0;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, top, 400, 400);
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => new DOMRect(0, top, 400, 400);
    });

    observers.length = 0;

    let now = 0;
    const queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const show = busk(root, {
        duration: 10_000,
        visibility: 0.5,
        toggles: [{target: '.marker', class: 'is-on', from: 400, until: 800}],
    });

    observers[0].fire();
    now += 500;

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(root.querySelector('.marker')?.classList.contains('is-on'), true);

    top = 600;
    window.dispatchEvent(new Event('scroll'));

    for (const cb of queued.splice(0)) cb(now);

    now += 2000;

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(root.querySelector('.marker')?.classList.contains('is-on'), true);
    show.destroy();

});

test('scroll coalesces viewport sync to one animation frame', (assert) => {

    document.body.innerHTML = `
        <div id="root">
            <button class="marker">x</button>
            <span data-cursor></span>
        </div>
    `;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    let rectReads = 0;

    root.getBoundingClientRect = (): DOMRect => {
        rectReads += 1;

        return new DOMRect(0, 0, 400, 400);
    };
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 400, 400);
    });

    observers.length = 0;

    const now = 0;
    const queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const show = busk(root, {
        duration: 0,
        visibility: 0.5,
    });

    for (const cb of queued.splice(0)) cb(now);

    rectReads = 0;

    for (let i = 0; i < 8; i += 1) window.dispatchEvent(new Event('scroll'));

    assert.equal(rectReads, 0);

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(rectReads, 1);
    show.destroy();

});

test('resize does not resume playback while the tab is hidden', (assert) => {

    document.body.innerHTML = `
        <div id="root">
            <button class="marker">x</button>
            <span data-cursor></span>
        </div>
    `;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 400, 400);
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 400, 400);
    });

    observers.length = 0;

    let now = 0;
    const queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const show = busk(root, {
        duration: 10_000,
        visibility: 0.5,
        toggles: [{target: '.marker', class: 'is-on', from: 400, until: 800}],
    });

    observers[0].fire();
    now += 500;

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(root.querySelector('.marker')?.classList.contains('is-on'), true);

    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    document.dispatchEvent(new Event('visibilitychange'));

    window.dispatchEvent(new Event('resize'));
    now += 2000;

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(root.querySelector('.marker')?.classList.contains('is-on'), true);
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    show.destroy();

});

test('destroy puts the mock back the way it was found', (assert) => {

    const {root, show, clickAsVisitor} = stage(routine);

    show.destroy();

    assert.equal(root.classList.contains('busker'), false);
    assert.equal(root.querySelector('[data-nav-item="home"]')?.classList.contains('is-interactive'), false);

    // The listener is gone too, so clicks fall through to the page.
    clickAsVisitor('[data-nav-item="alerts"]');
    assert.equal(root.classList.contains('is-aside'), false);

});
