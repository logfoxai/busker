import {test} from 'kizu';
import {GlobalRegistrator} from '@happy-dom/global-registrator';
import {
    EXPLORE_HINT_TEXT,
    exploreHint,
    type ExploreHint,
    type ExploreHintHostGuard,
} from './explore-hint.ts';

GlobalRegistrator.register({url: 'https://busker.test', width: 1024, height: 768});

let rafQueue: FrameRequestCallback[] = [];

globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    rafQueue.push(cb);
    return rafQueue.length;
};
globalThis.cancelAnimationFrame = (): void => {
    rafQueue = [];
};

function flushRaf(): void {
    const due = rafQueue;

    rafQueue = [];
    for (const cb of due) cb(0);
}

const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);

interface FakeTimer {
    due: number;
    fn: () => void;
}

let fakeClock = 0;
let fakeTimers: FakeTimer[] = [];
let fakeTimerDepth = 0;

function withFakeClock(run: () => void): void {
    fakeClock = 0;
    fakeTimers = [];
    fakeTimerDepth += 1;
    globalThis.setTimeout = ((fn: () => void, ms = 0): ReturnType<typeof setTimeout> => {
        fakeTimers.push({due: fakeClock + ms, fn});
        return fakeTimers.length as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>): void => {
        fakeTimers = fakeTimers.filter((_, i) => i + 1 !== id);
    }) as typeof clearTimeout;

    try {
        run();
    } finally {
        fakeTimerDepth -= 1;
        if (fakeTimerDepth === 0) {
            globalThis.setTimeout = realSetTimeout;
            globalThis.clearTimeout = realClearTimeout;
            fakeTimers = [];
        }
    }
}

function advanceFakeClock(ms: number): void {
    fakeClock += ms;
    fakeTimers.sort((a, b) => a.due - b.due);
    while (fakeTimers[0] && fakeTimers[0].due <= fakeClock) {
        const next = fakeTimers.shift()!;

        next.fn();
    }
}

function pointer(
    root: HTMLElement,
    type: string,
    x: number,
    y: number,
    pointerType = 'mouse',
    relatedTarget: EventTarget | null = null,
): void {
    const event = new Event(type) as PointerEvent;

    Object.assign(event, {clientX: x, clientY: y, pointerType, relatedTarget});
    root.dispatchEvent(event);
    if (type === 'pointermove' || type === 'pointerleave') flushRaf();
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
    if (type === 'pointermove') flushRaf();
}

let activeHint: ExploreHint | undefined;

function stage(
    config: Parameters<typeof exploreHint>[1] = true,
    reducedMotion = false,
    host: ExploreHintHostGuard = {},
): {root: HTMLElement; hint: ExploreHint; el: HTMLElement} {
    activeHint?.destroy();
    document.body.innerHTML = '<div id="root"></div>';

    const root = document.getElementById('root')!;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 800, 600);

    const hint = exploreHint(root, config, reducedMotion, host);
    activeHint = hint;
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
    assert.equal(el.style.top, '200px');
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
    assert.equal(el.style.top, '150px');
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

test('ignores click while the host click guard is true', (assert) => {
    let scripted = false;
    const {root, el} = stage(true, false, {click: () => scripted});

    hover(root, 100, 200);
    scripted = true;
    root.dispatchEvent(new Event('click', {bubbles: true}));
    assert.equal(el.classList.contains('is-visible'), true);

    scripted = false;
    root.dispatchEvent(new Event('click', {bubbles: true}));
    assert.equal(el.classList.contains('is-visible'), false);
});

test('ignores pointerleave while the host leave guard is true', (assert) => {
    let suppressLeave = false;
    const {root, el} = stage(true, false, {leave: () => suppressLeave});

    hover(root, 100, 200);
    suppressLeave = true;
    pointer(root, 'pointerleave', 900, 50);
    assert.equal(el.classList.contains('is-visible'), true);

    suppressLeave = false;
    pointer(root, 'pointerleave', 900, 50);
    assert.equal(el.classList.contains('is-hiding'), true);
});

test('hides on click and can show again on the next hover', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    root.dispatchEvent(new Event('click', {bubbles: true}));

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 900, 50);
    flushRaf();
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('pops back in every time the pointer leaves and re-enters', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointerleave', 900, 50);
    flushRaf();
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), true);
});

test('pops out a beat into the visit, and pops back in on the next one', (assert) => {
    withFakeClock(() => {
        const {root, el} = stage({dismissAfterMs: 30});

        hover(root, 100, 100);
        advanceFakeClock(60);

        assert.equal(el.classList.contains('is-visible'), false);

        pointer(root, 'pointerleave', 900, 50);
        flushRaf();
        hover(root, 100, 100);

        assert.equal(el.classList.contains('is-visible'), true);
    });
});

