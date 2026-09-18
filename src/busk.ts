import {cubicBezierEasingCached} from './easing.ts';
import {
    PRESS_MS,
    RING_MS,
    compile,
    DEFAULT_MOTION,
    distancePx,
    glideDurationMs,
    glideIndexAt,
    positionAt,
    stretchGlide,
} from './timeline.ts';
import {assertRoutine} from './assert-routine.ts';
import {exploreHint} from './explore-hint.ts';
import {pressableElement} from './pressable.ts';
import type {Busker, Glide, MotionConfig, Point, Routine, ScheduledRun} from './types.ts';
import {meetsViewportVisibility} from './viewport.ts';

const DEFAULT_START: Point = [0.5, 0.5];
/** How long a missed click keeps the clickable things lit up. */
const HINT_MS = 1500;

function mountDemoCursor(root: HTMLElement): {el: HTMLElement; owned: boolean} {
    const existing = root.querySelector<HTMLElement>('[data-cursor]');

    if (existing) return {el: existing, owned: false};

    const el = document.createElement('span');

    el.setAttribute('data-cursor', '');
    el.setAttribute('aria-hidden', 'true');
    root.appendChild(el);

    return {el, owned: true};
}

/**
 * Put on a show inside `root`.
 *
 * UI state (scenes, modals, etc.) is yours — use real click handlers and `{ run }`
 * steps. Busker creates `[data-cursor]` when your markup omits it.
 */
