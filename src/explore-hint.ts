import type {ExploreHintConfig} from './types.ts';

/** Default label inside the explore-hint pill. */
export const EXPLORE_HINT_TEXT = 'Click to explore';
/** How long the hint stays up per visit before it pops out (ms). */
export const EXPLORE_HINT_DISMISS_MS = 3000;
/** Default gap to the right of the pointer. */
export const EXPLORE_HINT_OFFSET_X = '1.75rem';
/** Pointer-follow smoothing per frame. */
const LERP = 0.35;

export interface ExploreHint {
    /** Pop the hint out for good — the visitor got the message. */
    dismiss(): void;
    /** Remove listeners and the element itself. */
    destroy(): void;
}

/**
 * A "click to explore" pill that tails the visitor's pointer over the mock.
 * Pops in on every hover, follows with a little lag, and pops out a few
 * seconds later — back again on the next visit. Once the visitor clicks, it
 * is gone for good. Busker creates and owns the element; there is no markup
 * to add.
 *
 * The outer span takes the `translate` (position) and the inner one takes the
 * `scale` (pop), so the pop never distorts the follow offset.
 */
export function exploreHint(
    root: HTMLElement,
    config: boolean | string | ExploreHintConfig,
    reducedMotion: boolean,
): ExploreHint {
    const options: ExploreHintConfig =
        typeof config === 'boolean' ? {} : typeof config === 'string' ? {text: config} : config;
    const dismissAfterMs =
        options.dismissAfterMs ?? options.durationMs ?? EXPLORE_HINT_DISMISS_MS;
    const offsetX = options.offsetX ?? EXPLORE_HINT_OFFSET_X;

    const hint = document.createElement('span');
    hint.dataset.exploreHint = '';
    hint.setAttribute('aria-hidden', 'true');

    const pop = document.createElement('span');
    pop.dataset.exploreHintPop = '';
    pop.textContent = options.text ?? EXPLORE_HINT_TEXT;
    hint.append(pop);
    root.append(hint);

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let hovering = false;
    let goneForGood = false;
    let dismissTimer = 0;

    const render = (): void => {
        hint.style.translate = `calc(${currentX}px + ${offsetX}) calc(${currentY}px - 50%)`;
    };

    const animate = (): void => {
        currentX += (targetX - currentX) * LERP;
        currentY += (targetY - currentY) * LERP;
        render();

        if (hovering || Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
            rafId = requestAnimationFrame(animate);
        } else {
            rafId = 0;
        }
    };

    const start = (): void => {
        if (!rafId && !reducedMotion) rafId = requestAnimationFrame(animate);
    };

    const hide = (): void => {
        hovering = false;
        hint.classList.remove('is-visible');
    };

    const dismiss = (): void => {
        goneForGood = true;
        clearTimeout(dismissTimer);
        hide();
    };

    const onPointerEnter = (event: PointerEvent): void => {
        if (goneForGood || event.pointerType === 'touch') return;

        const rect = root.getBoundingClientRect();

        targetX = event.clientX - rect.left;
        targetY = event.clientY - rect.top;
        currentX = targetX;
        currentY = targetY;
        hovering = true;
        render();
        hint.classList.add('is-visible');
        clearTimeout(dismissTimer);
        dismissTimer = window.setTimeout(hide, dismissAfterMs);
        start();
    };

    const onPointerMove = (event: PointerEvent): void => {
        if (!hovering) return;

        const rect = root.getBoundingClientRect();

        targetX = event.clientX - rect.left;
        targetY = event.clientY - rect.top;

        if (reducedMotion) {
            currentX = targetX;
            currentY = targetY;
            render();
        } else {
            start();
        }
    };

    const onPointerLeave = (): void => {
        clearTimeout(dismissTimer);
        dismissTimer = 0;
        hide();
    };

    const onRootClick = (): void => {
        clearTimeout(dismissTimer);
        dismissTimer = 0;
        hide();
    };

    root.addEventListener('pointerenter', onPointerEnter);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('click', onRootClick);

    return {
        dismiss,
        destroy(): void {
            clearTimeout(dismissTimer);
            cancelAnimationFrame(rafId);
            root.removeEventListener('pointerenter', onPointerEnter);
            root.removeEventListener('pointermove', onPointerMove);
            root.removeEventListener('pointerleave', onPointerLeave);
            root.removeEventListener('click', onRootClick);
            hint.remove();
        },
    };
}
