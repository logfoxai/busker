import type {ExploreHintConfig} from './types.ts';

export const EXPLORE_HINT_TEXT = 'Click to explore';
export const EXPLORE_HINT_DISMISS_MS = 1800;
export const EXPLORE_HINT_OFFSET_X = '1.75rem';

export interface ExploreHint {
    /** End the visit without disabling future visits (viewport / scroll away). */
    retract(): void;
    dismiss(): void;
    destroy(): void;
}

/** One pill per busker root; only one should be on screen at a time. */
const hintRegistry: {root: HTMLElement; hide: () => void}[] = [];

function hideOtherHints(owner: HTMLElement): void {
    for (const entry of hintRegistry) {
        if (entry.root !== owner) entry.hide();
    }
}

function registerHint(entry: {root: HTMLElement; hide: () => void}): void {
    hintRegistry.push(entry);
}

function unregisterHint(entry: {root: HTMLElement; hide: () => void}): void {
    const i = hintRegistry.indexOf(entry);

    if (i >= 0) hintRegistry.splice(i, 1);
}

const liveHintByRoot = new WeakMap<HTMLElement, ExploreHint>();

/** HMR / remount: drop pills whose mock root left the document. */
function pruneOrphanHints(): void {
    for (const el of document.querySelectorAll<HTMLElement>('[data-explore-hint]')) {
        const forId = el.dataset.exploreHintFor;
        if (!forId) continue;
        const owner = document.getElementById(forId);
        if (!owner?.isConnected) el.remove();
    }
}

/** Optional hooks when exploreHint is mounted by busker (scripted demo vs visitor). */
export interface ExploreHintHostGuard {
    /** Ignore bubbled clicks while the show presses (`el.click()`). */
    click?: () => boolean;
    /** Ignore pointerleave while layout churns after a scripted press (e.g. modal open). */
    leave?: () => boolean;
}

/** Settle after pop-out; keep ≥ longest transition on `.is-hiding [data-explore-hint-pop]` in busker.css. */
const POP_OUT_MS = 320;

