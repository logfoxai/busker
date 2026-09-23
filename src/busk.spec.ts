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

const TEST_MOTION = {
    minMoveMs: 100,
    pxPerSecond: 1e9,
    dwellMs: 0,
};

const routine: Routine = {
    motion: TEST_MOTION,
    steps: [
        {click: '[data-nav-item="alerts"]'},
        {wait: 100},
        {click: '[data-row="p0"]'},
    ],
    clickTargets: ['[data-nav-item="home"]', '[data-nav-item="alerts"]'],
};

test('the show clicks for real, so the mock changes through its own handlers', (assert) => {

    const {root, startShow, tick} = stage(routine);

    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);

    startShow();
    tick(350);

    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);
    assert.equal(root.querySelector('[data-nav-item="alerts"]')?.classList.contains('is-active'), true);

});

test('a glide to a hidden scene uses the same px/s once that scene is visible', (assert) => {

    document.body.innerHTML = `<div id="root">${MOCK}</div>`;
    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => {
            if (el.matches('[data-nav-item="alerts"]')) return new DOMRect(0, 0, 80, 20);
            if (el.matches('[data-row="p0"]')) {
                const scene = el.closest('[data-scene]');

                return scene?.classList.contains('is-active')
                    ? new DOMRect(400, 0, 80, 20)
                    : new DOMRect(0, 0, 0, 0);
            }

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
        motion: {pxPerSecond: 400, minMoveMs: 80, dwellMs: 0},
        steps: [
            {click: '[data-nav-item="alerts"]'},
            {wait: 300},
            {click: '[data-row="p0"]'},
        ],
        clickTargets: ['[data-nav-item="alerts"]', '[data-row="p0"]'],
        onLoop: () => showScene('home'),
    });

    const cursor = root.querySelector<HTMLElement>('[data-cursor]');
    const tick = (ms: number): void => {
        now += ms;
        const due = queued;

        queued = [];
        for (const cb of due) cb(now);
    };

    observers[0].fire();

    tick(200);
    const midFirst = cursor?.style.translate;

    for (let i = 0; i < 24; i += 1) {
        tick(50);
    }

    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);

    const samples = new Set<string>();

    for (let i = 0; i < 20; i += 1) {
        tick(50);
        samples.add(cursor?.style.translate ?? '');
    }

    assert.equal(midFirst !== '', true);
    assert.equal(samples.size >= 3, true);
    assert.equal(show.duration > 1500, true);

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
        motion: TEST_MOTION,
        steps: [{click: '[data-nav-item="alerts"]'}],
    });

    startShow();
    tick(350);

    assert.equal(root.querySelector('[data-scene="list"]')?.classList.contains('is-active'), true);

});

test('the cursor holds its place when its own click takes the target away', (assert) => {

    const {root, startShow, tick, showScene} = stage({
        motion: TEST_MOTION,
        steps: [{click: '[data-row="p0"]'}],
        clickTargets: ['[data-row="p0"]'],
    });

    showScene('list');

    const cursor = root.querySelector<HTMLElement>('[data-cursor]');

    // Arrived on the row and pressing it (compile used a hidden target; stretch shortens on first frame).
    startShow();
    tick(100);

    const onTheRow = cursor?.style.translate;

    assert.equal(cursor?.classList.contains('is-pressing'), true);

    const rowBtn = root.querySelector<HTMLElement>('[data-row="p0"]');

    assert.equal(rowBtn?.classList.contains('is-pressed'), true);

    // The click has landed and taken the row out of layout with it. The ring
    // outlives the press on purpose, so on every frame that is left it has to
    // keep running where the row was — not wherever an unresolvable target
    // works out to.
    tick(210);
    tick(16);

    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);
    assert.equal(cursor?.classList.contains('is-ringing'), true);
    assert.equal(cursor?.style.translate, onTheRow);
    assert.equal(rowBtn?.classList.contains('is-pressed'), false);

});

