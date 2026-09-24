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

/** Scheduled from `{ run }` steps inside `compile()` — not passed on `Routine`. */
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

/** The "click to explore" pill that tails the visitor's pointer. */
export interface ExploreHintConfig {
    /** Pill label. Default "Click to explore". */
    text?: string;
    /** Ms the hint stays up while the pointer is over the mock. Default 1800. */
    dismissAfterMs?: number;
    /** Alias for {@link dismissAfterMs}. */
    durationMs?: number;
    /** Gap to the right of the pointer (CSS length). Default `1.75rem`. */
    offsetX?: string;
}

/**
 * A click-driven show. One clock: `steps` set loop length; `{ run }` handles
 * everything else (UI, ambient ticks, livetail rows). No parallel schedules.
 */
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
    /** Called when the playhead wraps to 0. */
    onLoop?: () => void;
    /**
     * How much of the root must be on screen for the show to run, as a fraction
     * of its size. Default 1 — the whole thing.
     */
    visibility?: number;
    /** Frame to hold under `prefers-reduced-motion`. Default 0. */
    freezeAt?: number;
    /**
     * A pill that follows the visitor's pointer whenever they hover, inviting
     * them to click. On by default (`true` / default label). Pass `false` to
     * disable, a string for your own label, or `ExploreHintConfig` for full
     * control. Pops out a few seconds into each visit and pops back in on the
     * next one; once they click, it is gone for good.
     */
    exploreHint?: boolean | string | ExploreHintConfig;
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
    /** Hide the explore hint without ending the show (e.g. mock scrolled off-screen). */
    retractExploreHint(): void;
    /**
     * Hand the mock over: stop the show for good and hide the cursor so the
     * visitor can click around. Happens by itself when they click.
     */
    stepAside(): void;
    /** Stop everything and put the DOM back the way it was found. */
    destroy(): void;
}
