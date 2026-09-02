/** A spot in the root element, as a fraction of its size: `[0.5, 0.5]` is the middle. */
export type Point = [number, number];

/**
 * One beat of a routine. Either press something, or drift somewhere without
 * pressing. Both are laid out back to back, so a routine reads top to bottom
 * in the order a visitor would see it.
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
    }
    | {
        /** Where to glide, with no press at the end. */
        to: string | Point;
        wait?: number;
        moveFor?: number;
    };

/** A click on `click` shows scene `scene`. */
export interface Route {
    /** Selector of the clickable element. */
    click: string;
    /** `data-scene` value to show. */
    scene: string;
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
     * Optional moment the cursor goes down. In a click-driven show the real
     * click lands as the stroke lifts, a press later. Timeline moves never
     * really click, so for them this is the animation and nothing more.
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
    /** Value at the top of the loop. */
    seconds: number;
}

/**
 * A routine. Give it `steps` for a click-driven show, or `duration` plus any of
 * `moves` / `toggles` / `typing` / `countdowns` for a hand-timed one.
 */
export interface Routine {
    /** Scene shown at the top of every loop. */
    scene?: string;
    /** Where the cursor rests before the first beat. Default `[0.5, 0.5]`. */
    start?: Point;
    /** Click-driven show. The loop length is derived from these. */
    steps?: Step[];
    /** How clicks — the cursor's and the visitor's — change the scene. */
    routes?: Route[];
    /** Loop length in ms. Required unless `steps` is given. */
    duration?: number;
    moves?: Move[];
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