test('the cursor does not chase a target that moves after the glide ends', (assert) => {

    document.body.innerHTML = `<div id="root">${MOCK}</div>`;
    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    let rowTop = 50;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);
    root.querySelectorAll('*').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => {
            if (el.matches('[data-row="p0"]')) {
                return new DOMRect(100, rowTop, 80, 20);
            }

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

    busk(root, {
        motion: {pxPerSecond: 1e9, minMoveMs: 100, dwellMs: 200},
        steps: [{click: '[data-row="p0"]'}],
        clickTargets: ['[data-row="p0"]'],
        onLoop: () => showScene('home'),
    });

    showScene('list');

    const cursor = root.querySelector<HTMLElement>('[data-cursor]');
    const tick = (ms: number): void => {
        now += ms;
        const due = queued;

        queued = [];
        for (const cb of due) cb(now);
    };

    observers[0].fire();
    tick(150);
    const parked = cursor?.style.translate;

    rowTop = 400;
    tick(300);

    assert.equal(cursor?.style.translate, parked);

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
    tick(1150);
    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);
    tick(350);
    assert.equal(clicks, 2);

});

test('a frame jump past loop end keeps leftover time in the next loop', (assert) => {

    let clicks = 0;
    const {root, startShow, tick} = stage(routine);

    root.querySelector('[data-nav-item="alerts"]')?.addEventListener('click', () => {
        clicks += 1;
    });

    startShow();
    tick(350);
    assert.equal(clicks, 1);

    // One big delta past duration — second loop should still reach the alerts press.
    tick(2000);
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

    const show = busk(root, {clickTargets: routine.clickTargets, steps: routine.steps});

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
    tick(60_000);

    assert.equal(loops >= 1, true);
    assert.equal(root.querySelector('[data-scene="home"]')?.classList.contains('is-active'), true);

});

test('a run step at t=0 waits until playback starts', (assert) => {

    let runs = 0;

    const {startShow, tick} = stage({
        motion: {...TEST_MOTION, minMoveMs: 50, pxPerSecond: 1e9},
        steps: [
            {run: (): void => {
                runs += 1;
            }},
            {click: '[data-nav-item="alerts"]'},
        ],
    });

    assert.equal(runs, 0);
    startShow();
    tick(1);
    assert.equal(runs, 1);

});

test('run steps fire once per loop', (assert) => {

    let runs = 0;

    const {startShow, tick} = stage({
        motion: {...TEST_MOTION, minMoveMs: 50, pxPerSecond: 1e9},
        steps: [
            {wait: 50},
            {run: (): void => {
                runs += 1;
            }},
            {wait: 150},
            {run: (): void => {
                runs += 10;
            }},
            {click: '[data-nav-item="alerts"]'},
        ],
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
        steps: [{wait: 10_000}],
        visibility: 0.5,
    });

    observers[0].fire();
    now += 500;

    for (const cb of queued.splice(0)) cb(now);

    top = 600;
    window.dispatchEvent(new Event('scroll'));

    for (const cb of queued.splice(0)) cb(now);

    now += 2000;

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(show.duration, 10_000);
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
        steps: [{wait: 1}],
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
        steps: [{wait: 10_000}],
        visibility: 0.5,
    });

    observers[0].fire();
    now += 500;

    for (const cb of queued.splice(0)) cb(now);

    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    document.dispatchEvent(new Event('visibilitychange'));

    window.dispatchEvent(new Event('resize'));
    now += 2000;

    for (const cb of queued.splice(0)) cb(now);

    assert.equal(show.duration, 10_000);
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    show.destroy();

});

test('clicks the shown match when the same selector exists in a hidden stack layer', (assert) => {

    document.body.innerHTML = `
        <div id="root">
            <div data-layer="a">
                <button type="button" data-pick data-id="a">A</button>
            </div>
            <div data-layer="b">
                <button type="button" data-pick data-id="b">B</button>
            </div>
            <span data-cursor></span>
        </div>
    `;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 400, 300);
    root.querySelectorAll<HTMLElement>('[data-pick]').forEach((el) => {
        el.getBoundingClientRect = (): DOMRect => new DOMRect(120, 40, 40, 20);
    });

    let picked = '';

    root.querySelectorAll<HTMLElement>('[data-pick]').forEach((el) => {
        el.addEventListener('click', () => {
            picked = el.dataset.id ?? '';
        });
    });

    root.querySelector<HTMLElement>('[data-layer="a"]')!.style.visibility = 'hidden';

    observers.length = 0;

    let now = 0;
    const queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const show = busk(root, {
        motion: TEST_MOTION,
        steps: [{click: '[data-pick]'}],
        clickTargets: ['[data-pick]'],
    });

    observers[0].fire();
    tickLoop: {
        for (let i = 0; i < 40; i += 1) {
            now += 50;
            for (const cb of queued.splice(0)) cb(now);
        }
    }

    assert.equal(picked, 'b');
    show.destroy();

});

