import {cubicBezierEasingCached} from './easing.ts';
import {
    PRESS_MS,
    RING_MS,
    compile,
    DEFAULT_MOTION,
    distancePx,
    moveDurationMs,
    moveIndexAt,
    positionAt,
    stretchMoveGlide,
} from './timeline.ts';
import {assertScriptRoutine} from './assert-routine.ts';
import {exploreHint} from './explore-hint.ts';
import {pressableElement} from './pressable.ts';
import type {Busker, MotionConfig, Move, Point, Routine, Task} from './types.ts';
import {meetsViewportVisibility} from './viewport.ts';

const DEFAULT_START: Point = [0.5, 0.5];
/** How long a missed click keeps the clickable things lit up. */
const HINT_MS = 1500;

/**
 * Put on a show inside `root`.
 *
 * Markup: `[data-cursor]` for the pointer. UI state (scenes, modals, etc.) is
 * yours — use real click handlers and optional `tasks` / `onLoop`.
 */
export function busk(root: HTMLElement, routine: Routine): Busker {
    assertScriptRoutine(routine);

    const cursor = root.querySelector<HTMLElement>('[data-cursor]');

    const motion: MotionConfig = {...DEFAULT_MOTION, ...routine.motion};
    const glideEase = cubicBezierEasingCached(motion.easing ?? DEFAULT_MOTION.easing);
    const start = routine.start ?? DEFAULT_START;
    const clickTargets = routine.clickTargets ?? [];
    const visibility = routine.visibility ?? 1;
    const scriptSteps = routine.steps;

    /** Where each selector was last seen, in case it stops being anywhere. */
    const lastSeen = new Map<string, Point>();

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

    const resolveTarget = (to: string | Point, _from: Point): Point | null => resolve(to);

    function scheduleScript(): {moves: Move[]; duration: number; tasks: Task[]} {
        const startPx = resolve(start) ?? [root.clientWidth / 2, root.clientHeight / 2];

        return compile(scriptSteps ?? [], resolveTarget, motion, startPx);
    }

    let scriptSchedule = scheduleScript();
    let moves = scriptSchedule.moves;
    let duration = scriptSchedule.duration;
    let tasks: Task[] = [...scriptSchedule.tasks].sort((a, b) => a.at - b.at);

    let elapsed = 0;
    let last = 0;
    let rafId = 0;
    let viewportSyncRafId = 0;
    let viewportSyncQueued = false;
    let playing = false;
    let aside = false;
    let destroyed = false;
    /** Remeasure glides once the root has real layout (showcases often mount off-screen). */
    let syncedLayoutForPlayback = false;
    /** Steps already pressed this time round, so each one fires exactly once. */
    const pressed = new Set<number>();
    /** Tasks already run this loop. */
    const firedTasks = new Set<number>();
    /** Set while the show clicks for itself, so it does not mistake that for a visitor. */
    let clickingItself = false;

    /** Px endpoints for each move, fixed when the glide starts (DOM may move after click). */
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
        moves.forEach((move, i) => {
            if (move.press === undefined || t < move.press + PRESS_MS || pressed.has(i)) return;
            pressed.add(i);
            if (typeof move.to !== 'string') return;

            const el = queryShown(move.to);

            if (!el) return;

            clickingItself = true;
            try {
                el.click();
            } catch {
                // Mock handlers must not take down the show mid-loop.
            } finally {
                clickingItself = false;
            }
        });
    }

    function runTasks(t: number): void {
        tasks.forEach((task, i) => {
            if (t < task.at || firedTasks.has(i)) return;
            firedTasks.add(i);
            try {
                task.run();
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

    function scriptedPressTarget(move: Move | null, t: number): HTMLElement | null {
        if (aside || !move || typeof move.to !== 'string' || move.press === undefined) return null;
        if (t < move.press || t >= move.press + PRESS_MS) return null;

        const el = queryShown(move.to);

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
    function scriptedHoverTarget(move: Move | null, index: number, t: number): HTMLElement | null {
        if (aside || !move || typeof move.to !== 'string' || t < move.from) return null;

        if (move.press !== undefined) {
            if (t >= move.press + PRESS_MS) return null;
        } else {
            const nextFrom = moves[index + 1]?.from ?? Number.POSITIVE_INFINITY;

            if (t >= nextFrom) return null;
        }

        const el = queryShown(move.to);

        if (!el || !isShown(el)) return null;

        const parked = t >= move.until;
        const over =
            Number.isFinite(shownCursorX) &&
            Number.isFinite(shownCursorY) &&
            demoCursorOverElement(el, shownCursorX, shownCursorY);

        return parked || over ? el : null;
    }

    function prepareGlide(index: number, t: number): void {
        if (index < 0 || index <= glidePreparedThrough) return;

        const move = moves[index];

        if (!move || t < move.from) return;

        const fromPt =
            index === 0
                ? resolve(start)
                : (glideEndpoints.get(index - 1)?.to ?? resolve(moves[index - 1].to));
        const toPt = resolve(move.to);

        if (!fromPt || !toPt) return;

        glideEndpoints.set(index, {from: fromPt, to: toPt});

        const glideMs = moveDurationMs(distancePx(fromPt, toPt), motion);
        const delta = stretchMoveGlide(moves, tasks, index, glideMs, t);

        if (delta !== 0) duration += delta;

        glidePreparedThrough = index;
    }

    function drawCursor(move: Move | null, index: number, t: number): void {
        if (!cursor) return;

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
                resolve(index > 0 ? moves[index - 1].to : start);
            to = resolve(move ? move.to : start);
        }

        if (!from || !to) return;

        {
            const [x, y] = positionAt(from, to, move, t, glideEase);
            const rx = Math.round(x * 10) / 10;
            const ry = Math.round(y * 10) / 10;

            if (rx !== shownCursorX || ry !== shownCursorY) {
                shownCursorX = rx;
                shownCursorY = ry;
                cursor.style.translate = `calc(${rx}px - 50%) calc(${ry}px - 50%)`;
            }
        }

        setShownHover(scriptedHoverTarget(move, index, t));
        setShownPressed(scriptedPressTarget(move, t));

        const pressing = move?.press !== undefined && t >= move.press && t < move.press + PRESS_MS;

        if (pressing !== shownPressing) {
            shownPressing = pressing;
            cursor.classList.toggle('is-pressing', pressing);
        }

        const ringing = move?.press !== undefined && t >= move.press && t < move.press + RING_MS;

        if (ringing !== shownRinging) {
            shownRinging = ringing;
            cursor.classList.toggle('is-ringing', ringing);
        }
    }

    function render(t: number, scheduleTasks = false): void {
        if (scheduleTasks) runTasks(t);

        const index = moveIndexAt(moves, t);

        prepareGlide(index, t);
        drawCursor(index >= 0 ? moves[index] : null, index, t);
    }

    function remeasureScript(): void {
        glidePreparedThrough = -1;
        glideEndpoints.clear();
        shownCursorX = Number.NaN;
        shownCursorY = Number.NaN;
        scriptSchedule = scheduleScript();
        moves = scriptSchedule.moves;
        duration = scriptSchedule.duration;
        tasks = [...scriptSchedule.tasks].sort((a, b) => a.at - b.at);
    }

    function wrapLoop(): void {
        routine.onLoop?.();

        glidePreparedThrough = -1;
        glideEndpoints.clear();
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
            firedTasks.clear();
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

    const hint = routine.exploreHint ? exploreHint(root, routine.exploreHint, reducedMotion) : null;

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
        if (document.hidden) {
            pause();
            return;
        }

        if (meetsViewportVisibility(root, visibility)) play();
        else pause();
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
        observer?.disconnect();
        hint?.destroy();
        root.removeEventListener('click', onClick);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('scroll', scheduleSyncViewportPlayback);
        window.removeEventListener('resize', scheduleSyncViewportPlayback);
        setShownHover(null);
        setShownPressed(null);
        root.querySelectorAll('.is-hint').forEach((el) => el.classList.remove('is-hint'));
        root.querySelectorAll('.is-pressed').forEach((el) => el.classList.remove('is-pressed'));
        root.querySelectorAll('.is-interactive').forEach((el) => el.classList.remove('is-interactive'));
        root.classList.remove('busker', 'is-aside');
        cursor?.classList.remove('is-visible', 'is-pressing', 'is-ringing');
    }

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
        window.addEventListener('resize', scheduleSyncViewportPlayback, {passive: true});
        window.addEventListener('load', scheduleSyncViewportPlayback, {once: true});
        document.fonts?.ready.then(scheduleSyncViewportPlayback);
        syncViewportPlayback();
        cursor?.classList.add('is-visible');
    }

    return {
        get duration(): number {
            return duration;
        },
        play,
        pause,
        stepAside,
        destroy,
    };
}
