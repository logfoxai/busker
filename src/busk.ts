import {
    PRESS_MS,
    RING_MS,
    compile,
    countdownText,
    DEFAULT_MOTION,
    isOn,
    moveIndexAt,
    positionAt,
    typedText,
} from './timeline.ts';
import type {Busker, MotionConfig, Move, Point, Routine, Task} from './types.ts';

const DEFAULT_START: Point = [0.5, 0.5];
/** IntersectionObserver ratios are floating point; 1 is rarely exactly 1. */
const VISIBILITY_SLACK = 0.001;
/** How long a missed click keeps the clickable things lit up. */
const HINT_MS = 1500;

/** How much of `el` is inside the viewport, as a fraction of its own area. */
function visibleFraction(el: Element): number {
    const rect = el.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return 0;

    const w = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    const h = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

    if (w <= 0 || h <= 0) return 0;

    return (w * h) / (rect.width * rect.height);
}

/**
 * Put on a show inside `root`.
 *
 * Markup: `[data-cursor]` for the pointer. UI state (scenes, modals, etc.) is
 * yours — use real click handlers and optional `tasks` / `onLoop`.
 */
export function busk(root: HTMLElement, routine: Routine): Busker {
    const cursor = root.querySelector<HTMLElement>('[data-cursor]');

    const motion: MotionConfig = {...DEFAULT_MOTION, ...routine.motion};
    const start = routine.start ?? DEFAULT_START;
    const clickTargets = routine.clickTargets ?? [];
    const visibility = routine.visibility ?? 1;
    const scriptSteps = routine.steps;

    /** Where each selector was last seen, in case it stops being anywhere. */
    const lastSeen = new Map<string, Point>();

    /** Where a move target sits, in px relative to the root's top-left. */
    function resolve(target: string | Point): Point | null {
        if (Array.isArray(target)) return [target[0] * root.clientWidth, target[1] * root.clientHeight];

        const rect = root.querySelector(target)?.getBoundingClientRect();

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

    let scriptSchedule = scriptSteps ? scheduleScript() : null;
    let moves = scriptSchedule?.moves ?? routine.moves ?? [];
    let duration = scriptSchedule?.duration ?? routine.duration ?? 0;
    let tasks: Task[] = [
        ...(scriptSchedule?.tasks ?? []),
        ...(routine.tasks ?? []),
    ].sort((a, b) => a.at - b.at);

    let elapsed = 0;
    let last = 0;
    let rafId = 0;
    let viewportSyncRafId = 0;
    let viewportSyncQueued = false;
    let playing = false;
    let aside = false;
    let destroyed = false;
    /** Steps already pressed this time round, so each one fires exactly once. */
    const pressed = new Set<number>();
    /** Tasks already run this loop. */
    const firedTasks = new Set<number>();
    /** Set while the show clicks for itself, so it does not mistake that for a visitor. */
    let clickingItself = false;

    let shownHover: Element | null = null;
    let shownPressing = false;
    let shownRinging = false;
    const shownToggle = new WeakMap<HTMLElement, string>();
    const shownText = new WeakMap<HTMLElement, string>();

    /**
     * Really click the steps whose press has lifted, each once per loop. The
     * click lands at the end of the stroke, the way a real one does, so the
     * cursor reads on the element before the click takes it away.
     */
    function press(t: number): void {
        if (!scriptSteps) return;

        moves.forEach((move, i) => {
            if (move.press === undefined || t < move.press + PRESS_MS || pressed.has(i)) return;
            pressed.add(i);
            if (typeof move.to !== 'string') return;

            const el = root.querySelector<HTMLElement>(move.to);

            if (!el) return;

            clickingItself = true;
            try {
                el.click();
            } finally {
                clickingItself = false;
            }
        });
    }

    function runTasks(t: number): void {
        tasks.forEach((task, i) => {
            if (t < task.at || firedTasks.has(i)) return;
            firedTasks.add(i);
            task.run();
        });
    }

    function drawCursor(move: Move | null, index: number, t: number): void {
        if (!cursor) return;

        const from = resolve(index > 0 ? moves[index - 1].to : start);
        const to = resolve(move ? move.to : start);

        if (from && to) {
            const [x, y] = positionAt(from, to, move, t);

            cursor.style.translate = `calc(${x}px - 50%) calc(${y}px - 50%)`;
        }

        const hover = move && typeof move.to === 'string' && t >= move.until
            ? root.querySelector(move.to)
            : null;

        if (hover !== shownHover) {
            shownHover?.classList.remove('is-hover');
            shownHover = hover;
            hover?.classList.add('is-hover');
        }

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

    function write(el: HTMLElement, text: string): void {
        if (shownText.get(el) === text) return;
        shownText.set(el, text);
        el.textContent = text;
    }

    function render(t: number, scheduleTasks = false): void {
        for (const toggle of toggles) {
            const key = `${toggle.class}:${isOn(toggle, t)}`;

            if (shownToggle.get(toggle.el) === key) continue;
            shownToggle.set(toggle.el, key);
            toggle.el.classList.toggle(toggle.class, isOn(toggle, t));
        }

        for (const typing of typings) write(typing.el, typedText(typing, t));
        for (const countdown of countdowns) write(countdown.el, countdownText(countdown, t));

        const index = moveIndexAt(moves, t);

        drawCursor(index >= 0 ? moves[index] : null, index, t);
        if (scheduleTasks) runTasks(t);
    }

    function wrapLoop(): void {
        routine.onLoop?.();

        if (scriptSteps) {
            scriptSchedule = scheduleScript();
            moves = scriptSchedule.moves;
            duration = scriptSchedule.duration;
            tasks = [...scriptSchedule.tasks, ...(routine.tasks ?? [])].sort((a, b) => a.at - b.at);
        }
    }

    function frame(now: number): void {
        if (!playing) return;

        const next = elapsed + (now - last);

        if (next >= duration) {
            elapsed = duration;
            render(elapsed, true);
            press(elapsed);
            pressed.clear();
            firedTasks.clear();
            wrapLoop();
            elapsed = 0;
        } else {
            elapsed = next;
            render(elapsed, true);
            press(elapsed);
        }

        last = now;
        rafId = requestAnimationFrame(frame);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function play(): void {
        if (playing || aside || destroyed || reducedMotion || duration <= 0) return;
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
        root.classList.add('is-aside');
        shownHover?.classList.remove('is-hover');
        shownHover = null;
        shownPressing = false;
        shownRinging = false;
    }

    const onClick = (e: Event): void => {
        if (destroyed) return;

        const hit = clickTargets.some((selector) => {
            const el = (e.target as Element).closest(selector);

            return el !== null && root.contains(el);
        });

        if (clickingItself) return;

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
        if (document.hidden) return;
        if (visibleFraction(root) >= visibility - VISIBILITY_SLACK) play();
        else pause();
    };

    const scheduleSyncViewportPlayback = (): void => {
        if (viewportSyncQueued) return;
        viewportSyncQueued = true;
        viewportSyncRafId = requestAnimationFrame(() => {
            viewportSyncQueued = false;
            viewportSyncRafId = 0;
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
        root.removeEventListener('click', onClick);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('scroll', scheduleSyncViewportPlayback);
        window.removeEventListener('resize', scheduleSyncViewportPlayback);
        shownHover?.classList.remove('is-hover');
        shownHover = null;
        root.querySelectorAll('.is-hint').forEach((el) => el.classList.remove('is-hint'));
        root.querySelectorAll('.is-interactive').forEach((el) => el.classList.remove('is-interactive'));
        root.classList.remove('busker', 'is-aside');
        cursor?.classList.remove('is-visible', 'is-pressing', 'is-ringing');
    }

    /** Selectors are resolved once; the elements they point at may not exist. */
    const found = <T extends {target: string}>(items: T[] | undefined): (T & {el: HTMLElement})[] =>
        (items ?? []).flatMap((item) => {
            const el = root.querySelector<HTMLElement>(item.target);

            return el ? [{...item, el}] : [];
        });

    const toggles = found(routine.toggles);
    const typings = found(routine.typing);
    const countdowns = found(routine.countdowns);

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