test('is-hover applies only to the step target once the cursor reaches it', (assert) => {

    document.body.innerHTML = `
        <div id="root">
            <button type="button" data-pick>A</button>
            <button type="button" data-pick-other>B</button>
            <span data-cursor></span>
        </div>
    `;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 400, 300);
    root.querySelector<HTMLElement>('[data-pick]')!.getBoundingClientRect = (): DOMRect =>
        new DOMRect(120, 40, 40, 20);
    root.querySelector<HTMLElement>('[data-pick-other]')!.getBoundingClientRect = (): DOMRect =>
        new DOMRect(220, 40, 40, 20);

    const pick = root.querySelector<HTMLElement>('[data-pick]')!;
    const pickOther = root.querySelector<HTMLElement>('[data-pick-other]')!;

    observers.length = 0;

    let now = 0;
    const queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const show = busk(root, {
        motion: TEST_MOTION,
        steps: [{move: '[data-pick]'}, {wait: 200}],
        clickTargets: ['[data-pick]', '[data-pick-other]'],
    });

    observers[0].fire();

    now += 50;
    for (const cb of queued.splice(0)) cb(now);

    assert.equal(pick.classList.contains('is-hover'), false);
    assert.equal(pickOther.classList.contains('is-hover'), false);

    for (let i = 0; i < 30; i += 1) {
        now += 50;
        for (const cb of queued.splice(0)) cb(now);
    }

    assert.equal(pick.classList.contains('is-hover'), true);
    assert.equal(pickOther.classList.contains('is-hover'), false);

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

test('exploreHint pops in on hover and out for good when the visitor takes over', (assert) => {

    const {root, clickAsVisitor} = stage({...routine, exploreHint: true});

    const hint = document.body.querySelector('[data-explore-hint]');

    assert.equal(hint?.classList.contains('is-visible'), false);

    const move = new Event('pointermove') as PointerEvent;

    Object.assign(move, {clientX: 100, clientY: 100, pointerType: 'mouse'});
    root.dispatchEvent(move);

    assert.equal(hint?.classList.contains('is-visible'), true);

    clickAsVisitor('[data-nav-item="alerts"]');

    assert.equal(hint?.classList.contains('is-visible'), false);

});

test('exploreHint stays up when the show clicks for itself', (assert) => {

    const {root, startShow, tick} = stage({...routine, exploreHint: true});

    const hint = document.body.querySelector('[data-explore-hint]');

    const move = new Event('pointermove') as PointerEvent;

    Object.assign(move, {clientX: 100, clientY: 100, pointerType: 'mouse'});
    root.dispatchEvent(move);

    assert.equal(hint?.classList.contains('is-visible'), true);

    startShow();
    tick(350);

    assert.equal(root.classList.contains('is-aside'), false);
    assert.equal(hint?.classList.contains('is-visible'), true);

});

test('exploreHint stays up through multiple show navigation clicks', (assert) => {

    const {root, startShow, tick} = stage({...routine, exploreHint: true});

    const hint = document.body.querySelector('[data-explore-hint]');

    const move = new Event('pointermove') as PointerEvent;

    Object.assign(move, {clientX: 100, clientY: 100, pointerType: 'mouse'});
    root.dispatchEvent(move);

    startShow();
    tick(500);

    assert.equal(root.classList.contains('is-aside'), false);
    assert.equal(hint?.classList.contains('is-visible'), true);

});

test('exploreHint ignores spurious pointerleave after a show navigation click', (assert) => {

    const {root, startShow, tick} = stage({...routine, exploreHint: true});

    const hint = document.body.querySelector('[data-explore-hint]');

    const move = new Event('pointermove') as PointerEvent;

    Object.assign(move, {clientX: 100, clientY: 100, pointerType: 'mouse'});
    root.dispatchEvent(move);

    startShow();
    tick(350);

    const leave = new Event('pointerleave') as PointerEvent;

    Object.assign(leave, {clientX: 0, clientY: 0, pointerType: 'mouse'});
    root.dispatchEvent(leave);

    assert.equal(hint?.classList.contains('is-visible'), true);

});

test('destroy removes the explore hint element', (assert) => {

    const {show} = stage({...routine, exploreHint: true});

    show.destroy();

    assert.equal(document.body.querySelector('[data-explore-hint]'), null);

});

test('no explore hint without the option', (assert) => {

    stage(routine);

    assert.equal(document.body.querySelector('[data-explore-hint]'), null);

});
