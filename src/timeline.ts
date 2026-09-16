import type {Countdown, MotionConfig, Move, Point, Step, Task, Toggle, Typing} from './types.ts';

/** How long the cursor stays squashed after a press. */
export const PRESS_MS = 200;
/** How long the ripple ring lingers. Outlives the press so the click reads. */
export const RING_MS = 500;

export const DEFAULT_MOTION: Required<MotionConfig> = {
    baseMoveMs: 200,
    pxPerSecond: 500,
    minMoveMs: 280,
    maxMoveMs: 900,
    dwellMs: 250,
};

export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function distancePx(from: Point, to: Point): number {
    return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

/** How long a glide should take for a given distance and motion settings. */
export function moveDurationMs(distancePx: number, motion: MotionConfig = {}): number {
    const m = {...DEFAULT_MOTION, ...motion};
    const scaled = m.baseMoveMs + (distancePx / m.pxPerSecond) * 1000;

    return Math.round(Math.min(m.maxMoveMs, Math.max(m.minMoveMs, scaled)));
}

/** Resolve a step target to px in the root; return null if it is not on screen yet. */
export type ResolveTarget = (to: string | Point, from: Point) => Point | null;

/**
 * Lay a script out on a timeline. Waits and runs use fixed times; glides use
 * `resolveTarget` and `motion` so travel stays in one place, not on every step.
 */
export function compile(
    steps: Step[],
    resolveTarget: ResolveTarget,
    motion: MotionConfig = {},
    start: Point = [0, 0],
): {moves: Move[]; duration: number; tasks: Task[]} {
    const m = {...DEFAULT_MOTION, ...motion};
    let t = 0;
    const moves: Move[] = [];
    const tasks: Task[] = [];
    let cursorAt = start;

    for (const step of steps) {
        const from = t;

        if ('click' in step && step.click !== undefined) {
            const dest = resolveTarget(step.click, cursorAt) ?? cursorAt;
            const dist = distancePx(cursorAt, dest);
            const moveMs = moveDurationMs(dist, m);
            const until = from + moveMs;
            const press = until + m.dwellMs;

            cursorAt = dest;
            t = press + PRESS_MS;
            moves.push({to: step.click, from, until, press});
            continue;
        }

        if ('move' in step && step.move !== undefined) {
            const dest = resolveTarget(step.move, cursorAt) ?? cursorAt;
            const dist = distancePx(cursorAt, dest);
            const moveMs = moveDurationMs(dist, m);
            const until = from + moveMs;

            cursorAt = dest;
            t = until;
            moves.push({to: step.move, from, until});
            continue;
        }

        if ('run' in step) {
            tasks.push({at: t, run: step.run});
            continue;
        }

        if ('wait' in step) {
            t += step.wait;
        }
    }

    const last = moves[moves.length - 1];
    const duration = last?.press === undefined ? t : Math.max(t, last.press + RING_MS);

    return {moves, duration, tasks};
}

/** Index of the move the cursor is on at `t`, or -1 before the first one starts. */
export function moveIndexAt(moves: Move[], t: number): number {
    return moves.findLastIndex((move) => t >= move.from);
}

/** Where the cursor sits at `t`: mid-glide between `from` and `to`, or parked on `to`. */
export function positionAt(from: Point, to: Point, move: Move | null, t: number): Point {
    if (!move || t >= move.until) return to;

    const p = easeInOutCubic((t - move.from) / (move.until - move.from));

    return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
}

export function isOn(toggle: Toggle, t: number): boolean {
    return t >= toggle.from && t < toggle.until;
}

/** How much of the string has been written at `t`. Starts slow, speeds up. */
export function typedText(typing: Typing, t: number): string {
    if (t < typing.from) return '';
    if (typing.clearAt !== undefined && t >= typing.clearAt) return '';
    if (t >= typing.until) return typing.text;

    const p = (t - typing.from) / (typing.until - typing.from);

    return typing.text.slice(0, Math.floor(p * p * typing.text.length));
}

/** The clock at `t`, as `m:ss`. Stops at zero rather than going negative. */
export function countdownText(countdown: Countdown, t: number): string {
    const left = Math.max(0, countdown.startSeconds - Math.floor(t / 1000));

    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