export function exploreHint(
    root: HTMLElement,
    config: boolean | string | ExploreHintConfig,
    reducedMotion: boolean,
    host: ExploreHintHostGuard = {},
): ExploreHint {
    const options: ExploreHintConfig =
        typeof config === 'boolean' ? {} : typeof config === 'string' ? {text: config} : config;
    const dismissAfterMs =
        options.dismissAfterMs ?? options.durationMs ?? EXPLORE_HINT_DISMISS_MS;
    const offsetX = options.offsetX ?? EXPLORE_HINT_OFFSET_X;

    if (!root.id) root.id = `busker-${Math.random().toString(36).slice(2, 10)}`;

    liveHintByRoot.get(root)?.destroy();

    pruneOrphanHints();
    for (const stale of document.querySelectorAll<HTMLElement>(
        `[data-explore-hint-for="${root.id}"]`,
    )) {
        stale.remove();
    }

    const hint = document.createElement('span');
    hint.style.pointerEvents = 'none';
    hint.dataset.exploreHint = '';
    hint.dataset.exploreHintFor = root.id;
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
    /** After auto-dismiss or click hide, stay off until the pointer leaves the mock. */
    let suppressUntilLeave = false;
    let dismissTimer = 0;
    let popOutTimer = 0;
    let tailDocument = false;
    let placeRaf = 0;
    let leaveRaf = 0;
    let pendingPlace: PointerEvent | null = null;
    /** Bumps on settle(); stale pop-out transitionend / timeout handlers no-op. */
    let popGen = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let watchVisible = false;
    /** Invalidated on scroll/resize while the hint is visible — avoids getBoundingClientRect per move. */
    let mockRect: DOMRect | null = null;

    const moveOpts: AddEventListenerOptions = {passive: true};

    const refreshMockRect = (): DOMRect => {
        mockRect = root.getBoundingClientRect();
        return mockRect;
    };

    const invalidateMockRect = (): void => {
        mockRect = null;
    };

    const pointerInMockBox = (x: number, y: number): boolean => {
        const rect = mockRect ?? refreshMockRect();

        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const onLayoutChange = (): void => {
        invalidateMockRect();
    };

    const hintThemeProps = ['--busker-hint-bg', '--busker-hint-ink'] as const;

    /** Pill is on body; inherit page tokens from :root unless the mock root overrides. */
    const theme = (): void => {
        const docStyle = getComputedStyle(document.documentElement);
        const rootStyle = getComputedStyle(root);

        for (const prop of hintThemeProps) {
            const onMock = rootStyle.getPropertyValue(prop).trim();
            const onPage = docStyle.getPropertyValue(prop).trim();

            if (onMock && onMock !== onPage) hint.style.setProperty(prop, onMock);
            else hint.style.removeProperty(prop);
        }

        hint.style.zIndex =
            rootStyle.getPropertyValue('--busker-cursor-z-index').trim() || '2147483647';
    };
    theme();

    const themeMedia = matchMedia('(prefers-color-scheme: dark)');
    const onThemeChange = (): void => theme();
    themeMedia.addEventListener('change', onThemeChange);
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    const placeNow = (event: PointerEvent): void => {
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        hint.style.left = `calc(${event.clientX}px + ${offsetX})`;
        hint.style.top = `${event.clientY}px`;
    };

    const schedulePlace = (event: PointerEvent): void => {
        pendingPlace = event;
        if (placeRaf) return;
        placeRaf = requestAnimationFrame(() => {
            placeRaf = 0;
            if (pendingPlace) placeNow(pendingPlace);
        });
    };

    const cancelPlaceRaf = (): void => {
        if (!placeRaf) return;
        cancelAnimationFrame(placeRaf);
        placeRaf = 0;
        pendingPlace = null;
    };

    const stopTail = (): void => {
        if (!tailDocument) return;
        tailDocument = false;
        document.removeEventListener('pointermove', onTailMove, moveOpts);
    };

    const stopVisibleWatch = (): void => {
        if (!watchVisible) return;
        watchVisible = false;
        document.removeEventListener('pointermove', onVisiblePointer, moveOpts);
        window.removeEventListener('scroll', onLayoutChange, moveOpts);
        window.removeEventListener('resize', onLayoutChange, moveOpts);
        invalidateMockRect();
    };

    const startVisibleWatch = (): void => {
        if (watchVisible) return;
        watchVisible = true;
        refreshMockRect();
        document.addEventListener('pointermove', onVisiblePointer, moveOpts);
        window.addEventListener('scroll', onLayoutChange, moveOpts);
        window.addEventListener('resize', onLayoutChange, moveOpts);
    };

    const clearDismissTimer = (): void => {
        if (!dismissTimer) return;
        clearTimeout(dismissTimer);
        dismissTimer = 0;
    };

    const settle = (endVisit = true): void => {
        popGen += 1;
        clearTimeout(popOutTimer);
        popOutTimer = 0;
        clearDismissTimer();
        cancelPlaceRaf();
        stopTail();
        stopVisibleWatch();
        hint.classList.remove('is-visible', 'is-hiding');
        if (endVisit) {
            spent = false;
            suppressUntilLeave = false;
        }
    };

    const hideNow = (): void => {
        if (gone) return;
        clearDismissTimer();
        if (hint.classList.contains('is-visible') || hint.classList.contains('is-hiding')) settle(true);
    };

    const registryEntry = {root, hide: hideNow};

    registerHint(registryEntry);

    const popOut = (endVisitWhenDone = false): void => {
        if (!hint.classList.contains('is-visible')) return;
        clearTimeout(popOutTimer);
        stopVisibleWatch();
        const popOutGen = popGen;
        hint.classList.remove('is-visible');
        const finishPop = (): void => {
            if (popOutGen !== popGen) return;
            if (!endVisitWhenDone) suppressUntilLeave = true;
            settle(endVisitWhenDone);
        };
        if (reducedMotion) {
            finishPop();
            return;
        }
        void pop.offsetWidth;
        hint.classList.add('is-hiding');
        if (!tailDocument) {
            tailDocument = true;
            document.addEventListener('pointermove', onTailMove, moveOpts);
        }
        const onPopTransitionEnd = (event: TransitionEvent): void => {
            if (event.target !== pop || event.propertyName !== 'opacity') return;
            pop.removeEventListener('transitionend', onPopTransitionEnd);
            if (hint.classList.contains('is-hiding') && !hint.classList.contains('is-visible')) {
                finishPop();
            }
        };

        pop.addEventListener('transitionend', onPopTransitionEnd);
        popOutTimer = window.setTimeout(finishPop, POP_OUT_MS + 80);
    };

    const armDismiss = (): void => {
        if (dismissTimer) return;
        dismissTimer = window.setTimeout(() => {
            dismissTimer = 0;
            popOut(false);
        }, dismissAfterMs);
    };

    const popIn = (event: PointerEvent): void => {
        if (hint.classList.contains('is-visible')) return;
        if (hint.classList.contains('is-hiding')) settle(false);
        hideOtherHints(root);
        theme();
        placeNow(event);
        void pop.offsetWidth;
        hint.classList.add('is-visible');
        armDismiss();
        startVisibleWatch();
    };

    const onVisiblePointer = (event: PointerEvent): void => {
        if (gone || event.pointerType === 'touch') return;
        if (!hint.classList.contains('is-visible')) return;

        const {clientX: x, clientY: y} = event;

        // Over the mock: root pointermove owns placement (no duplicate rAF work).
        if (pointerInMockBox(x, y)) return;

        lastPointerX = x;
        lastPointerY = y;
        schedulePlace(event);
        exitIfPointerLeftMock(null, true);
    };

    const onTailMove = (event: PointerEvent): void => {
        if (gone || event.pointerType === 'touch' || !hint.classList.contains('is-hiding')) return;
        schedulePlace(event);
    };

    const onEnter = (): void => {
        if (gone) return;
        if (hint.classList.contains('is-hiding')) settle(true);
    };

    const exitIfPointerLeftMock = (
        related: EventTarget | null,
        onlyIfOutsideBox = false,
    ): void => {
        if (host.leave?.()) return;
        if (hint.classList.contains('is-hiding')) return;

        if (onlyIfOutsideBox) {
            if (pointerInMockBox(lastPointerX, lastPointerY)) return;
        } else if (related instanceof Node && root.contains(related)) {
            return;
        }

        if (dismissTimer) {
            clearTimeout(dismissTimer);
            dismissTimer = 0;
        }
        if (!hint.classList.contains('is-visible')) {
            spent = false;
            suppressUntilLeave = false;
            return;
        }
        popOut(true);
    };

    const onRootMove = (event: PointerEvent): void => {
        if (gone || event.pointerType === 'touch') return;

        if (hint.classList.contains('is-hiding')) return;

        if (hint.classList.contains('is-visible')) {
            schedulePlace(event);
            return;
        }

        if (suppressUntilLeave || spent || dismissTimer) return;

        spent = true;
        popIn(event);
    };

    const onLeave = (event: PointerEvent): void => {
        if (gone || event.pointerType === 'touch') return;

        const related = event.relatedTarget;

        if (related instanceof Node && root.contains(related)) return;

        const attempt = (): void => {
            exitIfPointerLeftMock(related);
        };

        if (leaveRaf) cancelAnimationFrame(leaveRaf);
        if (root.matches(':hover')) {
            leaveRaf = requestAnimationFrame(() => {
                leaveRaf = 0;
                attempt();
            });
        } else attempt();
    };

    const onClick = (): void => {
        if (host.click?.()) return;
        if (dismissTimer) {
            clearTimeout(dismissTimer);
            dismissTimer = 0;
        }
        popOut(false);
    };

    const onDocumentHidden = (): void => {
        if (!document.hidden) return;
        hideNow();
    };

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onRootMove, moveOpts);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', onDocumentHidden);

    const api: ExploreHint = {
        retract(): void {
            if (gone) return;
            clearDismissTimer();
            if (hint.classList.contains('is-visible')) popOut(true);
            else if (hint.classList.contains('is-hiding')) settle(true);
            else if (root.matches(':hover')) suppressUntilLeave = true;
        },
        dismiss(): void {
            gone = true;
            clearDismissTimer();
            if (hint.classList.contains('is-visible')) popOut(true);
            else settle(true);
        },
        destroy(): void {
            unregisterHint(registryEntry);
            clearDismissTimer();
            if (leaveRaf) cancelAnimationFrame(leaveRaf);
            themeMedia.removeEventListener('change', onThemeChange);
            themeObserver.disconnect();
            document.removeEventListener('visibilitychange', onDocumentHidden);
            stopVisibleWatch();
            settle(true);
            root.removeEventListener('pointerenter', onEnter);
            root.removeEventListener('pointermove', onRootMove, moveOpts);
            root.removeEventListener('pointerleave', onLeave);
            root.removeEventListener('click', onClick);
            hint.remove();
            liveHintByRoot.delete(root);
        },
    };

    liveHintByRoot.set(root, api);
    return api;
}