test('does not pop back in on pointer move during pop-out after leave', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointerleave', 900, 50);
    assert.equal(el.classList.contains('is-hiding'), true);

    pointer(root, 'pointermove', 120, 110);

    assert.equal(el.classList.contains('is-visible'), false);
    assert.equal(el.classList.contains('is-hiding'), true);
});

test('does not pop back in on pointer move after click while still on the mock', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    root.dispatchEvent(new Event('click', {bubbles: true}));
    pointer(root, 'pointermove', 120, 110);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('auto-dismiss fires on schedule even if the pointer keeps moving', (assert) => {
    withFakeClock(() => {
        const {root, el} = stage({dismissAfterMs: 50});

        hover(root, 100, 100);
        for (let i = 0; i < 20; i++) {
            pointer(root, 'pointermove', 100 + i, 100 + i);
            advanceFakeClock(10);
        }

        assert.equal(el.classList.contains('is-visible'), false);
    });
});

test('does not pop back in on pointer move after auto-dismiss while still on the mock', (assert) => {
    withFakeClock(() => {
        const {root, el} = stage({dismissAfterMs: 30});

        hover(root, 100, 100);
        advanceFakeClock(60);

        assert.equal(el.classList.contains('is-visible'), false);

        pointer(root, 'pointermove', 120, 110);

        assert.equal(el.classList.contains('is-visible'), false);
    });
});

test('dismiss() pops it out for good, even across visits', (assert) => {
    const {root, el, hint} = stage();

    hover(root, 100, 100);
    hint.dismiss();

    assert.equal(el.classList.contains('is-visible'), false);

    pointer(root, 'pointerleave', 900, 50);
    flushRaf();
    hover(root, 100, 100);

    assert.equal(el.classList.contains('is-visible'), false);
});

test('does not show or position until the pointer is over the mock', (assert) => {
    const {el} = stage();

    assert.equal(el.classList.contains('is-visible'), false);
    assert.equal(el.style.left, '');
    assert.equal(el.style.top, '');
});

test('only one hint stays visible when two mocks are hovered in turn', (assert) => {
    activeHint?.destroy();
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';

    const a = document.getElementById('a')!;
    const b = document.getElementById('b')!;

    a.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 400, 300);
    b.getBoundingClientRect = (): DOMRect => new DOMRect(0, 320, 400, 300);

    exploreHint(a, true, false);
    const hintB = exploreHint(b, true, false);
    activeHint = hintB;

    const hints = (): HTMLElement[] => [...document.body.querySelectorAll('[data-explore-hint]')];

    hover(a, 50, 50);
    assert.equal(hints().filter((el) => el.classList.contains('is-visible')).length, 1);

    hover(b, 50, 50);
    assert.equal(hints().filter((el) => el.classList.contains('is-visible')).length, 1);
    assert.equal(hints()[1]?.classList.contains('is-visible'), true);
});

test('destroy() removes the element from the document', (assert) => {
    const {hint} = stage();

    hint.destroy();

    assert.equal(document.body.querySelector('[data-explore-hint]'), null);
});

test('does not cut pop-out short if pointerleave fires again while hiding', (assert) => {
    const {root, el} = stage();

    hover(root, 100, 100);
    pointer(root, 'pointerleave', 900, 50);
    assert.equal(el.classList.contains('is-hiding'), true);

    pointer(root, 'pointerleave', 900, 50);
    flushRaf();

    assert.equal(el.classList.contains('is-hiding'), true);
    assert.equal(el.classList.contains('is-visible'), false);
});

test('follows the pointer outside the mock box and hides with pop-out', (assert) => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById('root')!;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 200, 200);

    activeHint?.destroy();
    activeHint = exploreHint(root, true, false);
    const el = document.body.querySelector<HTMLElement>('[data-explore-hint]')!;

    hover(root, 50, 50);
    docPointer('pointermove', 250, 50);

    assert.equal(el.classList.contains('is-visible'), false);
    assert.equal(el.classList.contains('is-hiding'), true);
});

test('hides on pointerleave to outside the mock even when :hover lingers on the edge', (assert) => {
    document.body.innerHTML = '<div id="outside"></div><div id="root"></div>';
    const outside = document.getElementById('outside')!;
    const root = document.getElementById('root')!;

    root.getBoundingClientRect = (): DOMRect => new DOMRect(100, 100, 200, 200);

    activeHint?.destroy();
    activeHint = exploreHint(root, true, false);
    const el = document.body.querySelector<HTMLElement>('[data-explore-hint]')!;

    hover(root, 150, 150);
    pointer(root, 'pointerleave', 150, 150, 'mouse', outside);

    assert.equal(el.classList.contains('is-visible'), false);
    assert.equal(el.classList.contains('is-hiding'), true);
});
