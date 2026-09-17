import {cubicBezierEasing, type CubicBezier} from './easing.ts';
import type {MotionConfig, Move, Point, Step, Task} from './types.ts';

/** How long the cursor stays squashed after a press. */
export const PRESS_MS = 200;
/** How long the ripple ring lingers. Outlives the press so the click reads. */
export const RING_MS = 500;

/** Smooth ease-in-out for pointer demos (default glide curve). */
export const DEFAULT_EASING: CubicBezier = [0.36, 0.03, 0.22, 1];

/** Defaults tuned for human-like pointer demos — long glides stay brisk, short hops never snap. */
export const DEFAULT_MOTION: Required<MotionConfig> = {
    pxPerSecond: 580,
    minMoveMs: 115,
    dwellMs: 300,
    easing: DEFAULT_EASING,
};

export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function distancePx(from: Point, to: Point): number {
    return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

/** Below this distance, glides get extra time so easing reads (long glides unchanged). */
const SHORT_HOP_TAPER_PX = 150;
const SHORT_HOP_READ_MS = 380;
/** Floor for in-taper hops so speed math never wins over readability. */
const SHORT_HOP_MIN_GLIDE_MS = 320;

function shortHopReadabilityMs(distancePx: number): number {
    if (distancePx >= SHORT_HOP_TAPER_PX) return 0;

    const t = 1 - distancePx / SHORT_HOP_TAPER_PX;

    return Math.round(SHORT_HOP_READ_MS * t * t);
}

/** Glide duration from distance at constant `pxPerSecond` (no max cap). */
export function moveDurationMs(distancePx: number, motion: MotionConfig = {}): number {
    const m = {...DEFAULT_MOTION, ...motion};
    const fromSpeed =
        distancePx <= 0 ? 0 : Math.round((distancePx / m.pxPerSecond) * 1000);
    const base = Math.max(m.minMoveMs, fromSpeed);
    let ms = base + shortHopReadabilityMs(distancePx);

    if (distancePx > 0 && distancePx < SHORT_HOP_TAPER_PX) {
        ms = Math.max(ms, SHORT_HOP_MIN_GLIDE_MS);
    }

    return ms;
}

/** Resolve a step target to px in the root; return null if it is not on screen yet. */
export type ResolveTarget = (to: string | Point, from: Point) => Point | null;

/**
 * Lay a script out on a timeline. Waits and runs use fixed times; glides use
 * `resolveTarget` and `motion` so travel stays in one place, not on every step.
 */
export function compileScriptTimeline(
    steps: Step[],
    resolveTarget: ResolveTarget,
    motion: MotionConfig = {},
    start: Point = [0, 0],
): {moves: Move[]; duration: number; tasks: Task[]; stepStartsMs: number[]} {
    const m = {...DEFAULT_MOTION, ...motion};
    let t = 0;
    const moves: Move[] = [];
    const tasks: Task[] = [];
    const stepStartsMs: number[] = [];
    let cursorAt = start;

    for (const step of steps) {
        stepStartsMs.push(t);
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

    return {moves, duration, tasks, stepStartsMs};
}

export function compile(
    steps: Step[],
    resolveTarget: ResolveTarget,
    motion: MotionConfig = {},
    start: Point = [0, 0],
): {moves: Move[]; duration: number; tasks: Task[]} {
    const {moves, duration, tasks} = compileScriptTimeline(steps, resolveTarget, motion, start);

    return {moves, duration, tasks};
}

/** When each script step begins (ms from loop start), for passive effects aligned to the same schedule as `busk()`. */
export function compileStepStarts(
    steps: Step[],
    resolveTarget: ResolveTarget,
    motion: MotionConfig = {},
    start: Point = [0, 0],
): number[] {
    return compileScriptTimeline(steps, resolveTarget, motion, start).stepStartsMs;
}

/**
 * Lengthen one glide and push every later beat by the same amount. Used when
 * compile() could not measure a hidden target and guessed ~zero distance.
 */
export function stretchMoveGlide(
    moves: Move[],
    tasks: Task[],
    index: number,
    glideMs: number,
    playheadMs?: number,
): number {
    const move = moves[index];

    if (!move) return 0;

    const delta = glideMs - (move.until - move.from);

    if (delta === 0) return 0;

    const t = playheadMs ?? move.from;

    // Shortening mid-glide would teleport the cursor; only safe at the start of the hop.
    if (delta < 0 && t > move.from + glideMs) return 0;

    move.until += delta;
    if (move.press !== undefined) move.press += delta;

    for (let j = index + 1; j < moves.length; j++) {
        const later = moves[j];

        if (!later) continue;

        later.from += delta;
        later.until += delta;
        if (later.press !== undefined) later.press += delta;
    }

    for (const task of tasks) {
        if (task.at >= move.from) task.at += delta;
    }

    return delta;
}

/** Index of the move the cursor is on at `t`, or -1 before the first one starts. */
export function moveIndexAt(moves: Move[], t: number): number {
    return moves.findLastIndex((move) => t >= move.from);
}

/** Where the cursor sits at `t`: mid-glide between `from` and `to`, or parked on `to`. */
export function positionAt(
    from: Point,
    to: Point,
    move: Move | null,
    t: number,
    ease: (u: number) => number = cubicBezierEasing(DEFAULT_EASING),
): Point {
    if (!move || t >= move.until) return to;

    const linear = (t - move.from) / (move.until - move.from);
    const p = ease(linear);

    return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
}