export function busk(root: HTMLElement, routine: Routine): Busker {
    assertRoutine(routine);

    const {el: cursor, owned: cursorOwned} = mountDemoCursor(root);

    const motion: MotionConfig = {...DEFAULT_MOTION, ...routine.motion};
    const glideEase = cubicBezierEasingCached(motion.easing ?? DEFAULT_MOTION.easing);
    const start = routine.start ?? DEFAULT_START;
    const clickTargets = routine.clickTargets ?? [];
    const visibility = routine.visibility ?? 1;
    const scriptSteps = routine.steps;

    /** Where each selector was last seen, in case it stops being anywhere. */
    const lastSeen = new Map<string, Point>();
    /**
     * Where each glide's target sat when its press began. After a press the
     * cursor unbinds — following a live target through a reflow rides the
     * layout instead of reading as a finished click.
     */
    const frozenAtPress = new Map<number, Point>();

    /** Skip stacked duplicates (e.g. two view layers) that are hidden but still in layout. */
    function isShown(el: Element): boolean {
        if (!root.contains(el)) return false;

        for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
            const style = getComputedStyle(node);

            if (style.display === 'none' || style.visibility === 'hidden') return false;
        }

        const rect = el.getBoundingClientRect();

        return rect.width > 0 && rect.height > 0;
    }

    function queryShown(selector: string): HTMLElement | null {
        for (const el of root.querySelectorAll<HTMLElement>(selector)) {
            if (isShown(el)) return el;
        }

        return root.querySelector<HTMLElement>(selector);
    }

    /** Where a move target sits, in px relative to the root's top-left. */
    function resolve(target: string | Point): Point | null {
        if (Array.isArray(target)) return [target[0] * root.clientWidth, target[1] * root.clientHeight];

        const rect = queryShown(target)?.getBoundingClientRect();

        if (!rect || (rect.width === 0 && rect.height === 0)) return lastSeen.get(target) ?? null;

        const rootRect = root.getBoundingClientRect();
        const at: Point = [
            rect.left - rootRect.left + rect.width / 2,
            rect.top - rootRect.top + rect.height / 2,
        ];

        lastSeen.set(target, at);

        return at;
    }

    /** Aim point for a glide: live until press, then the frozen press point. */
    function aimPoint(glideIndex: number, t: number): Point | null {
        if (glideIndex < 0) return resolve(start);

        const glide = glides[glideIndex];
        const frozen = frozenAtPress.get(glideIndex);

        if (frozen) return frozen;

        const at = resolve(glide.to);

        if (at && glide.press !== undefined && t >= glide.press) {
            frozenAtPress.set(glideIndex, at);
        }

        return at;
    }

    const resolveTarget = (to: string | Point, _from: Point): Point | null => resolve(to);

    function scheduleScript(): {glides: Glide[]; duration: number; runs: ScheduledRun[]} {
        const startPx = resolve(start) ?? [root.clientWidth / 2, root.clientHeight / 2];

        return compile(scriptSteps ?? [], resolveTarget, motion, startPx);
    }

    let scriptSchedule = scheduleScript();
    let glides = scriptSchedule.glides;
    let duration = scriptSchedule.duration;
    let runs: ScheduledRun[] = [...scriptSchedule.runs].sort((a, b) => a.at - b.at);

    let elapsed = 0;
    let last = 0;
    let rafId = 0;
    let viewportSyncRafId = 0;
    let viewportSyncQueued = false;
    let resizeQuietRafOuter = 0;
    let resizeQuietRafInner = 0;
    let resizeGeneration = 0;
    let resizing = false;
    let playing = false;
    let aside = false;
    let destroyed = false;
    /** Remeasure glides once the root has real layout (showcases often mount off-screen). */
    let syncedLayoutForPlayback = false;
    /** Steps already pressed this time round, so each one fires exactly once. */
    const pressed = new Set<number>();
    /** Scheduled `{ run }` steps already fired this loop. */
    const firedRuns = new Set<number>();
    /** Set while the show clicks for itself, so it does not mistake that for a visitor. */
    let clickingItself = false;
    /** After a scripted press, ignore spurious pointerleave from scene/modal layout churn. */
    let hintScriptedLeaveGraceUntil = 0;
    const HINT_SCRIPTED_LEAVE_GRACE_MS = 320;

    /** Px endpoints for each glide, fixed when the glide starts (DOM may move after click). */
    const glideEndpoints = new Map<number, {from: Point; to: Point}>();
    let glidePreparedThrough = -1;

    let shownHover: Element | null = null;
    let shownPressed: Element | null = null;
    let shownPressing = false;
    let shownRinging = false;
    let shownCursorX = Number.NaN;
    let shownCursorY = Number.NaN;
    /**
     * Really click the steps whose press has lifted, each once per loop. The
     * click lands at the end of the stroke, the way a real one does, so the
     * cursor reads on the element before the click takes it away.
     */
    function press(t: number): void {
        glides.forEach((glide, i) => {
            if (glide.press === undefined || t < glide.press + PRESS_MS || pressed.has(i)) return;
            pressed.add(i);
            if (typeof glide.to !== 'string') return;

            const el = queryShown(glide.to);

            if (!el) return;

            clickingItself = true;
            try {
                el.click();
            } catch {
                // Mock handlers must not take down the show mid-loop.
            } finally {
                clickingItself = false;
                hintScriptedLeaveGraceUntil = performance.now() + HINT_SCRIPTED_LEAVE_GRACE_MS;
            }
        });
    }

    function fireScheduledRuns(t: number): void {
        runs.forEach((run, i) => {
            if (t < run.at || firedRuns.has(i)) return;
            firedRuns.add(i);
            try {
                run.run();
            } catch {
                // Routine `run` steps must not take down the show mid-loop.
            }
        });
    }

    function setShownHover(hover: Element | null): void {
        if (hover === shownHover) return;
        shownHover?.classList.remove('is-hover');
        shownHover = hover;
        hover?.classList.add('is-hover');
    }

    function setShownPressed(pressedEl: Element | null): void {
        if (pressedEl === shownPressed) return;
        shownPressed?.classList.remove('is-pressed');
        shownPressed = pressedEl;
        pressedEl?.classList.add('is-pressed');
    }

    function scriptedPressTarget(glide: Glide | null, t: number): HTMLElement | null {
        if (aside || !glide || typeof glide.to !== 'string' || glide.press === undefined) return null;
        if (t < glide.press || t >= glide.press + PRESS_MS) return null;

        const el = queryShown(glide.to);

        if (!el || !isShown(el)) return null;

        return pressableElement(el);
    }

    /** Whether the demo cursor (root-relative px) is over `el`'s box. */
    function demoCursorOverElement(el: HTMLElement, rootX: number, rootY: number): boolean {
        const rootRect = root.getBoundingClientRect();
        const clientX = rootRect.left + rootX;
        const clientY = rootRect.top + rootY;
        const rect = el.getBoundingClientRect();

        return (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
        );
    }

    /**
     * Demo hover on the current step target only — not other clickTargets along the path.
     * Lights up when the cursor reaches that element, then holds through dwell and press.
     */
    function scriptedHoverTarget(glide: Glide | null, index: number, t: number): HTMLElement | null {
        if (aside || !glide || typeof glide.to !== 'string' || t < glide.from) return null;

        if (glide.press !== undefined) {
            if (t >= glide.press + PRESS_MS) return null;
        } else {
            const nextFrom = glides[index + 1]?.from ?? Number.POSITIVE_INFINITY;

            if (t >= nextFrom) return null;
        }

        const el = queryShown(glide.to);

        if (!el || !isShown(el)) return null;

        const parked = t >= glide.until;
        const over =
            Number.isFinite(shownCursorX) &&
            Number.isFinite(shownCursorY) &&
            demoCursorOverElement(el, shownCursorX, shownCursorY);

        return parked || over ? el : null;
    }

    function prepareGlide(index: number, t: number): void {
        if (index < 0 || index <= glidePreparedThrough) return;

        const glide = glides[index];

        if (!glide || t < glide.from) return;

        const fromPt =
            index === 0
                ? resolve(start)
                : (glideEndpoints.get(index - 1)?.to ?? resolve(glides[index - 1].to));
        const toPt = resolve(glide.to);

        if (!fromPt || !toPt) return;

        glideEndpoints.set(index, {from: fromPt, to: toPt});

        const glideMs = glideDurationMs(distancePx(fromPt, toPt), motion);
        const delta = stretchGlide(glides, runs, index, glideMs, t);

        if (delta !== 0) duration += delta;

        glidePreparedThrough = index;
    }

    function drawCursor(glide: Glide | null, index: number, t: number): void {
        let from: Point | null = null;
        let to: Point | null = null;

        if (index >= 0) {
            const locked = glideEndpoints.get(index);

            if (locked) {
                from = locked.from;
                to = locked.to;
            }
        }

        if (!from || !to) {
            from =
                (index > 0 ? glideEndpoints.get(index - 1)?.to : null) ??
                aimPoint(index > 0 ? index - 1 : -1, t);
            to = glide ? aimPoint(index, t) : resolve(start);
        } else if (glide && glide.press !== undefined && t >= glide.press) {
            const frozen = frozenAtPress.get(index) ?? to;

            frozenAtPress.set(index, frozen);
            to = frozen;
        }

        if (!from || !to) return;

        {
            const [x, y] = positionAt(from, to, glide, t, glideEase);
            const rx = Math.round(x * 10) / 10;
            const ry = Math.round(y * 10) / 10;

            if (rx !== shownCursorX || ry !== shownCursorY) {
                shownCursorX = rx;
                shownCursorY = ry;
                cursor.style.translate = `calc(${rx}px - 50%) calc(${ry}px - 50%)`;
            }
        }

        setShownHover(scriptedHoverTarget(glide, index, t));
        setShownPressed(scriptedPressTarget(glide, t));

        const pressing = glide?.press !== undefined && t >= glide.press && t < glide.press + PRESS_MS;

        if (pressing !== shownPressing) {
            shownPressing = pressing;
            cursor.classList.toggle('is-pressing', pressing);
        }

        const ringing = glide?.press !== undefined && t >= glide.press && t < glide.press + RING_MS;

        if (ringing !== shownRinging) {
            shownRinging = ringing;
            cursor.classList.toggle('is-ringing', ringing);
        }
    }

    function render(t: number, scheduleRuns = false): void {
        if (scheduleRuns) fireScheduledRuns(t);

        const index = glideIndexAt(glides, t);

        prepareGlide(index, t);
        drawCursor(index >= 0 ? glides[index] : null, index, t);
    }

    function remeasureScript(): void {
        glidePreparedThrough = -1;
        glideEndpoints.clear();
        frozenAtPress.clear();
        shownCursorX = Number.NaN;
        shownCursorY = Number.NaN;
        scriptSchedule = scheduleScript();
        glides = scriptSchedule.glides;
        duration = scriptSchedule.duration;
        runs = [...scriptSchedule.runs].sort((a, b) => a.at - b.at);
    }

    function wrapLoop(): void {
        glidePreparedThrough = -1;
        glideEndpoints.clear();
        frozenAtPress.clear();
        shownCursorX = Number.NaN;
        shownCursorY = Number.NaN;
        setShownHover(null);
        setShownPressed(null);

        remeasureScript();
    }

    function advancePlayhead(next: number): void {
        if (duration > 0 && next >= duration) {
            const finishedAt = duration;

            elapsed = finishedAt;
            press(elapsed);
            render(elapsed, true);
            pressed.clear();
            firedRuns.clear();
            wrapLoop();

            const remainder = next - finishedAt;

            // One loop boundary per frame. Small overrun keeps remainder; big jumps restart the loop.
            elapsed = remainder >= duration ? 0 : remainder;
        } else {
            elapsed = next;
        }

        // Clicks before glides so the same frame can open a scene before remeasuring targets.
        press(elapsed);
        render(elapsed, true);
    }

    function frame(now: number): void {
        if (!playing) return;

        try {
            advancePlayhead(elapsed + (now - last));
            last = now;
        } catch {
            pause();
            return;
        }

        rafId = requestAnimationFrame(frame);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const exploreHintOption = routine.exploreHint;
    const hint =
        exploreHintOption === false
            ? null
            : exploreHint(
                  root,
                  exploreHintOption === undefined ? true : exploreHintOption,
                  reducedMotion,
                  {
                      click: () => clickingItself,
                      leave: () =>
                          clickingItself || performance.now() < hintScriptedLeaveGraceUntil,
                  },
              );

    function play(): void {
        if (playing || aside || destroyed || reducedMotion || duration <= 0) return;

        if (!syncedLayoutForPlayback && root.clientWidth > 0 && root.clientHeight > 0) {
            remeasureScript();
            syncedLayoutForPlayback = true;
        }

        playing = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    function pause(): void {
        playing = false;
        cancelAnimationFrame(rafId);
    }

    function stepAside(): void {
        if (aside) return;
        aside = true;
        pause();
        hint?.dismiss();
        root.classList.add('is-aside');
        setShownHover(null);
        setShownPressed(null);
        shownPressing = false;
        shownRinging = false;
    }

    /** Keep scripted `.click()` inside the mock from reaching window listeners (e.g. docs search). */
    const stopScriptedClickBubble = (e: Event): void => {
        if (clickingItself) e.stopPropagation();
    };

    const onClick = (e: Event): void => {
        if (destroyed) return;
        if (clickingItself) return;

        const target = e.target instanceof Element ? e.target : null;
        const hit =
            target !== null &&
            clickTargets.some((selector) => {
                try {
                    const el = target.closest(selector);

                    return el !== null && root.contains(el);
                } catch {
                    return false;
                }
            });

        stepAside();

        if (hit) return;

        const targets = new Set<Element>();

        for (const selector of clickTargets) {
            root.querySelectorAll(selector).forEach((el) => targets.add(el));
        }
        targets.forEach((el) => el.classList.add('is-hint'));
        setTimeout(() => targets.forEach((el) => el.classList.remove('is-hint')), HINT_MS);
    };

    const syncViewportPlayback = (): void => {
        if (document.hidden || resizing) {
            pause();
            hint?.retract();
            return;
        }

        if (meetsViewportVisibility(root, visibility)) play();
        else {
            pause();
            hint?.retract();
        }
    };

    const scheduleSyncViewportPlayback = (): void => {
        if (viewportSyncQueued) return;
        viewportSyncQueued = true;
        viewportSyncRafId = requestAnimationFrame(() => {
            viewportSyncQueued = false;
            viewportSyncRafId = 0;

            if (root.clientWidth > 0 && root.clientHeight > 0) {
                remeasureScript();
                render(elapsed, playing);
            }

            syncViewportPlayback();
        });
    };

    const onResize = (): void => {
        resizing = true;
        pause();
        resizeGeneration += 1;
        const generation = resizeGeneration;
        cancelAnimationFrame(resizeQuietRafOuter);
        cancelAnimationFrame(resizeQuietRafInner);
        resizeQuietRafOuter = requestAnimationFrame(() => {
            resizeQuietRafOuter = 0;
            resizeQuietRafInner = requestAnimationFrame(() => {
                resizeQuietRafInner = 0;
                if (generation !== resizeGeneration) return;
                resizing = false;
                scheduleSyncViewportPlayback();
            });
        });
    };

    const onVisibilityChange = (): void => {
        if (document.hidden) pause();
        else syncViewportPlayback();
    };

    function destroy(): void {
        if (destroyed) return;
        destroyed = true;
        pause();
        cancelAnimationFrame(viewportSyncRafId);
        viewportSyncRafId = 0;
        viewportSyncQueued = false;
        cancelAnimationFrame(resizeQuietRafOuter);
        cancelAnimationFrame(resizeQuietRafInner);
        resizeQuietRafOuter = 0;
        resizeQuietRafInner = 0;
        resizeGeneration += 1;
        resizing = false;
        observer?.disconnect();
        hint?.destroy();
        root.removeEventListener('click', stopScriptedClickBubble);
        root.removeEventListener('click', onClick);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('scroll', scheduleSyncViewportPlayback);
        window.removeEventListener('resize', onResize);
        setShownHover(null);
        setShownPressed(null);
        root.querySelectorAll('.is-hint').forEach((el) => el.classList.remove('is-hint'));
        root.querySelectorAll('.is-pressed').forEach((el) => el.classList.remove('is-pressed'));
        root.querySelectorAll('.is-interactive').forEach((el) => el.classList.remove('is-interactive'));
        root.classList.remove('busker', 'is-aside');
        cursor.classList.remove('is-visible', 'is-pressing', 'is-ringing');
        if (cursorOwned) cursor.remove();
    }

    root.addEventListener('click', stopScriptedClickBubble);

    if (clickTargets.length) {
        for (const selector of clickTargets) {
            root.querySelectorAll(selector).forEach((el) => el.classList.add('is-interactive'));
        }
        root.addEventListener('click', onClick);
    }

    if (reducedMotion) {
        render(routine.freezeAt ?? 0);
    } else {
        render(elapsed);
    }

    root.classList.add('busker');

    const observer = reducedMotion
        ? undefined
        : new IntersectionObserver(
            () => {
                syncViewportPlayback();
            },
            {threshold: [...new Set([0, visibility, 1])]},
        );

    if (!reducedMotion) {
        observer?.observe(root);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('scroll', scheduleSyncViewportPlayback, {passive: true});
        window.addEventListener('resize', onResize, {passive: true});
        window.addEventListener('load', scheduleSyncViewportPlayback, {once: true});
        document.fonts?.ready.then(scheduleSyncViewportPlayback);
        syncViewportPlayback();
        cursor.classList.add('is-visible');
    }

    return {
        get duration(): number {
            return duration;
        },
        play,
        pause,
        retractExploreHint(): void {
            hint?.retract();
        },
        stepAside,
        destroy,
    };
}
