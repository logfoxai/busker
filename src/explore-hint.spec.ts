import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {EXPLORE_HINT_TEXT, exploreHint, type ExploreHint} from './explore-hint.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 1024, height: 768});

function pointer(root: HTMLElement, type: string, x: number, y: number, pointerType = 'mouse'): void {
    const event = new Event(type) as PointerEvent;

    Object.assign(event, {clientX: x, clientY: y, pointerType});
    root.dispatchEvent(event);
}

/** Hint shows on pointermove, not pointerenter. */
function hover(root: HTMLElement, x: number, y: number, pointerType = 'mouse'): void {
    pointer(root, 'pointerenter', x, y, pointerType);
    pointer(root, 'pointermove', x, y, pointerType);
}

function docPointer(type: string, x: number, y: number, pointerType = 'mouse'): void {
    const event = new Event(type) as PointerEvent;

    Object.assign(event, {clientX: x, clientY: y, pointerType});
    document.dispatchEvent(event);
}

function stage(
    config: Parameters<typeof exploreHint>[1] = true,
    reducedMotion = false,
): {root: HTMLElement; hint: ExploreHint; el: HTMLElement} {
    document.body.innerHTML = '<div id="root"></div>';

    const root = document.getElementById('root')!;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);

    const hint = exploreHint(root, config, reducedMotion);
    const el = document.body.querySelector<HTMLElement>('[data-explore-hint]')!;

    return {root, hint, el};
}

test('creates the pill on document.body with the default label', (assert) => {
    const {el} = stage();

    assert.equal(el.getAttribute('aria-hidden'), 'true');
    assert.equal(el.querySelector('[data-explore-hint-face]')?.textContent, EXPLORE_HINT_TEXT);
});

test('a string config is the label', (assert) => {
    const {el} = stage('Try it yourself');

    assert.equal(el.querySelector('[data-explore-hint-face]')?.textContent, 'Try it yourself');
});

test('pops in at the pointer on first hover', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 200);

    assert.equal(el.classList.contains('is-visible'), true);
    assert.equal(el.style.left, 'calc(100px + 1.75rem)');
    assert.equal(el.style.top, `${200 - (el.querySelector('[data-explore-hint-face]')!.offsetHeight / 2)}px`);
});

test('custom offsetX shifts the pill to the right of the pointer', (assert) => {
    const {root, el} = stage({offsetX: '2rem'});

    hover(root, 100, 200);

    assert.equal(el.style.left, 'calc(100px + 2rem)');
});

test('starts hiding as soon as the pointer leaves the mock', (assert) => {
    const {root, el} = stage({dismissAfterMs: 5000});

    hover(root, 100, 200);
    pointer(root, 'pointerleave', 900, 50);

    assert.equal(el.classList.contains('is-visible'), false);
    assert.equal(el.classList.contains('is-hiding'), true);
});

test('still tails the pointer outside the mock while popping out', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointerleave', 900, 50);
    docPointer('pointermove', 900, 50);

    assert.equal(el.classList.contains('is-hiding'), true);
    assert.equal(el.style.left, 'calc(900px + 1.75rem)');
});

test('snaps to the pointer on every move', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointermove', 200, 150);

    assert.equal(el.style.left, 'calc(200px + 1.75rem)');
    assert.equal(el.style.top, `${150 - (el.querySelector('[data-explore-hint-face]')!.offsetHeight / 2)}px`);
});

test('re-entering snaps to the new pointer instead of lerping from the last spot', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointerleave', 900, 50);
    hover(root, 500, 400);

    assert.equal(el.style.left, 'calc(500px + 1.75rem)');
});

test('ignores touch pointers', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100, 'touch');

    assert.equal(el.classList.contains('is-visible'), false);
});

test('hides on click and can show again on the next hover', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    root.dispatchEvent(new Event('click', {bubbles: true}));

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 900, 50);
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('pops back in every time the pointer leaves and re-enters', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointerleave', 900, 50);
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('pops out a beat into the visit, and pops back in on the next one', async (assert) => {
    const {root, el} = stage({dismissAfterMs: 30});

    hover(root, 100, 100);
    await new Promise((resolve) => setTimeout(resolve, 60));

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 900, 50);
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('does not pop back in on pointer move after click while still on the mock', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    root.dispatchEvent(new Event('click', {bubbles: true}));
    pointer(root, 'pointermove', 120, 110);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('auto-dismiss fires on schedule even if the pointer keeps moving', async (assert) => {
    const {root, el} = stage({dismissAfterMs: 50});

    hover(root, 100, 100);
    for (let i = 0; i < 20; i++) {
        pointer(root, 'pointermove', 100 + i, 100 + i);
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.equal(el.classList.contains('is-visible'), false);
});

test('does not pop back in on pointer move after auto-dismiss while still on the mock', async (assert) => {
    const {root, el} = stage({dismissAfterMs: 30});

    hover(root, 100, 100);
    await new Promise((resolve) => setTimeout(resolve, 60));

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointermove', 120, 110);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('dismiss() pops it out for good, even across visits', (assert) => {
    const {root, el, hint} = stage();

    hover(root, 100, 100);
    hint.dismiss();

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 900, 50);
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('does not show or position until the pointer is over the mock', (assert) => {
    const {el} = stage();

    assert.equal(el.classList.contains('is-visible'), false);
    assert.equal(el.style.left, '');
    assert.equal(el.style.top, '');
});

test('destroy() removes the element from the document', (assert) => {
    const {hint} = stage();

    hint.destroy();

    assert.equal(document.body.querySelector('[data-explore-hint]'), null);
});
