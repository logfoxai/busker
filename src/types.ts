/** A spot in the root element, as a fraction of its size: `[0.5, 0.5]` is the middle. */
export type Point = [number, number];

/**
 * One beat of a routine. Press something, drift somewhere, or run your own code.
 * Beats are laid out back to back in the order a visitor would see them.
 */
export type Step =
    | {
        /** Selector of the element to press. It really gets clicked. */
        click: string;
        /** Pause before the cursor sets off — time to read whatever just opened. */
        wait?: number;
        /** How long the glide takes. Default 600. */
        moveFor?: number;
        /** How long the cursor hovers before pressing. Default 250. */
        dwell?: number;
        /** A press goes to the thing it clicks. */
        to?: never;
        run?: never;
    }
    | {
        /** Where to glide, with no press at the end. */
        to: string | Point;
        wait?: number;
        moveFor?: number;
        click?: never;
        /** Nothing is pressed, so there is no hover to hold before it. */
        dwell?: never;
        run?: never;
    }
    | {
        /** Run arbitrary code at this beat (reset state, sync another loop, etc.). */
        run: () => void;
        wait?: number;
        click?: never;
        to?: never;
        moveFor?: never;
        dwell?: never;
    };

/** Code to run once when the playhead reaches `at` (ms from loop start). */
export interface Task {
    at: number;
    run: () => void;
}

/** A cursor glide on a hand-set timeline. */
export interface Move {
    /** Where to glide. */
    to: string | Point;
    /** When the glide starts. */
    from: number;
    /** When the cursor arrives. */
    until: number;
    /**
     * Optional moment to animate a press. A `TimedRoutine` never really clicks
     * — whatever the press appears to do, drive it with a `Toggle` or `Task`.
     */
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

/** What every routine has, however the cursor is driven. */
interface CommonRoutine {
    /** Where the cursor rests before the first beat. Default `[0.5, 0.5]`. */
    start?: Point;
    /**
     * Selectors that look clickable and count as hits for the miss hint.
     * Scene changes and other UI state are your handlers' job.
     */
    routes?: string[];
    /** Timed callbacks (merged with `run` steps when using `steps`). */
    tasks?: Task[];
    /** Called when the playhead loops back to 0. */
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

/** A click-driven show. The loop is as long as the steps add up to. */
export interface ScriptRoutine extends CommonRoutine {
    steps: Step[];
    /** The steps set the loop length. */
    duration?: never;
    /** The steps say where the cursor goes. */
    moves?: never;
}

/** A hand-timed show. Nothing is really clicked; a press is animation only. */
export interface TimedRoutine extends CommonRoutine {
    /** Loop length in ms. */
    duration: number;
    moves?: Move[];
    /** `duration` sets the loop length, so there are no steps to add up. */
    steps?: never;
}

/**
 * A routine is one of two things, never a mix: `steps` for a click-driven show,
 * or `duration` for a hand-timed one.
 */
export type Routine = ScriptRoutine | TimedRoutine;

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
