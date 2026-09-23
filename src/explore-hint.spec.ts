import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {EXPLORE_HINT_TEXT, exploreHint, type ExploreHint} from './explore-hint.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 1024, height: 768});

let queued: FrameRequestCallback[] = [];

globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => queued.push(cb);
globalThis.cancelAnimationFrame = (): void => {};

/** Run one animation frame. */
function frame(): void {
    const due = queued;

    queued = [];
    for (const cb of due) cb(0);
}

function pointer(root: HTMLElement, type: string, x: number, y: number, pointerType = 'mouse'): void {
    const event = new Event(type) as PointerEvent;

    Object.assign(event, {clientX: x, clientY: y, pointerType});
    root.dispatchEvent(event);
}

function stage(
    config: Parameters<typeof exploreHint>[1] = true,
    reducedMotion = false,
): {root: HTMLElement; hint: ExploreHint; el: HTMLElement} {
    document.body.innerHTML = '<div id="root"></div>';

    const root = document.getElementById('root')!;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);
    queued = [];

    const hint = exploreHint(root, config, reducedMotion);
    const el = root.querySelector<HTMLElement>('[data-explore-hint]')!;

    return {root, hint, el};
}

test('creates the pill inside the root with the default label', (assert) => {
    const {el} = stage();

    assert.equal(el.getAttribute('aria-hidden'), 'true');
    assert.equal(el.querySelector('[data-explore-hint-pop]')?.textContent, EXPLORE_HINT_TEXT);
});

test('a string config is the label', (assert) => {
    const {el} = stage('Try it yourself');

    assert.equal(el.querySelector('[data-explore-hint-pop]')?.textContent, 'Try it yourself');
});

test('pops in at the pointer on first hover', (assert) => {
    const {root, el} = stage();

    pointer(root, 'pointerenter', 100, 200);

    assert.equal(el.classList.contains('is-visible'), true);
    assert.equal(el.style.translate, 'calc(100px + 1.75rem) calc(200px - 50%)');
});

test('custom offsetX shifts the pill to the right of the pointer', (assert) => {
    const {root, el} = stage({offsetX: '2rem'});

    pointer(root, 'pointerenter', 100, 200);

    assert.equal(el.style.translate, 'calc(100px + 2rem) calc(200px - 50%)');
});

test('hides on pointerleave', (assert) => {
    const {root, el} = stage();

    pointer(root, 'pointerenter', 100, 200);
    pointer(root, 'pointerleave', 0, 0);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('follows the pointer with lag', (assert) => {
    const {root, el} = stage();

    pointer(root, 'pointerenter', 100, 100);
    pointer(root, 'pointermove', 200, 100);
    frame();

    // One lerp frame: 100 + (200 - 100) * 0.35 = 135
    assert.equal(el.style.translate, 'calc(135px + 1.75rem) calc(100px - 50%)');
});

test('under reduced motion it snaps to the pointer with no animation frame', (assert) => {
    const {root, el} = stage(true, true);

    pointer(root, 'pointerenter', 100, 100);
    pointer(root, 'pointermove', 200, 150);

    assert.equal(queued.length, 0);
    assert.equal(el.style.translate, 'calc(200px + 1.75rem) calc(150px - 50%)');
});

test('ignores touch pointers', (assert) => {
    const {root, el} = stage();

    pointer(root, 'pointerenter', 100, 100, 'touch');

    assert.equal(el.classList.contains('is-visible'), false);
});

test('hides on click and can show again on the next hover', (assert) => {
    const {root, el} = stage();

    pointer(root, 'pointerenter', 100, 100);
    root.dispatchEvent(new Event('click', {bubbles: true}));

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerenter', 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('pops back in every time the pointer leaves and re-enters', (assert) => {
    const {root, el} = stage();

    pointer(root, 'pointerenter', 100, 100);
    pointer(root, 'pointerleave', 0, 0);
    pointer(root, 'pointerenter', 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('pops out a beat into the visit, and pops back in on the next one', async (assert) => {
    const {root, el} = stage({dismissAfterMs: 30});

    pointer(root, 'pointerenter', 100, 100);
    await new Promise((resolve) => setTimeout(resolve, 60));

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 0, 0);
    pointer(root, 'pointerenter', 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('dismiss() pops it out for good, even across visits', (assert) => {
    const {root, el, hint} = stage();

    pointer(root, 'pointerenter', 100, 100);
    hint.dismiss();

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 0, 0);
    pointer(root, 'pointerenter', 100, 100);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('destroy() removes the element from the root', (assert) => {
    const {root, hint} = stage();

    hint.destroy();

    assert.equal(root.querySelector('[data-explore-hint]'), null);
});
