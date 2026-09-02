import type {Countdown, Move, Point, Step, Toggle, Typing} from './types';

/** How long a glide takes when a step does not say. */
const DEFAULT_MOVE_MS = 600;
/** How long the cursor hovers before pressing when a step does not say. */
const DEFAULT_DWELL_MS = 250;
/** How long the cursor stays squashed after a press. */
export const PRESS_MS = 200;
/** How long the ripple ring lingers. Outlives the press so the click reads. */
export const RING_MS = 500;

export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Lay a routine out on a timeline, back to back. A step's press and the page
 * change it causes are one event, so there is nothing to keep in sync by hand.
 */
export function compile(steps: Step[]): {moves: Move[]; duration: number} {
    let t = 0;

    const moves = steps.map((step): Move => {
        const presses = 'click' in step;
        const from = t + (step.wait ?? 0);
        const until = from + (step.moveFor ?? DEFAULT_MOVE_MS);
        const press = presses ? until + (step.dwell ?? DEFAULT_DWELL_MS) : undefined;

        // A beat runs to the click, which lands as the press lifts — not to the
        // press itself. Otherwise the next beat starts mid-stroke.
        t = press === undefined ? until : press + PRESS_MS;

        return {to: presses ? step.click : step.to, from, until, press};
    });

    const last = moves[moves.length - 1];

    // A press needs its ring to finish before the loop wipes the scene. Between
    // beats the next one's wait covers that; the last beat has no next one, and
    // ending on the click would reset the loop before the click could fire.
    const duration = last?.press === undefined ? t : Math.max(t, last.press + RING_MS);

    return {moves, duration};
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
    const left = Math.max(0, countdown.seconds - Math.floor(t / 1000));

    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
