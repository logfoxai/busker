import type {ExploreHintConfig} from './types.ts';

export const EXPLORE_HINT_TEXT = 'Click to explore';
export const EXPLORE_HINT_DISMISS_MS = 2000;
export const EXPLORE_HINT_OFFSET_X = '1.75rem';

export interface ExploreHint {
    dismiss(): void;
    destroy(): void;
}

const POP_OUT_MS = 260;

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
    if (root.closest('[data-hero-mock]')) hint.dataset.exploreHintScope = 'hero-mock';
    hint.setAttribute('aria-hidden', 'true');
    const pop = document.createElement('span');
    pop.dataset.exploreHintPop = '';
    const face = document.createElement('span');
    face.dataset.exploreHintFace = '';
    face.textContent = options.text ?? EXPLORE_HINT_TEXT;
    pop.append(face);
    hint.append(pop);
    document.body.append(hint);

    let gone = false;
    let spent = false;
    let dismissTimer = 0;
    let popOutTimer = 0;
    let tailDocument = false;

    const theme = (): void => {
        const s = getComputedStyle(root);
        for (const prop of ['--busker-hint-bg', '--busker-hint-ink'] as const) {
            const v = s.getPropertyValue(prop).trim();
            if (v) face.style.setProperty(prop, v);
        }
        hint.style.zIndex = s.getPropertyValue('--busker-cursor-z-index').trim() || '2147483647';
    };
    theme();

    const place = (event: PointerEvent): void => {
        hint.style.left = `calc(${event.clientX}px + ${offsetX})`;
        hint.style.top = `${event.clientY - face.offsetHeight / 2}px`;
    };

    const stopTail = (): void => {
        if (!tailDocument) return;
        tailDocument = false;
        document.removeEventListener('pointermove', onTailMove);
    };

    const settle = (): void => {
        clearTimeout(popOutTimer);
        stopTail();
        hint.classList.remove('is-visible', 'is-hiding');
    };

    const popOut = (): void => {
        if (!hint.classList.contains('is-visible')) return;
        hint.classList.remove('is-visible');
        if (reducedMotion) {
            settle();
            return;
        }
        void pop.offsetWidth;
        hint.classList.add('is-hiding');
        if (!tailDocument) {
            tailDocument = true;
            document.addEventListener('pointermove', onTailMove, {passive: true});
        }
        popOutTimer = window.setTimeout(settle, POP_OUT_MS);
    };

    const armDismiss = (): void => {
        if (dismissTimer) return;
        dismissTimer = window.setTimeout(() => {
            dismissTimer = 0;
            popOut();
        }, dismissAfterMs);
    };

    const popIn = (event: PointerEvent): void => {
        if (hint.classList.contains('is-visible')) return;
        if (hint.classList.contains('is-hiding')) settle();
        theme();
        place(event);
        void pop.offsetWidth;
        hint.classList.add('is-visible');
        armDismiss();
    };

    const onTailMove = (event: PointerEvent): void => {
        if (gone || event.pointerType === 'touch' || !hint.classList.contains('is-hiding')) return;
        place(event);
    };

    const onRootMove = (event: PointerEvent): void => {
        if (gone || event.pointerType === 'touch') return;

        if (hint.classList.contains('is-visible')) {
            place(event);
            return;
        }

        if (spent || dismissTimer) return;

        spent = true;
        popIn(event);
    };

    const onLeave = (): void => {
        const finish = (): void => {
            if (root.matches(':hover')) return;
            spent = false;
            if (dismissTimer) {
                clearTimeout(dismissTimer);
                dismissTimer = 0;
            }
            popOut();
        };

        if (root.matches(':hover')) requestAnimationFrame(finish);
        else finish();
    };

    const onClick = (): void => {
        if (dismissTimer) {
            clearTimeout(dismissTimer);
            dismissTimer = 0;
        }
        popOut();
    };

    const moveOpts: AddEventListenerOptions = {passive: true};
    root.addEventListener('pointermove', onRootMove, moveOpts);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick);

    return {
        dismiss(): void {
            gone = true;
            if (dismissTimer) {
                clearTimeout(dismissTimer);
                dismissTimer = 0;
            }
            popOut();
        },
        destroy(): void {
            if (dismissTimer) {
                clearTimeout(dismissTimer);
                dismissTimer = 0;
            }
            settle();
            root.removeEventListener('pointermove', onRootMove, moveOpts);
            root.removeEventListener('pointerleave', onLeave);
            root.removeEventListener('click', onClick);
            hint.remove();
        },
    };
}
