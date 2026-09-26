import {cubicBezierEasing, type CubicBezier} from './easing.ts';
import type {Glide, MotionConfig, Point, ScheduledRun, Step} from './types.ts';

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
export function glideDurationMs(distancePx: number, motion: MotionConfig = {}): number {
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
): {glides: Glide[]; duration: number; runs: ScheduledRun[]; stepStartsMs: number[]} {
    const m = {...DEFAULT_MOTION, ...motion};
    let t = 0;
    const glides: Glide[] = [];
    const runs: ScheduledRun[] = [];
    const stepStartsMs: number[] = [];
    let cursorAt = start;

    for (const step of steps) {
        stepStartsMs.push(t);
        const from = t;

        if ('click' in step && step.click !== undefined) {
            const dest = resolveTarget(step.click, cursorAt) ?? cursorAt;
            const dist = distancePx(cursorAt, dest);
            const glideMs = glideDurationMs(dist, m);
            const until = from + glideMs;
            const press = until + m.dwellMs;

            cursorAt = dest;
            t = press + PRESS_MS;
            glides.push({to: step.click, from, until, press});
            continue;
        }

        if ('move' in step && step.move !== undefined) {
            const dest = resolveTarget(step.move, cursorAt) ?? cursorAt;
            const dist = distancePx(cursorAt, dest);
            const glideMs = glideDurationMs(dist, m);
            const until = from + glideMs;

            cursorAt = dest;
            t = until;
            glides.push({to: step.move, from, until});
            continue;
        }

        if ('run' in step) {
            runs.push({at: t, run: step.run});
            continue;
        }

        if ('wait' in step) {
            t += step.wait;
        }
    }

    const last = glides[glides.length - 1];
    const duration = last?.press === undefined ? t : Math.max(t, last.press + RING_MS);

    return {glides, duration, runs, stepStartsMs};
}

export function compile(
    steps: Step[],
    resolveTarget: ResolveTarget,
    motion: MotionConfig = {},
    start: Point = [0, 0],
): {glides: Glide[]; duration: number; runs: ScheduledRun[]} {
    const {glides, duration, runs} = compileScriptTimeline(steps, resolveTarget, motion, start);

    return {glides, duration, runs};
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
export function stretchGlide(
    glides: Glide[],
    runs: ScheduledRun[],
    index: number,
    glideMs: number,
    playheadMs?: number,
): number {
    const glide = glides[index];

    if (!glide) return 0;

    const delta = glideMs - (glide.until - glide.from);

    if (delta === 0) return 0;

    const t = playheadMs ?? glide.from;

    // Shortening mid-glide would teleport the cursor; only safe at the start of the hop.
    if (delta < 0 && t > glide.from + glideMs) return 0;

    glide.until += delta;
    if (glide.press !== undefined) glide.press += delta;

    for (let j = index + 1; j < glides.length; j++) {
        const later = glides[j];

        if (!later) continue;

        later.from += delta;
        later.until += delta;
        if (later.press !== undefined) later.press += delta;
    }

    for (const run of runs) {
        if (run.at >= glide.from) run.at += delta;
    }

    return delta;
}

/** Index of the glide the cursor is on at `t`, or -1 before the first one starts. */
export function glideIndexAt(glides: Glide[], t: number): number {
    return glides.findLastIndex((glide) => t >= glide.from);
}

/** Where the cursor sits at `t`: mid-glide between `from` and `to`, or parked on `to`. */
export function positionAt(
    from: Point,
    to: Point,
    glide: Glide | null,
    t: number,
    ease: (u: number) => number = cubicBezierEasing(DEFAULT_EASING),
): Point {
    if (!glide || t >= glide.until) return to;

    const linear = (t - glide.from) / (glide.until - glide.from);
    const p = ease(linear);

    return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
}
