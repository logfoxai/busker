import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {busk} from './busk';
import type {Busker, Routine} from './types';

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

    constructor(private readonly callback: IntersectionObserverCallback) {
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
 * is off screen. Give the root a size; nothing here depends on where the
 * cursor lands (that is covered in timeline.spec.ts).
 */
function stage(routine: Routine): Stage {
    document.body.innerHTML = `<div id="root">${MOCK}</div>`;

    const root = document.getElementById('root');

    if (!root) throw new Error('no root');

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);

    observers.length = 0;

    let now = 0;
    let queued: FrameRequestCallback[] = [];

    globalThis.IntersectionObserver = FakeObserver;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
    globalThis.cancelAnimationFrame = (): void => {};
    performance.now = (): number => now;

    const show = busk(root, routine);

    return {
        root,
        show,
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
    scene: 'home',
    steps: [
        {click: '[data-nav-item="alerts"]', moveFor: 100, dwell: 0},
        {click: '[data-row="p0"]', wait: 100, moveFor: 100, dwell: 0},
    ],
    routes: [
        {click: '[data-nav-item="home"]', scene: 'home'},
        {click: '[data-nav-item="alerts"]', scene: 'list'},
    ],
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

test('destroy puts the mock back the way it was found', (assert) => {

    const {root, show, clickAsVisitor} = stage(routine);

    show.destroy();

    assert.equal(root.classList.contains('busker'), false);
    assert.equal(root.querySelector('[data-nav-item="home"]')?.classList.contains('is-interactive'), false);

    // The listener is gone too, so clicks fall through to the page.
    clickAsVisitor('[data-nav-item="alerts"]');
    assert.equal(root.classList.contains('is-aside'), false);

});
