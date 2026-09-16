import type {CubicBezier} from './easing.ts';

/** A spot in the root element, as a fraction of its size: `[0.5, 0.5]` is the middle. */
export type Point = [number, number];

/**
 * One line in a click-driven script. Each step does exactly one thing; they run
 * in order. Pauses are their own steps so the story stays easy to read.
 */
export type Step =
    | {click: string}
    | {move: string | Point}
    | {wait: number}
    | {run: () => void};

/** Global cursor motion — not per step. Every glide uses the same speed and easing curve. */
export interface MotionConfig {
    /** Travel speed in pixels per second. Duration = distance ÷ speed. Default 720. */
    pxPerSecond?: number;
    /** When distance is ~0, still wait this long (ms). Default 80. */
    minMoveMs?: number;
    /** Hover on target before a click step presses. Default 250. */
    dwellMs?: number;
    /** CSS cubic-bezier control points for glide easing. Default `[0.4, 0, 0.2, 1]`. */
    easing?: CubicBezier;
}

/** Code to run once when the playhead reaches `at` (ms from loop start). */
export interface Task {
    at: number;
    run: () => void;
}

/** A compiled cursor glide (from `compile()` — not passed on `Routine`). */
export interface Move {
    /** Where to glide. */
    to: string | Point;
    /** When the glide starts. */
    from: number;
    /** When the cursor arrives. */
    until: number;
    /** Moment to animate a press and fire a `{ click }` step. */
    press?: number;
}

/** A class held on an element for a slice of the loop. */
export interface Toggle {
    /** Selector of the element. */
    target: string;
    /** Class held while the loop is inside `[from, until)`. */
    class: string;
    from: number;
    until: number;
}

/** Text that types itself out. */
export interface Typing {
    /** Selector of the element whose text content is written. */
    target: string;
    text: string;
    /** Typing starts; the whole string is shown at `until`. */
    from: number;
    until: number;
    /** Optional moment the text is wiped, e.g. the message was sent. */
    clearAt?: number;
}

/** A `m:ss` clock ticking down over the loop. */
export interface Countdown {
    /** Selector of the element whose text content is written. */
    target: string;
    /** Value at the top of every loop. */
    startSeconds: number;
}

/** A click-driven show. Loop length comes from `steps` (plus ring on the last click). */
export interface Routine {
    /** Script the cursor follows — required. */
    steps: Step[];
    /** Where the cursor rests before the first beat. Default `[0.5, 0.5]`. */
    start?: Point;
    /** Cursor glide timing. Same for every click and move step. */
    motion?: MotionConfig;
    /**
     * Selectors that look clickable and count as hits for the miss hint.
     * Scene changes and other UI state are your handlers' job.
     */
    clickTargets?: string[];
    /** Timed callbacks at absolute ms in the loop (extras aligned to compiled timing). */
    tasks?: Task[];
    /** Called when the playhead wraps to 0. */
    onLoop?: () => void;
    toggles?: Toggle[];
    typing?: Typing[];
    countdowns?: Countdown[];
    /**
     * How much of the root must be on screen for the show to run, as a fraction
     * of its size. Default 1 — the whole thing.
     */
    visibility?: number;
    /** Frame to hold under `prefers-reduced-motion`. Default 0. */
    freezeAt?: number;
}

/** @deprecated Use {@link Routine}. Kept as an alias for docs migration. */
export type ScriptRoutine = Routine;

export interface Busker {
    /** Loop length in ms. */
    readonly duration: number;
    /** Start (or resume) the show. */
    play(): void;
    /** Hold the show where it is. */
    pause(): void;
    /**
     * Hand the mock over: stop the show for good and hide the cursor so the
     * visitor can click around. Happens by itself when they click.
     */
    stepAside(): void;
    /** Stop everything and put the DOM back the way it was found. */
    destroy(): void;
}
